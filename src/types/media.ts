/**
 * Shared type definitions for media files
 */

/**
 * Type of media file
 */
export enum MediaType {
  VIDEO = 'video',    // Video with audio
  AUDIO = 'audio',    // Audio only (MP3, WAV, etc.)
  IMAGE = 'image'     // Still image (future use)
}

export interface MediaFile {
  id: string;
  path: string;
  filename: string;
  type: MediaType;                    // NEW: Media type
  duration: number;
  resolution?: {                      // CHANGED: Optional for audio
    width: number;
    height: number;
  };
  thumbnail: string;                  // base64 data URL
  fileSize: number;

  // NEW: Audio-specific metadata (optional)
  audioMetadata?: {
    sampleRate: number;              // e.g., 44100, 48000
    channels: number;                // 1 = mono, 2 = stereo
    codec: string;                   // e.g., "aac", "mp3"
  };

  // NEW: Waveform data for visualization (optional)
  waveformData?: number[];           // Amplitude samples (0-1 range)
}

/**
 * Video metadata returned from VideoProcessor
 */
export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  codec: string;
  format: string;
  bitrate: number;
}

/**
 * Audio metadata returned from AudioProcessor
 */
export interface AudioMetadata {
  sampleRate: number;
  channels: number;
  codec: string;
  bitrate: number;
}
