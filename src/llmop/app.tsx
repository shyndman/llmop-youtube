import { createSignal, createEffect } from 'solid-js';
import { render } from 'solid-js/web';
import { getPanel, showToast } from '@violentmonkey/ui';
// global CSS
import globalCss from './style.css';
// CSS modules
import styles, { stylesheet } from './style.module.css';
// Import configuration
import { getApiKey } from './config';
// Import YouTube watcher
import { currentVideoId, currentCaptions } from './youtube-watcher';
// Import debug utilities
import { createLogger } from './debug';

// Create a logger for this module
const logger = createLogger('App');

function YouTubeSummarizer() {
  const [summary, setSummary] = createSignal('');
  const [isLoading, setIsLoading] = createSignal(false);

  // Create effects to track changes to video ID and captions
  createEffect(() => {
    const videoId = currentVideoId();
    const captions = currentCaptions();

    if (videoId && captions) {
      logger.info(
        `Video ${videoId} has ${captions.length} characters of captions`,
      );
    }
  });

  const generateSummary = async () => {
    const currentVideo = currentVideoId();
    const captionsText = currentCaptions();
    logger.log('Generate summary requested', {
      videoId: currentVideo,
      hasCaptions: !!captionsText,
    });

    if (!currentVideo) {
      logger.warn('No YouTube video detected');
      showToast('No YouTube video detected', { theme: 'dark' });
      return;
    }

    setIsLoading(true);
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
        return;
      }

      // Get the captions for the current video
      const captionsText = currentCaptions();
      logger.log('Starting summary generation', {
        hasCaptions: !!captionsText,
      });

      if (!captionsText) {
        logger.warn('No captions available for this video');
        showToast(
          'No captions available for this video. Please wait a moment for captions to load.',
          { theme: 'dark' },
        );
        setIsLoading(false);
        return;
      }

      // This is a placeholder for the actual API call
      // In a real implementation, we would send the captions to the Gemini API
      setTimeout(() => {
        const captionsPreview = captionsText.substring(0, 100) + '...';
        const summaryText = `This is a sample summary of YouTube video ID: ${currentVideo}\n\nCaptions preview: ${captionsPreview}\n\nIn a real implementation, this would call the Gemini API with your API key: ${apiKey.substring(0, 3)}...`;
        logger.log('Summary generated', {
          summary: summaryText.substring(0, 50) + '...',
        });
        setSummary(summaryText);
        setIsLoading(false);
        showToast('Summary generated!', { theme: 'dark' });
      }, 1500);
    } catch (error) {
      logger.error('Error getting API key', error);
      showToast('Error getting API key', { theme: 'dark' });
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h2>LLMOP YouTube Summarizer</h2>
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
        onClick={generateSummary}
        disabled={isLoading() || !currentVideoId()}
      >
        {isLoading() ? 'Generating...' : 'Summarize Video'}
      </button>

      {summary() && (
        <div class={styles.summaryContainer}>
          <h3>Summary</h3>
          <p>{summary()}</p>
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
