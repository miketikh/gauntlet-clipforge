import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import { v4 as uuidv4 } from 'uuid';
import { MediaFile, MediaType } from '../../types/media';
import { VideoProcessor } from './VideoProcessor';

/**
 * MediaService - Handles media file imports and management
 */
export class MediaService {
  private videoProcessor: VideoProcessor;
  private projectMediaDir: string;

  constructor(videoProcessor: VideoProcessor) {
    this.videoProcessor = videoProcessor;
    // Use app data directory for storing imported media
    this.projectMediaDir = path.join(app.getPath('userData'), 'media');
    this.ensureMediaDirectory();
  }

  /**
   * Ensure media directory exists
   */
  private ensureMediaDirectory(): void {
    try {
      if (!fs.existsSync(this.projectMediaDir)) {
        fs.mkdirSync(this.projectMediaDir, { recursive: true });
        console.log(`MediaService: Created media directory at ${this.projectMediaDir}`);
      }
    } catch (error) {
      console.error('MediaService: Error creating media directory:', error);
      throw error;
    }
  }

  /**
   * Import a recording from temp directory to project media folder
   * @param recordingPath - Path to the recording file in temp directory
   * @param recordingType - Type of recording ('screen' | 'webcam' | 'pip')
   * @returns MediaFile object with complete metadata
   */
  async importRecording(recordingPath: string, recordingType: 'screen' | 'webcam' | 'pip' = 'screen'): Promise<MediaFile> {
    try {
      console.log(`MediaService: Importing recording from ${recordingPath}`);

      // Validate file exists
      if (!fs.existsSync(recordingPath)) {
        throw new Error('Recording file does not exist');
      }

      // Get file stats
      const stats = fs.statSync(recordingPath);

      // Generate unique filename with timestamp
      const timestamp = Date.now();
      const filename = `recording_${timestamp}.webm`;
      const destinationPath = path.join(this.projectMediaDir, filename);

      // Move recording from temp to project media folder
      console.log(`MediaService: Moving recording to ${destinationPath}`);
      fs.renameSync(recordingPath, destinationPath);

      // Fix WebM metadata by remuxing with FFmpeg
      // MediaRecorder creates WebM files without duration metadata
      console.log('MediaService: Fixing WebM metadata...');
      const tempFixedPath = path.join(app.getPath('temp'), `fixed_${timestamp}.webm`);
      await this.videoProcessor.fixWebMMetadata(destinationPath, tempFixedPath);

      // Replace original with fixed version
      fs.unlinkSync(destinationPath);
      fs.renameSync(tempFixedPath, destinationPath);

      // Extract metadata using FFprobe (after fixing metadata)
      console.log('MediaService: Extracting metadata...');
      const videoMetadata = await this.videoProcessor.getVideoMetadata(destinationPath);

      // Generate thumbnail at 1-second mark
      console.log('MediaService: Generating thumbnail...');
      const thumbnailPath = path.join(app.getPath('temp'), `recording-thumb-${timestamp}.png`);
      await this.videoProcessor.extractThumbnail(destinationPath, 1, thumbnailPath);

      // Read thumbnail and convert to base64
      const thumbnailBuffer = fs.readFileSync(thumbnailPath);
      const base64Data = thumbnailBuffer.toString('base64');
      const thumbnailDataUrl = `data:image/png;base64,${base64Data}`;

      // Clean up temporary thumbnail file
      fs.unlinkSync(thumbnailPath);

      // Create MediaFile object
      const mediaFile: MediaFile = {
        id: uuidv4(),
        path: destinationPath,
        filename: filename,
        type: MediaType.VIDEO,
        duration: videoMetadata.duration,
        resolution: {
          width: videoMetadata.width,
          height: videoMetadata.height
        },
        thumbnail: thumbnailDataUrl,
        fileSize: stats.size,
        isRecording: true, // Mark as recording
        recordingType: recordingType // Track type of recording
      };

      console.log('MediaService: Recording imported successfully:', mediaFile.filename);
      return mediaFile;
    } catch (error) {
      console.error('MediaService: Error importing recording:', error);
      throw new Error(
        `Failed to import recording: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Import combined recording (screen + webcam) with PiP configuration
   * @param screenPath - Path to screen recording file
   * @param webcamPath - Path to webcam recording file
   * @param pipConfig - Picture-in-Picture configuration
   * @returns Object with both MediaFile objects linked together
   */
  async importCombinedRecording(
    screenPath: string,
    webcamPath: string,
    pipConfig: { position: string; size: string }
  ): Promise<{ screenMedia: MediaFile; webcamMedia: MediaFile }> {
    try {
      console.log(`MediaService: Importing combined recording...`);
      console.log(`MediaService: Screen: ${screenPath}`);
      console.log(`MediaService: Webcam: ${webcamPath}`);
      console.log(`MediaService: PiP config:`, pipConfig);

      // Generate a shared linked recording ID
      const linkedId = uuidv4();

      // Import screen recording
      console.log('MediaService: Importing screen recording...');
      const screenMedia = await this.importRecording(screenPath, 'screen');
      screenMedia.linkedRecordingId = linkedId;

      // Import webcam recording with PiP config
      console.log('MediaService: Importing webcam recording...');
      const webcamMedia = await this.importRecording(webcamPath, 'webcam');
      webcamMedia.linkedRecordingId = linkedId;
      webcamMedia.pipConfig = pipConfig;

      console.log('MediaService: Combined recording imported successfully');
      console.log(`MediaService: Linked ID: ${linkedId}`);

      return { screenMedia, webcamMedia };
    } catch (error) {
      console.error('MediaService: Error importing combined recording:', error);
      throw new Error(
        `Failed to import combined recording: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get the project media directory path
   * @returns Path to the project media directory
   */
  getMediaDirectory(): string {
    return this.projectMediaDir;
  }
}
