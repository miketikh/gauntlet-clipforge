import { ipcMain, dialog, BrowserWindow, shell } from 'electron';
import { VideoProcessor } from '../services/VideoProcessor';
import { MediaFile, VideoMetadata, MediaType } from '../../types/media';
import { recordingService } from '../services/RecordingService';
import { MediaService } from '../services/MediaService';
import { ExportService } from '../services/ExportService';
import { ExportConfig } from '../../renderer/store/exportStore';
import { Project } from '../../types/timeline';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { v4 as uuidv4 } from 'uuid';

const videoProcessor = new VideoProcessor();
const mediaService = new MediaService(videoProcessor);
let exportService: ExportService | null = null;

/**
 * Register all IPC handlers for file operations
 */
export function registerIpcHandlers(mainWindow?: BrowserWindow) {
  console.log('Registering IPC handlers...');

  // Initialize ExportService if mainWindow is provided
  if (mainWindow) {
    exportService = new ExportService(videoProcessor, mainWindow);
  }

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

  /**
   * Handle 'recording:get-sources' - Get available desktop sources for recording
   * Returns: Array of DesktopSource objects with thumbnails
   */
  ipcMain.handle('recording:get-sources', async () => {
    try {
      console.log('IPC: Getting desktop sources for recording...');
      const sources = await recordingService.getDesktopSources();
      console.log(`IPC: Returning ${sources.length} desktop sources`);
      return sources;
    } catch (error) {
      console.error('Error in recording:get-sources handler:', error);
      throw new Error(`Failed to get desktop sources: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });

  /**
   * Handle 'recording:start' - Start screen recording
   * @param sourceId - Desktop source ID to record
   * Returns: Recording info with recordingId and sourceId
   */
  ipcMain.handle('recording:start', async (_event, sourceId: string) => {
    try {
      console.log(`IPC: Starting recording for source ${sourceId}`);
      const result = await recordingService.startScreenRecording(sourceId);
      console.log(`IPC: Recording started with ID ${result.recordingId}`);
      return result;
    } catch (error) {
      console.error('Error in recording:start handler:', error);
      throw new Error(`Failed to start recording: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });

  /**
   * Handle 'recording:start-webcam' - Start webcam recording
   * Returns: Recording info with recordingId
   */
  ipcMain.handle('recording:start-webcam', async (_event) => {
    try {
      console.log('IPC: Starting webcam recording');
      const result = await recordingService.startWebcamRecording();
      console.log(`IPC: Webcam recording started with ID ${result.recordingId}`);
      return result;
    } catch (error) {
      console.error('Error in recording:start-webcam handler:', error);
      throw new Error(`Failed to start webcam recording: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });

  /**
   * Handle 'recording:stop' - Stop active screen recording
   * Returns: Output file path
   */
  ipcMain.handle('recording:stop', async () => {
    try {
      console.log('IPC: Stopping recording...');
      const outputPath = await recordingService.stopScreenRecording();
      console.log(`IPC: Recording stopped, file at ${outputPath}`);
      return outputPath;
    } catch (error) {
      console.error('Error in recording:stop handler:', error);
      throw new Error(`Failed to stop recording: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });

  /**
   * Handle 'recording:stop-webcam' - Stop active webcam recording
   * Returns: Output file path
   */
  ipcMain.handle('recording:stop-webcam', async () => {
    try {
      console.log('IPC: Stopping webcam recording...');
      const outputPath = await recordingService.stopWebcamRecording();
      console.log(`IPC: Webcam recording stopped, file at ${outputPath}`);
      return outputPath;
    } catch (error) {
      console.error('Error in recording:stop-webcam handler:', error);
      throw new Error(`Failed to stop webcam recording: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });

  /**
   * Handle 'recording:save-file' - Save recording blob to file system
   * @param buffer - Buffer containing the recording data
   * Returns: Path to the saved file
   */
  ipcMain.handle('recording:save-file', async (_event, buffer: Buffer) => {
    try {
      console.log(`IPC: Saving recording file (${buffer.length} bytes)`);

      const activeRecording = recordingService.getActiveRecording();
      if (!activeRecording) {
        throw new Error('No active recording to save');
      }

      const outputPath = activeRecording.outputPath;

      // Ensure directory exists
      const dir = path.dirname(outputPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Write buffer to file
      fs.writeFileSync(outputPath, buffer);

      console.log(`IPC: Recording file saved to ${outputPath}`);
      console.log(`IPC: File size: ${fs.statSync(outputPath).size} bytes`);

      return outputPath;
    } catch (error) {
      console.error('Error in recording:save-file handler:', error);
      throw new Error(`Failed to save recording file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });

  /**
   * Handle 'recording:import' - Import recording to media library
   * @param recordingPath - Path to the recording file in temp directory
   * @param recordingType - Type of recording ('screen' | 'webcam' | 'pip')
   * Returns: MediaFile object with complete metadata
   */
  ipcMain.handle('recording:import', async (_event, recordingPath: string, recordingType: 'screen' | 'webcam' | 'pip' = 'screen') => {
    try {
      console.log(`IPC: Importing ${recordingType} recording from ${recordingPath}`);
      const mediaFile = await mediaService.importRecording(recordingPath, recordingType);
      console.log(`IPC: Recording imported successfully: ${mediaFile.filename}`);
      return mediaFile;
    } catch (error) {
      console.error('Error in recording:import handler:', error);
      throw new Error(`Failed to import recording: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });

  /**
   * Handle 'recording:import-combined' - Import combined recording to media library
   * @param screenPath - Path to screen recording file
   * @param webcamPath - Path to webcam recording file
   * @param pipConfig - Picture-in-Picture configuration
   * Returns: Both MediaFile objects linked together
   */
  ipcMain.handle('recording:import-combined', async (_event, screenPath: string, webcamPath: string, pipConfig: any) => {
    try {
      console.log(`IPC: Importing combined recording - Screen: ${screenPath}, Webcam: ${webcamPath}`);
      const result = await mediaService.importCombinedRecording(screenPath, webcamPath, pipConfig);
      console.log(`IPC: Combined recording imported successfully`);
      return result;
    } catch (error) {
      console.error('Error in recording:import-combined handler:', error);
      throw new Error(`Failed to import combined recording: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });

  /**
   * Handle 'recording:start-combined' - Start combined screen + webcam recording
   * @param screenSourceId - Desktop source ID for screen recording
   * @param pipConfig - Picture-in-Picture configuration
   * Returns: Recording info for both streams
   */
  ipcMain.handle('recording:start-combined', async (_event, screenSourceId: string, pipConfig: any) => {
    try {
      console.log(`IPC: Starting combined recording for source ${screenSourceId}`);
      const result = await recordingService.startCombinedRecording(screenSourceId, pipConfig);
      console.log(`IPC: Combined recording started - Screen: ${result.screenRecordingId}, Webcam: ${result.webcamRecordingId}`);
      return result;
    } catch (error) {
      console.error('Error in recording:start-combined handler:', error);
      throw new Error(`Failed to start combined recording: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });

  /**
   * Handle 'recording:stop-combined' - Stop active combined recording
   * Returns: Output file paths and PiP config
   */
  ipcMain.handle('recording:stop-combined', async () => {
    try {
      console.log('IPC: Stopping combined recording...');
      const result = await recordingService.stopCombinedRecording();
      console.log(`IPC: Combined recording stopped - Screen: ${result.screenPath}, Webcam: ${result.webcamPath}`);
      return result;
    } catch (error) {
      console.error('Error in recording:stop-combined handler:', error);
      throw new Error(`Failed to stop combined recording: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });

  /**
   * Handle 'recording:save-combined-files' - Save both recording blobs to file system
   * @param screenBuffer - Buffer containing screen recording data
   * @param webcamBuffer - Buffer containing webcam recording data
   * Returns: Paths to both saved files
   */
  ipcMain.handle('recording:save-combined-files', async (_event, screenBuffer: Buffer, webcamBuffer: Buffer) => {
    try {
      console.log(`IPC: Saving combined recording files - Screen: ${screenBuffer.length} bytes, Webcam: ${webcamBuffer.length} bytes`);

      const activeCombinedRecording = recordingService.getActiveCombinedRecording();
      if (!activeCombinedRecording) {
        throw new Error('No active combined recording to save');
      }

      const screenPath = activeCombinedRecording.screenOutputPath;
      const webcamPath = activeCombinedRecording.webcamOutputPath;

      // Ensure directory exists
      const dir = path.dirname(screenPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Write both buffers to files
      fs.writeFileSync(screenPath, screenBuffer);
      fs.writeFileSync(webcamPath, webcamBuffer);

      console.log(`IPC: Screen recording saved to ${screenPath} (${fs.statSync(screenPath).size} bytes)`);
      console.log(`IPC: Webcam recording saved to ${webcamPath} (${fs.statSync(webcamPath).size} bytes)`);

      return { screenPath, webcamPath };
    } catch (error) {
      console.error('Error in recording:save-combined-files handler:', error);
      throw new Error(`Failed to save combined recording files: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });

  /**
   * Handle 'recording:composite-pip' - Composite screen and webcam into single PiP video
   * @param screenPath - Path to screen recording file
   * @param webcamPath - Path to webcam recording file
   * @param pipConfig - PiP configuration (position and size)
   * @param outputPath - Path to save composited video
   * Returns: Path to the composited file
   */
  ipcMain.handle('recording:composite-pip', async (_event, data: {
    screenPath: string;
    webcamPath: string;
    pipConfig: { position: string; size: string };
    outputPath: string;
  }) => {
    try {
      console.log(`IPC: Compositing PiP recording - Screen: ${data.screenPath}, Webcam: ${data.webcamPath}`);
      console.log(`IPC: Output path: ${data.outputPath}`);

      await videoProcessor.compositePiPRecording(
        data.screenPath,
        data.webcamPath,
        data.pipConfig,
        data.outputPath
      );

      console.log(`IPC: PiP compositing completed: ${data.outputPath}`);
      return data.outputPath;
    } catch (error) {
      console.error('Error in recording:composite-pip handler:', error);
      throw new Error(`Failed to composite PiP recording: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });

  /**
   * Handle 'select-save-location' - Opens save file dialog for export
   * Returns: Selected save path or null if cancelled
   */
  ipcMain.handle('select-save-location', async () => {
    try {
      // Generate default filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const defaultFilename = `ClipForge_Export_${timestamp}.mp4`;

      const result = await dialog.showSaveDialog({
        title: 'Export Video',
        defaultPath: defaultFilename,
        filters: [
          {
            name: 'MP4 Video',
            extensions: ['mp4']
          }
        ],
        properties: []
      });

      if (result.canceled || !result.filePath) {
        return null;
      }

      return result.filePath;
    } catch (error) {
      console.error('Error in select-save-location handler:', error);
      throw new Error(`Failed to open save dialog: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });

  /**
   * Handle 'start-export' - Start video export process
   * @param project - Project data with timeline clips
   * @param config - Export configuration
   * @param outputPath - Where to save the exported video
   * @param mediaFiles - Array of all media files for clip lookup
   */
  ipcMain.handle('start-export', async (_event, data: {
    project: Project;
    config: ExportConfig;
    outputPath: string;
    mediaFiles: MediaFile[];
  }) => {
    try {
      if (!exportService) {
        throw new Error('ExportService not initialized');
      }

      const { project, config, outputPath, mediaFiles } = data;

      console.log('[IPC] Starting export...');
      console.log('[IPC] Output path:', outputPath);
      console.log('[IPC] Config:', config);

      await exportService.startExport(project, config, outputPath, mediaFiles);

      console.log('[IPC] Export started successfully');
      return { success: true };
    } catch (error) {
      console.error('Error in start-export handler:', error);
      throw new Error(`Failed to start export: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });

  /**
   * Handle 'cancel-export' - Cancel in-progress export
   */
  ipcMain.handle('cancel-export', async () => {
    try {
      if (!exportService) {
        throw new Error('ExportService not initialized');
      }

      console.log('[IPC] Canceling export...');
      exportService.cancelExport();

      return { success: true };
    } catch (error) {
      console.error('Error in cancel-export handler:', error);
      throw new Error(`Failed to cancel export: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });

  /**
   * Handle 'open-export-file' - Open exported file in Finder/Explorer
   * @param filePath - Path to the exported file
   */
  ipcMain.handle('open-export-file', async (_event, filePath: string) => {
    try {
      console.log('[IPC] Opening export file in system viewer:', filePath);

      // Verify file exists
      if (!fs.existsSync(filePath)) {
        throw new Error('Exported file not found');
      }

      // Show file in Finder/Explorer
      shell.showItemInFolder(filePath);

      return { success: true };
    } catch (error) {
      console.error('Error in open-export-file handler:', error);
      throw new Error(`Failed to open export file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });

  console.log('IPC handlers registered successfully');
}
