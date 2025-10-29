# Audio Extractor Test Commands

Open DevTools (Cmd+Option+I on Mac) and paste these commands into the console:

## Test 1: Extract Audio from Sample Video

```javascript
// Test with sample video
const videoPath = '/Users/Gauntlet/gauntlet/videojarvis/test-output/sample-video.mp4';
const result = await window.ipcRenderer.invoke('test:extract-audio', videoPath);
console.log('Test Results:', result);
```

## Expected Output:
- `success: true`
- `audioPath`: Path to temporary MP3 file
- `duration`: Video duration in seconds
- `sizeInMB`: File size (should be < 25MB)

## Test 2: Error Case - Non-existent File

```javascript
// Test error handling
try {
  await window.ipcRenderer.invoke('test:extract-audio', '/nonexistent/video.mp4');
} catch (error) {
  console.log('Expected error:', error.message);
}
```

## Notes:
- The test handler automatically cleans up the temp file after checking it
- Check the Electron console logs for detailed FFmpeg output
- If successful, you should see logs for extraction, duration check, and cleanup
