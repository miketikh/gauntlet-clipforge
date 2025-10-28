# Project Store Testing Guide

Since this is pure state management with no UI yet, test in the browser console.

## Setup
The app is running with hot reload. Open DevTools console.

## Test Commands

### 1. Check Initial State
```javascript
projectStore.getState()
// Expected: { currentProject: null, playheadPosition: 0, ... }
```

### 2. Create New Project
```javascript
projectStore.getState().createProject("Test Project")
projectStore.getState().currentProject
// Expected: Project with 2 empty tracks (Main, Overlay 1)
```

### 3. Add Clip to Timeline
```javascript
projectStore.getState().addClipToTrack("media-123", 0, 0)
projectStore.getState().currentProject.tracks[0].clips
// Expected: Array with 1 clip at position 0
```

### 4. Add Another Clip
```javascript
projectStore.getState().addClipToTrack("media-456", 0, 5)
projectStore.getState().currentProject.tracks[0].clips
// Expected: Array with 2 clips, sorted by startTime
```

### 5. Update Clip Trim Points
```javascript
const clipId = projectStore.getState().currentProject.tracks[0].clips[0].id
projectStore.getState().updateClip(clipId, { trimStart: 2, trimEnd: 1 })
projectStore.getState().currentProject.tracks[0].clips[0]
// Expected: Clip with trimStart=2, trimEnd=1
```

### 6. Calculate Project Duration
```javascript
projectStore.getState().getProjectDuration()
// Expected: 10 (if you have 2 clips: 0-5 and 5-10)
```

### 7. Set Playhead Position
```javascript
projectStore.getState().setPlayheadPosition(3.5)
projectStore.getState().playheadPosition
// Expected: 3.5
```

### 8. Remove Clip
```javascript
const clipId = projectStore.getState().currentProject.tracks[0].clips[0].id
projectStore.getState().removeClip(clipId)
projectStore.getState().currentProject.tracks[0].clips
// Expected: Array with 1 clip remaining
```

### 9. Test Timeline Calculations
```javascript
// Test clip duration
const clip = projectStore.getState().currentProject.tracks[0].clips[0]
timelineCalcs.calculateClipDuration(clip)
// Expected: endTime - startTime

// Test track duration
const track = projectStore.getState().currentProject.tracks[0]
timelineCalcs.calculateTrackDuration(track)
// Expected: Latest clip endTime

// Find clip at position
timelineCalcs.findClipAtPosition(track, 2)
// Expected: Clip object or null

// Check for overlaps (should be false with non-overlapping clips)
timelineCalcs.detectOverlaps(track)
// Expected: false
```

### 10. Test localStorage Persistence
```javascript
// Create a project with some clips
projectStore.getState().createProject("Persistent Project")
projectStore.getState().addClipToTrack("media-789", 0, 0)

// Refresh the page, then check:
projectStore.getState().currentProject
// Expected: Same project data loaded from localStorage
```

## Complete Test Flow
```javascript
// Full workflow test
projectStore.getState().createProject("Complete Test")
projectStore.getState().addClipToTrack("clip-1", 0, 0)
projectStore.getState().addClipToTrack("clip-2", 0, 10)
projectStore.getState().addClipToTrack("clip-3", 1, 5)

const state = projectStore.getState()
console.log("Project:", state.currentProject.name)
console.log("Main track clips:", state.currentProject.tracks[0].clips.length)
console.log("Overlay track clips:", state.currentProject.tracks[1].clips.length)
console.log("Total duration:", state.getProjectDuration())
```
