import { createSignal, onCleanup } from 'solid-js';
import { createLogger } from './debug';

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

/**
 * Initializes the YouTube watcher
 * Sets up listeners for URL changes and processes the initial URL
 */
export function initYouTubeWatcher(): void {
  logger.log('Initializing YouTube watcher');

  // Use onNavigate from @violentmonkey/url to handle all navigation events
  // This handles pushState, replaceState, and popstate events automatically
  logger.log('Setting up onNavigate listener');
  const cleanup = onNavigate(() => {
    logger.log('Navigation detected', { url: window.location.href });
    processCurrentUrl();
  });

  // Process the initial URL
  logger.log('Processing initial URL', { url: window.location.href });
  processCurrentUrl();

  // Clean up event listeners when the component is unmounted
  onCleanup(() => {
    logger.log('Cleaning up YouTube watcher');
    cleanup(); // Remove the onNavigate listener
  });

  logger.log('YouTube watcher initialized');
}

// Export the video ID signal for use in other components
export { currentVideoId };
