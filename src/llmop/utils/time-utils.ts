/**
 * Time utility functions for LLMOP YouTube
 * Contains functions for parsing and formatting time values
 */

import { createLogger } from '../core/debug';

// Create a logger for this module
const logger = createLogger('TimeUtils');

/**
 * Parse a time string in the format "mm:ss" or "hh:mm:ss" to seconds
 * @param timeString The time string to parse (e.g., "1:30" or "1:30:45")
 * @returns The time in seconds, or null if parsing fails
 */
export function parseTimeString(timeString: string): number | null {
  // Remove any whitespace
  const trimmed = timeString.trim();

  // Split by colon
  const parts = trimmed.split(':');

  if (parts.length === 2) {
    // Format: mm:ss
    const minutes = parseInt(parts[0], 10);
    const seconds = parseInt(parts[1], 10);

    if (isNaN(minutes) || isNaN(seconds)) {
      logger.warn('Invalid time format', { timeString });
      return null;
    }

    return minutes * 60 + seconds;
  } else if (parts.length === 3) {
    // Format: hh:mm:ss
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    const seconds = parseInt(parts[2], 10);

    if (isNaN(hours) || isNaN(minutes) || isNaN(seconds)) {
      logger.warn('Invalid time format', { timeString });
      return null;
    }

    return hours * 3600 + minutes * 60 + seconds;
  }

  logger.warn('Unsupported time format', { timeString });
  return null;
}

/**
 * Format seconds to a time string in the format "mm:ss"
 * @param seconds The time in seconds
 * @returns The formatted time string
 */
export function formatTimeString(seconds: number): string {
  if (seconds < 0) {
    return '0:00';
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}
