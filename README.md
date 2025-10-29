# ClipForge

**AI-Powered Desktop Video Editor**

ClipForge is a modern desktop video editor built with Electron, React, and TypeScript. It combines traditional video editing capabilities with AI-powered automation to streamline content creation workflows.

## 🎯 Project Overview

ClipForge uses AI to eliminate tedious editing work - automatically removing filler words, detecting silence, and transcribing content so creators can focus on quality rather than mechanical editing.

**Target Users:** Content creators, YouTubers, and podcasters who want to streamline their editing workflow.

## ✨ Features

### ✅ Implemented

**Core Video Editor:**
- ✅ Desktop application with native macOS support
- ✅ Import video files (MP4, MOV, WebM) via drag-and-drop or file picker
- ✅ Media library with thumbnails and metadata
- ✅ Multi-track timeline editor with visual waveforms
- ✅ Real-time video preview with synchronized playback
- ✅ Timeline editing: trim, split, delete, reorder clips
- ✅ Drag clips from media library to timeline
- ✅ Keyboard shortcuts (Space: play/pause, Delete: remove clip, Cmd+K: split)
- ✅ Screen recording with source selection (full screen or specific windows)
- ✅ Recording timer and visual indicators
- ✅ And more, with cool AI features on the horizon!

## 🛠️ Tech Stack

- **Desktop Framework:** Electron with Electron Forge
- **Frontend:** React 19 + TypeScript
- **Build Tool:** Vite (separate configs for main, preload, and renderer)
- **Video Processing:** FFmpeg
- **State Management:** Zustand
- **Icons:** Lucide React
- **Styling:** Inline styles with CSS gradients

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- FFmpeg installed on your system
  - macOS: `brew install ffmpeg`
  - Windows: Download from [ffmpeg.org](https://ffmpeg.org/download.html)
  - Linux: `sudo apt-get install ffmpeg`

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd videojarvis
```

2. Install dependencies:
```bash
npm install
```

### Running in Development

Start the Electron app in development mode:

```bash
npm start
```

This launches the app with hot-reload enabled. Changes to renderer code will automatically refresh.

**Note:** The correct command is `npm start` (which runs `electron-forge start`). There is no `npm run dev` script.

### Other Development Commands

```bash
npm run lint          # Run ESLint
```

## 📦 Building the Application

### Create a Distributable App

To build and package the app for distribution:

```bash
npm run make
```

This creates platform-specific distributables in the `out/` directory:
- **macOS:** `.app` bundle and/or `.dmg` installer
- **Windows:** `.exe` installer (if building on Windows)
- **Linux:** AppImage or Debian package (if building on Linux)

The built application can be found in `out/make/`.

### Package Without Creating Installers

If you just want to package the app without creating installers:

```bash
npm run package
```

Output will be in `out/<platform>-<arch>/`.

## 🎮 How to Use

1. **Create a Project:** Click "New Project" to start
2. **Import Media:**
   - Drag and drop video files into the Media Library
   - Or click "Import" to select files
3. **Edit on Timeline:**
   - Drag clips from Media Library onto the Timeline
   - Trim clips by dragging edges
   - Split clips with Cmd+K at playhead position
   - Delete clips with Delete/Backspace
4. **Preview:** Use the video player to preview your edits
   - Spacebar: Play/Pause
   - Click timeline to scrub
   - Arrow keys: Seek ±5 seconds
5. **Record Screen:**
   - Click "Record" button
   - Select screen or window to record
   - Click "Start Recording"
   - Recording is saved automatically
6. **Save Project:** Projects auto-save, or manually save with Cmd+S
7. **Export:** (Coming soon) Export your final video as MP4

## 📁 Project Structure

```
src/
├── main/                    # Electron main process
│   ├── index.ts            # Main process entry point
│   ├── ipc/                # IPC handlers
│   └── services/           # Recording, media services
├── renderer/               # React renderer process
│   ├── components/         # UI components
│   ├── store/              # Zustand state management
│   ├── services/           # MediaRecorder, TimelinePlayer
│   ├── utils/              # Timeline calculations, IPC wrappers
│   └── styles/             # Global styles, z-index scale
├── types/                  # TypeScript type definitions
└── preload.ts             # Preload script (IPC bridge)
```

## 🎯 Roadmap

### Core Features (Completed)
- [x] Desktop app launches
- [x] Video import and media library
- [x] Timeline editor with multi-track support
- [x] Video preview and playback
- [x] Basic editing operations (trim, split, delete)
- [x] Screen recording
- [x] Project save/load

### Coming Soon
- [ ] Export functionality
- [ ] Import recordings to media library
- [ ] Webcam recording
- [ ] Simultaneous screen + webcam (PiP)
- [ ] AI transcription integration
- [ ] Filler word removal
- [ ] Silence detection and removal

## 🐛 Known Issues

- Recordings currently save to temp directory but don't auto-import to media library
- Export functionality not yet implemented
- Webcam recording not yet available
- AI features pending implementation

## 📝 Development Notes

**Key Architecture Decisions:**
- Vite config files use `.mjs` extension when importing ESM-only packages
- This prevents Electron Forge's esbuild from struggling with ESM in `.ts` configs
- Non-destructive editing: original files are never modified, all edits stored as metadata

## 🤝 Contributing

See `Tasks/` directory for detailed implementation tasks and progress tracking. Contributions are welcome!

## 📄 License

[Add your license here]

## 🙏 Acknowledgments

Built with:
- [Electron](https://www.electronjs.org/)
- [React](https://react.dev/)
- [FFmpeg](https://ffmpeg.org/)
- [Lucide Icons](https://lucide.dev/)
- [Zustand](https://github.com/pmndrs/zustand)
