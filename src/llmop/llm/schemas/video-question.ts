/**
 * Schema definitions for video question responses
 */

import { z } from 'zod';

/**
 * Schema for video question response
 */
export const VideoQuestionSchema = z.object({
  answer: z
    .string()
    .describe(
      "The answer to the user's question about the video, with timestamp links embedded in the text. If no results, return the string NOT_FOUND",
    ),
});

/**
 * Type for video question response
 */
export type VideoQuestionResponse = z.infer<typeof VideoQuestionSchema>;
