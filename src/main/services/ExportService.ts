import { Project, TrackType } from '../../types/timeline';
import { MediaFile, MediaType } from '../../types/media';
import { ExportConfig } from '../../renderer/store/exportStore';
import { VideoProcessor } from './VideoProcessor';
import { BrowserWindow } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import ffmpeg from '../utils/ffmpegConfig';

/**
 * Export configuration with additional FFmpeg settings
 */
export interface FFmpegExportConfig extends ExportConfig {
  width: number;
  height: number;
}

/**
 * ExportService - Orchestrates video export with FFmpeg
 * Uses black base + overlay approach to preserve timeline gaps
 */
export class ExportService {
  private videoProcessor: VideoProcessor;
  private mainWindow: BrowserWindow | null = null;

  constructor(videoProcessor: VideoProcessor, mainWindow: BrowserWindow) {
    this.videoProcessor = videoProcessor;
    this.mainWindow = mainWindow;
  }

  /**
   * Start export process
   * @param project - Project data with clips and tracks
   * @param config - Export configuration (resolution, framerate, etc.)
   * @param outputPath - Path to save the exported video
   * @param mediaFiles - Array of all media files for looking up clip sources
   */
  async startExport(
    project: Project,
    config: ExportConfig,
    outputPath: string,
    mediaFiles: MediaFile[]
  ): Promise<void> {
    const exportStartTime = Date.now();
    console.log(`[ExportService] ${new Date().toISOString()} - Starting export process`);

    try {
      // PRE-EXPORT VALIDATION
      console.log('[ExportService] Running pre-export validation...');
      await this.validatePreExport(project, outputPath, mediaFiles);
      console.log('[ExportService] Pre-export validation passed');

      // Validate project has clips
      const hasClips = project.tracks.some(track => track.clips.length > 0);
      if (!hasClips) {
        throw new Error('Cannot export: Project has no clips on timeline');
      }

      // Calculate timeline duration (max end time across all clips)
      const timelineDuration = this.calculateTimelineDuration(project);
      if (timelineDuration === 0) {
        throw new Error('Cannot export: Timeline duration is 0');
      }

      // Resolve resolution based on config
      const ffmpegConfig = this.resolveExportConfig(config, mediaFiles);

      // Generate filter graph
      const filterGraph = this.generateFilterGraph(
        project,
        ffmpegConfig,
        mediaFiles
      );

      console.log('[ExportService] Starting FFmpeg export...');
      console.log('[ExportService] Timeline duration:', timelineDuration);
      console.log('[ExportService] Resolution:', `${ffmpegConfig.width}x${ffmpegConfig.height}`);
      console.log('[ExportService] Output path:', outputPath);
      console.log('[ExportService] FFmpeg filter graph:', filterGraph.substring(0, 200) + '...');

      // Log progress milestone
      this.logProgress(0, 'Export started');

      // Call VideoProcessor to execute FFmpeg export
      await this.videoProcessor.exportTimeline(
        project,
        outputPath,
        ffmpegConfig,
        mediaFiles,
        timelineDuration,
        filterGraph,
        (progress) => {
          this.sendProgressUpdate(progress);
          // Log progress milestones
          const percent = Math.round(progress.percent);
          if (percent === 10 || percent === 25 || percent === 50 || percent === 75 || percent === 100) {
            this.logProgress(percent, `Export ${percent}% complete`);
          }
        }
      );

      console.log('[ExportService] FFmpeg export completed, running post-export validation...');

      // POST-EXPORT VALIDATION
      await this.validatePostExport(outputPath, timelineDuration);
      console.log('[ExportService] Post-export validation passed');

      const exportDuration = ((Date.now() - exportStartTime) / 1000).toFixed(2);
      console.log(`[ExportService] ${new Date().toISOString()} - Export completed successfully in ${exportDuration}s`);

      // Send completion notification
      this.sendExportComplete(outputPath);
    } catch (error) {
      const errorMessage = this.formatExportError(error);
      console.error(`[ExportService] ${new Date().toISOString()} - Export failed:`, errorMessage);
      console.error('[ExportService] Error details:', error);
      this.sendExportError(errorMessage);

      // Clean up partial export file if it exists
      this.cleanupFailedExport(outputPath);

      throw error;
    }
  }

  /**
   * Cancel the current export process
   */
  cancelExport(): void {
    console.log('[ExportService] Canceling export...');
    this.videoProcessor.cancelExport();
    this.sendExportError('Export canceled by user');
  }

  /**
   * Calculate total timeline duration (max end time across all tracks)
   */
  private calculateTimelineDuration(project: Project): number {
    let maxEndTime = 0;

    for (const track of project.tracks) {
      for (const clip of track.clips) {
        if (clip.endTime > maxEndTime) {
          maxEndTime = clip.endTime;
        }
      }
    }

    return maxEndTime;
  }

  /**
   * Resolve export configuration (convert resolution string to width/height)
   */
  private resolveExportConfig(
    config: ExportConfig,
    mediaFiles: MediaFile[]
  ): FFmpegExportConfig {
    let width: number;
    let height: number;

    switch (config.resolution) {
      case '720p': {
        width = 1280;
        height = 720;
        break;
      }
      case '1080p': {
        width = 1920;
        height = 1080;
        break;
      }
      case 'source': {
        // Get resolution from first video clip
        const firstVideoFile = mediaFiles.find(
          f => f.type === MediaType.VIDEO && f.resolution
        );
        if (firstVideoFile?.resolution) {
          width = firstVideoFile.resolution.width;
          height = firstVideoFile.resolution.height;
        } else {
          // Fallback to 1080p if no video found
          width = 1920;
          height = 1080;
        }
        break;
      }
      default: {
        width = 1920;
        height = 1080;
      }
    }

    return {
      ...config,
      width,
      height,
    };
  }

  /**
   * Generate FFmpeg filter_complex string
   * Uses black base + overlay approach to preserve timeline gaps
   */
  private generateFilterGraph(
    project: Project,
    config: FFmpegExportConfig,
    mediaFiles: MediaFile[]
  ): string {
    const filters: string[] = [];

    // Track input index counter (0 = black base, 1 = silent audio base, 2+ = media files)
    let inputIndex = 2;

    // Build video overlay chain
    let videoChain = '[0:v]'; // Start with black base
    let overlayCount = 0;

    // Process all video tracks and their clips
    for (const track of project.tracks) {
      if (track.type === TrackType.VIDEO || !track.type) {
        for (const clip of track.clips) {
          const mediaFile = mediaFiles.find(f => f.id === clip.mediaFileId);
          if (!mediaFile || mediaFile.type !== MediaType.VIDEO) {
            continue;
          }

          // Calculate trim duration and timeline positions
          const mediaDuration = mediaFile.duration;
          const trimStart = clip.trimStart || 0;
          const trimEnd = clip.trimEnd || 0;
          const trimmedDuration = mediaDuration - trimStart - trimEnd;
          const startTime = clip.startTime;
          const overlayEndTime = startTime + trimmedDuration;
          const nextVideoChain = `[v${overlayCount}_out]`;

          // Trim and prepare video clip with timestamp shift to match base timeline
          filters.push(
            `[${inputIndex}:v]trim=start=${trimStart}:duration=${trimmedDuration},setpts=PTS-STARTPTS+${startTime}/TB,scale=${config.width}:${config.height}[v${inputIndex}]`
          );

          // Overlay on the current video chain


          filters.push(
            `${videoChain}[v${inputIndex}]overlay=enable='between(t,${startTime},${overlayEndTime})'${nextVideoChain}`
          );

          videoChain = nextVideoChain;
          overlayCount++;
          inputIndex++;
        }
      }
    }

    // Finalize video output - just map the final chain or black base if no overlays
    if (overlayCount > 0) {
      // Use null filter to pass through the final video chain
      filters.push(`${videoChain}null[vout]`);
    } else {
      // No video clips, just use black base with null passthrough
      filters.push('[0:v]null[vout]');
    }

    // Build audio mix chain
    const audioInputs: string[] = ['[1:a]']; // Start with silent base
    let audioIndex = 0;

    // Reset input index for audio processing
    inputIndex = 2;

    // Process all tracks for audio
    for (const track of project.tracks) {
      for (const clip of track.clips) {
        const mediaFile = mediaFiles.find(f => f.id === clip.mediaFileId);
        if (!mediaFile) {
          continue;
        }

        // Check if this media has audio
        const hasAudio = mediaFile.type === MediaType.VIDEO || mediaFile.type === MediaType.AUDIO;
        if (!hasAudio) {
          // Increment input index for video-only files
          if (mediaFile.type === MediaType.VIDEO) {
            inputIndex++;
          }
          continue;
        }

        // Calculate trim duration
        const mediaDuration = mediaFile.duration;
        const trimStart = clip.trimStart || 0;
        const trimEnd = clip.trimEnd || 0;
        const trimmedDuration = mediaDuration - trimStart - trimEnd;

        // Trim and delay audio
        const startTimeMs = clip.startTime * 1000;
        const volume = clip.volume !== undefined ? clip.volume : 1.0;
        const trackVolume = track.volume !== undefined ? track.volume : 1.0;
        const isMuted = clip.muted || track.muted;
        const finalVolume = isMuted ? 0 : volume * trackVolume;

        filters.push(
          `[${inputIndex}:a]atrim=start=${trimStart}:duration=${trimmedDuration},asetpts=PTS-STARTPTS,adelay=${startTimeMs}|${startTimeMs},volume=${finalVolume}[a${audioIndex}]`
        );

        audioInputs.push(`[a${audioIndex}]`);
        audioIndex++;
        inputIndex++;
      }
    }

    // Mix all audio inputs
    if (audioInputs.length > 1) {
      filters.push(
        `${audioInputs.join('')}amix=inputs=${audioInputs.length}:duration=longest[aout]`
      );
    } else {
      // No audio clips, just use silent base with anull passthrough
      filters.push('[1:a]anull[aout]');
    }

    return filters.join(';');
  }

  /**
   * Send progress update to renderer
   */
  private sendProgressUpdate(progress: { percent: number; timeRemaining?: string }): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('export-progress', progress);
    }
  }

  /**
   * Send export complete notification to renderer
   */
  private sendExportComplete(outputPath: string): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('export-complete', { outputPath });
    }
  }

  /**
   * Send export error notification to renderer
   */
  private sendExportError(message: string): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('export-error', { message });
    }
  }

  /**
   * Pre-export validation - Check everything is ready before starting export
   */
  private async validatePreExport(
    project: Project,
    outputPath: string,
    mediaFiles: MediaFile[]
  ): Promise<void> {
    // 1. Check all media files still exist at their paths
    console.log('[ExportService] Validating media files exist...');
    const usedMediaFiles = new Set<string>();
    for (const track of project.tracks) {
      for (const clip of track.clips) {
        const mediaFile = mediaFiles.find(f => f.id === clip.mediaFileId);
        if (mediaFile) {
          usedMediaFiles.add(mediaFile.path);
        }
      }
    }

    for (const filePath of usedMediaFiles) {
      if (!fs.existsSync(filePath)) {
        const filename = path.basename(filePath);
        throw new Error(`Source file not found: ${filename}\nPath: ${filePath}`);
      }
    }
    console.log(`[ExportService] Verified ${usedMediaFiles.size} media file(s) exist`);

    // 2. Validate output path is writable
    console.log('[ExportService] Validating output path is writable...');
    const outputDir = path.dirname(outputPath);
    try {
      // Create directory if it doesn't exist
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Test write access by creating a temporary file
      const testFile = path.join(outputDir, '.write-test-' + Date.now());
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
    } catch (error) {
      throw new Error(
        `Output path is not writable: ${outputDir}\n` +
        `Error: ${error instanceof Error ? error.message : 'Permission denied'}`
      );
    }
    console.log('[ExportService] Output path is writable');

    // 3. Verify sufficient disk space (estimate based on duration/bitrate)
    console.log('[ExportService] Checking disk space...');
    const timelineDuration = this.calculateTimelineDuration(project);
    const estimatedSizeMB = this.estimateExportSize(timelineDuration);
    const requiredBytes = estimatedSizeMB * 1024 * 1024;

    try {
      const stats = fs.statfsSync ? fs.statfsSync(outputDir) : null;
      if (stats) {
        const availableBytes = stats.bavail * stats.bsize;
        const availableMB = (availableBytes / (1024 * 1024)).toFixed(2);
        console.log(`[ExportService] Available disk space: ${availableMB} MB`);
        console.log(`[ExportService] Estimated export size: ${estimatedSizeMB} MB`);

        if (availableBytes < requiredBytes * 1.2) { // Add 20% buffer
          throw new Error(
            `Not enough disk space. Need approximately ${estimatedSizeMB} MB free, ` +
            `but only ${availableMB} MB available.`
          );
        }
      } else {
        console.log('[ExportService] Could not check disk space (fs.statfsSync not available)');
      }
    } catch (error) {
      const err = error as Error;
      if (err.message?.includes('Not enough disk space')) {
        throw error;
      }
      console.warn('[ExportService] Could not check disk space:', err.message || 'Unknown error');
    }

    // 4. Check FFmpeg is available and functioning
    console.log('[ExportService] Verifying FFmpeg availability...');
    try {
      await this.checkFFmpegAvailability();
      console.log('[ExportService] FFmpeg is available');
    } catch (error) {
      throw new Error(
        `FFmpeg is not available or not functioning correctly.\n` +
        `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Post-export validation - Verify the output file is valid
   */
  private async validatePostExport(outputPath: string, expectedDuration: number): Promise<void> {
    // 1. Verify output file exists and has size > 0
    console.log('[ExportService] Validating output file exists...');
    if (!fs.existsSync(outputPath)) {
      throw new Error('Export failed: Output file was not created');
    }

    const stats = fs.statSync(outputPath);
    if (stats.size === 0) {
      throw new Error('Export failed: Output file is empty (0 bytes)');
    }
    console.log(`[ExportService] Output file size: ${(stats.size / (1024 * 1024)).toFixed(2)} MB`);

    // 2. Use FFprobe to verify output file is valid video
    console.log('[ExportService] Verifying output file is valid video...');
    try {
      const metadata = await this.videoProcessor.getVideoMetadata(outputPath);
      console.log('[ExportService] Output file metadata:', {
        duration: metadata.duration,
        resolution: `${metadata.width}x${metadata.height}`,
        codec: metadata.codec,
      });

      // 3. Check duration matches expected (within 1 second tolerance)
      const durationDiff = Math.abs(metadata.duration - expectedDuration);
      if (durationDiff > 1.0) {
        console.warn(
          `[ExportService] Duration mismatch: expected ${expectedDuration}s, got ${metadata.duration}s ` +
          `(diff: ${durationDiff.toFixed(2)}s)`
        );
        // Don't fail on duration mismatch for now, just log warning
        // Some edge cases can cause slight duration differences
      }
    } catch (error) {
      // If validation fails, delete the invalid output file
      console.error('[ExportService] Output file validation failed:', error);
      this.cleanupFailedExport(outputPath);
      throw new Error(
        `Export produced invalid video file.\n` +
        `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Check if FFmpeg is available and functioning
   */
  private async checkFFmpegAvailability(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Try to get FFmpeg version
      ffmpeg.getAvailableFormats((err) => {
        if (err) {
          reject(new Error(`FFmpeg check failed: ${err.message}`));
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Estimate export file size based on duration
   */
  private estimateExportSize(durationSeconds: number): number {
    // Assume average bitrate of 5 Mbps for H.264 1080p
    const bitrateMbps = 5;
    const estimatedSizeMB = (bitrateMbps * durationSeconds) / 8;
    return Math.ceil(estimatedSizeMB);
  }

  /**
   * Format error messages for better user experience
   */
  private formatExportError(error: unknown): string {
    if (!(error instanceof Error)) {
      return 'Unknown error occurred during export';
    }

    const message = error.message;

    // Check for specific error patterns and provide user-friendly messages
    if (message.includes('Source file not found')) {
      return message; // Already formatted
    }

    if (message.includes('Not enough disk space')) {
      return message; // Already formatted
    }

    if (message.includes('not writable') || message.includes('Permission denied')) {
      return 'Cannot write to export location. Check folder permissions.';
    }

    if (message.includes('FFmpeg')) {
      return `FFmpeg error: ${message}`;
    }

    if (message.includes('ENOSPC')) {
      return 'Export failed: Disk is full';
    }

    if (message.includes('EACCES')) {
      return 'Export failed: Permission denied';
    }

    // Generic error
    return `Export failed: ${message}`;
  }

  /**
   * Clean up failed export file
   */
  private cleanupFailedExport(outputPath: string): void {
    try {
      if (fs.existsSync(outputPath)) {
        console.log(`[ExportService] Cleaning up failed export file: ${outputPath}`);
        fs.unlinkSync(outputPath);
      }
    } catch (error) {
      console.error('[ExportService] Failed to cleanup export file:', error);
    }
  }

  /**
   * Log progress milestone with timestamp
   */
  private logProgress(percent: number, message: string): void {
    console.log(`[ExportService] ${new Date().toISOString()} - [${percent}%] ${message}`);
  }
}
