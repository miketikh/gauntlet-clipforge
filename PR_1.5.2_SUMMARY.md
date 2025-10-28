# PR 1.5.2 Complete: Multi-Clip Timeline Playback (Composition Rendering)

## Changes Made

Implemented multi-clip timeline playback system that enables seamless video playback across multiple clips on the timeline. The new TimelinePlayer service acts as a sophisticated playback engine that manages clip transitions, preloading, and synchronization with the timeline state.

**Key Implementation Details:**

1. **TimelinePlayer Service** (`src/renderer/services/TimelinePlayer.ts`):
   - Manages playback across multiple clips on Track 0 (main track)
   - Uses hidden video elements for current playback and preloading next clip
   - Implements intelligent clip switching when playhead crosses clip boundaries
   - Handles trim points correctly: `videoTime = clip.trimStart + (playheadPosition - clip.startTime)`
   - Preloads next clip 1 second before transition to minimize loading delays
   - Pauses playback when gaps are detected between clips (>0.1 seconds)
   - Provides callback system for playhead updates, clip changes, and playback end events

2. **Updated Preview Component** (`src/renderer/components/Preview.tsx`):
   - Replaced direct video element control with TimelinePlayer instance
   - Maintains single video element for display (TimelinePlayer manages hidden elements)
   - Syncs player state with playerStore and projectStore
   - Handles external playhead scrubbing (user drags playhead while paused)
   - Displays appropriate messages: "No clips on timeline" vs "No clip at playhead position"
   - Shows both current video time and timeline position in controls

3. **Playback Features:**
   - Continuous playback through multiple clips end-to-end
   - Smooth playhead motion during playback (updated via requestAnimationFrame)
   - Automatic pause at timeline end or when gap detected
   - Seek support: jump to any timeline position and correct clip loads
   - Volume and playback rate sync across clip transitions
   - Keyboard shortcuts work across all clips (Space, arrows, J/K/L)

## How to Test

### Basic Multi-Clip Playback
1. Launch ClipForge (`npm start`)
2. Import 3 video files via drag-and-drop or Import button
3. Drag all 3 clips to Track 1 (main track), placing them end-to-end with no gaps
4. Move playhead to beginning (click on timeline ruler at 0:00)
5. Press **Space** or click **Play** button
6. **Expected:** Playback starts with first clip and automatically transitions to second clip, then third clip
7. **Expected:** Playhead moves smoothly across timeline during playback
8. **Expected:** Video/audio continues without interruption during transitions (small gap may be visible but should be brief)

### Clip Transition Testing
1. With 3 clips on timeline, start playback
2. Watch the transition from clip 1 → clip 2
3. **Expected:** Video switches to second clip's content at the boundary
4. **Expected:** Timeline position and video display stay in sync
5. Watch transition from clip 2 → clip 3
6. **Expected:** Third clip plays automatically
7. Let playback reach end of timeline
8. **Expected:** Playback pauses automatically at end

### Playhead Scrubbing During Multi-Clip Timeline
1. With 3 clips on timeline, ensure playback is **paused**
2. Click on timeline ruler in the middle of clip 2
3. **Expected:** Playhead jumps to that position
4. **Expected:** Preview displays frame from clip 2 at correct position
5. Press Space to play from that position
6. **Expected:** Playback continues from middle of clip 2, then plays clip 3

### Keyboard Navigation
1. With clips on timeline, press **Space** to play
2. Press **J** to seek backward 1 second
3. **Expected:** Playback pauses and playhead moves back 1s (may switch to previous clip if near boundary)
4. Press **L** to seek forward 1 second
5. **Expected:** Playhead moves forward 1s
6. Press **ArrowLeft** to seek backward 5 seconds
7. **Expected:** Playhead moves back 5s (works across clip boundaries)

### Gap Handling
1. Add 2 clips to timeline with a 3-second gap between them
   - Clip 1: 0:00 to 0:10
   - Gap: 0:10 to 0:13
   - Clip 2: 0:13 to 0:20
2. Start playback from beginning
3. **Expected:** First clip plays normally
4. **Expected:** When playhead reaches 0:10 (end of clip 1), playback **pauses**
5. **Expected:** Preview shows "No clip at playhead position" message
6. Manually move playhead to 0:13 (start of clip 2) and press Play
7. **Expected:** Second clip plays normally

### Trim Point Handling
1. Add clip to timeline and trim 3 seconds from start, 2 seconds from end
2. Add second clip immediately after (no gap)
3. Start playback
4. **Expected:** First clip plays from trimmed start point (skips first 3s)
5. **Expected:** First clip ends at trimmed end point (stops 2s before media end)
6. **Expected:** Second clip starts playing immediately after first clip's trimmed end

### Volume and Playback Controls
1. With multiple clips on timeline, start playback
2. Adjust volume slider during playback
3. **Expected:** Volume changes persist across clip transitions
4. Try different playback rates (if PR 1.5.3 is implemented)
5. **Expected:** Playback rate remains consistent across clips

## Known Limitations

1. **Transition Gap**: There may be a brief visual gap (50-200ms) during clip transitions. This is acceptable for the 72-hour MVP. Truly seamless transitions would require MediaSource API or frame-perfect compositing.

2. **Gap Behavior**: When a gap is detected between clips (>0.1 seconds), playback pauses. In a production editor, you might want options to:
   - Skip gaps and continue to next clip
   - Show black frames during gaps
   - Auto-close gaps when clips are added

3. **Track 0 Only**: Currently only plays Track 0 (main track). Multi-track compositing (picture-in-picture) is deferred to future work.

4. **Preloading**: Next clip preloads 1 second before transition. On slower systems or with large video files, this may not be enough time to avoid a visible loading pause. Consider preloading earlier for production.

5. **Seeking Performance**: When scrubbing playhead rapidly, there may be slight lag as video elements seek to new positions. This is due to browser video element seek latency.

6. **Memory**: Hidden video elements remain in DOM throughout session. For very long editing sessions with many clips, consider cleanup strategies to prevent memory buildup.

## Technical Details

### TimelinePlayer Architecture

The TimelinePlayer uses a dual-video-element approach:
- **currentVideo**: Plays the active clip, visible to user
- **nextVideo**: Preloads next clip in hidden element

This allows for faster transitions by having the next video ready to play.

### Clip Position Calculation

For any playhead position on timeline, the correct video time is calculated as:
```typescript
const offsetInClip = playheadPosition - clip.startTime;
const videoTime = clip.trimStart + offsetInClip;
```

This accounts for:
- Where the clip starts on timeline (`clip.startTime`)
- How much of the original media is trimmed from start (`clip.trimStart`)

### Playback Loop

Uses `requestAnimationFrame` for smooth 60fps playhead updates:
1. Read `video.currentTime` from HTML5 video element
2. Calculate corresponding timeline position
3. Check if clip boundary reached
4. If boundary reached, load next clip or pause
5. Update playheadPosition in projectStore
6. Schedule next frame

### State Synchronization

Three layers of state must stay in sync:
1. **playerStore**: isPlaying, volume, playbackRate
2. **projectStore**: playheadPosition, currentProject
3. **TimelinePlayer**: internal playback state and video elements

The Preview component acts as coordinator, listening to all stores and updating TimelinePlayer accordingly.

## Files Changed

- **NEW**: `src/renderer/services/TimelinePlayer.ts` - Multi-clip playback engine (413 lines)
- **MODIFIED**: `src/renderer/components/Preview.tsx` - Integrated TimelinePlayer (389 lines)
- **MODIFIED**: `Tasks/phase_1_core_editor.md` - Marked PR 1.5.2 complete

## Next Up

**PR 1.5.3: Playback Controls & Timeline Synchronization**

This PR will add:
- Playback speed controls (0.25x, 0.5x, 1x, 1.5x, 2x)
- Frame stepping buttons (previous frame / next frame)
- Loop mode for continuous playback
- Progress bar below video for visual seeking
- Additional keyboard shortcuts (0-9 for percentage seeking, M for mute)
- Improved synchronization when timeline is edited during playback

The foundation is now in place for full-featured video playback control!
