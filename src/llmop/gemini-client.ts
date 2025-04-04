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
export const DEFAULT_GEMINI_MODEL = 'gemini-2.5-pro-exp-03-25';

// Interface for a video event with timestamp
export interface VideoEvent {
  name: string;
  description: string;
  timestamp: number; // Timestamp in seconds
}

// Interface for the structured output from Gemini
export interface VideoEventsResponse {
  events: VideoEvent[];
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

// The system prompt that describes the AI's role
const SYSTEM_PROMPT = `
You are an AI assistant specialized in analyzing video content through captions.
Your task is to identify key events and moments in the video based on the captions provided.
For each key event:
1. Provide a short, descriptive name
2. Write a brief description of what happens
3. Identify the timestamp (in seconds from the start of the video) when this event occurs

Focus on important moments, transitions, or significant points in the content.
Organize events in chronological order (ascending by timestamp).
Aim to identify 5-20 key moments depending on the video length and content density.
`;

// Schema for structured output
const VIDEO_EVENTS_SCHEMA = {
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
  },
  required: ['events'],
};

/**
 * Initialize a Gemini client with the provided API key
 * @param apiKey The Google Gemini API key
 * @param options Optional configuration for the Gemini API
 * @returns A configured Gemini client instance
 */
export function initGeminiClient(
  apiKey: string,
  options: GeminiOptions = DEFAULT_OPTIONS,
) {
  try {
    logger.info('Initializing Gemini client');

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
    throw new Error(`Failed to initialize Gemini client: ${error.message}`);
  }
}

/**
 * Generate timestamped events from video captions using Gemini
 * @param genAI The initialized Gemini client
 * @param videoId The YouTube video ID
 * @param captions The video captions text
 * @returns A promise that resolves to the structured video events
 */
export async function generateTimestampedEvents(
  genAI: GoogleGenAI,
  videoId: string,
  captions: string,
): Promise<VideoEventsResponse> {
  try {
    logger.info(`Generating timestamped events for video: ${videoId}`);

    // Get the model to use
    const modelName = DEFAULT_GEMINI_MODEL;
    logger.info(`Using Gemini model: ${modelName}`);

    // Prepare the prompt with video information
    const userPrompt = `
Video ID: ${videoId}

Here are the captions from the video:
${captions}

Please analyze these captions and identify key events in the video with their timestamps.
`;

    logger.info('Sending request to Gemini API');
    const startTime = Date.now();

    // Generate content with structured output
    const response = await genAI.models.generateContent({
      model: modelName,
      contents: userPrompt,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: 'application/json',
        responseSchema: VIDEO_EVENTS_SCHEMA,
      },
    });

    const elapsedTime = Date.now() - startTime;
    logger.info(`Gemini API response received in ${elapsedTime}ms`);

    // Parse the structured output
    const structuredOutput = JSON.parse(response.text) as VideoEventsResponse;

    // Validate the response
    if (
      !structuredOutput ||
      !structuredOutput.events ||
      !Array.isArray(structuredOutput.events)
    ) {
      logger.error('Invalid response format from Gemini API', structuredOutput);
      throw new Error('Invalid response format from Gemini API');
    }

    // Sort events by timestamp (ascending)
    structuredOutput.events.sort((a, b) => a.timestamp - b.timestamp);

    logger.info(
      `Successfully generated ${structuredOutput.events.length} timestamped events`,
    );
    return structuredOutput;
  } catch (error) {
    logger.error('Error generating timestamped events', error);
    throw new Error(`Failed to generate timestamped events: ${error.message}`);
  }
}
