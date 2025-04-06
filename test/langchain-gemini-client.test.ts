/**
 * Tests for the LangChain-based GeminiClient
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GeminiClient } from '../src/llmop/llm/gemini-client';
import { VideoEvent } from '../src/llmop/llm/schemas';

// Mock the ChatGoogleGenerativeAI class
vi.mock('@langchain/google-genai', () => ({
  ChatGoogleGenerativeAI: vi.fn().mockImplementation(() => ({
    invoke: vi.fn().mockResolvedValue({
      content: JSON.stringify({
        events: [
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
        ],
        summary: 'This is a test summary',
        keyPoints: ['Point 1', 'Point 2'],
      }),
    }),
  })),
}));

// Mock the logger
vi.mock('../src/llmop/debug', () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    log: vi.fn(),
  }),
}));

describe('GeminiClient', () => {
  let client: GeminiClient;

  beforeEach(() => {
    client = new GeminiClient('fake-api-key');
    // Set video context
    client.setVideoContext('test-video-id', 'Test captions');
  });

  describe('calculateEventDurations', () => {
    it('should calculate durations for events', () => {
      // Access the private method using type assertion
      // Define the type for the calculateEventDurations method
      type CalculateEventDurationsMethod = (
        events: VideoEvent[],
        videoDuration?: number,
      ) => void;
      const calculateDurations = (
        client as unknown as {
          calculateEventDurations: CalculateEventDurationsMethod;
        }
      ).calculateEventDurations.bind(client);

      const events: VideoEvent[] = [
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

      calculateDurations(events);

      // First event duration should be the difference to the next event
      expect(events[0].duration).toBe(30); // 30 - 0
      expect(events[1].duration).toBe(30); // 60 - 30
      expect(events[2].duration).toBe(30); // 90 - 60
      // Last event has no duration by default
      expect(events[3].duration).toBe(0);
    });

    it('should calculate durations with video duration for the last event', () => {
      // Access the private method using type assertion
      // Use the CalculateEventDurationsMethod type
      type CalculateEventDurationsMethod = (
        events: VideoEvent[],
        videoDuration?: number,
      ) => void;
      const calculateDurations = (
        client as unknown as {
          calculateEventDurations: CalculateEventDurationsMethod;
        }
      ).calculateEventDurations.bind(client);

      const events: VideoEvent[] = [
        { name: 'Start', description: 'Video starts', timestamp: 0 },
        { name: 'Middle', description: 'Middle of video', timestamp: 50 },
        { name: 'End', description: 'End of video', timestamp: 90 },
      ];

      calculateDurations(events, 120); // Total video is 120 seconds

      expect(events[0].duration).toBe(50); // 50 - 0
      expect(events[1].duration).toBe(40); // 90 - 50
      expect(events[2].duration).toBe(30); // 120 - 90
    });

    it('should handle empty arrays', () => {
      // Access the private method using type assertion
      // Use the CalculateEventDurationsMethod type
      type CalculateEventDurationsMethod = (
        events: VideoEvent[],
        videoDuration?: number,
      ) => void;
      const calculateDurations = (
        client as unknown as {
          calculateEventDurations: CalculateEventDurationsMethod;
        }
      ).calculateEventDurations.bind(client);

      const emptyArray: VideoEvent[] = [];
      calculateDurations(emptyArray);
      expect(emptyArray.length).toBe(0);
    });

    it('should handle single events with video duration', () => {
      // Access the private method using type assertion
      // Use the CalculateEventDurationsMethod type
      type CalculateEventDurationsMethod = (
        events: VideoEvent[],
        videoDuration?: number,
      ) => void;
      const calculateDurations = (
        client as unknown as {
          calculateEventDurations: CalculateEventDurationsMethod;
        }
      ).calculateEventDurations.bind(client);

      const singleEvent: VideoEvent[] = [
        {
          name: 'Only Event',
          description: 'The only event in the video',
          timestamp: 10,
        },
      ];
      calculateDurations(singleEvent, 60); // 60 second video
      expect(singleEvent[0].duration).toBe(50); // Should be 50 (60 - 10)
    });

    it('should sort unsorted events before calculating durations', () => {
      // Access the private method using type assertion
      // Use the CalculateEventDurationsMethod type
      type CalculateEventDurationsMethod = (
        events: VideoEvent[],
        videoDuration?: number,
      ) => void;
      const calculateDurations = (
        client as unknown as {
          calculateEventDurations: CalculateEventDurationsMethod;
        }
      ).calculateEventDurations.bind(client);

      const unsortedEvents: VideoEvent[] = [
        { name: 'Third', description: 'Third event', timestamp: 75 },
        { name: 'First', description: 'First event', timestamp: 15 },
        { name: 'Second', description: 'Second event', timestamp: 45 },
      ];

      calculateDurations(unsortedEvents);

      // Events should be sorted by timestamp
      expect(unsortedEvents[0].name).toBe('First');
      expect(unsortedEvents[1].name).toBe('Second');
      expect(unsortedEvents[2].name).toBe('Third');

      // Durations should be calculated correctly
      expect(unsortedEvents[0].duration).toBe(30); // 45 - 15
      expect(unsortedEvents[1].duration).toBe(30); // 75 - 45
      expect(unsortedEvents[2].duration).toBe(0); // Last event
    });
  });
});
