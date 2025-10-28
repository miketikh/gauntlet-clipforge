# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**ClipForge** is a desktop video editor built in 72 hours as a challenge project. The goal is to create a production-grade video editor with screen recording, webcam capture, timeline editing, and export capabilities before October 30th, 2025.

**Tech Stack:**
- **Desktop Framework:** Electron with Electron Forge
- **Build Tool:** Vite (with separate configs for main, preload, and renderer)
- **Frontend:** React 19 + TypeScript
- **Media Processing:** FFmpeg (to be integrated)

**Project Deadline:** MVP due Tuesday 10/28 at 10:59 PM CT

## Development Commands

### Running the Application
```bash
npm start                    # Start development server (NOT npm run dev)
```

The correct command is `npm start` which runs `electron-forge start`. There is **no** `npm run dev` script defined.

### Other Commands
```bash
npm run lint                 # Run ESLint
npm run package              # Package the app for distribution
npm run make                 # Create platform-specific distributables
```

## Architecture

### Electron Forge + Vite Setup

This project uses **Electron Forge** with the **Vite plugin**. Key architectural points:

1. **Three Separate Build Targets:**
   - **Main Process** (`src/main.ts`) - Electron's main process, handles app lifecycle
   - **Preload Script** (`src/preload.ts`) - Security bridge between main and renderer
   - **Renderer Process** (`src/renderer/`) - React UI running in browser window

2. **Vite Configuration Files:**
   - `vite.main.config.mjs` - Main process build config
   - `vite.preload.config.mjs` - Preload script build config
   - `vite.renderer.config.mjs` - Renderer (React) build config with React plugin
   - `forge.config.ts` - Electron Forge orchestration config

3. **Critical: Use `.mjs` Extension for Vite Configs**
   - Vite configs MUST use `.mjs` extension when importing ESM-only packages like `@vitejs/plugin-react`
   - Electron Forge's esbuild struggles with ESM in `.ts` configs
   - This is documented in `Docs/development_rules.md`

### Application Structure

```
src/
├── main.ts                          # Electron main process entry point
├── preload.ts                       # IPC bridge (currently empty)
├── renderer.ts                      # Renderer entry (legacy, may be unused)
└── renderer/
    ├── index.tsx                    # React mount point
    ├── App.tsx                      # Root component
    ├── components/
    │   ├── Layout.tsx              # CSS Grid layout container
    │   ├── Header.tsx              # Top toolbar
    │   ├── MediaLibrary.tsx        # Left sidebar for media
    │   ├── Preview.tsx             # Center video preview
    │   └── Timeline.tsx            # Bottom timeline editor
    └── styles/
        └── global.css              # Global dark theme styles
```

### Main Process Configuration

- **Window Size:** Fixed at 1280x720 (ClipForge dimensions)
- **Context Isolation:** Disabled initially for easier IPC (`contextIsolation: false`)
- **DevTools:** Auto-opens in development mode
- **Hot Reload:** Vite HMR works automatically when editing renderer code

### Component Architecture

The app uses a **4-panel layout** implemented with CSS Grid:
- **Header** (top, 60px height) - Toolbar with Import/Record/Export buttons
- **MediaLibrary** (left, 250px width) - Imported media files list
- **Preview** (center-top) - Video preview player
- **Timeline** (bottom, 200px height) - Timeline editor with tracks

## Critical Rules

### 1. Never Assume - Always Verify
- DO NOT guess paths, emulator states, or system configuration
- Always check actual file locations before operating on them
- Verify dependencies are installed before importing them

### 2. Use Documentation First
When encountering errors:
1. Use Brave MCP to search latest documentation
2. If still failing, use Context7 for library-specific docs
3. Understand root cause before applying fixes
4. Don't iterate blindly ("fixing line by line")

See `Docs/development_rules.md` for detailed lessons learned during initial setup.

### 3. Tool Usage Hierarchy
1. Use MCP tools when available (Brave, Context7, etc.)
2. Use built-in Claude Code tools (Read, Write, Edit, Grep, Glob)
3. Use Bash commands ONLY as last resort

### 4. File Extension Rules
- **Vite configs with ESM imports:** Must use `.mjs` extension
- **Forge config:** Can use `.ts` (no ESM imports)
- **React components:** Use `.tsx`
- **Utilities:** Use `.ts`

## Task Management

Implementation tasks are tracked in `Tasks/phase_1_core_editor.md`. This file contains:
- 21 PRs across 7 phases
- Detailed task checklists for each PR
- Testing requirements
- File change documentation

**Current Status:** PR 1.1.2 (Basic UI Layout Shell) - Next to implement

## Testing Strategy

This is a **72-hour demo project**, so testing approach differs from production:
- Manual testing only (no unit test suite required)
- Focus on "What to Test" sections in task document
- Verify features work, not edge cases
- Console.log + user alerts acceptable for errors

## Project Context Documents

- `Docs/product_overview.md` - Full project requirements and context
- `Docs/development_rules.md` - Critical lessons and gotchas
- `Docs/product_prd.md` - Product requirements (if exists)
- `Docs/product_discussion.md` - Design discussions (if exists)
- `Tasks/phase_1_core_editor.md` - Implementation task breakdown
- `Tasks/phase_2_recording.md` - Recording features (Phase 2)
- `Tasks/phase_3_ai_features.md` - AI integration (Phase 3)

## Development Philosophy

**This is a 72-hour challenge project.** Priorities:
1. Working features > Perfect architecture
2. Ship fast > Polish
3. Core functionality > Edge cases
4. Manual testing > Automated tests
5. Inline styles acceptable if faster
6. Console errors acceptable for debugging

**MVP Gate (Tuesday 10:59 PM CT):**
- Desktop app launches ✓
- Video import (drag & drop or file picker)
- Timeline view with clips
- Video preview player
- Basic trim functionality
- Export to MP4
- Packaged as native app (not just dev mode)

## Year Context

The current year is **2025**. When searching for documentation or libraries, always search for the latest 2025 versions.
