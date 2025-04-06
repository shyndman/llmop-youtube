/**
 * Schema definitions for video analysis responses
 */

import { z } from 'zod';

/**
 * Schema for a video event
 */
export const VideoEventSchema = z.object({
  name: z.string().describe('A short, descriptive name for the event'),
  description: z
    .string()
    .describe('A brief description of what happens during this event'),
  timestamp: z
    .number()
    .describe('The timestamp in seconds when this event occurs in the video'),
  duration: z
    .number()
    .optional()
    .describe('The duration of this event in seconds'),
});

/**
 * Schema for video analysis response
 */
export const VideoAnalysisSchema = z.object({
  events: z
    .array(VideoEventSchema)
    .describe('Key events in the video with timestamps'),
  summary: z.string().describe('A 1-3 paragraph summary of the video content'),
  keyPoints: z
    .array(z.string())
    .describe('A list of key points or takeaways from the video'),
});

/**
 * Type for a video event
 */
export type VideoEvent = z.infer<typeof VideoEventSchema>;

/**
 * Type for video analysis response
 */
export type VideoAnalysisResponse = z.infer<typeof VideoAnalysisSchema>;
