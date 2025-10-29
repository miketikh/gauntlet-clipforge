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

/**
 * Picture-in-Picture position presets
 */
export type PiPPosition = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';

/**
 * Picture-in-Picture size presets
 */
export type PiPSize = 'small' | 'medium' | 'large';

/**
 * Picture-in-Picture configuration
 */
export interface PiPConfig {
  position: PiPPosition;
  size: PiPSize;
}

/**
 * Get percentage values for PiP size
 */
export const PIP_SIZE_MAP: Record<PiPSize, number> = {
  small: 0.20,   // 20% of screen size
  medium: 0.25,  // 25% of screen size
  large: 0.30,   // 30% of screen size
};
