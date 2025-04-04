import { createSignal, onCleanup } from 'solid-js';
import { createLogger } from './debug';
import { getPollingIntervalSync } from './config';
import { extractCaptions } from './caption-extractor';
import { extractVideoId } from './url-utils';

// Create a logger for this module
const logger = createLogger('YouTubeWatcher');

// Create signals to store the current video ID and captions
const [currentVideoId, setCurrentVideoId] = createSignal<string | null>(null);
const [currentCaptions, setCurrentCaptions] = createSignal<string | null>(null);

// Create a simple cache for captions to avoid redundant extraction
// Map of video ID to caption text
const captionsCache = new Map<string, string>();

// Set a default cache size
const DEFAULT_CACHE_SIZE = 10;

// Get the cache size from configuration or use default
const MAX_CACHE_SIZE = (() => {
  try {
    // Use GM_getValue directly to avoid TypeScript errors
    const size = GM_getValue('captionsCacheSize', DEFAULT_CACHE_SIZE) as number;
    logger.info(`Using captions cache size: ${size}`);
    return size;
  } catch (error) {
    logger.warn('Error getting cache size from config, using default', error);
    return DEFAULT_CACHE_SIZE;
  }
})();

/**
 * Shows a temporary notification with the video ID using GM.notification
 * @param videoId The video ID to display
 * @param isShortUrl Whether this is from a youtu.be URL
 */
function showVideoIdNotification(videoId: string, isShortUrl = false): void {
  const urlType = isShortUrl ? 'youtu.be' : 'youtube.com';
  const title = 'LLMOP YouTube Detected';
  const text = `Source: ${urlType}\nVideo ID: ${videoId}`;

  // Use GM.notification to show a system notification
  GM.notification({
    title,
    text,
    image: 'https://www.youtube.com/favicon.ico', // YouTube favicon
    onclick: () => {
      logger.log('Notification clicked');
    },
  });
}

/**
 * Processes the current URL and updates the video ID if on a watch page
 * @returns A promise that resolves when processing is complete
 */
async function processCurrentUrl(): Promise<void> {
  try {
    const currentUrl = window.location.href;
    const videoId = extractVideoId(currentUrl);

    if (videoId) {
      setCurrentVideoId(videoId);
      logger.info(`Detected YouTube video: ${videoId}`);

      // Show notification for testing
      const isShortUrl = currentUrl.includes('youtu.be');
      showVideoIdNotification(videoId, isShortUrl);
      logger.log('Showing notification for video', { videoId, isShortUrl });

      // Extract captions for this video
      await extractCaptionsForVideo(videoId);
    } else {
      setCurrentVideoId(null);
      setCurrentCaptions(null);
      logger.info('Not on a YouTube watch page', { url: currentUrl });
    }
  } catch (error) {
    logger.error('Error processing URL', error);
    setCurrentVideoId(null);
    setCurrentCaptions(null);
  }
}

/**
 * Creates a promise that resolves after the specified delay
 * @param ms The delay in milliseconds
 * @returns A promise that resolves after the delay
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Adds captions to the cache, maintaining the maximum cache size
 * @param videoId The YouTube video ID
 * @param captions The captions text
 */
function addToCache(videoId: string, captions: string): void {
  // If cache is at max size, remove the oldest entry
  if (captionsCache.size >= MAX_CACHE_SIZE) {
    const oldestKey = captionsCache.keys().next().value as string;
    captionsCache.delete(oldestKey);
    logger.info(`Removed oldest cache entry for video: ${oldestKey}`);
  }

  // Add the new captions to the cache
  captionsCache.set(videoId, captions);
  logger.info(`Added captions to cache for video: ${videoId}`);
}

/**
 * Gets captions from cache if available
 * @param videoId The YouTube video ID
 * @returns The cached captions or null if not in cache
 */
function getFromCache(videoId: string): string | null {
  if (captionsCache.has(videoId)) {
    const captions = captionsCache.get(videoId);
    logger.info(`Using cached captions for video: ${videoId}`);
    return captions || null;
  }
  return null;
}

/**
 * Extracts captions for a specific video ID
 * @param videoId The YouTube video ID
 */
async function extractCaptionsForVideo(videoId: string): Promise<void> {
  try {
    logger.info(`Processing captions for video ID: ${videoId}`);

    // Check if captions are in the cache
    const cachedCaptions = getFromCache(videoId);
    if (cachedCaptions) {
      setCurrentCaptions(cachedCaptions);
      return;
    }

    logger.info(`Extracting captions for video ID: ${videoId}`);

    // Wait a short time for the page to fully load
    await delay(1000); // Wait 1 second for the page to stabilize

    const result = await extractCaptions(videoId);

    if (result && result.transcript) {
      // Set the current captions
      setCurrentCaptions(result.transcript);

      // Add to cache
      addToCache(videoId, result.transcript);

      logger.info(
        `Captions extracted successfully (${result.transcript.length} chars)`,
      );
      logger.info(`Extraction took ${result.elapsed_time_ms}ms`);
    } else {
      setCurrentCaptions(null);
      logger.warn('Failed to extract captions');
    }
  } catch (error) {
    logger.error('Error extracting captions', error);
    setCurrentCaptions(null);
  }
}

// Store the last URL we processed to avoid unnecessary work
let lastProcessedUrl = '';

// Store the interval ID for cleanup
let pollingIntervalId: number | null = null;

// Store the polling interval for restarting the timer
let currentPollingInterval = 0;

// Track whether polling is currently active
let isPollingActive = false;

/**
 * Very lightweight check to see if the URL has changed
 * This is called frequently, so it needs to be extremely efficient
 */
function checkForUrlChange(): void {
  // Get the current URL - this is a very fast operation
  const currentUrl = window.location.href;

  // Only do work if the URL has changed
  if (currentUrl !== lastProcessedUrl) {
    logger.log('URL change detected', {
      from: lastProcessedUrl || '(initial)',
      to: currentUrl,
    });

    // Update the last processed URL
    lastProcessedUrl = currentUrl;

    // Process the new URL
    void processCurrentUrl();
  }
}

/**
 * Starts the URL polling
 */
function startPolling(): void {
  if (isPollingActive) {
    return; // Already polling
  }

  logger.log('Starting URL polling');
  pollingIntervalId = window.setInterval(
    checkForUrlChange,
    currentPollingInterval,
  );
  isPollingActive = true;
}

/**
 * Stops the URL polling
 */
function stopPolling(): void {
  if (!isPollingActive) {
    return; // Already stopped
  }

  logger.log('Stopping URL polling');
  if (pollingIntervalId !== null) {
    window.clearInterval(pollingIntervalId);
    pollingIntervalId = null;
  }
  isPollingActive = false;
}

/**
 * Handles visibility change events
 */
function handleVisibilityChange(): void {
  if (document.hidden) {
    // Page is now hidden, stop polling
    logger.log('Page hidden, pausing URL polling');
    stopPolling();
  } else {
    // Page is now visible, restart polling and check for URL changes immediately
    logger.log('Page visible, resuming URL polling');
    startPolling();

    // Check for URL changes immediately in case they happened while hidden
    checkForUrlChange();
  }
}

/**
 * Initializes the YouTube watcher
 * Sets up a polling interval to check for URL changes
 */
export function initYouTubeWatcher(): void {
  logger.log('Initializing YouTube watcher');

  // Get the polling interval from configuration
  currentPollingInterval = getPollingIntervalSync();
  logger.log('Using polling interval', { intervalMs: currentPollingInterval });

  // Process the initial URL
  logger.log('Processing initial URL', { url: window.location.href });
  lastProcessedUrl = window.location.href;
  void processCurrentUrl();

  // Set up visibility change listener
  logger.log('Setting up visibility change listener');
  document.addEventListener('visibilitychange', handleVisibilityChange);

  // Start polling if the page is visible
  if (!document.hidden) {
    startPolling();
  } else {
    logger.log('Page is initially hidden, polling paused');
  }

  // Clean up when the component is unmounted
  onCleanup(() => {
    logger.log('Cleaning up YouTube watcher');
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    stopPolling();
  });

  logger.log('YouTube watcher initialized');
}

// Export the signals and utility functions for use in other components
export { currentVideoId, currentCaptions, delay };
