/**
 * MediaRecorderService handles browser-based media recording
 * Uses navigator.mediaDevices.getUserMedia() with chromeMediaSourceId constraint
 */
export class MediaRecorderService {
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private stream: MediaStream | null = null;

  /**
   * Start recording from a desktop capturer source
   * @param sourceId - The desktop capturer source ID
   * @returns Promise that resolves when recording starts
   */
  async startRecording(sourceId: string): Promise<void> {
    try {
      console.log(`MediaRecorderService: Starting recording for source ${sourceId}`);

      // Get media stream using chromeMediaSourceId constraint
      // This tells getUserMedia to use the Electron desktopCapturer source
      // Using any type here because chromeMediaSourceId is Electron-specific and not in standard types
      const constraints: any = {
        audio: false, // Screen recording without system audio for MVP
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: sourceId,
          }
        }
      };

      this.stream = await navigator.mediaDevices.getUserMedia(constraints);

      console.log('MediaRecorderService: Got media stream');

      // Create MediaRecorder with WebM output
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: 'video/webm;codecs=vp8',
      });

      // Reset chunks array
      this.chunks = [];

      // Handle data available event
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.chunks.push(event.data);
          console.log(`MediaRecorderService: Received chunk (${event.data.size} bytes), total chunks: ${this.chunks.length}`);
        }
      };

      // Handle recording stop event
      this.mediaRecorder.onstop = () => {
        console.log('MediaRecorderService: Recording stopped');
      };

      // Handle recording error
      this.mediaRecorder.onerror = (event) => {
        console.error('MediaRecorderService: Recording error:', event);
      };

      // Start recording - request data every second for progress tracking
      this.mediaRecorder.start(1000);

      console.log('MediaRecorderService: Recording started successfully');
    } catch (error) {
      console.error('MediaRecorderService: Error starting recording:', error);
      this.cleanup();
      throw new Error(
        `Failed to start recording: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Stop the recording and return the recorded blob
   * @returns Promise that resolves with the recorded video blob
   */
  async stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      try {
        if (!this.mediaRecorder) {
          reject(new Error('No active recording to stop'));
          return;
        }

        if (this.mediaRecorder.state === 'inactive') {
          reject(new Error('Recording is already stopped'));
          return;
        }

        console.log('MediaRecorderService: Stopping recording...');

        // Listen for the stop event to create the blob
        this.mediaRecorder.onstop = () => {
          console.log(`MediaRecorderService: Creating blob from ${this.chunks.length} chunks`);

          // Create blob from all chunks
          const blob = new Blob(this.chunks, { type: 'video/webm' });
          console.log(`MediaRecorderService: Created blob (${blob.size} bytes)`);

          // Cleanup
          this.cleanup();

          resolve(blob);
        };

        // Stop the recording
        this.mediaRecorder.stop();
      } catch (error) {
        console.error('MediaRecorderService: Error stopping recording:', error);
        this.cleanup();
        reject(error);
      }
    });
  }

  /**
   * Check if recording is active
   * @returns true if recording is active
   */
  isRecording(): boolean {
    return this.mediaRecorder !== null && this.mediaRecorder.state === 'recording';
  }

  /**
   * Get the current recording state
   * @returns The MediaRecorder state or 'inactive' if no recorder
   */
  getState(): RecordingState {
    if (!this.mediaRecorder) {
      return 'inactive';
    }
    return this.mediaRecorder.state;
  }

  /**
   * Cleanup media resources
   */
  private cleanup(): void {
    // Stop all media tracks
    if (this.stream) {
      this.stream.getTracks().forEach(track => {
        track.stop();
        console.log(`MediaRecorderService: Stopped track ${track.kind}`);
      });
      this.stream = null;
    }

    // Clear recorder reference
    this.mediaRecorder = null;

    // Keep chunks until blob is created
    // chunks will be reset on next recording start
  }
}
