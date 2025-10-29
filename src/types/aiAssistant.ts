/**
 * Type definitions for AI Assistant features
 */

/**
 * User Profile - Defines content creation context for AI analysis
 *
 * Profiles help the AI understand the target audience and guidelines for content suggestions.
 * Users can create multiple profiles for different types of videos (e.g., tutorials, marketing, etc.)
 */
export interface UserProfile {
  /** Unique identifier (timestamp-based with random component) */
  id: string;

  /** Profile name (e.g., "Tech Tutorial", "Marketing Video") */
  name: string;

  /** Free-form description of the target audience (who will watch this content) */
  targetAudience: string;

  /** Free-form content guidelines and rules (tone, style, dos/don'ts) */
  contentGuidelines: string;

  /** Creation timestamp */
  createdAt: Date;

  /** Last update timestamp */
  updatedAt: Date;
}

/**
 * Analysis Stage - Represents the current stage of video analysis
 */
export type AnalysisStage = 'extracting' | 'transcribing' | 'analyzing' | 'complete' | null;

/**
 * Analysis Result - Contains the AI analysis output for a video clip
 */
export interface AnalysisResult {
  /** ID of the clip that was analyzed */
  clipId: string;

  /** ID of the profile used for analysis */
  profileId: string;

  /** When the analysis was completed */
  analyzedAt: Date;

  /** Natural language analysis text with {{timestamp}} markers */
  analysis: string;

  /** Full transcript (optional for now, Track B will populate) */
  transcript?: string;
}
