/**
 * LangChain client for LLMOP YouTube
 * Handles interactions with LLMs through LangChain
 */

import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { HarmBlockThreshold, HarmCategory } from '@google/generative-ai';
import { StructuredOutputParser } from 'langchain/output_parsers';
import { createLogger } from '../debug';
import { DEFAULT_GEMINI_MODEL } from '../config';
import {
  VideoAnalysisSchema,
  VideoQuestionSchema,
  VideoAnalysisResponse,
  VideoQuestionResponse,
} from './schemas';
import { createTracingCallbacks } from './langsmith';

// Create a logger for this module
const logger = createLogger('LangChainClient');

/**
 * Interface for LLM options
 */
export interface LLMOptions {
  model?: string;
  temperature?: number;
  topK?: number;
  topP?: number;
  maxOutputTokens?: number;
}

/**
 * Default options for the LLM
 */
const DEFAULT_OPTIONS: LLMOptions = {
  model: DEFAULT_GEMINI_MODEL,
  temperature: 0.2, // Low temperature for more deterministic outputs
  topK: 40,
  topP: 0.95,
  maxOutputTokens: 4096,
};

/**
 * LangChainClient class for handling interactions with LLMs through LangChain
 */
export class LangChainClient {
  private model: ChatGoogleGenerativeAI;
  private options: LLMOptions;
  private captions: string | null = null;
  private videoId: string | null = null;
  private videoTitle: string | null = null;
  private videoDescription: string | null = null;

  /**
   * Create a new LangChainClient instance
   * @param apiKey The Google Gemini API key
   * @param options Optional configuration for the LLM
   */
  constructor(apiKey: string, options: LLMOptions = DEFAULT_OPTIONS) {
    try {
      logger.info('Initializing LangChain client');

      // Store the options
      this.options = { ...DEFAULT_OPTIONS, ...options };

      // Create the LangChain model
      this.model = new ChatGoogleGenerativeAI({
        apiKey,
        model: this.options.model,
        temperature: this.options.temperature,
        topK: this.options.topK,
        topP: this.options.topP,
        maxOutputTokens: this.options.maxOutputTokens,
        safetySettings: [
          {
            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
          },
        ],
      });

      logger.info('LangChain client initialized successfully');
    } catch (error) {
      logger.error('Error initializing LangChain client', error);
      throw new Error(`Failed to initialize LangChain client: ${error}`);
    }
  }

  /**
   * Set the video context for the client
   * @param videoId The YouTube video ID
   * @param captions The video captions text
   * @param videoTitle The title of the YouTube video
   * @param videoDescription The description of the YouTube video
   */
  setVideoContext(
    videoId: string,
    captions: string,
    videoTitle: string = '',
    videoDescription: string = '',
  ): void {
    this.videoId = videoId;
    this.captions = captions;
    this.videoTitle = videoTitle;
    this.videoDescription = videoDescription;
    logger.info(`Video context set for video ID: ${videoId}`);
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

      // Create a structured output parser
      const parser = StructuredOutputParser.fromZodSchema(VideoAnalysisSchema);

      // Get the system prompt
      const systemPrompt = this.getVideoAnalysisSystemPrompt();

      // Simple user prompt since captions are in the system prompt
      const userPrompt = `Please analyze this video and provide key events and a summary.`;

      logger.info('Sending request to LLM');
      const startTime = Date.now();

      // Get tracing callbacks if enabled
      const callbacks = await createTracingCallbacks();

      // Generate content with structured output (with or without tracing)
      const response = await this.model.invoke(
        [
          ['system', systemPrompt],
          ['human', userPrompt],
        ],
        callbacks ? { callbacks } : undefined,
      );

      const elapsedTime = Date.now() - startTime;
      logger.info(`LLM response received in ${elapsedTime}ms`);

      // Parse the structured output
      const structuredOutput = await parser.parse(response.content.toString());

      // Log the response for debugging
      logger.info('Received video analysis from LLM');

      logger.info('Successfully generated video analysis');
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

      // Create a structured output parser
      const parser = StructuredOutputParser.fromZodSchema(VideoQuestionSchema);

      // Get the system prompt
      const systemPrompt = this.getQuestionSystemPrompt();

      // Just pass the question as the user prompt since captions are in the system prompt
      const userPrompt = `${question}`;

      logger.info('Sending request to LLM');
      const startTime = Date.now();

      // Get tracing callbacks if enabled
      const callbacks = await createTracingCallbacks();

      // Generate content with structured output (with or without tracing)
      const response = await this.model.invoke(
        [
          ['system', systemPrompt],
          ['human', userPrompt],
        ],
        callbacks ? { callbacks } : undefined,
      );

      const elapsedTime = Date.now() - startTime;
      logger.info(`LLM response received in ${elapsedTime}ms`);

      // Parse the structured output
      const structuredOutput = await parser.parse(response.content.toString());

      // Log the response for debugging
      logger.info('Received question answer from LLM');

      logger.info('Successfully generated answer to question');
      return structuredOutput;
    } catch (error) {
      logger.error('Error answering question', error);
      throw new Error(`Failed to answer question: ${error}`);
    }
  }

  /**
   * Get the system prompt for video analysis
   * @returns The system prompt for video analysis
   */
  private getVideoAnalysisSystemPrompt(): string {
    return `You are an AI assistant that analyzes YouTube video captions to identify key events and provide summaries.

Your task is to:
1. Identify important events in the video with accurate timestamps
2. Provide a concise summary of the video content
3. Extract key points or takeaways from the video

Format your response as a JSON object with the following structure:
{
  "events": [
    {
      "name": "Short name of the event",
      "description": "Detailed description of the event",
      "timestamp": 123 // Timestamp in seconds when the event occurs
    }
  ],
  "summary": "Overall summary of the video content",
  "keyPoints": ["Key point 1", "Key point 2", "..."]
}

IMPORTANT: The captions may be automatically generated and could contain mistakes or inaccuracies.
Terms, names, and concepts used in the video title and description should be considered authoritative
and used preferentially when there are discrepancies with the captions.

Video Title: ${this.videoTitle || 'Not available'}
Video Description: ${this.videoDescription || 'Not available'}

Here are the captions from the video (Video ID: ${this.videoId}):
${this.captions}
`;
  }

  /**
   * Get the system prompt for answering questions about the video
   * @returns The system prompt for answering questions
   */
  private getQuestionSystemPrompt(): string {
    return `You are an AI assistant that answers questions about YouTube videos based on their captions.

Your task is to:
1. Answer the user's question based on the video captions
2. Provide relevant timestamps where the information can be found in the video
3. Be objective and base your answers on the content of the video captions

Format your response as a JSON object with the following structure:
{
  "answer": "Your detailed answer to the question",
  "relevantTimestamps": [
    {
      "timestamp": 123, // Timestamp in seconds
      "description": "Why this timestamp is relevant to the answer"
    }
  ]
}

Your answer should be conversational and read naturally, with the timestamp links integrated seamlessly.
Be objective and base your answers on the content of the video captions.
If the question cannot be answered based on the captions, clearly state that.

IMPORTANT: The captions may be automatically generated and could contain mistakes or inaccuracies.
Terms, names, and concepts used in the video title and description should be considered authoritative
and used preferentially when there are discrepancies with the captions.

Video Title: ${this.videoTitle || 'Not available'}
Video Description: ${this.videoDescription || 'Not available'}

Here are the captions from the video (Video ID: ${this.videoId}):
${this.captions}
`;
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

  /**
   * Get the video title for the current video context
   * @returns The video title or null if not set
   */
  getVideoTitle(): string | null {
    return this.videoTitle;
  }

  /**
   * Get the video description for the current video context
   * @returns The video description or null if not set
   */
  getVideoDescription(): string | null {
    return this.videoDescription;
  }
}

/**
 * Factory function to create a LangChainClient instance
 * @param apiKey The Google Gemini API key
 * @param options Optional configuration for the LLM
 * @returns A configured LangChainClient instance
 */
export function createLangChainClient(
  apiKey: string,
  options: LLMOptions = DEFAULT_OPTIONS,
): LangChainClient {
  return new LangChainClient(apiKey, options);
}

/**
 * Generate video analysis with the provided context
 * @param videoId The YouTube video ID
 * @param captions The video captions text
 * @param apiKey The Google Gemini API key
 * @param videoTitle The title of the YouTube video
 * @param videoDescription The description of the YouTube video
 * @returns A promise that resolves to the video analysis
 */
export async function generateVideoAnalysis(
  videoId: string,
  captions: string,
  apiKey: string,
  videoTitle: string = '',
  videoDescription: string = '',
): Promise<VideoAnalysisResponse> {
  try {
    logger.info(`Generating video analysis for video ID: ${videoId}`);

    // Create a LangChainClient instance and use it to generate analysis
    const client = createLangChainClient(apiKey);
    client.setVideoContext(videoId, captions, videoTitle, videoDescription);

    return await client.getVideoAnalysis();
  } catch (error) {
    logger.error('Error generating video analysis', error);
    throw new Error(`Failed to generate video analysis: ${error}`);
  }
}

/**
 * Answer a question about the video with the provided context
 * @param question The question to answer
 * @param videoId The YouTube video ID
 * @param captions The video captions text
 * @param apiKey The Google Gemini API key
 * @param videoTitle The title of the YouTube video
 * @param videoDescription The description of the YouTube video
 * @returns A promise that resolves to the answer with relevant timestamps
 */
export async function answerVideoQuestion(
  question: string,
  videoId: string,
  captions: string,
  apiKey: string,
  videoTitle: string = '',
  videoDescription: string = '',
): Promise<VideoQuestionResponse> {
  try {
    logger.info(`Answering question for video ID: ${videoId}`);

    // Create a LangChainClient instance and use it to answer the question
    const client = createLangChainClient(apiKey);
    client.setVideoContext(videoId, captions, videoTitle, videoDescription);

    return await client.askQuestion(question);
  } catch (error) {
    logger.error('Error answering video question', error);
    throw new Error(`Failed to answer video question: ${error}`);
  }
}
