# AI Consultant - Track B2: Audio Transcription (Phase 3)

**Track:** B (Backend/Main Process)
**Contains:** Phase 3 (Audio Extraction & Whisper API)
**Previous Document:** [Track B1: Storage Infrastructure](./trackb_1_storage_infrastructure.md)
**Next Document:** [Track B3: Content Analysis](./trackb_3_content_analysis.md)
**Main Plan:** [AI Consultant Plan](./aiconsul_plan.md)

---

# AI Consultant Backend - Audio Transcription Tasks

## Context

With storage infrastructure complete (API keys + profiles), we can now implement the first core AI feature: audio transcription. When a user selects a video clip and clicks "Analyze", we need to:

1. **Extract audio** from the video file using FFmpeg
2. **Create temporary file** to send to OpenAI's API
3. **Transcribe with Whisper** to get text with timestamps
4. **Clean up temporary files** to avoid disk bloat
5. **Return transcript** with segment-level timing for analysis

This phase is entirely backend work. We'll test by logging transcripts to the console. Track A will eventually display these in the UI panel.

**Key Technical Points:**
- Use existing FFmpeg infrastructure (already in project via `fluent-ffmpeg`)
- Whisper API has 25MB file size limit (handle gracefully)
- Use temporary directory for extracted audio (system temp)
- Always clean up temp files (even on error)
- Return both full transcript text AND timed segments

## Instructions for AI Agent

**Standard Workflow:**
1. Read all files mentioned in each PR before making changes
2. Implement tasks in order (top to bottom within each PR)
3. Mark tasks complete with `[x]` after verification
4. Test with console.log after each PR (no UI in Track B)
5. Provide completion summary before moving to next PR
6. Wait for approval before starting next PR

**Critical Guidelines:**
- Test everything via IPC calls from DevTools console
- Always clean up temporary files (use try/finally blocks)
- Install `openai` package: already done (check package.json)
- Follow existing VideoProcessor patterns for FFmpeg usage
- Handle error cases: no audio track, file too large, API errors

---

## Phase 3: Audio Extraction & Transcription

**Estimated Time:** 3-4 hours

### PR 3.1: Create Audio Extraction Service

**Goal:** Extract audio from video files to temporary MP3 files using FFmpeg

**Tasks:**
- [x] Read `/Users/Gauntlet/gauntlet/videojarvis/src/main/services/VideoProcessor.ts` to understand FFmpeg usage patterns
- [x] Read `/Users/Gauntlet/gauntlet/videojarvis/package.json` to verify fluent-ffmpeg is installed
- [x] Create NEW: `/Users/Gauntlet/gauntlet/videojarvis/src/main/services/AudioExtractor.ts` with:
  - Import `ffmpeg` from 'fluent-ffmpeg'
  - Import `path`, `fs`, and `os` modules
  - Set ffmpeg paths (follow VideoProcessor pattern):
    ```typescript
    import ffmpegPath from '@ffmpeg-installer/ffmpeg';
    ffmpeg.setFfmpegPath(ffmpegPath.path);
    ```
  - Create class `AudioExtractor` with method:
    - `extractAudio(videoPath: string, outputPath?: string): Promise<string>` - Extract audio from video
      - If outputPath not provided, generate temp path: `os.tmpdir()/audio-${Date.now()}.mp3`
      - Verify input file exists
      - Use ffmpeg to extract audio:
        - Audio codec: libmp3lame (MP3 format)
        - Audio quality: 128kbps (balance between size and quality)
        - No video stream
      - Return the output file path
      - Handle errors: file not found, no audio track, ffmpeg failure
      - Log progress: "Extracting audio from {videoPath}..."
    - `getAudioDuration(audioPath: string): Promise<number>` - Get duration of audio file
      - Use ffprobe (similar to VideoProcessor.getVideoMetadata)
      - Return duration in seconds
    - `deleteTemporaryFile(filePath: string): void` - Clean up temp file
      - Check if file exists
      - Delete with fs.unlinkSync
      - Log: "Cleaned up temporary audio file: {filePath}"
  - Export singleton instance: `export const audioExtractor = new AudioExtractor();`

**What to Test:**
1. Import in main.ts temporarily
2. Test with sample video: `audioExtractor.extractAudio('/path/to/sample-video.mp4')`
3. Verify MP3 file created in system temp directory
4. Check file size is reasonable (<25MB for Whisper limit)
5. Play MP3 file to verify audio quality
6. Test `getAudioDuration()` - verify matches video duration
7. Test `deleteTemporaryFile()` - verify file removed
8. Test error case: Try extracting from video with no audio track

**Files Changed:**
- NEW: `/Users/Gauntlet/gauntlet/videojarvis/src/main/services/AudioExtractor.ts` - FFmpeg audio extraction

**Notes:**
- MP3 format is widely supported and keeps file sizes manageable
- 128kbps quality is sufficient for speech transcription
- System temp directory auto-cleans on some systems, but we'll manually clean up
- If video has no audio track, ffmpeg will error - catch and return meaningful message

---

### PR 3.2: Create Whisper Transcription Service

**Goal:** Send audio files to OpenAI Whisper API and get timestamped transcripts

**Tasks:**
- [x] Read `/Users/Gauntlet/gauntlet/videojarvis/src/main/services/ApiKeyStorage.ts` to access API key
- [x] Read `/Users/Gauntlet/gauntlet/videojarvis/src/types/ai.ts` (may need to update with new types)
- [x] Update `/Users/Gauntlet/gauntlet/videojarvis/src/types/ai.ts`:
  - Add interfaces:
    ```typescript
    export interface TranscriptSegment {
      start: number;      // Seconds
      end: number;        // Seconds
      text: string;
    }

    export interface Transcript {
      fullText: string;
      segments: TranscriptSegment[];
      duration: number;   // Total audio duration in seconds
      language?: string;  // Detected language
    }
    ```
- [x] Create NEW: `/Users/Gauntlet/gauntlet/videojarvis/src/main/services/TranscriptionService.ts` with:
  - Import `OpenAI` from 'openai'
  - Import `fs` and `path` modules
  - Import `apiKeyStorage` from './ApiKeyStorage'
  - Import `Transcript, TranscriptSegment` from '../../types/ai'
  - Create class `TranscriptionService` with methods:
    - `transcribeAudio(audioPath: string): Promise<Transcript>` - Send to Whisper API
      - Get API key: `const apiKey = await apiKeyStorage.getApiKey()`
      - Throw error if no key: "OpenAI API key not configured"
      - Initialize OpenAI client: `new OpenAI({ apiKey })`
      - Read audio file: `fs.createReadStream(audioPath)`
      - Call Whisper API:
        - Model: 'whisper-1'
        - Response format: 'verbose_json' (to get timestamps)
        - Timestamp granularities: ['segment']
      - Parse response to extract:
        - Full text (concatenate all segments)
        - Segments array with start/end/text
        - Duration (from last segment end time)
        - Detected language (optional)
      - Log: "Transcribing audio file: {audioPath}"
      - Log: "Transcription complete: {duration}s, {segments.length} segments, {fullText.length} chars"
      - Return Transcript object
      - Handle errors: API key invalid, network error, file too large (25MB limit)
    - `validateAudioFile(audioPath: string): Promise<{ valid: boolean; error?: string; sizeInMB?: number }>` - Check before sending
      - Verify file exists
      - Check file size (must be < 25MB for Whisper)
      - Return validation result
  - Export singleton instance: `export const transcriptionService = new TranscriptionService();`

**What to Test:**
1. Set API key first (from Phase 1): `await apiKeyStorage.saveApiKey('sk-...')`
2. Extract audio from sample video (from PR 3.1)
3. Call: `const transcript = await transcriptionService.transcribeAudio(audioPath)`
4. Verify transcript.fullText contains recognizable words
5. Verify transcript.segments has proper start/end times
6. Log first 3 segments to console to check timing accuracy
7. Test error: Try with invalid API key - verify meaningful error
8. Test error: Try with file > 25MB - verify size validation error
9. Test edge case: Very short audio (< 1 second) - verify still works

**Files Changed:**
- `/Users/Gauntlet/gauntlet/videojarvis/src/types/ai.ts` - Add Transcript types
- NEW: `/Users/Gauntlet/gauntlet/videojarvis/src/main/services/TranscriptionService.ts` - Whisper API integration

**Notes:**
- Whisper typically takes 10-30 seconds for a 5-minute audio file
- Timestamp accuracy is usually within 100-200ms
- 'verbose_json' format is essential for getting segment timestamps
- Consider adding retry logic for network errors (optional for MVP)
- Language detection is automatic (Whisper is multilingual)

---

### PR 3.3: Combine Extraction + Transcription Pipeline

**Goal:** Create end-to-end service that orchestrates extraction → transcription → cleanup

**Tasks:**
- [x] Read `/Users/Gauntlet/gauntlet/videojarvis/src/main/services/AudioExtractor.ts` (just created)
- [x] Read `/Users/Gauntlet/gauntlet/videojarvis/src/main/services/TranscriptionService.ts` (just created)
- [x] Create NEW: `/Users/Gauntlet/gauntlet/videojarvis/src/main/services/VideoAnalysisService.ts` with:
  - Import `audioExtractor` from './AudioExtractor'
  - Import `transcriptionService` from './TranscriptionService'
  - Import `Transcript` from '../../types/ai'
  - Create class `VideoAnalysisService` with method:
    - `transcribeVideo(videoPath: string, startTime?: number, endTime?: number): Promise<Transcript>` - Full pipeline
      - Log: "Starting video transcription pipeline: {videoPath}"
      - Validate video file exists
      - **Step 1: Extract audio**
        - Call `audioExtractor.extractAudio(videoPath)`
        - Store temp audio path
        - Log: "Audio extracted to: {audioPath}"
      - **Step 2: Validate audio file**
        - Call `transcriptionService.validateAudioFile(audioPath)`
        - If invalid (too large), throw descriptive error
      - **Step 3: Transcribe audio**
        - Wrap in try/finally for cleanup
        - Call `transcriptionService.transcribeAudio(audioPath)`
        - Store transcript result
        - Log: "Transcription complete"
      - **Step 4: Clean up (in finally block)**
        - Call `audioExtractor.deleteTemporaryFile(audioPath)`
        - Log: "Temporary audio file cleaned up"
      - **Step 5: Adjust timestamps (if clip is trimmed)**
        - If startTime provided, offset all segment times by startTime
        - This ensures timestamps are relative to original video, not clip
      - Return transcript
      - Handle all errors with descriptive messages
  - Export singleton instance: `export const videoAnalysisService = new VideoAnalysisService();`

**What to Test:**
1. Call: `const transcript = await videoAnalysisService.transcribeVideo('/path/to/video.mp4')`
2. Verify entire pipeline completes successfully
3. Verify transcript returned with correct data
4. Check temp directory - verify audio file was cleaned up (not present)
5. Test with trimmed clip: `transcribeVideo(path, 10, 30)` - verify timestamps start at 10s
6. Test error handling: Disconnect internet mid-transcription - verify cleanup still happens
7. Monitor logs - verify all 4 steps log progress clearly

**Files Changed:**
- NEW: `/Users/Gauntlet/gauntlet/videojarvis/src/main/services/VideoAnalysisService.ts` - Orchestrates extraction + transcription + cleanup

**Notes:**
- This service will be called by the IPC handler in next PR
- Always clean up temp files even if transcription fails (use try/finally)
- Timestamp adjustment for trimmed clips is important for UI accuracy
- Consider adding progress callbacks later (for "Extracting...", "Transcribing..." UI updates)

---

### PR 3.4: Add Transcription IPC Handler

**Goal:** Expose video transcription to renderer process via IPC

**Tasks:**
- [x] Read `/Users/Gauntlet/gauntlet/videojarvis/src/main/services/VideoAnalysisService.ts` (just created)
- [x] Read `/Users/Gauntlet/gauntlet/videojarvis/src/main/ipc/handlers.ts` for patterns
- [x] Update `/Users/Gauntlet/gauntlet/videojarvis/src/main/ipc/handlers.ts`:
  - Import `videoAnalysisService` from '../services/VideoAnalysisService'
  - Import `Transcript` from '../../types/ai'
  - Add handler `ai:transcribe-video`:
    - Receives parameters:
      ```typescript
      {
        videoPath: string;
        startTime?: number;  // Clip start (if trimmed)
        endTime?: number;    // Clip end (if trimmed)
      }
      ```
    - Validate videoPath is provided
    - Log: "IPC: Starting video transcription for {videoPath}"
    - Call `videoAnalysisService.transcribeVideo(videoPath, startTime, endTime)`
    - Log: "IPC: Transcription complete - {transcript.segments.length} segments"
    - Return transcript
    - Handle errors with descriptive messages:
      - "No API key configured"
      - "Video file not found"
      - "Audio file too large (max 25MB)"
      - "Network error - check connection"
      - "Invalid API key"
- [x] Follow error handling patterns (try/catch with meaningful errors)

**What to Test:**
1. Open DevTools console
2. Import a video to media library (get its path)
3. Call: `await window.ipcRenderer.invoke('ai:transcribe-video', { videoPath: '/path/to/video.mp4' })`
4. Wait 10-30 seconds (depending on video length)
5. Verify returns transcript object with fullText and segments
6. Log transcript.segments[0] - verify has start, end, text
7. Try with non-existent file path - verify error message
8. Try without API key configured - verify "No API key" error

**Files Changed:**
- `/Users/Gauntlet/gauntlet/videojarvis/src/main/ipc/handlers.ts` - Add ai:transcribe-video handler

**Notes:**
- This handler will be called by Track A's "Analyze Clip" button
- Processing time is noticeable (10-30s) - Track A should show loading state
- Could add progress events later (ai:transcription-progress) for better UX
- Consider caching transcripts (future enhancement) to avoid re-processing

---

### PR 3.5: Update Preload to Expose Transcription API

**Goal:** Add transcription method to window.ai API for renderer access

**Tasks:**
- [x] Read `/Users/Gauntlet/gauntlet/videojarvis/src/preload.ts` (updated in Phase 2)
- [x] Read `/Users/Gauntlet/gauntlet/videojarvis/src/types/window.d.ts` for current declarations
- [x] Update `/Users/Gauntlet/gauntlet/videojarvis/src/preload.ts`:
  - Add to `window.ai` object:
    ```typescript
    transcribeVideo: (params: { videoPath: string; startTime?: number; endTime?: number }) =>
      ipcRenderer.invoke('ai:transcribe-video', params)
    ```
- [x] Update `/Users/Gauntlet/gauntlet/videojarvis/src/types/window.d.ts`:
  - Import `Transcript` from './ai'
  - Add to Window.ai interface:
    ```typescript
    transcribeVideo: (params: {
      videoPath: string;
      startTime?: number;
      endTime?: number
    }) => Promise<Transcript>;
    ```

**What to Test:**
1. Build project: `npm start`
2. Open DevTools console
3. Call: `await window.ai.transcribeVideo({ videoPath: '/path/to/video.mp4' })`
4. Verify TypeScript autocomplete works for params
5. Verify return type is properly typed (transcript.fullText, transcript.segments)
6. Check that optional parameters (startTime, endTime) are recognized

**Files Changed:**
- `/Users/Gauntlet/gauntlet/videojarvis/src/preload.ts` - Add transcribeVideo to window.ai
- `/Users/Gauntlet/gauntlet/videojarvis/src/types/window.d.ts` - Add TypeScript declaration

**Notes:**
- Track A will use `window.ai.transcribeVideo()` when user clicks "Analyze Clip"
- Type safety ensures correct parameter passing from UI
- Could add overloads for full video vs. trimmed clip (future enhancement)

---

## Completion Checklist

**Phase 3 Complete When:**
- ✓ Audio can be extracted from video files to temporary MP3
- ✓ Temporary audio files are cleaned up after use
- ✓ Whisper API transcribes audio with segment-level timestamps
- ✓ Full pipeline (extract → transcribe → cleanup) works end-to-end
- ✓ IPC handler callable from DevTools console
- ✓ window.ai.transcribeVideo() is typed and accessible
- ✓ Error cases handled: no audio, file too large, invalid key, network issues
- ✓ Transcripts log to console for verification

**Manual Test Scenario:**
1. Import a video with clear speech (e.g., tutorial, presentation)
2. Call `window.ai.transcribeVideo({ videoPath })` from console
3. Wait for completion (10-30 seconds)
4. Verify transcript.fullText contains accurate transcription
5. Verify transcript.segments have reasonable start/end times
6. Check temp directory - verify no leftover .mp3 files
7. Test with 2-3 different videos to verify consistency

**Track B Phase 3 Summary:**
Audio transcription pipeline is complete. Videos can be transcribed into text with timestamps. Track A can now build UI to display transcripts while Track B continues with Phase 4 (GPT-4 content analysis).

---

## Next Steps

**For Track B:**
Continue to [Track B3: Content Analysis](./trackb_3_content_analysis.md) to implement GPT-4 integration and the full analyze pipeline.

**For Track A:**
Can now test transcription from UI and display results. Once Phase 4 is complete, the full analysis flow will work.

**Performance Notes:**
- Typical transcription time: 10-30 seconds for 5-minute video
- Whisper cost: ~$0.006/minute (~$0.03 for 5-minute video)
- Audio extraction is fast (1-3 seconds)
- Most time is spent in Whisper API call
