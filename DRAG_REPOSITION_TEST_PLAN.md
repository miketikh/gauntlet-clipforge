# Drag-to-Reposition & Push-Forward Testing Guide

## Overview
This document explains how to test the newly implemented drag-to-reposition clips feature and the fixed push-forward logic in ClipForge video editor.

## What Was Implemented

### 1. Fixed Push-Forward Logic in EditAPI.addClip()
**Problem:** When dropping clips at the same position or overlapping positions, clips would stack instead of pushing forward.

**Fix:** Updated overlap detection algorithm to properly detect ALL conflicts:
- OLD: Only checked if `clip.startTime >= startTime` (missed clips that started before but ended after)
- NEW: Checks for actual overlap: `newClipEndTime > clip.startTime && startTime < clip.endTime`

**Files Modified:**
- `/Users/Gauntlet/gauntlet/videojarvis/src/renderer/api/EditAPI.ts` (lines 66-101)

### 2. Added Push-Forward Logic to moveClip()
**Problem:** Moving clips didn't push other clips forward, causing overlaps.

**Fix:** Implemented same overlap detection and push-forward logic as addClip(), but excludes the clip being moved.

**Files Modified:**
- `/Users/Gauntlet/gauntlet/videojarvis/src/renderer/api/EditAPI.ts` (lines 337-383)

### 3. Made TimelineClipView Draggable
**Problem:** No way to reposition clips once placed on timeline.

**Fix:** Added useDrag hook from react-dnd with type 'TIMELINE_CLIP'

**Files Modified:**
- `/Users/Gauntlet/gauntlet/videojarvis/src/renderer/components/TimelineClipView.tsx` (lines 1-2, 32-39, 145, 165, 168)

### 4. Updated TimelineTrack to Accept TIMELINE_CLIP Drops
**Problem:** Track only accepted MEDIA_ITEM drops (from library).

**Fix:** Updated useDrop to accept both 'MEDIA_ITEM' and 'TIMELINE_CLIP', with logic to handle each type appropriately.

**Files Modified:**
- `/Users/Gauntlet/gauntlet/videojarvis/src/renderer/components/TimelineTrack.tsx` (lines 30-73)

---

## How to Test

### Prerequisites
1. Start the app: `npm start`
2. Import 3-4 video files into the media library (drag & drop or use file picker)
3. Open the browser console to see debug logs

### Test 1: Push-Forward on Insert (New Clips)
**Goal:** Verify that adding new clips pushes existing clips forward.

**Steps:**
1. Drag video A from library to timeline at position 00:00
2. Drag video B from library to timeline at position 00:00
3. Observe: Video A should automatically push forward to end of video B
4. Drag video C from library to timeline at position 00:05 (middle of existing clips)
5. Observe: Any clips after 00:05 should push forward

**Expected Results:**
- No clips overlap
- Clips are arranged sequentially
- Console logs show: `[EditAPI] Inserting clip at Xs. Pushing N clip(s) forward by Ys`
- Timeline shows all clips visible without overlaps

**Known Issue to Watch For:**
- If clips still overlap, check console for error messages
- Verify that the new clip duration is being calculated correctly

---

### Test 2: Drag-to-Reposition Existing Clips
**Goal:** Verify that clips can be repositioned by dragging.

**Steps:**
1. Add 3 clips to timeline (from Test 1)
2. Click and drag the FIRST clip to a new position (e.g., move it to 00:10)
3. Observe: Cursor changes to "grabbing", clip becomes semi-transparent
4. Drop the clip at the new position
5. Observe: Clip moves to new position, any conflicting clips push forward

**Expected Results:**
- Clip is draggable (cursor shows grabbing hand)
- Visual feedback during drag (opacity 0.5)
- Clip repositions to drop location
- Console shows: `[EditAPI] Moving clip to Xs. Pushing N clip(s) forward by Ys`
- No overlaps after drop

**Edge Cases to Test:**
- Drag clip to empty space → should just move
- Drag clip to occupied space → should push other clips forward
- Drag clip to same track vs different track (Main vs Overlay 1)

---

### Test 3: Push-Forward on Move (Repositioning)
**Goal:** Verify that repositioning clips triggers push-forward.

**Setup:**
1. Add 3 clips sequentially: Clip A (0-5s), Clip B (5-10s), Clip C (10-15s)

**Test Cases:**

**Case A: Move to Empty Space**
1. Drag Clip C to position 20s
2. Expected: Clip C moves to 20s, no other clips affected

**Case B: Move Into Occupied Space**
1. Drag Clip C to position 7s (middle of Clip B)
2. Expected: Clip B pushes forward to 7s + ClipC.duration
3. Verify no overlap between C and B

**Case C: Move to Beginning**
1. Drag Clip C to position 0s
2. Expected: All other clips (A, B) push forward
3. Verify clips are in order: C, A, B

**Expected Console Output:**
```
[EditAPI] Moving clip to 7s. Pushing 1 clip(s) forward by 5.5s
```

---

### Test 4: Cross-Track Movement
**Goal:** Verify clips can move between tracks.

**Steps:**
1. Add Clip A to Track 0 (Main) at 00:00
2. Add Clip B to Track 0 (Main) at 00:05
3. Drag Clip A from Track 0 to Track 1 (Overlay 1) at 00:00
4. Observe: Clip A moves to Track 1, Clip B stays in Track 0

**Expected Results:**
- Clip successfully moves between tracks
- Push-forward only affects clips on the target track
- Original track adjusts layout after clip removal

---

### Test 5: Visual Feedback During Drag
**Goal:** Verify UI provides clear drag feedback.

**What to Check:**
- [ ] Cursor changes to "grabbing" when dragging clip
- [ ] Dragged clip becomes semi-transparent (opacity 0.5)
- [ ] Original position shows gap (clip is removed during drag)
- [ ] Drop zone highlights when hovering over track
- [ ] Clip snaps to correct position based on mouse X coordinate

---

### Test 6: Playback After Rearrangement
**Goal:** Verify timeline still plays correctly after repositioning.

**Steps:**
1. Arrange 3 clips in any order using drag-to-reposition
2. Click on timeline ruler to move playhead to 00:00
3. Press Play button (or spacebar if implemented)
4. Observe: Video plays clips in correct order without gaps or overlaps

**Expected Results:**
- Clips play sequentially
- No black frames between clips (unless intentional gaps)
- Playhead moves smoothly across timeline

---

### Test 7: Edge Cases & Error Handling
**Goal:** Verify robust handling of unusual scenarios.

**Test Cases:**

**Case A: Drag Same Clip Multiple Times**
1. Drag Clip A to position 10s
2. Immediately drag Clip A to position 5s
3. Expected: Clip moves correctly both times

**Case B: Rapid Successive Drops**
1. Quickly drag 3 clips from library to timeline
2. Expected: All clips add without errors, push-forward works correctly

**Case C: Delete Clip During Drag (Don't Actually Test This)**
- This is a race condition we're NOT handling - just document as known limitation

---

## Console Debugging

Look for these log messages to verify behavior:

**Adding New Clip:**
```
[EditAPI] addClip: {mediaFileId: "...", trackIndex: 0, startTime: 5}
[EditAPI] Inserting clip at 5s. Pushing 2 clip(s) forward by 7.5s
[EditAPI] Clip added successfully: clip-...
```

**Moving Existing Clip:**
```
[EditAPI] moveClip: {clipId: "...", newTrackIndex: 0, newStartTime: 10}
[EditAPI] Moving clip to 10s. Pushing 1 clip(s) forward by 5s
[EditAPI] Clip moved successfully
```

**Dropping on Timeline:**
```
[TimelineTrack] Repositioning clip: {clipId: "...", trackIndex: 0, dropTimeSeconds: 10.5}
```

---

## Known Limitations

1. **No Undo/Redo Yet:** Command history is recorded but not yet wired to UI
2. **No Snapping:** Clips don't snap to grid lines or other clips (future enhancement)
3. **No Multi-Select:** Can't drag multiple clips at once
4. **No Gap Closing:** When moving a clip, gaps are left behind (not automatically closed)
5. **No Visual Preview:** No preview line showing where clip will land during drag

---

## Success Criteria Checklist

- [ ] Build compiles without errors (verified with `npm run lint`)
- [ ] Can drag clips from media library to timeline (existing feature still works)
- [ ] Can drag clips already on timeline to new positions (NEW)
- [ ] When dropping clip at occupied position, existing clips push forward (FIXED)
- [ ] Multiple clips can be arranged without overlaps (FIXED)
- [ ] Playback works correctly with multiple clips
- [ ] Console logs show correct push-forward operations
- [ ] No TypeScript errors in modified files

---

## Files Modified Summary

1. **EditAPI.ts** (2 changes)
   - Fixed addClip() overlap detection (lines 66-101)
   - Added push-forward to moveClip() (lines 337-383)

2. **TimelineClipView.tsx** (3 changes)
   - Added useDrag import (line 2)
   - Added drag hook (lines 32-39)
   - Updated div with drag ref and styling (lines 145, 165, 168)

3. **TimelineTrack.tsx** (1 change)
   - Updated useDrop to accept both MEDIA_ITEM and TIMELINE_CLIP (lines 30-73)

**Total Lines Changed:** ~60 lines across 3 files

---

## Troubleshooting

### Issue: Clips Still Overlap After Drop
**Check:**
- Are there console errors?
- Is the overlap detection logic running? (check for log: "Pushing N clips forward")
- Is the clip duration correct? (inspect clip object in console)

**Fix:**
- Verify mediaFile.duration is set correctly in projectStore.addClipToTrack()
- Check that updateClip() is actually updating positions

### Issue: Clip Doesn't Respond to Drag
**Check:**
- Is react-dnd initialized? (check DndProvider in App.tsx)
- Does the clip have the drag ref attached? (inspect element)
- Any errors in console about drag types?

**Fix:**
- Verify TimelineClipView has `ref={drag}` on root div
- Verify TimelineTrack accepts 'TIMELINE_CLIP' in accept array

### Issue: Clip Jumps to Wrong Position
**Check:**
- Is the dropX calculation accounting for track label offset? (120px)
- Is pixelsPerSecond (zoom) correct?

**Fix:**
- Check calculation: `const dropX = offset.x - trackRect.left;`
- Verify zoom prop is passed correctly to TimelineTrack

---

## Next Steps

After testing, consider implementing:
1. **Snapping** - Snap clips to 1-second intervals or other clips
2. **Gap Closing** - Automatically close gaps when moving clips left
3. **Visual Drop Preview** - Show vertical line where clip will land
4. **Undo/Redo** - Wire up command history to keyboard shortcuts
5. **Multi-Select** - Select and drag multiple clips at once
6. **Keyboard Nudging** - Arrow keys to nudge clips by small increments

---

## Performance Notes

The current implementation updates clips synchronously using a for loop. For 100+ clips, this may cause lag. Future optimization could:
- Batch updates using a single projectStore update
- Use requestAnimationFrame for smooth drag operations
- Implement virtual scrolling for timeline with many clips

For the 72-hour MVP, current implementation is sufficient for 10-20 clips.
