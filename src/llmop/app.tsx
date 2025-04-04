import { createSignal, createEffect, For } from 'solid-js';
import { render } from 'solid-js/web';
import { getPanel, showToast } from '@violentmonkey/ui';
// global CSS
import globalCss from './style.css';
// CSS modules
import styles, { stylesheet } from './style.module.css';
// Import configuration
import { getApiKey, getGeminiModel, getGeminiTemperature } from './config';
// Import YouTube watcher
import { currentVideoId, currentCaptions } from './youtube-watcher';
// Import debug utilities
import { createLogger } from './debug';
// Import Gemini client
import {
  initGeminiClient,
  generateTimestampedEvents,
  VideoEvent,
} from './gemini-client';

// Create a logger for this module
const logger = createLogger('App');

function YouTubeSummarizer() {
  const [events, setEvents] = createSignal<VideoEvent[]>([]);
  const [isLoading, setIsLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [processedVideoIds, setProcessedVideoIds] = createSignal<Set<string>>(
    new Set(),
  );

  // Create effects to track changes to video ID and captions
  createEffect(() => {
    const videoId = currentVideoId();
    const captions = currentCaptions();

    if (videoId && captions) {
      logger.info(
        `Video ${videoId} has ${captions.length} characters of captions`,
      );

      // Check if we've already processed this video
      if (!processedVideoIds().has(videoId)) {
        logger.info(`Auto-generating timestamps for video: ${videoId}`);
        // Automatically generate timestamps when both video ID and captions are available
        generateTimestamps(true);
        // Add this video ID to the processed set
        setProcessedVideoIds((prev) => {
          const newSet = new Set(prev);
          newSet.add(videoId);
          return newSet;
        });
      }
    }
  });

  const generateTimestamps = async (isAutomatic = false) => {
    const currentVideo = currentVideoId();
    const captionsText = currentCaptions();
    logger.log('Generate timestamps requested', {
      videoId: currentVideo,
      hasCaptions: !!captionsText,
    });

    if (!currentVideo) {
      logger.warn('No YouTube video detected');
      showToast('No YouTube video detected', { theme: 'dark' });
      return;
    }

    setIsLoading(true);
    setError(null);
    setEvents([]);
    logger.log('Setting loading state', { loading: true });

    try {
      // Get the API key asynchronously
      logger.log('Getting API key');
      const apiKey = await getApiKey();
      logger.log('API key retrieved', { keyExists: !!apiKey });

      if (!apiKey) {
        logger.warn('No API key found');
        showToast('Please set your Gemini API key in Violentmonkey settings', {
          theme: 'dark',
        });
        setIsLoading(false);
        setError(
          'API key not configured. Please set your Gemini API key in Violentmonkey settings.',
        );
        return;
      }

      // Get the captions for the current video
      const captionsText = currentCaptions();
      logger.log('Starting timestamp generation', {
        hasCaptions: !!captionsText,
      });

      if (!captionsText) {
        logger.warn('No captions available for this video');
        showToast(
          'No captions available for this video. Please wait a moment for captions to load.',
          { theme: 'dark' },
        );
        setIsLoading(false);
        setError(
          'No captions available for this video. Please wait a moment for captions to load.',
        );
        return;
      }

      // Get Gemini configuration
      const modelName = await getGeminiModel();
      const temperature = await getGeminiTemperature();
      logger.log('Using Gemini configuration', { modelName, temperature });

      // Initialize the Gemini client
      const genAI = initGeminiClient(apiKey, {
        model: modelName,
        temperature,
      });

      // Generate timestamped events
      const result = await generateTimestampedEvents(
        genAI,
        currentVideo,
        captionsText,
      );
      logger.log('Timestamps generated', result);

      // Update the UI with the results
      setEvents(result.events);
      setIsLoading(false);

      // Only show toast for automatic generation if we found events
      if (!isAutomatic || result.events.length > 0) {
        showToast(`Found ${result.events.length} key moments in the video!`, {
          theme: 'dark',
        });
      }
    } catch (error) {
      logger.error('Error generating timestamps', error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // Only show error toast for manual generation
      if (!isAutomatic) {
        showToast(`Error: ${errorMessage}`, { theme: 'dark' });
      }

      setIsLoading(false);
      setError(`Error generating timestamps: ${errorMessage}`);
    }
  };

  // Format seconds to MM:SS format
  const formatTimestamp = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Handle timestamp click - seek to that position in the video
  const seekToTimestamp = (seconds: number) => {
    try {
      // Get the video element
      const videoElement = document.querySelector('video');
      if (videoElement) {
        videoElement.currentTime = seconds;
        logger.info(`Seeking to timestamp: ${seconds} seconds`);
      } else {
        logger.warn('Video element not found');
      }
    } catch (error) {
      logger.error('Error seeking to timestamp', error);
    }
  };

  return (
    <div>
      <h2>LLMOP YouTube Timestamper</h2>
      <p>Configure the API key in Violentmonkey settings.</p>

      {currentVideoId() && (
        <div class={styles.videoInfo}>
          <p>Current video: {currentVideoId()}</p>
          {currentCaptions() ? (
            <p>Captions: {currentCaptions()?.length} characters extracted</p>
          ) : (
            <p>Captions: Not available or still loading...</p>
          )}
        </div>
      )}

      <button
        class={styles.summarizeButton}
        onClick={() => generateTimestamps(false)}
        disabled={isLoading() || !currentVideoId()}
      >
        {isLoading() ? 'Analyzing Video...' : 'Refresh Key Moments'}
      </button>

      {error() && (
        <div class={styles.errorContainer}>
          <p>{error()}</p>
        </div>
      )}

      {events().length > 0 && (
        <div class={styles.eventsContainer}>
          <h3>Key Moments</h3>
          <ul class={styles.eventsList}>
            <For each={events()}>
              {(event) => (
                <li class={styles.eventItem}>
                  <div class={styles.eventHeader}>
                    <span class={styles.eventName}>{event.name}</span>
                    <button
                      class={styles.timestampButton}
                      onClick={() => seekToTimestamp(event.timestamp)}
                    >
                      {formatTimestamp(event.timestamp)}
                    </button>
                  </div>
                  <p class={styles.eventDescription}>{event.description}</p>
                </li>
              )}
            </For>
          </ul>
        </div>
      )}
    </div>
  );
}

// Create a logger for the panel
const panelLogger = createLogger('Panel');

// Create a movable panel using @violentmonkey/ui
panelLogger.log('Creating panel');
const panel = getPanel({
  theme: 'dark',
  style: [globalCss, stylesheet].join('\n'),
});

Object.assign(panel.wrapper.style, {
  top: '10vh',
  left: '10vw',
  width: '400px',
});

panel.setMovable(true);
panelLogger.log('Panel created and configured');

// Render our component
panelLogger.log('Rendering YouTubeSummarizer component');
render(YouTubeSummarizer, panel.body);

// Set up an effect to show/hide the panel based on the current page
panelLogger.log('Setting up panel visibility effect');
createEffect(() => {
  const videoId = currentVideoId();

  if (videoId) {
    panel.show();
    panelLogger.info(`Showing panel for video: ${videoId}`);
  } else {
    panel.hide();
    panelLogger.info('Hiding panel - not on a watch page');
  }
});
