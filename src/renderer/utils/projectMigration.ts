/**
 * Project migration utilities
 * Upgrades old project formats to current schema
 */

import { Project, TrackType } from '../../types/timeline';
import { MediaType } from '../../types/media';

/**
 * Current schema version
 */
export const CURRENT_SCHEMA_VERSION = 2;

/**
 * Migrate a project to the latest schema
 */
export function migrateProject(project: any): Project {
  // Add schema version if missing
  const schemaVersion = project.schemaVersion || 1;

  // Version 1 -> 2: Add audio properties and track types
  if (schemaVersion < 2) {
    project = migrateV1toV2(project);
  }

  return {
    ...project,
    schemaVersion: CURRENT_SCHEMA_VERSION
  };
}

/**
 * V1 -> V2: Add audio properties and track types
 */
function migrateV1toV2(project: any): any {
  return {
    ...project,
    tracks: project.tracks?.map((track: any) => ({
      ...track,
      type: track.type || TrackType.VIDEO,
      volume: track.volume ?? 1.0,
      muted: track.muted ?? false,
      clips: track.clips?.map((clip: any) => ({
        ...clip,
        volume: clip.volume ?? 1.0,
        muted: clip.muted ?? false,
        fadeIn: clip.fadeIn ?? 0,
        fadeOut: clip.fadeOut ?? 0,
        cutRanges: clip.cutRanges ?? []
      })) || []
    })) || [],
    transcripts: project.transcripts ?? {}
  };
}

/**
 * Migrate a MediaFile to the latest schema
 */
export function migrateMediaFile(media: any): any {
  return {
    ...media,
    type: media.type || MediaType.VIDEO,
    resolution: media.resolution || undefined,
    audioMetadata: media.audioMetadata || undefined,
    waveformData: media.waveformData || undefined
  };
}
