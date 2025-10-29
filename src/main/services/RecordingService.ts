import { desktopCapturer, app } from 'electron';
import { DesktopSource, PiPConfig } from '../../types/recording';
import * as path from 'path';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

interface ActiveRecording {
  recordingId: string;
  sourceId: string;
  startTime: Date;
  outputPath: string;
}

interface ActiveCombinedRecording {
  screenRecordingId: string;
  webcamRecordingId: string;
  screenSourceId: string;
  startTime: Date;
  screenOutputPath: string;
  webcamOutputPath: string;
  pipConfig: PiPConfig;
}

/**
 * RecordingService handles screen recording functionality using Electron's desktopCapturer API
 */
export class RecordingService {
  private activeRecording: ActiveRecording | null = null;
  private activeCombinedRecording: ActiveCombinedRecording | null = null;
  private recordingsDir: string;

  constructor() {
    // Initialize recordings directory
    this.recordingsDir = path.join(app.getPath('temp'), 'clipforge-recordings');
    this.ensureRecordingsDirectory();
  }

  /**
   * Ensure recordings directory exists
   */
  private ensureRecordingsDirectory(): void {
    try {
      if (!fs.existsSync(this.recordingsDir)) {
        fs.mkdirSync(this.recordingsDir, { recursive: true });
        console.log(`RecordingService: Created recordings directory at ${this.recordingsDir}`);
      }
    } catch (error) {
      console.error('RecordingService: Error creating recordings directory:', error);
      throw error;
    }
  }

  /**
   * Get available desktop sources (screens and windows) for recording
   * @returns Array of available sources with thumbnails
   */
  async getDesktopSources(): Promise<DesktopSource[]> {
    try {
      console.log('RecordingService: Fetching desktop sources...');

      // Get both screen and window sources
      const sources = await desktopCapturer.getSources({
        types: ['screen', 'window'],
        thumbnailSize: { width: 300, height: 200 }
      });

      console.log(`RecordingService: Found ${sources.length} sources`);

      // Map to our DesktopSource interface
      const desktopSources: DesktopSource[] = sources.map(source => ({
        id: source.id,
        name: source.name,
        thumbnail: source.thumbnail.toDataURL(),
        appIcon: source.appIcon ? source.appIcon.toDataURL() : undefined,
        display_id: source.display_id
      }));

      return desktopSources;
    } catch (error) {
      console.error('RecordingService: Error getting desktop sources:', error);

      // Check if it's a permission error (macOS specific)
      if (error instanceof Error && error.message.includes('denied')) {
        throw new Error(
          'Screen recording permission denied. Please grant screen recording permission in System Preferences > Security & Privacy > Screen Recording.'
        );
      }

      throw new Error(
        `Failed to get desktop sources: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Start screen recording for a given source
   * @param sourceId - The ID of the desktop source to record
   * @returns Recording info including recordingId and sourceId
   */
  async startScreenRecording(sourceId: string): Promise<{ recordingId: string; sourceId: string }> {
    try {
      console.log(`RecordingService: Starting recording for source ${sourceId}`);

      // Check if there's already an active recording
      if (this.activeRecording) {
        throw new Error('A recording is already in progress');
      }

      // Ensure recordings directory exists
      this.ensureRecordingsDirectory();

      // Generate unique recording ID and output path
      const recordingId = uuidv4();
      const timestamp = Date.now();
      const filename = `recording-${timestamp}.webm`;
      const outputPath = path.join(this.recordingsDir, filename);

      // Set active recording state
      this.activeRecording = {
        recordingId,
        sourceId,
        startTime: new Date(),
        outputPath
      };

      console.log(`RecordingService: Recording started with ID ${recordingId}`);
      console.log(`RecordingService: Output path: ${outputPath}`);

      return { recordingId, sourceId };
    } catch (error) {
      console.error('RecordingService: Error starting recording:', error);
      throw new Error(
        `Failed to start recording: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Start a webcam recording
   * @returns Recording ID
   */
  async startWebcamRecording(): Promise<{ recordingId: string }> {
    try {
      console.log('RecordingService: Starting webcam recording');

      // Check if there's already an active recording
      if (this.activeRecording) {
        throw new Error('A recording is already in progress');
      }

      // Ensure recordings directory exists
      this.ensureRecordingsDirectory();

      // Generate unique recording ID and output path
      const recordingId = uuidv4();
      const timestamp = Date.now();
      const filename = `recording-webcam-${timestamp}.webm`;
      const outputPath = path.join(this.recordingsDir, filename);

      // Set active recording state
      this.activeRecording = {
        recordingId,
        sourceId: 'webcam',
        startTime: new Date(),
        outputPath
      };

      console.log(`RecordingService: Webcam recording started with ID ${recordingId}`);
      console.log(`RecordingService: Output path: ${outputPath}`);

      return { recordingId };
    } catch (error) {
      console.error('RecordingService: Error starting webcam recording:', error);
      throw new Error(
        `Failed to start webcam recording: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Stop the active recording
   * @returns Output file path
   */
  async stopScreenRecording(): Promise<string> {
    try {
      if (!this.activeRecording) {
        throw new Error('No active recording to stop');
      }

      console.log(`RecordingService: Stopping recording ${this.activeRecording.recordingId}`);

      const outputPath = this.activeRecording.outputPath;
      const duration = Date.now() - this.activeRecording.startTime.getTime();

      console.log(`RecordingService: Recording duration: ${duration}ms`);
      console.log(`RecordingService: Recording saved to: ${outputPath}`);

      // Clear active recording state
      this.activeRecording = null;

      return outputPath;
    } catch (error) {
      console.error('RecordingService: Error stopping recording:', error);
      this.activeRecording = null; // Clear state even on error
      throw new Error(
        `Failed to stop recording: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get the current active recording info
   * @returns Active recording info or null if no recording is active
   */
  getActiveRecording(): ActiveRecording | null {
    return this.activeRecording;
  }

  /**
   * Get the recordings directory path
   * @returns Path to the recordings directory
   */
  getRecordingsDirectory(): string {
    return this.recordingsDir;
  }

  /**
   * Get recording file path after recording is saved
   * @returns Recording file path or null if no recording was active
   */
  getRecordingFilePath(): string | null {
    if (!this.activeRecording) {
      return null;
    }
    return this.activeRecording.outputPath;
  }

  /**
   * Start combined recording (screen + webcam) for Picture-in-Picture
   * @param screenSourceId - The ID of the screen source to record
   * @param pipConfig - Picture-in-Picture configuration (position and size)
   * @returns Recording info for both streams
   */
  async startCombinedRecording(
    screenSourceId: string,
    pipConfig: PiPConfig
  ): Promise<{
    screenRecordingId: string;
    webcamRecordingId: string;
    screenSourceId: string;
  }> {
    try {
      console.log(`RecordingService: Starting combined recording for source ${screenSourceId}`);
      console.log(`RecordingService: PiP config - position: ${pipConfig.position}, size: ${pipConfig.size}`);

      // Check if there's already an active recording
      if (this.activeRecording || this.activeCombinedRecording) {
        throw new Error('A recording is already in progress');
      }

      // Ensure recordings directory exists
      this.ensureRecordingsDirectory();

      // Generate unique recording IDs and output paths
      const screenRecordingId = uuidv4();
      const webcamRecordingId = uuidv4();
      const timestamp = Date.now();

      const screenFilename = `recording-screen-${timestamp}.webm`;
      const webcamFilename = `recording-webcam-${timestamp}.webm`;

      const screenOutputPath = path.join(this.recordingsDir, screenFilename);
      const webcamOutputPath = path.join(this.recordingsDir, webcamFilename);

      // Set active combined recording state
      this.activeCombinedRecording = {
        screenRecordingId,
        webcamRecordingId,
        screenSourceId,
        startTime: new Date(),
        screenOutputPath,
        webcamOutputPath,
        pipConfig,
      };

      console.log(`RecordingService: Combined recording started`);
      console.log(`RecordingService: Screen ID: ${screenRecordingId}, path: ${screenOutputPath}`);
      console.log(`RecordingService: Webcam ID: ${webcamRecordingId}, path: ${webcamOutputPath}`);

      return {
        screenRecordingId,
        webcamRecordingId,
        screenSourceId,
      };
    } catch (error) {
      console.error('RecordingService: Error starting combined recording:', error);
      throw new Error(
        `Failed to start combined recording: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Stop the active combined recording
   * @returns Output file paths and PiP config
   */
  async stopCombinedRecording(): Promise<{
    screenPath: string;
    webcamPath: string;
    pipConfig: PiPConfig;
  }> {
    try {
      if (!this.activeCombinedRecording) {
        throw new Error('No active combined recording to stop');
      }

      console.log('RecordingService: Stopping combined recording...');

      const screenPath = this.activeCombinedRecording.screenOutputPath;
      const webcamPath = this.activeCombinedRecording.webcamOutputPath;
      const pipConfig = this.activeCombinedRecording.pipConfig;
      const duration = Date.now() - this.activeCombinedRecording.startTime.getTime();

      console.log(`RecordingService: Combined recording duration: ${duration}ms`);
      console.log(`RecordingService: Screen saved to: ${screenPath}`);
      console.log(`RecordingService: Webcam saved to: ${webcamPath}`);

      // Clear active combined recording state
      this.activeCombinedRecording = null;

      return { screenPath, webcamPath, pipConfig };
    } catch (error) {
      console.error('RecordingService: Error stopping combined recording:', error);
      this.activeCombinedRecording = null; // Clear state even on error
      throw new Error(
        `Failed to stop combined recording: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get the current active combined recording info
   * @returns Active combined recording info or null
   */
  getActiveCombinedRecording(): ActiveCombinedRecording | null {
    return this.activeCombinedRecording;
  }
}

// Export singleton instance
export const recordingService = new RecordingService();
