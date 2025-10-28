# TimelinePlayer Architecture

## Overview

The TimelinePlayer service manages multi-clip video playback by coordinating between the timeline state, video elements, and playback controls. This document explains the architecture and data flow.

## Component Hierarchy

```
Preview Component
    ├─> TimelinePlayer (service instance)
    │   ├─> currentVideo (hidden HTMLVideoElement for active clip)
    │   ├─> nextVideo (hidden HTMLVideoElement for preloading)
    │   └─> playback loop (requestAnimationFrame)
    │
    ├─> videoRef (visible HTMLVideoElement synced with currentVideo)
    └─> State Management
        ├─> playerStore (isPlaying, volume, playbackRate)
        ├─> projectStore (playheadPosition, currentProject)
        └─> mediaStore (mediaFiles)
```

## Data Flow

### Playback Start Sequence

```
User clicks Play button
    ↓
playerStore.play() called
    ↓
Preview useEffect detects isPlaying = true
    ↓
TimelinePlayer.play(playheadPosition) called
    ↓
TimelinePlayer finds clip at playheadPosition
    ↓
Loads media file into currentVideo element
    ↓
Seeks to correct position: videoTime = clip.trimStart + offsetInClip
    ↓
Starts video.play()
    ↓
Starts playback loop (requestAnimationFrame)
    ↓
Loop updates playheadPosition in projectStore every frame
    ↓
Preview displays current clip via videoRef
```

### Clip Transition Sequence

```
Playback loop detects: playheadPosition >= currentClip.endTime
    ↓
Calls getNextClip(currentClip)
    ↓
Checks for gap: nextClip.startTime > currentClip.endTime?
    ├─> If gap > 0.1s: PAUSE playback
    └─> If gap ≤ 0.1s: Continue to next clip
        ↓
        Calls loadAndPlayClip(nextClip)
            ↓
            Gets media file from mediaStore
            ↓
            Updates currentVideo.src to new file
            ↓
            Seeks to nextClip.trimStart
            ↓
            Starts playing
            ↓
            Fires onClipChange callback
            ↓
            Preview updates videoRef.src to match
            ↓
            Preloads clip after next (if exists)
```

### Playhead Scrubbing Sequence

```
User drags playhead to new position
    ↓
Timeline updates projectStore.playheadPosition
    ↓
Preview useEffect detects playheadPosition change
    ↓
Checks: was this change external? (not from TimelinePlayer)
    ↓
If external and not playing:
    ↓
    TimelinePlayer.seek(newPosition) called
        ↓
        Finds clip at newPosition
        ↓
        Is it same clip as current?
        ├─> Same clip: Just seek within video
        └─> Different clip: Load new clip
            ↓
            Update video source
            ↓
            Seek to correct position
            ↓
            Fire onClipChange
            ↓
            Update videoRef in Preview
```

## State Synchronization

Three separate state systems must remain synchronized:

### 1. playerStore (Playback Controls)
- `isPlaying`: Boolean controlling play/pause
- `volume`: 0-1 range for audio level
- `playbackRate`: 0.25-2.0 for speed control
- `currentTime`: Current video element time (for display)

### 2. projectStore (Timeline State)
- `playheadPosition`: Current position on timeline (seconds)
- `currentProject`: Timeline structure with tracks and clips
- `selectedClipId`: Currently selected clip (for editing)

### 3. TimelinePlayer (Internal State)
- `currentClip`: Active clip being played
- `currentMedia`: Media file for active clip
- `isPlaying`: Internal playing state
- `currentPlayheadPosition`: Internal playhead tracking
- `preloadClip`: Next clip being preloaded

### Synchronization Rules

1. **playerStore.isPlaying → TimelinePlayer**
   - Preview listens to playerStore.isPlaying
   - When changed, calls TimelinePlayer.play() or pause()

2. **TimelinePlayer → projectStore.playheadPosition**
   - During playback, TimelinePlayer updates playheadPosition via callback
   - Prevents feedback loop using isUserSeekingRef flag

3. **projectStore.playheadPosition → TimelinePlayer**
   - When user scrubs playhead externally, Preview calls TimelinePlayer.seek()
   - Only if not currently playing (to avoid interrupting playback)

4. **Volume/Rate Sync**
   - Preview listens to playerStore.volume and playbackRate
   - Updates both TimelinePlayer and visible videoRef

## Video Element Management

### Why Two Hidden Video Elements?

TimelinePlayer uses two hidden `<video>` elements:

1. **currentVideo**: Plays the active clip
   - User hears audio from this element
   - TimelinePlayer reads currentTime from this element
   - This is the "source of truth" for playback state

2. **nextVideo**: Preloads upcoming clip
   - Loads next clip 1 second before transition
   - Muted (volume = 0)
   - Ready to become currentVideo when transition happens

3. **videoRef** (in Preview): Displays video to user
   - Synced with currentVideo source and time
   - Visible in the UI
   - Not used for playback control (just display)

This architecture allows for:
- Faster clip transitions (next clip already loaded)
- Clean separation between display and playback logic
- Potential future enhancement: crossfade transitions

## Trim Point Calculation

When playing a trimmed clip, the video element must seek to the correct position within the original media file.

### Formula

```
Given:
- playheadPosition: Current position on timeline (e.g., 15 seconds)
- clip.startTime: Where clip begins on timeline (e.g., 10 seconds)
- clip.trimStart: How much to trim from media start (e.g., 3 seconds)

Calculate:
offsetInClip = playheadPosition - clip.startTime
             = 15 - 10
             = 5 seconds (into the clip)

videoTime = clip.trimStart + offsetInClip
          = 3 + 5
          = 8 seconds (in original media file)
```

### Example

Original media: 60 second video
Timeline clip: Starts at 10s, ends at 30s (20s duration)
Trim: First 5s trimmed, last 10s trimmed

```
Timeline view:
  0s        10s                          30s
  |---------|==========================|
            ^ clip.startTime

Original media view (60s total):
  0s   5s                 45s        60s
  |----|--------------------|----------|
       ^ trimStart          ^ after trimEnd
       ^ video starts here

When playhead is at 15s on timeline:
- offsetInClip = 15 - 10 = 5s
- videoTime = 5 + 5 = 10s in original media
- This is correct: we skip 5s trim, then play 5s into usable portion
```

## Performance Considerations

### requestAnimationFrame Loop

The playback loop runs at ~60fps:

```typescript
const updateLoop = (timestamp: number) => {
  // Calculate delta time since last frame
  const deltaTime = (timestamp - lastUpdateTime) / 1000;

  // Read current video time
  const videoTime = currentVideo.currentTime;

  // Calculate timeline position
  const timelineTime = clip.startTime + (videoTime - clip.trimStart);

  // Update projectStore
  setPlayheadPosition(timelineTime);

  // Check for clip boundary
  if (timelineTime >= clip.endTime) {
    transitionToNextClip();
  }

  // Schedule next frame
  requestAnimationFrame(updateLoop);
};
```

### Memory Management

- Hidden video elements remain in DOM for entire session
- For long editing sessions with many clips, this could accumulate memory
- Future optimization: Reuse single hidden element, swap sources dynamically
- Current implementation prioritizes speed over memory efficiency (acceptable for MVP)

### Preloading Strategy

Preload triggered when: `clip.endTime - playheadPosition < 1.0`

This gives 1 second of buffer time to load the next clip. On slower systems or with large files, this may not be enough. Future improvements:
- Dynamic preload timing based on file size
- Preload when user pauses near clip boundary
- Cache decoded frames for instant transitions

## Edge Cases Handled

1. **No Clip at Playhead**: Shows "No clip at playhead position" message
2. **Empty Timeline**: Shows "No clips on timeline" message
3. **Gap Between Clips**: Pauses playback, user must manually seek past gap
4. **Trim Bounds**: Clamps videoTime to valid range (trimStart to duration - trimEnd)
5. **End of Timeline**: Pauses playback, fires onPlaybackEnd callback
6. **Clip Removed During Playback**: TimelinePlayer.updateProject() handles timeline changes
7. **Seek While Playing**: Prevents feedback loop with isUserSeekingRef flag

## Future Enhancements

### Seamless Transitions
Currently there's a small gap during transitions. To improve:
- Use MediaSource API to stitch clips at byte level
- Use Canvas API to composite and capture as single stream
- Pre-render transition frames for instant switching

### Multi-Track Compositing
For picture-in-picture and overlays:
- Render Track 0 as background
- Overlay Track 1 at specified position/size
- Composite using Canvas API or WebGL
- Output composite stream to MediaRecorder for export

### Caching
- Cache decoded frames near playhead position
- LRU cache for recently played clips
- Preload thumbnails for scrubbing preview

### Audio Mixing
- Mix audio from multiple tracks
- Fade in/out at clip boundaries
- Volume envelopes per clip
- Master volume control

## Debugging Tips

### Enable Console Logging

Add logs to TimelinePlayer:

```typescript
console.log('[TimelinePlayer] Playing clip:', clip.id, 'at position:', playheadPosition);
console.log('[TimelinePlayer] Video time:', videoTime, 'Timeline time:', timelineTime);
console.log('[TimelinePlayer] Transitioning to next clip:', nextClip?.id);
```

### Inspect State

In browser console:

```javascript
// Check player state
usePlayerStore.getState()

// Check timeline state
useProjectStore.getState()

// Check current clip
document.querySelector('video').currentTime
document.querySelector('video').src
```

### Common Issues

**Issue**: Video doesn't play
- Check: Is there a clip at playheadPosition?
- Check: Does media file exist at path?
- Check: Is file:// URL formatted correctly?

**Issue**: Playhead doesn't move during playback
- Check: Is TimelinePlayer.isPlaying true?
- Check: Is requestAnimationFrame loop running?
- Check: Is onPlayheadUpdate callback firing?

**Issue**: Transitions are jumpy
- Check: Is nextVideo preloaded?
- Check: Network speed for large files
- Increase preload time (< 2.0 instead of < 1.0)

**Issue**: Audio out of sync
- Check: playbackRate is same across all videos
- Check: volume settings
- Browser video element issue (try different codec)

## Conclusion

The TimelinePlayer architecture provides a robust foundation for multi-clip video playback. By separating playback logic from display logic and using intelligent preloading, it achieves near-seamless transitions suitable for a 72-hour MVP. Future enhancements can build on this foundation to achieve professional-grade playback quality.
