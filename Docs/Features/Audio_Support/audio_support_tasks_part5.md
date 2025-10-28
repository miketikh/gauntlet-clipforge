# Audio Support Tasks - Part 5: Export & Summary (Group I)

**Part:** 5 of 5
**Contains:** Group I (Export with Cut Ranges), Summary, Related Documents
**Previous:** [Part 4: Advanced Audio Features](./audio_support_tasks_part4.md)
**Index:** [Task Index](./audio_support_tasks_index.md)

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

---

**Task documentation complete. Return to:** [Task Index](./audio_support_tasks_index.md)
