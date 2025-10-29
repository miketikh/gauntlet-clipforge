/**
 * Recording-related type definitions
 */

/**
 * Desktop source from Electron's desktopCapturer
 */
export interface DesktopSource {
  id: string;
  name: string;
  thumbnail: string; // base64 data URL
  appIcon?: string; // base64 data URL (for windows)
  display_id?: string; // For screen sources
}

/**
 * Recording state
 */
export type RecordingState = 'idle' | 'selecting' | 'recording' | 'processing';

/**
 * Recording options
 */
export interface RecordingOptions {
  sourceId: string;
  outputPath: string;
  format: 'webm' | 'mp4';
}

/**
 * Recording metadata
 */
export interface RecordingMetadata {
  duration: number;
  fileSize: number;
  resolution: {
    width: number;
    height: number;
  };
}
