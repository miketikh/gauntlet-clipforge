import ffmpeg from '../utils/ffmpegConfig';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import * as os from 'os';

/**
 * VideoProcessor - Service class for FFmpeg video processing operations
 * Provides methods for trimming, concatenating, thumbnail extraction, and metadata retrieval
 */
export class VideoProcessor {
  /**
   * Initialize VideoProcessor and configure FFmpeg binary path
   */
  constructor() {
    // FFmpeg path is already configured in ffmpegConfig.ts
    console.log('VideoProcessor initialized with FFmpeg at:', ffmpegInstaller.path);
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
}
