# Phase 2: Recording Features - Implementation Tasks

## Context

Phase 2 adds recording capabilities to ClipForge, enabling users to capture screen content, webcam video, and simultaneous screen + webcam recordings (Picture-in-Picture). This phase is critical for the MVP checkpoint due Tuesday, October 28th at 10:59 PM CT.

**Why This Matters:** Recording is a core feature that differentiates ClipForge from simple video editors. Many content creators need to record their content directly in the editor, and the simultaneous screen + webcam recording with automatic PiP placement saves significant manual editing time.

**Technical Approach:** We'll use Electron's `desktopCapturer` API for screen recording and standard `getUserMedia()` for webcam access. Each recording source will be captured independently using MediaRecorder API, saving as WebM format (native browser format), then optionally converting to MP4 using FFmpeg for better compatibility. Recordings will be automatically added to the media library and optionally placed on the timeline.

**Architecture Pattern:** All recording logic lives in the main process for better access to Electron APIs, with UI controls in the renderer process communicating via IPC. We'll use a RecordingService class to manage recording state and coordinate multiple simultaneous streams.

**Unified Recording UX:** Instead of separate buttons for each recording type, we use a single "Record" button that opens a unified modal with a step-based flow. Users choose what to record (Screen Only / Webcam Only / Screen + Webcam), then proceed through type-specific configuration steps. This creates a cleaner, more intuitive UX.

## Instructions for AI Agent

1. **Read Phase**: Before implementing each PR, read all files listed in the "Files to Read" section
2. **Implement**: Work through tasks in order, marking completed tasks with `[x]`
3. **Test**: After each PR, run all tests listed in "What to Test"
4. **Completion Summary**: After finishing a PR, provide a brief summary of what was implemented
5. **Wait for Approval**: Wait for human approval before moving to the next PR

**Important Notes:**
- This is a 72-hour demo project - focus on working features, not edge cases
- Test with actual screen recordings (5-10 minute test videos max)
- If FFmpeg conversion is slow, direct WebM support is acceptable for MVP
- Don't over-engineer error handling - basic error messages are sufficient for demo

---

## Phase 2.1: Screen Recording Foundation

**Estimated Time:** 3-4 hours

This section establishes the foundation for screen recording using Electron's desktopCapturer API. Users will be able to select a screen or window to record and save the recording to their media library.

### PR 2.1.1: Desktop Capturer Integration & Source Selection

**Goal:** Enable users to view available screen/window sources and select one to record

**Files to Read:**
- Read `src/main/index.ts` or main process entry point to understand IPC setup
- Read `src/renderer/App.tsx` or main UI component to understand app structure
- Read `src/types/` directory to understand existing type definitions

**Tasks:**
- [x] Create `src/main/services/RecordingService.ts`:
  - Add method `getDesktopSources()` to list available screens and windows
  - Use Electron's `desktopCapturer.getSources()` with types: ['screen', 'window']
  - Return array of sources with id, name, thumbnail for preview
  - Add basic error handling for permission issues
- [x] Add IPC handlers in main process:
  - `recording:get-sources` - returns available desktop sources
  - Add types for DesktopSource interface
- [x] Create `src/renderer/components/RecordingModal.tsx`:
  - Modal/dialog component for source selection
  - Display grid of available sources with thumbnails
  - Show source name (e.g., "Screen 1", "Chrome - Google")
  - "Select" button for each source
  - "Cancel" button to close modal
- [x] Add "Record Screen" button to main toolbar:
  - Opens RecordingModal when clicked
  - Position in toolbar near import button
  - Use appropriate icon (red dot or camera icon)

**What to Test:**
1. Click "Record Screen" button - verify modal opens
2. Modal displays list of screens and windows with thumbnails
3. Screen sources show "Screen 1", "Screen 2" labels
4. Window sources show application name and window title
5. Click "Cancel" - modal closes without errors
6. Open/close modal multiple times - no memory leaks or duplicate sources

**Files Changed:**
- `src/main/services/RecordingService.ts` - NEW: Desktop capturer service
- `src/main/index.ts` - Add IPC handlers for recording
- `src/renderer/components/RecordingModal.tsx` - NEW: Source selection UI
- `src/renderer/components/Toolbar.tsx` - Add Record Screen button
- `src/types/recording.ts` - NEW: Recording type definitions

**Notes:**
- Electron's desktopCapturer requires proper permissions on macOS - app may need screen recording permission
- Test on your actual macOS setup to ensure permissions work
- Thumbnails are base64 data URLs - don't need separate thumbnail storage

---

### PR 2.1.2: Screen Recording Implementation

**Goal:** Implement actual screen recording functionality with start/stop controls

**Files to Read:**
- Read `src/main/services/RecordingService.ts` from previous PR
- Read `src/renderer/components/RecordingModal.tsx` to understand source selection flow

**Tasks:**
- [x] Update `src/main/services/RecordingService.ts`:
  - Add `startScreenRecording(sourceId: string)` method
  - Create temp directory for recordings: `app.getPath('temp')/clipforge-recordings/`
  - Return stream source info to renderer process
  - Track active recording state (recordingId, startTime, sourceId)
- [x] Create `src/renderer/services/MediaRecorderService.ts`:
  - Initialize MediaRecorder with desktop capturer stream
  - Use `navigator.mediaDevices.getUserMedia()` with chromeMediaSourceId constraint
  - Configure WebM output with video/webm codec
  - Handle dataavailable events, collect chunks in array
  - Implement stop() method that creates Blob from chunks
  - Save Blob to file system via IPC call
- [x] Update `src/renderer/components/RecordingModal.tsx`:
  - After source selection, show recording controls UI
  - Display: recording timer (00:00 format), red recording indicator dot
  - "Stop Recording" button
  - Hide source selection grid during recording
  - Show "Recording screen..." status message
- [x] Add IPC handlers:
  - `recording:save-file` - saves Blob data to temp directory, returns file path
  - `recording:stop` - cleanup and finalize recording
- [x] Create `src/types/recording.ts` types:
  - RecordingState: 'idle' | 'selecting' | 'recording' | 'processing'
  - RecordingOptions: sourceId, outputPath, format
  - RecordingMetadata: duration, fileSize, resolution

**What to Test:**
1. Select a screen source - UI transitions to recording state
2. Red recording indicator appears and blinks
3. Timer starts counting up (00:00, 00:01, 00:02...)
4. Click "Stop Recording" - recording stops within 1-2 seconds
5. Recording file saved to temp directory - verify file exists and is valid WebM
6. Test 30-second recording - file size should be reasonable (< 50MB)
7. Open saved WebM in browser - verify video plays correctly
8. Record multiple times in succession - no crashes or file conflicts

**Files Changed:**
- `src/main/services/RecordingService.ts` - Add recording start/stop logic
- `src/main/index.ts` - Add recording IPC handlers
- `src/renderer/services/MediaRecorderService.ts` - NEW: MediaRecorder wrapper
- `src/renderer/components/RecordingModal.tsx` - Add recording UI state
- `src/types/recording.ts` - Add recording types

**Notes:**
- MediaRecorder default codec should work - don't worry about codec options for MVP
- Timer should use setInterval and track elapsed seconds
- Recording indicator can be simple CSS animation (pulsing red dot)
- If recording > 10 minutes, show warning but don't block (stretch goal: auto-stop at 30min)

---

### PR 2.1.3: Import Recording to Media Library

**Goal:** Automatically add completed recording to media library and optionally to timeline

**Files to Read:**
- Read `src/main/services/MediaService.ts` or equivalent to understand media import logic
- Read `src/renderer/stores/mediaStore.ts` or state management for media library
- Read `src/types/media.ts` for MediaAsset types

**Tasks:**
- [x] Update `src/main/services/RecordingService.ts`:
  - After recording stops, generate metadata using FFprobe
  - Extract: duration, resolution, file size, codec info
  - Generate thumbnail at 1-second mark
  - Return complete MediaAsset object
- [x] Update `src/main/services/MediaService.ts`:
  - Add `importRecording(recordingPath: string)` method
  - Move recording from temp directory to project media folder
  - Generate unique filename: `recording_${timestamp}.webm`
  - Add to media assets list
- [x] Update `src/renderer/components/RecordingModal.tsx`:
  - After recording stops, show "Processing..." state
  - Wait for IPC response with MediaAsset data
  - Show success message: "Recording added to library"
  - Auto-close modal after 2 seconds
- [x] Update media library UI:
  - New recording appears in media library automatically
  - Show recording indicator badge/icon on thumbnail
  - Display recording metadata (duration, resolution)
- [ ] Optional: Add recording to timeline automatically (SKIPPED per instructions)
  - Create store action to add clip to timeline
  - Place at current playhead position or end of timeline
  - User preference toggle: "Auto-add recordings to timeline" (default: true)

**What to Test:**
1. Complete a screen recording - verify file moves from temp to project folder
2. Recording appears in media library within 3 seconds
3. Thumbnail displays correctly
4. Metadata shows correct duration and resolution
5. Recording is marked with recording icon/badge
6. If auto-add enabled, clip appears on timeline
7. Click recording in library - can be dragged to timeline manually
8. Close and reopen app - recording persists in library (project saved)

**Files Changed:**
- `src/main/services/RecordingService.ts` - Add post-recording processing
- `src/main/services/MediaService.ts` - Add recording import logic
- `src/renderer/components/RecordingModal.tsx` - Add success state
- `src/renderer/components/MediaLibrary.tsx` - Show recording badge
- `src/renderer/stores/mediaStore.ts` - Add recording to state
- `src/renderer/stores/timelineStore.ts` - Optional auto-add to timeline

**Notes:**
- File move should be atomic - use fs.rename() or copy + delete
- Generate thumbnail using FFmpeg: `ffmpeg -i input.webm -ss 00:00:01 -vframes 1 thumb.jpg`
- If FFprobe fails to read metadata, use reasonable defaults (resolution from desktopCapturer)
- Auto-add to timeline is nice-to-have - don't block on this if timeline integration is complex

---

## Phase 2.2: Webcam Recording

**Estimated Time:** 2-3 hours

This section adds webcam recording capability using standard getUserMedia API. Much simpler than screen recording since no special Electron APIs needed.

### PR 2.2.1: Webcam Access & Preview

**Goal:** Allow users to access their webcam, see a preview, and initiate recording

**Files to Read:**
- Read `src/main/services/RecordingService.ts` to understand recording pattern
- Read `src/renderer/components/RecordingModal.tsx` to reuse UI patterns

**Tasks:**
- [x] Create `src/renderer/components/WebcamRecordingModal.tsx`:
  - Modal with live webcam preview (video element)
  - "Start Recording" and "Cancel" buttons
  - Recording timer (hidden until recording starts)
  - Red recording indicator
  - Preview shows user's webcam feed in real-time
- [x] Add webcam access logic:
  - Use `navigator.mediaDevices.getUserMedia({ video: true, audio: true })`
  - Request video constraints: { width: 1280, height: 720 } (720p default)
  - Request audio: true (include microphone audio)
  - Handle permission denial gracefully (show error message)
- [x] Add "Record Webcam" button to toolbar:
  - Opens WebcamRecordingModal
  - Position next to "Record Screen" button
  - Webcam icon
- [x] Display available cameras if multiple:
  - Use `navigator.mediaDevices.enumerateDevices()` to list cameras
  - Dropdown to select camera (if > 1 camera found)
  - Default to first available camera

**What to Test:**
1. Click "Record Webcam" button - modal opens
2. Webcam permission prompt appears (first time)
3. After granting permission, webcam preview shows live feed
4. Preview is smooth (30fps minimum)
5. If multiple cameras, dropdown shows all options
6. Select different camera - preview switches sources
7. Click "Cancel" - webcam stream stops, modal closes
8. Webcam light turns off when modal closed

**Files Changed:**
- `src/renderer/components/WebcamRecordingModal.tsx` - NEW: Webcam recording UI
- `src/renderer/components/Toolbar.tsx` - Add Record Webcam button
- `src/renderer/services/WebcamService.ts` - NEW: Webcam access helper

**Notes:**
- Webcam preview should match final recording resolution
- Always stop media tracks when modal closes: `stream.getTracks().forEach(track => track.stop())`
- Test on actual MacBook camera - some laptops have camera LED that should turn off
- If no webcam found, show friendly error message, don't crash

---

### PR 2.2.2: Unify Recording UX

**Goal:** Merge RecordingModal and WebcamRecordingModal into one UnifiedRecordingModal with step-based flow

**Files to Read:**
- Read `src/renderer/components/RecordingModal.tsx` to understand screen recording UI
- Read `src/renderer/components/WebcamRecordingModal.tsx` to understand webcam recording UI
- Read `src/renderer/components/Header.tsx` or toolbar component

**Tasks:**
- [x] Create `src/renderer/components/UnifiedRecordingModal.tsx`:
  - Step 1: "What do you want to record?" selection screen
  - Display three cards: "Screen Only", "Webcam Only", "Screen + Webcam (PiP)"
  - Each card has icon, title, description
  - Click card to proceed to Step 2
- [x] Implement Step 2a: Screen source selection (if Screen Only selected):
  - Reuse screen source selection grid from RecordingModal
  - Show thumbnails of available screens and windows
  - "Back" button to return to Step 1
  - "Record" button after selecting source
- [x] Implement Step 2b: Webcam configuration (if Webcam Only selected):
  - Reuse webcam preview and camera selection from WebcamRecordingModal
  - Show live webcam preview
  - Camera selection dropdown (if multiple cameras)
  - "Back" button to return to Step 1
  - "Start Recording" button
- [x] Implement Step 3: Recording controls (shared for both types):
  - Recording timer (00:00 format)
  - Red recording indicator with pulse animation
  - "Stop Recording" button
  - Recording type indicator ("Recording screen..." or "Recording webcam...")
  - Processing state after stop clicked
- [x] Extract shared components:
  - `RecordingProgress.tsx` - Timer and recording indicator
  - `RecordingTypeCard.tsx` - Selection card component for Step 1
  - Shared styles for consistent look across steps
- [x] Update `src/renderer/components/Header.tsx`:
  - Remove "Record Screen" and "Record Webcam" buttons
  - Add single "Record" button with recording icon
  - Opens UnifiedRecordingModal when clicked
- [x] Migrate recording logic:
  - Screen recording flow from RecordingModal → UnifiedRecordingModal Step 2a/3
  - Webcam recording flow from WebcamRecordingModal → UnifiedRecordingModal Step 2b/3
  - Ensure all IPC calls and state management preserved

**What to Test:**
1. Click "Record" button - unified modal opens showing Step 1
2. Step 1 shows three cards: Screen Only, Webcam Only, Screen + Webcam
3. Click "Screen Only" - Step 2a appears with screen source selection
4. Select screen source - Step 3 starts recording with timer
5. Stop recording - processing completes, recording added to library
6. Click "Record" again, choose "Webcam Only" - Step 2b shows webcam preview
7. Start webcam recording - Step 3 shows webcam recording controls
8. Stop webcam recording - processing completes, added to library
9. Click "Back" during Step 2 - returns to Step 1 without errors
10. All recording functionality from previous PRs still works

**Files Changed:**
- `src/renderer/components/UnifiedRecordingModal.tsx` - NEW: Unified recording modal
- `src/renderer/components/RecordingProgress.tsx` - NEW: Extracted progress component
- `src/renderer/components/RecordingTypeCard.tsx` - NEW: Selection card component
- `src/renderer/components/Header.tsx` - Replace two buttons with one "Record" button
- `src/renderer/components/RecordingModal.tsx` - DEPRECATED: Can be removed or kept as reference
- `src/renderer/components/WebcamRecordingModal.tsx` - DEPRECATED: Can be removed or kept as reference

**Notes:**
- Step 1 cards should have hover states for better UX
- "Back" button should clean up any active streams (webcam, etc.)
- Screen + Webcam card can be disabled/grayed out until PR 2.3.1 implementation
- Use consistent spacing and animation transitions between steps
- Preserve all error handling from original modals

---

### PR 2.2.3: Webcam Recording Implementation

**Goal:** Record webcam video with audio and save to media library

**Files to Read:**
- Read `src/renderer/services/MediaRecorderService.ts` from screen recording
- Read `src/main/services/RecordingService.ts` to reuse file saving logic

**Tasks:**
- [x] Update `src/renderer/components/UnifiedRecordingModal.tsx`:
  - Implement webcam recording logic in Step 3
  - Initialize MediaRecorder with webcam stream
  - Show recording timer and red indicator
  - Handle "Stop Recording" button click
  - Disable camera selection dropdown during recording
- [x] Reuse `src/renderer/services/MediaRecorderService.ts`:
  - Same logic as screen recording (MediaRecorder, save chunks)
  - Configure for video + audio tracks
  - Save as WebM with VP8/VP9 video, Opus audio
- [x] Add post-recording processing:
  - Save webcam recording to temp directory
  - Generate thumbnail from first frame
  - Extract metadata (duration, resolution)
  - Import to media library (reuse MediaService logic)
  - Show success message: "Webcam recording added to library"
- [x] Add webcam badge to media library:
  - Show webcam icon on webcam recordings
  - Differentiate from screen recordings visually

**What to Test:**
1. Select "Webcam Only" in unified modal, click "Start Recording"
2. Timer counts up, red indicator blinks
3. Speak and move in frame - verify audio and video recording
4. Record for 30 seconds, click "Stop Recording"
5. Processing completes within 5 seconds
6. Recording appears in media library with webcam badge
7. Play recording in preview - audio and video in sync
8. Recording resolution is 1280x720 (or selected resolution)
9. File size reasonable for 30-second recording (< 20MB)

**Files Changed:**
- `src/renderer/components/UnifiedRecordingModal.tsx` - Add webcam recording logic
- `src/renderer/services/MediaRecorderService.ts` - Reuse for webcam
- `src/main/services/MediaService.ts` - Handle webcam imports
- `src/renderer/components/MediaLibrary.tsx` - Show webcam badge

**Notes:**
- Webcam and screen recordings can share most MediaRecorder logic
- Consider extracting shared recording logic to base class/hook
- Ensure audio from microphone is captured (not just video)
- Test with audio playback - verify audio is not silent or distorted

---

## Phase 2.3: Simultaneous Screen + Webcam (Picture-in-Picture)

**Estimated Time:** 3-4 hours

This section enables recording screen and webcam simultaneously, with automatic Picture-in-Picture layout on the timeline. This is the most complex recording feature but creates impressive demo moments.

### PR 2.3.1: Combined Recording Setup & PiP Configuration

**Goal:** Record screen and webcam streams simultaneously as separate files with PiP layout configuration

**Files to Read:**
- Read `src/main/services/RecordingService.ts` to understand recording coordination
- Read `src/renderer/services/MediaRecorderService.ts` to understand stream handling
- Read `src/renderer/components/UnifiedRecordingModal.tsx` for step flow

**Tasks:**
- [x] Update `src/renderer/components/UnifiedRecordingModal.tsx`:
  - Enable "Screen + Webcam (PiP)" card in Step 1
  - Implement Step 2c: PiP Configuration (when Screen + Webcam selected)
  - Show screen source selection grid (reuse from Step 2a)
  - Show webcam preview overlay in corner (live preview)
  - Add PiP position presets: Bottom-Right, Bottom-Left, Top-Right, Top-Left
  - Add PiP size presets: Small (20%), Medium (25%), Large (30%)
  - "Back" button to return to Step 1
  - "Start Recording" button after screen + position selected
- [x] Implement Step 3 for PiP recording:
  - Show both "Recording screen..." and webcam preview during recording
  - Single timer for both recordings
  - Red recording indicator
  - "Stop Recording" stops both simultaneously
  - Show "Processing both recordings..." state
- [x] Update `src/main/services/RecordingService.ts`:
  - Add `startCombinedRecording(screenSourceId: string, pipConfig: PiPConfig)` method
  - Track two active recordings: screenRecordingId, webcamRecordingId
  - Coordinate start times (start both as close together as possible)
  - Store PiP configuration (position, size) with recording metadata
  - Return both stream source info to renderer
- [x] Create `src/renderer/services/CombinedRecordingService.ts`:
  - Manage two MediaRecorder instances simultaneously
  - Screen MediaRecorder and Webcam MediaRecorder
  - Start both recorders at the same time
  - Track elapsed time for both
  - Stop both recorders together
  - Save both recordings with linked IDs
- [x] Add PiP configuration types:
  - PiPPosition: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
  - PiPSize: 'small' | 'medium' | 'large' (maps to 20%, 25%, 30%)
  - PiPConfig: { position: PiPPosition, size: PiPSize }

**What to Test:**
1. Click "Record", select "Screen + Webcam (PiP)" - Step 2c appears
2. Step 2c shows screen source selection grid
3. After selecting screen, webcam preview appears in corner
4. PiP position presets change webcam preview position in real-time
5. PiP size presets change webcam preview size
6. Click "Start Recording" - both recordings start simultaneously
7. Timer shows elapsed time, both webcam and screen indicators active
8. Webcam preview stays visible during recording
9. Click "Stop Recording" - both recordings stop within 1 second of each other
10. Two separate files saved to temp directory (screen.webm, webcam.webm)
11. Both files have similar durations (within 1 second difference acceptable)

**Files Changed:**
- `src/renderer/components/UnifiedRecordingModal.tsx` - Add Step 2c and PiP recording
- `src/main/services/RecordingService.ts` - Add combined recording support
- `src/renderer/services/CombinedRecordingService.ts` - NEW: Dual recorder manager
- `src/types/recording.ts` - Add PiP configuration types

**Notes:**
- Timing synchronization is best-effort - perfect sync not required for demo
- Both recordings start within 100-200ms of each other is acceptable
- If one recording fails, stop both and show error (don't orphan single recording)
- Webcam preview in Step 2c should match selected PiP size/position
- PiP configuration is stored with recordings for export phase

---

### PR 2.3.2: Timeline Integration with PiP Layout

**Goal:** Automatically add screen and webcam to timeline with Picture-in-Picture layout

**Files to Read:**
- Read `src/renderer/stores/timelineStore.ts` to understand timeline structure
- Read `src/types/timeline.ts` to understand Track and TimelineClip types
- Read `src/renderer/components/Timeline.tsx` to understand multi-track rendering

**Tasks:**
- [x] Update `src/main/services/MediaService.ts`:
  - Add `importCombinedRecording(screenPath, webcamPath, pipConfig)` method
  - Import both recordings as MediaAsset objects
  - Link recordings with metadata: linkedRecordingId, recordingType: 'screen' | 'webcam'
  - Store PiP configuration with webcam asset
  - Return both assets with relationship information
- [x] Update `src/renderer/stores/timelineStore.ts`:
  - Add action: `addPiPRecording(screenAsset, webcamAsset, pipConfig)`
  - Place screen recording on main video track (Track 0)
  - Place webcam recording on overlay track (Track 1)
  - Set webcam position based on pipConfig.position
  - Set webcam size based on pipConfig.size (20%, 25%, or 30%)
  - Align both clips to start at same timeline position
- [x] Update Timeline UI to show overlay track:
  - Render Track 1 as overlay/PiP track visually distinct from main track
  - Show webcam clip with smaller height
  - Display PiP icon on webcam clip
- [x] Add PiP positioning properties to TimelineClip:
  - Add to TimelineClip type: position: { x: number, y: number }, scale: number
  - Map PiPPosition to percentages: bottom-right = { x: 75, y: 75 }, etc.
  - Map PiPSize to scale: small = 0.20, medium = 0.25, large = 0.30
- [x] Create `src/renderer/components/PiPPreview.tsx`:
  - Preview component showing how PiP will look in export
  - Screen video as background layer
  - Webcam video as overlay in configured position
  - Use HTML video elements positioned with CSS

**What to Test:**
1. Complete a combined recording - both files process successfully
2. Timeline shows two tracks: main (screen) and overlay (webcam)
3. Screen recording is full-width on Track 0
4. Webcam recording is smaller on Track 1, visually positioned in corner
5. Both clips start at the same timeline position
6. Both clips have approximately same duration
7. Scrub timeline - both previews update together
8. Click webcam clip - can be moved/resized independently (stretch goal)
9. PiP position matches configuration selected during recording

**Files Changed:**
- `src/main/services/MediaService.ts` - Combined recording import
- `src/renderer/stores/timelineStore.ts` - PiP timeline logic
- `src/types/timeline.ts` - Add PiP positioning properties
- `src/renderer/components/Timeline.tsx` - Render overlay track
- `src/renderer/components/PiPPreview.tsx` - NEW: PiP preview component

**Notes:**
- For MVP, PiP position set during recording is fixed on timeline
- Stretch goal: draggable webcam position on timeline, but not required
- Timeline preview can show simplified PiP (just stacked videos)
- Real PiP compositing happens during export via FFmpeg
- Webcam clip should visually indicate its overlay nature (different color, icon, etc.)

---

### PR 2.3.3: PiP Export with FFmpeg Overlay Filter

**Goal:** Export timeline with screen and webcam composited using FFmpeg overlay filter

**Files to Read:**
- Read `src/main/services/ExportService.ts` to understand export pipeline
- Read FFmpeg overlay documentation (see notes)

**Tasks:**
- [x] Update `src/main/services/ExportService.ts`:
  - Detect PiP layout in timeline (screen + webcam tracks)
  - Generate FFmpeg overlay filter command
  - Position webcam overlay using filter_complex with overlay filter
  - Calculate overlay position from TimelineClip position/scale properties
- [x] Implement FFmpeg overlay command generation:
  - Base command structure: `ffmpeg -i screen.webm -i webcam.webm -filter_complex "[1]scale=w:h[pip];[0][pip]overlay=x:y"`
  - Calculate webcam size based on scale: `scale=${screenWidth * scale}:${screenHeight * scale}`
  - Calculate position based on position percentages: x = screenWidth * (x/100), y = screenHeight * (y/100)
  - Handle both inputs with synchronized timing
- [x] Add export progress tracking:
  - FFmpeg reports progress via stderr
  - Parse progress and update UI progress bar
  - Show estimated time remaining
- [x] Handle export errors gracefully:
  - Catch FFmpeg errors and show user-friendly message
  - If overlay fails, offer "Export screen only" fallback
  - Log detailed error to console for debugging

**What to Test:**
1. Export timeline with PiP layout - FFmpeg command generates correctly
2. Progress bar updates during export (0% → 100%)
3. Export completes within reasonable time (2-3x realtime for demo)
4. Output video shows screen with webcam in configured position
5. Webcam overlay is correct size (matches selected PiP size)
6. Webcam overlay position is correct (matches selected position)
7. Audio from screen recording plays correctly (webcam audio muted for MVP)
8. Play exported video - no visual glitches or sync issues
9. Export different duration recordings (30s, 2min, 5min) - all work
10. Test all four PiP positions (bottom-right, bottom-left, top-right, top-left)
11. Test all three PiP sizes (small, medium, large)

**Files Changed:**
- `src/main/services/ExportService.ts` - Add PiP export logic
- `src/main/utils/ffmpegCommands.ts` - Extract FFmpeg command builders
- `src/types/export.ts` - Add PiP export types

**Notes:**
- FFmpeg overlay filter docs: https://ffmpeg.org/ffmpeg-filters.html#overlay-1
- Basic overlay command: `[1]scale=320:240[pip];[0][pip]overlay=W-w-10:H-h-10`
- W/H are screen dimensions, w/h are webcam dimensions, 10 = padding pixels
- For MVP, mute webcam audio - only include screen audio in export
- Stretch goal: mix both audio tracks, but this adds complexity
- Test export on actual MacBook to ensure performance acceptable
- Add 10-20px padding from edges for better visual appearance

---

## Phase 2.4: Recording Polish & Error Handling

**Estimated Time:** 2 hours

Final polish pass to handle common errors and improve UX.

### PR 2.4.1: Error Handling & Edge Cases

**Goal:** Handle common recording failures gracefully

**Files to Read:**
- Review all RecordingService and Modal components

**Tasks:**
- [ ] Add permission error handling:
  - macOS screen recording permission not granted - show settings link
  - Webcam permission denied - show friendly message with retry button
  - No webcam found - disable webcam recording options in Step 1
- [ ] Add recording duration limits:
  - Warn if recording exceeds 30 minutes
  - Offer to stop and save recording
  - Don't auto-stop (let user decide)
- [ ] Add storage space checks:
  - Before starting recording, check available disk space
  - Warn if < 1GB free space
  - Estimate space needed based on recording settings
- [ ] Add recording interruption handling:
  - If app crashes during recording, recover partial recording on restart
  - Store recording metadata in temp file during recording
  - On app launch, check for incomplete recordings, offer to recover
- [ ] Add better user feedback:
  - Show "Preparing recording..." state before recording starts
  - Display file size during recording (updating in real-time)
  - Show "Saving recording..." state after stop clicked
  - Toast notifications for success/error events

**What to Test:**
1. Deny screen recording permission - see helpful error with settings link
2. Deny webcam permission - see error message with retry button
3. Unplug webcam during recording - recording stops gracefully
4. Record for 31 minutes - warning appears at 30 minutes
5. Fill up disk space (simulate) - warning before recording starts
6. Close app during recording - on reopen, recover partial recording prompt
7. Start recording with < 1GB space - warning shows but allows continue
8. All error messages are user-friendly (no technical jargon)

**Files Changed:**
- `src/main/services/RecordingService.ts` - Add error handling
- `src/renderer/components/UnifiedRecordingModal.tsx` - Add error UI states
- `src/renderer/components/Toast.tsx` - NEW: Toast notification component
- `src/main/utils/storageCheck.ts` - NEW: Disk space utilities

**Notes:**
- macOS screen recording permission: System Preferences > Security & Privacy > Screen Recording
- Use Electron's `shell.openExternal()` to open system preferences
- Recording recovery is nice-to-have - don't spend too much time if complex
- Storage check: use Node.js `fs.statfs()` or similar
- Toast notifications can be simple (react-hot-toast library or custom component)

---

### PR 2.4.2: Recording Settings & Preferences

**Goal:** Add user preferences for recording quality and behavior

**Files to Read:**
- Read `src/main/config/settings.ts` or equivalent for app settings

**Tasks:**
- [ ] Create recording settings panel:
  - Accessible from toolbar dropdown or preferences menu
  - Settings: video quality (720p, 1080p, source), frame rate (30fps, 60fps)
  - Audio quality: standard, high
  - Auto-add to timeline: checkbox (default: true)
  - Recording save location: folder picker
- [ ] Add settings persistence:
  - Store settings in electron-store or localStorage
  - Load settings on app launch
  - Apply settings to all new recordings
- [ ] Update recording services to use settings:
  - Apply resolution setting to getUserMedia constraints
  - Apply frame rate setting
  - Apply audio quality to MediaRecorder options
  - Use custom save location if specified
- [ ] Add keyboard shortcuts:
  - Cmd+Shift+R: Start unified recording modal
  - Esc: Close modal or cancel recording (with confirmation if recording active)

**What to Test:**
1. Open recording settings - all options visible
2. Change video quality to 1080p - new recordings use 1080p
3. Change frame rate to 60fps - verify smooth recording
4. Toggle "Auto-add to timeline" off - recording not added automatically
5. Change save location - recordings save to new folder
6. Settings persist after app restart
7. Press Cmd+Shift+R - unified recording modal opens
8. Press Esc during recording - confirmation dialog appears
9. Different quality settings produce expected file sizes

**Files Changed:**
- `src/renderer/components/RecordingSettings.tsx` - NEW: Settings panel
- `src/main/config/settings.ts` - Add recording settings schema
- `src/main/services/RecordingService.ts` - Apply settings
- `src/renderer/services/KeyboardShortcuts.ts` - Add recording shortcuts
- `src/types/settings.ts` - Recording settings types

**Notes:**
- 1080p at 30fps is good default for demo
- 60fps significantly increases file size - warn users
- Keyboard shortcuts should work globally in app (not just when modal open)
- Esc during recording should confirm before stopping (avoid accidental stops)
- Recording settings are stretch goal - skip if time limited

---

## Acceptance Criteria

Phase 2 is complete when all of the following are true:

### Unified Recording UX
- [ ] User clicks single "Record" button to open unified modal
- [ ] Step 1 shows three clear recording options (Screen / Webcam / Screen + Webcam)
- [ ] Each recording type has appropriate configuration step (Step 2a/2b/2c)
- [ ] Recording controls (Step 3) are consistent across all recording types
- [ ] "Back" button allows returning to Step 1 to change recording type

### Screen Recording
- [ ] User can select a screen/window from source grid
- [ ] Recording timer shows elapsed time during recording
- [ ] User can stop recording and file is saved automatically
- [ ] Recording appears in media library with thumbnail and metadata
- [ ] Recording can be added to timeline and played in preview

### Webcam Recording
- [ ] User can see webcam preview and select camera (if multiple)
- [ ] User can start webcam recording with audio
- [ ] Recording includes both video and audio from microphone
- [ ] User can stop recording and file is saved automatically
- [ ] Webcam recording appears in media library with webcam badge

### Simultaneous Screen + Webcam (PiP)
- [ ] User can select screen source while seeing webcam preview
- [ ] User can configure PiP position (4 options) and size (3 options)
- [ ] Both recordings start simultaneously
- [ ] Both recordings stop simultaneously
- [ ] Screen recording added to Track 0, webcam to Track 1 automatically
- [ ] Webcam positioned according to selected PiP configuration
- [ ] Export produces video with webcam overlay in correct position and size
- [ ] Exported video plays smoothly with no sync issues

### Error Handling
- [ ] Permission denials show helpful error messages
- [ ] No webcam found disables webcam features gracefully
- [ ] Low disk space warnings appear before recording
- [ ] Recording interruptions (app crash) are handled gracefully
- [ ] All error messages are user-friendly, not technical

### User Experience
- [ ] Single "Record" button replaces multiple recording buttons
- [ ] Recording indicators (red dot, timer) are prominent and clear
- [ ] Recordings complete within reasonable time (< 10 seconds processing for 5-min video)
- [ ] UI remains responsive during recording
- [ ] Success messages confirm recording completion
- [ ] No crashes or hangs during any recording workflow

---

## Dependencies

**External Dependencies:**
- Electron desktopCapturer API (built-in)
- navigator.mediaDevices.getUserMedia() (browser API)
- MediaRecorder API (browser API)
- FFmpeg (already required for Phase 1)
- FFprobe (for metadata extraction)

**Internal Dependencies:**
- Phase 1: Media Import & Management must be complete (media library exists)
- Phase 1: Timeline Editor must be functional (multi-track timeline)
- Phase 1: Export functionality must work (to test PiP export)
- IPC communication layer must be established

**Order of Implementation:**
1. Complete Phase 2.1 (Screen Recording) first - it's the foundation
2. Complete Phase 2.2 (Webcam Recording + Unified UX) second - builds on screen recording
3. Complete Phase 2.3 (PiP) last - depends on both previous sections
4. Phase 2.4 (Polish) can be done in parallel or at end

---

## Known Issues & Limitations

**Known Limitations for MVP:**
- WebM format only - no direct MP4 recording (conversion required for compatibility)
- PiP position selected during recording - no timeline repositioning for MVP
- Single webcam audio track - no mixing with screen audio in PiP export
- Recording duration not limited - user can record until disk full
- No pause/resume functionality - only start/stop
- No recording countdown (3-2-1) before recording starts
- System audio capture requires separate plugin (out of scope for MVP)

**Potential Issues:**
- macOS Catalina+ requires screen recording permission grant
- Some apps (e.g., DRM video players) block screen recording
- Webcam may be in use by another app (Zoom, etc.)
- MediaRecorder codec support varies by Chrome version
- Large recordings (> 30 minutes) may cause memory issues
- FFmpeg overlay filter can be slow for 4K recordings

**Workarounds:**
- If FFmpeg overlay is slow, offer "Fast export" option (no webcam overlay)
- If screen recording blocked, show message explaining limitation
- If webcam busy, detect error and show "close other camera apps" message
- For large files, show progress more frequently to reassure user

---

## Testing Strategy

**Manual Testing (Primary for Demo):**
1. **Happy Path Tests:**
   - Use unified modal to record 30-second screen capture → verify in media library
   - Use unified modal to record 30-second webcam → verify video and audio
   - Use unified modal to record screen + webcam with different PiP configs → verify export works
   - Complete full workflow: record → edit → export → verify output

2. **Error Scenario Tests:**
   - Deny permissions → see helpful errors
   - Disconnect webcam during recording → graceful failure
   - Fill disk space → warning before recording
   - Start recording, go back, select different type → no conflicts

3. **Performance Tests:**
   - Record 5-minute video → file size < 200MB
   - Record 10-minute PiP → export completes in < 30 minutes
   - Multiple recordings in session → no memory leaks

**Automated Testing (Stretch Goal):**
- Unit tests for RecordingService methods
- Integration tests for IPC handlers
- E2E test: Full recording workflow with Playwright

**Demo Preparation Tests:**
- Record sample screen + webcam video with different PiP positions for demo
- Practice complete workflow: unified modal → select type → record → export
- Verify exported video quality acceptable for demo
- Test on actual presentation laptop (not just dev machine)

---

## Performance Targets

**Recording Performance:**
- Unified modal opens within 500ms
- Screen recording starts within 2 seconds of source selection
- Webcam preview appears within 1 second of permission grant
- PiP recording starts both streams within 3 seconds
- Recording UI remains responsive (60fps) during recording

**Processing Performance:**
- 5-minute recording processes in < 10 seconds
- Thumbnail generation < 2 seconds
- Metadata extraction < 1 second
- FFmpeg overlay export at ~1x realtime (5-min video exports in ~5 minutes)

**File Size Targets:**
- Screen recording: ~50MB per 5 minutes at 1080p/30fps
- Webcam recording: ~30MB per 5 minutes at 720p/30fps
- PiP export: ~60MB per 5 minutes

**Memory Targets:**
- Recording 10-minute video uses < 500MB additional RAM
- No memory leaks during multiple recording sessions
- App remains stable after 5+ recordings in single session

---

## Resources & References

**Electron APIs:**
- desktopCapturer: https://www.electronjs.org/docs/latest/api/desktop-capturer
- Screen Recording Permission: https://www.electronjs.org/docs/latest/tutorial/macos-permissions

**Browser APIs:**
- MediaRecorder: https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder
- getUserMedia: https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
- Screen Capture API: https://developer.mozilla.org/en-US/docs/Web/API/Screen_Capture_API

**FFmpeg Guides:**
- Overlay Filter: https://ffmpeg.org/ffmpeg-filters.html#overlay-1
- Picture-in-Picture Tutorial: https://trac.ffmpeg.org/wiki/FilteringGuide#PictureInPicture
- WebM Format: https://trac.ffmpeg.org/wiki/Encode/VP9

**Example Code Patterns:**
- Electron Screen Recording: https://github.com/hokein/electron-sample-apps/tree/master/desktop-capturer
- MediaRecorder Example: https://developer.mozilla.org/en-US/docs/Web/API/MediaStream_Recording_API/Recording_a_media_element

---

## Success Metrics

Phase 2 is successful if:

1. **Functional Completeness:** All three recording modes work reliably through unified modal
2. **Demo Quality:** Recordings are high enough quality for impressive demo
3. **User Experience:** Single "Record" button with clear step-based flow is intuitive
4. **Performance:** Recordings complete in reasonable time, no crashes
5. **MVP Readiness:** Feature is polished enough for Tuesday 10:59 PM checkpoint

**Demo Script Validation:**
- "Watch me click Record and choose what to record..." → unified modal impresses
- "I'll record my screen with webcam in the corner..." → PiP config is smooth
- "And export with the webcam overlay..." → output looks professional
- Total demo time for recording feature: < 3 minutes

**Key Metric:** Can a new user record screen + webcam with PiP and export a video in under 5 minutes without any documentation?
