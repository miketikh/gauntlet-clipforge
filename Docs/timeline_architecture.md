# Timeline Architecture Overview

## Data Model Hierarchy

```
Project
├── id: string
├── name: string
├── duration: number (calculated)
└── tracks: Track[]
    ├── Track 0 (Main)
    │   ├── id: string
    │   ├── name: "Main"
    │   └── clips: TimelineClip[]
    │       ├── TimelineClip
    │       │   ├── id: string
    │       │   ├── mediaFileId: string  ──→ References MediaFile.id
    │       │   ├── trackIndex: 0
    │       │   ├── startTime: 0.0
    │       │   ├── endTime: 5.0
    │       │   ├── trimStart: 0.0
    │       │   └── trimEnd: 0.0
    │       └── ...
    └── Track 1 (Overlay)
        └── clips: TimelineClip[]
```

## State Flow

```
User Action (Console/Future UI)
         ↓
projectStore.getState().action()
         ↓
State Update (Zustand)
         ↓
localStorage Persistence
         ↓
UI Re-render (Future)
```

## Non-Destructive Editing Flow

```
1. User imports video
   → MediaFile created in mediaStore
   → Original file NEVER modified

2. User adds to timeline
   → TimelineClip created with mediaFileId reference
   → Stores position (startTime, endTime) on timeline
   → Stores trim points (trimStart, trimEnd)

3. User trims clip
   → Only TimelineClip.trimStart/trimEnd updated
   → Original MediaFile unchanged

4. User exports
   → FFmpeg reads original MediaFile
   → Applies trim points from TimelineClip
   → Renders composition to new file
```

## Timeline Coordinate System

```
Timeline (seconds):
0────5────10────15────20────25────30
│    │    │     │     │     │     │
▓▓▓▓▓     ▓▓▓▓▓▓      ▓▓▓▓▓▓▓▓▓▓
Clip1     Clip2       Clip3

Clip1:
- startTime: 0
- endTime: 5
- trimStart: 2  (skip first 2s of original media)
- trimEnd: 1    (skip last 1s of original media)
- Effective duration: 5 - 0 = 5s
- Original media used: seconds 2 to (mediaFile.duration - 1)
```

## Store Structure

### projectStore.ts
```typescript
{
  currentProject: Project | null,
  playheadPosition: number,

  // Actions
  createProject(name) → Creates project with 2 empty tracks
  addClipToTrack(mediaFileId, trackIndex, position) → Adds clip
  removeClip(clipId) → Removes clip
  updateClip(clipId, changes) → Updates properties
  setPlayheadPosition(position) → Moves playhead
  getProjectDuration() → Calculates total duration
}
```

### mediaStore.ts (existing)
```typescript
{
  mediaFiles: MediaFile[],

  // Actions
  addMediaFile(file) → Stores imported media
  removeMediaFile(id) → Removes media
  clearMedia() → Clears all
}
```

## Calculation Utilities

### timelineCalculations.ts
```typescript
calculateClipDuration(clip)
  → Returns: clip.endTime - clip.startTime

calculateTrackDuration(track)
  → Returns: max(clip.endTime) for all clips

findClipAtPosition(track, position)
  → Returns: clip where startTime ≤ position < endTime

detectOverlaps(track)
  → Returns: true if any clips overlap
```

## Future Integrations

### PR 1.3.2 - Programmatic Edit API
```
EditAPI Layer
    ↓
projectStore (this PR)
    ↓
Timeline UI Components
```

### PR 1.4.x - Timeline UI
```
React Components
    ↓
useProjectStore() hook
    ↓
Render timeline visualization
```

### Phase 2 - AI Agent
```
AI Agent (Claude)
    ↓
EditAPI.addClip(), EditAPI.trimClip()
    ↓
projectStore
    ↓
Automatic video editing
```

## Testing

All functionality currently testable via browser console:
```javascript
// Create project
projectStore.getState().createProject("Test")

// Add clips
projectStore.getState().addClipToTrack("media-1", 0, 0)
projectStore.getState().addClipToTrack("media-2", 0, 5)

// Inspect state
projectStore.getState().currentProject

// Calculate duration
projectStore.getState().getProjectDuration()
```

See `src/renderer/store/projectStore.test.md` for complete test suite.
