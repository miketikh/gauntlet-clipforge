# ClipForge - Product Requirements Document

## Project Overview

**ClipForge** is an AI-powered desktop video editing application built with Electron and React. The application enables content creators to perform standard video editing tasks while leveraging AI to automate tedious processes like filler word removal, audio quality analysis, and content optimization.

**Target Users:** Content creators, YouTubers, podcasters, and video editors who want to streamline their editing workflow with intelligent automation.

**Timeline:**
- MVP Checkpoint: 24 hours
- Final Version: 48 hours (2 days total)

---

## Core Features

### Basic Video Editing (Required for MVP)
1. **Import & Media Management**
   - Import video files (MP4, MOV, AVI)
   - Import audio files (MP3, WAV)
   - Import images (JPG, PNG)
   - Media library/bin for organizing assets

2. **Video Playback & Preview**
   - Video player with play/pause/seek controls
   - Timeline scrubbing
   - Preview window

3. **Timeline Editing**
   - Drag-and-drop video clips to timeline
   - Basic trim/cut functionality
   - Split clips at playhead
   - Delete segments

4. **Export**
   - Export to MP4 format
   - Resolution options (720p, 1080p)
   - Basic quality presets

### Standard Effects (Post-MVP)
- Transitions (fade, cut)
- Basic text overlays
- Audio volume adjustment
- Simple color filters

---

## AI-Powered Features

### Phase 2: Basic AI Integration

**1. Audio Transcription**
- Extract audio from video using FFmpeg
- Send audio to OpenAI Whisper API for transcription
- Return timestamped transcript
- Display transcript in UI with timestamp sync to video

**2. Filler Word Removal**
- Identify filler words ("um", "ah", "like", "you know") from transcript
- Provide UI to select which filler words to remove
- Automatically cut video segments based on timestamps
- Preview before applying changes

**3. Silence Removal**
- Detect silence segments in audio (configurable threshold)
- Show silence segments on timeline
- Batch remove or selectively remove silence
- Configurable minimum silence duration

### Phase 3: Advanced AI Features

**4. Audio Prosody Analysis**
- Analyze pitch variation, volume, and speech rate
- Generate "energy graph" showing engagement levels
- Detect monotone segments
- Provide actionable suggestions:
  - "Re-record segment X with more vocal variety"
  - "Add dramatic pause at timestamp Y"
  - "Emphasize word Z with higher pitch"
- Visual heatmap overlay on timeline (green = engaging, red = monotone)

**5. Content Analyzer**
- Analyze transcript for content appropriateness
- Check against user profile/preferences
- Flag potentially problematic content
- Suggest edits or warnings before publishing
- Customizable content filters

**6. AI Music Selector**
- Analyze video content and transcript for mood/tone
- Suggest background music from predefined playlist
- Match music energy to video pacing
- Auto-duck music volume when speech detected
- One-click apply with fade in/out

---

## Development Phases

### Phase 1: Core Electron App (MVP Foundation)
**Goal:** Functional video editor with basic features

**Features to Build:**
- Electron app setup with React frontend
- Video player component
- Timeline UI (basic)
- Import video files
- Trim/cut functionality using FFmpeg
- Export to MP4
- Media management/library

**Key Deliverables:**
- Working video import/export pipeline
- Basic timeline editing
- FFmpeg integration for video processing
- Functional UI for video playback and trimming

---

### Phase 2: Basic AI Integration
**Goal:** Add transcription and automated editing based on audio analysis

**Features to Build:**
- Audio extraction from video
- OpenAI Whisper API integration
- Transcript display with timestamp sync
- Filler word detection and removal
- Silence detection and removal
- API backend for AI communication
- Loading states and progress indicators

**Key Deliverables:**
- Transcription service working end-to-end
- Automated filler word cutting
- Silence removal functionality
- AI service abstraction layer

---

### Phase 3: Advanced AI Features
**Goal:** Intelligent analysis and suggestions to improve content quality

**Features to Build:**
- Audio prosody analysis (pitch, volume, speech rate)
- Monotone detection with visual indicators
- Content analysis for appropriateness
- AI-powered music selection
- Suggestion engine UI
- Energy graph visualization

**Key Deliverables:**
- Audio analysis pipeline with librosa
- Visual feedback system (heatmaps, warnings)
- Music recommendation engine
- Comprehensive AI suggestions panel

---

## Technical Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Electron Main Process                 │
│                                                           │
│  ├─ FFmpeg Integration (video/audio processing)         │
│  ├─ File System Access                                   │
│  ├─ API Communication Layer                              │
│  └─ IPC Bridge (main ↔ renderer)                        │
└─────────────────────────────────────────────────────────┘
                           ↕
┌─────────────────────────────────────────────────────────┐
│              Electron Renderer Process (React)           │
│                                                           │
│  ├─ Video Player UI                                      │
│  ├─ Timeline Component                                   │
│  ├─ Media Library                                        │
│  ├─ Transcript Viewer                                    │
│  ├─ AI Suggestions Panel                                 │
│  └─ Export Controls                                      │
└─────────────────────────────────────────────────────────┘
                           ↕
┌─────────────────────────────────────────────────────────┐
│                    Backend Services                       │
│                                                           │
│  ├─ OpenAI Whisper API (transcription)                  │
│  ├─ OpenAI GPT API (content analysis, suggestions)      │
│  ├─ Audio Analysis Service (librosa - local)            │
│  └─ FFmpeg (video/audio manipulation - local)           │
└─────────────────────────────────────────────────────────┘
```

### Communication Flow

**1. Video Processing Pipeline:**
```
User imports video → Main process handles file
                  ↓
Extract audio with FFmpeg (main process)
                  ↓
Send audio to Whisper API → Get timestamped transcript
                  ↓
Display in renderer process ← IPC communication
```

**2. AI Analysis Pipeline:**
```
Transcript + Audio file → Audio Analysis Service (Python/librosa)
                       ↓
Extract prosody features (pitch, volume, tempo)
                       ↓
Send features + transcript → OpenAI API
                       ↓
Get structured suggestions → Display in UI
```

**3. Editing Operations:**
```
User selects operation (remove filler, trim silence)
                  ↓
Send cut points to main process
                  ↓
FFmpeg processes video with timestamps
                  ↓
Generate new video → Update preview
```

---

## Tech Stack & Libraries

### Core Framework
- **Electron** - Desktop application framework
- **React** - Frontend UI framework
- **TypeScript** - Type-safe development

### Video/Audio Processing
- **FFmpeg** (system install) - Video/audio manipulation
  - Alternative: `fluent-ffmpeg` npm wrapper
- **librosa** (Python) - Audio analysis and prosody extraction
  - Bridge via child_process or create a local Python service
- **wavesurfer.js** - Audio waveform visualization

### UI Components
- **video.js** or **react-player** - Video playback component
- **react-beautiful-dnd** - Drag-and-drop for timeline
- **fabric.js** - Canvas for text overlays (future)
- **recharts** or **visx** - Charts for energy graph visualization

### AI Services
- **OpenAI API**
  - Whisper API for transcription
  - GPT-4 for content analysis and suggestions
- Alternative: **Anthropic Claude API** for analysis

### State Management
- **Zustand** or **Redux Toolkit** - Global state management
- **React Query** - API call management and caching

### Storage & Persistence
- **electron-store** - Settings and user preferences
- **IndexedDB** or **SQLite** - Project metadata storage

### Development Tools
- **Electron Forge** or **electron-builder** - Build and packaging
- **Vite** - Fast development server and build tool
- **ESLint + Prettier** - Code quality

---

## API Design

### Main Process APIs (IPC)

```typescript
// Video Operations
ipcMain.handle('video:import', (event, filePath) => Promise<VideoMetadata>)
ipcMain.handle('video:extract-audio', (event, videoPath) => Promise<string>)
ipcMain.handle('video:trim', (event, videoPath, startTime, endTime) => Promise<string>)
ipcMain.handle('video:remove-segments', (event, videoPath, segments[]) => Promise<string>)
ipcMain.handle('video:export', (event, projectData, exportSettings) => Promise<string>)

// AI Operations
ipcMain.handle('ai:transcribe', (event, audioPath) => Promise<Transcript>)
ipcMain.handle('ai:analyze-audio', (event, audioPath) => Promise<AudioAnalysis>)
ipcMain.handle('ai:analyze-content', (event, transcript) => Promise<ContentAnalysis>)
ipcMain.handle('ai:suggest-music', (event, transcript, mood) => Promise<MusicSuggestion[]>)
```

### Data Structures

```typescript
interface Transcript {
  segments: Array<{
    text: string;
    start: number; // seconds
    end: number;
    confidence: number;
  }>;
  fillerWords: Array<{
    word: string;
    timestamp: number;
    duration: number;
  }>;
}

interface AudioAnalysis {
  energyGraph: number[]; // Energy level over time
  monotoneSegments: Array<{
    start: number;
    end: number;
    pitchVariance: number;
    suggestions: string[];
  }>;
  overallScore: number; // 0-10
  speechRate: number; // words per minute
}

interface ContentAnalysis {
  appropriatenessScore: number;
  flags: Array<{
    timestamp: number;
    severity: 'warning' | 'error';
    message: string;
  }>;
  suggestions: string[];
}

interface MusicSuggestion {
  trackId: string;
  trackName: string;
  mood: string;
  confidence: number;
  reasoning: string;
}
```

---

## Advanced Features (Future Considerations)

### Potential Phase 4+ Features
- **Viral Moment Detector**: Identify potentially viral-worthy clips
- **Auto-Captioning**: Burn subtitles into video with styling
- **Style Cloner**: Match editing style of reference videos
- **Multi-track Audio**: Support multiple audio layers
- **Advanced Color Grading**: LUT support and color wheels
- **Plugins/Extensions**: Allow community plugins

### Technical Debt to Address
- Optimize FFmpeg operations for speed
- Implement project save/load functionality
- Add undo/redo system
- Error handling and recovery
- Progress indicators for long operations
- Batch processing support

---

## Success Metrics (Demo Goals)

### MVP Success Criteria
- [ ] Import and play video successfully
- [ ] Perform basic trim operation
- [ ] Export edited video
- [ ] Generate transcript from video
- [ ] Remove filler words automatically

### Final Version Success Criteria
- [ ] All Phase 2 features working
- [ ] Audio analysis with visual feedback
- [ ] Content analyzer providing suggestions
- [ ] Music selection working
- [ ] Polished, crash-free demo
- [ ] Impressive "wow" moment for judges

---

## Development Notes

### Critical Path Items
1. **FFmpeg Setup**: Must be configured early as it's core to all operations
2. **IPC Architecture**: Design communication layer before building features
3. **Error Handling**: Video operations can fail in many ways - plan for it
4. **Performance**: Large video files need streaming/chunking strategies
5. **API Rate Limits**: OpenAI API has rate limits - implement queuing

### Known Challenges
- **FFmpeg Learning Curve**: Complex command-line tool, requires documentation
- **Electron Main/Renderer Split**: Need clear boundaries for what runs where
- **AI API Costs**: Transcription and analysis can get expensive - monitor usage
- **Python Integration**: If using librosa, need to bridge Python ↔ JavaScript
- **Large File Handling**: Videos are big - need progress indicators and cancellation

### Recommended Development Order
1. Basic Electron + React setup
2. Video import and playback
3. FFmpeg integration for simple operations
4. Timeline UI (can be basic at first)
5. Transcription API integration
6. Filler word removal
7. Audio analysis
8. Advanced AI features
9. Polish and demo prep

---

## Resources & Documentation

### Essential Documentation
- [Electron Docs](https://www.electronjs.org/docs)
- [FFmpeg Documentation](https://ffmpeg.org/documentation.html)
- [OpenAI Whisper API](https://platform.openai.com/docs/guides/speech-to-text)
- [librosa Documentation](https://librosa.org/doc/latest/index.html)

### Helpful Tutorials
- Electron IPC communication patterns
- FFmpeg video editing commands
- React video player integration
- Audio feature extraction with librosa

---

## Appendix: FFmpeg Commands Reference

```bash
# Extract audio from video
ffmpeg -i input.mp4 -vn -acodec pcm_s16le -ar 16000 output.wav

# Cut video segment
ffmpeg -i input.mp4 -ss 00:00:10 -to 00:00:20 -c copy output.mp4

# Remove multiple segments (complex filter)
ffmpeg -i input.mp4 -filter_complex \
  "[0:v]trim=0:10,setpts=PTS-STARTPTS[v1]; \
   [0:v]trim=15:30,setpts=PTS-STARTPTS[v2]; \
   [v1][v2]concat=n=2:v=1:a=0[outv]" \
  -map "[outv]" output.mp4

# Add background music with ducking
ffmpeg -i video.mp4 -i music.mp3 -filter_complex \
  "[1:a]volume=0.3[music];[0:a][music]amix=inputs=2:duration=first" \
  output.mp4
```