/**
 * Tests for the VideoEvent class
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { VideoEvent } = require('../src/llmop/gemini-client');

// Create some test events
const testEvents = [
  new VideoEvent('Introduction', 'The video begins with an introduction', 0),
  new VideoEvent('First point', 'The speaker makes their first point', 30),
  new VideoEvent('Second point', 'The speaker makes their second point', 60),
  new VideoEvent('Conclusion', 'The video concludes with a summary', 90),
];

// Test creating a VideoEvent with duration
console.log('Testing VideoEvent creation with duration:');
const eventWithDuration = new VideoEvent(
  'Test Event',
  'Test Description',
  10,
  20,
);
console.log(`Event duration: ${eventWithDuration.duration}`); // Should be 10 (20 - 10)

// Test creating a VideoEvent from an object
console.log('\nTesting VideoEvent.fromObject:');
const plainObject = {
  name: 'Object Event',
  description: 'Created from plain object',
  timestamp: 45,
};
const eventFromObject = VideoEvent.fromObject(plainObject);
console.log(
  `Event from object: ${eventFromObject.name}, ${eventFromObject.timestamp}s`,
);

// Test calculating durations for an array of events
console.log('\nTesting VideoEvent.calculateDurations:');
VideoEvent.calculateDurations(testEvents);
testEvents.forEach((event, index) => {
  console.log(
    `Event ${index}: ${event.name}, timestamp: ${event.timestamp}s, duration: ${event.duration}s`,
  );
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
  console.log(
    `Event ${index}: ${event.name}, timestamp: ${event.timestamp}s, duration: ${event.duration}s`,
  );
});

// Test edge cases
console.log('\nTesting edge cases:');

// Empty array
const emptyArray: VideoEvent[] = [];
VideoEvent.calculateDurations(emptyArray);
console.log(
  `Empty array after calculateDurations: ${emptyArray.length} events`,
);

// Single event
const singleEvent = [
  new VideoEvent('Only Event', 'The only event in the video', 10),
];
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
  console.log(
    `Event ${index}: ${event.name}, timestamp: ${event.timestamp}s, duration: ${event.duration}s`,
  );
});
