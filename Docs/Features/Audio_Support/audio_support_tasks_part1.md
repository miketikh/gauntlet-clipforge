# Audio Support Tasks - Part 1: Core Architecture (Groups A-B)

**Part:** 1 of 5
**Contains:** Overview, Group A (Fix Video Player Bugs), Group B (Data Model Foundation)
**Next Part:** [Part 2: Audio Track Support](./audio_support_tasks_part2.md)
**Index:** [Task Index](./audio_support_tasks_index.md)

---

# Audio Track Support & Playback Bug Fixes - Implementation Tasks

## Context

ClipForge currently has a basic video editor with a critical architectural flaw: it uses a **dual-video architecture** where TimelinePlayer controls a hidden video element and Preview displays a separate video element. These two elements must stay synchronized through callbacks and manual seeking, which creates timing-dependent behavior and race conditions. This is the root cause of playback snap-back and jump bugs.

Additionally, the current data model only supports VIDEO tracks with embedded audio. There's no way to:
- Add audio-only tracks (like background music)
- Manipulate audio independently (mute, volume, fade)
- Store AI-generated metadata (transcripts, cut ranges for filler word removal)
- Visualize audio waveforms

This document provides a structured implementation plan to:
1. **Fix playback bugs** by eliminating the dual-video architecture
2. **Add audio track support** for VIDEO and AUDIO track types
3. **Enable audio manipulation** (mute, volume, fade)
4. **Support AI features** with transcripts and non-destructive cut ranges

## Instructions for AI Agent

**Standard Workflow:**
1. Read all files mentioned in each task before making changes
2. Implement tasks in order (respect dependencies)
3. Mark tasks complete with `[x]` after verification
4. Test manually after each task group
5. Provide completion summary before moving to next group
6. Wait for approval before starting next group

**Critical Guidelines:**
- This is a 72-hour demo project - manual testing only, no unit tests
- Single video element architecture is non-negotiable (eliminates bugs)
- All new model fields must be optional for backward compatibility
- Test in development with `npm start` (NOT `npm run dev`)

---

## CORE TASKS (Priority 1 - Critical Path)

### Group A: Fix Video Player Bugs (BLOCKING ALL OTHER WORK)

**Dependencies:** None
**Estimated Time:** 2-3 hours
**Goal:** Eliminate dual-video architecture causing race conditions and sync bugs

---

#### Task A1: Refactor TimelinePlayer to Accept External Video Element

**Objective:** Change TimelinePlayer from creating its own hidden video elements to accepting an external video element reference

**Files to Modify:**
- `/Users/Gauntlet/gauntlet/videojarvis/src/renderer/services/TimelinePlayer.ts`

**Implementation Steps:**

1. Read the current TimelinePlayer implementation (lines 52-78)
2. Update constructor signature:
   ```typescript
   constructor(
     project: Project,
     callbacks: TimelinePlayerCallbacks,
     videoElement: HTMLVideoElement  // NEW parameter
   )
   ```
3. Remove internal video element creation:
   - Delete lines 64-74 (currentVideo and nextVideo creation)
   - Remove document.body.appendChild calls
4. Replace `this.currentVideo` references:
   - Store the external video element: `this.videoElement = videoElement`
   - Update all `this.currentVideo` usages to `this.videoElement`
5. Remove preloading logic (nextVideo):
   - Delete `this.nextVideo` property
   - Delete `preloadNextClip()` method (lines 382-409)
   - Remove preload calls from playback loop
6. Update `destroy()` method:
   - Remove video element cleanup (lines 577-585)
   - Just pause and cleanup animation frame

**Acceptance Criteria:**
- TimelinePlayer no longer creates internal video elements
- Constructor accepts external video element
- All playback operations use the external element
- No compilation errors

**Testing Notes:**
- Does not compile yet (Preview not updated)
- Will verify after Task A2

**Estimated Time:** 1 hour

---

#### Task A2: Update Preview to Pass Video Element to TimelinePlayer

**Objective:** Refactor Preview component to provide its video element to TimelinePlayer

**Files to Modify:**
- `/Users/Gauntlet/gauntlet/videojarvis/src/renderer/components/Preview.tsx`

**Implementation Steps:**

1. Read current Preview implementation (lines 36-128)
2. Update TimelinePlayer initialization (line 47):
   ```typescript
   // Add check for videoRef.current
   if (!videoRef.current) {
     console.error('[Preview] Video element not ready for TimelinePlayer');
     return;
   }

   const player = new TimelinePlayer(currentProject, {
     onPlayheadUpdate: (position: number) => { /* ... */ },
     onPlaybackEnd: () => { /* ... */ },
     onClipChange: (clip, media) => { /* ... */ }
   }, videoRef.current); // Pass video element
   ```
3. Simplify `onClipChange` callback (lines 56-110):
   - Remove video source loading logic (TimelinePlayer handles this now)
   - Just update state: `setCurrentClip(clip); setCurrentMedia(media);`
4. Remove video sync logic (lines 203-230):
   - Delete the entire useEffect for syncing play/pause
   - TimelinePlayer controls the video element directly now
5. Keep keyboard shortcuts and volume/playback rate controls
6. Remove debounced seek logic (lines 149-180):
   - TimelinePlayer handles seeking, no need to sync

**Acceptance Criteria:**
- Preview passes videoRef.current to TimelinePlayer
- No manual video source loading in Preview
- No sync logic between Preview and TimelinePlayer
- Video plays correctly without snap-back
- Compilation succeeds

**Testing Notes:**
1. Build project: `npm start`
2. Import video and add to timeline
3. Click Play - verify video plays smoothly
4. Drag playhead while playing - verify no snap-back
5. Click to different position - verify immediate seek
6. Play across multiple clips - verify seamless transitions

**Estimated Time:** 1.5 hours

---

#### Task A3: Remove onClipChange Callback (Cleanup)

**Objective:** Simplify TimelinePlayer API by removing unnecessary callback

**Files to Modify:**
- `/Users/Gauntlet/gauntlet/videojarvis/src/renderer/services/TimelinePlayer.ts`
- `/Users/Gauntlet/gauntlet/videojarvis/src/renderer/components/Preview.tsx`

**Implementation Steps:**

1. Remove `onClipChange` from TimelinePlayerCallbacks interface (lines 28-32):
   ```typescript
   export interface TimelinePlayerCallbacks {
     onPlayheadUpdate: (position: number) => void;
     onPlaybackEnd: () => void;
     // REMOVED: onClipChange
   }
   ```
2. Remove all `this.callbacks.onClipChange()` calls in TimelinePlayer:
   - Line 142: Remove clip change notification
   - Line 203: Remove null clip notification
   - Line 295: Remove clip change notification
   - Line 471: Remove black screen notification
3. Update Preview component (line 56):
   - Remove `onClipChange` from callbacks object
4. Remove `currentClip` and `currentMedia` state from Preview (lines 33-34):
   - These are no longer needed since we don't switch sources

**Acceptance Criteria:**
- No onClipChange callback in TimelinePlayer
- Preview simplified without clip state tracking
- Playback still works correctly
- No compilation errors

**Testing Notes:**
1. Verify playback across clips still works
2. Check console for any errors about missing callbacks
3. Confirm video displays correctly

**Estimated Time:** 30 minutes

---

### Group B: Data Model Foundation

**Dependencies:** Group A must be complete
**Estimated Time:** 2-3 hours
**Goal:** Add type definitions for audio properties, track types, and AI metadata

---

#### Task B1: Add MediaType Enum and Update MediaFile Interface

**Objective:** Support audio-only files and make video-specific fields optional

**Files to Modify:**
- `/Users/Gauntlet/gauntlet/videojarvis/src/types/media.ts`

**Implementation Steps:**

1. Read current MediaFile interface (lines 5-16)
2. Add MediaType enum at top of file:
   ```typescript
   /**
    * Type of media file
    */
   export enum MediaType {
     VIDEO = 'video',    // Video with audio
     AUDIO = 'audio',    // Audio only (MP3, WAV, etc.)
     IMAGE = 'image'     // Still image (future use)
   }
   ```
3. Update MediaFile interface:
   ```typescript
   export interface MediaFile {
     id: string;
     path: string;
     filename: string;
     type: MediaType;                    // NEW: Media type
     duration: number;
     resolution?: {                      // CHANGED: Optional for audio
       width: number;
       height: number;
     };
     thumbnail: string;                  // base64 data URL
     fileSize: number;

     // NEW: Audio-specific metadata (optional)
     audioMetadata?: {
       sampleRate: number;              // e.g., 44100, 48000
       channels: number;                // 1 = mono, 2 = stereo
       codec: string;                   // e.g., "aac", "mp3"
     };

     // NEW: Waveform data for visualization (optional)
     waveformData?: number[];           // Amplitude samples (0-1 range)
   }
   ```
4. Update VideoMetadata interface (optional extension for future use):
   ```typescript
   export interface AudioMetadata {
     sampleRate: number;
     channels: number;
     codec: string;
     bitrate: number;
   }
   ```

**Acceptance Criteria:**
- MediaType enum exported
- MediaFile.type field added
- MediaFile.resolution is optional
- audioMetadata and waveformData fields added
- No compilation errors in media.ts

**Testing Notes:**
- Compilation will fail in other files (expected)
- Will fix in subsequent tasks

**Estimated Time:** 30 minutes

---

#### Task B2: Add Audio Properties to TimelineClip

**Objective:** Support volume, mute, fade, and non-destructive cut ranges

**Files to Modify:**
- `/Users/Gauntlet/gauntlet/videojarvis/src/types/timeline.ts`

**Implementation Steps:**

1. Read current TimelineClip interface (lines 15-23)
2. Add CutRangeType enum before TimelineClip:
   ```typescript
   /**
    * Type of cut range (for non-destructive editing)
    */
   export enum CutRangeType {
     FILLER = 'filler',       // Filler word (um, uh, like, etc.)
     SILENCE = 'silence',     // Silent pause
     MANUAL = 'manual'        // User-created cut
   }

   /**
    * A cut range to remove during export (non-destructive)
    */
   export interface CutRange {
     id: string;              // Unique identifier
     start: number;           // Seconds from clip start
     end: number;             // Seconds from clip start
     type: CutRangeType;      // What kind of cut
   }
   ```
3. Update TimelineClip interface:
   ```typescript
   export interface TimelineClip {
     id: string;
     mediaFileId: string;
     trackIndex: number;
     startTime: number;
     endTime: number;
     trimStart: number;
     trimEnd: number;

     // NEW: Audio properties (optional for backward compatibility)
     volume?: number;         // 0-1 range (default 1.0)
     muted?: boolean;         // Mute this clip (default false)
     fadeIn?: number;         // Fade in duration in seconds (default 0)
     fadeOut?: number;        // Fade out duration in seconds (default 0)

     // NEW: Non-destructive cuts for AI features
     cutRanges?: CutRange[];  // Segments to remove during export
   }
   ```

**Acceptance Criteria:**
- CutRangeType enum and CutRange interface added
- TimelineClip has audio properties (optional)
- No breaking changes to existing clips
- No compilation errors

**Testing Notes:**
- Verify existing projects load without errors
- Check that clips without audio properties still work

**Estimated Time:** 30 minutes

---

#### Task B3: Add TrackType Enum and Update Track Interface

**Objective:** Distinguish between VIDEO and AUDIO tracks

**Files to Modify:**
- `/Users/Gauntlet/gauntlet/videojarvis/src/types/timeline.ts`

**Implementation Steps:**

1. Read current Track interface (lines 30-34)
2. Add TrackType enum:
   ```typescript
   /**
    * Type of track
    */
   export enum TrackType {
     VIDEO = 'video',     // Video with audio (default)
     AUDIO = 'audio',     // Audio-only track (background music, etc.)
     OVERLAY = 'overlay'  // Video overlay (picture-in-picture)
   }
   ```
3. Update Track interface:
   ```typescript
   export interface Track {
     id: string;
     name: string;
     clips: TimelineClip[];

     // NEW: Track type and audio properties (optional)
     type?: TrackType;        // Track type (default VIDEO)
     volume?: number;         // Master volume for track (0-1, default 1.0)
     muted?: boolean;         // Mute entire track (default false)
   }
   ```

**Acceptance Criteria:**
- TrackType enum exported
- Track interface has type and audio properties
- Properties are optional for backward compatibility
- No compilation errors

**Testing Notes:**
- Verify existing tracks display correctly
- Check that tracks without type default to VIDEO

**Estimated Time:** 20 minutes

---

#### Task B4: Add Transcript Storage to Project

**Objective:** Store AI-generated transcripts for timeline clips

**Files to Modify:**
- `/Users/Gauntlet/gauntlet/videojarvis/src/types/timeline.ts`

**Implementation Steps:**

1. Read current Project interface (lines 39-44)
2. Add Transcript interfaces:
   ```typescript
   /**
    * Word-level transcript segment
    */
   export interface TranscriptWord {
     word: string;            // The spoken word
     start: number;           // Start time in seconds
     end: number;             // End time in seconds
     confidence?: number;     // 0-1 confidence score (from Whisper)
   }

   /**
    * Complete transcript for a media file
    */
   export interface Transcript {
     mediaFileId: string;     // Which media file this belongs to
     text: string;            // Full text transcript
     words: TranscriptWord[]; // Word-level timestamps
     language?: string;       // Detected language code
     generatedAt: number;     // Timestamp when generated
   }
   ```
3. Update Project interface:
   ```typescript
   export interface Project {
     id: string;
     name: string;
     tracks: Track[];
     duration: number;

     // NEW: AI-generated metadata (optional)
     transcripts?: Record<string, Transcript>;  // Keyed by mediaFileId
   }
   ```

**Acceptance Criteria:**
- TranscriptWord and Transcript interfaces added
- Project has transcripts field (optional)
- Structure supports word-level timestamps
- No compilation errors

**Testing Notes:**
- Verify projects without transcripts still load
- Check that Record<string, Transcript> type works

**Estimated Time:** 20 minutes

---

#### Task B5: Create Migration Utility for Old Projects

**Objective:** Provide utility to upgrade old projects with new fields

**Files to Modify:**
- `/Users/Gauntlet/gauntlet/videojarvis/src/renderer/utils/projectMigration.ts` (NEW FILE)

**Implementation Steps:**

1. Create new file with migration logic:
   ```typescript
   /**
    * Project migration utilities
    * Upgrades old project formats to current schema
    */

   import { Project, Track, TimelineClip, TrackType } from '../../types/timeline';
   import { MediaType } from '../../types/media';

   /**
    * Current schema version
    */
   export const CURRENT_SCHEMA_VERSION = 2;

   /**
    * Migrate a project to the latest schema
    */
   export function migrateProject(project: any): Project {
     // Add schema version if missing
     const schemaVersion = project.schemaVersion || 1;

     // Version 1 -> 2: Add audio properties and track types
     if (schemaVersion < 2) {
       project = migrateV1toV2(project);
     }

     return {
       ...project,
       schemaVersion: CURRENT_SCHEMA_VERSION
     };
   }

   /**
    * V1 -> V2: Add audio properties and track types
    */
   function migrateV1toV2(project: any): any {
     return {
       ...project,
       tracks: project.tracks?.map((track: any) => ({
         ...track,
         type: track.type || TrackType.VIDEO,
         volume: track.volume ?? 1.0,
         muted: track.muted ?? false,
         clips: track.clips?.map((clip: any) => ({
           ...clip,
           volume: clip.volume ?? 1.0,
           muted: clip.muted ?? false,
           fadeIn: clip.fadeIn ?? 0,
           fadeOut: clip.fadeOut ?? 0,
           cutRanges: clip.cutRanges ?? []
         })) || []
       })) || [],
       transcripts: project.transcripts ?? {}
     };
   }

   /**
    * Migrate a MediaFile to the latest schema
    */
   export function migrateMediaFile(media: any): any {
     return {
       ...media,
       type: media.type || MediaType.VIDEO,
       resolution: media.resolution || undefined,
       audioMetadata: media.audioMetadata || undefined,
       waveformData: media.waveformData || undefined
     };
   }
   ```

2. Update projectStore to use migration:
   - Import migrateProject at top of `/Users/Gauntlet/gauntlet/videojarvis/src/renderer/store/projectStore.ts`
   - In persist middleware, add onRehydrateStorage callback:
   ```typescript
   persist(
     (set, get) => ({ /* ... */ }),
     {
       name: 'project-storage',
       onRehydrateStorage: () => (state) => {
         if (state?.currentProject) {
           state.currentProject = migrateProject(state.currentProject);
         }
       }
     }
   )
   ```

**Acceptance Criteria:**
- Migration utility handles old projects
- Default values applied for new fields
- Projects load without errors
- No data loss from old projects

**Testing Notes:**
1. Load an old project (pre-audio support)
2. Verify it upgrades automatically
3. Check that all new fields have defaults
4. Confirm playback still works

**Estimated Time:** 1 hour

---

---

**Continue to:** [Part 2: Audio Track Support (Groups C-D)](./audio_support_tasks_part2.md)
