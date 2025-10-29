import ffmpeg from '../utils/ffmpegConfig';
import * as os from 'os';
import { Project } from '../../types/timeline';
import { MediaFile } from '../../types/media';
import { FFmpegExportConfig } from './ExportService';
import { spawn, ChildProcess } from 'child_process';

/**
 * VideoProcessor - Service class for FFmpeg video processing operations
 * Provides methods for trimming, concatenating, thumbnail extraction, and metadata retrieval
 */
export class VideoProcessor {
  private ffmpegPath: string | null = null;
  private currentExportProcess: ChildProcess | null = null;
  /**
   * Initialize VideoProcessor and configure FFmpeg binary path
   */
  constructor() {
    // FFmpeg path is already configured in ffmpegConfig.ts
    console.log('VideoProcessor initialized');

    // Get FFmpeg path for direct spawn usage
    this.detectFFmpegPath();
  }

  /**
   * Detect FFmpeg binary path
   */
  private detectFFmpegPath(): void {
    // Use default "ffmpeg" command which should be in PATH or provided by ffmpeg-static
    this.ffmpegPath = 'ffmpeg';
    console.log('FFmpeg path set to:', this.ffmpegPath);
  }

  /**
   * Trim a video segment from a source video file
   * @param input - Path to input video file
   * @param output - Path to output trimmed video file
   * @param startTime - Start time in seconds or HH:MM:SS format
   * @param endTime - End time in seconds or HH:MM:SS format
   * @returns Promise that resolves when trimming is complete
   */
  async trimVideo(
    input: string,
    output: string,
    startTime: number | string,
    endTime: number | string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(input)
        .setStartTime(startTime)
        .setDuration(typeof endTime === 'number' && typeof startTime === 'number'
          ? endTime - startTime
          : endTime)
        .output(output)
        .on('end', () => {
          console.log(`Video trimmed successfully: ${output}`);
          resolve();
        })
        .on('error', (err) => {
          console.error('Error trimming video:', err.message);
          reject(new Error(`Failed to trim video: ${err.message}`));
        })
        .run();
    });
  }

  /**
   * Concatenate multiple video files into a single output file
   * @param inputs - Array of input video file paths
   * @param output - Path to output concatenated video file
   * @returns Promise that resolves when concatenation is complete
   */
  async concatenateVideos(inputs: string[], output: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!inputs || inputs.length === 0) {
        reject(new Error('No input videos provided for concatenation'));
        return;
      }

      const command = ffmpeg();

      // Add all input files
      inputs.forEach(input => {
        command.input(input);
      });

      command
        .on('end', () => {
          console.log(`Videos concatenated successfully: ${output}`);
          resolve();
        })
        .on('error', (err) => {
          console.error('Error concatenating videos:', err.message);
          reject(new Error(`Failed to concatenate videos: ${err.message}`));
        })
        .mergeToFile(output, os.tmpdir());
    });
  }

  /**
   * Extract a thumbnail image from a video at a specific timestamp
   * @param videoPath - Path to input video file
   * @param timestamp - Time in seconds or HH:MM:SS format to extract thumbnail
   * @param outputPath - Path to output thumbnail image (PNG format)
   * @returns Promise that resolves when thumbnail is extracted
   */
  async extractThumbnail(
    videoPath: string,
    timestamp: number | string,
    outputPath: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      // Convert timestamp to string for fluent-ffmpeg compatibility
      const timestampStr = typeof timestamp === 'number' ? timestamp.toString() : timestamp;

      ffmpeg(videoPath)
        .screenshots({
          timestamps: [timestampStr],
          filename: outputPath.split('/').pop() || 'thumbnail.png',
          folder: outputPath.substring(0, outputPath.lastIndexOf('/')),
          size: '320x240'
        })
        .on('end', () => {
          console.log(`Thumbnail extracted successfully: ${outputPath}`);
          resolve();
        })
        .on('error', (err) => {
          console.error('Error extracting thumbnail:', err.message);
          reject(new Error(`Failed to extract thumbnail: ${err.message}`));
        });
    });
  }

  /**
   * Fix WebM metadata by remuxing the file with FFmpeg
   * MediaRecorder API creates WebM files without duration metadata,
   * causing playback issues. This remuxes the file without re-encoding.
   * @param inputPath - Path to input WebM file
   * @param outputPath - Path to output WebM file with fixed metadata
   * @returns Promise that resolves when remuxing is complete
   */
  async fixWebMMetadata(inputPath: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.ffmpegPath) {
        reject(new Error('FFmpeg path not configured'));
        return;
      }

      console.log(`[VideoProcessor] Fixing WebM metadata: ${inputPath} -> ${outputPath}`);

      // Use spawn to run FFmpeg with -c copy (no re-encoding) and -movflags +faststart
      const args = [
        '-i', inputPath,
        '-c', 'copy',
        '-movflags', '+faststart',
        '-y', // Overwrite output file if exists
        outputPath
      ];

      const ffmpegProcess = spawn(this.ffmpegPath, args, {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stderr = '';

      ffmpegProcess.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      ffmpegProcess.on('close', (code) => {
        if (code === 0) {
          console.log('[VideoProcessor] WebM metadata fixed successfully');
          resolve();
        } else {
          console.error('[VideoProcessor] FFmpeg stderr:', stderr);
          reject(new Error(`FFmpeg exited with code ${code} while fixing WebM metadata`));
        }
      });

      ffmpegProcess.on('error', (err) => {
        console.error('[VideoProcessor] FFmpeg process error:', err);
        reject(new Error(`Failed to start FFmpeg: ${err.message}`));
      });
    });
  }

  /**
   * Get metadata information from a video file
   * @param videoPath - Path to video file
   * @returns Promise that resolves with video metadata (duration, resolution, codec info)
   */
  async getVideoMetadata(videoPath: string): Promise<{
    duration: number;
    width: number;
    height: number;
    codec: string;
    format: string;
    bitrate: number;
  }> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) {
          console.error('Error reading video metadata:', err.message);
          reject(new Error(`Failed to get video metadata: ${err.message}`));
          return;
        }

        // Extract video stream information
        const videoStream = metadata.streams.find(s => s.codec_type === 'video');

        if (!videoStream) {
          reject(new Error('No video stream found in file'));
          return;
        }

        const result = {
          duration: metadata.format.duration || 0,
          width: videoStream.width || 0,
          height: videoStream.height || 0,
          codec: videoStream.codec_name || 'unknown',
          format: metadata.format.format_name || 'unknown',
          bitrate: metadata.format.bit_rate || 0
        };

        console.log('Video metadata retrieved:', result);
        resolve(result);
      });
    });
  }

  /**
   * Get metadata information from an audio file
   * @param audioPath - Path to audio file
   * @returns Promise that resolves with audio metadata (duration, codec info)
   */
  async getAudioMetadata(audioPath: string): Promise<{
    duration: number;
    codec: string;
    format: string;
    bitrate: number;
    sampleRate: number;
    channels: number;
  }> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(audioPath, (err, metadata) => {
        if (err) {
          console.error('Error reading audio metadata:', err.message);
          reject(new Error(`Failed to get audio metadata: ${err.message}`));
          return;
        }

        // Extract audio stream information
        const audioStream = metadata.streams.find(s => s.codec_type === 'audio');

        if (!audioStream) {
          reject(new Error('No audio stream found in file'));
          return;
        }

        const result = {
          duration: metadata.format.duration || 0,
          codec: audioStream.codec_name || 'unknown',
          format: metadata.format.format_name || 'unknown',
          bitrate: metadata.format.bit_rate || audioStream.bit_rate || 0,
          sampleRate: typeof audioStream.sample_rate === 'string' ? parseInt(audioStream.sample_rate) : (audioStream.sample_rate || 44100),
          channels: audioStream.channels || 2
        };

        console.log('Audio metadata retrieved:', result);
        resolve(result);
      });
    });
  }

  /**
   * Export timeline to video file using FFmpeg with black base + overlay approach
   * This preserves gaps in the timeline as black video
   * @param project - Project data with clips and tracks
   * @param outputPath - Path to output video file
   * @param config - Export configuration (resolution, framerate, codec)
   * @param mediaFiles - Array of all media files for clip lookup
   * @param duration - Total timeline duration in seconds
   * @param filterGraph - Pre-generated filter_complex string
   * @param onProgress - Callback for progress updates
   */
  async exportTimeline(
    project: Project,
    outputPath: string,
    config: FFmpegExportConfig,
    mediaFiles: MediaFile[],
    duration: number,
    filterGraph: string,
    onProgress?: (progress: { percent: number; timeRemaining?: string }) => void
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const { width, height, frameRate } = config;

      // Build FFmpeg command arguments
      const args: string[] = [];

      // Input 0: Black video base
      args.push(
        '-f', 'lavfi',
        '-i', `color=c=black:s=${width}x${height}:d=${duration}:r=${frameRate}`
      );

      // Input 1: Silent audio base
      args.push(
        '-f', 'lavfi',
        '-i', `anullsrc=channel_layout=stereo:sample_rate=44100:duration=${duration}`
      );

      // Add all media file inputs
      const clipPaths: string[] = [];
      for (const track of project.tracks) {
        for (const clip of track.clips) {
          const mediaFile = mediaFiles.find(f => f.id === clip.mediaFileId);
          if (mediaFile) {
            clipPaths.push(mediaFile.path);
            args.push('-i', mediaFile.path);
          }
        }
      }

      // Add filter_complex
      args.push('-filter_complex', filterGraph);

      // Map outputs
      args.push('-map', '[vout]', '-map', '[aout]');

      // Video codec settings
      args.push(
        '-c:v', 'libx264',
        '-preset', 'medium',
        '-crf', '23',
        '-pix_fmt', 'yuv420p'
      );

      // Audio codec settings
      args.push(
        '-c:a', 'aac',
        '-b:a', '192k',
        '-ar', '44100'
      );

      // Output file (overwrite if exists)
      args.push('-y', outputPath);

      console.log('[VideoProcessor] FFmpeg command:', this.ffmpegPath, args.join(' '));

      // Spawn FFmpeg process
      const ffmpegProcess = spawn(this.ffmpegPath || 'ffmpeg', args, {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      // Store process for potential cancellation
      this.currentExportProcess = ffmpegProcess;

      let stderr = '';
      const startTime = Date.now();

      // Capture stderr for progress tracking
      ffmpegProcess.stderr?.on('data', (data) => {
        stderr += data.toString();

        // Parse progress from FFmpeg output
        // FFmpeg outputs: "time=00:01:23.45" format
        const timeMatch = stderr.match(/time=(\d{2}):(\d{2}):(\d{2}\.\d{2})/);
        if (timeMatch && onProgress) {
          const hours = parseInt(timeMatch[1]);
          const minutes = parseInt(timeMatch[2]);
          const seconds = parseFloat(timeMatch[3]);
          const currentTime = hours * 3600 + minutes * 60 + seconds;

          const percent = Math.min(100, (currentTime / duration) * 100);

          // Calculate time remaining
          const elapsed = (Date.now() - startTime) / 1000;
          const rate = currentTime / elapsed;
          const remaining = duration - currentTime;
          const timeRemaining = remaining > 0 && rate > 0
            ? this.formatTime(remaining / rate)
            : undefined;

          onProgress({ percent, timeRemaining });
        }
      });

      // Handle process completion
      ffmpegProcess.on('close', (code) => {
        this.currentExportProcess = null;
        if (code === 0) {
          console.log('[VideoProcessor] Export completed successfully');
          resolve(outputPath);
        } else if (code === null) {
          // Process was killed (canceled)
          console.log('[VideoProcessor] Export was canceled');
          reject(new Error('Export canceled by user'));
        } else {
          console.error('[VideoProcessor] FFmpeg stderr:', stderr);
          reject(new Error(`FFmpeg exited with code ${code}`));
        }
      });

      // Handle process errors
      ffmpegProcess.on('error', (err) => {
        this.currentExportProcess = null;
        console.error('[VideoProcessor] FFmpeg process error:', err);
        reject(new Error(`Failed to start FFmpeg: ${err.message}`));
      });
    });
  }

  /**
   * Cancel the current export process
   */
  cancelExport(): void {
    if (this.currentExportProcess) {
      console.log('[VideoProcessor] Killing FFmpeg process...');
      this.currentExportProcess.kill('SIGKILL');
      this.currentExportProcess = null;
    }
  }

  /**
   * Composite PiP recording by overlaying webcam on screen video
   * Creates a single unified video file with webcam picture-in-picture
   * @param screenPath - Path to screen recording file
   * @param webcamPath - Path to webcam recording file
   * @param pipConfig - PiP configuration (position and size)
   * @param outputPath - Path to save the composited video
   * @returns Promise that resolves when compositing is complete
   */
  async compositePiPRecording(
    screenPath: string,
    webcamPath: string,
    pipConfig: { position: string; size: string },
    outputPath: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.ffmpegPath) {
        reject(new Error('FFmpeg path not configured'));
        return;
      }

      console.log(`[VideoProcessor] Compositing PiP recording: ${screenPath} + ${webcamPath} -> ${outputPath}`);
      console.log(`[VideoProcessor] PiP config:`, pipConfig);

      // Map PiP size to scale percentage
      const sizeMap: Record<string, number> = {
        small: 0.2,   // 20%
        medium: 0.25, // 25%
        large: 0.3    // 30%
      };
      const scale = sizeMap[pipConfig.size] || 0.25;

      // Map position to overlay coordinates
      // Positions are defined as: 'bottom-right', 'bottom-left', 'top-right', 'top-left'
      const padding = 20; // pixels from edge
      let overlayX: string;
      let overlayY: string;

      switch (pipConfig.position) {
        case 'bottom-right':
          overlayX = `W-w-${padding}`;
          overlayY = `H-h-${padding}`;
          break;
        case 'bottom-left':
          overlayX = `${padding}`;
          overlayY = `H-h-${padding}`;
          break;
        case 'top-right':
          overlayX = `W-w-${padding}`;
          overlayY = `${padding}`;
          break;
        case 'top-left':
          overlayX = `${padding}`;
          overlayY = `${padding}`;
          break;
        default:
          // Default to bottom-right
          overlayX = `W-w-${padding}`;
          overlayY = `H-h-${padding}`;
      }

      console.log(`[VideoProcessor] Overlay position: x=${overlayX}, y=${overlayY}, scale=${scale}`);

      // Build FFmpeg arguments
      // Strategy: Scale webcam to PiP size, then overlay on screen video
      const filterComplex = `[1:v]scale=iw*${scale}:ih*${scale}[pip];[0:v][pip]overlay=${overlayX}:${overlayY}[vout]`;

      const args = [
        '-i', screenPath,  // Input 0: screen recording (no audio)
        '-i', webcamPath,  // Input 1: webcam recording (has audio)
        '-filter_complex', filterComplex,
        '-map', '[vout]',  // Map composited video
        '-map', '1:a',     // Map audio from webcam (screen has no audio)
        '-c:v', 'libx264', // Video codec
        '-preset', 'medium',
        '-crf', '23',
        '-pix_fmt', 'yuv420p',
        '-c:a', 'aac',     // Encode audio to AAC for MP4 compatibility
        '-b:a', '128k',    // Audio bitrate
        '-y',              // Overwrite output file
        outputPath
      ];

      console.log('[VideoProcessor] FFmpeg command:', this.ffmpegPath, args.join(' '));

      // Spawn FFmpeg process
      const ffmpegProcess = spawn(this.ffmpegPath, args, {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stderr = '';

      // Capture stderr for debugging
      ffmpegProcess.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      // Handle process completion
      ffmpegProcess.on('close', (code) => {
        if (code === 0) {
          console.log('[VideoProcessor] PiP compositing completed successfully');
          resolve();
        } else {
          console.error('[VideoProcessor] FFmpeg stderr:', stderr);
          reject(new Error(`FFmpeg exited with code ${code} while compositing PiP recording`));
        }
      });

      // Handle process errors
      ffmpegProcess.on('error', (err) => {
        console.error('[VideoProcessor] FFmpeg process error:', err);
        reject(new Error(`Failed to start FFmpeg: ${err.message}`));
      });
    });
  }

  /**
   * Format seconds into human-readable time string
   */
  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);

    if (mins === 0) {
      return `${secs}s`;
    } else if (mins < 60) {
      return `${mins}m ${secs}s`;
    } else {
      const hours = Math.floor(mins / 60);
      const remainingMins = mins % 60;
      return `${hours}h ${remainingMins}m`;
    }
  }
}
