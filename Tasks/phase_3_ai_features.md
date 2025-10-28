# Phase 3: AI Features - Implementation Tasks

## Context

Phase 3 introduces the intelligent automation features that differentiate ClipForge from traditional video editors. This phase builds upon the completed MVP (Phase 1: Core Editor and Phase 2: Recording Features) to add AI-powered transcription, filler word removal, silence detection, and optional audio prosody analysis.

These AI features address the core pain point: content creators spend hours on tedious, repetitive editing tasks like removing "ums" and "uhs", cutting silence, and ensuring audio quality. By leveraging OpenAI's Whisper API for transcription and FFmpeg's audio analysis capabilities, we automate these workflows while maintaining the non-destructive editing architecture established in Phase 1.

This is a **72-hour demo project** - the focus is on demonstrating working AI-powered automation, not production-level edge case handling. The implementation prioritizes getting features functional and impressive for the demo over handling every possible error scenario.

## Instructions for AI Agent

1. **Read Phase**: Before starting any PR, read all files mentioned in the "Tasks" section to understand current implementation patterns
2. **Implement**: Work through tasks in order, checking off each item as completed
3. **Test**: After completing a PR, run the tests specified in "What to Test" section
4. **Mark Complete**: When PR is done, mark it with [x] and provide a brief completion summary
5. **Wait for Approval**: Don't proceed to the next PR until receiving confirmation
6. **Dependencies**: This phase assumes Phase 1 (Core Editor) and Phase 2 (Recording) are complete, including:
   - Working timeline with clips
   - FFmpeg integration for video processing
   - Project save/load with non-destructive editing
   - IPC communication between main and renderer processes
   - Media asset management

---

## Phase 3.1: Audio Transcription Foundation

**Estimated Time:** 6-8 hours

This phase establishes the transcription pipeline using OpenAI's Whisper API. We'll extract audio from video files, send to Whisper, and display timestamped transcripts in a dedicated UI panel.

### PR 3.1.1: Audio Extraction Service

**Goal:** Create a service in the main process that extracts audio from video files using FFmpeg and prepares it for transcription.

**Tasks:**
- [ ] Read `src/main/services/ffmpeg-service.ts` (or equivalent) to understand existing FFmpeg integration patterns
- [ ] Create NEW: `src/main/services/audio-extraction-service.ts` with:
  - `extractAudioFromVideo(videoPath: string): Promise<string>` function
  - Extract audio as WAV format (16kHz sample rate for Whisper API)
  - Return path to extracted audio file in temp directory
  - Clean up temp files after use
- [ ] Add IPC handler in `src/main/ipc/media-handlers.ts`:
  - `media:extract-audio` handler
  - Error handling for missing files or FFmpeg failures
- [ ] Create NEW: `src/types/audio.ts` with audio-related type definitions:
  ```typescript
  interface AudioExtractionResult {
    audioPath: string;
    duration: number;
    format: string;
  }
  ```

**What to Test:**
1. Import a video file into ClipForge
2. Trigger audio extraction via IPC call
3. Verify WAV file is created in temp directory with correct format (16kHz)
4. Check that error is returned for invalid video paths
5. Verify temp files are cleaned up after processing

**Files Changed:**
- NEW: `src/main/services/audio-extraction-service.ts` - Audio extraction using FFmpeg
- `src/main/ipc/media-handlers.ts` - Add IPC handler for audio extraction
- NEW: `src/types/audio.ts` - Audio-related type definitions

**Notes:**
- Use FFmpeg command: `ffmpeg -i input.mp4 -vn -acodec pcm_s16le -ar 16000 output.wav`
- Whisper API expects WAV or other audio formats, 16kHz is optimal
- Store temp audio files with unique IDs to avoid conflicts
- Follow existing patterns from Phase 1's FFmpeg integration

---

### PR 3.1.2: OpenAI Whisper Integration

**Goal:** Create a service that communicates with OpenAI's Whisper API to transcribe audio files and return timestamped transcripts.

**Tasks:**
- [ ] Read `src/main/config/environment.ts` to understand how API keys are managed
- [ ] Create NEW: `src/main/services/transcription-service.ts` with:
  - `transcribeAudio(audioPath: string): Promise<Transcript>` function
  - OpenAI API client setup using Whisper endpoint
  - Retry logic with exponential backoff for API failures
  - Rate limit handling
- [ ] Update `src/types/transcript.ts` (or create NEW) with:
  ```typescript
  interface Transcript {
    segments: TranscriptSegment[];
    language?: string;
    duration: number;
  }

  interface TranscriptSegment {
    id: number;
    text: string;
    start: number;  // seconds
    end: number;    // seconds
    confidence?: number;
  }
  ```
- [ ] Add IPC handler in `src/main/ipc/ai-handlers.ts` (NEW file):
  - `ai:transcribe` handler
  - Progress updates during transcription
  - Error handling for API failures
- [ ] Add environment variable for OpenAI API key in `.env.example`

**What to Test:**
1. Set OPENAI_API_KEY in environment
2. Extract audio from a test video
3. Call transcription service with audio file
4. Verify transcript is returned with timestamped segments
5. Test error handling with invalid API key
6. Test retry logic by simulating network failure

**Files Changed:**
- NEW: `src/main/services/transcription-service.ts` - Whisper API integration
- NEW: `src/main/ipc/ai-handlers.ts` - IPC handlers for AI operations
- NEW: `src/types/transcript.ts` - Transcript data structures
- `src/main/config/environment.ts` - Add OpenAI API key configuration
- `.env.example` - Document required environment variables

**Notes:**
- OpenAI Whisper API endpoint: `https://api.openai.com/v1/audio/transcriptions`
- Use `whisper-1` model
- Include timestamps in request: `{ timestamp_granularities: ['segment'] }`
- Cache transcripts in project file to avoid re-transcribing
- Monitor API usage during development to control costs

---

### PR 3.1.3: Transcript UI Panel

**Goal:** Create a UI panel that displays transcripts with clickable timestamps that jump to the corresponding position in the timeline.

**Tasks:**
- [ ] Read `src/renderer/components/Timeline/Timeline.tsx` to understand playhead control
- [ ] Read `src/renderer/store/project-store.ts` to understand state management patterns
- [ ] Create NEW: `src/renderer/components/TranscriptPanel/TranscriptPanel.tsx` with:
  - List of transcript segments with timestamps
  - Click handler to jump playhead to timestamp
  - Highlight current segment based on playhead position
  - Loading state while transcription in progress
  - Error state display
- [ ] Create NEW: `src/renderer/components/TranscriptPanel/TranscriptSegment.tsx`:
  - Individual segment component
  - Formatted timestamp display (MM:SS)
  - Text content with proper typography
  - Click to seek functionality
- [ ] Update `src/renderer/store/project-store.ts`:
  - Add `transcripts: Record<string, Transcript>` to project state
  - Add `addTranscript(assetId: string, transcript: Transcript)` action
  - Add `getTranscriptForAsset(assetId: string)` selector
- [ ] Add "Generate Transcript" button to media library items or timeline clips
- [ ] Wire up IPC calls to trigger transcription

**What to Test:**
1. Import a video with spoken audio
2. Click "Generate Transcript" button
3. Verify loading indicator appears
4. Verify transcript appears in panel after completion
5. Click on a transcript segment - playhead should jump to that timestamp
6. Verify current segment is highlighted as playhead moves
7. Test error state by disconnecting network during transcription

**Files Changed:**
- NEW: `src/renderer/components/TranscriptPanel/TranscriptPanel.tsx` - Main transcript panel
- NEW: `src/renderer/components/TranscriptPanel/TranscriptSegment.tsx` - Individual segment
- `src/renderer/store/project-store.ts` - Add transcript state management
- `src/renderer/components/MediaLibrary/MediaLibraryItem.tsx` - Add transcript button
- NEW: `src/renderer/components/TranscriptPanel/styles.css` - Panel styling

**Notes:**
- Panel should be collapsible to save screen space
- Use virtual scrolling if transcript is very long (stretch goal)
- Auto-scroll to current segment as playhead moves
- Distinguish between segments with visual separators
- Show confidence score if available from Whisper

---

### PR 3.1.4: Transcript Persistence

**Goal:** Save transcripts in the project file so users don't need to re-transcribe videos when reopening projects.

**Tasks:**
- [ ] Read `src/main/services/project-service.ts` to understand project save/load implementation
- [ ] Update `src/types/project.ts`:
  - Add `transcripts: Record<string, Transcript>` to ProjectFile interface
  - Ensure transcripts are keyed by media asset ID
- [ ] Update project save logic in `src/main/services/project-service.ts`:
  - Include transcripts in saved JSON
  - Handle projects without transcripts (backward compatibility)
- [ ] Update project load logic:
  - Restore transcripts from file
  - Populate transcript store on load
- [ ] Add transcript cache indicator in UI (show which clips have transcripts)

**What to Test:**
1. Create a new project and import video
2. Generate transcript
3. Save project
4. Close application
5. Reopen project
6. Verify transcript is restored and displayed
7. Verify transcript is still clickable and functional
8. Test opening old project files without transcripts (should not crash)

**Files Changed:**
- `src/types/project.ts` - Add transcripts to project schema
- `src/main/services/project-service.ts` - Update save/load logic
- `src/renderer/components/MediaLibrary/MediaLibraryItem.tsx` - Show transcript indicator
- `src/renderer/hooks/useProjectLoad.ts` - Restore transcript state on load

**Notes:**
- Transcripts can be large - consider project file size
- Don't include raw audio files in project (only paths)
- Migration strategy: old projects without transcripts should still load
- Consider adding "Re-transcribe" option to regenerate if needed

---

## Phase 3.2: Filler Word Detection & Removal

**Estimated Time:** 6-8 hours

This phase analyzes transcripts to identify filler words (um, uh, like, you know) and provides tools to automatically remove them from the video timeline.

### PR 3.2.1: Filler Word Detection Engine

**Goal:** Create a service that analyzes transcripts to identify filler words with their timestamps and provides removal recommendations.

**Tasks:**
- [ ] Read `src/types/transcript.ts` to understand transcript structure
- [ ] Create NEW: `src/main/services/filler-word-service.ts` with:
  - `detectFillerWords(transcript: Transcript, options?: FillerWordOptions): FillerWord[]` function
  - Pattern matching for common filler words: "um", "uh", "like", "you know", "so", "basically", "actually"
  - Case-insensitive detection
  - Context analysis to avoid false positives (e.g., "I like pizza" vs "It's like, you know")
  - Configurable word list
- [ ] Create NEW: `src/types/filler-words.ts`:
  ```typescript
  interface FillerWord {
    id: string;
    word: string;
    timestamp: number;      // start time in seconds
    duration: number;       // duration of the word
    segmentIndex: number;   // which transcript segment
    confidence: number;     // how confident we are it's a filler
    context: string;        // surrounding text
  }

  interface FillerWordOptions {
    words?: string[];       // custom word list
    minConfidence?: number; // filter by confidence
    contextWindow?: number; // words before/after for context
  }

  interface FillerWordStats {
    totalCount: number;
    byWord: Record<string, number>;
    totalDuration: number;
  }
  ```
- [ ] Add IPC handler in `src/main/ipc/ai-handlers.ts`:
  - `ai:detect-filler-words` handler
  - Return detected filler words with statistics

**What to Test:**
1. Generate transcript for video with known filler words
2. Run filler word detection
3. Verify "um", "uh", "like" are detected correctly
4. Verify "like" in "I like this" is not flagged (context check)
5. Check statistics show correct counts per word
6. Test with custom word list
7. Verify timestamps align with transcript segments

**Files Changed:**
- NEW: `src/main/services/filler-word-service.ts` - Filler word detection logic
- NEW: `src/types/filler-words.ts` - Filler word type definitions
- `src/main/ipc/ai-handlers.ts` - Add detection IPC handler

**Notes:**
- Start with simple regex matching - don't over-engineer
- Common fillers: um, uh, er, ah, like, you know, sort of, kind of, I mean
- Consider word boundaries to avoid partial matches
- Use transcript segment confidence if available
- This is demo-level detection - false positives are acceptable

---

### PR 3.2.2: Filler Word Removal UI

**Goal:** Create a UI panel that shows detected filler words and allows users to select which ones to remove.

**Tasks:**
- [ ] Read `src/renderer/components/TranscriptPanel/TranscriptPanel.tsx` for UI patterns
- [ ] Create NEW: `src/renderer/components/FillerWordPanel/FillerWordPanel.tsx` with:
  - "Detect Filler Words" button
  - Statistics display (e.g., "Found 23 'um', 15 'like', 8 'you know'")
  - Total time savings calculation
  - List of detected filler words with checkboxes
  - "Select All" / "Deselect All" controls
  - "Remove Selected" button
- [ ] Create NEW: `src/renderer/components/FillerWordPanel/FillerWordItem.tsx`:
  - Display word, timestamp, and context
  - Checkbox to select for removal
  - "Preview" button to jump to timestamp in player
  - Visual indicator if word is already removed
- [ ] Update `src/renderer/store/project-store.ts`:
  - Add `fillerWords: FillerWord[]` to state
  - Add `selectedFillerWords: Set<string>` for removal selection
  - Add actions: `setFillerWords`, `toggleFillerWordSelection`, `selectAllFillerWords`
- [ ] Wire up detection flow:
  - User clicks "Detect Filler Words"
  - Show loading state
  - Call IPC to detect filler words
  - Display results in panel

**What to Test:**
1. Generate transcript for a video
2. Click "Detect Filler Words" button
3. Verify statistics are displayed correctly
4. Verify filler word list appears with context
5. Click individual filler words to preview - playhead should jump
6. Test "Select All" / "Deselect All" buttons
7. Verify checkboxes work correctly
8. Check that time savings calculation is shown

**Files Changed:**
- NEW: `src/renderer/components/FillerWordPanel/FillerWordPanel.tsx` - Main filler word UI
- NEW: `src/renderer/components/FillerWordPanel/FillerWordItem.tsx` - Individual filler word item
- `src/renderer/store/project-store.ts` - Add filler word state
- NEW: `src/renderer/components/FillerWordPanel/styles.css` - Panel styling

**Notes:**
- Show context text around filler word (5 words before/after)
- Highlight the actual filler word in the context
- Sort by timestamp or by frequency (user choice)
- Disable "Remove" button if no filler words selected
- Show progress during detection

---

### PR 3.2.3: Video Editing for Filler Word Removal

**Goal:** Implement the timeline editing logic to remove selected filler words by cutting video segments.

**Tasks:**
- [ ] Read `src/main/services/ffmpeg-service.ts` to understand video cutting operations
- [ ] Read `src/renderer/store/timeline-store.ts` to understand timeline clip management
- [ ] Create NEW: `src/main/services/video-edit-service.ts` with:
  - `removeSegments(videoPath: string, segments: TimeRange[]): Promise<string>` function
  - Generate FFmpeg complex filter to remove multiple segments
  - Return path to edited video (or update timeline metadata)
- [ ] Add IPC handler in `src/main/ipc/ai-handlers.ts`:
  - `ai:remove-filler-words` handler
  - Accept list of filler words to remove
  - Progress updates during processing
- [ ] Update timeline store to handle filler word cuts:
  - Option 1: Split clips at filler word timestamps and delete segments
  - Option 2: Add "cut ranges" to clip metadata (non-destructive)
  - Update timeline rendering to show cuts
- [ ] Add visual indicators on timeline:
  - Show where filler words are located
  - Mark removed segments with visual cue

**What to Test:**
1. Detect filler words in a video
2. Select several filler words for removal
3. Click "Remove Selected" button
4. Verify progress indicator appears
5. After completion, play video and verify filler words are cut out
6. Verify timeline shows cut points visually
7. Test undo functionality (if implemented)
8. Export video and verify cuts are in the final output
9. Test with multiple filler words close together (< 0.5s apart)

**Files Changed:**
- NEW: `src/main/services/video-edit-service.ts` - Segment removal logic
- `src/main/ipc/ai-handlers.ts` - Add removal IPC handler
- `src/renderer/store/timeline-store.ts` - Handle filler word cuts
- `src/renderer/components/Timeline/Timeline.tsx` - Show filler word markers
- NEW: `src/types/timeline.ts` - Add cut range types if needed

**Notes:**
- Non-destructive approach: store cut ranges, apply on export
- FFmpeg filter for removing segments: use trim + concat filters
- Handle overlapping filler words gracefully
- Add small padding (0.1-0.2s) around cuts to sound natural
- Consider ripple delete (close gaps) vs. leave gaps
- This is the most complex part - start with simple implementation

---

### PR 3.2.4: Filler Word Removal Preview & Refinement

**Goal:** Add preview functionality so users can hear the result before committing to filler word removal.

**Tasks:**
- [ ] Read `src/renderer/components/VideoPlayer/VideoPlayer.tsx` to understand playback controls
- [ ] Add "Preview" mode to filler word panel:
  - Toggle button "Preview Mode" vs "Normal Mode"
  - In preview mode, playback skips over selected filler word segments
  - Visual indication that preview mode is active
- [ ] Implement timeline preview:
  - Modify playback logic to skip cut segments
  - Use Web Audio API or modify video element currentTime on the fly
- [ ] Add "Undo Removal" functionality:
  - Store removed filler words separately
  - Allow user to restore removed segments
- [ ] Add bulk actions:
  - "Remove all 'um'" button for each word type
  - Filter by confidence level

**What to Test:**
1. Detect filler words
2. Select some filler words
3. Enable "Preview Mode"
4. Play video - verify playback skips selected segments
5. Disable preview mode - verify normal playback
6. Apply removal
7. Test "Undo Removal" to restore segments
8. Test bulk actions for removing all instances of a word

**Files Changed:**
- `src/renderer/components/FillerWordPanel/FillerWordPanel.tsx` - Add preview controls
- `src/renderer/components/VideoPlayer/VideoPlayer.tsx` - Implement skip logic
- `src/renderer/store/timeline-store.ts` - Track preview state and undo history
- `src/renderer/hooks/useVideoPlayback.ts` - Handle preview mode playback

**Notes:**
- Preview without re-encoding: dynamically skip segments during playback
- Undo stack: keep history of filler word removals
- For demo, simple undo (one level) is sufficient
- Preview may have slight audio glitches at cut points (acceptable for demo)

---

## Phase 3.3: Silence Detection & Removal

**Estimated Time:** 4-6 hours

This phase detects silent segments in audio and provides tools to automatically remove them, tightening up videos by eliminating dead air.

### PR 3.3.1: Silence Detection Service

**Goal:** Create a service that uses FFmpeg's silencedetect filter to identify silent segments in video audio.

**Tasks:**
- [ ] Read `src/main/services/audio-extraction-service.ts` for audio handling patterns
- [ ] Create NEW: `src/main/services/silence-detection-service.ts` with:
  - `detectSilence(audioPath: string, options: SilenceDetectionOptions): Promise<SilenceSegment[]>` function
  - Use FFmpeg silencedetect filter
  - Parse FFmpeg output to extract silence timestamps
  - Return array of silence segments with start/end times
- [ ] Create NEW: `src/types/silence.ts`:
  ```typescript
  interface SilenceSegment {
    id: string;
    start: number;         // start time in seconds
    end: number;           // end time in seconds
    duration: number;      // length of silence
  }

  interface SilenceDetectionOptions {
    noiseThreshold: number;  // in dB (e.g., -30dB)
    minDuration: number;     // minimum silence length in seconds (e.g., 0.5)
  }

  interface SilenceStats {
    totalSegments: number;
    totalDuration: number;
    longestSegment: number;
  }
  ```
- [ ] Add IPC handler in `src/main/ipc/ai-handlers.ts`:
  - `ai:detect-silence` handler
  - Configurable threshold and minimum duration

**What to Test:**
1. Import video with silent segments
2. Run silence detection with default settings (-30dB, 0.5s min)
3. Verify silence segments are detected correctly
4. Test with different threshold values (-20dB, -40dB)
5. Test with different minimum durations (0.3s, 1.0s)
6. Verify very short pauses (< min duration) are not detected
7. Check statistics are calculated correctly

**Files Changed:**
- NEW: `src/main/services/silence-detection-service.ts` - Silence detection logic
- NEW: `src/types/silence.ts` - Silence type definitions
- `src/main/ipc/ai-handlers.ts` - Add silence detection handler

**Notes:**
- FFmpeg command: `ffmpeg -i input.mp4 -af silencedetect=noise=-30dB:d=0.5 -f null -`
- Parse stderr output for silence start/end timestamps
- Example output: `[silencedetect @ 0x...] silence_start: 12.345`
- Consider natural pauses - don't remove all silence
- Typical values: -30dB threshold, 0.5s minimum duration

---

### PR 3.3.2: Silence Visualization & Control UI

**Goal:** Create UI to visualize detected silence on the timeline and control silence removal settings.

**Tasks:**
- [ ] Read `src/renderer/components/Timeline/Timeline.tsx` for timeline rendering
- [ ] Create NEW: `src/renderer/components/SilencePanel/SilencePanel.tsx` with:
  - "Detect Silence" button
  - Settings controls: noise threshold slider, minimum duration input
  - Statistics display (total silence time, number of segments)
  - "Remove All Silence" button
  - Individual segment list with checkboxes
- [ ] Add silence markers to timeline:
  - Visual overlay showing silence segments (different color than clips)
  - Click on silence marker to select/deselect for removal
  - Show duration of each silence segment
- [ ] Update `src/renderer/store/project-store.ts`:
  - Add `silenceSegments: SilenceSegment[]` to state
  - Add `selectedSilenceSegments: Set<string>` for removal selection
  - Add `silenceDetectionSettings: SilenceDetectionOptions`
  - Add actions: `setSilenceSegments`, `toggleSilenceSelection`, `updateSilenceSettings`
- [ ] Implement settings panel:
  - Threshold slider (-50dB to -10dB)
  - Min duration input (0.1s to 2.0s)
  - "Detect" button to re-run detection with new settings

**What to Test:**
1. Import video and detect silence with default settings
2. Verify silence segments appear on timeline as markers
3. Verify statistics are displayed
4. Adjust threshold slider and re-detect - verify results change
5. Adjust minimum duration and re-detect - verify results change
6. Click individual silence markers on timeline to select/deselect
7. Test "Select All" functionality
8. Verify hover tooltip shows silence duration

**Files Changed:**
- NEW: `src/renderer/components/SilencePanel/SilencePanel.tsx` - Silence control panel
- `src/renderer/components/Timeline/Timeline.tsx` - Add silence markers
- `src/renderer/components/Timeline/SilenceMarker.tsx` - NEW: Silence marker component
- `src/renderer/store/project-store.ts` - Add silence state
- NEW: `src/renderer/components/SilencePanel/styles.css` - Panel styling

**Notes:**
- Use semi-transparent overlay for silence markers on timeline
- Different color from filler word markers (if showing both)
- Preview silence location by clicking marker (jump playhead)
- Save settings in project file for consistency
- Show real-time preview of time saved

---

### PR 3.3.3: Silence Removal Implementation

**Goal:** Implement the video editing logic to remove selected silence segments from the timeline.

**Tasks:**
- [ ] Read `src/main/services/video-edit-service.ts` to understand segment removal patterns
- [ ] Update `src/main/services/video-edit-service.ts`:
  - Add `removeSilence(videoPath: string, silenceSegments: SilenceSegment[]): Promise<string>` function
  - Reuse segment removal logic from filler word removal
  - Handle multiple silence segments efficiently
- [ ] Add IPC handler in `src/main/ipc/ai-handlers.ts`:
  - `ai:remove-silence` handler
  - Progress updates during processing
  - Batch processing for multiple segments
- [ ] Update timeline store:
  - Apply silence cuts to timeline clips
  - Use ripple delete to close gaps (optional - can leave gaps for manual adjustment)
  - Mark removed silence segments
- [ ] Add preview functionality:
  - Similar to filler word preview
  - Play video with silence segments skipped

**What to Test:**
1. Detect silence in a video
2. Select several silence segments for removal
3. Click "Remove All Silence" button
4. Verify progress indicator during processing
5. Play video and verify silence segments are removed
6. Verify audio transitions are smooth (no pops or clicks)
7. Test with very short silence segments (edge case)
8. Test with silence at beginning/end of video
9. Export video and verify silence removal in final output
10. Test combination: remove filler words AND silence

**Files Changed:**
- `src/main/services/video-edit-service.ts` - Add silence removal logic
- `src/main/ipc/ai-handlers.ts` - Add silence removal handler
- `src/renderer/store/timeline-store.ts` - Handle silence cuts
- `src/renderer/components/SilencePanel/SilencePanel.tsx` - Wire up removal button

**Notes:**
- Consider adding small fade in/out at cut points to smooth transitions
- FFmpeg filter: use same trim + concat approach as filler words
- Combine adjacent silence segments if very close together
- Option to keep short pauses (< 0.3s) for natural speech rhythm
- Ripple delete vs manual: for demo, leaving gaps is simpler

---

### PR 3.3.4: Combined AI Editing Workflow

**Goal:** Allow users to detect and remove both filler words and silence in a single optimized workflow.

**Tasks:**
- [ ] Read `src/renderer/components/FillerWordPanel/FillerWordPanel.tsx` and `src/renderer/components/SilencePanel/SilencePanel.tsx`
- [ ] Create NEW: `src/renderer/components/AIEditingPanel/AIEditingPanel.tsx`:
  - Combined panel with tabs or sections for filler words and silence
  - "Auto-Edit" button that detects and removes both in one pass
  - Preview mode for all AI edits combined
  - Statistics showing total time saved
- [ ] Optimize batch processing:
  - Combine filler word and silence removal into single FFmpeg pass
  - Merge overlapping segments
  - Sort segments chronologically for efficient processing
- [ ] Add workflow presets:
  - "Quick Clean" - remove obvious fillers and long silence (> 1s)
  - "Aggressive" - remove all detected fillers and short silence (> 0.5s)
  - "Conservative" - only remove clear fillers and very long silence (> 2s)
- [ ] Create "Review" mode:
  - Show all detected issues (fillers + silence) in timeline
  - Color-code different types
  - Quick accept/reject for each

**What to Test:**
1. Import video with both filler words and silence
2. Click "Auto-Edit" with "Quick Clean" preset
3. Verify both filler words and silence are detected
4. Review combined edits in timeline
5. Test preview mode with all edits active
6. Apply all edits and verify video is cleaned
7. Test different presets produce different results
8. Export and verify final video quality
9. Test undo for batch operations

**Files Changed:**
- NEW: `src/renderer/components/AIEditingPanel/AIEditingPanel.tsx` - Combined AI editing UI
- `src/main/services/video-edit-service.ts` - Optimize batch editing
- `src/renderer/store/ai-edits-store.ts` - NEW: Manage all AI edits together
- `src/renderer/components/Timeline/Timeline.tsx` - Show combined edit markers

**Notes:**
- This is the "wow" feature for the demo
- Process segments in reverse order (end to start) to maintain timestamps
- Merge adjacent segments if gap is very small (< 0.2s)
- Show before/after video duration comparison
- Consider adding "Undo All AI Edits" button

---

## Phase 3.4: Audio Prosody Analysis (Stretch Goal)

**Estimated Time:** 6-8 hours (only if time permits)

This optional phase adds advanced audio analysis to help users identify monotone or low-energy segments that might need re-recording.

### PR 3.4.1: Audio Feature Extraction (Python Integration)

**Goal:** Set up Python environment with librosa for audio analysis and create bridge from Node.js to Python.

**Tasks:**
- [ ] Create NEW: `src/main/python/requirements.txt`:
  ```
  librosa==0.10.0
  numpy==1.24.0
  scipy==1.11.0
  ```
- [ ] Create NEW: `src/main/python/audio_analyzer.py`:
  - Extract audio features: pitch variation, volume, zero-crossing rate, spectral centroid
  - Calculate "energy score" for segments (high variance = engaging)
  - Return JSON with features and scores per time segment
- [ ] Create NEW: `src/main/services/prosody-service.ts`:
  - `analyzeProsody(audioPath: string): Promise<ProsodyAnalysis>` function
  - Spawn Python process with child_process
  - Pass audio file path to Python script
  - Parse JSON output
- [ ] Create NEW: `src/types/prosody.ts`:
  ```typescript
  interface ProsodyAnalysis {
    segments: ProsodySegment[];
    overallScore: number;
    recommendations: string[];
  }

  interface ProsodySegment {
    start: number;
    end: number;
    energyScore: number;     // 0-100, higher = more engaging
    pitchVariation: number;
    volumeVariation: number;
    assessment: 'engaging' | 'okay' | 'monotone';
  }
  ```
- [ ] Add IPC handler in `src/main/ipc/ai-handlers.ts`:
  - `ai:analyze-prosody` handler
  - Progress updates during analysis

**What to Test:**
1. Ensure Python 3.9+ is installed
2. Install Python dependencies
3. Run prosody analysis on test audio
4. Verify JSON output is returned
5. Test with engaging audio (varied pitch/volume) - should score high
6. Test with monotone audio - should score low
7. Verify Node.js can spawn Python process and get results

**Files Changed:**
- NEW: `src/main/python/audio_analyzer.py` - Python audio analysis script
- NEW: `src/main/python/requirements.txt` - Python dependencies
- NEW: `src/main/services/prosody-service.ts` - Bridge to Python
- NEW: `src/types/prosody.ts` - Prosody type definitions
- `src/main/ipc/ai-handlers.ts` - Add prosody handler

**Notes:**
- This requires Python installation on user's machine (document requirement)
- Alternative: Use Web Audio API for simpler analysis (no Python)
- Librosa is powerful but adds complexity - only if time permits
- For demo, simple heuristics (volume variance, pitch range) may be sufficient

---

### PR 3.4.2: Energy Graph Visualization

**Goal:** Create a visual "energy graph" overlay on the timeline showing audio engagement levels.

**Tasks:**
- [ ] Read `src/renderer/components/Timeline/Timeline.tsx` for timeline rendering
- [ ] Create NEW: `src/renderer/components/Timeline/EnergyGraph.tsx`:
  - Overlay component on timeline showing energy scores
  - Color-coded: green (engaging), yellow (okay), red (monotone)
  - Bar graph or waveform-style visualization
  - Hover tooltip showing specific scores
- [ ] Update `src/renderer/store/project-store.ts`:
  - Add `prosodyAnalysis: Record<string, ProsodyAnalysis>` to state
  - Add actions: `setProsodyAnalysis`, `getProsodyForAsset`
- [ ] Add "Analyze Audio Quality" button to clip context menu or media library
- [ ] Implement analysis trigger:
  - User clicks analyze button
  - Show loading state
  - Run prosody analysis via IPC
  - Display energy graph on timeline

**What to Test:**
1. Import video with varied audio (engaging parts and monotone parts)
2. Click "Analyze Audio Quality" button
3. Verify loading indicator appears
4. Verify energy graph appears on timeline after analysis
5. Check color coding matches audio quality (green = engaging)
6. Hover over graph to see detailed scores
7. Verify graph scales correctly with timeline zoom
8. Test with multiple clips on timeline

**Files Changed:**
- NEW: `src/renderer/components/Timeline/EnergyGraph.tsx` - Energy visualization
- `src/renderer/components/Timeline/Timeline.tsx` - Integrate energy graph
- `src/renderer/store/project-store.ts` - Add prosody state
- `src/renderer/components/MediaLibrary/MediaLibraryItem.tsx` - Add analysis button
- NEW: `src/renderer/components/Timeline/energy-graph-styles.css` - Graph styling

**Notes:**
- Graph should not obstruct timeline clips
- Use semi-transparent overlay or separate track
- Update graph as user edits (remove analyzed segments)
- Consider aggregating to avoid visual clutter on long videos

---

### PR 3.4.3: Audio Quality Recommendations Panel

**Goal:** Provide actionable suggestions based on prosody analysis to help users improve their content.

**Tasks:**
- [ ] Read prosody analysis structure from previous PR
- [ ] Create NEW: `src/renderer/components/ProsodyPanel/ProsodyPanel.tsx`:
  - Overall audio quality score
  - List of specific issues with timestamps
  - Recommendations for improvement
  - "Jump to Issue" buttons to navigate timeline
- [ ] Generate recommendations in `src/main/python/audio_analyzer.py`:
  - Detect monotone segments: "03:24-03:45: Voice sounds flat, consider re-recording with more energy"
  - Detect low volume: "01:15-01:30: Audio is very quiet, consider boosting volume"
  - Detect inconsistent volume: "Multiple segments with varying volume, consider audio normalization"
  - Detect fast speech: "02:10-02:45: Speaking very fast, consider slowing down"
- [ ] Update `src/types/prosody.ts`:
  ```typescript
  interface Recommendation {
    type: 'monotone' | 'quiet' | 'fast' | 'inconsistent';
    severity: 'high' | 'medium' | 'low';
    timestamp: number;
    duration: number;
    message: string;
    suggestion: string;
  }
  ```
- [ ] Implement recommendation list:
  - Sorted by severity or timestamp
  - Color-coded by type
  - Click to jump to timestamp
  - Dismiss individual recommendations

**What to Test:**
1. Analyze audio with known issues (monotone section, volume changes)
2. Verify recommendations panel shows issues
3. Check that recommendations are specific and actionable
4. Click "Jump to Issue" - verify playhead moves to timestamp
5. Test dismissing recommendations
6. Verify severity levels are correct
7. Test with high-quality audio - should show few/no issues

**Files Changed:**
- NEW: `src/renderer/components/ProsodyPanel/ProsodyPanel.tsx` - Recommendations UI
- `src/main/python/audio_analyzer.py` - Generate recommendations
- `src/types/prosody.ts` - Add recommendation types
- NEW: `src/renderer/components/ProsodyPanel/RecommendationItem.tsx` - Individual recommendation

**Notes:**
- Keep recommendations constructive, not critical
- Focus on actionable items (not just "this sounds bad")
- Provide context: why is this an issue, what to do about it
- This is stretch goal - basic implementation is sufficient for demo
- Consider adding "Learn More" links to audio recording best practices

---

### PR 3.4.4: Prosody Analysis Persistence & Integration

**Goal:** Save prosody analysis results in project files and integrate with overall AI editing workflow.

**Tasks:**
- [ ] Update `src/types/project.ts`:
  - Add `prosodyAnalysis: Record<string, ProsodyAnalysis>` to ProjectFile interface
- [ ] Update project save/load in `src/main/services/project-service.ts`:
  - Include prosody analysis in saved projects
  - Restore analysis on project load
- [ ] Add prosody to export considerations:
  - Show warning if exporting segments marked as "monotone"
  - Optional: "Skip low-quality segments" during export
- [ ] Integrate with AI editing panel:
  - Show prosody issues alongside filler words and silence
  - Combined "issues to fix" view
  - One-click to jump to any detected issue
- [ ] Add "Re-analyze" option:
  - Re-run prosody analysis after user edits
  - Update recommendations based on changes

**What to Test:**
1. Analyze audio quality for a video
2. Save project
3. Close and reopen project
4. Verify prosody analysis is restored
5. Verify energy graph still displays
6. Verify recommendations are still present
7. Make edits to timeline
8. Re-analyze and verify results update
9. Test export with prosody warnings

**Files Changed:**
- `src/types/project.ts` - Add prosody to project schema
- `src/main/services/project-service.ts` - Update save/load
- `src/renderer/components/AIEditingPanel/AIEditingPanel.tsx` - Integrate prosody
- `src/renderer/components/ExportPanel/ExportPanel.tsx` - Add quality warnings

**Notes:**
- Prosody analysis results can be large - consider compression
- Invalidate analysis if user edits analyzed segments
- Show staleness indicator if analysis is outdated
- This completes the AI features suite for the demo

---

## Testing Checklist

### End-to-End AI Workflow Test
1. [ ] Import video with speech (2-3 minutes long)
2. [ ] Generate transcript - verify accuracy
3. [ ] Detect filler words - verify detection
4. [ ] Detect silence - verify detection
5. [ ] Preview AI edits (both filler words and silence)
6. [ ] Apply all AI edits
7. [ ] Verify timeline updates correctly
8. [ ] Export video with all AI edits applied
9. [ ] Watch exported video - verify quality

### Transcript Testing
1. [ ] Test with clear speech - high accuracy expected
2. [ ] Test with background noise - should still work
3. [ ] Test with multiple speakers - basic functionality
4. [ ] Test very long video (> 10 minutes) - check performance
5. [ ] Test clicking transcript segments to seek

### Filler Word Testing
1. [ ] Test with obvious filler words (um, uh, like)
2. [ ] Test false positive avoidance ("I like pizza" should not be flagged)
3. [ ] Test removing multiple filler words in succession
4. [ ] Test undo functionality
5. [ ] Test preview mode

### Silence Testing
1. [ ] Test with video containing long pauses
2. [ ] Test with different threshold settings
3. [ ] Test with minimum duration settings
4. [ ] Test silence at beginning/end of video
5. [ ] Test very short silence (< 0.5s) - should not be detected with defaults

### Combined AI Editing
1. [ ] Test removing filler words AND silence together
2. [ ] Test with overlapping segments
3. [ ] Test "Auto-Edit" preset functionality
4. [ ] Verify time savings calculation is accurate

### Error Handling
1. [ ] Test with invalid OpenAI API key - should show clear error
2. [ ] Test with network disconnected during transcription
3. [ ] Test with video containing no speech
4. [ ] Test with corrupted audio
5. [ ] Test API rate limit handling

### Performance Testing
1. [ ] Test transcription with 5-minute video
2. [ ] Test with 15-minute video (longer test)
3. [ ] Test multiple transcriptions in parallel
4. [ ] Monitor memory usage during analysis

### Project Persistence
1. [ ] Save project with transcript, filler words, silence analysis
2. [ ] Reopen project - verify all data is restored
3. [ ] Test backward compatibility with projects without AI data

---

## Acceptance Criteria

### Phase 3.1: Audio Transcription
- ✅ Can extract audio from video files
- ✅ Can send audio to OpenAI Whisper API
- ✅ Transcript displays in dedicated panel with timestamps
- ✅ Clicking transcript segment seeks to that position
- ✅ Transcripts are cached in project file
- ✅ Loading states and error handling are present

### Phase 3.2: Filler Word Removal
- ✅ Can detect common filler words (um, uh, like, you know)
- ✅ Shows statistics of detected filler words
- ✅ User can select which filler words to remove
- ✅ Preview mode allows hearing result before applying
- ✅ Filler word removal updates timeline correctly
- ✅ Exported video has filler words removed

### Phase 3.3: Silence Removal
- ✅ Can detect silence segments in audio
- ✅ Configurable threshold and minimum duration
- ✅ Silence segments visualized on timeline
- ✅ User can select which silence to remove
- ✅ Silence removal works smoothly without audio artifacts
- ✅ Can combine silence and filler word removal

### Phase 3.4: Audio Prosody Analysis (Stretch)
- ✅ Can analyze audio for engagement metrics
- ✅ Energy graph displays on timeline
- ✅ Provides actionable recommendations
- ✅ Integrates with main AI editing workflow

### Overall Demo Requirements
- ✅ AI features demonstrate clear time-saving value
- ✅ Workflow is intuitive and impressive for demo
- ✅ No crashes during AI operations
- ✅ Export produces high-quality video with AI edits applied
- ✅ "Wow moment" achieved - removing 30 filler words in 5 seconds

---

## Implementation Notes

### API Keys & Environment Setup
- Store OpenAI API key in `.env` file (not committed to repo)
- Provide `.env.example` with placeholder
- Document setup in README
- Show clear error if API key is missing

### FFmpeg Command Patterns
- Audio extraction: `ffmpeg -i video.mp4 -vn -acodec pcm_s16le -ar 16000 audio.wav`
- Silence detection: `ffmpeg -i video.mp4 -af silencedetect=noise=-30dB:d=0.5 -f null -`
- Segment removal: Use trim + concat filters
- Always use `-y` flag to overwrite outputs in temp directory

### Non-Destructive Editing
- Never modify original video files
- Store all edits as metadata in project file
- Apply edits during export using FFmpeg
- Allow users to undo/modify AI edits at any time

### Error Handling Priorities
1. **Critical**: API key errors, network failures during transcription
2. **Important**: FFmpeg errors, file not found errors
3. **Nice to have**: Validation errors, edge case handling

### Performance Considerations
- Transcribe in background, don't block UI
- Use worker threads for CPU-intensive operations (stretch goal)
- Cache analysis results to avoid re-processing
- Show progress indicators for long operations

### UI/UX Priorities
1. **Must have**: Loading states, error messages, success feedback
2. **Should have**: Progress bars with percentage, cancel buttons
3. **Nice to have**: Animations, tooltips, keyboard shortcuts

---

## Dependencies

### Required Before Starting Phase 3
- ✅ Phase 1 (Core Editor) complete:
  - Media import working
  - Timeline rendering functional
  - Project save/load implemented
  - FFmpeg integration established
  - Export pipeline working

- ✅ Phase 2 (Recording) complete:
  - Screen recording functional
  - Webcam recording functional
  - Recordings added to timeline

### External Dependencies
- OpenAI API account with credits
- FFmpeg installed (should already be set up from Phase 1)
- Python 3.9+ (only if implementing prosody analysis)
- librosa and dependencies (only for prosody)

### npm Packages (likely needed)
- `openai` - Official OpenAI SDK
- `fluent-ffmpeg` - FFmpeg wrapper (should already be installed)
- `uuid` - Generate unique IDs
- `date-fns` - Timestamp formatting

---

## Timeline Estimates

**Day 3 (Wednesday) - 24 hours available**

**Morning (Hours 1-8):**
- 3.1.1: Audio Extraction Service (1.5 hours)
- 3.1.2: OpenAI Whisper Integration (2 hours)
- 3.1.3: Transcript UI Panel (3 hours)
- 3.1.4: Transcript Persistence (1.5 hours)

**Afternoon (Hours 9-16):**
- 3.2.1: Filler Word Detection Engine (2 hours)
- 3.2.2: Filler Word Removal UI (2.5 hours)
- 3.2.3: Video Editing for Filler Word Removal (3 hours)
- 3.2.4: Preview & Refinement (0.5 hours)

**Evening (Hours 17-24):**
- 3.3.1: Silence Detection Service (1.5 hours)
- 3.3.2: Silence Visualization & Control UI (2 hours)
- 3.3.3: Silence Removal Implementation (2 hours)
- 3.3.4: Combined AI Editing Workflow (2 hours)

**If Time Permits (Stretch Goals):**
- 3.4.1: Audio Prosody - Python Integration (2 hours)
- 3.4.2: Energy Graph Visualization (2 hours)
- 3.4.3: Recommendations Panel (1.5 hours)
- 3.4.4: Prosody Persistence & Integration (0.5 hours)

**Final Polish:**
- End-to-end testing (1 hour)
- Bug fixes (1 hour)
- Demo preparation (1 hour)

---

## Success Metrics

**Must Achieve:**
- ✅ Transcription working for demo video
- ✅ Can detect and remove at least 10 filler words in under 10 seconds
- ✅ Can detect and remove silence segments
- ✅ Exported video shows clear improvement over original
- ✅ Demo is stable and impressive

**Should Achieve:**
- ✅ Combined workflow (filler + silence) working
- ✅ Preview mode functional
- ✅ Good error handling for API failures
- ✅ All features persisted in project file

**Nice to Have:**
- ✅ Prosody analysis with visual feedback
- ✅ Polished UI with smooth interactions
- ✅ Keyboard shortcuts for common actions
- ✅ Detailed statistics and recommendations

---

## Demo Preparation

### Sample Videos Needed
1. **Test video with clear speech** - for accurate transcription
2. **Video with obvious filler words** - to showcase detection
3. **Video with long pauses** - to demonstrate silence removal
4. **Before/after comparison** - show time saved (e.g., 10 min → 8 min)

### Demo Script
1. Import video (drag and drop)
2. Click "Generate Transcript" - show it working
3. Click "Detect Filler Words" - show 23 instances found
4. Click "Remove Selected" - watch them disappear
5. Click "Detect Silence" - show segments highlighted
6. Click "Remove All Silence"
7. Export final video
8. Compare original (10:30) vs edited (8:15) - saved 2 minutes
9. Play side-by-side - emphasize quality improvement

### Backup Plans
- If OpenAI API is slow: use pre-generated transcript (cached)
- If export takes too long: have pre-exported video ready
- If live demo fails: have screen recording of working demo

---

This completes the Phase 3 AI Features implementation tasks. The focus is on creating impressive, working AI automation that demonstrates real time-saving value for content creators. Remember: functional and impressive beats perfect and incomplete for a 72-hour demo project.
