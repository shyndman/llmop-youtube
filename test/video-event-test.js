/**
 * Manual test for VideoEvent class
 * This is a simplified test that doesn't rely on importing the actual module
 */

// Mock implementation of VideoEvent class for testing
class VideoEvent {
  constructor(name, description, timestamp, nextEventTimestamp) {
    this.name = name;
    this.description = description;
    this.timestamp = timestamp;
    
    // Calculate duration if nextEventTimestamp is provided
    if (nextEventTimestamp !== undefined) {
      this._duration = nextEventTimestamp - timestamp;
    }
  }

  // Private field to store the duration
  _duration = undefined;

  /**
   * Get the duration of this event (time until the next event)
   * Returns undefined if this is the last event or duration hasn't been set
   */
  get duration() {
    return this._duration;
  }

  /**
   * Set the duration of this event
   * @param value Duration in seconds
   */
  set duration(value) {
    this._duration = value;
  }

  /**
   * Create a VideoEvent instance from a plain object
   * @param obj Plain object with VideoEvent properties
   * @returns A new VideoEvent instance
   */
  static fromObject(obj) {
    return new VideoEvent(obj.name, obj.description, obj.timestamp);
  }

  /**
   * Calculate durations for an array of VideoEvent instances
   * @param events Array of VideoEvent instances sorted by timestamp
   * @param videoDuration Optional total video duration for the last event
   * @returns The same array with durations calculated
   */
  static calculateDurations(events, videoDuration) {
    // Ensure events are sorted by timestamp
    events.sort((a, b) => a.timestamp - b.timestamp);

    // Calculate durations for all events except the last one
    for (let i = 0; i < events.length - 1; i++) {
      events[i].duration = events[i + 1].timestamp - events[i].timestamp;
    }

    // For the last event, use videoDuration if provided
    if (events.length > 0 && videoDuration !== undefined) {
      const lastEvent = events[events.length - 1];
      lastEvent.duration = videoDuration - lastEvent.timestamp;
    }

    return events;
  }
}

// Create some test events
const testEvents = [
  new VideoEvent('Introduction', 'The video begins with an introduction', 0),
  new VideoEvent('First point', 'The speaker makes their first point', 30),
  new VideoEvent('Second point', 'The speaker makes their second point', 60),
  new VideoEvent('Conclusion', 'The video concludes with a summary', 90),
];

// Test creating a VideoEvent with duration
console.log('Testing VideoEvent creation with duration:');
const eventWithDuration = new VideoEvent('Test Event', 'Test Description', 10, 20);
console.log(`Event duration: ${eventWithDuration.duration}`); // Should be 10 (20 - 10)

// Test creating a VideoEvent from an object
console.log('\nTesting VideoEvent.fromObject:');
const plainObject = {
  name: 'Object Event',
  description: 'Created from plain object',
  timestamp: 45,
};
const eventFromObject = VideoEvent.fromObject(plainObject);
console.log(`Event from object: ${eventFromObject.name}, ${eventFromObject.timestamp}s`);

// Test calculating durations for an array of events
console.log('\nTesting VideoEvent.calculateDurations:');
VideoEvent.calculateDurations(testEvents);
testEvents.forEach((event, index) => {
  console.log(`Event ${index}: ${event.name}, timestamp: ${event.timestamp}s, duration: ${event.duration}s`);
});

// Test calculating durations with video duration for the last event
console.log('\nTesting VideoEvent.calculateDurations with video duration:');
const eventsWithVideoDuration = [
  new VideoEvent('Start', 'Video starts', 0),
  new VideoEvent('Middle', 'Middle of video', 50),
  new VideoEvent('End', 'End of video', 90),
];
VideoEvent.calculateDurations(eventsWithVideoDuration, 120); // Total video is 120 seconds
eventsWithVideoDuration.forEach((event, index) => {
  console.log(`Event ${index}: ${event.name}, timestamp: ${event.timestamp}s, duration: ${event.duration}s`);
});

// Test edge cases
console.log('\nTesting edge cases:');

// Empty array
const emptyArray = [];
VideoEvent.calculateDurations(emptyArray);
console.log(`Empty array after calculateDurations: ${emptyArray.length} events`);

// Single event
const singleEvent = [new VideoEvent('Only Event', 'The only event in the video', 10)];
VideoEvent.calculateDurations(singleEvent, 60); // 60 second video
console.log(`Single event duration: ${singleEvent[0].duration}s`); // Should be 50 (60 - 10)

// Unsorted events
const unsortedEvents = [
  new VideoEvent('Third', 'Third event', 75),
  new VideoEvent('First', 'First event', 15),
  new VideoEvent('Second', 'Second event', 45),
];
VideoEvent.calculateDurations(unsortedEvents);
console.log('Unsorted events after calculateDurations (should be sorted):');
unsortedEvents.forEach((event, index) => {
  console.log(`Event ${index}: ${event.name}, timestamp: ${event.timestamp}s, duration: ${event.duration}s`);
});
