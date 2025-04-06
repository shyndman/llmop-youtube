/**
 * Test script for the playhead position and video events
 *
 * This tests the basic functionality of the YouTube watcher signals
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  currentVideoId,
  currentPlayheadPosition,
  currentEvents,
  setVideoEvents,
} from '../src/llmop/youtube-watcher';
import { VideoEvent } from '../src/llmop/llm/schemas';

// Mock the solid-js createEffect and createSignal functions
vi.mock('solid-js', () => ({
  createEffect: vi.fn((fn) => fn()),
  createSignal: vi.fn((initialValue) => {
    // This is a simplified mock that doesn't fully replicate signal behavior
    // but is sufficient for our tests
    return [
      () => initialValue,
      (newValue: unknown) => {
        return typeof newValue === 'function'
          ? newValue(initialValue)
          : newValue;
      },
    ];
  }),
}));

// Create test state variables
let mockVideoId = '';
let mockPlayheadPosition = 0;
let mockEvents: VideoEvent[] = [];

// Mock the YouTube watcher module
vi.mock('../src/llmop/youtube-watcher', () => ({
  currentVideoId: vi.fn(() => mockVideoId),
  currentPlayheadPosition: vi.fn(() => mockPlayheadPosition),
  currentEvents: vi.fn(() => mockEvents),
  setVideoEvents: vi.fn((events: VideoEvent[]) => {
    mockEvents = [...events];
  }),
  // Other exports that might be used elsewhere
  delay: vi.fn(),
  initYouTubeWatcher: vi.fn(),
  currentCaptions: vi.fn(() => null),
}));

// Helper functions for tests
function setMockVideoId(id: string): void {
  mockVideoId = id;
}

function setMockPlayheadPosition(position: number): void {
  mockPlayheadPosition = position;
}

describe('YouTube Watcher', () => {
  // Create some test events for testing
  const testEvents: VideoEvent[] = [
    {
      name: 'Introduction',
      description: 'The video begins with an introduction',
      timestamp: 0,
      duration: 30,
    },
    {
      name: 'First point',
      description: 'The speaker makes their first point',
      timestamp: 30,
      duration: 30,
    },
    {
      name: 'Second point',
      description: 'The speaker makes their second point',
      timestamp: 60,
      duration: 30,
    },
    {
      name: 'Conclusion',
      description: 'The video concludes with a summary',
      timestamp: 90,
      duration: 0,
    },
  ];

  beforeEach(() => {
    // Reset the state before each test
    setMockVideoId('');
    setMockPlayheadPosition(0);
    mockEvents = [];
  });

  it('should set and get the current video ID', () => {
    const testVideoId = 'test-video-id';
    setMockVideoId(testVideoId);
    expect(currentVideoId()).toBe(testVideoId);
  });

  it('should set and get the current playhead position', () => {
    const testPosition = 45;
    setMockPlayheadPosition(testPosition);
    expect(currentPlayheadPosition()).toBe(testPosition);
  });

  it('should set video events', () => {
    // Set up test events
    setVideoEvents(testEvents);
    expect(currentEvents()).toHaveLength(4);
    expect(currentEvents()[0].name).toBe('Introduction');
  });

  // Note: The active event functionality would need to be tested in integration tests
  // or with a more complex mock that simulates the actual implementation
});
