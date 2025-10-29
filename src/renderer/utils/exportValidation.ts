import { Project } from '../../types/timeline';
import { ExportConfig } from '../store/exportStore';

/**
 * Client-side export validation utilities
 * These run before sending export to main process
 */

export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Validate export configuration
 * @param config - Export configuration to validate
 * @returns Array of validation errors (empty if valid)
 */
export function validateExportConfig(config: ExportConfig): ValidationError[] {
  const errors: ValidationError[] = [];

  // Check resolution
  if (!config.resolution || !['720p', '1080p', 'source'].includes(config.resolution)) {
    errors.push({
      field: 'resolution',
      message: 'Invalid resolution selected',
    });
  }

  // Check frame rate
  if (!config.frameRate || ![24, 30, 60].includes(config.frameRate)) {
    errors.push({
      field: 'frameRate',
      message: 'Invalid frame rate selected',
    });
  }

  // Check save path
  if (!config.savePath || config.savePath.trim() === '') {
    errors.push({
      field: 'savePath',
      message: 'Export location is required',
    });
  }

  // Check save path has .mp4 extension
  if (config.savePath && !config.savePath.toLowerCase().endsWith('.mp4')) {
    errors.push({
      field: 'savePath',
      message: 'Export file must have .mp4 extension',
    });
  }

  return errors;
}

/**
 * Validate timeline is exportable
 * @param project - Project with timeline to validate
 * @returns Array of validation errors (empty if valid)
 */
export function validateTimeline(project: Project | null): ValidationError[] {
  const errors: ValidationError[] = [];

  // Check project exists
  if (!project) {
    errors.push({
      field: 'project',
      message: 'No project loaded',
    });
    return errors;
  }

  // Check timeline has tracks
  if (!project.tracks || project.tracks.length === 0) {
    errors.push({
      field: 'timeline',
      message: 'Timeline has no tracks',
    });
    return errors;
  }

  // Check timeline has at least one clip
  const hasClips = project.tracks.some((track) => track.clips && track.clips.length > 0);
  if (!hasClips) {
    errors.push({
      field: 'timeline',
      message: 'Timeline is empty. Please add clips to the timeline first.',
    });
    return errors;
  }

  // Check timeline duration is not zero
  let maxEndTime = 0;
  for (const track of project.tracks) {
    for (const clip of track.clips) {
      if (clip.endTime > maxEndTime) {
        maxEndTime = clip.endTime;
      }
    }
  }

  if (maxEndTime === 0) {
    errors.push({
      field: 'timeline',
      message: 'Timeline duration is 0 seconds',
    });
  }

  return errors;
}

/**
 * Estimate export file size
 * @param project - Project with timeline
 * @param config - Export configuration
 * @returns Estimated file size in MB
 */
export function estimateExportSize(project: Project | null, config: ExportConfig): number {
  if (!project) return 0;

  // Calculate timeline duration
  let maxEndTime = 0;
  for (const track of project.tracks) {
    for (const clip of track.clips) {
      if (clip.endTime > maxEndTime) {
        maxEndTime = clip.endTime;
      }
    }
  }

  const duration = maxEndTime;

  // Rough bitrate estimates based on resolution (in Mbps)
  const bitrates: Record<string, number> = {
    '720p': 3,
    '1080p': 5,
    'source': 5, // Assume similar to 1080p
  };

  const bitrate = bitrates[config.resolution] || 5;

  // Calculate estimated size: (bitrate in Mbps * duration in seconds) / 8 = MB
  const estimatedSizeMB = (bitrate * duration) / 8;

  return Math.ceil(estimatedSizeMB);
}

/**
 * Format file size for display
 * @param sizeInMB - Size in megabytes
 * @returns Formatted size string (e.g., "125 MB" or "1.2 GB")
 */
export function formatFileSize(sizeInMB: number): string {
  if (sizeInMB < 1) {
    return `${Math.round(sizeInMB * 1024)} KB`;
  }

  if (sizeInMB >= 1000) {
    const sizeInGB = sizeInMB / 1024;
    return `${sizeInGB.toFixed(2)} GB`;
  }

  return `${Math.round(sizeInMB)} MB`;
}

/**
 * Validate all export requirements before starting
 * Returns a single error message or null if valid
 */
export function validateExport(
  project: Project | null,
  config: ExportConfig
): string | null {
  // Validate timeline
  const timelineErrors = validateTimeline(project);
  if (timelineErrors.length > 0) {
    return timelineErrors[0].message;
  }

  // Validate config
  const configErrors = validateExportConfig(config);
  if (configErrors.length > 0) {
    return configErrors[0].message;
  }

  return null;
}
