import { createSignal, createEffect } from 'solid-js';
import { render } from 'solid-js/web';
import { getPanel, showToast } from '@violentmonkey/ui';
// Styles removed
// Import configuration
import { getApiKey, getGeminiModel, getGeminiTemperature } from './config';
// Import YouTube watcher
import { currentVideoId, currentCaptions, delay } from './youtube-watcher';
// Import debug utilities
import { createLogger } from './debug';
// Import Gemini client
import {
  GeminiClient,
  VideoEvent,
  VideoQuestionResponse,
  QueryType,
} from './gemini-client';

// Create a logger for this module
const logger = createLogger('App');

// Interface for the data that will be passed to the UI builder
export interface UIData {
  videoId: string | null;
  events: VideoEvent[];
  summary?: string;
  keyPoints?: string[];
  questionResponse?: VideoQuestionResponse;
  queryType: QueryType;
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

// Helper function to parse timestamp links in text and convert to HTML
export function parseTimestampLinks(text: string): string {
  if (!text) return '';

  // Regular expression to match [text](timestamp) format
  const linkRegex = /\[(.*?)\]\((\d+)\)/g;

  // Replace all matches with HTML links
  return text.replace(
    linkRegex,
    (_match, linkText: string, timestamp: string) => {
      const seconds = parseInt(timestamp, 10);
      const formattedTime = formatTimestamp(seconds);
      return `<a href="#" class="timestamp-link" data-timestamp="${seconds}" title="Jump to ${formattedTime}">${linkText}</a>`;
    },
  );
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

          // Set a timeout to add the class back after 1500ms if mouse is not over player
          void (async () => {
            await delay(1500);

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
          })();
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
  logger.info('UI data ready for rendering', data);

  // Process any timestamp links in the summary
  if (data.summary) {
    // The summary may contain timestamp links in the format [text](timestamp)
    // These can be parsed using the parseTimestampLinks function
    const summaryWithLinks = parseTimestampLinks(data.summary);
    logger.info('Processed summary with timestamp links', { summaryWithLinks });
  }

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
  const [summary, setSummary] = createSignal<string>('');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [keyPoints, setKeyPoints] = createSignal<string[]>([]);
  const [questionResponse, setQuestionResponse] = createSignal<
    VideoQuestionResponse | undefined
  >(undefined);
  const [queryType, setQueryType] = createSignal<QueryType>(
    QueryType.VIDEO_ANALYSIS,
  );
  const [isLoading, setIsLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [processedVideoIds, setProcessedVideoIds] = createSignal<Set<string>>(
    new Set(),
  );
  const [videoDuration, setVideoDuration] = createSignal(0);
  const [apiResponseTime, setApiResponseTime] = createSignal(0);
  const [modelName, setModelName] = createSignal('');
  const [temperature, setTemperature] = createSignal(0);
  const [geminiClient, setGeminiClient] = createSignal<GeminiClient | null>(
    null,
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
        logger.info(`Auto-generating video analysis for video: ${videoId}`);
        // Automatically generate video analysis when both video ID and captions are available
        void generateVideoAnalysis(true);
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

  // Helper function to initialize the Gemini client
  const initializeClient = async () => {
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
        return null;
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

      // Initialize the Gemini client if not already initialized
      let client = geminiClient();
      if (!client) {
        client = new GeminiClient(apiKey, {
          model: modelNameValue,
          temperature: temperatureValue,
        });
        setGeminiClient(client);
      }

      return client;
    } catch (error) {
      logger.error('Error initializing Gemini client', error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      setError(`Error initializing Gemini client: ${errorMessage}`);
      return null;
    }
  };

  // Generate video analysis with key events and summary
  const generateVideoAnalysis = async (isAutomatic = false) => {
    const currentVideo = currentVideoId();
    const captionsText = currentCaptions();
    logger.log('Generate video analysis requested', {
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
    setSummary('');
    setKeyPoints([]);
    setQuestionResponse(undefined);
    setQueryType(QueryType.VIDEO_ANALYSIS);
    logger.log('Setting loading state', { loading: true });

    const startTime = Date.now();

    try {
      // Get the captions for the current video
      const captionsText = currentCaptions();
      logger.log('Starting video analysis', {
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

      // Initialize the client
      const client = await initializeClient();
      if (!client) {
        setIsLoading(false);
        return;
      }

      // Set the video context
      client.setVideoContext(currentVideo, captionsText);

      // Generate video analysis with events and summary
      const result = await client.getVideoAnalysis();

      // Calculate API response time
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      setApiResponseTime(responseTime);

      logger.log('Video analysis generated', {
        events: result.events.length,
        summary: result.summary.substring(0, 100) + '...',
        keyPoints: result.keyPoints,
        responseTime: `${responseTime}ms`,
        model: modelName(),
        temperature: temperature(),
      });

      // Update the UI with the results
      setEvents(result.events);
      setSummary(result.summary); // Summary may contain timestamp links in the format [text](timestamp)
      setKeyPoints(result.keyPoints);
      setIsLoading(false);

      // Only show toast for automatic generation if we found events and it's not handled by buildUI
      if (isAutomatic && result.events.length > 0) {
        showToast(
          `Video analysis complete: ${result.events.length} key moments identified in ${responseTime}ms!`,
          {
            theme: 'dark',
          },
        );
      }

      // Prepare data for UI builder
      const uiData: UIData = {
        videoId: currentVideo,
        events: result.events,
        summary: result.summary,
        keyPoints: result.keyPoints,
        queryType: QueryType.VIDEO_ANALYSIS,
        isLoading: false,
        error: null,
        videoDuration: videoDuration(),
        captionsLength: captionsText.length,
        apiResponseTime: responseTime,
        modelName: modelName(),
        temperature: temperature(),
      };

      // Call the UI builder function
      buildUI(uiData);
    } catch (error) {
      logger.error('Error generating video analysis', error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // Only show error toast for manual generation
      if (!isAutomatic) {
        showToast(`Error: ${errorMessage}`, { theme: 'dark' });
      }

      setIsLoading(false);
      setError(`Error generating video analysis: ${errorMessage}`);

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
          summary: summary(),
          questionResponse: questionResponse(),
          queryType: queryType(),
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

  // Ask a custom question about the video
  const askQuestion = async (question: string) => {
    const currentVideo = currentVideoId();
    const captionsText = currentCaptions();
    logger.log('Ask question requested', {
      videoId: currentVideo,
      hasCaptions: !!captionsText,
      question,
    });

    if (!currentVideo) {
      logger.warn('No YouTube video detected');
      showToast('No YouTube video detected', { theme: 'dark' });
      return;
    }

    setIsLoading(true);
    setError(null);
    setEvents([]);
    setSummary(undefined);
    setQuestionResponse(undefined);
    setQueryType(QueryType.CUSTOM_QUESTION);
    logger.log('Setting loading state', { loading: true });

    const startTime = Date.now();

    try {
      // Get the captions for the current video
      const captionsText = currentCaptions();
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

      // Initialize the client
      const client = await initializeClient();
      if (!client) {
        setIsLoading(false);
        return;
      }

      // Set the video context
      client.setVideoContext(currentVideo, captionsText);

      // Ask the question
      const result = await client.askQuestion(question);

      // Calculate API response time
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      setApiResponseTime(responseTime);

      logger.log('Question answered', {
        answer: result.answer,
        responseTime: `${responseTime}ms`,
        model: modelName(),
        temperature: temperature(),
      });

      // Update the UI with the results
      setQuestionResponse(result);
      setIsLoading(false);

      // Show toast for question answering
      showToast(`Answered question in ${responseTime}ms!`, {
        theme: 'dark',
      });

      // Prepare data for UI builder
      const uiData: UIData = {
        videoId: currentVideo,
        events: [],
        questionResponse: result,
        queryType: QueryType.CUSTOM_QUESTION,
        isLoading: false,
        error: null,
        videoDuration: videoDuration(),
        captionsLength: captionsText.length,
        apiResponseTime: responseTime,
        modelName: modelName(),
        temperature: temperature(),
      };

      // Call the UI builder function
      buildUI(uiData);
    } catch (error) {
      logger.error('Error answering question', error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      showToast(`Error: ${errorMessage}`, { theme: 'dark' });

      setIsLoading(false);
      setError(`Error answering question: ${errorMessage}`);

      // Calculate API response time even for errors
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      setApiResponseTime(responseTime);
    }
  };

  // Return a minimal UI with just a button to manually trigger analysis
  return (
    <div style={{ display: 'none' }}>
      {/* Hidden buttons that can be used for manual triggering if needed */}
      <button
        onClick={() => {
          void generateVideoAnalysis(false);
        }}
        style={{ display: 'none' }}
      >
        Analyze Video
      </button>
      <button
        onClick={() => {
          void askQuestion('What is this video about?');
        }}
        style={{ display: 'none' }}
      >
        Ask Question
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
  // Style removed
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
