import { createSignal, onCleanup } from 'solid-js';
import { createLogger } from './debug';
import { getPollingIntervalSync } from './config';

// Create a logger for this module
const logger = createLogger('YouTubeWatcher');

// Create a signal to store the current video ID
const [currentVideoId, setCurrentVideoId] = createSignal<string | null>(null);

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
    // If URL parsing fails, return null
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
 */
function processCurrentUrl(): void {
  try {
    const currentUrl = new URL(window.location.href);

    if (currentUrl.pathname === '/watch' && currentUrl.searchParams.has('v')) {
      const videoId = currentUrl.searchParams.get('v');
      setCurrentVideoId(videoId);
      logger.info(`Detected YouTube video: ${videoId}`);

      // Show notification for testing
      if (videoId) {
        showVideoIdNotification(videoId);
        logger.log('Showing notification for video', { videoId });
      }
    } else if (
      currentUrl.hostname === 'youtu.be' &&
      currentUrl.pathname.length > 1
    ) {
      const videoId = currentUrl.pathname.substring(1);
      setCurrentVideoId(videoId);
      logger.info(`Detected YouTube video (short URL): ${videoId}`);

      // Show notification for testing
      if (videoId) {
        showVideoIdNotification(videoId, true);
        logger.log('Showing notification for short URL video', { videoId });
      }
    } else {
      setCurrentVideoId(null);
      logger.info('Not on a YouTube watch page', { url: currentUrl.href });
    }
  } catch (error) {
    logger.error('Error processing URL', error);
    setCurrentVideoId(null);
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
    processCurrentUrl();
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
  processCurrentUrl();

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

// Export the video ID signal for use in other components
export { currentVideoId };
