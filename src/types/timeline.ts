/**
 * Timeline type definitions for non-destructive video editing
 *
 * NON-DESTRUCTIVE EDITING MODEL:
 * - Original media files are NEVER modified
 * - Timeline clips reference media files via mediaFileId (foreign key pattern)
 * - Trim points stored as offsets (trimStart/trimEnd in seconds)
 * - startTime/endTime are absolute positions on the timeline
 * - Export process renders the composition using FFmpeg
 */

/**
 * A clip on the timeline representing a segment of a media file
 */
export interface TimelineClip {
  id: string; // Unique clip identifier
  mediaFileId: string; // Reference to MediaFile.id
  trackIndex: number; // Which track this clip belongs to (0, 1, 2, etc.)
  startTime: number; // Absolute position on timeline where clip starts (seconds)
  endTime: number; // Absolute position on timeline where clip ends (seconds)
  trimStart: number; // Trim from start of original media (seconds, 0 = no trim)
  trimEnd: number; // Trim from end of original media (seconds, 0 = no trim)
}

/**
 * A track containing multiple clips
 * Track 0 = main video track
 * Track 1+ = overlay tracks (for picture-in-picture, etc.)
 */
export interface Track {
  id: string; // Unique track identifier
  name: string; // Display name (e.g., "Main", "Overlay 1")
  clips: TimelineClip[]; // Clips on this track, ordered by startTime
}

/**
 * A video editing project containing tracks and metadata
 */
export interface Project {
  id: string; // Unique project identifier
  name: string; // Project name
  tracks: Track[]; // All tracks in the project
  duration: number; // Total project duration (seconds)
}
