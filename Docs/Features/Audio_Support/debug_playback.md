# Video/Audio Playback Debug Session

**Date:** October 28, 2025
**Status:** IN PROGRESS - Solution identified, awaiting implementation

---

## Context

We're implementing audio track support for the video editor. During development, we encountered cascading bugs related to video clip transitions:

1. **Initial bug:** Stuttering during video playback (infinite loop from RAF updates)
2. **Fix attempt 1:** Added `wasPlayingRef` to prevent infinite loops - fixed stuttering but broke side-by-side video transitions
3. **Fix attempt 2:** Added `onClipChange` callback system to trigger re-play during transitions - made everything worse, now stops at audio clips

**Current state:** Playback stops when hitting audio clips OR when transitioning between side-by-side video clips.

---

## Architecture Overview

### Key Components

**TimelinePlayer.ts** - Core playback orchestrator
- Manages single video element (reused for all video clips)
- Manages multiple audio elements (one per audio clip)
- Uses RequestAnimationFrame (RAF) loop for playback tracking
- Has TWO RAF cases:
  - **Case 1** (lines 837-849): Has `currentClip` → reads from video.currentTime
  - **Case 2** (lines 853-952): No `currentClip` → advances playhead manually, detects new clips

**Preview.tsx** - React wrapper component
- Creates TimelinePlayer instance
- Has effect that watches play/pause state changes
- Recently added: Effect that re-triggers play() when clips change (THIS IS THE PROBLEM)

**AudioMixer.ts** - Web Audio API handler
- Manages audio gain nodes and mixing

### Critical Variables

- `currentClip` - Currently playing VIDEO clip (or null if in gap/empty space)
- `currentAudioClipIds` - Set of currently playing AUDIO clip IDs
- `playbackState` - State machine: IDLE, LOADING, PLAYING, TRANSITIONING, SEEKING

---

## The Problem

### Root Cause: onClipChange Creates Race Condition

**What we did:**
1. Added `onClipChange` callback to notify Preview.tsx when clips change
2. Added effect in Preview.tsx that detects clip changes and calls `play()` again
3. Goal was to re-trigger playback during side-by-side clip transitions

**Why it breaks:**

When a clip ends and the next clip starts immediately:

1. Video 'ended' event fires
2. `transitionToNextClip()` clears `currentClip = null`
3. Calls `onClipChange(null)`
4. Preview.tsx effect detects clip change, calls `play()`
5. `play()` sets `playbackState = LOADING`
6. **RAF loop can't run:**
   - Case 1: `if (currentClip && clipAtPosition)` → FALSE (currentClip is null)
   - Case 2: `else if (!currentClip && playbackState !== LOADING)` → FALSE (state is LOADING)
7. **Playback stalls!**

The `playbackState !== LOADING` guard in Case 2 (line 853) was added to prevent race conditions, but it creates a deadlock when combined with the onClipChange mechanism.

---

## Proposed Solution

### Option B: Remove onClipChange System (Recommended)

**Key insight:** TimelinePlayer's RAF loop Case 2 ALREADY detects when clips start (lines 894-936) and loads them automatically. We don't need Preview.tsx to re-trigger play()!

### Changes Required

**1. Preview.tsx**
- Remove `lastClipIdRef` and `prevClipIdRef` refs
- Remove `onClipChange` callback from TimelinePlayer constructor
- Simplify play/pause effect to ONLY watch `isPlaying` state (not clip changes)
- Keep `wasPlayingRef` guard to prevent infinite loops

**2. TimelinePlayer.ts**
- Remove `onClipChange` from `TimelinePlayerCallbacks` interface
- Remove `onClipChange(null)` call in `transitionToNextClip()` (when clearing clips)
- Remove `onClipChange(clipId)` call when detecting new clips in RAF Case 2

**3. Keep Previous Fix**
- Keep the removal of artificial boundary detection (let browser fire natural 'ended' events)

### Why This Works

**Scenario 1: Empty → Audio**
- RAF Case 2 advances playhead through empty space
- At audio start time, lines 924-935 detect audio clip and call `loadAndPlayAudioClip()`
- Audio starts playing ✅

**Scenario 2: Empty → Audio → Video**
- Audio playing, RAF Case 2 continues advancing
- At video start time, lines 898-922 detect video clip and call `loadAndPlayClip()`
- Audio continues playing alongside video ✅

**Scenario 3: Video → Gap → Video**
- Video ends, `transitionToNextClip()` clears clip, shows black screen
- RAF Case 2 advances through gap
- At next video start, detects and loads it ✅

**Scenario 4: Video1 → Video2 (side-by-side)**
- Video1 ends, `transitionToNextClip()` clears `currentClip`
- RAF Case 2 runs immediately (no LOADING state blocking!)
- `getClipsAtPosition()` finds Video2 at same position
- Lines 898-922 load Video2 instantly
- Seamless transition! ✅

---

## Test Scenarios

After implementing the fix, test these scenarios thoroughly:

### 1. Empty Space → Audio Clip
**Timeline:** `[empty 0-5s]--[audio 5-10s]`
- **Action:** Play from t=0
- **Expected:** Playback continues smoothly, audio starts at t=5s

### 2. Empty → Audio → Audio+Video Overlap
**Timeline:** `[empty 0-5s]--[audio 5-15s]--[video 10-20s (overlaps with audio)]`
- **Action:** Play from t=0
- **Expected:** Audio starts at t=5s, video joins at t=10s, both play together

### 3. Video → Gap → Next Video
**Timeline:** `[video1 0-10s]--[gap 10-15s]--[video2 15-20s]`
- **Action:** Play from t=0
- **Expected:** Video1 plays, black screen during gap, video2 starts at t=15s

### 4. Side-by-Side Videos (No Gap)
**Timeline:** `[video1 0-10s][video2 10-20s]` (clips touch exactly)
- **Action:** Play from t=0
- **Expected:** Seamless transition from video1 to video2 at t=10s, no stutter or black frame

### 5. Complex Multi-Track
**Timeline:** `[empty 0-5s]--[audio 5-20s]--[video1+audio 10-15s]--[gap 15-20s]--[video2 20-25s]`
- **Action:** Play from t=0
- **Expected:** All transitions work smoothly, audio continues through video1 and gap

### 6. Multiple Consecutive Videos
**Timeline:** `[video1][video2][video3]` (all side-by-side)
- **Action:** Play from start
- **Expected:** Seamless transitions between all three videos

### Additional Tests
- Manual seek during playback (to empty space, to video, to audio)
- Pause/resume at various points
- Playback speed changes
- Position tracker moves smoothly throughout
- No stuttering or infinite loops

---

## Files to Modify

1. `src/renderer/components/Preview.tsx`
   - Lines ~25, 58-61, 90-91, 99-100, 104, 114 (remove onClipChange system)
   - Simplify play/pause effect to only watch `isPlaying`

2. `src/renderer/services/TimelinePlayer.ts`
   - Line 32 (remove onClipChange from interface)
   - Line 803 (remove onClipChange(null) call)
   - Line 907 (remove onClipChange(clipId) call)
   - Keep line 843-844 fix (boundary detection already removed)

---

## Alternative Solutions Considered

### Option A: Improve transitionToNextClip Logic
- Check if next clip is immediate before clearing currentClip
- Only call onClipChange(null) for actual gaps
- More complex, keeps the problematic callback system

### Option C: Fix RAF Loop LOADING State Handling
- Allow Case 2 to advance playhead even during LOADING
- Architectural change to RAF loop
- More risky, might cause timing issues

**Rationale for Option B:** Simplest solution that trusts TimelinePlayer's existing self-sufficient architecture.

---

## Next Steps

1. Implement Option B changes (revert onClipChange system)
2. Test all 6+ scenarios listed above
3. If successful, consider adding preload optimization (Part 2 from original plan)
4. Update `audio_support_tasks_index.md` with progress

---

## References

- Comprehensive analysis in task agent output (October 28, 2025)
- Original task plan: `audio_support_tasks_index.md`
- Related files: `TimelinePlayer.ts`, `Preview.tsx`, `AudioMixer.ts`
