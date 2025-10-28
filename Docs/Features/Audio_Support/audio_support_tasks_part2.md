# Audio Support Tasks - Part 2: Audio Track Support (Groups C-D)

**Part:** 2 of 5
**Contains:** Group C (Audio Track Support), Group D (ProjectStore Actions)
**Previous:** [Part 1: Core Architecture](./audio_support_tasks_part1.md) | **Next:** [Part 3: Waveform Support](./audio_support_tasks_part3.md)
**Index:** [Task Index](./audio_support_tasks_index.md)

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

**Continue to:** [Part 3: Waveform Support (Groups E-F)](./audio_support_tasks_part3.md)
