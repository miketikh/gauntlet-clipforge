# Project Management - Implementation Tasks

## Context

ClipForge currently has a basic project structure with `projectStore` and `mediaStore` using Zustand with localStorage persistence. The stores handle timeline state, media files, and playhead position. However, the UI only has a "Reset Project" button in the Header component - there's no way to save projects to disk, load existing projects, or switch between multiple projects.

**Current State:**
- `projectStore.ts` manages timeline composition with tracks, clips, and edit commands
- `mediaStore.ts` manages imported media files
- Both stores use `zustand/persist` middleware for localStorage auto-save
- Data model supports non-destructive editing (media references, not copies)
- No file-based project save/load functionality
- No project switching UI
- No crash recovery mechanism

**Goal:**
Add a comprehensive project management system that allows users to save projects to `.clipforge` JSON files, load existing projects, switch between recent projects, and recover from crashes. Replace the "Reset Project" button with proper project lifecycle management.

**Key Requirements:**
- Non-destructive editing maintained (projects store file paths, not media copies)
- Project files saved as human-readable JSON (`.clipforge` extension)
- IPC handlers for native file dialogs (save/open)
- Auto-save mechanism for crash recovery
- Visual indicators for unsaved changes
- Recent projects list with quick access
- Project name editing capability

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
- Manual testing only (no comprehensive unit tests)
- Focus on core functionality first, polish later

---

## Phase 4: Project Management System

**Estimated Time:** 6-8 hours

Add complete project management capabilities including file-based save/load, project switching UI, auto-save, and crash recovery.

### PR 4.1: Core Save/Load with IPC Handlers

**Goal:** Implement backend IPC handlers for saving and loading `.clipforge` project files with native dialogs

**Tasks:**
- [ ] Read `src/main/ipc/handlers.ts` to understand existing IPC pattern
- [ ] Read `src/renderer/store/projectStore.ts` to understand Project data structure
- [ ] Read `src/renderer/store/mediaStore.ts` to understand MediaFile data structure
- [ ] Read `src/types/timeline.ts` to understand all interfaces being serialized
- [ ] Add IPC handler `save-project` in `src/main/ipc/handlers.ts`:
  - Accept project data and optional filePath parameter
  - If no filePath, show native "Save As" dialog with `.clipforge` filter
  - Create ProjectFile structure: `{ version: 1, savedAt: timestamp, project: {...}, mediaFiles: [...] }`
  - Write JSON to file with proper error handling
  - Return saved file path on success
- [ ] Add IPC handler `load-project` in `src/main/ipc/handlers.ts`:
  - Show native "Open" dialog with `.clipforge` filter
  - Read and parse JSON file
  - Validate project file structure and version
  - Verify all referenced media files still exist on disk (warn if missing)
  - Return parsed project data with file path
- [ ] Add IPC handler `save-project-to-path` in `src/main/ipc/handlers.ts`:
  - Accept project data and explicit file path (for auto-save)
  - Skip dialog, directly write to specified path
  - Return success/failure boolean
- [ ] Create NEW: `src/types/project.ts` with ProjectFile interface:
  - Add version field for future migrations
  - Add savedAt timestamp
  - Add projectPath field for tracking file location
  - Add lastModified timestamp
- [ ] Update `src/renderer/utils/ipc.ts` to expose new IPC methods:
  - `saveProject(projectData, filePath?)`
  - `loadProject()`
  - `saveProjectToPath(projectData, filePath)`
- [ ] Add projectStore actions in `src/renderer/store/projectStore.ts`:
  - `saveProjectToFile(filePath?: string)` - Gather state and call IPC
  - `loadProjectFromFile()` - Call IPC and update all state
  - `setProjectPath(path: string)` - Track current save location
  - `setProjectName(name: string)` - Allow renaming

**What to Test:**
1. Create a project with media and clips, click Save - verify native dialog appears
2. Save project as "test.clipforge" - verify JSON file created and readable
3. Close app, restart, load "test.clipforge" - verify all clips and media restored
4. Verify media file paths in saved JSON are absolute paths (not relative)
5. Delete a media file, try loading project - verify warning about missing media
6. Save project, make changes, save again without dialog - verify file updated

**Files Changed:**
- `src/main/ipc/handlers.ts` - Add save/load IPC handlers
- `src/renderer/store/projectStore.ts` - Add save/load actions
- `src/renderer/utils/ipc.ts` - Expose IPC methods
- NEW: `src/types/project.ts` - ProjectFile interface

**Notes:**
- Store absolute file paths to media files, not relative paths
- Handle missing media gracefully (show which files are missing, allow loading anyway)
- ProjectFile version=1 for future schema migrations
- Don't copy media files into project - keep references only (non-destructive)

---

### PR 4.2: Header Integration and Unsaved Changes

**Goal:** Replace "Reset Project" button with Save/Load/New buttons and add unsaved changes indicator

**Tasks:**
- [ ] Read `src/renderer/components/Header.tsx` to understand current button layout
- [ ] Read `src/renderer/store/projectStore.ts` to understand current state
- [ ] Add unsaved changes tracking to `projectStore`:
  - Add `hasUnsavedChanges: boolean` state
  - Add `lastSaveTimestamp: number | null` state
  - Set `hasUnsavedChanges = true` when clips added/removed/updated
  - Set `hasUnsavedChanges = false` after successful save
  - Add `markDirty()` and `markClean()` helper methods
- [ ] Update `src/renderer/components/Header.tsx`:
  - Remove "Reset Project" button
  - Add "Save" button (calls saveProjectToFile with current path, or show dialog if no path)
  - Add "Save As..." button (always shows save dialog)
  - Add "Open" button (calls loadProjectFromFile)
  - Add "New Project" button (warns if unsaved changes, then creates fresh project)
  - Show current project name (editable on click or static for now)
  - Add visual indicator for unsaved changes (e.g., dot next to project name or "• Unsaved")
- [ ] Add confirmation dialog before New/Open if hasUnsavedChanges is true:
  - Use native dialog or simple window.confirm
  - Options: "Save", "Don't Save", "Cancel"
  - If "Save" selected, trigger save then proceed
- [ ] Update button styling for better visual hierarchy:
  - Save button prominent (green) when unsaved changes exist
  - Secondary buttons (Open, New) less prominent
  - Group project management buttons together

**What to Test:**
1. Import media and add clip - verify unsaved indicator appears
2. Click Save - verify dialog appears, save project, indicator disappears
3. Make more changes - verify indicator reappears
4. Click Save again (with path known) - verify no dialog, direct save
5. Click "Open" with unsaved changes - verify confirmation dialog appears
6. Click "New Project" with unsaved changes - verify confirmation appears
7. Save project, close app, reopen - verify no unsaved indicator on load

**Files Changed:**
- `src/renderer/components/Header.tsx` - Replace buttons, add save/load/new
- `src/renderer/store/projectStore.ts` - Add unsaved changes tracking

**Notes:**
- Use keyboard shortcuts in future PR (Cmd+S for save, Cmd+O for open)
- "Save" button should be quick-save (no dialog if path exists)
- "Save As..." always shows dialog for new location
- Consider debouncing markDirty() if performance issues arise

---

### PR 4.3: Auto-save and Crash Recovery

**Goal:** Implement auto-save mechanism to temp location and restore on crash/restart

**Tasks:**
- [ ] Read `src/main.ts` to understand app lifecycle events
- [ ] Read `src/renderer/store/projectStore.ts` to understand persist configuration
- [ ] Add auto-save configuration to `projectStore`:
  - Add `autoSavePath: string | null` state (temp file location)
  - Add `lastAutoSave: number | null` timestamp
  - Add `enableAutoSave: boolean` preference (default true)
- [ ] Create NEW: `src/main/services/AutoSaveManager.ts`:
  - Class to manage auto-save temp files
  - Method `getAutoSavePath()` returns OS temp dir + `.clipforge-autosave.json`
  - Method `cleanAutoSave()` deletes auto-save file
  - Method `checkForAutoSave()` checks if auto-save exists
- [ ] Add IPC handler `check-for-autosave` in `src/main/ipc/handlers.ts`:
  - Check if auto-save file exists
  - Return file path if exists, null otherwise
  - Include timestamp and project name from auto-save
- [ ] Add IPC handler `load-autosave` in `src/main/ipc/handlers.ts`:
  - Load and parse auto-save file
  - Return project data
- [ ] Add IPC handler `clear-autosave` in `src/main/ipc/handlers.ts`:
  - Delete auto-save file
  - Return success boolean
- [ ] Implement auto-save timer in `projectStore`:
  - Use setInterval with 60 second interval
  - On timer, call `saveProjectToPath(autoSavePath)` if hasUnsavedChanges
  - Update lastAutoSave timestamp
  - Start timer when project created/loaded
  - Clear timer on unmount
- [ ] Add crash recovery on app startup in `src/renderer/App.tsx`:
  - On mount, call `check-for-autosave` IPC
  - If auto-save exists, show modal: "Recover unsaved project from [timestamp]?"
  - Options: "Recover" or "Start Fresh"
  - If "Recover", load auto-save and restore state
  - If "Start Fresh", clear auto-save file
- [ ] Clear auto-save on successful manual save:
  - After saveProjectToFile succeeds, call clear-autosave

**What to Test:**
1. Create project, add clip, wait 60 seconds - verify auto-save file created in temp dir
2. Force quit app (kill process), restart - verify recovery prompt appears
3. Click "Recover" - verify project restored with all clips
4. Click "Start Fresh" - verify new project created, auto-save deleted
5. Make changes, save manually - verify auto-save file deleted
6. Load existing project - verify auto-save starts working for loaded project
7. Make no changes - verify auto-save doesn't run (hasUnsavedChanges check)

**Files Changed:**
- `src/renderer/store/projectStore.ts` - Add auto-save timer and state
- `src/renderer/App.tsx` - Add crash recovery prompt on mount
- `src/main/ipc/handlers.ts` - Add autosave IPC handlers
- NEW: `src/main/services/AutoSaveManager.ts` - Auto-save utilities

**Notes:**
- Auto-save should be silent (no UI indication except console log)
- Use OS temp directory (os.tmpdir() in Node.js)
- Don't show auto-save file in file dialogs (internal only)
- Auto-save interval of 60 seconds is aggressive but acceptable for demo
- Consider adding preference to disable auto-save in future

---

### PR 4.4: Recent Projects List and Quick Switcher

**Goal:** Add collapsible project sidebar showing recent projects with quick switching

**Tasks:**
- [ ] Read `src/renderer/components/MediaLibrary.tsx` to understand sidebar pattern
- [ ] Read `src/renderer/components/Layout.tsx` to understand grid layout
- [ ] Add recent projects tracking to localStorage:
  - Create NEW: `src/renderer/store/recentProjectsStore.ts` using Zustand persist
  - Store array of `{ path: string, name: string, lastOpened: number, thumbnail?: string }`
  - Add action `addRecentProject(path, name)` (max 10 entries)
  - Add action `removeRecentProject(path)`
  - Add action `clearRecentProjects()`
  - Sort by lastOpened timestamp (most recent first)
- [ ] Update projectStore to track recent projects:
  - After successful load, call `addRecentProject(projectPath, projectName)`
  - After successful save, update recent project entry
- [ ] Create NEW: `src/renderer/components/ProjectSidebar.tsx`:
  - Collapsible sidebar above MediaLibrary (toggle with chevron icon)
  - Show "Recent Projects" header with collapse button
  - List recent projects (name, last opened date, thumbnail placeholder)
  - Click project to load (show unsaved changes warning if needed)
  - Right-click or hover for "Remove from list" option
  - Empty state: "No recent projects"
  - Collapsed state shows just icon/count
- [ ] Update `src/renderer/components/Layout.tsx`:
  - Adjust grid layout to include ProjectSidebar above MediaLibrary
  - ProjectSidebar height when expanded: 150-200px
  - ProjectSidebar height when collapsed: 40px
  - MediaLibrary takes remaining height
- [ ] Add project thumbnail generation (optional, stretch):
  - When saving project, generate preview image of timeline
  - Store thumbnail path in recent projects
  - Display in sidebar for visual identification
- [ ] Style ProjectSidebar to match app theme:
  - Use same color scheme as MediaLibrary (#2c3e50 background)
  - Hover effects for project items
  - Subtle borders and shadows

**What to Test:**
1. Save a project - verify it appears in Recent Projects sidebar
2. Open an existing project - verify it moves to top of recent list
3. Create multiple projects - verify list shows max 10, sorted by recent
4. Click project in sidebar - verify it loads (with unsaved changes prompt)
5. Collapse sidebar - verify MediaLibrary expands to fill space
6. Right-click project, "Remove" - verify removed from list only (file not deleted)
7. Close app, reopen - verify recent projects persist

**Files Changed:**
- `src/renderer/components/Layout.tsx` - Update grid for ProjectSidebar
- `src/renderer/store/projectStore.ts` - Add recent projects integration
- NEW: `src/renderer/components/ProjectSidebar.tsx` - Project switcher UI
- NEW: `src/renderer/store/recentProjectsStore.ts` - Recent projects state

**Notes:**
- Recent projects list is metadata only (doesn't load full projects into memory)
- Removing from recent list doesn't delete project file
- Thumbnails are optional nice-to-have (use placeholder icon if not implemented)
- Consider adding "Open in Finder/Explorer" context menu option
- Collapsed state should be remembered in localStorage

---

### PR 4.5: Project Name Editing and Metadata

**Goal:** Allow inline project name editing and show additional project metadata in UI

**Tasks:**
- [ ] Read `src/renderer/components/Header.tsx` to understand current name display
- [ ] Update Header to show editable project name:
  - Display project name prominently (left side, larger text)
  - On click, make name editable (inline input or contentEditable)
  - On blur or Enter key, save new name
  - Update projectStore with new name
  - If project saved to file, update file metadata (re-save)
- [ ] Add breadcrumb-style navigation in Header:
  - Show: "Project Name • Last saved: 2 min ago" format
  - Update timestamp every minute
  - Show "Never saved" if project not saved yet
- [ ] Add project metadata to projectStore:
  - `createdAt: number` - Project creation timestamp
  - `modifiedAt: number` - Last modification timestamp
  - Update `modifiedAt` whenever clips/tracks change
  - Store in ProjectFile when saving
- [ ] Show project info in a subtle way:
  - Hover over project name shows tooltip with metadata
  - Tooltip shows: full path, created date, modified date, file size
- [ ] Update `src/types/project.ts` ProjectFile interface:
  - Add `createdAt` and `modifiedAt` timestamps
  - Add `creator` field (optional, for future multi-user)

**What to Test:**
1. Click project name - verify input appears and is editable
2. Change name, press Enter - verify name updates in UI
3. Save project - verify new name saved to file
4. Load project - verify name loads correctly
5. Hover over project name - verify tooltip shows metadata
6. Make edits - verify "Last saved" updates correctly
7. Create new project - verify "Never saved" appears until first save

**Files Changed:**
- `src/renderer/components/Header.tsx` - Add editable name and breadcrumb
- `src/renderer/store/projectStore.ts` - Add metadata tracking
- `src/types/project.ts` - Add metadata fields

**Notes:**
- Debounce name changes to avoid excessive re-renders
- Don't auto-save on name change (wait for explicit save)
- Name validation: non-empty, max 100 characters
- Update window title to show project name (future enhancement)

---

### PR 4.6: Empty States and UI Polish

**Goal:** Improve empty states, fix media item X button overlap, and polish project management UX

**Tasks:**
- [ ] Read `src/renderer/components/MediaLibrary.tsx` to understand current empty state
- [ ] Read `src/renderer/components/MediaItem.tsx` to understand X button placement
- [ ] Fix MediaItem X button overlap issue:
  - Move remove button to top-right corner with fixed positioning
  - Show X button only on hover (not always visible)
  - Add smooth opacity transition
  - Ensure button doesn't overlap thumbnail or text
  - Test with various thumbnail sizes
- [ ] Improve "New Project" empty state:
  - When no project loaded, show centered welcome screen
  - Show ClipForge logo or app icon
  - Show quick actions: "New Project", "Open Existing"
  - Show recent projects list if any exist
  - Add keyboard shortcut hints (Cmd+N, Cmd+O)
- [ ] Improve MediaLibrary empty state:
  - Better visual hierarchy (larger text, icon)
  - Show drag-drop zone more prominently
  - Add file format hints (.mp4, .mov, etc.)
- [ ] Add loading states:
  - Show spinner when loading project from file
  - Show progress for large project files
  - Disable buttons during save/load operations
- [ ] Add success/error notifications:
  - Toast notification on successful save ("Project saved")
  - Toast on successful load ("Project loaded")
  - Error toast for failed operations with retry option
  - Auto-dismiss after 3-5 seconds
- [ ] Create NEW: `src/renderer/components/EmptyState.tsx`:
  - Reusable component for empty states throughout app
  - Props: icon, title, description, actions
  - Consistent styling with app theme
- [ ] Create NEW: `src/renderer/components/Toast.tsx`:
  - Simple toast notification component
  - Support success, error, warning types
  - Auto-dismiss with configurable duration
  - Stack multiple toasts if needed

**What to Test:**
1. Start app with no project - verify welcome screen appears
2. Hover over media item - verify X button appears smoothly
3. Click X button - verify item removed, no overlap issues
4. Try various screen sizes - verify X button position consistent
5. Save project - verify "Project saved" toast appears
6. Load project with error - verify error toast with details
7. Drag and drop media - verify empty state transitions smoothly
8. Open recent project from welcome screen - verify project loads

**Files Changed:**
- `src/renderer/components/Header.tsx` - Add loading states to buttons
- `src/renderer/components/MediaLibrary.tsx` - Improve empty state
- `src/renderer/components/MediaItem.tsx` - Fix X button overlap
- NEW: `src/renderer/components/EmptyState.tsx` - Reusable empty state
- NEW: `src/renderer/components/Toast.tsx` - Toast notifications

**Notes:**
- Use CSS transitions for smooth hover effects (not JavaScript animation)
- Toast notifications should not block UI (non-modal)
- Empty states should be encouraging, not intimidating
- Consider using react-hot-toast or similar library if inline implementation complex
- Ensure all states are keyboard accessible (tab navigation)

---

## Completion Checklist

After all PRs are complete, verify:

- [ ] Can save project to .clipforge file with native dialog
- [ ] Can load project from file, all state restored correctly
- [ ] Recent projects sidebar shows up to 10 projects, sorted by date
- [ ] Auto-save runs every 60 seconds, saves to temp location
- [ ] Crash recovery prompts on startup if auto-save exists
- [ ] Unsaved changes indicator appears when project modified
- [ ] Confirmation dialog before losing unsaved changes
- [ ] Project name is editable inline in header
- [ ] Empty states are polished and helpful
- [ ] Media item X button shows on hover, no overlap issues
- [ ] Toast notifications for save/load success and errors
- [ ] All file operations use IPC handlers (not direct file access)
- [ ] Media file paths stored as absolute paths in project files
- [ ] Missing media files handled gracefully with warnings

## Future Enhancements (Not in MVP)

- Project templates (blank, 16:9 video, social media formats)
- Cloud sync (Google Drive, Dropbox integration)
- Project export/import (share with others)
- Version history (undo entire save points)
- Collaborative editing (multiple users)
- Project settings (default resolution, frame rate)
- Keyboard shortcuts (Cmd+S, Cmd+O, Cmd+N, Cmd+W)
- Window title shows project name and unsaved indicator
- Native menu bar integration (File > Save, File > Open)
- Automatic project thumbnails (timeline preview)
