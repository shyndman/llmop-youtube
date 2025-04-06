# llmop-youtube

LLM Omnipresent, for Youtube.

## Features

- Extracts captions from YouTube videos
- Analyzes video content using Google's Gemini API
- Identifies key events and timestamps in videos
- Tracks current playhead position and active key event
- Provides a UI for interacting with video analysis

## Signals

The application uses SolidJS signals to track state:

- `currentVideoId`: The ID of the currently playing YouTube video
- `currentCaptions`: The extracted captions for the current video
- `currentPlayheadPosition`: The current playback position in seconds
- `currentActiveEvent`: The currently active key event based on playhead position

## Development

``` sh
# Compile and watch
$ yarn dev

# Build script
$ yarn build

# Lint
$ yarn lint
```
