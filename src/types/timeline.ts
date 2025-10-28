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
 * Type of cut range for audio editing
 */
export enum CutRangeType {
  FILLER = 'filler',
  SILENCE = 'silence',
  MANUAL = 'manual'
}

/**
 * A range to be cut from the audio track
 */
export interface CutRange {
  id: string;
  start: number; // Start time in seconds (relative to clip)
  end: number; // End time in seconds (relative to clip)
  type: CutRangeType;
}

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

  // Thumbnail showing the first frame of the trimmed clip (generated at trimStart position)
  thumbnail?: string; // Base64 data URL of thumbnail image

  // Audio properties (optional)
  volume?: number; // Volume multiplier (0-1 = quieter, 1 = original, >1 = louder)
  muted?: boolean; // Whether audio is muted
  fadeIn?: number; // Fade in duration in seconds
  fadeOut?: number; // Fade out duration in seconds
  cutRanges?: CutRange[]; // Audio cut ranges (e.g., silence removal, filler word cuts)
}

/**
 * Track type enumeration for different track purposes
 */
export enum TrackType {
  VIDEO = 'video',
  AUDIO = 'audio',
  OVERLAY = 'overlay'
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
  type?: TrackType; // Track type (optional for backward compatibility)
  volume?: number; // Track volume level 0-100 (optional, for audio tracks)
  muted?: boolean; // Whether track is muted (optional, for audio tracks)
}

/**
 * A single word in a transcript with timing information
 */
export interface TranscriptWord {
  word: string; // The word text
  start: number; // Start time in seconds
  end: number; // End time in seconds
  confidence?: number; // Optional confidence score (0-1)
}

/**
 * A transcript for a media file with word-level timing
 */
export interface Transcript {
  mediaFileId: string; // Reference to MediaFile.id
  text: string; // Full transcript text
  words: TranscriptWord[]; // Word-level timestamps
  language?: string; // Language code (e.g., "en-US")
  generatedAt: number; // Timestamp when transcript was generated
}

/**
 * A video editing project containing tracks and metadata
 */
export interface Project {
  id: string; // Unique project identifier
  name: string; // Project name
  tracks: Track[]; // All tracks in the project
  duration: number; // Total project duration (seconds)
  transcripts?: Record<string, Transcript>; // Optional transcripts keyed by mediaFileId
  schemaVersion?: number; // Schema version for migrations
}
