# Audio Support Tasks - Part 4: Advanced Audio Features (Groups G-H)

**Part:** 4 of 5
**Contains:** Group G (Web Audio API Integration), Group H (Advanced Audio Controls)
**Previous:** [Part 3: Waveform Support](./audio_support_tasks_part3.md) | **Next:** [Part 5: Export Features](./audio_support_tasks_part5.md)
**Index:** [Task Index](./audio_support_tasks_index.md)

---

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

---

**Continue to:** [Part 5: Export with Cut Ranges (Group I)](./audio_support_tasks_part5.md)
