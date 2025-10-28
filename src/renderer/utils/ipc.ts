import { MediaFile } from '../../types/media';

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
