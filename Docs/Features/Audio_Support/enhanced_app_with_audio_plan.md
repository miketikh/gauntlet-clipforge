# Enhanced App Architecture with Audio Support

**Date:** October 28, 2025
**Status:** Planning
**Purpose:** Redesign ClipForge architecture to support audio manipulation, AI features, and fix playback bugs

---

## Overview

This document outlines the architectural changes needed to transform ClipForge from a simple video editor into an AI-powered video editor with audio manipulation capabilities. The current implementation assumes single-track video playback with embedded audio, but the product requirements call for:

- **Audio extraction and visualization** - Display audio waveform from video clips
- **Independent audio control** - Mute video, adjust audio volume separately
- **Non-destructive editing** - Cut filler words and silence without re-encoding
- **AI audio features** - Transcription, filler word removal, silence detection
- **Background music** (future) - Add music layer below video audio

Additionally, this redesign fixes critical playback bugs caused by dual-video architecture and race conditions.

---

## Current Architecture Problems

### 1. Data Model Limitations

**Problem:** Current types don't support audio manipulation or AI features

- `TimelineClip` has no volume, mute, or fade properties
- No concept of "cut ranges" for non-destructive edits (needed for filler word removal)
- No storage for transcripts or AI analysis results
- `MediaFile` assumes all media is video (no audio-only files)
- No waveform data for visualization

### 2. Playback Architecture Issues

**Problem:** Dual-video architecture causes sync bugs and race conditions

- TimelinePlayer uses hidden video element for playback control
- Preview component uses separate display video element
- Both must stay in sync via callbacks and manual seeking
- Creates timing-dependent behavior (race conditions)
- No support for playing audio independently of video

**Root Cause of Current Bugs:**
- Debounced seek (50ms delay) races with play button
- Circular state updates between RAF loop and React effects
- No unified video element = sync issues

### 3. Missing Audio Capabilities

**Problem:** Cannot manipulate audio independently of video

- No way to mute video track
- No way to adjust audio volume per clip
- No Web Audio API integration for mixing
- No waveform visualization
- Cannot add audio-only tracks (background music)

---

## Goals

### Primary Goals (Phase 1)
1. **Fix playback bugs** by eliminating dual-video architecture
2. **Support AI audio features** by adding data model for transcripts and cut ranges
3. **Enable audio visualization** by storing waveform data
4. **Independent audio control** - mute/volume/fade per clip

### Secondary Goals (Phase 2)
1. **Multi-track audio** - Background music layer support
2. **Web Audio API integration** - Mix multiple audio sources
3. **Audio ducking** - Lower music during speech
4. **Enhanced timeline UI** - Waveform rendering, volume envelopes

---

## Phase 1: Core Architecture Redesign

**Estimated Effort:** 6-8 hours
**Priority:** Critical (fixes bugs + enables AI features)

### 1.1 Type System Updates

**Objective:** Add audio properties and AI metadata to data models

**Files to Modify:**
- `src/types/media.ts`
- `src/types/timeline.ts`
- `src/types/project.ts` (if exists, otherwise add to timeline.ts)

**Changes Needed:**

#### MediaFile Enhancements
- Add `MediaType` enum: `VIDEO`, `AUDIO`, `IMAGE`
- Add optional `audioMetadata` field (sample rate, channels, codec)
- Add optional `waveformData` field (array of amplitude samples)
- Make `resolution` field optional (audio files don't have resolution)

#### TimelineClip Enhancements
- Add `volume` property (0-1 range, default 1.0)
- Add `fadeIn` duration (seconds)
- Add `fadeOut` duration (seconds)
- Add `muted` boolean flag
- Add `cutRanges` array for non-destructive edits:
  ```
  cutRanges: Array<{
    start: number;      // Seconds from clip start
    end: number;        // Seconds from clip end
    type: 'filler' | 'silence' | 'manual';
  }>
  ```

#### Track Enhancements
- Add `TrackType` enum: `VIDEO`, `AUDIO`, `OVERLAY`
- Add `type` property to Track interface
- Add optional `volume` property (master volume for track)
- Add optional `muted` boolean (mute entire track)

#### Project Enhancements
- Add `transcripts` field: `Record<string, Transcript>` (keyed by mediaFileId)
- Add `prosodyAnalysis` field for AI analysis results (Phase 3)

**Migration Strategy:**
- All new fields are optional for backward compatibility
- Add migration utility to upgrade old projects on load
- Default values: volume=1.0, muted=false, cutRanges=[]

---

### 1.2 Unified Video Architecture

**Objective:** Eliminate dual-video sync issues by using single video element

**Files to Modify:**
- `src/renderer/services/TimelinePlayer.ts`
- `src/renderer/components/Preview.tsx`

**Current Architecture (Problematic):**
```
TimelinePlayer (hidden <video>)  ← Playback control
    ↓ (callbacks)
Preview (<video> display)        ← Visual display
    ↓ (manual sync via seek)
```

**New Architecture (Unified):**
```
Preview (<video> element)
    ↓ (passed as ref)
TimelinePlayer (controls Preview's video directly)
```

**Key Changes:**

#### TimelinePlayer Refactor
- Constructor accepts `videoElement: HTMLVideoElement` parameter
- Remove `currentVideo` and `nextVideo` internal elements
- Use provided video element for all playback operations
- Remove `onClipChange` callback (no longer needed)
- Direct control eliminates sync issues

#### Preview Component Refactor
- Pass `videoRef.current` to TimelinePlayer on initialization
- Remove manual seek synchronization logic
- Remove debounced seek effect (no longer needed)
- Simplify to pure display component

**Benefits:**
- Eliminates race conditions between seek and play
- No more dual-video sync issues
- Single source of truth for video state
- Simpler code, fewer moving parts

---

### 1.3 ProjectStore Enhancements

**Objective:** Add state management for audio properties and AI metadata

**Files to Modify:**
- `src/renderer/stores/projectStore.ts`

**New Actions to Add:**

#### Transcript Management
- `addTranscript(mediaFileId, transcript)` - Store Whisper API results
- `getTranscript(mediaFileId)` - Retrieve cached transcript
- `clearTranscript(mediaFileId)` - Remove transcript

#### Cut Range Management
- `addCutRange(clipId, range)` - Add filler word or silence cut
- `removeCutRange(clipId, rangeId)` - Undo a cut
- `getCutRanges(clipId)` - Get all cuts for a clip
- `applyCutRanges(clipId)` - Preview cuts (optional)

#### Audio Control
- `setClipVolume(clipId, volume)` - Adjust clip volume
- `setClipFade(clipId, fadeIn, fadeOut)` - Configure fades
- `muteClip(clipId, muted)` - Toggle clip mute
- `muteTrack(trackId, muted)` - Toggle track mute

**Persistence:**
- All new fields automatically persisted via Zustand persist middleware
- No changes to persistence logic needed (already saves entire state)

---

### 1.4 Waveform Data Extraction

**Objective:** Extract and store audio waveform for visualization

**Files to Modify:**
- `src/renderer/services/WaveformExtractor.ts` (new file)
- `src/renderer/stores/projectStore.ts` (add action)

**Implementation Approach:**

#### Option A: Web Audio API (Client-side)
- Decode audio using `AudioContext.decodeAudioData()`
- Sample PCM data to ~500-1000 points per clip
- Store in `MediaFile.waveformData`
- Fast, no external dependencies

#### Option B: FFmpeg (Server-side)
- Use `ffmpeg -i video.mp4 -filter_complex showwavespic output.png`
- Parse image or extract raw PCM data
- More accurate, but slower

**Recommendation:** Option A (Web Audio API) for MVP

**New Service:**
```
WaveformExtractor.extract(mediaFile)
  ↓
Returns: number[] (amplitude samples)
  ↓
Store in: MediaFile.waveformData
```

**Integration Point:**
- Called during media import (after file is added to library)
- Progress indicator during extraction
- Cached in project file for reuse

---

### 1.5 Export with Cut Ranges

**Objective:** Apply non-destructive cuts during video export

**Files to Modify:**
- `src/main/services/VideoExporter.ts` (or wherever FFmpeg export logic lives)

**FFmpeg Strategy for Cut Ranges:**

When exporting a clip with cut ranges, generate FFmpeg filter to remove segments:

```
Example: Clip with 3 cut ranges
- Original: 0s-30s
- Cut 1: 5s-7s (filler word "um")
- Cut 2: 12s-13s (silence)
- Cut 3: 20s-22s (filler word "like")

FFmpeg Command:
ffmpeg -i input.mp4 \
  -filter_complex \
  "[0:v]trim=0:5,setpts=PTS-STARTPTS[v1]; \
   [0:v]trim=7:12,setpts=PTS-STARTPTS[v2]; \
   [0:v]trim=13:20,setpts=PTS-STARTPTS[v3]; \
   [0:v]trim=22:30,setpts=PTS-STARTPTS[v4]; \
   [v1][v2][v3][v4]concat=n=4:v=1:a=0[vout]; \
   [0:a]atrim=0:5,asetpts=PTS-STARTPTS[a1]; \
   [0:a]atrim=7:12,asetpts=PTS-STARTPTS[a2]; \
   [0:a]atrim=13:20,asetpts=PTS-STARTPTS[a3]; \
   [0:a]atrim=22:30,asetpts=PTS-STARTPTS[a4]; \
   [a1][a2][a3][a4]concat=n=4:v=0:a=1[aout]" \
  -map "[vout]" -map "[aout]" output.mp4
```

**Implementation:**
- Generate filter strings dynamically based on `clip.cutRanges`
- Sort cut ranges by start time
- Build trim and concat filter chains
- Apply to both video and audio streams

**Testing:**
- Test with single cut range
- Test with multiple cut ranges
- Test with overlapping ranges (should merge)
- Verify audio stays in sync with video

---

### 1.6 Audio Control in Timeline Player

**Objective:** Support mute, volume, fade during playback

**Files to Modify:**
- `src/renderer/services/TimelinePlayer.ts`

**Implementation:**

#### Mute Support
- Check `clip.muted` or `track.muted` before playing
- If muted, set `videoElement.muted = true`
- Otherwise, set `videoElement.muted = false`

#### Volume Support
- Apply `clip.volume` using `videoElement.volume = clip.volume`
- Clamp to 0-1 range
- Update dynamically if user changes volume during playback

#### Fade In/Out Support (Phase 2)
- Requires Web Audio API for smooth fading
- Defer to Phase 2 (not critical for MVP)

**Simple Implementation (No Web Audio API Yet):**
```
Before playing clip:
  videoElement.muted = clip.muted || track.muted
  videoElement.volume = clip.volume ?? 1.0
```

**Note:** This approach works for basic mute/volume but doesn't support:
- Smooth fades (requires Web Audio API)
- Multiple audio sources (requires audio mixing)
- Audio-only tracks (requires separate audio elements)

These features are deferred to Phase 2.

---

## Phase 2: Advanced Audio Features

**Estimated Effort:** 8-10 hours
**Priority:** Medium (post-MVP gate)

### 2.1 Web Audio API Integration

**Objective:** Enable audio mixing, fades, and multi-source playback

**Files to Modify:**
- `src/renderer/services/TimelinePlayer.ts`
- `src/renderer/services/AudioMixer.ts` (new file)

**Architecture:**

```
Video Element (muted)
    ↓
  Video frames → Preview display

Audio Source (video audio)
    ↓
GainNode (clip volume)
    ↓
GainNode (fade in/out)
    ↓
Master Gain Node
    ↓
AudioContext destination → Speakers

Background Music Element
    ↓
Audio Source (music)
    ↓
GainNode (ducking during speech)
    ↓
Master Gain Node
```

**Key Capabilities:**
- Mix multiple audio sources
- Smooth volume fades
- Audio ducking (lower music during speech)
- Independent audio/video control

**Implementation:**
- Create `AudioContext` on TimelinePlayer initialization
- Connect video element audio to Web Audio API
- Apply volume and fade effects via GainNodes
- Disconnect default video audio output

---

### 2.2 Multi-Track Audio Support

**Objective:** Support background music and audio-only tracks

**Files to Modify:**
- `src/renderer/components/Timeline.tsx`
- `src/renderer/services/TimelinePlayer.ts`

**Requirements:**
- Add audio-only clips to timeline (MP3, WAV files)
- Render audio-only tracks visually distinct from video tracks
- Play background music simultaneously with video
- Mix all audio sources through Web Audio API

**UI Changes:**
- Audio-only tracks show waveform only (no video preview)
- Different color scheme for audio tracks
- Volume controls per track

---

### 2.3 Waveform Visualization

**Objective:** Render audio waveforms on timeline clips

**Files to Modify:**
- `src/renderer/components/Timeline.tsx`
- `src/renderer/components/WaveformRenderer.tsx` (new component)

**Rendering Approach:**
- Use Canvas API to draw waveform
- Read from `MediaFile.waveformData`
- Scale to clip width
- Color code by amplitude
- Sync with zoom level

**Visual Indicators:**
- Cut ranges shown as red overlay on waveform
- Filler words marked with yellow highlights
- Silence regions shown in gray

---

### 2.4 Audio Ducking

**Objective:** Automatically lower background music during speech

**Files to Modify:**
- `src/renderer/services/AudioMixer.ts`

**Implementation:**
- Use transcript timestamps to identify speech segments
- During speech, ramp music GainNode down to 0.2 (20% volume)
- During silence, ramp music GainNode up to 1.0 (100% volume)
- Use `GainNode.gain.linearRampToValueAtTime()` for smooth transitions

**Configuration:**
- Ducking amount (default: 80% reduction)
- Ramp time (default: 0.2 seconds)
- User toggle to enable/disable ducking

---

## Phase 3: Enhanced Timeline UI

**Estimated Effort:** 4-6 hours
**Priority:** Low (polish)

### 3.1 Volume Envelopes

**Objective:** Visual volume curves on timeline clips

**Files to Modify:**
- `src/renderer/components/Timeline.tsx`
- `src/renderer/components/VolumeEnvelope.tsx` (new component)

**Features:**
- Bezier curve showing volume over time
- Click to add keyframes
- Drag keyframes to adjust volume at specific timestamps

---

### 3.2 Audio Markers

**Objective:** Visual indicators for silence, filler words, and cuts

**Files to Modify:**
- `src/renderer/components/Timeline.tsx`

**Visual Design:**
- Red bars for cut ranges
- Yellow highlights for filler words
- Gray bars for silence regions
- Click to preview or remove

---

## Implementation Order

### Week 1 (Before MVP Gate - Tuesday 10:59 PM)
1. ✅ Type system updates (1 hour)
2. ✅ Unified video architecture (3 hours)
3. ✅ ProjectStore enhancements (1 hour)
4. ✅ Basic audio control (mute/volume) (1 hour)

**Result:** Playback bugs fixed, ready for AI features

### Week 2 (After MVP Gate - By Wednesday 10:59 PM)
1. ✅ Waveform extraction (2 hours)
2. ✅ Export with cut ranges (2 hours)
3. ✅ Waveform visualization (3 hours)
4. 🔄 Web Audio API integration (4 hours)
5. 🔄 Multi-track audio support (3 hours)

**Result:** Full AI audio features working, professional timeline

### Future Enhancements
- Audio ducking
- Volume envelopes
- Enhanced audio markers
- Audio effects (EQ, compression)

---

## Success Metrics

### Phase 1 Success Criteria
- ✅ No playback snap-back or jump bugs
- ✅ Can mute video clip
- ✅ Can adjust clip volume
- ✅ Transcripts stored in project
- ✅ Cut ranges applied during export
- ✅ Waveform data extracted and cached

### Phase 2 Success Criteria
- ✅ Background music plays with video
- ✅ Multiple audio sources mix properly
- ✅ Waveforms render on timeline
- ✅ Smooth volume fades work
- ✅ Audio ducking during speech

---

## Risk Mitigation

### Technical Risks

**Risk:** Web Audio API browser compatibility
- **Mitigation:** Chromium-based Electron, full support guaranteed

**Risk:** FFmpeg cut range complexity
- **Mitigation:** Start with single cuts, add multi-cut support iteratively

**Risk:** Waveform extraction performance
- **Mitigation:** Background worker, progress indicator, caching

### Timeline Risks

**Risk:** MVP deadline too tight for full Phase 1
- **Mitigation:** Prioritize unified video architecture (fixes bugs), defer waveforms to Phase 2

**Risk:** Phase 2 too ambitious for final deadline
- **Mitigation:** Focus on core audio features (mute/volume), defer ducking and envelopes

---

## Dependencies

### External Libraries
- **FFmpeg** - Already integrated, used for export
- **Web Audio API** - Built into Chromium, no install needed
- **OpenAI Whisper API** - For transcription (Phase 3)

### Internal Components
- ProjectStore (Zustand) - Already exists
- TimelinePlayer - Needs refactor
- Preview component - Needs simplification
- Timeline UI - Needs waveform renderer

---

## Notes

### Architectural Philosophy

This redesign follows these principles:

1. **Single Source of Truth** - One video element, one playhead position, one state store
2. **Unidirectional Data Flow** - Store → Components → Player, no circular updates
3. **Non-Destructive Editing** - All cuts are metadata, original files unchanged
4. **Progressive Enhancement** - Phase 1 works without Phase 2, Phase 2 enhances Phase 1

### Key Design Decisions

**Why unified video architecture?**
- Eliminates root cause of 90% of current bugs
- Simpler mental model (one video = one state)
- Easier to test and debug

**Why cut ranges instead of splitting clips?**
- Non-destructive (can undo)
- Faster (no file I/O)
- Export-time processing (preview is instant)

**Why Web Audio API for mixing?**
- Native browser support in Electron
- Professional-grade audio mixing
- Real-time effects without re-encoding

**Why waveform caching?**
- Extraction is expensive (1-2 seconds per minute of video)
- Waveform doesn't change, only needs extraction once
- Improves timeline render performance

---

## Open Questions

1. **Waveform resolution:** How many sample points per clip?
   - **Proposal:** 500-1000 points, scales with zoom level

2. **Audio-only import:** Should we support importing standalone MP3/WAV files?
   - **Proposal:** Yes, Phase 2 feature for background music

3. **Real-time cut preview:** Should cuts apply during playback or only during export?
   - **Proposal:** Export-only for MVP (simpler), real-time in Phase 3

4. **Volume envelope complexity:** Keyframes vs. simple fade in/out?
   - **Proposal:** Simple fades for Phase 2, keyframes in Phase 3+

---

## Related Documents

- `Docs/product_prd.md` - Full product requirements
- `Docs/product_overview.md` - Project overview and goals
- `Tasks/phase_1_core_editor.md` - Phase 1 implementation tasks
- `Tasks/phase_3_ai_features.md` - AI audio features (transcription, filler words)
- `Docs/Bugs/fix_timeline_issues.md` - Current playback bug analysis

---

**Last Updated:** October 28, 2025
**Next Review:** After Phase 1 implementation
