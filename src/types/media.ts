/**
 * Shared type definitions for media files
 */

export interface MediaFile {
  id: string;
  path: string;
  filename: string;
  duration: number;
  resolution: {
    width: number;
    height: number;
  };
  thumbnail: string; // base64 data URL
  fileSize: number;
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
