/**
 * Tests for the VideoEvent class
 */

import { describe, it, expect } from 'vitest';
import { VideoEvent } from '../src/llmop/gemini/gemini-client';

describe('VideoEvent', () => {
  // Create some test events
  const testEvents = [
    new VideoEvent('Introduction', 'The video begins with an introduction', 0),
    new VideoEvent('First point', 'The speaker makes their first point', 30),
    new VideoEvent('Second point', 'The speaker makes their second point', 60),
    new VideoEvent('Conclusion', 'The video concludes with a summary', 90),
  ];

  it('should create a VideoEvent with duration', () => {
    const eventWithDuration = new VideoEvent(
      'Test Event',
      'Test Description',
      10,
      20,
    );
    expect(eventWithDuration.duration).toBe(10); // Should be 10 (20 - 10)
  });

  it('should create a VideoEvent from an object', () => {
    const plainObject = {
      name: 'Object Event',
      description: 'Created from plain object',
      timestamp: 45,
    };
    const eventFromObject = VideoEvent.fromObject(plainObject);
    expect(eventFromObject.name).toBe('Object Event');
    expect(eventFromObject.timestamp).toBe(45);
  });

  it('should calculate durations for an array of events', () => {
    // Clone the test events to avoid modifying the original
    const events = testEvents.map(
      (e) => new VideoEvent(e.name, e.description, e.timestamp),
    );

    VideoEvent.calculateDurations(events);

    // First event duration should be the difference to the next event
    expect(events[0].duration).toBe(30); // 30 - 0
    expect(events[1].duration).toBe(30); // 60 - 30
    expect(events[2].duration).toBe(30); // 90 - 60
    // Last event has no duration by default
    expect(events[3].duration).toBe(0);
  });

  it('should calculate durations with video duration for the last event', () => {
    const eventsWithVideoDuration = [
      new VideoEvent('Start', 'Video starts', 0),
      new VideoEvent('Middle', 'Middle of video', 50),
      new VideoEvent('End', 'End of video', 90),
    ];

    VideoEvent.calculateDurations(eventsWithVideoDuration, 120); // Total video is 120 seconds

    expect(eventsWithVideoDuration[0].duration).toBe(50); // 50 - 0
    expect(eventsWithVideoDuration[1].duration).toBe(40); // 90 - 50
    expect(eventsWithVideoDuration[2].duration).toBe(30); // 120 - 90
  });

  describe('edge cases', () => {
    it('should handle empty arrays', () => {
      const emptyArray: VideoEvent[] = [];
      VideoEvent.calculateDurations(emptyArray);
      expect(emptyArray.length).toBe(0);
    });

    it('should handle single events with video duration', () => {
      const singleEvent = [
        new VideoEvent('Only Event', 'The only event in the video', 10),
      ];
      VideoEvent.calculateDurations(singleEvent, 60); // 60 second video
      expect(singleEvent[0].duration).toBe(50); // Should be 50 (60 - 10)
    });

    it('should sort unsorted events before calculating durations', () => {
      const unsortedEvents = [
        new VideoEvent('Third', 'Third event', 75),
        new VideoEvent('First', 'First event', 15),
        new VideoEvent('Second', 'Second event', 45),
      ];

      VideoEvent.calculateDurations(unsortedEvents);

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
