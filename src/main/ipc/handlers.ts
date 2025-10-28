import { ipcMain, dialog } from 'electron';
import { VideoProcessor } from '../services/VideoProcessor';
import { MediaFile, VideoMetadata } from '../../types/media';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { v4 as uuidv4 } from 'uuid';

const videoProcessor = new VideoProcessor();

/**
 * Register all IPC handlers for file operations
 */
export function registerIpcHandlers() {
  console.log('Registering IPC handlers...');

  /**
   * Handle 'select-file' - Opens native file dialog
   * Returns: Selected file path or null if cancelled
   */
  ipcMain.handle('select-file', async () => {
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [
          {
            name: 'Videos',
            extensions: ['mp4', 'mov', 'webm']
          }
        ],
        title: 'Select a video file'
      });

      if (result.canceled || result.filePaths.length === 0) {
        return null;
      }

      return result.filePaths[0];
    } catch (error) {
      console.error('Error in select-file handler:', error);
      throw new Error(`Failed to open file dialog: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });

  /**
   * Handle 'import-video' - Validates video file and extracts metadata
   * @param filePath - Path to the video file
   * Returns: MediaFile object with metadata
   */
  ipcMain.handle('import-video', async (_event, filePath: string) => {
    try {
      // Validate file exists
      if (!fs.existsSync(filePath)) {
        throw new Error('File does not exist');
      }

      // Get file stats for size
      const stats = fs.statSync(filePath);

      // Extract metadata using VideoProcessor
      const metadata: VideoMetadata = await videoProcessor.getVideoMetadata(filePath);

      // Create MediaFile object
      const mediaFile: MediaFile = {
        id: uuidv4(),
        path: filePath,
        filename: path.basename(filePath),
        duration: metadata.duration,
        resolution: {
          width: metadata.width,
          height: metadata.height
        },
        thumbnail: '', // Will be populated by generate-thumbnail
        fileSize: stats.size
      };

      console.log('Video imported successfully:', mediaFile.filename);
      return mediaFile;
    } catch (error) {
      console.error('Error in import-video handler:', error);
      throw new Error(`Failed to import video: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });

  /**
   * Handle 'generate-thumbnail' - Generates thumbnail from video
   * @param videoPath - Path to the video file
   * Returns: Base64 data URL of the thumbnail
   */
  ipcMain.handle('generate-thumbnail', async (_event, videoPath: string) => {
    try {
      // Validate file exists
      if (!fs.existsSync(videoPath)) {
        throw new Error('Video file does not exist');
      }

      // Create temporary output path for thumbnail
      const tempDir = os.tmpdir();
      const thumbnailFilename = `thumbnail-${Date.now()}.png`;
      const thumbnailPath = path.join(tempDir, thumbnailFilename);

      // Extract thumbnail at 1 second
      await videoProcessor.extractThumbnail(videoPath, 1, thumbnailPath);

      // Read thumbnail file and convert to base64
      const thumbnailBuffer = fs.readFileSync(thumbnailPath);
      const base64Data = thumbnailBuffer.toString('base64');
      const dataUrl = `data:image/png;base64,${base64Data}`;

      // Clean up temporary file
      fs.unlinkSync(thumbnailPath);

      console.log('Thumbnail generated successfully');
      return dataUrl;
    } catch (error) {
      console.error('Error in generate-thumbnail handler:', error);
      throw new Error(`Failed to generate thumbnail: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });

  console.log('IPC handlers registered successfully');
}
