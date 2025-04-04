import { createSignal, onCleanup } from 'solid-js';

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
    console.error('[LLMOP] Error parsing URL:', error);
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
    console.error(
      '[LLMOP] Error checking if current page is a watch page:',
      error,
    );
    return false;
  }
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
      console.log(`[LLMOP] Detected YouTube video: ${videoId}`);
    } else if (
      currentUrl.hostname === 'youtu.be' &&
      currentUrl.pathname.length > 1
    ) {
      const videoId = currentUrl.pathname.substring(1);
      setCurrentVideoId(videoId);
      console.log(`[LLMOP] Detected YouTube video (short URL): ${videoId}`);
    } else {
      setCurrentVideoId(null);
      console.log('[LLMOP] Not on a YouTube watch page');
    }
  } catch (error) {
    console.error('[LLMOP] Error processing URL:', error);
    setCurrentVideoId(null);
  }
}

/**
 * Initializes the YouTube watcher
 * Sets up listeners for URL changes and processes the initial URL
 */
export function initYouTubeWatcher(): void {
  // Process the initial URL
  processCurrentUrl();

  // Set up a listener for the popstate event (browser back/forward)
  window.addEventListener('popstate', processCurrentUrl);

  // YouTube uses pushState for navigation, so we need to override it
  const originalPushState = history.pushState;
  history.pushState = function (...args) {
    // Call the original function
    const result = originalPushState.apply(this, args);

    // Process the new URL
    processCurrentUrl();

    return result;
  };

  // Also override replaceState
  const originalReplaceState = history.replaceState;
  history.replaceState = function (...args) {
    // Call the original function
    const result = originalReplaceState.apply(this, args);

    // Process the new URL
    processCurrentUrl();

    return result;
  };

  // Clean up event listeners when the component is unmounted
  onCleanup(() => {
    window.removeEventListener('popstate', processCurrentUrl);
    history.pushState = originalPushState;
    history.replaceState = originalReplaceState;
  });
}

// Export the video ID signal for use in other components
export { currentVideoId };
