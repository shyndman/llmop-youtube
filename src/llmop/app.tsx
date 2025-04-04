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
import { currentVideoId } from './youtube-watcher';

function YouTubeSummarizer() {
  const [summary, setSummary] = createSignal('');
  const [isLoading, setIsLoading] = createSignal(false);
  const videoId = currentVideoId();

  const generateSummary = () => {
    const apiKey = getApiKey();
    const currentVideo = currentVideoId();

    if (!apiKey) {
      showToast('Please set your Gemini API key in Violentmonkey settings', {
        theme: 'dark',
      });
      return;
    }

    if (!currentVideo) {
      showToast('No YouTube video detected', { theme: 'dark' });
      return;
    }

    setIsLoading(true);
    // This is a placeholder for the actual API call
    setTimeout(() => {
      setSummary(
        `This is a sample summary of YouTube video ID: ${currentVideo}. In a real implementation, this would call the Gemini API with your API key: ${apiKey.substring(0, 3)}...`,
      );
      setIsLoading(false);
      showToast('Summary generated!', { theme: 'dark' });
    }, 1500);
  };

  return (
    <div>
      <h2>LLMOP YouTube Summarizer</h2>
      <p>Configure the API key in Violentmonkey settings.</p>

      {videoId && <p class={styles.videoInfo}>Current video: {videoId}</p>}

      <button
        class={styles.summarizeButton}
        onClick={generateSummary}
        disabled={isLoading() || !videoId}
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

// Create a movable panel using @violentmonkey/ui
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

// Render our component
render(YouTubeSummarizer, panel.body);

// Set up an effect to show/hide the panel based on the current page
createEffect(() => {
  const videoId = currentVideoId();

  if (videoId) {
    panel.show();
    console.log(`[LLMOP] Showing panel for video: ${videoId}`);
  } else {
    panel.hide();
    console.log('[LLMOP] Hiding panel - not on a watch page');
  }
});
