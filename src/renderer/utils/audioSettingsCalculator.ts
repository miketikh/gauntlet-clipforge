/**
 * Audio settings calculator utilities
 * Centralized audio volume and mute calculations for clips and tracks
 */

import { TimelineClip, Track } from '../../types/timeline';

/**
 * Calculated audio settings for a clip
 */
export interface AudioSettings {
  effectiveMute: boolean;
  effectiveVolume: number;
  clipVolume: number;
  trackVolume: number;
  isClipMuted: boolean;
  isTrackMuted: boolean;
}

/**
 * Calculate effective audio settings for a clip
 * Takes into account clip volume/mute, track volume/mute, and global volume
 *
 * @param clip - Timeline clip to calculate settings for
 * @param track - Track containing the clip
 * @param globalVolume - Global volume multiplier (0-1)
 * @returns Calculated audio settings
 */
export function calculateAudioSettings(
  clip: TimelineClip,
  track: Track,
  globalVolume: number
): AudioSettings {
  const isClipMuted = clip.muted ?? false;
  const isTrackMuted = track.muted ?? false;
  const effectiveMute = isClipMuted || isTrackMuted;

  const clipVolume = clip.volume ?? 1.0;
  const trackVolume = track.volume ?? 1.0;
  const effectiveVolume = clipVolume * trackVolume * globalVolume;

  return {
    effectiveMute,
    effectiveVolume,
    clipVolume,
    trackVolume,
    isClipMuted,
    isTrackMuted
  };
}
