/**
 * LangChain-based Gemini client for LLMOP YouTube
 */

import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { HarmBlockThreshold, HarmCategory } from '@google/generative-ai';
import { StructuredOutputParser } from '@langchain/core/output_parsers';
import {
  ChatPromptTemplate,
  SystemMessagePromptTemplate,
  HumanMessagePromptTemplate,
} from '@langchain/core/prompts';
// No longer need GM_fetch as LangChain handles the API calls
import { createLogger } from '../debug';
import { DEFAULT_GEMINI_MODEL } from '../config';
import {
  VideoAnalysisSchema,
  VideoAnalysisResponse,
  VideoEvent,
  VideoQuestionSchema,
  VideoQuestionResponse,
} from './schemas';

// Create a logger for this module
const logger = createLogger('GeminiClient');

/**
 * Interface for Gemini API options
 */
export interface GeminiOptions {
  model?: string;
  temperature?: number;
  topK?: number;
  topP?: number;
  maxOutputTokens?: number;
}

/**
 * Default options for the Gemini API
 */
const DEFAULT_OPTIONS: GeminiOptions = {
  model: DEFAULT_GEMINI_MODEL,
  temperature: 0.2, // Low temperature for more deterministic outputs
  topK: 40,
  topP: 0.95,
  maxOutputTokens: 2048,
};

/**
 * Query types supported by the GeminiClient
 */
export enum QueryType {
  VIDEO_ANALYSIS = 'videoAnalysis',
  CUSTOM_QUESTION = 'customQuestion',
}

/**
 * GeminiClient class for handling interactions with the Google Gemini API via LangChain
 */
export class GeminiClient {
  private model: ChatGoogleGenerativeAI;
  private options: GeminiOptions;
  private captions: string | null = null;
  private videoId: string | null = null;
  private videoTitle: string | null = null;
  private videoDescription: string | null = null;

  /**
   * Create a new GeminiClient instance
   * @param apiKey The Google Gemini API key
   * @param options Optional configuration for the Gemini API
   */
  constructor(apiKey: string, options: GeminiOptions = DEFAULT_OPTIONS) {
    try {
      logger.info('Initializing Gemini client with LangChain');

      // Store the options
      this.options = { ...DEFAULT_OPTIONS, ...options };

      // Create the LangChain Gemini model
      this.model = new ChatGoogleGenerativeAI({
        apiKey,
        model: this.options.model || DEFAULT_GEMINI_MODEL,
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

      // Get the model to use (default or specified)
      const modelName = this.options.model || DEFAULT_GEMINI_MODEL;
      logger.info(`Using Gemini model: ${modelName}`);

      logger.info('Gemini client initialized successfully with LangChain');
    } catch (error) {
      logger.error('Error initializing Gemini client', error);
      throw new Error(`Failed to initialize Gemini client: ${error}`);
    }
  }

  /**
   * Set the video context for analysis
   * @param videoId The YouTube video ID
   * @param captions The extracted captions text
   * @param videoTitle The title of the video
   * @param videoDescription The description of the video
   */
  setVideoContext(
    videoId: string,
    captions: string,
    videoTitle?: string,
    videoDescription?: string,
  ): void {
    this.videoId = videoId;
    this.captions = captions;
    this.videoTitle = videoTitle || null;
    this.videoDescription = videoDescription || null;
    logger.info(`Video context set for video ID: ${videoId}`);
  }

  /**
   * Get the system prompt for video analysis
   * @returns The system prompt for video analysis
   */
  private getVideoAnalysisSystemPrompt(): string {
    return `You are an AI assistant that analyzes YouTube video captions to identify key events and provide summaries.
Your task is to:
1. Identify the most important events in the video with accurate timestamps
2. Provide a concise summary of the video content
3. Extract key points or takeaways from the video

For each event, provide:
- A short, descriptive name
- A brief description of what happens
- The timestamp in seconds when the event occurs

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
Your task is to provide accurate, helpful answers to questions about the video content.

When answering:
1. Base your answers only on the information in the captions
2. If the answer isn't in the captions, say "I don't have enough information to answer that question"
3. Include relevant timestamps in your answer using the format [text](timestamp in seconds)
   For example: [The speaker introduces the topic](45) or [This point is discussed](132)

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
   * Generate video analysis with key events and summary from captions
   * @returns A promise that resolves to the video analysis with events and summary
   * @throws Error if video context is not set or if the API request fails
   */
  async getVideoAnalysis(): Promise<VideoAnalysisResponse> {
    try {
      this.validateVideoContext();
      logger.info(`Generating video analysis for video: ${this.videoId}`);

      // Create the structured output parser
      const parser = StructuredOutputParser.fromZodSchema(VideoAnalysisSchema);

      // Create the prompt template
      const promptTemplate = ChatPromptTemplate.fromMessages([
        SystemMessagePromptTemplate.fromTemplate(
          this.getVideoAnalysisSystemPrompt(),
        ),
        HumanMessagePromptTemplate.fromTemplate(
          'Please analyze this video and provide key events and a summary. {format_instructions}',
        ),
      ]);

      // Format the prompt with parser instructions
      const prompt = await promptTemplate.format({
        format_instructions: parser.getFormatInstructions(),
      });

      logger.info('Sending request to Gemini API via LangChain');
      const startTime = Date.now();

      // Invoke the model
      const response = await this.model.invoke(prompt);

      const elapsedTime = Date.now() - startTime;
      logger.info(`Gemini API response received in ${elapsedTime}ms`);

      // Parse the structured output
      const structuredOutput = await parser.parse(response.content as string);

      // Calculate durations for events
      this.calculateEventDurations(structuredOutput.events);

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

      // Create the structured output parser
      const parser = StructuredOutputParser.fromZodSchema(VideoQuestionSchema);

      // Create the prompt template
      const promptTemplate = ChatPromptTemplate.fromMessages([
        SystemMessagePromptTemplate.fromTemplate(
          this.getQuestionSystemPrompt(),
        ),
        HumanMessagePromptTemplate.fromTemplate(
          '{question} {format_instructions}',
        ),
      ]);

      // Format the prompt with parser instructions
      const prompt = await promptTemplate.format({
        question,
        format_instructions: parser.getFormatInstructions(),
      });

      logger.info('Sending request to Gemini API via LangChain');
      const startTime = Date.now();

      // Invoke the model
      const response = await this.model.invoke(prompt);

      const elapsedTime = Date.now() - startTime;
      logger.info(`Gemini API response received in ${elapsedTime}ms`);

      // Parse the structured output
      const structuredOutput = await parser.parse(response.content as string);

      // Log the response for debugging
      logger.info('Received question answer from Gemini API');

      logger.info('Successfully generated answer to question');
      return structuredOutput;
    } catch (error) {
      logger.error('Error answering question', error);
      throw new Error(`Failed to answer question: ${error}`);
    }
  }

  /**
   * Calculate durations for video events
   * @param events Array of video events
   * @param videoDuration Optional total duration of the video
   */
  private calculateEventDurations(
    events: VideoEvent[],
    videoDuration?: number,
  ): void {
    if (events.length === 0) return;

    // Sort events by timestamp
    events.sort((a, b) => a.timestamp - b.timestamp);

    // Calculate durations for all events except the last one
    for (let i = 0; i < events.length - 1; i++) {
      const currentEvent = events[i];
      const nextEvent = events[i + 1];
      (currentEvent as VideoEvent & { duration?: number }).duration =
        nextEvent.timestamp - currentEvent.timestamp;
    }

    // For the last event, use videoDuration if provided
    const lastEvent = events[events.length - 1] as VideoEvent & {
      duration?: number;
    };
    if (videoDuration !== undefined) {
      lastEvent.duration = videoDuration - lastEvent.timestamp;
    } else {
      // Set duration to 0 for the last event if no video duration is provided
      lastEvent.duration = 0;
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
