/**
 * Timeline calculation utilities
 * Pure functions for timeline math and validation
 */

import { TimelineClip, Track } from '../../types/timeline';

/**
 * Width of the track label column (left sticky area)
 * This is the single source of truth for the label width
 */
export const TRACK_LABEL_WIDTH = 150;

/**
 * Convert a time position to pixel position in the timeline content area
 * This is the SINGLE SOURCE OF TRUTH for time-to-pixel conversion
 *
 * @param timeInSeconds - Time position in seconds
 * @param pixelsPerSecond - Zoom level (pixels per second)
 * @returns Pixel position relative to content area (after track label)
 */
export function timeToPixels(timeInSeconds: number, pixelsPerSecond: number): number {
  return timeInSeconds * pixelsPerSecond;
}

/**
 * Convert pixel position back to time
 *
 * @param pixels - Pixel position relative to content area
 * @param pixelsPerSecond - Zoom level (pixels per second)
 * @returns Time in seconds
 */
export function pixelsToTime(pixels: number, pixelsPerSecond: number): number {
  return pixels / pixelsPerSecond;
}

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

/**
 * Calculate total project duration from all tracks
 * Returns the maximum duration across all tracks
 *
 * @param tracks - Array of tracks in the project
 * @returns Total project duration in seconds
 */
export function calculateProjectDuration(tracks: Track[]): number {
  if (tracks.length === 0) {
    return 0;
  }

  return Math.max(...tracks.map(calculateTrackDuration));
}

/**
 * Format time position in MM:SS format
 * Used for timecode displays and drag indicators
 *
 * @param seconds - Time position in seconds
 * @returns Formatted time string (e.g., "01:23")
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Calculate the offset position within a clip from a timeline position
 *
 * @param clip - The timeline clip
 * @param playheadPosition - Current playhead position in seconds
 * @returns Offset within the clip in seconds
 */
export function calculateOffsetInClip(clip: TimelineClip, playheadPosition: number): number {
  return playheadPosition - clip.startTime;
}

/**
 * Calculate the video time from a timeline position, accounting for trim start
 *
 * @param clip - The timeline clip
 * @param playheadPosition - Current playhead position in seconds
 * @returns Video time in the source media file in seconds
 */
export function calculateVideoTime(clip: TimelineClip, playheadPosition: number): number {
  const offset = calculateOffsetInClip(clip, playheadPosition);
  return clip.trimStart + offset;
}

/**
 * Clamp video time to clip bounds (respecting trim start/end)
 *
 * @param videoTime - Video time in the source media file
 * @param clip - The timeline clip
 * @param mediaDuration - Duration of the source media file
 * @returns Clamped video time within valid bounds
 */
export function clampToClipBounds(
  videoTime: number,
  clip: TimelineClip,
  mediaDuration: number
): number {
  return Math.max(
    clip.trimStart,
    Math.min(videoTime, mediaDuration - clip.trimEnd)
  );
}
