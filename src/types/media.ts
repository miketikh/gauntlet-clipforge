/**
 * Shared type definitions for media files
 */

import type { WaveformPeak } from '../renderer/services/WaveformExtractor';

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

  // NEW: Waveform data for visualization (min/max pairs like Audacity/DAWs)
  waveformData?: WaveformPeak[];     // Array of min/max peak pairs (-1 to 1 range)

  // NEW: Recording metadata (optional)
  isRecording?: boolean;             // True if this file came from a recording
  recordingType?: 'screen' | 'webcam' | 'pip';  // Type of recording
  linkedRecordingId?: string;        // ID of linked recording (for screen+webcam pairs)
  pipConfig?: {                      // PiP configuration (for webcam recordings)
    position: string;                // 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
    size: string;                    // 'small' | 'medium' | 'large'
  };
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
