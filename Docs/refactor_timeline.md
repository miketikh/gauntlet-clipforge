# TimelinePlayer.ts Refactoring Plan

## Overview

TimelinePlayer.ts is currently **1042 lines** and difficult to manage. This document outlines a refactoring plan to reduce it to **~400-450 lines** (60% reduction) by extracting helper functions, calculations, and subsystems into separate modules.

## Current Problems

1. **Exact code duplication** - Audio settings calculation appears twice (lines 461-468, 622-629)
2. **Similar patterns repeated** - Video event waiting logic duplicated 4 times
3. **Monster method** - The playback loop is 149 lines (lines 870-1019) with multiple responsibilities
4. **Mixed concerns** - Video loading, audio playback, clip queries all in one file

---

## Extraction Opportunities

### 1. CLIP FINDING & POSITION LOGIC (Lines 327-404)

**Current Duplication:**
- `getClipsAtPosition()` (327-353) - finds video + audio clips
- `getClipAtPosition()` (358-366) - finds single video clip (Track 0 only)
- `getNextClip()` (371-381) - finds next clip after current
- `findNextClipAfter()` (387-404) - finds next clip after position

These four methods all do similar clip-finding logic but with slight variations. They're reused throughout the file (lines 142, 234, 815, 842, 889, 955, 997).

**Proposed Module:** `ClipQueryService.ts` (~100 lines)

```typescript
class ClipQueryService {
  findClipsAtPosition(tracks: Track[], position: number): ClipQueryResult
  findVideoClipAtPosition(track: Track, position: number): TimelineClip | null
  findNextClipInTrack(track: Track, afterClip: TimelineClip): TimelineClip | null
  findNextClipAfterPosition(tracks: Track[], position: number): TimelineClip | null
  findAllActiveClipsAtPosition(tracks: Track[], position: number): ActiveClips
}
```

**Benefits:**
- Single responsibility for clip querying logic
- Easier to test clip-finding edge cases
- Reduces TimelinePlayer complexity by ~80 lines

---

### 2. VOLUME & MUTE CALCULATIONS (Lines 456-476, 622-629)

**Current Duplication:**
Exact same code appears twice:

```typescript
const isClipMuted = clip.muted ?? false;
const isTrackMuted = track.muted ?? false;
const effectiveMute = isClipMuted || isTrackMuted;

const clipVolume = clip.volume ?? 1.0;
const trackVolume = track.volume ?? 1.0;
const effectiveVolume = clipVolume * trackVolume * this.globalVolume;
```

**Proposed Module:** `audioSettingsCalculator.ts` (~30 lines, utility functions)

```typescript
export interface AudioSettings {
  effectiveMute: boolean;
  effectiveVolume: number;
  clipVolume: number;
  trackVolume: number;
}

export function calculateAudioSettings(
  clip: TimelineClip,
  track: Track,
  globalVolume: number
): AudioSettings
```

**Benefits:**
- Eliminates duplication
- Ensures consistent audio calculations
- Easy to add debugging/logging for volume issues

---

### 3. VIDEO LOADING & SEEKING (Lines 410-534, 541-601, 715-740)

**Three Related Methods:**
- `loadAndPlayClip()` (410-534) - 124 lines of complex loading logic
- `preloadClip()` (541-601) - Similar loading without playback
- `seekWithinClip()` (715-740) - Seeking logic

All three methods handle video element manipulation with similar patterns:
- Build file URL (lines 426-427, 558-559)
- Wait for 'canplay' event (lines 432-447, 571-596)
- Error handling
- Seek calculations (717-724)

**Proposed Module:** `VideoLoader.ts` (~120 lines)

```typescript
class VideoLoader {
  async loadVideo(videoElement: HTMLVideoElement, mediaPath: string): Promise<void>
  async seekToTime(videoElement: HTMLVideoElement, time: number): Promise<void>
  async preloadVideo(videoElement: HTMLVideoElement, mediaPath: string): Promise<void>

  private buildFileUrl(path: string): string
  private waitForCanPlay(element: HTMLVideoElement, timeout?: number): Promise<void>
}
```

**Benefits:**
- Reduces TimelinePlayer by ~150 lines
- Centralizes video loading patterns
- Easier to add retry logic or error recovery

---

### 4. AUDIO CLIP PLAYBACK (Lines 606-710)

**Single Large Method:**
- `loadAndPlayAudioClip()` - 104 lines handling audio-only clips

This is essentially a separate subsystem for audio clips that mirrors video clip logic:
- Get media/track (608-620)
- Calculate audio settings (622-629) - uses extracted calculator from #2
- Create/reuse audio element (634-649)
- Connect to AudioMixer (662-677)
- Apply fades (679-698)
- Play audio (700-709)

**Proposed Module:** `AudioClipPlayer.ts` (~100 lines)

```typescript
class AudioClipPlayer {
  constructor(
    private audioMixer: AudioMixer,
    private connectedElements: Set<HTMLMediaElement>
  )

  async loadAndPlay(
    clip: TimelineClip,
    track: Track,
    playheadPosition: number,
    playbackRate: number
  ): Promise<HTMLAudioElement>

  private createAudioElement(clip: TimelineClip, media: MediaFile): HTMLAudioElement
  private calculateAudioTime(clip: TimelineClip, playheadPosition: number): number
  private applyFadeEffects(clip: TimelineClip, audioElement: HTMLAudioElement, offsetInClip: number): void
}
```

**Benefits:**
- Separates audio-only logic from main player
- Reduces TimelinePlayer by ~100 lines
- Easier to add audio-specific features (waveforms, etc.)

---

### 5. THE MASSIVE PLAYBACK LOOP (Lines 870-1019)

**The Big One: 149 lines in a single RAF callback**

**Current Structure:**
```
startPlaybackLoop() {
  updateLoop(timestamp) {
    // Case 1: Playing a clip (lines 886-910)
      - Update from video element
      - Check trimEnd boundary

    // Case 2: No current clip - gap/empty (lines 911-1011)
      - Advance playhead
      - Stop expired audio clips (919-936)
      - Preload upcoming clips (938-952)
      - Start video clips (954-979)
      - Start audio clips (981-992)
      - Check for end of timeline (994-1010)
  }
}
```

This method violates Single Responsibility Principle - it handles:
1. Playhead updates from video
2. Gap advancement
3. Audio clip lifecycle management
4. Video clip preloading
5. Clip start detection
6. End-of-timeline detection

**Proposed Modules:**

**5a. `PlayheadSynchronizer.ts`** (~40 lines, handles Case 1: lines 886-910)
```typescript
class PlayheadSynchronizer {
  updateFromVideoElement(
    videoElement: HTMLVideoElement,
    currentClip: TimelineClip,
    currentMedia: MediaFile
  ): PlayheadUpdate {
    // Lines 892-898: Calculate timeline position from video
    // Lines 900-909: Check trimEnd boundary
  }
}
```

**5b. `GapPlaybackManager.ts`** (~80 lines, handles Case 2: lines 911-1011)
```typescript
class GapPlaybackManager {
  advancePlayhead(deltaTime: number, playbackRate: number): number

  checkExpiredAudioClips(
    currentPosition: number,
    audioClipIds: Set<string>,
    audioElements: Map<string, HTMLAudioElement>
  ): void

  checkForUpcomingClips(currentPosition: number): {
    videoClip?: TimelineClip;
    audioClips: TimelineClip[];
  }

  shouldEndPlayback(currentPosition: number, projectDuration: number): boolean
}
```

**5c. Refactored `startPlaybackLoop()`** (~50 lines instead of 149)
```typescript
private startPlaybackLoop(): void {
  const updateLoop = (timestamp: number) => {
    if (!this.isPlaying) return;

    const deltaTime = calculateDeltaTime(timestamp, this.lastUpdateTime);
    this.lastUpdateTime = timestamp;

    if (this.currentClip && this.clipQueryService.hasClipAtPosition(this.currentPlayheadPosition)) {
      // Case 1: Playing a clip
      const update = this.playheadSync.updateFromVideoElement(
        this.videoElement, this.currentClip, this.currentMedia
      );
      this.currentPlayheadPosition = update.position;
      this.callbacks.onPlayheadUpdate(update.position);

      if (update.reachedTrimEnd) {
        this.handleVideoEnded();
      }
    } else if (!this.currentClip && this.playbackState !== PlaybackState.LOADING) {
      // Case 2: Gap/empty playback
      this.gapManager.handleGapPlayback(this, deltaTime);
    }

    this.animationFrameId = requestAnimationFrame(updateLoop);
  };

  this.lastUpdateTime = 0;
  this.animationFrameId = requestAnimationFrame(updateLoop);
}
```

**Benefits:**
- Reduces complexity from 149 lines to ~50 lines
- Each piece is testable in isolation
- Clearer separation of concerns
- Easier to debug playback issues

---

### 6. FADE EFFECT SCHEDULING (Lines 503-524, 679-698)

**Current Duplication:**
Identical fade in/out logic appears twice:
- Lines 503-524: Fade in/out for video clips
- Lines 679-698: Fade in/out for audio clips

**Pattern:**
```typescript
// Fade in
if (clip.fadeIn && clip.fadeIn > 0) {
  this.audioMixer.applyFadeIn(sourceId, clip.fadeIn);
}

// Fade out (scheduled)
if (clip.fadeOut && clip.fadeOut > 0) {
  const clipDuration = clip.endTime - clip.startTime;
  const fadeOutStartTime = clipDuration - clip.fadeOut;

  if (fadeOutStartTime > 0) {
    setTimeout(() => {
      this.audioMixer.applyFadeOut(sourceId, clip.fadeOut!);
    }, fadeOutStartTime * 1000);
  } else {
    this.audioMixer.applyFadeOut(sourceId, clip.fadeOut);
  }
}
```

**Proposed Module:** `FadeEffectScheduler.ts` (~50 lines)

```typescript
class FadeEffectScheduler {
  constructor(private audioMixer: AudioMixer)

  applyFadeEffects(
    sourceId: string,
    clip: TimelineClip,
    offsetInClip: number = 0
  ): void {
    this.scheduleFadeIn(sourceId, clip, offsetInClip);
    this.scheduleFadeOut(sourceId, clip, offsetInClip);
  }

  private scheduleFadeIn(sourceId: string, clip: TimelineClip, offset: number): void
  private scheduleFadeOut(sourceId: string, clip: TimelineClip, offset: number): void
}
```

**Benefits:**
- Eliminates ~40 lines of duplication
- Centralizes fade timing logic
- Easier to add crossfade transitions later

---

### 7. PROMISE-BASED EVENT WAITERS (Lines 729-739, 747-766, 432-447, 571-596)

**Current Duplication:**
This pattern appears 4 times:
- Lines 729-739: Wait for 'seeked' event
- Lines 747-766: Wait for 'playing' event
- Lines 432-447: Wait for 'canplay' event (in loadAndPlayClip)
- Lines 571-596: Wait for 'canplay' event (in preloadClip)

**Pattern:**
```typescript
await new Promise<void>((resolve) => {
  const onEvent = () => {
    element.removeEventListener('event', onEvent);
    resolve();
  };
  element.addEventListener('event', onEvent);
  setTimeout(resolve, TIMEOUT); // Fallback
});
```

**Proposed Module:** `videoEventWaiters.ts` (~50 lines, utility functions)

```typescript
export async function waitForSeeked(element: HTMLVideoElement, timeout = 100): Promise<void>
export async function waitForPlaying(element: HTMLVideoElement, timeout = 200): Promise<void>
export async function waitForCanPlay(element: HTMLVideoElement, timeout = 10000): Promise<void>

// Generic helper
async function waitForEvent(
  element: HTMLElement,
  eventName: string,
  timeout: number
): Promise<void>
```

**Benefits:**
- Eliminates ~60 lines of duplicated promise wrappers
- Consistent timeout handling
- Reusable across other video components

---

### 8. MEDIA FILE URL BUILDING (Lines 426-427, 558-559, 638)

**Repeated 3 times:**
```typescript
const fileUrl = videoPath.startsWith('file://') ? videoPath : `file://${videoPath}`;
```

**Proposed Module:** `mediaUtils.ts` (~10 lines)

```typescript
export function buildFileUrl(path: string): string {
  return path.startsWith('file://') ? path : `file://${path}`;
}
```

**Benefits:**
- DRY principle
- Single place to update if URL format changes
- Easy to add path validation

---

### 9. CLIP TIME CALCULATIONS (Lines 717-724, 655-656)

**Current calculations scattered:**
```typescript
// Offset within clip
const offsetInClip = playheadPosition - clip.startTime;
const videoTime = clip.trimStart + offsetInClip;

// Clamping
const clampedTime = Math.max(
  clip.trimStart,
  Math.min(videoTime, media.duration - clip.trimEnd)
);
```

**Proposed:** Add to existing `timelineCalculations.ts` (~30 lines)

```typescript
export function calculateOffsetInClip(clip: TimelineClip, playheadPosition: number): number {
  return playheadPosition - clip.startTime;
}

export function calculateVideoTime(clip: TimelineClip, playheadPosition: number): number {
  const offset = calculateOffsetInClip(clip, playheadPosition);
  return clip.trimStart + offset;
}

export function clampToClipBounds(
  videoTime: number,
  clip: TimelineClip,
  mediaDuration: number
): number {
  return Math.max(
    clip.trimStart,
    Math.min(videoTime, mediaDuration - clip.trimEnd)
  );
}
```

**Benefits:**
- Centralizes timeline math with existing utilities
- Easier to test edge cases
- Consistent calculations across codebase

---

## Summary: Extraction Impact

### New Files to Create:

**`src/renderer/services/timeline/` (new folder)**
1. `ClipQueryService.ts` - ~100 lines
2. `VideoLoader.ts` - ~120 lines
3. `AudioClipPlayer.ts` - ~100 lines
4. `PlayheadSynchronizer.ts` - ~40 lines
5. `GapPlaybackManager.ts` - ~80 lines
6. `FadeEffectScheduler.ts` - ~50 lines

**`src/renderer/utils/` (existing folder)**
7. `mediaUtils.ts` - ~10 lines
8. `videoEventWaiters.ts` - ~50 lines
9. `audioSettingsCalculator.ts` - ~30 lines
10. Additions to `timelineCalculations.ts` - ~30 lines (file exists)

### TimelinePlayer.ts After Refactoring:

**Current:** 1042 lines
**After Extraction:** ~400-450 lines (60% reduction)

**Remaining Responsibilities:**
- High-level playback coordination
- State machine management
- Play/pause/seek public API
- Event listener setup
- Resource cleanup

---

## Recommended Extraction Order

### Phase 1 - Quick Wins (Low Risk)
1. Media path utility (8 lines, used 3 times)
2. Video event waiters (eliminates ~60 lines duplication)
3. Audio settings calculator (eliminates exact duplication)
4. Timeline calculations additions (pure math functions)

### Phase 2 - Medium Complexity
5. Fade effect scheduler (centralize fade logic)
6. Clip query service (consolidate clip finding)

### Phase 3 - High Impact
7. Video loader (big chunk, clear boundaries)
8. Audio clip player (separate subsystem)

### Phase 4 - Most Complex (Requires Testing)
9. Playhead synchronizer
10. Gap playback manager

---

## Benefits of This Refactoring

- **Testability**: Each module can be unit tested independently
- **Maintainability**: Clear responsibilities, easier to debug
- **Reusability**: Utilities can be used by other components
- **Readability**: TimelinePlayer becomes a thin coordinator instead of a 1000+ line monolith
