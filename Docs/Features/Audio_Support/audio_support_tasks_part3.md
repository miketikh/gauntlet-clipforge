# Audio Support Tasks - Part 3: Waveform Support (Groups E-F)

**Part:** 3 of 5
**Contains:** Group E (Waveform Support), Group F (Multiple Audio Tracks UI)
**Previous:** [Part 2: Audio Track Support](./audio_support_tasks_part2.md) | **Next:** [Part 4: Web Audio API](./audio_support_tasks_part4.md)
**Index:** [Task Index](./audio_support_tasks_index.md)

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

**Continue to:** [Part 4: Web Audio API Integration (Groups G-H)](./audio_support_tasks_part4.md)
