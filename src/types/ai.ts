/**
 * AI Consultant - Type Definitions
 * Defines data structures for AI analysis profiles and related features
 */

export interface UserProfile {
  id: string;
  name: string;
  targetAudience: string;
  contentGuidelines: string;
  createdAt: string;  // ISO date string
  updatedAt: string;  // ISO date string
}

/**
 * Transcript Types - Audio transcription with timestamps
 */

export interface TranscriptSegment {
  start: number;      // Seconds
  end: number;        // Seconds
  text: string;
}

export interface Transcript {
  fullText: string;
  segments: TranscriptSegment[];
  duration: number;   // Total audio duration in seconds
  language?: string;  // Detected language
}

/**
 * Analysis Result - GPT-4 content analysis with metadata
 */

export interface AnalysisResult {
  analysis: string;           // GPT-4 response with {{MM:SS}} markers
  transcript: Transcript;     // Original transcript for reference
  profileUsed: UserProfile;   // Which profile was used
  analyzedAt: string;         // ISO timestamp
  tokenUsage?: {              // Optional API cost tracking
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}
