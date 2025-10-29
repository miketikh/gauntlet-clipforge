/**
 * WebcamService handles webcam access and device enumeration
 * Uses standard getUserMedia API for webcam recording
 */

export interface WebcamDevice {
  deviceId: string;
  label: string;
  groupId: string;
}

export class WebcamService {
  private stream: MediaStream | null = null;

  /**
   * Get list of available video input devices (webcams)
   * @returns Array of WebcamDevice objects
   */
  async getAvailableDevices(): Promise<WebcamDevice[]> {
    try {
      // First request permission to enumerate devices
      const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
      tempStream.getTracks().forEach(track => track.stop());

      // Now enumerate devices (labels will be available after permission grant)
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');

      return videoDevices.map(device => ({
        deviceId: device.deviceId,
        label: device.label || `Camera ${videoDevices.indexOf(device) + 1}`,
        groupId: device.groupId,
      }));
    } catch (error) {
      console.error('WebcamService: Error enumerating devices:', error);
      throw new Error(
        `Failed to access camera devices: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Request webcam access and return stream
   * @param deviceId - Optional specific device ID to use
   * @param constraints - Optional video constraints (default: 720p)
   * @returns MediaStream with video and audio tracks
   */
  async getWebcamStream(
    deviceId?: string,
    constraints?: MediaStreamConstraints
  ): Promise<MediaStream> {
    try {
      const defaultConstraints: MediaStreamConstraints = {
        video: deviceId
          ? {
              deviceId: { exact: deviceId },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            }
          : {
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
        audio: true, // Include microphone audio
      };

      const finalConstraints = constraints || defaultConstraints;

      this.stream = await navigator.mediaDevices.getUserMedia(finalConstraints);
      console.log('WebcamService: Got webcam stream');

      return this.stream;
    } catch (error) {
      console.error('WebcamService: Error getting webcam stream:', error);

      // Provide helpful error messages
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          throw new Error('Camera permission denied. Please grant camera access and try again.');
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
          throw new Error('No camera found. Please connect a camera and try again.');
        } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
          throw new Error(
            'Camera is already in use by another application. Please close other apps using the camera.'
          );
        }
      }

      throw new Error(
        `Failed to access camera: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Stop all tracks in the current stream
   */
  stopStream(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => {
        track.stop();
        console.log(`WebcamService: Stopped ${track.kind} track`);
      });
      this.stream = null;
    }
  }

  /**
   * Check if webcam permission is granted
   * @returns true if permission is granted, false otherwise
   */
  async checkPermission(): Promise<boolean> {
    try {
      if (!navigator.permissions) {
        // Permissions API not available, try to request access
        return false;
      }

      const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
      return result.state === 'granted';
    } catch (error) {
      console.warn('WebcamService: Could not check camera permission:', error);
      return false;
    }
  }
}
