# Phase 1: Core Editor (MVP) - Implementation Tasks

## Context

ClipForge is a 72-hour desktop video editor challenge with MVP due Tuesday 10/28 at 10:59 PM CT. This is a demo project focused on getting features working quickly, not production-level edge case handling.

**Phase 1 Goal**: Build a fully functional desktop video editor with recording, import, timeline editing, preview, and export capabilities. This phase establishes the foundation for Phase 2 AI features.

**Key Architecture Decision**: Build with a programmatic edit API from day one, allowing the timeline to be controlled both by UI interactions and programmatically (enabling future AI agent integration).

**Technology Stack**: Electron + React + TypeScript, FFmpeg for video processing, desktopCapturer API for screen recording, MediaRecorder API for webcam.

This document breaks down Phase 1 into 6 implementation phases with multiple PRs each. Each PR is designed to be independently testable and deliverable within 2-4 hours.

## Instructions for AI Agent

1. **Read Phase**: Before starting any PR, read all files listed in the "Tasks" section to understand current implementation
2. **Implement**: Work through tasks in order, checking off each with [x] as completed
3. **Test**: Verify all items in "What to Test" section before considering PR complete
4. **Mark Complete**: When all tasks and tests pass, mark the PR header with [x]
5. **Report**: Provide completion summary listing what was implemented and any deviations
6. **Wait**: Do not proceed to next PR until current one is approved

**Working in 72-hour demo mode means:**
- Prioritize working features over perfect architecture
- Use inline styles if needed to move fast
- Basic error handling (console.log + user alert) is acceptable
- No comprehensive unit tests required (manual testing only)
- Skip edge cases like undo/redo unless explicitly listed

---

## Phase 1.1: Application Foundation

**Estimated Time:** 4-6 hours

Set up the Electron + React + TypeScript project with development tooling and basic UI shell. This establishes the workspace for all subsequent features.

### PR 1.1.1: Project Initialization & Development Setup

**Goal:** Create working Electron + React + TypeScript application that launches with hot reload

**Tasks:**
- [ ] Initialize Node.js project with `npm init`
- [ ] Install Electron dependencies:
  - `electron` (main framework)
  - `electron-builder` (for packaging later)
  - Development: `electron-is-dev`, `concurrently`, `wait-on`
- [ ] Install React + TypeScript dependencies:
  - `react`, `react-dom`, `typescript`
  - `@types/react`, `@types/react-dom`, `@types/node`
  - Build tools: `webpack`, `webpack-cli`, `webpack-dev-server`
  - Loaders: `babel-loader`, `ts-loader`, `css-loader`, `style-loader`
  - `@babel/core`, `@babel/preset-react`, `@babel/preset-typescript`
- [ ] Install development tools:
  - `eslint`, `@typescript-eslint/parser`, `@typescript-eslint/eslint-plugin`
  - `prettier`
- [ ] Create NEW: `src/main/main.ts` - Electron main process entry point:
  - Create BrowserWindow with 1280x720 dimensions
  - Load renderer process from localhost in dev, file:// in prod
  - Handle window lifecycle (close, minimize)
  - Enable Node integration and context isolation settings
- [ ] Create NEW: `src/renderer/index.html` - HTML entry point for renderer
- [ ] Create NEW: `src/renderer/App.tsx` - Root React component with "ClipForge" header
- [ ] Create NEW: `src/renderer/index.tsx` - React entry point mounting App
- [ ] Create NEW: `webpack.config.js` - Webpack configuration for renderer process:
  - Entry point: `src/renderer/index.tsx`
  - Output: `dist/renderer/`
  - TypeScript + React loaders configured
  - Dev server on port 3000
- [ ] Create NEW: `tsconfig.json` - TypeScript configuration:
  - Target ES2020
  - JSX: react
  - Strict mode enabled
  - Include: `src/**/*`
- [ ] Create NEW: `.eslintrc.js` - ESLint configuration for TypeScript + React
- [ ] Create NEW: `.prettierrc` - Prettier formatting rules
- [ ] Update `package.json` scripts:
  - `"dev:renderer"`: Start webpack dev server
  - `"dev:electron"`: Launch Electron pointing to dev server
  - `"dev"`: Run both concurrently
  - `"build"`: Build renderer and package Electron app
- [ ] Create NEW: `.gitignore` - Exclude node_modules, dist, build artifacts

**What to Test:**
1. Run `npm run dev` - verify app launches with "ClipForge" header
2. Edit App.tsx and change header text - verify hot reload works
3. Check browser console - verify no TypeScript compilation errors
4. Verify ESLint catches basic errors (add unused variable, check terminal)

**Files Changed:**
- NEW: `package.json` - Project dependencies and scripts
- NEW: `src/main/main.ts` - Electron main process
- NEW: `src/renderer/index.html` - HTML template
- NEW: `src/renderer/App.tsx` - Root React component
- NEW: `src/renderer/index.tsx` - React entry point
- NEW: `webpack.config.js` - Build configuration
- NEW: `tsconfig.json` - TypeScript configuration
- NEW: `.eslintrc.js` - Linting rules
- NEW: `.prettierrc` - Code formatting
- NEW: `.gitignore` - Git exclusions

**Notes:**
- Use `electron-is-dev` to detect development vs production mode for loading renderer
- Context isolation should be false initially for easier IPC (can harden later)
- Keep window size fixed at 1280x720 for demo consistency

---

### PR 1.1.2: Basic UI Layout Shell

**Goal:** Implement the main application layout structure with placeholder panels for media library, timeline, preview, and controls

**Tasks:**
- [x] Read `src/renderer/App.tsx` to understand current structure
- [x] Create NEW: `src/renderer/components/Layout.tsx` - Main layout component with CSS Grid:
  - Header bar (top, full width, 60px height)
  - Media library panel (left, 250px width)
  - Preview panel (center-top, flexible height)
  - Timeline panel (bottom, full width, 200px height)
  - Use CSS Grid for responsive layout
- [x] Create NEW: `src/renderer/components/Header.tsx` - Top toolbar:
  - App title "ClipForge"
  - Placeholder for control buttons (Import, Record, Export)
  - Simple background color (#2c3e50 or similar dark theme)
- [x] Create NEW: `src/renderer/components/MediaLibrary.tsx` - Left sidebar:
  - Panel title "Media Library"
  - Empty state message "No media imported"
  - Background color distinguishing it from main area
- [x] Create NEW: `src/renderer/components/Preview.tsx` - Center video preview:
  - Black background (#000000)
  - Centered placeholder text "Preview"
  - Will hold video player in future PR
- [x] Create NEW: `src/renderer/components/Timeline.tsx` - Bottom timeline:
  - Panel title "Timeline"
  - Gray background (#34495e or similar)
  - Placeholder for tracks (will add drag-drop later)
- [x] Update `src/renderer/App.tsx`:
  - Import and render Layout component
  - Pass all sub-components to Layout
- [x] Create NEW: `src/renderer/styles/global.css` - Global styles:
  - Reset margins/padding
  - Set font family (system fonts for macOS)
  - Dark theme color variables

**What to Test:**
1. Launch app - verify 4-panel layout renders correctly
2. Resize window - verify panels maintain relative sizing
3. Check spacing between panels - should be visually distinct
4. Verify no scrollbars unless window is very small

**Files Changed:**
- `src/renderer/App.tsx` - Import and use Layout
- NEW: `src/renderer/components/Layout.tsx` - Grid layout container
- NEW: `src/renderer/components/Header.tsx` - Top toolbar
- NEW: `src/renderer/components/MediaLibrary.tsx` - Left panel
- NEW: `src/renderer/components/Preview.tsx` - Center panel
- NEW: `src/renderer/components/Timeline.tsx` - Bottom panel
- NEW: `src/renderer/styles/global.css` - Global styling

**Notes:**
- Use CSS Grid over Flexbox for easier 2D layout control
- Keep panel dimensions fixed for demo (don't implement resizable panels)
- Dark theme is more common for video editors (matches FCP, Premiere)

---

### PR 1.1.3: FFmpeg Integration & Video Processing Verification

**Goal:** Integrate FFmpeg and verify video processing capabilities work before building features on top

**Tasks:**
- [ ] Install FFmpeg dependencies:
  - `fluent-ffmpeg` (FFmpeg wrapper for Node.js)
  - `@ffmpeg-installer/ffmpeg` (bundles FFmpeg binary)
  - `@types/fluent-ffmpeg`
- [ ] Create NEW: `src/main/services/VideoProcessor.ts` - FFmpeg service class:
  - `constructor()` - Set FFmpeg path from @ffmpeg-installer
  - `async trimVideo(input, output, startTime, endTime)` - Trim video segment
  - `async concatenateVideos(inputs[], output)` - Stitch multiple videos
  - `async extractThumbnail(videoPath, timestamp, outputPath)` - Generate thumbnail
  - `async getVideoMetadata(videoPath)` - Return duration, resolution, codec info
  - Error handling for FFmpeg failures (reject promises with error messages)
- [ ] Create NEW: `src/main/utils/ffmpegConfig.ts` - FFmpeg configuration:
  - Set FFmpeg binary path
  - Set FFprobe binary path
  - Export configured fluent-ffmpeg instance
- [ ] Create NEW: `test-video-processing.ts` - Test script in project root:
  - Download or create a sample 10-second MP4 file
  - Test trimming first 5 seconds
  - Test getting metadata
  - Test thumbnail extraction
  - Log results to console
- [ ] Add test script to package.json: `"test:video"` runs test-video-processing.ts
- [ ] Document FFmpeg methods in VideoProcessor.ts with JSDoc comments

**What to Test:**
1. Run `npm run test:video` - verify script completes without errors
2. Check that trimmed video file is created in output directory
3. Verify trimmed video is 5 seconds long when played
4. Check metadata extraction returns correct duration and resolution
5. Verify thumbnail PNG file is generated

**Files Changed:**
- NEW: `src/main/services/VideoProcessor.ts` - FFmpeg wrapper service
- NEW: `src/main/utils/ffmpegConfig.ts` - FFmpeg configuration
- NEW: `test-video-processing.ts` - Validation test script
- `package.json` - Add fluent-ffmpeg dependencies and test script

**Notes:**
- @ffmpeg-installer bundles FFmpeg so users don't need to install separately
- Keep test script in repo for quick regression testing during development
- VideoProcessor should run in main process only (not renderer) for security
- Use async/await pattern for all FFmpeg operations

---

## Phase 1.2: Media Import & Management

**Estimated Time:** 4-5 hours

Implement media library functionality allowing users to import video files and manage their media assets.

### PR 1.2.1: Electron IPC Bridge for File Operations

**Goal:** Set up secure communication channel between renderer and main process for file operations

**Tasks:**
- [ ] Read `src/main/main.ts` to understand main process setup
- [ ] Create NEW: `src/main/ipc/handlers.ts` - IPC event handlers:
  - `handle('select-file')` - Opens native file dialog, returns selected file path
  - `handle('import-video', filePath)` - Validates video file, extracts metadata, returns media object
  - `handle('generate-thumbnail', videoPath)` - Generates thumbnail, returns base64 data URL
  - Each handler includes try/catch with error responses
- [ ] Update `src/main/main.ts`:
  - Import and register IPC handlers after app ready
  - Use `ipcMain.handle()` for async request/response pattern
- [ ] Create NEW: `src/renderer/utils/ipc.ts` - Renderer-side IPC helpers:
  - `async selectFile()` - Calls 'select-file' handler
  - `async importVideo(filePath)` - Calls 'import-video' handler
  - `async generateThumbnail(videoPath)` - Calls 'generate-thumbnail' handler
  - Type definitions for request/response shapes
- [ ] Create NEW: `src/types/media.ts` - Shared type definitions:
  - `interface MediaFile` - id, path, filename, duration, resolution, thumbnail, fileSize
  - Export types for use in both main and renderer

**What to Test:**
1. Add temporary button in Header that calls `selectFile()` - verify file dialog opens
2. Select a video file - verify file path is logged to console
3. Call `importVideo()` with path - verify metadata object is returned
4. Check thumbnail generation returns valid base64 image data
5. Verify error handling - try importing invalid file path

**Files Changed:**
- `src/main/main.ts` - Register IPC handlers
- NEW: `src/main/ipc/handlers.ts` - IPC handler implementations
- NEW: `src/renderer/utils/ipc.ts` - Renderer IPC helpers
- NEW: `src/types/media.ts` - Shared type definitions

**Notes:**
- Use `ipcMain.handle` + `ipcRenderer.invoke` pattern (modern Electron IPC)
- File dialog should filter to video formats: .mp4, .mov, .webm
- Thumbnail should be extracted at 1 second into video
- Store thumbnails as base64 data URLs for easy rendering in React

---

### PR 1.2.2: Media Library State Management & Import UI

**Goal:** Implement media library panel with import functionality and display of imported clips

**Tasks:**
- [ ] Read `src/renderer/components/MediaLibrary.tsx` to understand current structure
- [ ] Install state management: `npm install zustand` (lightweight state manager)
- [ ] Create NEW: `src/renderer/store/mediaStore.ts` - Zustand store for media:
  - State: `mediaFiles: MediaFile[]`
  - Actions: `addMediaFile(file)`, `removeMediaFile(id)`, `clearMedia()`
  - Persist to localStorage for demo purposes
- [ ] Update `src/renderer/components/MediaLibrary.tsx`:
  - Add "Import Video" button in panel header
  - Button click calls `selectFile()` then `importVideo()`
  - On successful import, add to mediaStore
  - Display list of imported media files:
    - Show thumbnail image
    - Show filename
    - Show duration (formatted as MM:SS)
    - Show resolution (e.g., "1920x1080")
  - Empty state when no media: "Click Import Video to get started"
- [ ] Create NEW: `src/renderer/components/MediaItem.tsx` - Individual media list item:
  - Props: `mediaFile: MediaFile`
  - Thumbnail on left (80x60px)
  - Metadata stacked on right
  - Hover effect for selection
  - Click handler (will use for drag later)
- [ ] Add loading state during import process (show spinner or "Importing...")
- [ ] Add error toast/alert if import fails

**What to Test:**
1. Click "Import Video" - verify file dialog opens
2. Select valid video file - verify it appears in media library
3. Check thumbnail displays correctly
4. Verify duration shows in MM:SS format (e.g., "01:23" for 83 seconds)
5. Import multiple videos - verify all appear in list
6. Refresh page - verify media persists (localStorage)
7. Try importing non-video file - verify error message appears

**Files Changed:**
- `src/renderer/components/MediaLibrary.tsx` - Add import button and media list
- NEW: `src/renderer/components/MediaItem.tsx` - Media list item component
- NEW: `src/renderer/store/mediaStore.ts` - Media state management
- `package.json` - Add zustand dependency

**Notes:**
- Keep thumbnails small to avoid memory issues with many imports
- Format duration using helper function (seconds to MM:SS)
- Use simple alert() for errors in demo mode (can upgrade to toast library later)
- localStorage persistence means users don't lose media on refresh

---

### PR 1.2.3: Drag-and-Drop File Import

**Goal:** Enable drag-and-drop video file import directly into media library panel

**Tasks:**
- [ ] Read `src/renderer/components/MediaLibrary.tsx` to see current import implementation
- [ ] Update `src/renderer/components/MediaLibrary.tsx`:
  - Add drag-and-drop zone overlay (covers panel when dragging)
  - `onDragEnter` - Show drop zone overlay
  - `onDragLeave` - Hide overlay if leaving panel
  - `onDragOver` - Prevent default to allow drop
  - `onDrop` - Get file paths from event.dataTransfer.files
  - Filter to video files only (.mp4, .mov, .webm extensions)
  - Call `importVideo()` for each valid file
  - Show "Drop video files here" message in overlay
- [ ] Add visual feedback:
  - Border highlight when dragging over panel
  - Semi-transparent overlay with drop icon/text
  - Reset state after drop completes
- [ ] Handle multiple files dropped simultaneously:
  - Import each file sequentially (avoid parallel FFmpeg processes)
  - Show progress: "Importing 2 of 5 files..."
- [ ] Add file validation:
  - Check file extension
  - Skip non-video files with console warning
  - Alert user if invalid files were dropped

**What to Test:**
1. Drag video file from Finder over media library - verify drop zone appears
2. Drop file - verify it imports and appears in list
3. Drag multiple video files - verify all import sequentially
4. Drag mix of video and non-video files - verify only videos import
5. Drag file outside panel - verify drop zone disappears
6. Verify existing "Import Video" button still works

**Files Changed:**
- `src/renderer/components/MediaLibrary.tsx` - Add drag-and-drop handlers

**Notes:**
- Electron apps need to prevent default on dragover to enable drops
- Import files one at a time to avoid overloading FFmpeg
- Keep drop zone overlay simple (gray overlay + centered text)
- Verify file extensions on renderer side before calling IPC

---

## Phase 1.3: Project Management (Non-Destructive Editing)

**Estimated Time:** 3-4 hours

Implement the project state management system that tracks timeline composition without modifying original files.

### PR 1.3.1: Project State Model & Timeline Store

**Goal:** Create data model for timeline composition and project state management

**Tasks:**
- [ ] Read `src/types/media.ts` to understand MediaFile interface
- [ ] Create NEW: `src/types/timeline.ts` - Timeline type definitions:
  - `interface TimelineClip` - id, mediaFileId, trackIndex, startTime, endTime, trimStart, trimEnd
  - `interface Track` - id, name, clips: TimelineClip[]
  - `interface Project` - id, name, tracks: Track[], duration
  - Export all interfaces
- [ ] Create NEW: `src/renderer/store/projectStore.ts` - Zustand store for project:
  - State: `currentProject: Project | null`, `playheadPosition: number`
  - Actions:
    - `createProject(name)` - Initialize new project with 2 empty tracks
    - `addClipToTrack(mediaFileId, trackIndex, position)` - Add clip to timeline
    - `removeClip(clipId)` - Remove clip from timeline
    - `updateClip(clipId, changes)` - Update clip properties (trim points, position)
    - `setPlayheadPosition(position)` - Update playhead
    - `getProjectDuration()` - Calculate total timeline duration
  - Persist project to localStorage
- [ ] Create NEW: `src/renderer/utils/timelineCalculations.ts` - Helper functions:
  - `calculateClipDuration(clip)` - Returns clip duration accounting for trim
  - `calculateTrackDuration(track)` - Returns track end time
  - `findClipAtPosition(track, position)` - Returns clip at playhead position
  - `detectOverlaps(track)` - Checks if clips overlap (validation)
- [ ] Document the non-destructive editing model in code comments:
  - Original media files never modified
  - Timeline clips reference media via mediaFileId
  - Trim points stored as offsets (trimStart/trimEnd in seconds)
  - Export process renders composition using FFmpeg

**What to Test:**
1. Create new project - verify it initializes with 2 empty tracks
2. Add clip to timeline programmatically - verify it's stored in project state
3. Update clip trim points - verify changes are reflected in state
4. Calculate project duration with multiple clips - verify correct total
5. Check localStorage - verify project persists on refresh
6. Remove clip - verify it's removed from state

**Files Changed:**
- NEW: `src/types/timeline.ts` - Timeline data models
- NEW: `src/renderer/store/projectStore.ts` - Project state management
- NEW: `src/renderer/utils/timelineCalculations.ts` - Timeline math helpers

**Notes:**
- TimelineClip references MediaFile by ID (foreign key pattern)
- Trim points are relative to original media (trimStart=0 means no trim)
- startTime/endTime are absolute positions on timeline (in seconds)
- Track 0 = main track, Track 1 = overlay track (for future picture-in-picture)
- Keep state calculations pure functions for easy testing

---

### PR 1.3.2: Programmatic Edit API Layer

**Goal:** Create internal API exposing all edit operations for both UI and future AI agent use

**Tasks:**
- [ ] Read `src/renderer/store/projectStore.ts` to understand project actions
- [ ] Create NEW: `src/renderer/api/EditAPI.ts` - Programmatic edit interface:
  - `class EditAPI` with methods:
    - `async addClip(mediaFileId, trackIndex, startTime)` - Add clip to timeline
    - `async trimClip(clipId, trimStart?, trimEnd?)` - Adjust clip trim points
    - `async splitClip(clipId, splitTime)` - Split clip into two at position
    - `async deleteClip(clipId)` - Remove clip from timeline
    - `async moveClip(clipId, newTrackIndex, newStartTime)` - Reposition clip
    - `async addAudioTrack(audioFileId)` - Add audio-only track (future use)
    - `getTimeline()` - Returns current project state
    - `getClip(clipId)` - Returns specific clip details
  - Each method validates input and updates projectStore
  - Each method returns Promise (for async compatibility later)
  - Log all operations to console for debugging
- [ ] Implement Command pattern structure:
  - Each method creates a command object: `{ type, payload, timestamp }`
  - Store command history in projectStore (for potential undo later)
  - Max 50 commands in history to avoid memory issues
- [ ] Add validation logic:
  - Verify mediaFileId exists before adding clip
  - Verify clipId exists before trim/delete/move
  - Verify trackIndex is valid (0 or 1 for MVP)
  - Prevent overlapping clips on same track (snap to available space)
- [ ] Create NEW: `src/renderer/api/index.ts` - Export singleton EditAPI instance
- [ ] Document API with JSDoc comments and usage examples

**What to Test:**
1. Call `EditAPI.addClip()` with valid media - verify clip appears in projectStore
2. Call `EditAPI.trimClip()` - verify trim points update in state
3. Call `EditAPI.splitClip()` - verify original clip is replaced with two clips
4. Call `EditAPI.deleteClip()` - verify clip is removed
5. Call methods with invalid IDs - verify appropriate errors are thrown
6. Check command history - verify operations are logged
7. Verify all operations are Promise-based (await EditAPI.addClip(...))

**Files Changed:**
- NEW: `src/renderer/api/EditAPI.ts` - Programmatic edit interface
- NEW: `src/renderer/api/index.ts` - Export singleton instance
- `src/renderer/store/projectStore.ts` - Add command history to state

**Notes:**
- This API will be used by UI components AND Phase 2 AI features
- Command pattern enables future undo/redo implementation
- Keep methods granular (separate trim from move) for AI clarity
- Log operations for debugging timeline issues during development
- Singleton pattern ensures consistent state across UI

---

## Phase 1.4: Timeline Editor

**Estimated Time:** 6-8 hours

Build the interactive timeline with drag-and-drop clip arrangement, trim handles, and split functionality.

### PR 1.4.1: Timeline Track Rendering & Basic Layout

**Goal:** Render timeline tracks with time ruler and playhead indicator

**Tasks:**
- [ ] Read `src/renderer/components/Timeline.tsx` to see current placeholder
- [ ] Read `src/renderer/store/projectStore.ts` to understand project state
- [ ] Update `src/renderer/components/Timeline.tsx`:
  - Subscribe to projectStore (get current project and tracks)
  - Implement zoom state: `pixelsPerSecond` (start at 50px/sec)
  - Calculate timeline width: `projectDuration * pixelsPerSecond`
  - Render scrollable container for timeline content
- [ ] Create NEW: `src/renderer/components/TimelineRuler.tsx` - Time ruler:
  - Shows time markers every 5 seconds (00:00, 00:05, 00:10, etc.)
  - Tick marks at 1-second intervals
  - Width based on timeline zoom level
  - Fixed at top of timeline
- [ ] Create NEW: `src/renderer/components/TimelineTrack.tsx` - Single track row:
  - Props: `track: Track`, `zoom: number`
  - Height 80px per track
  - Background grid lines at 5-second intervals
  - Track label on left ("Track 1", "Track 2")
  - Container for clips (will add in next PR)
- [ ] Create NEW: `src/renderer/components/Playhead.tsx` - Playhead indicator:
  - Red vertical line spanning all tracks
  - Position based on playheadPosition from projectStore
  - Position calculation: `playheadPosition * pixelsPerSecond`
  - Triangular handle at top for dragging (next PR)
  - Should overlay clips (z-index)
- [ ] Add zoom controls in Timeline header:
  - Zoom in button (increase pixelsPerSecond by 10)
  - Zoom out button (decrease pixelsPerSecond by 10)
  - Min zoom: 20px/sec, Max zoom: 100px/sec
  - Display current zoom level (e.g., "50px/s")
- [ ] Add CSS for timeline styling:
  - Horizontal scrollbar when content wider than viewport
  - Track backgrounds alternate colors for visual distinction
  - Ruler text labels positioned correctly

**What to Test:**
1. Launch app with empty project - verify 2 tracks render
2. Verify time ruler shows correct time markers (00:00, 00:05, etc.)
3. Click zoom in/out - verify timeline width changes
4. Scroll timeline horizontally - verify ruler and playhead stay aligned
5. Check playhead appears at position 0 initially
6. Manually update playheadPosition in store - verify playhead moves

**Files Changed:**
- `src/renderer/components/Timeline.tsx` - Timeline container with zoom
- NEW: `src/renderer/components/TimelineRuler.tsx` - Time markers
- NEW: `src/renderer/components/TimelineTrack.tsx` - Track row
- NEW: `src/renderer/components/Playhead.tsx` - Playhead indicator

**Notes:**
- Keep zoom level in component state (not global) for simplicity
- Use CSS transform for playhead positioning (smoother than left property)
- Fixed track height simplifies clip positioning math
- Horizontal scroll is expected for longer timelines

---

### PR 1.4.2: Drag Clips from Media Library to Timeline

**Goal:** Enable dragging media from library onto timeline tracks

**Tasks:**
- [ ] Read `src/renderer/components/MediaItem.tsx` to see media list items
- [ ] Read `src/renderer/api/EditAPI.ts` to understand addClip method
- [ ] Install drag-and-drop library: `npm install react-dnd react-dnd-html5-backend`
- [ ] Update `src/renderer/components/MediaItem.tsx`:
  - Wrap component in `useDrag` hook from react-dnd
  - Drag type: `"MEDIA_ITEM"`
  - Drag data: `{ mediaFileId, mediaFile }`
  - Add CSS cursor pointer on hover
- [ ] Update `src/renderer/components/TimelineTrack.tsx`:
  - Wrap track in `useDrop` hook
  - Accept type: `"MEDIA_ITEM"`
  - On drop: Calculate drop position in seconds from pixel X coordinate
  - Call `EditAPI.addClip(mediaFileId, trackIndex, dropPosition)`
  - Show drop preview indicator when dragging over track
- [ ] Create NEW: `src/renderer/components/TimelineClipView.tsx` - Visual clip on timeline:
  - Props: `clip: TimelineClip`, `zoom: number`
  - Render as rectangular block:
    - Position: `clip.startTime * zoom` (left offset)
    - Width: `calculateClipDuration(clip) * zoom`
    - Height: 60px (fits within 80px track)
  - Display clip label (media filename, truncated if too long)
  - Background color to distinguish from track
  - Show waveform thumbnail (optional, can skip for MVP)
- [ ] Update `src/renderer/components/TimelineTrack.tsx`:
  - Map over track.clips and render TimelineClipView for each
  - Position clips using absolute positioning
- [ ] Prevent overlapping clips:
  - In EditAPI.addClip, check for existing clips at drop position
  - If overlap detected, snap to end of last clip
  - Alert user if auto-snapping occurred

**What to Test:**
1. Import video into media library
2. Drag media item onto Track 1 - verify clip appears on timeline
3. Verify clip width matches video duration (check with metadata)
4. Drop clip on Track 2 - verify it appears on second track
5. Drop second clip on same track - verify it snaps if overlap
6. Verify clip label shows filename
7. Check projectStore - verify clip data is saved

**Files Changed:**
- `src/renderer/components/MediaItem.tsx` - Add drag source
- `src/renderer/components/TimelineTrack.tsx` - Add drop target and render clips
- NEW: `src/renderer/components/TimelineClipView.tsx` - Clip visualization
- `src/renderer/api/EditAPI.ts` - Add overlap detection to addClip
- `package.json` - Add react-dnd dependencies

**Notes:**
- react-dnd provides clean drag-and-drop API for React
- Drop position calculation: `(event.clientX - trackOffsetX) / pixelsPerSecond`
- Clip should show media filename, not clip ID
- Auto-snap prevents overlaps (manual timeline arrangement is out of scope)

---

### PR 1.4.3: Clip Trim Handles & Interactive Trimming

**Goal:** Add adjustable trim handles to clip edges for start/end point trimming

**Tasks:**
- [ ] Read `src/renderer/components/TimelineClipView.tsx` to see clip rendering
- [ ] Update `src/renderer/components/TimelineClipView.tsx`:
  - Add state: `isDraggingStart`, `isDraggingEnd`
  - Render trim handles on left and right edges:
    - Small rectangular handles (10px wide, full clip height)
    - Different color from clip body (e.g., white/yellow)
    - Cursor changes to `ew-resize` on hover
  - Add mouse event handlers to handles:
    - `onMouseDown` on left handle - Start trim from left
    - `onMouseDown` on right handle - Start trim from right
  - Attach document-level `onMouseMove` and `onMouseUp` when dragging:
    - Calculate new trim points based on mouse X position
    - Update trim visual in real-time (controlled by local state)
    - On mouse up, call `EditAPI.trimClip(clipId, newTrimStart, newTrimEnd)`
  - Visual feedback during trim:
    - Semi-transparent overlay on trimmed portion
    - Show new duration while dragging
- [ ] Add validation in trim logic:
  - Cannot trim past start of media (trimStart >= 0)
  - Cannot trim past end of media (trimEnd <= mediaDuration)
  - Minimum clip duration 0.5 seconds (prevent invisible clips)
- [ ] Update `src/renderer/api/EditAPI.ts` `trimClip` method:
  - Validate trim values
  - Update clip.trimStart and clip.trimEnd in projectStore
  - Recalculate clip display duration
  - Update timeline layout if clip width changes
- [ ] Add visual indicators:
  - Show trim amount in tooltip (e.g., "-2.5s")
  - Dim trimmed portions of clip
  - Update clip width as trim changes

**What to Test:**
1. Add clip to timeline
2. Hover over left edge - verify cursor changes to resize
3. Drag left handle right - verify clip shrinks from start
4. Release mouse - verify trim is applied (clip stays trimmed)
5. Drag right handle left - verify clip shrinks from end
6. Try to trim beyond media bounds - verify it stops at limit
7. Try to make clip very small - verify minimum 0.5s enforced
8. Check projectStore - verify trimStart/trimEnd values updated
9. Refresh page - verify trim persists

**Files Changed:**
- `src/renderer/components/TimelineClipView.tsx` - Add trim handles and drag logic
- `src/renderer/api/EditAPI.ts` - Implement trim validation

**Notes:**
- Use controlled component pattern (local state + commit on mouse up)
- Trim handles should be easy to grab (10px wide minimum)
- Visual feedback is critical for trim UX (show what's being trimmed)
- Trim values are stored relative to original media, not absolute timeline position

---

### PR 1.4.4: Split Clip at Playhead & Delete Clip

**Goal:** Implement split and delete operations for timeline clips

**Tasks:**
- [ ] Read `src/renderer/components/TimelineClipView.tsx` to see current clip rendering
- [ ] Update `src/renderer/components/TimelineClipView.tsx`:
  - Add click handler to select clip (highlight with border)
  - Store selected clip ID in projectStore: `selectedClipId: string | null`
  - Add keyboard event listener:
    - Delete/Backspace key - Delete selected clip
    - Cmd+K / Ctrl+K - Split clip at playhead
  - Add context menu (right-click on clip):
    - "Split at Playhead" option
    - "Delete Clip" option
    - Show only when playhead is over the clip
- [ ] Update `src/renderer/api/EditAPI.ts` `splitClip` method:
  - Validate playhead is within clip bounds
  - Calculate split point relative to clip start
  - Create two new clips:
    - Clip A: original start → playhead (trim end at split point)
    - Clip B: playhead → original end (trim start at split point, adjust timeline startTime)
  - Remove original clip
  - Add two new clips to same track
  - Return new clip IDs
- [ ] Update `src/renderer/api/EditAPI.ts` `deleteClip` method:
  - Remove clip from track in projectStore
  - If other clips exist after deleted clip, optionally shift them left (auto-close gap)
  - Update selectedClipId to null
- [ ] Add UI feedback:
  - Selected clip has yellow/blue border
  - Show keyboard shortcut hints in header (Delete = delete, Cmd+K = split)
  - Flash animation when clip is split (brief highlight on new clips)
- [ ] Update `src/renderer/components/Timeline.tsx`:
  - Listen for keyboard events when timeline has focus
  - Focus timeline container when user clicks on it

**What to Test:**
1. Add clip to timeline and click it - verify it becomes selected (border appears)
2. Press Delete key - verify clip is removed from timeline
3. Add clip, position playhead in middle, press Cmd+K - verify clip splits into two
4. Verify each split clip has correct duration
5. Verify split clips are positioned correctly (no gap between them)
6. Play through split point - verify playback is seamless (test in later PR)
7. Right-click on clip - verify context menu appears
8. Right-click and select "Delete Clip" - verify clip is removed
9. Check projectStore - verify split creates 2 new clips and removes original

**Files Changed:**
- `src/renderer/components/TimelineClipView.tsx` - Add selection, keyboard, context menu
- `src/renderer/components/Timeline.tsx` - Handle timeline-level keyboard events
- `src/renderer/api/EditAPI.ts` - Implement splitClip and deleteClip logic
- `src/renderer/store/projectStore.ts` - Add selectedClipId state

**Notes:**
- Split creates two clips that together equal the original duration
- Trim points on split clips ensure they reference correct portions of media
- Delete can leave gaps in timeline (manual rearrange by dragging)
- Context menu can be simple browser native menu for demo
- Keyboard shortcuts improve editing speed (important for demo usability)

---

### PR 1.4.5: Playhead Scrubbing & Click-to-Seek

**Goal:** Make playhead interactive for seeking through timeline

**Tasks:**
- [ ] Read `src/renderer/components/Playhead.tsx` to see current rendering
- [ ] Update `src/renderer/components/Playhead.tsx`:
  - Add draggable handle at top of playhead (triangle or circle)
  - `onMouseDown` on handle - Start drag
  - Attach document `onMouseMove` while dragging:
    - Calculate new playhead position from mouse X
    - Update playheadPosition in projectStore in real-time
  - Attach document `onMouseUp` - End drag
  - Visual feedback: Change handle color while dragging
- [ ] Update `src/renderer/components/TimelineRuler.tsx`:
  - Add click handler on ruler
  - Calculate clicked position in seconds
  - Update playheadPosition to clicked position
  - This allows quick seeking by clicking on time ruler
- [ ] Update `src/renderer/components/Timeline.tsx`:
  - Add click handler on empty track space
  - Calculate clicked position in seconds
  - Update playheadPosition to clicked position
  - This allows seeking by clicking anywhere on timeline
- [ ] Add constraints:
  - Playhead cannot go before 0
  - Playhead cannot go beyond project duration
  - Snap playhead to clip boundaries if within 5px (optional, helps accuracy)
- [ ] Add visual feedback:
  - Show current time at playhead position (HH:MM:SS)
  - Highlight playhead during drag
  - Snap indicator when near clip boundary

**What to Test:**
1. Click and drag playhead handle - verify it moves smoothly
2. Release mouse - verify playhead stays at new position
3. Click on time ruler - verify playhead jumps to clicked position
4. Click on empty timeline space - verify playhead jumps there
5. Try to drag playhead before 0 - verify it stops at 0
6. Try to drag past project end - verify it stops at project duration
7. Drag playhead with multiple clips on timeline - verify it works correctly
8. Check projectStore - verify playheadPosition updates

**Files Changed:**
- `src/renderer/components/Playhead.tsx` - Add drag handlers
- `src/renderer/components/TimelineRuler.tsx` - Add click-to-seek
- `src/renderer/components/Timeline.tsx` - Add click-to-seek on tracks

**Notes:**
- Use same drag pattern as trim handles (document-level mouse move/up)
- Playhead position is in seconds (convert from pixels using zoom level)
- Smooth dragging is important for UX (update state frequently)
- Consider debouncing playhead updates if performance issues arise

---

## Phase 1.5: Video Preview & Playback

**Estimated Time:** 5-7 hours

Implement real-time video preview with play/pause controls and timeline synchronization.

### PR 1.5.1: Video Player Component & Single Clip Playback

**Goal:** Create video player that can play a single video file

**Tasks:**
- [ ] Read `src/renderer/components/Preview.tsx` to see current placeholder
- [ ] Update `src/renderer/components/Preview.tsx`:
  - Replace placeholder with HTML5 `<video>` element
  - Video element fills preview area (maintain aspect ratio)
  - Black background (letterboxing for non-16:9 videos)
  - Controls: Play/Pause button, current time display, duration display
  - Volume control slider (0-100%)
- [ ] Create NEW: `src/renderer/store/playerStore.ts` - Zustand store for player:
  - State:
    - `isPlaying: boolean`
    - `currentTime: number` (synchronized with video.currentTime)
    - `volume: number` (0-1)
    - `playbackRate: number` (1.0 = normal speed)
  - Actions:
    - `play()`, `pause()`, `seek(time)`, `setVolume(level)`, `setPlaybackRate(rate)`
- [ ] Implement video playback logic:
  - Load video file into <video> element using file:// URL
  - Play/pause button toggles playback
  - Update currentTime in playerStore every 100ms during playback
  - Sync playheadPosition with currentTime (update projectStore)
  - Handle video end (pause at end, reset to start option)
- [ ] Add playback controls:
  - Spacebar toggles play/pause
  - Left/Right arrow keys seek backward/forward 5 seconds
  - J/K/L keys for rewind/pause/fast-forward (common in video editors)
- [ ] Display time indicators:
  - Current time / Total duration (MM:SS / MM:SS format)
  - Update in real-time during playback

**What to Test:**
1. Import video and add to timeline (single clip)
2. Click play button - verify video plays in preview
3. Verify audio plays synchronized with video
4. Click pause - verify playback stops
5. Press spacebar - verify play/pause toggle works
6. Press left arrow - verify video seeks backward 5 seconds
7. Check playhead on timeline - verify it moves during playback
8. Let video play to end - verify it pauses automatically

**Files Changed:**
- `src/renderer/components/Preview.tsx` - Video player implementation
- NEW: `src/renderer/store/playerStore.ts` - Playback state management

**Notes:**
- Use requestAnimationFrame for smooth currentTime updates
- Video element must use local file paths (convert to file:// URLs)
- Electron security may require enabling file protocol in webPreferences
- Keyboard shortcuts should work when preview or timeline has focus

---

### PR 1.5.2: Multi-Clip Timeline Playback (Composition Rendering)

**Goal:** Implement seamless playback across multiple timeline clips

**Tasks:**
- [ ] Read `src/renderer/components/Preview.tsx` to understand single clip playback
- [ ] Read `src/renderer/store/projectStore.ts` to see timeline structure
- [ ] Create NEW: `src/renderer/services/TimelinePlayer.ts` - Timeline playback engine:
  - `constructor(project: Project)` - Initialize with project data
  - `async play(startTime: number)` - Start playback from time position
  - `pause()` - Pause playback
  - `seek(time: number)` - Jump to specific time
  - Internal logic:
    - Determine which clip should be playing at current playhead position
    - Load correct video file into hidden <video> elements (preload next clip)
    - Calculate playback offset within clip (accounting for trim points)
    - Switch between clips seamlessly when playhead crosses clip boundaries
    - Update playheadPosition continuously during playback
- [ ] Implement clip switching logic:
  - When playhead reaches end of clip, immediately switch to next clip
  - Preload next clip 1 second before transition (avoid loading delay)
  - Handle gaps in timeline (pause playback, or skip to next clip)
- [ ] Update `src/renderer/components/Preview.tsx`:
  - Initialize TimelinePlayer with current project
  - Play/pause buttons control TimelinePlayer instead of single <video>
  - Display composite view (only one clip visible at a time)
  - Handle case when playhead is in gap (show black frame or last frame)
- [ ] Add multi-track support (optional for MVP, required for picture-in-picture):
  - If both Track 0 and Track 1 have clips at playhead position, composite them
  - Track 1 overlays Track 0 (picture-in-picture positioning)
  - For MVP: Can simplify to "only play Track 0" and skip overlay logic
- [ ] Sync playback with timeline:
  - Update playheadPosition in projectStore during playback
  - When user scrubs playhead, seek TimelinePlayer to new position
  - Pause/resume playback based on playerStore.isPlaying

**What to Test:**
1. Add 3 clips to timeline (end-to-end, no gaps)
2. Press play - verify playback starts with first clip
3. Verify seamless transition from clip 1 to clip 2
4. Verify seamless transition from clip 2 to clip 3
5. Scrub playhead to middle of clip 2 - verify correct clip plays
6. Add gap between clips - verify playback behavior (pause or skip)
7. Verify playhead on timeline moves smoothly during playback
8. Pause in middle of clip 2, then resume - verify playback continues correctly

**Files Changed:**
- `src/renderer/components/Preview.tsx` - Use TimelinePlayer for playback
- NEW: `src/renderer/services/TimelinePlayer.ts` - Multi-clip playback engine

**Notes:**
- Seamless clip transitions are challenging - consider MediaSource API if needed
- Simpler approach: Small gap during transition is acceptable for demo
- Preloading is critical to avoid visible delays between clips
- For MVP, can skip multi-track compositing (only play Track 0)
- Use hidden video elements for preloading next clip

---

### PR 1.5.3: Playback Controls & Timeline Synchronization

**Goal:** Polish playback controls with speed controls, frame stepping, and full timeline synchronization

**Tasks:**
- [ ] Read `src/renderer/components/Preview.tsx` to see current controls
- [ ] Update `src/renderer/components/Preview.tsx`:
  - Add playback speed controls:
    - Dropdown or buttons for 0.25x, 0.5x, 1x, 1.5x, 2x speeds
    - Update playerStore.playbackRate
    - Apply to video element playbackRate property
  - Add frame stepping buttons:
    - Previous frame button (seek backward 1/30th second)
    - Next frame button (seek forward 1/30th second)
    - Useful for precise editing
  - Add visual playback state indicators:
    - Show "PLAYING" or "PAUSED" status
    - Show current playback speed (e.g., "2x")
- [ ] Improve timeline synchronization:
  - When playhead is scrubbed, pause playback and seek video
  - When clip is split during playback, pause automatically
  - When clip is deleted during playback, pause and adjust playhead
  - Ensure playerStore and projectStore stay in sync
- [ ] Add progress bar:
  - Thin progress bar below video showing playback progress
  - Clickable to seek (like YouTube player)
  - Visual representation of current position / total duration
- [ ] Implement loop mode (nice-to-have):
  - Checkbox to enable "Loop playback"
  - When enabled, restart from beginning after reaching end
  - Useful for reviewing edits
- [ ] Add keyboard shortcuts:
  - 0-9 keys seek to 0%, 10%, 20%, ... 90% of timeline
  - M key mutes/unmutes audio
  - Period (.) key steps forward one frame
  - Comma (,) key steps backward one frame

**What to Test:**
1. Click playback speed dropdown - select 2x - verify video plays faster
2. Select 0.5x speed - verify video plays slower
3. Click "Next Frame" button while paused - verify video advances 1 frame
4. Click "Previous Frame" button - verify video goes back 1 frame
5. Enable loop mode, let video play to end - verify it restarts
6. Press "5" key - verify playhead jumps to 50% of timeline
7. Press "M" key - verify audio mutes
8. Scrub playhead during playback - verify video seeks correctly
9. Split clip during playback - verify playback pauses

**Files Changed:**
- `src/renderer/components/Preview.tsx` - Add controls and keyboard shortcuts
- `src/renderer/store/playerStore.ts` - Add playbackRate, loop mode state
- `src/renderer/services/TimelinePlayer.ts` - Implement speed and frame stepping

**Notes:**
- Frame stepping assumes 30 fps (1/30 = 0.0333 seconds per frame)
- Playback speed uses native HTML5 video playbackRate API
- Loop mode is simple: on video end, seek to 0 and play again
- Keyboard shortcuts should have visual guide in UI (tooltip or help panel)

---

## Phase 1.6: Basic Export

**Estimated Time:** 4-5 hours

Implement export functionality to render timeline composition to MP4 file.

### PR 1.6.1: Export Configuration UI & File Dialog

**Goal:** Create export dialog with resolution options and file save picker

**Tasks:**
- [ ] Read `src/renderer/components/Header.tsx` to see toolbar
- [ ] Update `src/renderer/components/Header.tsx`:
  - Add "Export" button in toolbar
  - Button click opens export dialog modal
- [ ] Create NEW: `src/renderer/components/ExportDialog.tsx` - Export configuration modal:
  - Resolution options (radio buttons):
    - 720p (1280x720)
    - 1080p (1920x1080)
    - Source (original resolution, matches first clip)
  - Frame rate options (dropdown):
    - 24 fps, 30 fps, 60 fps
  - Video codec (fixed to H.264 for compatibility)
  - Audio codec (fixed to AAC)
  - Estimated file size display (rough calculation)
  - "Choose Export Location" button (opens file save dialog)
  - "Start Export" button (starts export process)
  - "Cancel" button (closes dialog)
- [ ] Add IPC handler for file save dialog:
  - Update `src/main/ipc/handlers.ts`:
    - `handle('select-save-location')` - Opens save dialog, returns selected path
    - Default filename: `ClipForge_Export_[timestamp].mp4`
    - Filter to .mp4 extension only
- [ ] Add export state to store:
  - Create NEW: `src/renderer/store/exportStore.ts` - Zustand export state:
    - State: `isExporting: boolean`, `exportProgress: number`, `exportError: string | null`
    - Actions: `startExport(config)`, `updateProgress(percent)`, `completeExport()`, `cancelExport()`
- [ ] Validate export configuration:
  - Ensure at least one clip on timeline before allowing export
  - Validate selected save path exists
  - Alert if export would overwrite existing file

**What to Test:**
1. Click "Export" button in header - verify dialog opens
2. Verify resolution options are displayed
3. Click "Choose Export Location" - verify save dialog opens
4. Select location and filename - verify path displays in dialog
5. Try to export with empty timeline - verify error/alert
6. Click "Cancel" - verify dialog closes without exporting
7. Verify estimated file size updates when changing resolution

**Files Changed:**
- `src/renderer/components/Header.tsx` - Add Export button
- NEW: `src/renderer/components/ExportDialog.tsx` - Export configuration UI
- NEW: `src/renderer/store/exportStore.ts` - Export state management
- `src/main/ipc/handlers.ts` - Add save file dialog handler

**Notes:**
- Keep resolution options simple (3 choices is enough)
- File size estimation: rough calculation based on bitrate (5 Mbps for 1080p)
- Source resolution matches first clip (don't upscale/downscale)
- Export validation prevents empty or invalid exports

---

### PR 1.6.2: FFmpeg Export Engine & Progress Tracking

**Goal:** Implement video export using FFmpeg with real-time progress updates

**Tasks:**
- [ ] Read `src/main/services/VideoProcessor.ts` to see existing FFmpeg methods
- [ ] Update `src/main/services/VideoProcessor.ts`:
  - Add method `async exportTimeline(timeline, outputPath, config)`:
    - Parameter `timeline`: Project data with clips and trim points
    - Parameter `config`: Resolution, framerate, codec settings
    - For each clip:
      - Generate FFmpeg trim command based on clip.trimStart/trimEnd
      - Create temporary trimmed file
    - Use FFmpeg concat filter to stitch all trimmed clips
    - Apply scaling if resolution differs from source
    - Encode final MP4 with H.264/AAC
    - Return output file path
  - Add progress tracking:
    - Parse FFmpeg output for progress percentage
    - Send progress updates via IPC every second
    - Calculate time remaining based on encoding speed
- [ ] Create NEW: `src/main/services/ExportService.ts` - Export orchestration:
  - `async startExport(project, config, outputPath)` - Main export function:
    - Validate project has clips
    - Create temporary directory for intermediate files
    - Call VideoProcessor.exportTimeline()
    - Handle errors (cleanup temp files, send error to renderer)
    - Send completion notification to renderer
  - `cancelExport()` - Kill FFmpeg process and cleanup
- [ ] Add IPC handlers for export:
  - Update `src/main/ipc/handlers.ts`:
    - `handle('start-export', { project, config, outputPath })` - Start export
    - `handle('cancel-export')` - Cancel in-progress export
  - Add IPC event emitters:
    - `send('export-progress', { percent, timeRemaining })` - Progress updates
    - `send('export-complete', { outputPath })` - Export finished
    - `send('export-error', { message })` - Export failed
- [ ] Update `src/renderer/components/ExportDialog.tsx`:
  - Listen for export progress events
  - Update progress bar (0-100%)
  - Display time remaining (e.g., "2 minutes remaining")
  - Handle completion (close dialog, show success message)
  - Handle errors (display error, allow retry)
  - Add cancel button (calls cancel-export handler)

**What to Test:**
1. Add multiple clips to timeline with trims
2. Open export dialog, configure resolution to 1080p, select save location
3. Click "Start Export" - verify export begins
4. Verify progress bar updates in real-time
5. Verify time remaining estimate displays
6. Let export complete - verify success message appears
7. Open exported file in VLC/QuickTime - verify it plays correctly
8. Verify exported video includes all clips in correct order
9. Verify trim points are respected (trimmed portions not in export)
10. Try canceling export mid-process - verify FFmpeg stops and temp files cleaned
11. Try exporting 10+ minute timeline - verify it completes without crashes

**Files Changed:**
- `src/main/services/VideoProcessor.ts` - Add exportTimeline method
- NEW: `src/main/services/ExportService.ts` - Export orchestration
- `src/main/ipc/handlers.ts` - Add export IPC handlers
- `src/renderer/components/ExportDialog.tsx` - Progress UI and event handling

**Notes:**
- Use FFmpeg concat demuxer for stitching clips (more reliable than filter)
- Create temp files in system temp directory (OS will clean up eventually)
- Progress calculation: Parse FFmpeg "time=" output and compare to total duration
- Cancel should kill FFmpeg child process and delete incomplete output file
- Test with various clip combinations (different resolutions, different codecs)
- Export should handle single clip, multiple clips, clips with gaps

---

### PR 1.6.3: Export Validation & Error Handling

**Goal:** Add robust error handling and post-export validation

**Tasks:**
- [ ] Read `src/main/services/ExportService.ts` to see export logic
- [ ] Update `src/main/services/ExportService.ts`:
  - Pre-export validation:
    - Check all media files still exist at their paths
    - Verify sufficient disk space for export (estimate based on duration/bitrate)
    - Validate output path is writable
    - Check FFmpeg is available and functioning
  - Add detailed error handling:
    - Catch FFmpeg errors (parse stderr output)
    - Handle missing source files gracefully
    - Handle disk full errors
    - Handle permission errors on output path
    - Return specific error messages for each failure type
  - Post-export validation:
    - Verify output file exists and has size > 0
    - Use FFprobe to verify output file is valid video
    - Check duration matches expected (within 1 second tolerance)
    - If validation fails, delete invalid output and report error
- [ ] Update `src/renderer/components/ExportDialog.tsx`:
  - Display user-friendly error messages:
    - "Source file not found: [filename]"
    - "Not enough disk space. Need [X] GB free."
    - "Export failed. Check console for details."
  - Add "View Details" button for errors (shows full error message)
  - Add "Open Export" button on success (opens Finder/Explorer to file)
  - Add "Export Another" button after completion (resets dialog)
- [ ] Add export logging:
  - Log all export operations to console with timestamps
  - Log FFmpeg commands being executed
  - Log progress milestones (10%, 25%, 50%, 75%, 100%)
  - Save export log to file for debugging (optional)
- [ ] Create NEW: `src/renderer/utils/exportValidation.ts` - Client-side validation:
  - `validateExportConfig(config)` - Check config is valid
  - `validateTimeline(project)` - Check timeline is exportable
  - `estimateExportSize(project, config)` - Calculate expected file size
  - Return validation errors before starting export

**What to Test:**
1. Delete a media file, try to export - verify error message
2. Select output path on full/read-only disk - verify error (if possible to simulate)
3. Export with empty timeline - verify validation prevents export
4. Export successfully - verify "Open Export" button works
5. Click "Open Export" - verify file opens in Finder/default video player
6. Export and kill FFmpeg process externally - verify error handling
7. Check console logs - verify detailed export information is logged
8. Export multiple times - verify no temp file buildup

**Files Changed:**
- `src/main/services/ExportService.ts` - Add validation and error handling
- `src/renderer/components/ExportDialog.tsx` - Improve error UI
- NEW: `src/renderer/utils/exportValidation.ts` - Client validation helpers

**Notes:**
- Disk space check: Use Node.js fs.statfs or check-disk-space package
- Open file location: Use shell.showItemInFolder() from Electron
- Validation should be fast (don't slow down export start)
- Detailed logging helps debug export issues during development
- Consider adding "Retry" button for failed exports

---

## Phase 1.7: Recording Features

**Estimated Time:** 4-5 hours

Implement screen and webcam recording capabilities to capture content directly in the app.

### PR 1.7.1: Screen Recording with desktopCapturer

**Goal:** Enable screen and window recording using Electron's desktopCapturer API

**Tasks:**
- [ ] Read `src/renderer/components/Header.tsx` to see toolbar
- [ ] Create NEW: `src/renderer/components/RecordDialog.tsx` - Recording configuration modal:
  - Screen/window selection:
    - List available screens and windows (from desktopCapturer)
    - Thumbnail preview for each source
    - Radio button to select source
  - Recording options:
    - Include system audio checkbox (optional feature)
    - Show recording indicator (red dot in menu bar)
  - "Start Recording" button
  - "Cancel" button
- [ ] Create NEW: `src/renderer/services/ScreenRecorder.ts` - Screen recording service:
  - `async getAvailableSources()` - Get screens/windows from desktopCapturer:
    - Returns array of { id, name, thumbnail } objects
    - Include both screen and window types
  - `async startRecording(sourceId, options)`:
    - Get media stream from desktopCapturer for selected source
    - Create MediaRecorder instance with video/audio tracks
    - Set codec to VP8 or H.264 (browser support)
    - Store chunks in memory as recording progresses
    - Return recording ID
  - `stopRecording()`:
    - Stop MediaRecorder
    - Combine chunks into Blob
    - Save Blob to file in user's Videos directory
    - Return file path
  - Track recording state: `isRecording`, `recordingDuration`
- [ ] Update `src/renderer/components/Header.tsx`:
  - Add "Record Screen" button
  - Button opens RecordDialog
  - Show recording indicator when recording (red dot + timer)
- [ ] Handle macOS permissions:
  - Add screen recording permission to Electron app entitlements
  - Detect when permission denied and show instruction dialog
  - Guide user to System Preferences > Security & Privacy > Screen Recording
- [ ] Auto-import recorded video:
  - After recording stops, automatically import file to media library
  - Add to media library with thumbnail

**What to Test:**
1. Click "Record Screen" button - verify dialog opens
2. Verify list of available screens/windows appears
3. Select a screen, click "Start Recording" - verify recording begins
4. Verify recording indicator appears (red dot + timer)
5. Perform actions on screen for 10 seconds
6. Click stop recording - verify file is saved
7. Verify recorded video automatically appears in media library
8. Play recorded video - verify screen content was captured correctly
9. Test on macOS without screen recording permission - verify permission prompt

**Files Changed:**
- `src/renderer/components/Header.tsx` - Add Record Screen button
- NEW: `src/renderer/components/RecordDialog.tsx` - Recording UI
- NEW: `src/renderer/services/ScreenRecorder.ts` - Recording logic

**Notes:**
- desktopCapturer requires specific Electron security settings
- May need to enable `enableRemoteModule` or use IPC for security
- Save recordings to ~/Videos/ClipForge/ directory
- Recording timer shows elapsed time (MM:SS format)
- System audio capture may not work on all systems (optional feature)

---

### PR 1.7.2: Webcam Recording & Picture-in-Picture

**Goal:** Add webcam recording capability with optional simultaneous screen + webcam recording

**Tasks:**
- [ ] Read `src/renderer/services/ScreenRecorder.ts` to understand recording structure
- [ ] Create NEW: `src/renderer/services/WebcamRecorder.ts` - Webcam recording service:
  - `async getAvailableCameras()` - Enumerate video input devices:
    - Use `navigator.mediaDevices.enumerateDevices()`
    - Filter to videoinput kind
    - Return array of { id, label }
  - `async startRecording(cameraId, options)`:
    - Get media stream from getUserMedia for selected camera
    - Create MediaRecorder with video track (and audio if included)
    - Store chunks, save to file on stop
    - Return recording ID
  - `stopRecording()` - Same as screen recorder
  - `getPreviewStream(cameraId)` - Get stream for preview (before recording)
- [ ] Update `src/renderer/components/RecordDialog.tsx`:
  - Add tab/toggle for "Screen" vs "Webcam" vs "Screen + Webcam"
  - Webcam tab:
    - Camera selection dropdown
    - Live preview of selected camera
    - Include microphone audio checkbox
  - Screen + Webcam tab:
    - Select screen source
    - Select camera
    - Picture-in-picture position selector (corner placement)
    - Size slider for webcam overlay (small/medium/large)
- [ ] Implement combined recording:
  - Create NEW: `src/renderer/services/CombinedRecorder.ts`:
    - `async startRecording(screenSourceId, cameraId, pipConfig)`:
      - Get both screen and webcam streams
      - Use Canvas API to composite streams:
        - Draw screen feed as background
        - Draw webcam feed in selected corner with selected size
        - Overlay has border/shadow for visibility
      - Create MediaRecorder from canvas stream
      - Record composite output
- [ ] Handle camera permissions:
  - Request camera permission on first use
  - Show permission denied error if user blocks
  - Test on macOS (camera permission required)

**What to Test:**
1. Click "Record Webcam" - verify camera selection appears
2. Select camera - verify live preview shows webcam feed
3. Click "Start Recording" - verify recording begins
4. Record for 10 seconds speaking to camera
5. Stop recording - verify file is saved and auto-imported
6. Play recorded webcam video - verify video and audio are captured
7. Select "Screen + Webcam" mode
8. Select screen source and camera
9. Choose bottom-right corner for picture-in-picture
10. Start recording - verify composite video shows screen with webcam overlay
11. Stop and play - verify both screen and webcam are in final video
12. Test without camera permission - verify permission prompt

**Files Changed:**
- `src/renderer/components/RecordDialog.tsx` - Add webcam and combined modes
- NEW: `src/renderer/services/WebcamRecorder.ts` - Webcam recording
- NEW: `src/renderer/services/CombinedRecorder.ts` - Screen + webcam composite

**Notes:**
- Canvas compositing is CPU-intensive, may drop frames on low-end machines
- Picture-in-picture corner positions: top-left, top-right, bottom-left, bottom-right
- Webcam overlay should be 15-25% of screen width for visibility
- Add circular mask to webcam overlay for polish (optional)
- For demo, can simplify to two separate recordings if composite is complex

---

## Completion Checklist

Mark each phase complete when all PRs are finished and tested:

- [ ] Phase 1.1: Application Foundation (3 PRs)
- [ ] Phase 1.2: Media Import & Management (3 PRs)
- [ ] Phase 1.3: Project Management (2 PRs)
- [ ] Phase 1.4: Timeline Editor (5 PRs)
- [ ] Phase 1.5: Video Preview & Playback (3 PRs)
- [ ] Phase 1.6: Basic Export (3 PRs)
- [ ] Phase 1.7: Recording Features (2 PRs)

**Total: 21 PRs across 7 phases**

---

## MVP Acceptance Criteria

Before considering Phase 1 complete, verify these user journeys work end-to-end:

1. **Import and Edit Journey**:
   - [ ] Import 2+ video files via drag-and-drop
   - [ ] Drag clips onto timeline in sequence
   - [ ] Trim start/end of clips using handles
   - [ ] Split one clip in the middle
   - [ ] Delete unwanted clip
   - [ ] Preview timeline with playback
   - [ ] Export to MP4 at 1080p

2. **Record and Edit Journey**:
   - [ ] Record screen for 30 seconds
   - [ ] Record webcam for 15 seconds
   - [ ] Both recordings auto-import to media library
   - [ ] Arrange both on timeline
   - [ ] Trim and edit as needed
   - [ ] Export final video

3. **Combined Recording Journey**:
   - [ ] Record screen + webcam simultaneously (picture-in-picture)
   - [ ] Recording auto-imports
   - [ ] Add to timeline and export

4. **Performance & Stability**:
   - [ ] App launches in < 5 seconds
   - [ ] Timeline handles 10+ clips without lag
   - [ ] Export completes for 10+ minute video without crash
   - [ ] No memory leaks during 15+ minute editing session

---

## Notes for AI Agent

- **Demo Mode**: This is a 72-hour challenge. Prioritize working features over perfect code.
- **Testing**: Manual testing only. No unit test suite required.
- **UI Polish**: Functional > Beautiful. Inline styles acceptable.
- **Error Handling**: Console.log + user alerts are sufficient.
- **Edge Cases**: Skip unless explicitly listed (e.g., no undo/redo unless mentioned).
- **Dependencies**: Install packages as needed, prefer lightweight options.
- **File Organization**: Keep structure flat if it speeds development.

**Phase 1 Deadline: Tuesday 10/28 at 10:59 PM CT**

Good luck! 🚀
