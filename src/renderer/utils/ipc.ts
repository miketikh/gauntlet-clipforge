import { MediaFile } from '../../types/media';
import { DesktopSource } from '../../types/recording';

// Access ipcRenderer and webUtils from window (exposed by preload script)
const { ipcRenderer, webUtils } = window as any;

/**
 * Opens native file dialog to select a video file
 * @returns Selected file path or null if cancelled
 */
export async function selectFile(): Promise<string | null> {
  try {
    const filePath = await ipcRenderer.invoke('select-file');
    return filePath;
  } catch (error) {
    console.error('Error selecting file:', error);
    throw error;
  }
}

/**
 * Imports a video file and extracts metadata
 * @param filePath - Path to the video file
 * @returns MediaFile object with metadata
 */
export async function importVideo(filePath: string): Promise<MediaFile> {
  try {
    const mediaFile: MediaFile = await ipcRenderer.invoke('import-video', filePath);
    return mediaFile;
  } catch (error) {
    console.error('Error importing video:', error);
    throw error;
  }
}

/**
 * Generates a thumbnail from a video file
 * @param videoPath - Path to the video file
 * @returns Base64 data URL of the thumbnail
 */
export async function generateThumbnail(videoPath: string): Promise<string> {
  try {
    const thumbnailDataUrl: string = await ipcRenderer.invoke('generate-thumbnail', videoPath);
    return thumbnailDataUrl;
  } catch (error) {
    console.error('Error generating thumbnail:', error);
    throw error;
  }
}

/**
 * Generates a thumbnail from a video file at a specific timestamp
 * @param videoPath - Path to the video file
 * @param timestamp - Time in seconds where to extract the thumbnail
 * @returns Base64 data URL of the thumbnail
 */
export async function generateThumbnailAtTime(videoPath: string, timestamp: number): Promise<string> {
  try {
    const thumbnailDataUrl: string = await ipcRenderer.invoke('generate-thumbnail-at-time', videoPath, timestamp);
    return thumbnailDataUrl;
  } catch (error) {
    console.error('Error generating thumbnail at time:', error);
    throw error;
  }
}

/**
 * Get file path from a File object (for drag-and-drop)
 * In Electron, File objects from drag-and-drop need webUtils.getPathForFile()
 * @param file - File object from drag-and-drop event
 * @returns Absolute file path
 */
export function getFilePathForDrop(file: File): string {
  try {
    // Use webUtils.getPathForFile for modern Electron
    if (webUtils && webUtils.getPathForFile) {
      return webUtils.getPathForFile(file);
    }
    // Fallback to file.path for older Electron or if webUtils not available
    // @ts-ignore - path exists on File in Electron but not in standard web types
    if (file.path) {
      // @ts-ignore
      return file.path;
    }
    throw new Error('Cannot get file path from dropped file - webUtils not available');
  } catch (error) {
    console.error('Error getting file path:', error);
    throw new Error(`Failed to get file path: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get available desktop sources for screen recording
 * @returns Array of DesktopSource objects with thumbnails
 */
export async function getDesktopSources(): Promise<DesktopSource[]> {
  try {
    const sources: DesktopSource[] = await ipcRenderer.invoke('recording:get-sources');
    return sources;
  } catch (error) {
    console.error('Error getting desktop sources:', error);
    throw error;
  }
}

/**
 * Start screen recording for a given source
 * @param sourceId - Desktop source ID to record
 * @returns Recording info with recordingId and sourceId
 */
export async function startRecording(sourceId: string): Promise<{ recordingId: string; sourceId: string }> {
  try {
    const result = await ipcRenderer.invoke('recording:start', sourceId);
    return result;
  } catch (error) {
    console.error('Error starting recording:', error);
    throw error;
  }
}

/**
 * Stop the active recording
 * @returns Output file path
 */
export async function stopRecording(): Promise<string> {
  try {
    const outputPath: string = await ipcRenderer.invoke('recording:stop');
    return outputPath;
  } catch (error) {
    console.error('Error stopping recording:', error);
    throw error;
  }
}

/**
 * Save recording blob to file system
 * @param data - Recording data as Uint8Array (IPC will convert to Buffer in main process)
 * @returns Path to the saved file
 */
export async function saveRecordingFile(data: Uint8Array): Promise<string> {
  try {
    const filePath: string = await ipcRenderer.invoke('recording:save-file', data);
    return filePath;
  } catch (error) {
    console.error('Error saving recording file:', error);
    throw error;
  }
}

/**
 * Opens native save file dialog for video export
 * @returns Selected file path or null if cancelled
 */
export async function selectSaveLocation(): Promise<string | null> {
  try {
    const filePath = await ipcRenderer.invoke('select-save-location');
    return filePath;
  } catch (error) {
    console.error('Error selecting save location:', error);
    throw error;
  }
}

/**
 * Start video export process
 * @param project - Project data with timeline clips
 * @param config - Export configuration
 * @param outputPath - Where to save the exported video
 * @param mediaFiles - Array of all media files for clip lookup
 */
export async function startExport(
  project: any,
  config: any,
  outputPath: string,
  mediaFiles: any[]
): Promise<{ success: boolean }> {
  try {
    const result = await ipcRenderer.invoke('start-export', {
      project,
      config,
      outputPath,
      mediaFiles,
    });
    return result;
  } catch (error) {
    console.error('Error starting export:', error);
    throw error;
  }
}

/**
 * Cancel in-progress export
 */
export async function cancelExport(): Promise<{ success: boolean }> {
  try {
    const result = await ipcRenderer.invoke('cancel-export');
    return result;
  } catch (error) {
    console.error('Error canceling export:', error);
    throw error;
  }
}

/**
 * Listen for export progress updates
 * @param callback - Callback function to receive progress updates
 * @returns Cleanup function to remove the listener
 */
export function onExportProgress(
  callback: (data: { percent: number; timeRemaining?: string }) => void
): () => void {
  const listener = (_event: any, data: { percent: number; timeRemaining?: string }) => {
    callback(data);
  };
  ipcRenderer.on('export-progress', listener);
  return () => ipcRenderer.removeListener('export-progress', listener);
}

/**
 * Listen for export completion
 * @param callback - Callback function to receive completion notification
 * @returns Cleanup function to remove the listener
 */
export function onExportComplete(
  callback: (data: { outputPath: string }) => void
): () => void {
  const listener = (_event: any, data: { outputPath: string }) => {
    callback(data);
  };
  ipcRenderer.on('export-complete', listener);
  return () => ipcRenderer.removeListener('export-complete', listener);
}

/**
 * Listen for export errors
 * @param callback - Callback function to receive error notification
 * @returns Cleanup function to remove the listener
 */
export function onExportError(
  callback: (data: { message: string }) => void
): () => void {
  const listener = (_event: any, data: { message: string }) => {
    callback(data);
  };
  ipcRenderer.on('export-error', listener);
  return () => ipcRenderer.removeListener('export-error', listener);
}

/**
 * Open exported file in Finder/Explorer
 * @param filePath - Path to the exported file
 */
export async function openExportFile(filePath: string): Promise<{ success: boolean }> {
  try {
    const result = await ipcRenderer.invoke('open-export-file', filePath);
    return result;
  } catch (error) {
    console.error('Error opening export file:', error);
    throw error;
  }
}
