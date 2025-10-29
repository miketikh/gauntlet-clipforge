/**
 * Clip Query Service
 * Centralized service for finding clips at positions on the timeline
 */

import { TimelineClip, Track, TrackType, Project } from '../../../types/timeline';
import { findClipAtPosition } from '../../utils/timelineCalculations';

export interface ClipQueryResult {
  videoClip: TimelineClip | null;
  audioClips: TimelineClip[];
}

export class ClipQueryService {
  private project: Project;

  constructor(project: Project) {
    this.project = project;
  }

  /**
   * Update the project reference (call when timeline changes)
   */
  updateProject(project: Project): void {
    this.project = project;
  }

  /**
   * Get all clips (video + audio) at a specific playhead position
   */
  getClipsAtPosition(position: number): ClipQueryResult {
    const result: ClipQueryResult = {
      videoClip: null,
      audioClips: []
    };

    if (!this.project.tracks || this.project.tracks.length === 0) {
      return result;
    }

    this.project.tracks.forEach(track => {
      const clip = findClipAtPosition(track, position);
      if (!clip) return;

      const trackType = track.type || TrackType.VIDEO;
      if (trackType === TrackType.VIDEO) {
        result.videoClip = clip;
      } else if (trackType === TrackType.AUDIO) {
        result.audioClips.push(clip);
      }
    });

    return result;
  }

  /**
   * Get the video clip at a specific playhead position (Track 0 only for MVP)
   */
  getVideoClipAtPosition(position: number): TimelineClip | null {
    if (!this.project.tracks || this.project.tracks.length === 0) {
      return null;
    }

    // Only play Track 0 (main track) for MVP
    const mainTrack = this.project.tracks[0];
    return findClipAtPosition(mainTrack, position);
  }

  /**
   * Get the next clip after the current one on the same track
   */
  getNextClipInTrack(currentClip: TimelineClip): TimelineClip | null {
    const mainTrack = this.project.tracks[0];
    if (!mainTrack) return null;

    // Find clips that start at or after current clip's end time
    const nextClips = mainTrack.clips
      .filter(clip => clip.startTime >= currentClip.endTime)
      .sort((a, b) => a.startTime - b.startTime);

    return nextClips.length > 0 ? nextClips[0] : null;
  }

  /**
   * Find the next clip after a given timeline position
   * Searches ALL tracks and returns the earliest clip
   */
  findNextClipAfter(position: number): TimelineClip | null {
    let nextClip: TimelineClip | null = null;
    let earliestTime = Infinity;

    // Search all tracks for the earliest next clip
    for (const track of this.project.tracks) {
      const nextInTrack = track.clips
        .filter(clip => clip.startTime > position)
        .sort((a, b) => a.startTime - b.startTime)[0];

      if (nextInTrack && nextInTrack.startTime < earliestTime) {
        nextClip = nextInTrack;
        earliestTime = nextInTrack.startTime;
      }
    }

    return nextClip;
  }

  /**
   * Check if there's a clip at a specific position
   */
  hasClipAtPosition(position: number): boolean {
    return this.getVideoClipAtPosition(position) !== null;
  }
}
