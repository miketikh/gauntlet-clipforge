# ClipForge - Product Requirements Document

## Executive Summary

**ClipForge** is an AI-powered desktop video editor built to demonstrate the power of intelligent automation in video editing workflows. This is a **72-hour demo application** designed to showcase core video editing capabilities enhanced by AI features like transcription, filler word removal, and audio quality analysis.

**Key Differentiator:** Unlike traditional video editors, ClipForge uses AI to automate tedious editing tasks, allowing creators to focus on content quality rather than mechanical cutting and trimming.

**Target Users:** Content creators, YouTubers, podcasters who want to streamline their editing workflow with intelligent automation.

**Project Timeline:**
- MVP Checkpoint: Tuesday, October 28th at 10:59 PM CT
- Final Submission: Wednesday, October 29th at 10:59 PM CT
- Total Development Time: ~72 hours

**Important Note:** This is a proof-of-concept demo application, not a production-ready product. Focus is on demonstrating working functionality and AI capabilities, not handling every edge case or production-level polish. The goal is to show what's possible, not to build the next CapCut.

---

## Goals & Success Criteria

### Primary Goals
1. **Demonstrate AI-powered editing** - Show how AI can eliminate manual, tedious editing work
2. **Functional core editor** - Prove that a desktop video editor can be built rapidly with modern tools
3. **Impressive demo** - Create "wow moments" that showcase the vision

### MVP Success Criteria (Tuesday 10:59 PM CT)
- ✅ Desktop app launches and runs stably
- ✅ Import video files (MP4/MOV) via drag-drop or file picker
- ✅ Visual timeline showing imported clips with audio waveforms
- ✅ Video preview player with play/pause/scrub controls
- ✅ Basic trim functionality (set in/out points)
- ✅ Export to MP4
- ✅ Project save/load functionality
- ✅ Packaged as native app (not just dev mode)

### Final Success Criteria (Wednesday 10:59 PM CT)
- ✅ All MVP features working reliably
- ✅ Audio transcription integrated
- ✅ Filler word removal working
- ✅ Silence detection and removal
- ✅ Screen + webcam recording
- ✅ Multi-track timeline (at least 2 tracks)
- ✅ Polished UI that doesn't crash during demo
- ✅ Clear "AI advantage" demonstrated

---

## Non-Goals & Scope Limitations

**Explicitly Out of Scope:**
- Production-level performance optimization
- Comprehensive error handling for every edge case
- Support for exotic video formats
- Advanced color grading or professional effects
- Plugin architecture or extensibility
- Cloud sync or collaboration features
- Mobile app versions
- Extensive testing on multiple OS versions

**Focus Areas:**
- Core video editing workflows work correctly
- AI features demonstrate value
- Demo is impressive and stable for presentation
- Code is understandable for rapid iteration

---

## User Personas

### Primary Persona: "Alex the Content Creator"
- Creates YouTube videos and podcasts
- Spends 4-6 hours editing a 15-minute video
- Most time spent: removing filler words, cutting silence, fixing audio
- **Pain Point:** Repetitive, manual editing tasks
- **Goal:** Cut editing time in half with automation

---

## Feature Requirements

### Phase 1: Core Editor (MVP - Due Tuesday 10:59 PM)

#### 1.1 Application Foundation
**Desktop Framework Setup**
- Electron + React application
- TypeScript for type safety
- Proper main/renderer process architecture
- IPC communication layer established

**Deliverable:** Working desktop app that launches

---

#### 1.2 Media Import & Management
**Import Capabilities**
- Drag-and-drop video files (MP4, MOV, WebM)
- File picker dialog for import
- Support for basic video codecs (H.264, H.265)

**Media Library Panel**
- Display imported clips as thumbnails
- Show basic metadata: filename, duration, resolution
- Simple list/grid view of imported media

**Technical Notes:**
- Use Electron's dialog API for file picker
- Extract thumbnails using FFmpeg
- Store media references in project state (don't copy files unnecessarily)

**Edge Cases to Ignore for Demo:**
- Corrupted video files
- Exotic codecs that FFmpeg can't handle
- Files larger than 2GB (focus on typical screen recordings)

**Deliverable:** Users can import videos and see them in a media library

---

#### 1.3 Project Management (Non-Destructive Editing)
**Project Save/Load**
- Save project as `.clipforge` JSON file
- Store references to original media files (paths)
- Save timeline state, cuts, edits (edit decision list)
- Recent projects list in UI

**Non-Destructive Architecture**
- **Original files are NEVER modified**
- All edits stored as instructions/metadata
- Export creates new file based on edit instructions
- Users can undo/redo changes freely

**Project File Structure:**
```json
{
  "version": "1.0",
  "projectName": "My Video",
  "mediaAssets": [
    {
      "id": "clip-1",
      "path": "/path/to/original.mp4",
      "duration": 120.5,
      "metadata": { ... }
    }
  ],
  "timeline": {
    "tracks": [ ... ],
    "edits": [ ... ]
  }
}
```

**Auto-Save**
- Auto-save project every 60 seconds
- Store in temp location for crash recovery
- Simple strategy: overwrite auto-save on interval

**Technical Notes:**
- Use electron-store for recent projects list
- Store project files as JSON (easy to debug)
- On export, FFmpeg reads edit instructions and processes video

**Edge Cases to Ignore:**
- Missing original files when opening project (just show error)
- Complex undo/redo tree structures (linear undo history is fine)
- Concurrent edits or conflict resolution

**Deliverable:** Users can save their work, close app, reopen project later

---

#### 1.4 Timeline Editor

**Core Timeline UI**
- Visual timeline with time ruler (showing timecode: MM:SS)
- Playhead (current time indicator) synced with preview
- At least 2 tracks: main video track + overlay/PiP track
- Horizontal scrollbar for navigating long timelines
- Zoom controls (in/out) for precision editing

**Audio Waveform Visualization**
- Display audio waveform for each clip on timeline
- Visual representation helps identify speech, silence, loud moments
- Waveform synced to video position

**Clip Manipulation**
- Drag clips from media library onto timeline
- Reorder clips by dragging
- Trim clips by dragging edges (adjust in/out points)
- Split clip at playhead position
- Delete clips (backspace/delete key)

**Snap Behavior**
- Clips snap to playhead position
- Clips snap to other clip edges (magnetic behavior - optional stretch goal)

**Timeline Controls**
- Play/pause (spacebar)
- Scrub by dragging playhead
- Click anywhere on timeline to jump playhead
- Frame-by-frame navigation (arrow keys) - stretch goal

**Technical Notes:**
- Consider canvas-based timeline for performance (Konva.js, Fabric.js)
- Alternative: DOM-based with CSS transforms (easier but may be slower)
- Waveform generation: Use Web Audio API or FFmpeg to extract PCM data
- Store timeline state in project file

**Edge Cases to Ignore:**
- Timeline with 100+ clips (optimize for ~10 clips)
- Sub-frame accuracy (frame-accurate is fine)
- Complex track routing or grouping

**Deliverable:** Functional timeline where users can arrange, trim, and edit clips visually

---

#### 1.5 Video Preview & Playback

**Preview Window**
- Real-time video player showing timeline composition
- Synced with playhead position
- Play/pause controls
- Audio playback synchronized with video

**Playback Controls**
- Play/pause button and spacebar shortcut
- Seek to any position by clicking timeline
- Volume control
- Current time display (MM:SS / MM:SS format)

**Technical Notes:**
- Use HTML5 `<video>` element or video.js
- For multi-clip preview: may need to dynamically load clip at current playhead position
- Real-time composition of all effects is **not required** - preview can be simplified
- Preview quality can be lower than export quality (proxy concept)

**Edge Cases to Ignore:**
- Perfect synchronization across multiple tracks (best effort is fine)
- Smooth playback with heavy effects applied
- Preview during export

**Deliverable:** Users can watch their timeline composition play back

---

#### 1.6 Basic Export

**Export Functionality**
- Export timeline composition to MP4 file
- Resolution options: 720p, 1080p, or source resolution
- Progress bar showing export progress
- Use FFmpeg to stitch clips, apply cuts, render final video

**Export Settings Panel (Basic)**
- Output filename/location picker
- Resolution dropdown
- Simple "Export" button

**Technical Notes:**
- FFmpeg command generation based on timeline edit list
- Run FFmpeg in main process, report progress via IPC
- Cancel export option (stretch goal)

**Edge Cases to Ignore:**
- Advanced codec settings
- Hardware acceleration options
- Export queuing for multiple projects
- Export presets for different platforms (stretch goal)

**Deliverable:** Users can export their edited video as MP4

---

### Phase 2: Recording Features (MVP - Due Tuesday 10:59 PM)

#### 2.1 Screen Recording
**Capabilities**
- Record full screen or specific window
- Use Electron's `desktopCapturer` API to list sources
- Capture system audio (optional - nice to have)
- Save recording directly to media library

**UI Flow**
- "Record Screen" button
- Source selection dialog (list screens/windows)
- Recording indicator (red dot, timer)
- Stop recording → clip auto-added to timeline

**Technical Notes:**
- Use `navigator.mediaDevices.getUserMedia()` with desktopCapturer source
- Record to WebM, convert to MP4 with FFmpeg if needed
- Store recording in temp folder, move to project folder on save

---

#### 2.2 Webcam Recording
**Capabilities**
- Access system webcam via `getUserMedia()`
- Record webcam video + audio
- Save to media library

**UI Flow**
- "Record Webcam" button
- Preview window showing webcam feed
- Record/stop controls
- Clip auto-added to timeline

---

#### 2.3 Simultaneous Screen + Webcam (Picture-in-Picture)
**Capabilities**
- Record screen and webcam simultaneously
- Create two separate tracks on timeline
- Webcam appears as overlay (PiP style)

**Implementation**
- Record both streams separately
- Add screen recording to main track
- Add webcam to overlay track
- User can resize/reposition webcam overlay (stretch goal: just place it in corner)

**Edge Cases to Ignore:**
- Advanced PiP controls (rotation, borders, shadows)
- Real-time preview during recording
- Recording longer than 1 hour

**Deliverable:** Users can record screen, webcam, or both, and clips appear in timeline

---

### Phase 3: AI Features (Final - Due Wednesday 10:59 PM)

#### 3.1 Audio Transcription

**Functionality**
- Extract audio from video using FFmpeg
- Send audio to OpenAI Whisper API
- Return timestamped transcript
- Display transcript in dedicated panel

**UI Components**
- "Generate Transcript" button on imported clips
- Transcript panel showing timestamped text
- Transcript segments clickable to jump to timestamp
- Loading indicator while transcription in progress

**Data Structure**
```typescript
interface Transcript {
  segments: Array<{
    text: string;
    start: number; // seconds
    end: number;
    confidence: number;
  }>;
}
```

**Technical Notes**
- Audio extraction: `ffmpeg -i video.mp4 -vn -acodec pcm_s16le output.wav`
- Whisper API: `/v1/audio/transcriptions` endpoint
- Handle API rate limits and errors gracefully
- Cache transcripts in project file

**Edge Cases to Ignore:**
- Multi-language support
- Speaker diarization (who said what)
- Re-transcribing after edits

**Deliverable:** Users can generate transcripts from their videos

---

#### 3.2 Filler Word Removal

**Functionality**
- Analyze transcript for common filler words: "um", "uh", "like", "you know", "so"
- Highlight filler words in transcript panel
- Allow users to select which filler words to remove
- Automatically cut video segments at filler word timestamps
- Preview changes before applying

**UI Components**
- Filler word detection results panel
- Checkboxes to select which instances to remove
- "Remove Selected" button
- Visual indicators on timeline showing cut points

**Technical Flow**
```
1. User clicks "Find Filler Words"
2. Analyze transcript for patterns
3. Show results: "Found 23 instances of 'um', 15 of 'like'"
4. User reviews, selects which to remove
5. Click "Apply" → FFmpeg cuts video at timestamps
6. Timeline updates with new cuts
```

**Technical Notes**
- Simple regex/keyword matching for filler words
- Generate FFmpeg filter command to remove segments
- Non-destructive: store cut points in edit list, don't modify original

**Edge Cases to Ignore:**
- False positives (e.g., "like" used meaningfully)
- Filler words cut off mid-sentence awkwardly
- Adjusting cut timing for natural flow

**Deliverable:** Users can automatically remove filler words with AI assistance

---

#### 3.3 Silence Removal

**Functionality**
- Detect silence segments in audio (configurable threshold)
- Show silence segments on timeline with visual indicators
- Batch remove all silence or selectively remove
- Configurable minimum silence duration (e.g., ignore pauses < 0.5s)

**UI Components**
- "Detect Silence" button
- Settings: silence threshold (dB), minimum duration
- Silence segments highlighted on timeline
- "Remove All Silence" or individual removal

**Technical Notes**
- Use FFmpeg `silencedetect` filter to find silent segments
- Command: `ffmpeg -i input.mp4 -af silencedetect=noise=-30dB:d=0.5 -f null -`
- Parse output to get silence timestamps
- Generate cut commands similar to filler word removal

**Edge Cases to Ignore:**
- Preserving natural pauses for pacing
- Silence between different speakers
- Audio that's just very quiet but not silent

**Deliverable:** Users can automatically trim silent portions of videos

---

#### 3.4 Audio Prosody Analysis (Stretch Goal - If Time Permits)

**Functionality**
- Analyze audio for pitch variation, volume, speech rate
- Generate "energy graph" showing engagement levels over time
- Detect monotone segments
- Provide suggestions: "This segment sounds flat - consider re-recording"

**UI Components**
- Energy graph overlay on timeline (green = engaging, yellow = okay, red = monotone)
- Suggestions panel with specific timestamps
- Visual heatmap

**Technical Notes**
- Requires Python + librosa for audio feature extraction
- Bridge to Python via child_process or local service
- Extract: pitch, volume, zero-crossing rate, spectral centroid
- Use simple heuristics to score "energy" (high variance = engaging)

**Edge Cases to Ignore:**
- Accurate prosody modeling (use simple heuristics)
- Different content types (podcast vs. tutorial)

**Deliverable:** Visual feedback on audio quality with actionable suggestions

---

## Technical Architecture

### High-Level System Design

```
┌─────────────────────────────────────────────────┐
│           Electron Main Process                  │
│                                                   │
│  ├─ FFmpeg Integration (video processing)       │
│  ├─ File System Access                           │
│  ├─ OpenAI API Client (transcription)           │
│  ├─ Recording Service (desktopCapturer)         │
│  ├─ Project Manager (save/load)                 │
│  └─ IPC Handlers (communicate with renderer)    │
└─────────────────────────────────────────────────┘
                        ↕ IPC
┌─────────────────────────────────────────────────┐
│         Electron Renderer Process (React)        │
│                                                   │
│  ├─ Media Library Component                     │
│  ├─ Timeline Component (canvas-based)           │
│  ├─ Video Preview Component                     │
│  ├─ Transcript Panel                             │
│  ├─ AI Controls (filler words, silence)         │
│  ├─ Export Panel                                 │
│  └─ Project UI (save/load, recent projects)     │
└─────────────────────────────────────────────────┘
                        ↕
┌─────────────────────────────────────────────────┐
│              External Services                    │
│                                                   │
│  ├─ OpenAI Whisper API (transcription)          │
│  ├─ FFmpeg (local binary) (video processing)    │
│  └─ [Optional] Python + librosa (prosody)       │
└─────────────────────────────────────────────────┘
```

### Communication Patterns

#### Video Processing Pipeline
```
User imports video
    ↓
Main process: Store file reference
    ↓
Extract metadata (duration, resolution) via FFmpeg
    ↓
Generate thumbnail
    ↓
Send metadata to renderer → Display in media library
```

#### AI Transcription Pipeline
```
User clicks "Generate Transcript"
    ↓
Renderer → IPC → Main process
    ↓
Extract audio from video (FFmpeg)
    ↓
Send audio file to OpenAI Whisper API
    ↓
Parse response → Structured transcript
    ↓
IPC → Renderer → Display in transcript panel
```

#### Export Pipeline
```
User clicks "Export"
    ↓
Renderer sends timeline edit list to main process
    ↓
Main process generates FFmpeg command
    ↓
FFmpeg processes: stitch clips, apply cuts, encode
    ↓
Report progress via IPC → Update progress bar
    ↓
Export complete → Open file location
```

---

## Tech Stack

### Core Framework
- **Electron** - Desktop application framework (chose over Tauri for maturity and npm ecosystem)
- **React** - Frontend UI (fast development with component libraries)
- **TypeScript** - Type safety and better developer experience
- **Vite** - Fast build tool and dev server

### Video/Audio Processing
- **FFmpeg** (system install or bundled binary) - Core video manipulation
- **fluent-ffmpeg** (npm) - Node.js wrapper for FFmpeg
- **Web Audio API** - Waveform visualization

### UI Libraries
- **Shadcn/UI** or **Chakra UI** - Component library for rapid UI development
- **Konva.js** or **Fabric.js** - Canvas library for timeline (if canvas-based)
- **react-player** - Video playback component
- **Lucide React** - Icon library

### State Management
- **Zustand** - Lightweight state management (simpler than Redux for rapid dev)
- **React Query** - API call management (for OpenAI calls)

### AI Services
- **OpenAI API** - Whisper for transcription
- (Optional) **GPT-4** for content analysis in Phase 4

### Storage
- **electron-store** - Settings and recent projects
- **JSON files** - Project save format (simple, debuggable)

### Development Tools
- **Electron Forge** - Build and packaging
- **ESLint + Prettier** - Code quality

---

## Implementation Phases & Timeline

### Day 1 (Monday): MVP Foundation
**Hours 1-8: Setup & Basic Import/Preview**
- Electron + React + Vite setup
- Basic UI layout (media library, timeline placeholder, preview)
- Video import (drag-drop, file picker)
- Video playback in preview window
- FFmpeg integration working

**Hours 9-16: Timeline Basics**
- Timeline UI rendering
- Display imported clips on timeline
- Playhead and scrubbing
- Basic play/pause functionality

**Hours 17-24: Project Management**
- Project save/load implementation
- Non-destructive edit structure
- Recent projects list

---

### Day 2 (Tuesday): Complete MVP
**Hours 25-32: Timeline Editing**
- Drag clips to timeline
- Trim clips (adjust in/out points)
- Split clips at playhead
- Audio waveform visualization

**Hours 33-40: Recording Features**
- Screen recording implementation
- Webcam recording
- Save recordings to media library

**Hours 41-48: Export & Polish**
- Export functionality working
- Progress indicators
- Test all MVP features
- Bug fixes
- **MVP CHECKPOINT DUE: 10:59 PM CT**

---

### Day 3 (Wednesday): AI Features & Final Polish
**Hours 49-56: AI Transcription**
- Audio extraction pipeline
- OpenAI Whisper integration
- Transcript display UI
- Error handling for API calls

**Hours 57-64: AI Editing Features**
- Filler word detection and removal
- Silence detection and removal
- Timeline updates after AI edits
- Preview changes

**Hours 65-72: Demo Prep**
- End-to-end testing
- Bug fixes
- UI polish
- Demo video recording
- Documentation
- **FINAL SUBMISSION DUE: 10:59 PM CT**

---

## API Design

### IPC Handlers (Main Process)

```typescript
// Media Operations
ipcMain.handle('media:import', async (event, filePath: string) => Promise<MediaMetadata>)
ipcMain.handle('media:generate-thumbnail', async (event, filePath: string) => Promise<string>)
ipcMain.handle('media:extract-audio', async (event, videoPath: string) => Promise<string>)

// Project Operations
ipcMain.handle('project:save', async (event, projectData: ProjectFile) => Promise<void>)
ipcMain.handle('project:load', async (event, projectPath: string) => Promise<ProjectFile>)
ipcMain.handle('project:get-recent', async () => Promise<RecentProject[]>)

// Timeline Operations
ipcMain.handle('timeline:trim-clip', async (event, params: TrimParams) => Promise<void>)
ipcMain.handle('timeline:split-clip', async (event, params: SplitParams) => Promise<void>)

// Recording Operations
ipcMain.handle('recording:start-screen', async (event, sourceId: string) => Promise<string>)
ipcMain.handle('recording:start-webcam', async () => Promise<string>)
ipcMain.handle('recording:stop', async (event, recordingId: string) => Promise<string>)

// AI Operations
ipcMain.handle('ai:transcribe', async (event, audioPath: string) => Promise<Transcript>)
ipcMain.handle('ai:detect-filler-words', async (event, transcript: Transcript) => Promise<FillerWord[]>)
ipcMain.handle('ai:detect-silence', async (event, audioPath: string, settings: SilenceSettings) => Promise<SilenceSegment[]>)

// Export Operations
ipcMain.handle('export:video', async (event, params: ExportParams) => Promise<void>)
// Progress updates sent via: webContents.send('export:progress', { percent: 45 })
```

### Data Structures

```typescript
interface ProjectFile {
  version: string;
  projectName: string;
  createdAt: string;
  modifiedAt: string;
  mediaAssets: MediaAsset[];
  timeline: Timeline;
  transcripts: Record<string, Transcript>; // keyed by asset ID
}

interface MediaAsset {
  id: string;
  name: string;
  path: string;
  type: 'video' | 'audio' | 'image';
  duration: number;
  resolution: { width: number; height: number };
  thumbnailPath: string;
}

interface Timeline {
  duration: number;
  tracks: Track[];
}

interface Track {
  id: string;
  type: 'video' | 'audio' | 'overlay';
  clips: TimelineClip[];
}

interface TimelineClip {
  id: string;
  assetId: string; // references MediaAsset
  startTime: number; // position on timeline
  duration: number;
  trimStart: number; // trim from original clip
  trimEnd: number;
  effects?: Effect[]; // future: filters, transitions
}

interface Transcript {
  segments: TranscriptSegment[];
  fillerWords?: FillerWord[];
}

interface TranscriptSegment {
  text: string;
  start: number; // seconds
  end: number;
  confidence: number;
}

interface FillerWord {
  word: string;
  timestamp: number;
  duration: number;
  segmentIndex: number;
}

interface SilenceSegment {
  start: number;
  end: number;
  duration: number;
}

interface ExportParams {
  projectData: ProjectFile;
  outputPath: string;
  resolution: '720p' | '1080p' | 'source';
  quality: 'high' | 'medium' | 'low';
}
```

---

## Stretch Goals (If Time Permits)

### Timeline Enhancements
- Ripple edit mode (auto-close gaps)
- Magnetic timeline (snap to edges)
- Multiple track support (3+ tracks)
- Track lock/mute controls
- Markers and bookmarks

### Video Effects
- Speed control (0.5x, 2x, reverse)
- Crop and rotate
- Transitions (fade, dissolve)
- Text overlays with basic styling

### Export Enhancements
- Platform presets (YouTube 1080p, Instagram Story 9:16)
- Hardware acceleration toggle
- Export queue for multiple videos

### UI/UX Polish
- Keyboard shortcuts (save, undo, play/pause, split)
- Tooltips and onboarding hints
- Drag-and-drop reordering on timeline
- Timeline minimap for long projects

### Canvas & Aspect Ratio
- Project canvas settings (16:9, 9:16, 1:1, 4:5)
- Background color/blur when video doesn't fill canvas
- Multiple canvas presets

### Advanced AI Features
- Audio prosody analysis with energy graph
- Content appropriateness analyzer
- AI-suggested music selection
- Auto-caption generation with burn-in

---

## Development Guidelines

### Prioritization Strategy
1. **Critical Path First:** Focus on import → timeline → export pipeline before adding features
2. **Vertical Slices:** Build one complete feature end-to-end before starting another
3. **AI Features Last:** Get core editor working before adding AI (AI is impressive but editor must function)
4. **Test Early:** Test export with real videos early to catch FFmpeg issues

### When to Skip Edge Cases
- **File Handling:** Don't handle every codec or corrupted files
- **Performance:** Optimize for ~10 clips on timeline, not 100
- **Error Recovery:** Show error messages, don't build retry logic for everything
- **UI Polish:** Functional > Beautiful (but should still be presentable)

### What to Test Thoroughly
- **Export Pipeline:** Must work reliably for demo
- **Recording:** Must not crash or lose data
- **Project Save/Load:** Losing user work is catastrophic
- **AI Transcription:** API calls must handle errors gracefully

### Demo Preparation
- Prepare sample videos for demo (screen recordings, webcam clips)
- Test complete workflow: import → edit → transcribe → remove fillers → export
- Have backup plan if OpenAI API is slow during demo
- Record demo video showing all features

---

## Known Challenges & Mitigation

### Challenge 1: FFmpeg Complexity
**Risk:** FFmpeg commands are complex and error-prone
**Mitigation:**
- Use fluent-ffmpeg wrapper for simpler API
- Test commands in terminal first before integrating
- Keep commands simple (avoid complex filters if possible)
- Refer to appendix for common commands

### Challenge 2: Electron Main/Renderer Communication
**Risk:** Async IPC can be confusing, especially for video processing
**Mitigation:**
- Design clear IPC API upfront
- Use TypeScript for type safety across IPC boundary
- Test IPC handlers independently

### Challenge 3: OpenAI API Rate Limits & Costs
**Risk:** Transcription API has rate limits and costs money
**Mitigation:**
- Cache transcripts in project file
- Implement retry logic with exponential backoff
- Monitor API usage during development
- Use shorter test videos during development

### Challenge 4: Large Video Files
**Risk:** Loading large files into memory can crash app
**Mitigation:**
- Don't load entire video into memory
- Use file paths and stream processing
- Test with typical screen recording sizes (50-500MB)
- Not required to handle 4K 60fps footage

### Challenge 5: Timeline Performance
**Risk:** DOM-based timeline may be slow with many clips
**Mitigation:**
- Consider canvas-based rendering (Konva.js)
- Virtualize timeline (only render visible portion)
- Optimize for demo scenarios (5-10 clips)

---

## Success Metrics (Demo Evaluation)

### Functional Completeness (40%)
- All MVP features working
- AI features demonstrably functional
- Export produces viewable video

### AI Differentiation (30%)
- Clear "wow" moment showing AI value
- Filler word removal working smoothly
- Transcription accurate and useful

### Polish & Stability (20%)
- UI is presentable and intuitive
- No crashes during demo
- Reasonable performance

### Technical Implementation (10%)
- Clean architecture
- Proper Electron/React patterns
- FFmpeg integration robust

---

## Appendix: FFmpeg Commands Reference

### Extract Audio from Video
```bash
ffmpeg -i input.mp4 -vn -acodec pcm_s16le -ar 16000 output.wav
```

### Trim Video (Non-Reencoding - Fast)
```bash
ffmpeg -i input.mp4 -ss 00:00:10 -to 00:00:20 -c copy output.mp4
```

### Trim Video (Reencoding - Accurate)
```bash
ffmpeg -i input.mp4 -ss 00:00:10 -to 00:00:20 output.mp4
```

### Concatenate Multiple Clips
```bash
# Create concat list file
echo "file 'clip1.mp4'" > concat.txt
echo "file 'clip2.mp4'" >> concat.txt

# Concatenate
ffmpeg -f concat -safe 0 -i concat.txt -c copy output.mp4
```

### Remove Multiple Segments (Complex Filter)
```bash
ffmpeg -i input.mp4 -filter_complex \
  "[0:v]trim=0:10,setpts=PTS-STARTPTS[v1]; \
   [0:v]trim=15:30,setpts=PTS-STARTPTS[v2]; \
   [v1][v2]concat=n=2:v=1:a=0[outv]" \
  -map "[outv]" output.mp4
```

### Detect Silence
```bash
ffmpeg -i input.mp4 -af silencedetect=noise=-30dB:d=0.5 -f null - 2>&1 | grep silence
```

### Generate Thumbnail
```bash
ffmpeg -i input.mp4 -ss 00:00:05 -vframes 1 thumbnail.jpg
```

### Get Video Metadata
```bash
ffprobe -v quiet -print_format json -show_format -show_streams input.mp4
```

---

## Resources

### Essential Documentation
- [Electron Documentation](https://www.electronjs.org/docs/latest/)
- [Electron IPC Guide](https://www.electronjs.org/docs/latest/tutorial/ipc)
- [FFmpeg Documentation](https://ffmpeg.org/documentation.html)
- [OpenAI Whisper API](https://platform.openai.com/docs/guides/speech-to-text)
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)

### Helpful Libraries
- [fluent-ffmpeg](https://github.com/fluent-ffmpeg/node-fluent-ffmpeg)
- [electron-store](https://github.com/sindresorhus/electron-store)
- [Konva.js](https://konvajs.org/) (Canvas library)
- [Zustand](https://github.com/pmndrs/zustand) (State management)

---

## Conclusion

ClipForge is an ambitious 72-hour project that combines desktop app development, video processing, and AI integration. Success requires ruthless prioritization: build a functional video editor first, then add AI features that showcase intelligent automation.

The core value proposition is simple: **AI eliminates tedious editing work.** Every feature should support this vision. A simple, working demo that removes filler words automatically is more impressive than a feature-rich editor that crashes.

Focus on the critical path: **Import → Edit → Export** must work flawlessly. Everything else is enhancement.

Remember: **This is a demo, not a product.** Ship working software that demonstrates the vision, not production-ready software that handles every edge case.
