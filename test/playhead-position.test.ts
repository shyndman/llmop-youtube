/**
 * Test script for the playhead position and current active event signals
 *
 * This is a manual test script that can be run in the browser console
 * to verify that the signals are working correctly.
 */

import {
  currentVideoId,
  currentPlayheadPosition,
  currentActiveEvent,
  setVideoEvents,
} from '../src/llmop/youtube-watcher';
import { createEffect } from 'solid-js';
import { VideoEvent } from '../src/llmop/gemini-client';

// Create a test effect to log changes to the playhead position
createEffect(() => {
  const videoId = currentVideoId();
  const position = currentPlayheadPosition();
  const activeEvent = currentActiveEvent();

  console.log('Playhead position update:', {
    videoId,
    position,
    activeEvent: activeEvent
      ? {
          name: activeEvent.name,
          timestamp: activeEvent.timestamp,
        }
      : null,
  });
});

// Create some test events for testing the current active event signal
const testEvents: VideoEvent[] = [
  {
    name: 'Introduction',
    description: 'The video begins with an introduction',
    timestamp: 0,
  },
  {
    name: 'First point',
    description: 'The speaker makes their first point',
    timestamp: 30,
  },
  {
    name: 'Second point',
    description: 'The speaker makes their second point',
    timestamp: 60,
  },
  {
    name: 'Conclusion',
    description: 'The video concludes with a summary',
    timestamp: 90,
  },
];

// Function to set the test events
function setTestEvents() {
  setVideoEvents(testEvents);
  console.log('Set test events:', testEvents);
}

// Export functions for manual testing in the console
window.testPlayheadPosition = {
  setTestEvents,
  getVideoId: () => currentVideoId(),
  getPosition: () => currentPlayheadPosition(),
  getActiveEvent: () => currentActiveEvent(),
};

console.log(
  'Playhead position test script loaded. Use window.testPlayheadPosition to interact with the test.',
);
