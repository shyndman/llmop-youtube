/**
 * URL utility functions for LLMOP YouTube
 * Contains functions for extracting information from YouTube URLs
 */

import { createLogger } from '../core/debug';

// Create a logger for this module
const logger = createLogger('UrlUtils');

/**
 * Extracts the video ID from a YouTube URL
 * @param url The URL to extract from
 * @returns The video ID or null if not found
 */
export function extractVideoId(url: string): string | null {
  try {
    const parsedUrl = new URL(url);

    // Handle youtube.com/watch?v=VIDEO_ID format
    if (
      parsedUrl.hostname.includes('youtube.com') &&
      parsedUrl.pathname === '/watch'
    ) {
      return parsedUrl.searchParams.get('v');
    }

    // Handle youtu.be/VIDEO_ID format
    if (parsedUrl.hostname === 'youtu.be') {
      // The pathname includes a leading slash, so we remove it
      const path = parsedUrl.pathname.substring(1);
      return path || null;
    }

    return null;
  } catch (error) {
    logger.error('Error parsing URL', error);
    return null;
  }
}

/**
 * Checks if the current page is a YouTube watch page
 * @returns True if on a watch page, false otherwise
 */
export function isWatchPage(): boolean {
  try {
    const currentUrl = new URL(window.location.href);
    return currentUrl.pathname === '/watch' && currentUrl.searchParams.has('v');
  } catch (error) {
    logger.error('Error checking if current page is a watch page', error);
    return false;
  }
}
