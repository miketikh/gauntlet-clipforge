/**
 * CombinedRecordingService manages simultaneous screen and webcam recording
 * Coordinates two MediaRecorder instances to record both streams at the same time
 */

import { PiPConfig } from '../../types/recording';

export interface CombinedRecordingData {
  screenBlob: Blob;
  webcamBlob: Blob;
  pipConfig: PiPConfig;
  duration: number;
  screenFormat: 'mp4' | 'webm';  // Track actual format used
  webcamFormat: 'mp4' | 'webm';
}

export class CombinedRecordingService {
  private screenRecorder: MediaRecorder | null = null;
  private webcamRecorder: MediaRecorder | null = null;
  private screenChunks: Blob[] = [];
  private webcamChunks: Blob[] = [];
  private startTime: number = 0;
  private pipConfig: PiPConfig | null = null;
  private screenMimeType: string = '';  // Track actual mimeType used
  private webcamMimeType: string = '';

  /**
   * Select best MIME type for screen recording (video-only, no audio)
   * Try MP4 first (more likely to work with hardware encoding), then WebM
   */
  private selectScreenMimeType(): string {
    const mimeTypeCandidates = [
      // Try MP4 first - hardware accelerated H.264 on most systems
      'video/mp4;codecs=avc1.42E01E',  // H.264 Baseline
      'video/mp4',                      // MP4 fallback
      // WebM options if MP4 not supported
      'video/webm;codecs=vp9',          // VP9 video only
      'video/webm;codecs=vp8',          // VP8 video only
      'video/webm',                     // WebM fallback
    ];

    for (const mimeType of mimeTypeCandidates) {
      if (MediaRecorder.isTypeSupported(mimeType)) {
        console.log(`CombinedRecordingService: Screen MIME type: ${mimeType}`);
        return mimeType;
      }
    }

    console.warn('CombinedRecordingService: No preferred screen MIME types supported, using default');
    return 'video/mp4';  // Default to MP4
  }

  /**
   * Select best MIME type for webcam recording (video + audio)
   * Try MP4 with audio first, then WebM
   */
  private selectWebcamMimeType(): string {
    const mimeTypeCandidates = [
      // Try MP4 first - hardware accelerated on most systems
      'video/mp4;codecs=avc1.42E01E,mp4a.40.2',  // H.264 + AAC
      'video/mp4',                                // MP4 fallback
      // WebM options if MP4 not supported
      'video/webm;codecs=vp9,opus',               // VP9 video + Opus audio
      'video/webm;codecs=vp8,opus',               // VP8 video + Opus audio
      'video/webm',                                // WebM fallback
    ];

    for (const mimeType of mimeTypeCandidates) {
      if (MediaRecorder.isTypeSupported(mimeType)) {
        console.log(`CombinedRecordingService: Webcam MIME type: ${mimeType}`);
        return mimeType;
      }
    }

    console.warn('CombinedRecordingService: No preferred webcam MIME types supported, using default');
    return 'video/mp4';  // Default to MP4
  }

  /**
   * Detect format from MIME type string
   */
  private getFormatFromMimeType(mimeType: string): 'mp4' | 'webm' {
    if (mimeType.includes('mp4')) {
      return 'mp4';
    } else if (mimeType.includes('webm')) {
      return 'webm';
    }
    // Default to mp4 if unclear
    return 'mp4';
  }

  /**
   * Start recording both screen and webcam simultaneously
   * @param screenStream - Screen capture MediaStream
   * @param webcamStream - Webcam MediaStream
   * @param pipConfig - Picture-in-Picture configuration
   */
  async startRecording(
    screenStream: MediaStream,
    webcamStream: MediaStream,
    pipConfig: PiPConfig
  ): Promise<void> {
    try {
      console.log('CombinedRecordingService: Starting combined recording...');
      this.pipConfig = pipConfig;
      this.screenChunks = [];
      this.webcamChunks = [];

      // Select best supported MIME types for each stream
      // Screen has NO audio, webcam has audio - try MP4 first (more compatible)
      this.screenMimeType = this.selectScreenMimeType();
      this.webcamMimeType = this.selectWebcamMimeType();

      console.log(`CombinedRecordingService: Using formats - Screen: ${this.getFormatFromMimeType(this.screenMimeType)}, Webcam: ${this.getFormatFromMimeType(this.webcamMimeType)}`);

      // Create screen recorder (video-only)
      this.screenRecorder = new MediaRecorder(screenStream, {
        mimeType: this.screenMimeType,
      });

      this.screenRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.screenChunks.push(event.data);
          console.log(`CombinedRecordingService: Screen chunk received (${event.data.size} bytes)`);
        }
      };

      // Create webcam recorder (video + audio)
      this.webcamRecorder = new MediaRecorder(webcamStream, {
        mimeType: this.webcamMimeType,
      });

      this.webcamRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.webcamChunks.push(event.data);
          console.log(`CombinedRecordingService: Webcam chunk received (${event.data.size} bytes)`);
        }
      };

      // Start both recorders as close together as possible
      this.startTime = Date.now();
      this.screenRecorder.start(1000); // Capture data every second
      this.webcamRecorder.start(1000);

      console.log('CombinedRecordingService: Both recorders started successfully');
    } catch (error) {
      console.error('CombinedRecordingService: Error starting recording:', error);
      this.cleanup();
      throw new Error(
        `Failed to start combined recording: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Stop both recordings and return the blobs
   * @returns Promise with both blobs and metadata
   */
  async stopRecording(): Promise<CombinedRecordingData> {
    return new Promise((resolve, reject) => {
      try {
        console.log('CombinedRecordingService: Stopping both recordings...');

        if (!this.screenRecorder || !this.webcamRecorder || !this.pipConfig) {
          throw new Error('No active combined recording to stop');
        }

        const duration = Math.floor((Date.now() - this.startTime) / 1000);
        let screenStopped = false;
        let webcamStopped = false;

        // Handle screen recorder stop
        this.screenRecorder.onstop = () => {
          console.log('CombinedRecordingService: Screen recording stopped');
          screenStopped = true;

          if (screenStopped && webcamStopped) {
            this.finishRecording(duration, resolve, reject);
          }
        };

        // Handle webcam recorder stop
        this.webcamRecorder.onstop = () => {
          console.log('CombinedRecordingService: Webcam recording stopped');
          webcamStopped = true;

          if (screenStopped && webcamStopped) {
            this.finishRecording(duration, resolve, reject);
          }
        };

        // Stop both recorders
        if (this.screenRecorder.state !== 'inactive') {
          this.screenRecorder.stop();
        } else {
          screenStopped = true;
        }

        if (this.webcamRecorder.state !== 'inactive') {
          this.webcamRecorder.stop();
        } else {
          webcamStopped = true;
        }

        // If both are already stopped, finish immediately
        if (screenStopped && webcamStopped) {
          this.finishRecording(duration, resolve, reject);
        }
      } catch (error) {
        console.error('CombinedRecordingService: Error stopping recording:', error);
        this.cleanup();
        reject(error);
      }
    });
  }

  /**
   * Finish the recording by creating blobs from chunks
   */
  private finishRecording(
    duration: number,
    resolve: (data: CombinedRecordingData) => void,
    reject: (error: Error) => void
  ): void {
    try {
      console.log('CombinedRecordingService: Creating blobs from chunks...');

      // Create blobs with correct MIME types
      const screenBlob = new Blob(this.screenChunks, { type: this.screenMimeType });
      const webcamBlob = new Blob(this.webcamChunks, { type: this.webcamMimeType });

      // Determine file formats
      const screenFormat = this.getFormatFromMimeType(this.screenMimeType);
      const webcamFormat = this.getFormatFromMimeType(this.webcamMimeType);

      console.log(`CombinedRecordingService: Screen blob size: ${screenBlob.size} bytes (format: ${screenFormat})`);
      console.log(`CombinedRecordingService: Webcam blob size: ${webcamBlob.size} bytes (format: ${webcamFormat})`);

      if (!this.pipConfig) {
        throw new Error('PiP configuration is missing');
      }

      const data: CombinedRecordingData = {
        screenBlob,
        webcamBlob,
        pipConfig: this.pipConfig,
        duration,
        screenFormat,
        webcamFormat,
      };

      this.cleanup();
      resolve(data);
    } catch (error) {
      console.error('CombinedRecordingService: Error finishing recording:', error);
      this.cleanup();
      reject(error instanceof Error ? error : new Error('Unknown error finishing recording'));
    }
  }

  /**
   * Clean up recording state
   */
  private cleanup(): void {
    this.screenRecorder = null;
    this.webcamRecorder = null;
    this.screenChunks = [];
    this.webcamChunks = [];
    this.pipConfig = null;
    this.startTime = 0;
    this.screenMimeType = '';
    this.webcamMimeType = '';
  }

  /**
   * Check if currently recording
   */
  isRecording(): boolean {
    return (
      this.screenRecorder !== null &&
      this.webcamRecorder !== null &&
      (this.screenRecorder.state === 'recording' || this.webcamRecorder.state === 'recording')
    );
  }
}
