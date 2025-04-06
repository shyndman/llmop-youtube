/**
 * Schema definitions for LLM structured outputs
 */

import { z } from 'zod';

/**
 * Schema for a video event with timestamp
 */
export const VideoEventSchema = z.object({
  name: z.string().describe('Short name of the event'),
  description: z.string().describe('Detailed description of the event'),
  timestamp: z.number().describe('Timestamp in seconds when the event occurs'),
  duration: z.number().optional().describe('Duration of the event in seconds'),
});

/**
 * Schema for video analysis response with events and summary
 */
export const VideoAnalysisSchema = z.object({
  events: z
    .array(VideoEventSchema)
    .describe('Key events in the video with timestamps'),
  summary: z.string().describe('Overall summary of the video content'),
  keyPoints: z
    .array(z.string())
    .describe('Key points or takeaways from the video'),
});

/**
 * Schema for a video question response
 */
export const VideoQuestionSchema = z.object({
  answer: z.string().describe('Answer to the question about the video'),
  relevantTimestamps: z
    .array(
      z.object({
        timestamp: z.number().describe('Timestamp in seconds'),
        description: z.string().describe('Why this timestamp is relevant'),
      }),
    )
    .describe('Timestamps relevant to the answer'),
});

/**
 * Type definitions based on the schemas
 */
export type VideoEvent = z.infer<typeof VideoEventSchema>;
export type VideoAnalysisResponse = z.infer<typeof VideoAnalysisSchema>;
export type VideoQuestionResponse = z.infer<typeof VideoQuestionSchema>;

/**
 * Query types supported by the LLM client
 */
export enum QueryType {
  VIDEO_ANALYSIS = 'videoAnalysis',
  CUSTOM_QUESTION = 'customQuestion',
}
