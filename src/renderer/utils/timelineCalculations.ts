/**
 * Timeline calculation utilities
 * Pure functions for timeline math and validation
 */

import { TimelineClip, Track } from '../../types/timeline';

/**
 * Calculate the duration of a clip accounting for trim points
 * Duration = (endTime - startTime) on timeline
 * This should match the usable portion: (originalDuration - trimStart - trimEnd)
 *
 * @param clip - The timeline clip to measure
 * @returns Duration in seconds
 */
export function calculateClipDuration(clip: TimelineClip): number {
  return clip.endTime - clip.startTime;
}

/**
 * Calculate the end time of a track (latest clip end position)
 * Returns 0 if track has no clips
 *
 * @param track - The track to measure
 * @returns End time in seconds
 */
export function calculateTrackDuration(track: Track): number {
  if (track.clips.length === 0) {
    return 0;
  }

  return Math.max(...track.clips.map((clip) => clip.endTime));
}

/**
 * Find the clip at a specific playhead position on a track
 * Returns the clip that contains the position, or null if no clip is there
 *
 * @param track - The track to search
 * @param position - The playhead position in seconds
 * @returns The clip at that position, or null
 */
export function findClipAtPosition(
  track: Track,
  position: number
): TimelineClip | null {
  return (
    track.clips.find(
      (clip) => position >= clip.startTime && position < clip.endTime
    ) || null
  );
}

/**
 * Detect if any clips overlap on a track
 * Overlaps occur when clip ranges intersect
 *
 * @param track - The track to validate
 * @returns True if overlaps detected, false if all clips are non-overlapping
 */
export function detectOverlaps(track: Track): boolean {
  // Sort clips by start time
  const sortedClips = [...track.clips].sort((a, b) => a.startTime - b.startTime);

  // Check each consecutive pair for overlap
  for (let i = 0; i < sortedClips.length - 1; i++) {
    const currentClip = sortedClips[i];
    const nextClip = sortedClips[i + 1];

    // Overlap if current clip ends after next clip starts
    if (currentClip.endTime > nextClip.startTime) {
      return true;
    }
  }

  return false;
}
