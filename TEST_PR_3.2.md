# PR 3.2 Testing Instructions - TranscriptionService

## Quick Console Test

After running `npm start`, open DevTools Console and run:

### Step 1: Set API Key (if not already set)
```javascript
// Replace with your actual OpenAI API key
await window.ai.saveApiKey('sk-...')
```

### Step 2: Test Transcription
```javascript
// First, extract audio from sample video
const { audioExtractor } = await import('./src/main/services/AudioExtractor');
const { transcriptionService } = await import('./src/main/services/TranscriptionService');

// Extract audio
const videoPath = '/Users/Gauntlet/gauntlet/videojarvis/test-output/sample-video.mp4';
const audioPath = await audioExtractor.extractAudio(videoPath);
console.log('Audio extracted to:', audioPath);

// Validate audio file
const validation = await transcriptionService.validateAudioFile(audioPath);
console.log('Validation:', validation);

// Transcribe (this will take 10-30 seconds)
console.log('Starting transcription...');
const transcript = await transcriptionService.transcribeAudio(audioPath);

// Display results
console.log('\n=== TRANSCRIPTION RESULTS ===');
console.log('Full Text:', transcript.fullText);
console.log('Duration:', transcript.duration, 'seconds');
console.log('Language:', transcript.language);
console.log('Segments:', transcript.segments.length);
console.log('\nFirst 3 segments:');
transcript.segments.slice(0, 3).forEach((seg, i) => {
  console.log(`[${i+1}] ${seg.start.toFixed(2)}s - ${seg.end.toFixed(2)}s: "${seg.text}"`);
});

// Cleanup
audioExtractor.deleteTemporaryFile(audioPath);
console.log('✓ Cleanup complete');
```

## What to Verify

1. **Validation Works**
   - File size check (< 25MB)
   - File exists check

2. **Transcription Successful**
   - `transcript.fullText` contains recognizable text
   - `transcript.segments` is an array with start/end/text
   - `transcript.duration` is a reasonable number
   - `transcript.language` is detected (usually 'en' for English)

3. **Error Handling**
   - Invalid API key: meaningful error message
   - File too large: clear error about 25MB limit
   - Missing file: file not found error

4. **Cleanup**
   - Temporary audio file is deleted after transcription
   - Check temp directory: no leftover .mp3 files

## Expected Output

```
[TranscriptionService] Transcribing audio file: /tmp/audio-1234567890.mp3
[TranscriptionService] Audio file validated: 2.34MB
[TranscriptionService] Transcription complete: 15.2s, 8 segments, 423 chars

=== TRANSCRIPTION RESULTS ===
Full Text: Hello, this is a test video. We are testing the transcription service...
Duration: 15.2 seconds
Language: en
Segments: 8

First 3 segments:
[1] 0.00s - 2.50s: "Hello, this is a test video."
[2] 2.50s - 5.80s: "We are testing the transcription service."
[3] 5.80s - 9.20s: "This should produce timestamped segments."

✓ Cleanup complete
```

## Implementation Details

### Files Created/Modified

1. **`/Users/Gauntlet/gauntlet/videojarvis/src/types/ai.ts`**
   - Added `TranscriptSegment` interface
   - Added `Transcript` interface

2. **`/Users/Gauntlet/gauntlet/videojarvis/src/main/services/TranscriptionService.ts`**
   - `transcribeAudio()` - Main transcription method
   - `validateAudioFile()` - Pre-validation before API call
   - Singleton export: `transcriptionService`

### Key Features

- **Model**: `whisper-1`
- **Response Format**: `verbose_json` (for timestamps)
- **Timestamp Granularities**: `['segment']`
- **Max File Size**: 25MB (Whisper API limit)
- **Error Handling**: API key validation, file size check, network errors

### Dependencies

- `openai` package (v6.7.0) - Already installed
- `ApiKeyStorage` - For secure API key retrieval
- `fs`, `path` - Standard Node.js modules

## Next Steps

After testing PR 3.2, proceed to PR 3.3:
- Create `VideoAnalysisService` to orchestrate extraction → transcription → cleanup
- This will be the main service used by Track A UI

---

**PR 3.2 Status**: ✅ IMPLEMENTATION COMPLETE - Ready for testing
