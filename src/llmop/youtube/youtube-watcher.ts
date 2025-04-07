import { createSignal, onCleanup } from 'solid-js';
import { createLogger } from '../core/debug';
import { getPollingIntervalSync } from '../core/config';
import { extractCaptions } from './caption-extractor';
import { extractVideoId } from '../utils/url-utils';
import { VideoEvent } from '../gemini/gemini-client';

// Create a logger for this module
const logger = createLogger('YouTubeWatcher');

// Create signals to store the current video ID, captions, and playhead position
const [currentVideoId, setCurrentVideoId] = createSignal<string | null>(null);
const [currentCaptions, setCurrentCaptions] = createSignal<string | null>(null);
const [currentPlayheadPosition, setCurrentPlayheadPosition] = createSignal<
  number | null
>(null);
const [currentEvents, setCurrentEvents] = createSignal<VideoEvent[]>([]);

// Create a simple cache for captions to avoid redundant extraction
// Map of video ID to caption text
const captionsCache = new Map<string, string>();

// Set a default cache size
const DEFAULT_CACHE_SIZE = 10;

// Get the cache size from configuration or use default
const MAX_CACHE_SIZE = (() => {
  // Use GM_getValue directly to avoid TypeScript errors
  const size = GM_getValue('captionsCacheSize', DEFAULT_CACHE_SIZE) as number;
  logger.info(`Using captions cache size: ${size}`);
  return size;
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

      // Start playhead position polling
      startPlayheadPolling();
    } else {
      setCurrentVideoId(null);
      setCurrentCaptions(null);
      logger.info('Not on a YouTube watch page', { url: currentUrl });

      // Stop playhead polling when not on a watch page
      stopPlayheadPolling();
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
    return captions!;
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

    // Set the current captions
    setCurrentCaptions(result.transcript);

    // Add to cache
    addToCache(videoId, result.transcript);

    logger.info(
      `Captions extracted successfully (${result.transcript.length} chars)`,
    );
    logger.info(`Extraction took ${result.elapsed_time_ms}ms`);
  } catch (error) {
    logger.error('Error extracting captions', error);
    setCurrentCaptions(null);
  }
}

// Store the last URL we processed to avoid unnecessary work
let lastProcessedUrl = '';

// Store the interval IDs for cleanup
let urlPollingIntervalId: number | null = null;
let playheadPollingIntervalId: number | null = null;

// Store the polling intervals for restarting the timers
let currentPollingInterval = 0;
const playheadPollingInterval = 1000; // 1 second for playhead updates

// Track whether polling is currently active
let isPollingActive = false;
let isPlayheadPollingActive = false;

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
  urlPollingIntervalId = window.setInterval(
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
  if (urlPollingIntervalId !== null) {
    window.clearInterval(urlPollingIntervalId);
    urlPollingIntervalId = null;
  }
  isPollingActive = false;
}

/**
 * Starts polling for playhead position updates
 */
function startPlayheadPolling(): void {
  if (isPlayheadPollingActive) {
    return; // Already polling
  }

  logger.log('Starting playhead position polling');
  playheadPollingIntervalId = window.setInterval(
    updatePlayheadPosition,
    playheadPollingInterval,
  );
  isPlayheadPollingActive = true;

  // Update immediately on start
  updatePlayheadPosition();
}

/**
 * Stops polling for playhead position updates
 */
function stopPlayheadPolling(): void {
  if (!isPlayheadPollingActive) {
    return; // Already stopped
  }

  logger.log('Stopping playhead position polling');
  if (playheadPollingIntervalId !== null) {
    window.clearInterval(playheadPollingIntervalId);
    playheadPollingIntervalId = null;
  }
  isPlayheadPollingActive = false;

  // Reset the playhead position when stopping polling
  setCurrentPlayheadPosition(null);
}

/**
 * Reads the current playhead position from the YouTube player
 * @returns The current playhead position in seconds, or null if not available
 */
function readPlayheadPosition(): number | null {
  // Only update if we're on a watch page
  if (!currentVideoId()) {
    return null;
  }

  // Get the time directly from the video element (works even when controls are hidden)
  const videoElement = document.querySelector(
    'video.html5-main-video',
  ) as HTMLVideoElement;
  if (videoElement) {
    const currentTime = videoElement.currentTime;
    logger.log('Read playhead position from video element', {
      position: currentTime,
    });
    return currentTime;
  }

  logger.warn('Could not find video.html5-main-video element');
  return null;
}

/**
 * Updates the current playhead position by reading from the video element
 */
function updatePlayheadPosition(): void {
  try {
    const seconds = readPlayheadPosition();

    if (seconds === null) {
      // If we couldn't read the position and we're not on a watch page, stop polling
      if (!currentVideoId()) {
        stopPlayheadPolling();
      }
      return;
    }

    setCurrentPlayheadPosition(seconds);
    logger.log('Updated playhead position', { position: seconds });
  } catch (error) {
    logger.error('Error updating playhead position', error);
  }
}

/**
 * Handles visibility change events
 */
function handleVisibilityChange(): void {
  if (document.hidden) {
    // Page is now hidden, stop polling
    logger.log('Page hidden, pausing polling');
    stopPolling();
    stopPlayheadPolling();
  } else {
    // Page is now visible, restart polling and check for URL changes immediately
    logger.log('Page visible, resuming polling');
    startPolling();

    // Only start playhead polling if we're on a watch page
    if (currentVideoId()) {
      startPlayheadPolling();
    }

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
    stopPlayheadPolling();
  });

  logger.log('YouTube watcher initialized');
}

/**
 * Set the current video events
 * This is called from the app component when events are loaded
 * @param events The video events to set
 */
export function setVideoEvents(events: VideoEvent[]): void {
  setCurrentEvents(events);
  logger.info(`Set ${events.length} video events`);
}

// Export the signals and utility functions for use in other components
export {
  currentVideoId,
  currentCaptions,
  currentPlayheadPosition,
  currentEvents,
  delay,
};
