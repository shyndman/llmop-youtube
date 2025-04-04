/**
 * Gemini API client for LLMOP YouTube
 * Handles interactions with the Google Gemini API
 */

import { GoogleGenAI, Type } from '@google/genai';
import { createLogger } from './debug';
import GM_fetch from '@trim21/gm-fetch';

// Create a logger for this module
const logger = createLogger('GeminiClient');

// Default model to use
export const DEFAULT_GEMINI_MODEL = 'models/gemini-2.0-flash';

// Interface for a video event with timestamp
export interface VideoEvent {
  name: string;
  description: string;
  timestamp: number; // Timestamp in seconds
}

// Interface for video analysis response (combines events and summary)
export interface VideoAnalysisResponse {
  events: VideoEvent[];
  summary: string;
  keyPoints: string[];
}

// Interface for custom question response
export interface VideoQuestionResponse {
  answer: string; // Freeform text that may contain timestamp links in the format [text](timestamp)
}

// Interface for Gemini API options
export interface GeminiOptions {
  model?: string;
  temperature?: number;
  topK?: number;
  topP?: number;
  maxOutputTokens?: number;
}

// Default options for the Gemini API
const DEFAULT_OPTIONS: GeminiOptions = {
  model: DEFAULT_GEMINI_MODEL,
  temperature: 0.2, // Low temperature for more deterministic outputs
  topK: 40,
  topP: 0.95,
  maxOutputTokens: 2048,
};

// Query types supported by the GeminiClient
export enum QueryType {
  VIDEO_ANALYSIS = 'videoAnalysis',
  CUSTOM_QUESTION = 'customQuestion',
}

// Schema for video analysis structured output (combines events and summary)
const VIDEO_ANALYSIS_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    events: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: {
            type: Type.STRING,
            description: 'A short, descriptive name for the event',
          },
          description: {
            type: Type.STRING,
            description:
              'A brief description of what happens during this event',
          },
          timestamp: {
            type: Type.NUMBER,
            description:
              'The timestamp in seconds when this event occurs in the video',
          },
        },
        required: ['name', 'description', 'timestamp'],
      },
    },
    summary: {
      type: Type.STRING,
      description: 'A 1-3 paragraph summary of the video content',
    },
    keyPoints: {
      type: Type.ARRAY,
      items: {
        type: Type.STRING,
      },
      description: 'A list of key points or takeaways from the video',
    },
  },
  required: ['events', 'summary', 'keyPoints'],
};

// Schema for custom question structured output
const VIDEO_QUESTION_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    answer: {
      type: Type.STRING,
      description:
        "The answer to the user's question about the video, with timestamp links embedded in the text. If no results, return the string NOT_FOUND",
    },
  },
  required: ['answer'],
};

/**
 * GeminiClient class for handling interactions with the Google Gemini API
 */
export class GeminiClient {
  private genAI: GoogleGenAI;
  private options: GeminiOptions;
  private captions: string | null = null;
  private videoId: string | null = null;

  /**
   * Create a new GeminiClient instance
   * @param apiKey The Google Gemini API key
   * @param options Optional configuration for the Gemini API
   */
  constructor(apiKey: string, options: GeminiOptions = DEFAULT_OPTIONS) {
    try {
      logger.info('Initializing Gemini client');

      // Store the options
      this.options = { ...DEFAULT_OPTIONS, ...options };

      // Create the Gemini API client
      this.genAI = new GoogleGenAI({ apiKey });

      // Override the API call method to use GM_fetch to bypass CORS
      // @ts-expect-error - We're accessing internal apiClient property
      this.genAI.apiClient.apiCall = (
        url: string,
        requestInit: RequestInit,
      ) => {
        // Use GM_fetch if available
        if (typeof GM_fetch !== 'undefined') {
          logger.info('Using GM_fetch for CORS bypass');
          return GM_fetch(url, requestInit);
        } else {
          // Fall back to regular fetch if GM_fetch is not available
          logger.warn('GM_fetch not available, using default fetch');
          return fetch(url, requestInit);
        }
      };

      // Get the model to use (default or specified)
      const modelName = this.options.model || DEFAULT_GEMINI_MODEL;
      logger.info(`Using Gemini model: ${modelName}`);

      logger.info('Gemini client initialized successfully');
    } catch (error) {
      logger.error('Error initializing Gemini client', error);
      throw new Error(`Failed to initialize Gemini client: ${error}`);
    }
  }

  /**
   * Set the video context for the client
   * @param videoId The YouTube video ID
   * @param captions The video captions text
   */
  setVideoContext(videoId: string, captions: string): void {
    this.videoId = videoId;
    this.captions = captions;
    logger.info(`Video context set for video ID: ${videoId}`);
  }

  /**
   * Get the system prompt for video analysis (key events and summary)
   * @returns The system prompt string with captions included
   */
  private getVideoAnalysisSystemPrompt(): string {
    this.validateVideoContext();
    return `
You are an AI assistant specialized in analyzing video content through captions.
Your task is to provide both key events and a summary of the video based on the captions provided.

For the key events:
1. Identify 5-20 key moments in the video depending on the content density
2. For each key event, provide a short, descriptive name
3. Write a brief description of what happens at each event
4. Identify the timestamp (in seconds from the start of the video) when each event occurs
5. Organize events in chronological order (ascending by timestamp)

For the summary:
1. Provide a 1-3 paragraph summary that captures the main content and purpose of the video
2. Throughout your summary, include timestamp links using this format: [relevant text](timestamp in seconds)
   For example: "The speaker discusses climate change [at the beginning of the talk](45) and then presents solutions [later](312)."
3. Include a list of 3-7 key points or takeaways from the video

Focus on important moments, transitions, and significant points in the content.
Be objective and accurate in your analysis.

Here are the captions from the video (Video ID: ${this.videoId}):
${this.captions}
`;
  }

  /**
   * Get the system prompt for custom question query
   * @returns The system prompt string with captions included
   */
  private getQuestionSystemPrompt(): string {
    this.validateVideoContext();
    return `
You are an AI assistant specialized in analyzing video content through captions.
Your task is to answer questions about the video based on the captions provided.

When answering:
1. Provide a clear, detailed answer to the question
2. Throughout your answer, include timestamp links using this format: [relevant text](timestamp in seconds)
   For example: "The speaker discusses climate change [at the beginning of the talk](45) and then presents solutions [later](312)."
3. Use these timestamp links naturally within your sentences to reference specific moments
4. Make sure all timestamps are accurate and correspond to relevant moments in the video

Your answer should be conversational and read naturally, with the timestamp links integrated seamlessly.
Be objective and base your answers solely on the content of the video captions.
If the question cannot be answered based on the captions, clearly state that.

Here are the captions from the video (Video ID: ${this.videoId}):
${this.captions}
`;
  }

  /**
   * Generate video analysis with key events and summary from captions
   * @returns A promise that resolves to the video analysis with events and summary
   * @throws Error if video context is not set or if the API request fails
   */
  async getVideoAnalysis(): Promise<VideoAnalysisResponse> {
    try {
      this.validateVideoContext();
      logger.info(`Generating video analysis for video: ${this.videoId}`);

      // Get the model to use
      const modelName = this.options.model || DEFAULT_GEMINI_MODEL;

      // Simple user prompt since captions are in the system prompt
      const userPrompt = `Please analyze this video and provide key events and a summary.`;

      logger.info('Sending request to Gemini API');
      const startTime = Date.now();

      // Generate content with structured output
      const response = await this.genAI.models.generateContent({
        model: modelName,
        contents: userPrompt,
        config: {
          systemInstruction: this.getVideoAnalysisSystemPrompt(),
          responseMimeType: 'application/json',
          responseSchema: VIDEO_ANALYSIS_SCHEMA,
        },
      });

      const elapsedTime = Date.now() - startTime;
      logger.info(`Gemini API response received in ${elapsedTime}ms`);

      // Parse the structured output
      const structuredOutput = JSON.parse(
        response.text,
      ) as VideoAnalysisResponse;

      // Validate the response
      if (
        !structuredOutput ||
        !structuredOutput.events ||
        !Array.isArray(structuredOutput.events) ||
        !structuredOutput.summary ||
        !structuredOutput.keyPoints
      ) {
        logger.error(
          'Invalid response format from Gemini API',
          structuredOutput,
        );
        throw new Error('Invalid response format from Gemini API');
      }

      // Sort events by timestamp (ascending)
      structuredOutput.events.sort((a, b) => a.timestamp - b.timestamp);

      logger.info(
        `Successfully generated video analysis with ${structuredOutput.events.length} events`,
      );
      return structuredOutput;
    } catch (error) {
      logger.error('Error generating video analysis', error);
      throw new Error(`Failed to generate video analysis: ${error}`);
    }
  }

  /**
   * Answer a custom question about the video
   * @param question The question to answer about the video
   * @returns A promise that resolves to the answer with relevant timestamps
   * @throws Error if video context is not set or if the API request fails
   */
  async askQuestion(question: string): Promise<VideoQuestionResponse> {
    try {
      this.validateVideoContext();
      logger.info(`Answering question for video: ${this.videoId}`);

      // Get the model to use
      const modelName = this.options.model || DEFAULT_GEMINI_MODEL;

      // Just pass the question as the user prompt since captions are in the system prompt
      const userPrompt = `${question}`;

      logger.info('Sending request to Gemini API');
      const startTime = Date.now();

      // Generate content with structured output
      const response = await this.genAI.models.generateContent({
        model: modelName,
        contents: userPrompt,
        config: {
          systemInstruction: this.getQuestionSystemPrompt(),
          responseMimeType: 'application/json',
          responseSchema: VIDEO_QUESTION_SCHEMA,
        },
      });

      const elapsedTime = Date.now() - startTime;
      logger.info(`Gemini API response received in ${elapsedTime}ms`);

      // Parse the structured output
      const structuredOutput = JSON.parse(
        response.text,
      ) as VideoQuestionResponse;

      // Validate the response
      if (!structuredOutput || !structuredOutput.answer) {
        logger.error(
          'Invalid response format from Gemini API',
          structuredOutput,
        );
        throw new Error('Invalid response format from Gemini API');
      }

      logger.info('Successfully generated answer to question');
      return structuredOutput;
    } catch (error) {
      logger.error('Error answering question', error);
      throw new Error(`Failed to answer question: ${error}`);
    }
  }

  /**
   * Validate that video context has been set
   * @throws Error if video context is not set
   */
  private validateVideoContext(): void {
    if (!this.videoId || !this.captions) {
      throw new Error('Video context not set. Call setVideoContext() first.');
    }
  }

  /**
   * Get the captions for the current video context
   * @returns The captions text or null if not set
   */
  getCaptions(): string | null {
    return this.captions;
  }

  /**
   * Get the video ID for the current video context
   * @returns The video ID or null if not set
   */
  getVideoId(): string | null {
    return this.videoId;
  }
}

/**
 * Initialize a Gemini client with the provided API key
 * @param apiKey The Google Gemini API key
 * @param options Optional configuration for the Gemini API
 * @returns A configured Gemini client instance
 */
export function initGeminiClient(
  apiKey: string,
  options: GeminiOptions = DEFAULT_OPTIONS,
): GoogleGenAI {
  try {
    logger.info('Initializing Gemini client (legacy function)');

    // Create the Gemini API client
    const genAI = new GoogleGenAI({ apiKey });

    // Override the API call method to use GM_fetch to bypass CORS
    // @ts-expect-error - We're accessing internal apiClient property
    genAI.apiClient.apiCall = (url: string, requestInit: RequestInit) => {
      // Use GM_fetch if available
      if (typeof GM_fetch !== 'undefined') {
        logger.info('Using GM_fetch for CORS bypass');
        return GM_fetch(url, requestInit);
      } else {
        // Fall back to regular fetch if GM_fetch is not available
        logger.warn('GM_fetch not available, using default fetch');
        return fetch(url, requestInit);
      }
    };

    // Get the model to use (default or specified)
    const modelName = options.model || DEFAULT_GEMINI_MODEL;
    logger.info(`Using Gemini model: ${modelName}`);

    logger.info('Gemini client initialized successfully');
    return genAI;
  } catch (error) {
    logger.error('Error initializing Gemini client', error);
    throw new Error(`Failed to initialize Gemini client: ${error}`);
  }
}

/**
 * Generate video analysis with key events and summary using Gemini
 * @param genAI The initialized Gemini client
 * @param videoId The YouTube video ID
 * @param captions The video captions text
 * @returns A promise that resolves to the video analysis with events and summary
 */
export async function generateVideoAnalysis(
  genAI: GoogleGenAI,
  videoId: string,
  captions: string,
): Promise<VideoAnalysisResponse> {
  try {
    logger.info(
      `Generating video analysis (legacy function) for video: ${videoId}`,
    );

    // Create a GeminiClient instance and use it to generate analysis
    // @ts-expect-error - We're accessing internal apiKey property
    const apiKey = `${genAI.apiKey}`;
    const client = new GeminiClient(apiKey);
    client.setVideoContext(videoId, captions);

    return await client.getVideoAnalysis();
  } catch (error) {
    logger.error('Error generating video analysis', error);
    throw new Error(`Failed to generate video analysis: ${error}`);
  }
}
