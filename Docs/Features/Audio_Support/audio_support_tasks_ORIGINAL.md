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

### Group C: Audio Track Support in Timeline

**Dependencies:** Group B must be complete
**Estimated Time:** 3-4 hours
**Goal:** Update UI and playback to handle audio-only clips and tracks

---

#### Task C1: Update Timeline UI to Show Track Types

**Objective:** Visually distinguish VIDEO and AUDIO tracks

**Files to Modify:**
- `/Users/Gauntlet/gauntlet/videojarvis/src/renderer/components/TimelineTrack.tsx`
- `/Users/Gauntlet/gauntlet/videojarvis/src/renderer/components/Timeline.tsx`

**Implementation Steps:**

1. Read TimelineTrack component
2. Update track label to show type:
   ```typescript
   import { TrackType } from '../../types/timeline';

   // In track label render:
   const trackTypeLabel = track.type === TrackType.AUDIO ? '🎵 Audio' : '🎬 Video';

   <div style={{
     /* ... existing styles ... */
     background: track.type === TrackType.AUDIO ? '#1a237e' : '#263238',
   }}>
     <div>{track.name}</div>
     <div style={{ fontSize: '0.65rem', color: '#95a5a6' }}>
       {trackTypeLabel}
     </div>
   </div>
   ```
3. Update clip appearance for audio-only clips:
   - Check if clip's media file is audio-only
   - Use different color scheme: `background: '#311b92'` for audio
   - Show waveform icon or placeholder

**Acceptance Criteria:**
- Audio tracks have different background color
- Track labels show type indicator
- Audio clips visually distinct from video clips
- No compilation errors

**Testing Notes:**
1. Create project with video track
2. Verify track shows video indicator
3. Check colors are distinct

**Estimated Time:** 1 hour

---

#### Task C2: Enable Audio File Import

**Objective:** Support importing MP3, WAV, and other audio formats

**Files to Modify:**
- `/Users/Gauntlet/gauntlet/videojarvis/src/renderer/components/MediaLibrary.tsx` (or wherever import happens)
- Main process file handling imports (likely in `src/main.ts` or separate service)

**Implementation Steps:**

1. Find file import dialog code
2. Update file filter to include audio formats:
   ```typescript
   filters: [
     { name: 'Video Files', extensions: ['mp4', 'mov', 'avi', 'mkv', 'webm'] },
     { name: 'Audio Files', extensions: ['mp3', 'wav', 'aac', 'm4a', 'ogg'] },
     { name: 'All Files', extensions: ['*'] }
   ]
   ```
3. Update media processor to detect audio files:
   - Check file extension
   - Set MediaType.AUDIO for audio files
   - Extract duration and audio metadata
   - Generate waveform thumbnail instead of video thumbnail
4. Update MediaLibrary display:
   - Show audio icon for audio files
   - Display duration and audio format
   - Show waveform preview if available

**Acceptance Criteria:**
- Can import MP3 and WAV files
- Audio files show in media library
- Audio files have correct MediaType.AUDIO
- Thumbnails show audio waveform or icon

**Testing Notes:**
1. Import MP3 file
2. Verify it appears in media library
3. Check thumbnail shows audio indicator
4. Confirm duration is correct

**Estimated Time:** 1.5 hours

---

#### Task C3: Update TimelinePlayer to Handle Audio-Only Clips

**Objective:** Play audio clips without video, handle multiple track types

**Files to Modify:**
- `/Users/Gauntlet/gauntlet/videojarvis/src/renderer/services/TimelinePlayer.ts`

**Implementation Steps:**

1. Read getClipAtPosition method (lines 237-245)
2. Update to detect all clips at playhead (not just Track 0):
   ```typescript
   private getClipsAtPosition(position: number): {
     videoClip: TimelineClip | null;
     audioClips: TimelineClip[];
   } {
     const result = {
       videoClip: null as TimelineClip | null,
       audioClips: [] as TimelineClip[]
     };

     this.project.tracks.forEach(track => {
       const clip = findClipAtPosition(track, position);
       if (!clip) return;

       const trackType = track.type || TrackType.VIDEO;
       if (trackType === TrackType.VIDEO) {
         result.videoClip = clip;
       } else if (trackType === TrackType.AUDIO) {
         result.audioClips.push(clip);
       }
     });

     return result;
   }
   ```
3. Update play() method to handle audio clips:
   - For now, only play video clips (audio mixing in Phase 2)
   - Check if clip is audio-only and skip video element updates
4. Add helper to check if MediaFile is audio:
   ```typescript
   private isAudioOnly(mediaFile: MediaFile): boolean {
     return mediaFile.type === MediaType.AUDIO;
   }
   ```
5. Update loadAndPlayClip to handle audio files:
   - If audio-only, create audio element instead of using video element
   - Store reference: `this.audioElements = new Map<string, HTMLAudioElement>()`
   - Play audio in sync with video playback

**Acceptance Criteria:**
- TimelinePlayer detects audio clips
- Audio clips don't break video playback
- Logs indicate audio clip detection
- No crashes when audio clip encountered

**Testing Notes:**
1. Add audio clip to timeline (AUDIO track)
2. Play timeline with video and audio
3. Verify video plays
4. Check console for audio clip logs
5. Audio doesn't play yet (that's Phase 2)

**Estimated Time:** 1.5 hours

---

#### Task C4: Implement Basic Mute/Volume in Playback

**Objective:** Apply clip-level and track-level mute/volume settings

**Files to Modify:**
- `/Users/Gauntlet/gauntlet/videojarvis/src/renderer/services/TimelinePlayer.ts`

**Implementation Steps:**

1. Update loadAndPlayClip method (around line 298):
   ```typescript
   // After loading video source, before playing

   // Get track for this clip
   const track = this.project.tracks[clip.trackIndex];

   // Calculate effective mute state
   const isClipMuted = clip.muted ?? false;
   const isTrackMuted = track.muted ?? false;
   const effectiveMute = isClipMuted || isTrackMuted;

   // Calculate effective volume
   const clipVolume = clip.volume ?? 1.0;
   const trackVolume = track.volume ?? 1.0;
   const effectiveVolume = clipVolume * trackVolume;

   // Apply to video element
   this.videoElement.muted = effectiveMute;
   this.videoElement.volume = Math.max(0, Math.min(1, effectiveVolume));

   console.log('[TimelinePlayer] Audio settings:', {
     clipVolume, trackVolume, effectiveVolume,
     clipMuted: isClipMuted, trackMuted: isTrackMuted, effectiveMute
   });
   ```
2. Update setVolume() method to respect clip volume:
   - Rename to `setGlobalVolume` to distinguish from clip volume
   - Multiply global volume with clip/track volume

**Acceptance Criteria:**
- Muted clips have no audio
- Volume settings are multiplied (clip × track × global)
- Video element reflects effective mute/volume
- Console logs show audio calculations

**Testing Notes:**
1. Set clip volume to 0.5 in data (manually in React DevTools)
2. Play clip and check volume is quieter
3. Set track muted to true
4. Verify audio is muted
5. Check console logs for correct calculations

**Estimated Time:** 1 hour

---

### Group D: ProjectStore Audio Actions

**Dependencies:** Group B complete
**Estimated Time:** 2 hours
**Goal:** Add state management for transcripts, cut ranges, and audio controls

---

#### Task D1: Add Transcript Management Actions

**Objective:** Store and retrieve transcripts for media files

**Files to Modify:**
- `/Users/Gauntlet/gauntlet/videojarvis/src/renderer/store/projectStore.ts`

**Implementation Steps:**

1. Read projectStore interface (lines 21-43)
2. Add transcript actions to interface:
   ```typescript
   interface ProjectState {
     // ... existing fields ...

     // NEW: Transcript actions
     addTranscript: (mediaFileId: string, transcript: Transcript) => void;
     getTranscript: (mediaFileId: string) => Transcript | undefined;
     removeTranscript: (mediaFileId: string) => void;
     getAllTranscripts: () => Record<string, Transcript>;
   }
   ```
3. Implement actions in store:
   ```typescript
   // Inside create() call:

   addTranscript: (mediaFileId: string, transcript: Transcript) => {
     const state = get();
     if (!state.currentProject) return;

     set({
       currentProject: {
         ...state.currentProject,
         transcripts: {
           ...(state.currentProject.transcripts || {}),
           [mediaFileId]: transcript
         }
       }
     });

     console.log('[ProjectStore] Added transcript for media:', mediaFileId);
   },

   getTranscript: (mediaFileId: string) => {
     const state = get();
     return state.currentProject?.transcripts?.[mediaFileId];
   },

   removeTranscript: (mediaFileId: string) => {
     const state = get();
     if (!state.currentProject?.transcripts) return;

     const newTranscripts = { ...state.currentProject.transcripts };
     delete newTranscripts[mediaFileId];

     set({
       currentProject: {
         ...state.currentProject,
         transcripts: newTranscripts
       }
     });
   },

   getAllTranscripts: () => {
     const state = get();
     return state.currentProject?.transcripts || {};
   }
   ```

**Acceptance Criteria:**
- Can add transcript to project
- Can retrieve transcript by mediaFileId
- Can remove transcript
- Transcripts persist with project
- No compilation errors

**Testing Notes:**
1. Use React DevTools to call addTranscript
2. Verify transcript stored in state
3. Reload app and check persistence
4. Call getTranscript and verify return

**Estimated Time:** 45 minutes

---

#### Task D2: Add Cut Range Management Actions

**Objective:** Manage non-destructive cut ranges on clips

**Files to Modify:**
- `/Users/Gauntlet/gauntlet/videojarvis/src/renderer/store/projectStore.ts`

**Implementation Steps:**

1. Add cut range actions to interface:
   ```typescript
   interface ProjectState {
     // ... existing fields ...

     // NEW: Cut range actions
     addCutRange: (clipId: string, cutRange: Omit<CutRange, 'id'>) => void;
     removeCutRange: (clipId: string, cutRangeId: string) => void;
     getCutRanges: (clipId: string) => CutRange[];
     clearCutRanges: (clipId: string) => void;
   }
   ```
2. Implement actions:
   ```typescript
   addCutRange: (clipId: string, cutRange: Omit<CutRange, 'id'>) => {
     const state = get();
     if (!state.currentProject) return;

     // Generate unique ID for cut range
     const newCutRange: CutRange = {
       ...cutRange,
       id: `cut-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
     };

     // Find and update the clip
     const updatedTracks = state.currentProject.tracks.map(track => ({
       ...track,
       clips: track.clips.map(clip => {
         if (clip.id === clipId) {
           return {
             ...clip,
             cutRanges: [...(clip.cutRanges || []), newCutRange]
           };
         }
         return clip;
       })
     }));

     set({
       currentProject: {
         ...state.currentProject,
         tracks: updatedTracks
       }
     });

     console.log('[ProjectStore] Added cut range to clip:', clipId, newCutRange);
   },

   removeCutRange: (clipId: string, cutRangeId: string) => {
     const state = get();
     if (!state.currentProject) return;

     const updatedTracks = state.currentProject.tracks.map(track => ({
       ...track,
       clips: track.clips.map(clip => {
         if (clip.id === clipId) {
           return {
             ...clip,
             cutRanges: (clip.cutRanges || []).filter(cr => cr.id !== cutRangeId)
           };
         }
         return clip;
       })
     }));

     set({
       currentProject: {
         ...state.currentProject,
         tracks: updatedTracks
       }
     });
   },

   getCutRanges: (clipId: string): CutRange[] => {
     const state = get();
     if (!state.currentProject) return [];

     for (const track of state.currentProject.tracks) {
       const clip = track.clips.find(c => c.id === clipId);
       if (clip) {
         return clip.cutRanges || [];
       }
     }
     return [];
   },

   clearCutRanges: (clipId: string) => {
     get().updateClip(clipId, { cutRanges: [] });
   }
   ```

**Acceptance Criteria:**
- Can add cut range to clip
- Cut ranges have unique IDs
- Can remove specific cut range
- Can get all cut ranges for clip
- Can clear all cut ranges

**Testing Notes:**
1. Use React DevTools to add cut range
2. Verify stored in clip.cutRanges
3. Remove cut range and verify deletion
4. Check persistence after reload

**Estimated Time:** 1 hour

---

#### Task D3: Add Audio Control Actions

**Objective:** Control clip and track audio properties

**Files to Modify:**
- `/Users/Gauntlet/gauntlet/videojarvis/src/renderer/store/projectStore.ts`

**Implementation Steps:**

1. Add audio control actions to interface:
   ```typescript
   interface ProjectState {
     // ... existing fields ...

     // NEW: Audio control actions
     setClipVolume: (clipId: string, volume: number) => void;
     setClipMuted: (clipId: string, muted: boolean) => void;
     setClipFades: (clipId: string, fadeIn: number, fadeOut: number) => void;
     setTrackVolume: (trackId: string, volume: number) => void;
     setTrackMuted: (trackId: string, muted: boolean) => void;
   }
   ```
2. Implement actions using updateClip for clip-level:
   ```typescript
   setClipVolume: (clipId: string, volume: number) => {
     const clampedVolume = Math.max(0, Math.min(1, volume));
     get().updateClip(clipId, { volume: clampedVolume });
     console.log('[ProjectStore] Set clip volume:', clipId, clampedVolume);
   },

   setClipMuted: (clipId: string, muted: boolean) => {
     get().updateClip(clipId, { muted });
     console.log('[ProjectStore] Set clip muted:', clipId, muted);
   },

   setClipFades: (clipId: string, fadeIn: number, fadeOut: number) => {
     get().updateClip(clipId, {
       fadeIn: Math.max(0, fadeIn),
       fadeOut: Math.max(0, fadeOut)
     });
   },

   setTrackVolume: (trackId: string, volume: number) => {
     const state = get();
     if (!state.currentProject) return;

     const clampedVolume = Math.max(0, Math.min(1, volume));
     const updatedTracks = state.currentProject.tracks.map(track =>
       track.id === trackId ? { ...track, volume: clampedVolume } : track
     );

     set({
       currentProject: {
         ...state.currentProject,
         tracks: updatedTracks
       }
     });
   },

   setTrackMuted: (trackId: string, muted: boolean) => {
     const state = get();
     if (!state.currentProject) return;

     const updatedTracks = state.currentProject.tracks.map(track =>
       track.id === trackId ? { ...track, muted } : track
     );

     set({
       currentProject: {
         ...state.currentProject,
         tracks: updatedTracks
       }
     });
   }
   ```

**Acceptance Criteria:**
- Can set clip volume (clamped 0-1)
- Can mute/unmute clips
- Can set fade in/out durations
- Can set track volume
- Can mute/unmute tracks
- Values persist after reload

**Testing Notes:**
1. Call setClipVolume with 0.5
2. Verify clip.volume updated
3. Call setTrackMuted(true)
4. Verify track.muted updated
5. Play clip and confirm audio reflects changes

**Estimated Time:** 45 minutes

---

## SECONDARY TASKS (Priority 2 - Enhancements)

### Group E: Waveform Support

**Dependencies:** Group B complete
**Estimated Time:** 3-4 hours
**Goal:** Extract and visualize audio waveforms

---

#### Task E1: Create WaveformExtractor Service

**Objective:** Extract audio waveform data using Web Audio API

**Files to Create:**
- `/Users/Gauntlet/gauntlet/videojarvis/src/renderer/services/WaveformExtractor.ts`

**Implementation Steps:**

1. Create new service file:
   ```typescript
   /**
    * Waveform Extractor Service
    * Extracts audio waveform data for visualization
    * Uses Web Audio API for client-side processing
    */

   export interface WaveformConfig {
     sampleCount?: number;  // Number of amplitude samples (default: 1000)
     channel?: number;      // Which audio channel (0 = left, 1 = right, -1 = average)
   }

   export class WaveformExtractor {
     private audioContext: AudioContext;

     constructor() {
       this.audioContext = new AudioContext();
     }

     /**
      * Extract waveform from audio/video file
      */
     async extract(filePath: string, config: WaveformConfig = {}): Promise<number[]> {
       const sampleCount = config.sampleCount || 1000;
       const channel = config.channel ?? -1; // Default: average both channels

       try {
         // Read file as ArrayBuffer
         const response = await fetch(`file://${filePath}`);
         const arrayBuffer = await response.arrayBuffer();

         // Decode audio data
         const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

         // Extract raw PCM data
         const rawData = this.getRawData(audioBuffer, channel);

         // Downsample to desired sample count
         const samples = this.downsample(rawData, sampleCount);

         // Normalize to 0-1 range
         return this.normalize(samples);

       } catch (error) {
         console.error('[WaveformExtractor] Failed to extract waveform:', error);
         throw error;
       }
     }

     /**
      * Get raw PCM data from audio buffer
      */
     private getRawData(audioBuffer: AudioBuffer, channel: number): Float32Array {
       const channelCount = audioBuffer.numberOfChannels;

       if (channel === -1) {
         // Average all channels
         const length = audioBuffer.length;
         const result = new Float32Array(length);

         for (let i = 0; i < length; i++) {
           let sum = 0;
           for (let c = 0; c < channelCount; c++) {
             sum += audioBuffer.getChannelData(c)[i];
           }
           result[i] = sum / channelCount;
         }

         return result;
       } else {
         // Single channel
         return audioBuffer.getChannelData(Math.min(channel, channelCount - 1));
       }
     }

     /**
      * Downsample raw data to target sample count
      */
     private downsample(data: Float32Array, targetCount: number): number[] {
       const blockSize = Math.floor(data.length / targetCount);
       const result: number[] = [];

       for (let i = 0; i < targetCount; i++) {
         const start = i * blockSize;
         const end = Math.min(start + blockSize, data.length);

         // Take max absolute value in this block (for better visual representation)
         let max = 0;
         for (let j = start; j < end; j++) {
           max = Math.max(max, Math.abs(data[j]));
         }

         result.push(max);
       }

       return result;
     }

     /**
      * Normalize samples to 0-1 range
      */
     private normalize(samples: number[]): number[] {
       const max = Math.max(...samples);
       if (max === 0) return samples.map(() => 0);

       return samples.map(s => s / max);
     }

     /**
      * Clean up resources
      */
     destroy(): void {
       this.audioContext.close();
     }
   }
   ```

**Acceptance Criteria:**
- WaveformExtractor class created
- Can decode audio from file
- Returns normalized amplitude array
- Works with both audio and video files
- No memory leaks

**Testing Notes:**
1. Create instance of WaveformExtractor
2. Call extract() with video file path
3. Verify returns array of 1000 numbers (0-1 range)
4. Check console for errors
5. Test with audio-only file

**Estimated Time:** 2 hours

---

#### Task E2: Extract Waveform During Media Import

**Objective:** Generate waveform data when media is imported

**Files to Modify:**
- Media import service (find file that handles imports)
- `/Users/Gauntlet/gauntlet/videojarvis/src/renderer/store/mediaStore.ts`

**Implementation Steps:**

1. Find media import handler (likely in main process or renderer)
2. Add waveform extraction step:
   ```typescript
   import { WaveformExtractor } from '../services/WaveformExtractor';

   // After video metadata extraction
   const waveformExtractor = new WaveformExtractor();
   try {
     console.log('[MediaImport] Extracting waveform...');
     const waveformData = await waveformExtractor.extract(filePath, {
       sampleCount: 1000
     });

     mediaFile.waveformData = waveformData;
     console.log('[MediaImport] Waveform extracted:', waveformData.length, 'samples');
   } catch (error) {
     console.warn('[MediaImport] Failed to extract waveform:', error);
     // Continue without waveform (non-critical)
   } finally {
     waveformExtractor.destroy();
   }
   ```
3. Update progress indicator to show waveform extraction
4. Store waveform in MediaFile

**Acceptance Criteria:**
- Waveform extracted during import
- MediaFile has waveformData populated
- Import shows progress ("Extracting waveform...")
- Import succeeds even if waveform fails
- Waveform cached in project

**Testing Notes:**
1. Import new video file
2. Check console for waveform extraction log
3. Verify MediaFile.waveformData has ~1000 samples
4. Import audio file and verify same
5. Test import still works if waveform fails

**Estimated Time:** 1.5 hours

---

#### Task E3: Render Waveforms on Timeline Clips

**Objective:** Draw waveform visualization on timeline clips

**Files to Modify:**
- `/Users/Gauntlet/gauntlet/videojarvis/src/renderer/components/TimelineClipView.tsx`

**Implementation Steps:**

1. Read TimelineClipView component
2. Add waveform rendering canvas:
   ```typescript
   import { useMediaStore } from '../store/mediaStore';

   // Inside component:
   const canvasRef = useRef<HTMLCanvasElement>(null);
   const mediaStore = useMediaStore();

   // Get media file for this clip
   const mediaFile = mediaStore.mediaFiles.find(m => m.id === clip.mediaFileId);
   const waveformData = mediaFile?.waveformData;

   // Draw waveform when component mounts or data changes
   useEffect(() => {
     if (!canvasRef.current || !waveformData) return;

     const canvas = canvasRef.current;
     const ctx = canvas.getContext('2d');
     if (!ctx) return;

     // Set canvas size to match clip width
     const width = canvas.offsetWidth;
     const height = canvas.offsetHeight;
     canvas.width = width;
     canvas.height = height;

     // Clear canvas
     ctx.clearRect(0, 0, width, height);

     // Draw waveform
     const barWidth = width / waveformData.length;
     const centerY = height / 2;

     ctx.fillStyle = 'rgba(52, 152, 219, 0.6)'; // Blue with transparency

     waveformData.forEach((amplitude, index) => {
       const x = index * barWidth;
       const barHeight = amplitude * centerY * 0.9; // 90% of half height

       // Draw bar from center outward (symmetrical)
       ctx.fillRect(x, centerY - barHeight, barWidth, barHeight * 2);
     });

   }, [waveformData, clip.startTime, clip.endTime]);

   // In JSX:
   <div style={{ /* clip container */ }}>
     <canvas
       ref={canvasRef}
       style={{
         position: 'absolute',
         top: 0,
         left: 0,
         width: '100%',
         height: '100%',
         pointerEvents: 'none',
         opacity: 0.5
       }}
     />
     {/* ... rest of clip content ... */}
   </div>
   ```

**Acceptance Criteria:**
- Waveform renders on clips
- Waveform scales with clip width
- Waveform shows during scrubbing
- Performance is acceptable (no lag)
- Falls back gracefully if no waveform data

**Testing Notes:**
1. Add clip with waveform to timeline
2. Verify waveform renders as blue bars
3. Zoom in/out and verify scaling
4. Drag clip and verify waveform moves
5. Test clip without waveform data

**Estimated Time:** 1.5 hours

---

### Group F: Multiple Audio Tracks UI

**Dependencies:** Group C complete
**Estimated Time:** 3 hours
**Goal:** Support multiple audio tracks in timeline UI

---

#### Task F1: Add "Add Audio Track" Button

**Objective:** Allow users to add dedicated audio tracks

**Files to Modify:**
- `/Users/Gauntlet/gauntlet/videojarvis/src/renderer/components/Timeline.tsx`
- `/Users/Gauntlet/gauntlet/videojarvis/src/renderer/store/projectStore.ts`

**Implementation Steps:**

1. Add action to projectStore:
   ```typescript
   interface ProjectState {
     // ... existing ...
     addTrack: (type: TrackType, name?: string) => void;
   }

   // Implementation:
   addTrack: (type: TrackType, name?: string) => {
     const state = get();
     if (!state.currentProject) return;

     const trackIndex = state.currentProject.tracks.length;
     const defaultName = type === TrackType.AUDIO
       ? `Audio ${trackIndex}`
       : `Track ${trackIndex}`;

     const newTrack: Track = {
       id: `track-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
       name: name || defaultName,
       type,
       clips: [],
       volume: 1.0,
       muted: false
     };

     set({
       currentProject: {
         ...state.currentProject,
         tracks: [...state.currentProject.tracks, newTrack]
       }
     });

     console.log('[ProjectStore] Added track:', newTrack.name, type);
   }
   ```
2. Add button to Timeline header:
   ```typescript
   import { TrackType } from '../../types/timeline';

   // In Timeline component:
   const handleAddAudioTrack = () => {
     useProjectStore.getState().addTrack(TrackType.AUDIO);
   };

   // In header JSX:
   <button
     onClick={handleAddAudioTrack}
     style={{
       padding: '6px 12px',
       background: '#1a237e',
       color: 'white',
       border: 'none',
       borderRadius: '4px',
       cursor: 'pointer',
       fontSize: '0.8rem'
     }}
   >
     + Add Audio Track
   </button>
   ```

**Acceptance Criteria:**
- Button appears in timeline header
- Clicking adds audio track
- Audio track appears below video tracks
- Track has correct type and name
- No compilation errors

**Testing Notes:**
1. Click "Add Audio Track" button
2. Verify new track appears
3. Check track type is AUDIO
4. Verify track has empty clips array
5. Add multiple audio tracks

**Estimated Time:** 1 hour

---

#### Task F2: Enable Drag-and-Drop to Audio Tracks

**Objective:** Allow dragging audio files to audio tracks

**Files to Modify:**
- `/Users/Gauntlet/gauntlet/videojarvis/src/renderer/components/TimelineTrack.tsx`

**Implementation Steps:**

1. Read TimelineTrack drop handler
2. Add validation for track type:
   ```typescript
   import { MediaType } from '../../types/media';
   import { TrackType } from '../../types/timeline';

   // In drop handler:
   const handleDrop = (item: DraggedItem, monitor: DropTargetMonitor) => {
     // ... existing position calculation ...

     if (item.type === 'MEDIA_ITEM') {
       // Get media file
       const mediaFile = mediaStore.mediaFiles.find(m => m.id === item.mediaFileId);
       if (!mediaFile) return;

       // Validate track type compatibility
       const trackType = track.type || TrackType.VIDEO;

       if (trackType === TrackType.AUDIO && mediaFile.type !== MediaType.AUDIO) {
         alert('Cannot add video files to audio tracks. Use a video track instead.');
         return;
       }

       if (trackType === TrackType.VIDEO && mediaFile.type === MediaType.AUDIO) {
         alert('Cannot add audio-only files to video tracks. Add an audio track first.');
         return;
       }

       // Proceed with add
       projectStore.addClipToTrack(item.mediaFileId, trackIndex, dropPosition);
     }
   };
   ```

**Acceptance Criteria:**
- Can drag audio files to audio tracks
- Cannot drag video files to audio tracks
- Cannot drag audio files to video tracks
- Shows clear error messages
- Valid drops work correctly

**Testing Notes:**
1. Drag audio file to audio track - should work
2. Drag video file to audio track - should show error
3. Drag audio file to video track - should show error
4. Verify clips appear in correct tracks

**Estimated Time:** 1 hour

---

#### Task F3: Update Timeline to Show Multiple Audio Tracks

**Objective:** Render all tracks including multiple audio tracks

**Files to Modify:**
- `/Users/Gauntlet/gauntlet/videojarvis/src/renderer/components/Timeline.tsx`

**Implementation Steps:**

1. Read track rendering code (lines 274-283)
2. Verify all tracks render (should already work)
3. Add visual grouping:
   ```typescript
   // Group tracks by type
   const videoTracks = currentProject?.tracks.filter(t =>
     (t.type || TrackType.VIDEO) === TrackType.VIDEO
   ) || [];

   const audioTracks = currentProject?.tracks.filter(t =>
     t.type === TrackType.AUDIO
   ) || [];

   // Render with section headers
   <div ref={tracksContainerRef} style={{ position: 'relative' }}>
     {/* Video Tracks Section */}
     {videoTracks.length > 0 && (
       <>
         <div style={{
           padding: '8px 20px',
           background: '#1a1a1a',
           color: '#95a5a6',
           fontSize: '0.75rem',
           fontWeight: 600
         }}>
           VIDEO TRACKS
         </div>
         {videoTracks.map((track, index) => (
           <TimelineTrack key={track.id} track={track} trackIndex={index} {...otherProps} />
         ))}
       </>
     )}

     {/* Audio Tracks Section */}
     {audioTracks.length > 0 && (
       <>
         <div style={{
           padding: '8px 20px',
           background: '#1a1a1a',
           color: '#95a5a6',
           fontSize: '0.75rem',
           fontWeight: 600,
           marginTop: '8px'
         }}>
           AUDIO TRACKS
         </div>
         {audioTracks.map((track, index) => (
           <TimelineTrack
             key={track.id}
             track={track}
             trackIndex={videoTracks.length + index}
             {...otherProps}
           />
         ))}
       </>
     )}
   </div>
   ```

**Acceptance Criteria:**
- All tracks render correctly
- Video and audio tracks visually separated
- Section headers show track types
- Scrolling works with many tracks
- No layout issues

**Testing Notes:**
1. Create 2 video tracks and 2 audio tracks
2. Verify section headers appear
3. Check tracks are grouped correctly
4. Scroll timeline and verify layout
5. Add clips to different tracks

**Estimated Time:** 1 hour

---

### Group G: Web Audio API Integration (Advanced)

**Dependencies:** Group C complete
**Estimated Time:** 5-6 hours
**Goal:** Mix multiple audio sources with smooth fades

---

#### Task G1: Create AudioMixer Service

**Objective:** Mix multiple audio sources using Web Audio API

**Files to Create:**
- `/Users/Gauntlet/gauntlet/videojarvis/src/renderer/services/AudioMixer.ts`

**Implementation Steps:**

1. Create new service:
   ```typescript
   /**
    * Audio Mixer Service
    * Mixes multiple audio sources using Web Audio API
    * Supports volume control, fading, and ducking
    */

   import { TimelineClip, Track } from '../../types/timeline';
   import { MediaFile } from '../../types/media';

   export interface AudioSource {
     id: string;              // Clip ID
     element: HTMLMediaElement;  // Audio or video element
     gainNode: GainNode;      // For volume control
     fadeNode: GainNode;      // For fade in/out
     startTime: number;       // When to start in timeline
     endTime: number;         // When to end in timeline
     clipVolume: number;      // Clip volume setting
     trackVolume: number;     // Track volume setting
   }

   export class AudioMixer {
     private audioContext: AudioContext;
     private masterGain: GainNode;
     private sources: Map<string, AudioSource>;

     constructor() {
       this.audioContext = new AudioContext();
       this.masterGain = this.audioContext.createGain();
       this.masterGain.connect(this.audioContext.destination);
       this.sources = new Map();
     }

     /**
      * Add an audio source to the mix
      */
     addSource(
       clipId: string,
       element: HTMLMediaElement,
       clip: TimelineClip,
       track: Track
     ): AudioSource {
       // Create gain nodes for volume control
       const gainNode = this.audioContext.createGain();
       const fadeNode = this.audioContext.createGain();

       // Connect: source → gainNode → fadeNode → masterGain → output
       const sourceNode = this.audioContext.createMediaElementSource(element);
       sourceNode.connect(gainNode);
       gainNode.connect(fadeNode);
       fadeNode.connect(this.masterGain);

       // Calculate effective volume
       const clipVolume = clip.volume ?? 1.0;
       const trackVolume = track.volume ?? 1.0;
       gainNode.gain.value = clipVolume * trackVolume;

       const source: AudioSource = {
         id: clipId,
         element,
         gainNode,
         fadeNode,
         startTime: clip.startTime,
         endTime: clip.endTime,
         clipVolume,
         trackVolume
       };

       this.sources.set(clipId, source);
       console.log('[AudioMixer] Added source:', clipId);

       return source;
     }

     /**
      * Remove an audio source
      */
     removeSource(clipId: string): void {
       const source = this.sources.get(clipId);
       if (!source) return;

       // Disconnect nodes
       source.gainNode.disconnect();
       source.fadeNode.disconnect();

       this.sources.delete(clipId);
       console.log('[AudioMixer] Removed source:', clipId);
     }

     /**
      * Update volume for a source
      */
     setSourceVolume(clipId: string, volume: number): void {
       const source = this.sources.get(clipId);
       if (!source) return;

       source.gainNode.gain.value = volume;
     }

     /**
      * Apply fade in effect
      */
     applyFadeIn(clipId: string, duration: number): void {
       const source = this.sources.get(clipId);
       if (!source || duration <= 0) return;

       const now = this.audioContext.currentTime;
       const fadeNode = source.fadeNode;

       // Start from 0, ramp to 1 over duration
       fadeNode.gain.setValueAtTime(0, now);
       fadeNode.gain.linearRampToValueAtTime(1, now + duration);

       console.log('[AudioMixer] Applied fade in:', clipId, duration);
     }

     /**
      * Apply fade out effect
      */
     applyFadeOut(clipId: string, duration: number): void {
       const source = this.sources.get(clipId);
       if (!source || duration <= 0) return;

       const now = this.audioContext.currentTime;
       const fadeNode = source.fadeNode;

       // Start from 1, ramp to 0 over duration
       fadeNode.gain.setValueAtTime(1, now);
       fadeNode.gain.linearRampToValueAtTime(0, now + duration);

       console.log('[AudioMixer] Applied fade out:', clipId, duration);
     }

     /**
      * Set master volume
      */
     setMasterVolume(volume: number): void {
       this.masterGain.gain.value = Math.max(0, Math.min(1, volume));
     }

     /**
      * Resume audio context (required after user interaction)
      */
     async resume(): Promise<void> {
       if (this.audioContext.state === 'suspended') {
         await this.audioContext.resume();
       }
     }

     /**
      * Clean up resources
      */
     destroy(): void {
       this.sources.forEach(source => {
         source.gainNode.disconnect();
         source.fadeNode.disconnect();
       });
       this.sources.clear();
       this.masterGain.disconnect();
       this.audioContext.close();
     }
   }
   ```

**Acceptance Criteria:**
- AudioMixer class created
- Can add/remove audio sources
- Gain nodes connected correctly
- Volume control works
- Fade in/out implemented
- No audio distortion

**Testing Notes:**
- Will test after integration with TimelinePlayer

**Estimated Time:** 3 hours

---

#### Task G2: Integrate AudioMixer with TimelinePlayer

**Objective:** Use AudioMixer for all audio playback

**Files to Modify:**
- `/Users/Gauntlet/gauntlet/videojarvis/src/renderer/services/TimelinePlayer.ts`

**Implementation Steps:**

1. Import AudioMixer
2. Add AudioMixer instance to TimelinePlayer:
   ```typescript
   private audioMixer: AudioMixer;

   constructor(...) {
     // ... existing code ...
     this.audioMixer = new AudioMixer();
   }
   ```
3. Update loadAndPlayClip to use AudioMixer:
   ```typescript
   private async loadAndPlayClip(clip: TimelineClip): Promise<void> {
     // ... existing loading code ...

     // Get track
     const track = this.project.tracks[clip.trackIndex];

     // Add to audio mixer
     this.audioMixer.addSource(clip.id, this.videoElement, clip, track);

     // Apply fades if configured
     if (clip.fadeIn && clip.fadeIn > 0) {
       this.audioMixer.applyFadeIn(clip.id, clip.fadeIn);
     }

     // Schedule fade out (when close to end)
     if (clip.fadeOut && clip.fadeOut > 0) {
       const clipDuration = clip.endTime - clip.startTime;
       const fadeOutStartTime = clipDuration - clip.fadeOut;

       setTimeout(() => {
         this.audioMixer.applyFadeOut(clip.id, clip.fadeOut!);
       }, fadeOutStartTime * 1000);
     }
   }
   ```
4. Update destroy to cleanup mixer:
   ```typescript
   destroy(): void {
     // ... existing code ...
     this.audioMixer.destroy();
   }
   ```

**Acceptance Criteria:**
- TimelinePlayer uses AudioMixer
- Audio plays through Web Audio API
- Fades work smoothly
- Multiple sources can mix
- No audio glitches

**Testing Notes:**
1. Play clip with fade in/out settings
2. Verify smooth audio fades
3. Check console for AudioMixer logs
4. Test volume changes during playback
5. Verify master volume control works

**Estimated Time:** 2-3 hours

---

### Group H: Advanced Audio Controls (Polish)

**Dependencies:** Group D complete
**Estimated Time:** 3-4 hours
**Goal:** Add UI controls for volume, mute, fade

---

#### Task H1: Add Volume Slider to Timeline Clips

**Objective:** Per-clip volume control in timeline

**Files to Modify:**
- `/Users/Gauntlet/gauntlet/videojarvis/src/renderer/components/TimelineClipView.tsx`

**Implementation Steps:**

1. Add volume control to clip context menu or overlay:
   ```typescript
   const [showVolumeControl, setShowVolumeControl] = useState(false);

   const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
     const volume = parseFloat(e.target.value);
     useProjectStore.getState().setClipVolume(clip.id, volume);
   };

   // Add volume button to clip UI:
   <button
     onClick={(e) => {
       e.stopPropagation();
       setShowVolumeControl(!showVolumeControl);
     }}
     style={{
       position: 'absolute',
       top: '4px',
       right: '4px',
       background: 'rgba(0,0,0,0.6)',
       border: 'none',
       color: 'white',
       borderRadius: '3px',
       padding: '4px 8px',
       fontSize: '0.7rem',
       cursor: 'pointer'
     }}
     title="Volume"
   >
     🔊
   </button>

   {showVolumeControl && (
     <div style={{
       position: 'absolute',
       top: '30px',
       right: '4px',
       background: '#2c3e50',
       padding: '8px',
       borderRadius: '4px',
       zIndex: 100
     }}>
       <input
         type="range"
         min="0"
         max="1"
         step="0.01"
         value={clip.volume ?? 1.0}
         onChange={handleVolumeChange}
         style={{ width: '100px' }}
       />
       <div style={{ color: 'white', fontSize: '0.65rem', marginTop: '4px' }}>
         {Math.round((clip.volume ?? 1.0) * 100)}%
       </div>
     </div>
   )}
   ```

**Acceptance Criteria:**
- Volume button appears on clip
- Clicking shows volume slider
- Slider updates clip.volume
- Volume persists after close
- UI is visually clear

**Testing Notes:**
1. Click volume button on clip
2. Adjust slider
3. Play clip and verify volume change
4. Close and reopen slider - verify value persists

**Estimated Time:** 1.5 hours

---

#### Task H2: Add Track-Level Mute/Solo Buttons

**Objective:** Mute or solo entire tracks

**Files to Modify:**
- `/Users/Gauntlet/gauntlet/videojarvis/src/renderer/components/TimelineTrack.tsx`

**Implementation Steps:**

1. Add buttons to track label:
   ```typescript
   const handleMute = () => {
     useProjectStore.getState().setTrackMuted(track.id, !(track.muted ?? false));
   };

   // In track label JSX:
   <div style={{ /* track label container */ }}>
     <div style={{ /* track name */ }}>{track.name}</div>

     <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
       <button
         onClick={handleMute}
         style={{
           padding: '2px 8px',
           background: track.muted ? '#e74c3c' : '#34495e',
           color: 'white',
           border: 'none',
           borderRadius: '3px',
           fontSize: '0.65rem',
           cursor: 'pointer'
         }}
         title={track.muted ? 'Unmute' : 'Mute'}
       >
         {track.muted ? '🔇' : '🔊'}
       </button>

       {/* Volume indicator */}
       <span style={{
         fontSize: '0.65rem',
         color: '#95a5a6',
         alignSelf: 'center'
       }}>
         {Math.round((track.volume ?? 1.0) * 100)}%
       </span>
     </div>
   </div>
   ```

**Acceptance Criteria:**
- Mute button appears on each track
- Button shows current mute state
- Clicking toggles track mute
- Visual feedback when muted
- Muted tracks have no audio during playback

**Testing Notes:**
1. Click mute on track
2. Play clips on that track
3. Verify no audio
4. Unmute and verify audio returns
5. Test with multiple tracks

**Estimated Time:** 1 hour

---

#### Task H3: Add Fade In/Out Duration Controls

**Objective:** Set fade durations for clips

**Files to Modify:**
- `/Users/Gauntlet/gauntlet/videojarvis/src/renderer/components/TimelineClipView.tsx`

**Implementation Steps:**

1. Add fade controls to clip settings:
   ```typescript
   const [showFadeControls, setShowFadeControls] = useState(false);

   const handleFadeInChange = (e: React.ChangeEvent<HTMLInputElement>) => {
     const fadeIn = parseFloat(e.target.value);
     const fadeOut = clip.fadeOut ?? 0;
     useProjectStore.getState().setClipFades(clip.id, fadeIn, fadeOut);
   };

   const handleFadeOutChange = (e: React.ChangeEvent<HTMLInputElement>) => {
     const fadeIn = clip.fadeIn ?? 0;
     const fadeOut = parseFloat(e.target.value);
     useProjectStore.getState().setClipFades(clip.id, fadeIn, fadeOut);
   };

   // Add to clip UI (next to volume button):
   <button
     onClick={(e) => {
       e.stopPropagation();
       setShowFadeControls(!showFadeControls);
     }}
     style={{ /* similar to volume button */ }}
     title="Fade In/Out"
   >
     ↔️
   </button>

   {showFadeControls && (
     <div style={{ /* similar to volume control panel */ }}>
       <div style={{ marginBottom: '8px' }}>
         <label style={{ color: 'white', fontSize: '0.65rem' }}>Fade In (s)</label>
         <input
           type="number"
           min="0"
           max="5"
           step="0.1"
           value={clip.fadeIn ?? 0}
           onChange={handleFadeInChange}
           style={{ width: '60px', marginLeft: '4px' }}
         />
       </div>
       <div>
         <label style={{ color: 'white', fontSize: '0.65rem' }}>Fade Out (s)</label>
         <input
           type="number"
           min="0"
           max="5"
           step="0.1"
           value={clip.fadeOut ?? 0}
           onChange={handleFadeOutChange}
           style={{ width: '60px', marginLeft: '4px' }}
         />
       </div>
     </div>
   )}
   ```

**Acceptance Criteria:**
- Fade button appears on clip
- Panel shows fade in/out inputs
- Values update clip properties
- Fades apply during playback
- Values persist

**Testing Notes:**
1. Set fade in to 1.0 seconds
2. Play clip and verify audio fades in
3. Set fade out to 2.0 seconds
4. Verify audio fades out before clip ends
5. Test with Web Audio API integration

**Estimated Time:** 1.5 hours

---

### Group I: Export with Cut Ranges (Advanced)

**Dependencies:** Group B complete
**Estimated Time:** 4-5 hours
**Goal:** Apply non-destructive cuts during video export

---

#### Task I1: Generate FFmpeg Filter for Cut Ranges

**Objective:** Create FFmpeg filter command to remove cut segments

**Files to Create:**
- `/Users/Gauntlet/gauntlet/videojarvis/src/renderer/utils/ffmpegFilters.ts`

**Implementation Steps:**

1. Create utility for FFmpeg filter generation:
   ```typescript
   /**
    * FFmpeg filter generation utilities
    * Generates complex filter chains for video editing
    */

   import { TimelineClip, CutRange } from '../../types/timeline';

   /**
    * Generate trim and concat filter for cut ranges
    * Returns FFmpeg filter_complex string
    */
   export function generateCutRangeFilter(
     clip: TimelineClip,
     cutRanges: CutRange[],
     mediaDuration: number
   ): string | null {
     if (!cutRanges || cutRanges.length === 0) {
       return null;
     }

     // Sort cut ranges by start time
     const sortedCuts = [...cutRanges].sort((a, b) => a.start - b.start);

     // Merge overlapping ranges
     const mergedCuts = mergeOverlappingRanges(sortedCuts);

     // Build segments to keep (inverse of cuts)
     const segments = buildKeepSegments(clip, mergedCuts, mediaDuration);

     if (segments.length === 0) {
       throw new Error('All content would be cut from clip');
     }

     // Generate filter string
     const videoFilters: string[] = [];
     const audioFilters: string[] = [];

     segments.forEach((segment, index) => {
       const { start, end } = segment;

       // Video trim
       videoFilters.push(
         `[0:v]trim=start=${start}:end=${end},setpts=PTS-STARTPTS[v${index}]`
       );

       // Audio trim
       audioFilters.push(
         `[0:a]atrim=start=${start}:end=${end},asetpts=PTS-STARTPTS[a${index}]`
       );
     });

     // Concat filters
     const vInputs = segments.map((_, i) => `[v${i}]`).join('');
     const aInputs = segments.map((_, i) => `[a${i}]`).join('');
     const vConcat = `${vInputs}concat=n=${segments.length}:v=1:a=0[vout]`;
     const aConcat = `${aInputs}concat=n=${segments.length}:v=0:a=1[aout]`;

     // Combine all filters
     return [...videoFilters, ...audioFilters, vConcat, aConcat].join('; ');
   }

   /**
    * Merge overlapping cut ranges
    */
   function mergeOverlappingRanges(ranges: CutRange[]): CutRange[] {
     if (ranges.length <= 1) return ranges;

     const merged: CutRange[] = [ranges[0]];

     for (let i = 1; i < ranges.length; i++) {
       const current = ranges[i];
       const last = merged[merged.length - 1];

       if (current.start <= last.end) {
         // Overlapping - merge
         last.end = Math.max(last.end, current.end);
       } else {
         // Not overlapping - add new
         merged.push(current);
       }
     }

     return merged;
   }

   /**
    * Build segments to keep (inverse of cut ranges)
    */
   function buildKeepSegments(
     clip: TimelineClip,
     cutRanges: CutRange[],
     mediaDuration: number
   ): Array<{ start: number; end: number }> {
     const segments: Array<{ start: number; end: number }> = [];

     const clipStart = clip.trimStart;
     const clipEnd = mediaDuration - clip.trimEnd;

     let currentStart = clipStart;

     for (const cut of cutRanges) {
       const cutStart = clipStart + cut.start;
       const cutEnd = clipStart + cut.end;

       // Add segment before cut
       if (currentStart < cutStart) {
         segments.push({ start: currentStart, end: cutStart });
       }

       // Skip the cut segment
       currentStart = cutEnd;
     }

     // Add final segment after last cut
     if (currentStart < clipEnd) {
       segments.push({ start: currentStart, end: clipEnd });
     }

     return segments;
   }
   ```

**Acceptance Criteria:**
- Function generates valid FFmpeg filter
- Handles single cut range
- Handles multiple cut ranges
- Merges overlapping ranges
- Returns null if no cuts

**Testing Notes:**
- Will test during export integration
- Verify FFmpeg filter syntax

**Estimated Time:** 2 hours

---

#### Task I2: Apply Cut Range Filters During Export

**Objective:** Use generated filters in video export process

**Files to Modify:**
- Export service (find file that handles FFmpeg export)

**Implementation Steps:**

1. Find video export function
2. Import filter generator
3. Apply filters to clips with cut ranges:
   ```typescript
   import { generateCutRangeFilter } from '../utils/ffmpegFilters';

   // In export function, for each clip:
   const cutRanges = clip.cutRanges || [];

   if (cutRanges.length > 0) {
     console.log('[Export] Applying cut ranges to clip:', clip.id);

     const filterString = generateCutRangeFilter(clip, cutRanges, mediaFile.duration);

     if (filterString) {
       // Add filter_complex to FFmpeg command
       ffmpegCommand.push('-filter_complex', filterString);
       ffmpegCommand.push('-map', '[vout]', '-map', '[aout]');
     }
   } else {
     // No cuts - use standard trim
     ffmpegCommand.push('-ss', clip.trimStart.toString());
     ffmpegCommand.push('-to', (mediaFile.duration - clip.trimEnd).toString());
   }
   ```
4. Test FFmpeg command execution
5. Handle errors gracefully

**Acceptance Criteria:**
- Cut ranges applied during export
- FFmpeg command includes filter_complex
- Export succeeds with cuts
- Output video has segments removed
- Audio stays in sync

**Testing Notes:**
1. Add cut range to clip (manually in store)
2. Export project
3. Check FFmpeg command in console
4. Verify output video is shorter
5. Play output and confirm segments removed
6. Verify audio/video sync

**Estimated Time:** 2-3 hours

---

## Summary

### Total Estimated Time
- **Core Tasks (Priority 1):** 9-11 hours
  - Group A (Fix Bugs): 2-3 hours
  - Group B (Data Models): 2-3 hours
  - Group C (Audio Tracks): 3-4 hours
  - Group D (ProjectStore): 2 hours

- **Secondary Tasks (Priority 2):** 18-22 hours
  - Group E (Waveforms): 3-4 hours
  - Group F (Multi-Track UI): 3 hours
  - Group G (Web Audio): 5-6 hours
  - Group H (Controls): 3-4 hours
  - Group I (Export): 4-5 hours

### Implementation Order

**Phase 1 (Must Complete First):**
1. Group A - Fix video player bugs (BLOCKING)
2. Group B - Data model foundation
3. Group C - Audio track support
4. Group D - ProjectStore actions

**Phase 2 (Enhancements):**
5. Group E - Waveform extraction and display
6. Group F - Multiple audio tracks UI
7. Group G - Web Audio API mixing
8. Group H - Advanced controls
9. Group I - Export with cut ranges

### Key Success Metrics

**Phase 1 Complete When:**
- No playback snap-back or sync bugs
- Can import audio files
- Can add AUDIO tracks to timeline
- Can mute and adjust volume on clips
- Data model supports AI features

**Phase 2 Complete When:**
- Waveforms render on timeline
- Can mix multiple audio tracks
- Smooth audio fades work
- Export applies cut ranges
- Professional audio controls

---

## Related Documents

- `/Users/Gauntlet/gauntlet/videojarvis/Docs/enhanced_app_with_audio_plan.md` - Source architecture plan
- `/Users/Gauntlet/gauntlet/videojarvis/CLAUDE.md` - Project guidelines
- `/Users/Gauntlet/gauntlet/videojarvis/src/types/timeline.ts` - Timeline type definitions
- `/Users/Gauntlet/gauntlet/videojarvis/src/types/media.ts` - Media type definitions

---

**Last Updated:** October 28, 2025
**Document Version:** 1.0
**Status:** Ready for implementation
