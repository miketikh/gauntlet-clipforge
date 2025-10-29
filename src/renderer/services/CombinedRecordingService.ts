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
}

export class CombinedRecordingService {
  private screenRecorder: MediaRecorder | null = null;
  private webcamRecorder: MediaRecorder | null = null;
  private screenChunks: Blob[] = [];
  private webcamChunks: Blob[] = [];
  private startTime: number = 0;
  private pipConfig: PiPConfig | null = null;

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

      // Create screen recorder
      this.screenRecorder = new MediaRecorder(screenStream, {
        mimeType: 'video/webm;codecs=vp8,opus',
      });

      this.screenRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.screenChunks.push(event.data);
          console.log(`CombinedRecordingService: Screen chunk received (${event.data.size} bytes)`);
        }
      };

      // Create webcam recorder
      this.webcamRecorder = new MediaRecorder(webcamStream, {
        mimeType: 'video/webm;codecs=vp8,opus',
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

      // Create blobs from accumulated chunks
      const screenBlob = new Blob(this.screenChunks, { type: 'video/webm' });
      const webcamBlob = new Blob(this.webcamChunks, { type: 'video/webm' });

      console.log(`CombinedRecordingService: Screen blob size: ${screenBlob.size} bytes`);
      console.log(`CombinedRecordingService: Webcam blob size: ${webcamBlob.size} bytes`);

      if (!this.pipConfig) {
        throw new Error('PiP configuration is missing');
      }

      const data: CombinedRecordingData = {
        screenBlob,
        webcamBlob,
        pipConfig: this.pipConfig,
        duration,
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
