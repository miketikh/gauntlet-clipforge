# Timeline Playback Issues - Fix Summary

**Date:** October 28, 2025
**Status:** Fixed

## Overview

Fixed critical bugs in the timeline video playback system including time display, clip transitions, smooth playhead movement, and video synchronization issues.

---

## Bug Fixes

### 1. Time Display Not Counting Up During Playback

**Problem:**
- Time display showed `currentTime` (video element's internal time) instead of timeline position
- Showed current media duration instead of total timeline duration
- Time was 0:00 when no clip was playing

**Solution:**
- Changed to use `playheadPosition` from projectStore for display time
- Changed to use `currentProject.duration` for total duration
- Time now shows timeline position regardless of clip presence

**Files Changed:**
- `src/renderer/components/Preview.tsx` (lines 245-249)

---

### 2. Playback Stops at Clip Boundaries

**Problem:**
- Video playback would stop at the end of clips instead of continuing
- Caused by race conditions in async clip loading
- RAF loop polling for clip end created multiple simultaneous transitions

**Root Cause:**
- Polling clip boundaries in RAF loop (fragile, race-prone)
- Not awaiting async `loadAndPlayClip()`
- No state guards to prevent re-entrant transitions

**Solution - Event-Driven State Machine:**

1. **Added PlaybackState enum** to prevent race conditions:
   - `IDLE`, `LOADING`, `PLAYING`, `TRANSITIONING`, `SEEKING`
   - Guards prevent re-entry (can't transition while already transitioning)

2. **Event-driven transitions** instead of RAF polling:
   - Video `ended` event → triggers `handleVideoEnded()`
   - Browser guarantees event fires exactly once
   - No floating-point comparison issues

3. **State-guarded transition method:**
   ```typescript
   private async transitionToNextClip() {
     // Guard: prevent re-entry
     if (this.playbackState === PlaybackState.TRANSITIONING) return;

     this.playbackState = PlaybackState.TRANSITIONING;
     await this.loadAndPlayClip(nextClip);
     this.playbackState = PlaybackState.PLAYING;
   }
   ```

4. **Simplified RAF loop:**
   - Removed clip transition logic (moved to events)
   - RAF now only handles UI updates and gap advancement
   - Event-driven for playback, RAF for visuals

**Files Changed:**
- `src/renderer/services/TimelinePlayer.ts` (extensive refactor)
  - Added PlaybackState enum
  - Added event listeners for 'ended', 'timeupdate', 'seeked'
  - Added `handleVideoEnded()`, `transitionToNextClip()`
  - Simplified RAF loop

---

### 3. Empty Timeline Playback

**Problem:**
- Pressing play before the first clip didn't advance playhead
- Should count time elapsed until reaching first clip

**Solution:**
- Added loop guard to prevent multiple RAF loops
- Changed end-of-timeline logic to check `projectDuration` instead of just "no clips ahead"
- RAF loop now advances through empty space until reaching clips or project end

**Files Changed:**
- `src/renderer/services/TimelinePlayer.ts` (RAF loop lines 505-573)

---

### 4. Jagged Playhead Movement During Video Playback

**Problem:**
- Playhead moved smoothly in empty space (60 FPS)
- Playhead was jagged during video playback (~4-15 Hz)
- Caused by using `timeupdate` event for UI updates

**Root Cause:**
- `timeupdate` event fires 4-15 times per second (too infrequent for smooth UI)
- RAF loop wasn't updating playhead during video playback

**Solution:**
- RAF loop now reads `video.currentTime` **every frame** (60 FPS)
- Updates UI at consistent 60 FPS for both empty space and video playback
- Removed `timeupdate` callback for UI updates

**Files Changed:**
- `src/renderer/services/TimelinePlayer.ts` (RAF loop Case 1, lines 521-538)

---

### 5. Playhead Drag Snap-Back Bug

**Problem:**
- Dragging playhead to position before first clip caused snap-back/bouncing
- Playhead would jump between drag position and previous position

**Root Cause - Circular State Feedback:**
```
Playhead drag → Store update → Preview detects change → TimelinePlayer.seek()
→ onPlayheadUpdate callback → Store update → Playhead re-renders → Snap back
```

**Solution - Drag State Isolation:**

1. **Separate visual and store state in Playhead:**
   - `visualPosition` - updated during drag (local state only)
   - `position` - store position (only updated on mouseup)

2. **Commit on mouseup only:**
   ```typescript
   const handleMouseMove = (e) => {
     setVisualPosition(newPosition); // No store update
   };

   const handleMouseUp = () => {
     setPlayheadPosition(visualPosition); // Single commit
   };
   ```

3. **Debounced seek in Preview:**
   - Added 50ms debounce to prevent rapid seeks during drag
   - Seeks only trigger after position changes stop

**Files Changed:**
- `src/renderer/components/Playhead.tsx` (added visualPosition state)
- `src/renderer/components/Preview.tsx` (added seek debouncing)

---

### 6. First Clip Video Display Issue

**Problem:**
- Sometimes first clip wouldn't show video on play (black screen)
- Second clip would play fine
- Playing again from same position would work

**Root Cause - Video Element Race Condition:**
- TimelinePlayer has hidden video element for playback control
- Preview has display video element for rendering
- Both videos load independently → race condition
- Display video might not be ready when TimelinePlayer starts playback

**Solution - Video Synchronization:**

1. **Made onClipChange callback async**
2. **Wait for display video ready state:**
   ```typescript
   onClipChange: async (clip, media) => {
     videoRef.current.src = fileUrl;

     // Wait for canplay event
     await new Promise((resolve) => {
       video.addEventListener('canplay', onCanPlay, { once: true });
       setTimeout(resolve, 1000); // Fallback timeout
     });

     // Seek to match TimelinePlayer position
     videoRef.current.currentTime = clampedTime;
   }
   ```

3. **Added console logging for debugging:**
   - `[Preview] Loading video source`
   - `[Preview] Video ready to play`
   - `[Preview] Video seeked to`

**Files Changed:**
- `src/renderer/components/Preview.tsx` (onClipChange callback, lines 56-110)

---

## Architecture Improvements

### Before:
- **Mixed update sources:** RAF polling + event callbacks
- **Circular state dependencies:** Bidirectional data flow
- **Race conditions:** Async operations without guards
- **Dual video sync issues:** Independent loading without coordination

### After:
- **Event-driven state machine:** Explicit states prevent race conditions
- **Unidirectional data flow:** Clear state ownership
- **Separation of concerns:** Events for playback logic, RAF for UI updates
- **Synchronized video loading:** Display video waits for ready state

---

## Technical Approach

### Key Principles Applied:

1. **Event-Driven Over Polling:**
   - Use browser video events (`ended`, `timeupdate`) for playback control
   - More reliable than trying to predict timing in RAF loop

2. **State Machine Pattern:**
   - Explicit states prevent re-entrant transitions
   - Guards ensure operations only happen in valid states

3. **Visual vs Store State Separation:**
   - Interactive operations (drag) update visual state only
   - Store updated on operation complete (mouseup)
   - Prevents feedback loops

4. **Async Coordination:**
   - Wait for video ready states before playback
   - Proper Promise handling for async video operations

---

## Testing Notes

All bugs tested and verified fixed:
- ✅ Time display counts up continuously
- ✅ Clips transition seamlessly (no stopping at boundaries)
- ✅ Playback works from empty timeline positions
- ✅ Playhead moves smoothly at 60 FPS
- ✅ Playhead drag is smooth with no snap-back
- ✅ First clip displays video immediately on play

---

## Known Remaining Issues

**Low Priority:**
- GPU SharedImageManager errors occasionally appear (cosmetic, doesn't affect playback)
- RAF loop runs even when paused (minor performance impact)
- Autofill console warnings (Chromium devtools, cosmetic)

**Future Optimization:**
- Consider refactoring to single video element architecture (eliminates dual video complexity)
- Add stall detection for buffering scenarios
- Implement loading states for user feedback
