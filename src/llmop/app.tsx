import { createSignal, createEffect } from 'solid-js';
import { render } from 'solid-js/web';
import { getPanel, showToast } from '@violentmonkey/ui';
// global CSS
import globalCss from './style.css';
// CSS modules
import { stylesheet } from './style.module.css';
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

// Interface for the data that will be passed to the UI builder
export interface UIData {
  videoId: string | null;
  events: VideoEvent[];
  isLoading: boolean;
  error: string | null;
  videoDuration: number;
  captionsLength: number;
  apiResponseTime: number;
  modelName: string;
  temperature: number;
}

// Helper function to format seconds to MM:SS format
export function formatTimestamp(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Helper function to seek to a timestamp in the video
export function seekToTimestamp(seconds: number): void {
  try {
    // Get the video element
    const videoElement = document.querySelector('video');
    if (videoElement) {
      videoElement.currentTime = seconds;
      logger.info(`Seeking to timestamp: ${seconds} seconds`);

      // Find the YouTube player element
      const playerElement = document.querySelector('.html5-video-player');
      if (playerElement) {
        // Check if it has the ytp-autohide class
        if (playerElement.classList.contains('ytp-autohide')) {
          logger.info('Temporarily showing video controls');

          // Remove the class to show controls
          playerElement.classList.remove('ytp-autohide');

          // Set up a flag to track if mouse is over the player
          let isMouseOverPlayer = false;

          // Add mouse enter/leave event listeners
          const handleMouseEnter = () => {
            isMouseOverPlayer = true;
            logger.info('Mouse entered player area');
          };

          const handleMouseLeave = () => {
            isMouseOverPlayer = false;
            logger.info('Mouse left player area');
          };

          playerElement.addEventListener('mouseenter', handleMouseEnter);
          playerElement.addEventListener('mouseleave', handleMouseLeave);

          // Set a timeout to add the class back after 800ms if mouse is not over player
          setTimeout(() => {
            // Only hide controls if mouse is not over the player
            if (!isMouseOverPlayer) {
              playerElement.classList.add('ytp-autohide');
              logger.info('Auto-hiding video controls after timeout');
            } else {
              logger.info('Not hiding controls because mouse is over player');
            }

            // Clean up event listeners
            playerElement.removeEventListener('mouseenter', handleMouseEnter);
            playerElement.removeEventListener('mouseleave', handleMouseLeave);
          }, 1500);
        }
      } else {
        logger.warn('YouTube player element not found');
      }
    } else {
      logger.warn('Video element not found');
    }
  } catch (error) {
    logger.error('Error seeking to timestamp', error);
  }
}

// Placeholder function for the UI builder
// This will be implemented later by the user
export function buildUI(data: UIData): void {
  // For now, just log the data and show a notification
  logger.info('UID data ready for rendering', data);

  // Show a notification with the number of events found
  if (data.events.length > 0) {
    showToast(
      `Found ${data.events.length} key moments in ${data.apiResponseTime}ms`,
      { theme: 'dark' },
    );
  }
}

function YouTubeSummarizer() {
  const [events, setEvents] = createSignal<VideoEvent[]>([]);
  const [isLoading, setIsLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [processedVideoIds, setProcessedVideoIds] = createSignal<Set<string>>(
    new Set(),
  );
  const [videoDuration, setVideoDuration] = createSignal(0);
  const [apiResponseTime, setApiResponseTime] = createSignal(0);
  const [modelName, setModelName] = createSignal('');
  const [temperature, setTemperature] = createSignal(0);

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

  // Effect to get video duration
  createEffect(() => {
    const videoId = currentVideoId();
    if (videoId) {
      // Get the video element and its duration
      const videoElement = document.querySelector('video');
      if (videoElement) {
        // If the duration is available, use it
        if (videoElement.duration && !isNaN(videoElement.duration)) {
          setVideoDuration(videoElement.duration);
          logger.info(`Video duration: ${videoElement.duration} seconds`);
        } else {
          // Otherwise, set up a listener for when duration becomes available
          const handleDurationChange = () => {
            if (videoElement.duration && !isNaN(videoElement.duration)) {
              setVideoDuration(videoElement.duration);
              logger.info(
                `Video duration updated: ${videoElement.duration} seconds`,
              );
              videoElement.removeEventListener(
                'durationchange',
                handleDurationChange,
              );
            }
          };
          videoElement.addEventListener('durationchange', handleDurationChange);
          return () => {
            videoElement.removeEventListener(
              'durationchange',
              handleDurationChange,
            );
          };
        }
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

    const startTime = Date.now();

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
      const modelNameValue = await getGeminiModel();
      const temperatureValue = await getGeminiTemperature();
      setModelName(modelNameValue);
      setTemperature(temperatureValue);
      logger.log('Using Gemini configuration', {
        model: modelNameValue,
        temperature: temperatureValue,
      });

      // Initialize the Gemini client
      const genAI = initGeminiClient(apiKey, {
        model: modelNameValue,
        temperature: temperatureValue,
      });

      // Generate timestamped events
      const result = await generateTimestampedEvents(
        genAI,
        currentVideo,
        captionsText,
      );

      // Calculate API response time
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      setApiResponseTime(responseTime);

      logger.log('Timestamps generated', {
        events: result.events,
        responseTime: `${responseTime}ms`,
        model: modelNameValue,
        temperature: temperatureValue,
      });

      // Update the UI with the results
      setEvents(result.events);
      setIsLoading(false);

      // Only show toast for automatic generation if we found events and it's not handled by buildUI
      if (isAutomatic && result.events.length > 0) {
        showToast(
          `Found ${result.events.length} key moments in ${responseTime}ms!`,
          {
            theme: 'dark',
          },
        );
      }

      // Prepare data for UI builder
      const uiData: UIData = {
        videoId: currentVideo,
        events: result.events,
        isLoading: false,
        error: null,
        videoDuration: videoDuration(),
        captionsLength: captionsText.length,
        apiResponseTime: responseTime,
        modelName: modelNameValue,
        temperature: temperatureValue,
      };

      // Call the UI builder function
      buildUI(uiData);
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

      // Calculate API response time even for errors
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      setApiResponseTime(responseTime);
    }
  };

  // Create an effect to update the UI data when relevant state changes
  createEffect(() => {
    // Only update when we have events and are not loading
    if (events().length > 0 && !isLoading()) {
      const currentVideo = currentVideoId();
      const captionsText = currentCaptions();

      if (currentVideo && captionsText) {
        const uiData: UIData = {
          videoId: currentVideo,
          events: events(),
          isLoading: isLoading(),
          error: error(),
          videoDuration: videoDuration(),
          captionsLength: captionsText.length,
          apiResponseTime: apiResponseTime(),
          modelName: modelName(),
          temperature: temperature(),
        };

        buildUI(uiData);
      }
    }
  });

  // Return a minimal UI with just a button to manually trigger analysis
  return (
    <div style={{ display: 'none' }}>
      {/* Hidden button that can be used for manual triggering if needed */}
      <button
        onClick={() => generateTimestamps(false)}
        style={{ display: 'none' }}
      >
        Analyze Video
      </button>
    </div>
  );
}

// Create a logger for the panel
const panelLogger = createLogger('Panel');

// Create a panel for our component using @violentmonkey/ui
panelLogger.log('Creating panel');
const panel = getPanel({
  theme: 'dark',
  style: [globalCss, stylesheet].join('\n'),
});

// Make the panel minimal and hidden
Object.assign(panel.wrapper.style, {
  position: 'fixed',
  top: '0',
  left: '0',
  width: '0',
  height: '0',
  overflow: 'hidden',
  opacity: '0',
  pointerEvents: 'none',
});

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
    panelLogger.info(`Panel active for video: ${videoId}`);

    // Show a notification when a video is detected
    showToast(`LLMOP active on video: ${videoId}`, { theme: 'dark' });
  } else {
    panel.hide();
    panelLogger.info('Panel inactive - not on a watch page');
  }
});
