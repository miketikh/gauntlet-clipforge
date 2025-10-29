# PR 3.3 Testing Instructions - VideoAnalysisService

## Overview
This PR implements the full video transcription pipeline that orchestrates:
1. Audio extraction from video
2. Audio file validation
3. Whisper API transcription
4. Temporary file cleanup (always, even on error)
5. Timestamp adjustment for trimmed clips

## Prerequisites

Before testing, ensure:
1. ✅ OpenAI API key is configured
2. ✅ Test video exists at `/Users/Gauntlet/gauntlet/videojarvis/test-output/sample-video.mp4`
3. ✅ App is running with `npm start`

## Console Tests

Open DevTools console and run these tests:

### Test 1: Basic Transcription Pipeline

```javascript
// Import the videoAnalysisService (from main process)
// Note: These tests will be easier once PR 3.4 adds IPC handler

// For now, test via existing test handler
const testVideoPath = '/Users/Gauntlet/gauntlet/videojarvis/test-output/sample-video.mp4';

// This tests the full pipeline through IPC
console.log('🧪 Test 1: Full video transcription pipeline');
console.log('Testing video:', testVideoPath);
console.log('Expected: Full transcript with segments, proper cleanup');
console.log('');

// Note: Once PR 3.4 is complete, use:
// await window.ipcRenderer.invoke('ai:transcribe-video', { videoPath: testVideoPath })
```

### Test 2: Verify Cleanup

```javascript
// Check system temp directory for leftover files
console.log('🧪 Test 2: Verify temp file cleanup');
console.log('Temp directory:', require('os').tmpdir());
console.log('');
console.log('Manual check:');
console.log('1. Open Finder');
console.log('2. Go -> Go to Folder...');
console.log('3. Paste temp path from above');
console.log('4. Search for files starting with "audio-"');
console.log('5. There should be NONE after transcription completes');
```

### Test 3: Timestamp Offset (Trimmed Clips)

```javascript
console.log('🧪 Test 3: Transcription with timestamp offset');
console.log('This simulates a trimmed clip starting at 5 seconds');
console.log('Expected: All segment timestamps offset by +5.0 seconds');
console.log('');

// Once PR 3.4 is complete:
// const transcript = await window.ipcRenderer.invoke('ai:transcribe-video', {
//   videoPath: testVideoPath,
//   startTime: 5.0
// });
// console.log('First segment start time:', transcript.segments[0].start);
// console.log('Expected: ~5.0 seconds (or higher)');
```

### Test 4: Error Handling - File Not Found

```javascript
console.log('🧪 Test 4: Error handling - missing file');

// Once PR 3.4 is complete:
// await window.ipcRenderer.invoke('ai:transcribe-video', {
//   videoPath: '/path/to/nonexistent.mp4'
// })
//   .catch(err => {
//     console.log('✅ Error caught:', err.message);
//     console.log('Expected: "Video file not found"');
//   });
```

### Test 5: Error Handling - No API Key

```javascript
console.log('🧪 Test 5: Error handling - no API key');

// First, remove API key
await window.ai.deleteApiKey();
console.log('API key deleted');

// Try transcription
// Once PR 3.4 is complete:
// await window.ipcRenderer.invoke('ai:transcribe-video', {
//   videoPath: testVideoPath
// })
//   .catch(err => {
//     console.log('✅ Error caught:', err.message);
//     console.log('Expected: Message about API key not configured');
//   });

// Restore API key
await window.ai.saveApiKey('sk-your-key-here');
console.log('API key restored');
```

## Expected Behavior

### Successful Transcription
When transcription succeeds, you should see in the console:
```
[VideoAnalysisService] Starting video transcription pipeline
[VideoAnalysisService] Video: /path/to/video.mp4
[VideoAnalysisService] Step 1: Extracting audio from video...
[AudioExtractor] Extracting audio from: /path/to/video.mp4
[AudioExtractor] Audio extraction completed successfully
[VideoAnalysisService] Audio extracted to: /tmp/audio-1234567890.mp3
[VideoAnalysisService] Step 2: Validating audio file...
[TranscriptionService] Audio file validated: 2.45MB
[VideoAnalysisService] Step 3: Transcribing audio with Whisper API...
[TranscriptionService] Transcribing audio file: /tmp/audio-1234567890.mp3
[TranscriptionService] Transcription complete: 120.0s, 15 segments, 850 chars
[VideoAnalysisService] Transcription complete
[VideoAnalysisService] Transcript: 15 segments, 850 chars
[VideoAnalysisService] Step 4: Cleaning up temporary audio file...
[AudioExtractor] Cleaned up temporary audio file: /tmp/audio-1234567890.mp3
[VideoAnalysisService] Temporary audio file cleaned up
```

### Transcript Object Structure
```javascript
{
  fullText: "This is the complete transcription...",
  segments: [
    { start: 0.0, end: 5.2, text: "First segment..." },
    { start: 5.2, end: 10.8, text: "Second segment..." },
    // ...
  ],
  duration: 120.5,
  language: "en"
}
```

### With Timestamp Offset
When `startTime: 5.0` is provided:
```javascript
{
  fullText: "Same text...",
  segments: [
    { start: 5.0, end: 10.2, text: "First segment..." },  // +5.0 offset
    { start: 10.2, end: 15.8, text: "Second segment..." }, // +5.0 offset
    // ...
  ],
  duration: 120.5,
  language: "en"
}
```

## Manual Verification Checklist

- [ ] Full pipeline completes without errors
- [ ] Transcript contains expected text from video
- [ ] Segment timestamps are reasonable (not all 0, not negative)
- [ ] Temporary audio file is cleaned up (check temp directory)
- [ ] Cleanup happens even if transcription fails (test by disconnecting internet mid-call)
- [ ] Timestamp offset works correctly (segments start at startTime, not 0)
- [ ] Error messages are descriptive for: missing file, no API key, network errors, file too large

## Files Created

- `/Users/Gauntlet/gauntlet/videojarvis/src/main/services/VideoAnalysisService.ts`
  - Full pipeline orchestration
  - Try/finally cleanup guarantee
  - Timestamp adjustment logic
  - Comprehensive error handling

## Next PR

PR 3.4 will add the IPC handler `ai:transcribe-video` which will make testing much easier from the console. These tests will become executable once that handler is in place.

## Notes

- Transcription typically takes 10-30 seconds for a 5-minute video
- Always check temp directory after tests - no audio files should remain
- If you see leftover files, the cleanup didn't work (this is a bug)
- Timestamp offset is critical for UI - trimmed clips need accurate times
