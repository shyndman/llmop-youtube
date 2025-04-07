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
# Compile and watch (debug version)
$ yarn dev

# Build both debug and release versions
$ yarn build

# Build only debug version
$ yarn build:debug

# Build only release version
$ yarn build:release

# Lint
$ yarn lint
```

## Release Process

This project uses GitHub Actions for automated releases:

1. When changes are pushed to the `main` branch, the test workflow runs first
2. If tests pass, the release workflow builds both debug and release versions of the userscript
3. If the version in `package.json` has changed, a new GitHub release is created
4. The release includes both minified (release) and readable (debug) versions of the userscript

To create a new release:

1. Update the version number in `package.json`
2. Commit and push to the `main` branch
3. The GitHub Actions workflow will automatically create a new release
