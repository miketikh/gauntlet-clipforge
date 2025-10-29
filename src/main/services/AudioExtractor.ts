import ffmpeg from '../utils/ffmpegConfig';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

/**
 * AudioExtractor - Service class for extracting audio from video files
 * Used for AI transcription workflow (extract -> transcribe -> cleanup)
 */
export class AudioExtractor {
  /**
   * Initialize AudioExtractor
   */
  constructor() {
    console.log('[AudioExtractor] Initialized');
  }

  /**
   * Extract audio from video file to MP3 format
   * @param videoPath - Path to input video file
   * @param outputPath - Optional path to output MP3 file (defaults to system temp directory)
   * @returns Promise that resolves with the output file path
   */
  async extractAudio(videoPath: string, outputPath?: string): Promise<string> {
    return new Promise((resolve, reject) => {
      // Verify input file exists
      if (!fs.existsSync(videoPath)) {
        const error = new Error(`Video file not found: ${videoPath}`);
        console.error('[AudioExtractor]', error.message);
        reject(error);
        return;
      }

      // Generate output path if not provided
      const finalOutputPath = outputPath || path.join(
        os.tmpdir(),
        `audio-${Date.now()}.mp3`
      );

      console.log(`[AudioExtractor] Extracting audio from: ${videoPath}`);
      console.log(`[AudioExtractor] Output path: ${finalOutputPath}`);

      ffmpeg(videoPath)
        .noVideo() // No video stream
        .audioCodec('libmp3lame') // MP3 codec
        .audioBitrate('128k') // 128kbps quality (good for speech)
        .output(finalOutputPath)
        .on('start', (commandLine) => {
          console.log('[AudioExtractor] FFmpeg command:', commandLine);
        })
        .on('progress', (progress) => {
          if (progress.percent) {
            console.log(`[AudioExtractor] Progress: ${progress.percent.toFixed(1)}%`);
          }
        })
        .on('end', () => {
          console.log('[AudioExtractor] Audio extraction completed successfully');
          resolve(finalOutputPath);
        })
        .on('error', (err, stdout, stderr) => {
          console.error('[AudioExtractor] Error during extraction:', err.message);

          // Check for common error cases
          if (stderr && stderr.includes('Stream map')) {
            const noAudioError = new Error('No audio track found in video file');
            console.error('[AudioExtractor]', noAudioError.message);
            reject(noAudioError);
          } else if (stderr && stderr.includes('No such file')) {
            const notFoundError = new Error(`Video file not found: ${videoPath}`);
            console.error('[AudioExtractor]', notFoundError.message);
            reject(notFoundError);
          } else {
            reject(new Error(`Failed to extract audio: ${err.message}`));
          }
        })
        .run();
    });
  }

  /**
   * Get duration of audio file using ffprobe
   * @param audioPath - Path to audio file
   * @returns Promise that resolves with duration in seconds
   */
  async getAudioDuration(audioPath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      // Verify file exists
      if (!fs.existsSync(audioPath)) {
        const error = new Error(`Audio file not found: ${audioPath}`);
        console.error('[AudioExtractor]', error.message);
        reject(error);
        return;
      }

      console.log(`[AudioExtractor] Getting duration for: ${audioPath}`);

      ffmpeg.ffprobe(audioPath, (err, metadata) => {
        if (err) {
          console.error('[AudioExtractor] Error reading audio metadata:', err.message);
          reject(new Error(`Failed to get audio duration: ${err.message}`));
          return;
        }

        // Extract duration from format metadata
        const duration = metadata.format.duration || 0;
        console.log(`[AudioExtractor] Audio duration: ${duration} seconds`);
        resolve(duration);
      });
    });
  }

  /**
   * Delete temporary audio file
   * @param filePath - Path to temporary file to delete
   */
  deleteTemporaryFile(filePath: string): void {
    try {
      // Check if file exists before attempting deletion
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`[AudioExtractor] Cleaned up temporary audio file: ${filePath}`);
      } else {
        console.log(`[AudioExtractor] Temporary file does not exist (already deleted?): ${filePath}`);
      }
    } catch (error) {
      console.error(`[AudioExtractor] Error deleting temporary file: ${filePath}`, error);
      // Don't throw - cleanup errors shouldn't break the workflow
    }
  }
}

// Export singleton instance
export const audioExtractor = new AudioExtractor();
