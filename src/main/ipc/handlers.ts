import { ipcMain, dialog } from 'electron';
import { VideoProcessor } from '../services/VideoProcessor';
import { MediaFile, VideoMetadata, MediaType } from '../../types/media';
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
            name: 'Media Files',
            extensions: ['mp4', 'mov', 'avi', 'mkv', 'webm', 'mp3', 'wav', 'aac', 'm4a', 'ogg']
          },
          {
            name: 'Video Files',
            extensions: ['mp4', 'mov', 'avi', 'mkv', 'webm']
          },
          {
            name: 'Audio Files',
            extensions: ['mp3', 'wav', 'aac', 'm4a', 'ogg']
          },
          {
            name: 'All Files',
            extensions: ['*']
          }
        ],
        title: 'Select a media file'
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
   * Handle 'import-video' - Validates media file and extracts metadata
   * @param filePath - Path to the media file (video or audio)
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

      // Determine if file is audio or video based on extension
      const ext = path.extname(filePath).toLowerCase();
      const audioExts = ['.mp3', '.wav', '.aac', '.m4a', '.ogg'];
      const isAudioFile = audioExts.includes(ext);

      // Extract metadata using appropriate method
      let mediaFile: MediaFile;

      if (isAudioFile) {
        // Extract audio metadata
        const audioMetadata = await videoProcessor.getAudioMetadata(filePath);

        mediaFile = {
          id: uuidv4(),
          path: filePath,
          filename: path.basename(filePath),
          type: MediaType.AUDIO,
          duration: audioMetadata.duration,
          resolution: undefined,
          thumbnail: '', // Will be populated by generate-thumbnail
          fileSize: stats.size,
          audioMetadata: {
            sampleRate: audioMetadata.sampleRate,
            channels: audioMetadata.channels,
            codec: audioMetadata.codec
          }
        };
      } else {
        // Extract video metadata
        const videoMetadata: VideoMetadata = await videoProcessor.getVideoMetadata(filePath);

        mediaFile = {
          id: uuidv4(),
          path: filePath,
          filename: path.basename(filePath),
          type: MediaType.VIDEO,
          duration: videoMetadata.duration,
          resolution: {
            width: videoMetadata.width,
            height: videoMetadata.height
          },
          thumbnail: '', // Will be populated by generate-thumbnail
          fileSize: stats.size
        };
      }

      console.log('Media file imported successfully:', mediaFile.filename, 'Type:', mediaFile.type);
      return mediaFile;
    } catch (error) {
      console.error('Error in import-video handler:', error);
      throw new Error(`Failed to import media: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });

  /**
   * Handle 'generate-thumbnail' - Generates thumbnail from video or placeholder for audio
   * @param videoPath - Path to the media file
   * Returns: Base64 data URL of the thumbnail
   */
  ipcMain.handle('generate-thumbnail', async (_event, videoPath: string) => {
    try {
      // Validate file exists
      if (!fs.existsSync(videoPath)) {
        throw new Error('Media file does not exist');
      }

      // Check if this is an audio file
      const ext = path.extname(videoPath).toLowerCase();
      const audioExts = ['.mp3', '.wav', '.aac', '.m4a', '.ogg'];
      const isAudioFile = audioExts.includes(ext);

      if (isAudioFile) {
        // Return a placeholder base64 image for audio files (1x1 transparent pixel)
        // MediaItem component will show an audio icon instead
        const placeholderBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
        return `data:image/png;base64,${placeholderBase64}`;
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

  /**
   * Handle 'generate-thumbnail-at-time' - Generates thumbnail from video at a specific timestamp
   * @param videoPath - Path to the video file
   * @param timestamp - Time in seconds where to extract the thumbnail
   * Returns: Base64 data URL of the thumbnail
   */
  ipcMain.handle('generate-thumbnail-at-time', async (_event, videoPath: string, timestamp: number) => {
    try {
      // Validate file exists
      if (!fs.existsSync(videoPath)) {
        throw new Error('Video file does not exist');
      }

      // Check if this is an audio file (shouldn't be called for audio, but handle gracefully)
      const ext = path.extname(videoPath).toLowerCase();
      const audioExts = ['.mp3', '.wav', '.aac', '.m4a', '.ogg'];
      const isAudioFile = audioExts.includes(ext);

      if (isAudioFile) {
        // Return a placeholder for audio files
        const placeholderBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
        return `data:image/png;base64,${placeholderBase64}`;
      }

      // Create temporary output path for thumbnail
      const tempDir = os.tmpdir();
      const thumbnailFilename = `thumbnail-${timestamp}-${Date.now()}.png`;
      const thumbnailPath = path.join(tempDir, thumbnailFilename);

      // Extract thumbnail at specified timestamp
      await videoProcessor.extractThumbnail(videoPath, timestamp, thumbnailPath);

      // Read thumbnail file and convert to base64
      const thumbnailBuffer = fs.readFileSync(thumbnailPath);
      const base64Data = thumbnailBuffer.toString('base64');
      const dataUrl = `data:image/png;base64,${base64Data}`;

      // Clean up temporary file
      fs.unlinkSync(thumbnailPath);

      console.log(`Thumbnail generated at ${timestamp}s successfully`);
      return dataUrl;
    } catch (error) {
      console.error('Error in generate-thumbnail-at-time handler:', error);
      throw new Error(`Failed to generate thumbnail at time: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });

  console.log('IPC handlers registered successfully');
}
