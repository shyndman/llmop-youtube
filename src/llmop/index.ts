import './meta.js?userscript-metadata';
import { initYouTubeWatcher } from './youtube-watcher';
import { initDebug, log } from './debug';
import './app';

// Export modules for internal use
export * from './llm';

// Initialize the debug system first
initDebug().then(() => {
  log('LLMOP YouTube initializing');

  // Initialize the YouTube watcher to detect video pages and extract video IDs
  initYouTubeWatcher();

  log('LLMOP YouTube initialization complete');
});
