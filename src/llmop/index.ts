import './meta.js?userscript-metadata';
import { initYouTubeWatcher } from './youtube-watcher';
import './app';

// Initialize the YouTube watcher to detect video pages and extract video IDs
initYouTubeWatcher();
