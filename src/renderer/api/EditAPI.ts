/**
 * Programmatic Edit API Layer
 *
 * Provides a clean API for all timeline editing operations.
 * Used by both UI components and future AI agents.
 *
 * Features:
 * - Input validation for all operations
 * - Command pattern for edit history (enables future undo/redo)
 * - Promise-based API for async compatibility
 * - Comprehensive error handling with descriptive messages
 *
 * @example
 * ```typescript
 * // Add a clip to the timeline
 * await editAPI.addClip('media-123', 0, 0);
 *
 * // Trim a clip
 * await editAPI.trimClip('clip-456', 2, 5);
 *
 * // Split a clip at 3 seconds
 * await editAPI.splitClip('clip-456', 3);
 * ```
 */

import { useProjectStore } from '../store/projectStore';
import { useMediaStore } from '../store/mediaStore';
import { TimelineClip } from '../../types/timeline';

export class EditAPI {
  /**
   * Add a new clip to the timeline
   *
   * @param mediaFileId - ID of the media file to add
   * @param trackIndex - Track to add the clip to (0 or 1 for MVP)
   * @param startTime - Position on timeline where clip starts (seconds)
   * @returns Promise resolving to the created clip ID
   * @throws Error if validation fails
   */
  async addClip(
    mediaFileId: string,
    trackIndex: number,
    startTime: number
  ): Promise<string> {
    console.log('[EditAPI] addClip:', { mediaFileId, trackIndex, startTime });

    // Validation: Check if media file exists
    const mediaStore = useMediaStore.getState();
    const mediaFile = mediaStore.mediaFiles.find(f => f.id === mediaFileId);
    if (!mediaFile) {
      throw new Error(`Media file not found: ${mediaFileId}`);
    }

    // Validation: Check track index is valid
    const projectStore = useProjectStore.getState();
    if (!projectStore.currentProject) {
      throw new Error('No active project. Create a project first.');
    }

    if (trackIndex < 0 || trackIndex >= projectStore.currentProject.tracks.length) {
      throw new Error(
        `Invalid track index: ${trackIndex}. Must be between 0 and ${projectStore.currentProject.tracks.length - 1}`
      );
    }

    // Validation: Check for overlapping clips on the same track
    const track = projectStore.currentProject.tracks[trackIndex];
    const endTime = startTime + mediaFile.duration;

    const hasOverlap = track.clips.some(clip => {
      return !(endTime <= clip.startTime || startTime >= clip.endTime);
    });

    if (hasOverlap) {
      // Find the next available position
      const nextAvailablePosition = this.findNextAvailablePosition(trackIndex, startTime);
      console.warn(
        `[EditAPI] Clip would overlap at position ${startTime}. ` +
        `Snapping to next available position: ${nextAvailablePosition}`
      );
      startTime = nextAvailablePosition;
    }

    // Generate clip ID before adding
    const clipId = `clip-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Add clip to project store (this will use the actual media duration)
    projectStore.addClipToTrack(mediaFileId, trackIndex, startTime);

    // Record command in history
    projectStore.addCommand({
      type: 'ADD_CLIP',
      payload: { mediaFileId, trackIndex, startTime, clipId },
      timestamp: Date.now(),
    });

    console.log('[EditAPI] Clip added successfully:', clipId);
    return clipId;
  }

  /**
   * Trim a clip by adjusting its trim points
   *
   * @param clipId - ID of the clip to trim
   * @param trimStart - Seconds to trim from start of original media (optional)
   * @param trimEnd - Seconds to trim from end of original media (optional)
   * @returns Promise resolving when trim is complete
   * @throws Error if clip not found or trim values are invalid
   */
  async trimClip(
    clipId: string,
    trimStart?: number,
    trimEnd?: number
  ): Promise<void> {
    console.log('[EditAPI] trimClip:', { clipId, trimStart, trimEnd });

    const projectStore = useProjectStore.getState();
    const clip = this.findClip(clipId);

    if (!clip) {
      throw new Error(`Clip not found: ${clipId}`);
    }

    // Get media file to validate trim values
    const mediaStore = useMediaStore.getState();
    const mediaFile = mediaStore.mediaFiles.find(f => f.id === clip.mediaFileId);

    if (!mediaFile) {
      throw new Error(`Media file not found for clip: ${clip.mediaFileId}`);
    }

    // Prepare changes
    const changes: Partial<TimelineClip> = {};

    // Validation: Trim values must be non-negative
    if (trimStart !== undefined) {
      if (trimStart < 0) {
        throw new Error('trimStart must be non-negative');
      }
      changes.trimStart = trimStart;
    }

    if (trimEnd !== undefined) {
      if (trimEnd < 0) {
        throw new Error('trimEnd must be non-negative');
      }
      changes.trimEnd = trimEnd;
    }

    // Validation: Total trim must not exceed media duration
    const newTrimStart = trimStart ?? clip.trimStart;
    const newTrimEnd = trimEnd ?? clip.trimEnd;

    if (newTrimStart + newTrimEnd >= mediaFile.duration) {
      throw new Error(
        `Total trim (${newTrimStart + newTrimEnd}s) would exceed media duration (${mediaFile.duration}s)`
      );
    }

    // Apply changes
    projectStore.updateClip(clipId, changes);

    // Record command in history
    projectStore.addCommand({
      type: 'TRIM_CLIP',
      payload: { clipId, trimStart: newTrimStart, trimEnd: newTrimEnd },
      timestamp: Date.now(),
    });

    console.log('[EditAPI] Clip trimmed successfully');
  }

  /**
   * Split a clip into two clips at the specified time
   *
   * @param clipId - ID of the clip to split
   * @param splitTime - Position within the clip to split (relative to clip start)
   * @returns Promise resolving to array of new clip IDs [leftClipId, rightClipId]
   * @throws Error if clip not found or split time is invalid
   */
  async splitClip(clipId: string, splitTime: number): Promise<[string, string]> {
    console.log('[EditAPI] splitClip:', { clipId, splitTime });

    const projectStore = useProjectStore.getState();
    const clip = this.findClip(clipId);

    if (!clip) {
      throw new Error(`Clip not found: ${clipId}`);
    }

    // Validation: Split time must be within clip bounds
    const clipDuration = clip.endTime - clip.startTime;
    if (splitTime <= 0 || splitTime >= clipDuration) {
      throw new Error(
        `Split time (${splitTime}s) must be between 0 and clip duration (${clipDuration}s)`
      );
    }

    // Calculate new clip boundaries
    const leftClip: Partial<TimelineClip> = {
      endTime: clip.startTime + splitTime,
      trimEnd: clip.trimEnd + (clipDuration - splitTime),
    };

    const rightClipId = `clip-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Update the original clip to be the left portion
    projectStore.updateClip(clipId, leftClip);

    // Create the right portion as a new clip
    projectStore.addClipToTrack(
      clip.mediaFileId,
      clip.trackIndex,
      clip.startTime + splitTime
    );

    // Update the newly created clip with correct trim values
    const rightClip: Partial<TimelineClip> = {
      trimStart: clip.trimStart + splitTime,
      trimEnd: clip.trimEnd,
    };

    // The new clip was just added, find it by position
    const updatedState = useProjectStore.getState();
    const track = updatedState.currentProject?.tracks[clip.trackIndex];
    const newClip = track?.clips.find(
      c => c.startTime === clip.startTime + splitTime && c.mediaFileId === clip.mediaFileId
    );

    if (newClip) {
      projectStore.updateClip(newClip.id, rightClip);
    }

    // Record command in history
    projectStore.addCommand({
      type: 'SPLIT_CLIP',
      payload: {
        originalClipId: clipId,
        splitTime,
        leftClipId: clipId,
        rightClipId: newClip?.id || rightClipId
      },
      timestamp: Date.now(),
    });

    console.log('[EditAPI] Clip split successfully:', [clipId, newClip?.id || rightClipId]);
    return [clipId, newClip?.id || rightClipId];
  }

  /**
   * Delete a clip from the timeline
   *
   * @param clipId - ID of the clip to delete
   * @returns Promise resolving when deletion is complete
   * @throws Error if clip not found
   */
  async deleteClip(clipId: string): Promise<void> {
    console.log('[EditAPI] deleteClip:', { clipId });

    const clip = this.findClip(clipId);
    if (!clip) {
      throw new Error(`Clip not found: ${clipId}`);
    }

    const projectStore = useProjectStore.getState();

    // Clear selection if deleting the selected clip
    if (projectStore.selectedClipId === clipId) {
      projectStore.setSelectedClipId(null);
    }

    projectStore.removeClip(clipId);

    // Record command in history
    projectStore.addCommand({
      type: 'DELETE_CLIP',
      payload: { clipId },
      timestamp: Date.now(),
    });

    console.log('[EditAPI] Clip deleted successfully');
  }

  /**
   * Move a clip to a new position or track
   *
   * @param clipId - ID of the clip to move
   * @param newTrackIndex - Target track index
   * @param newStartTime - New start position on timeline
   * @returns Promise resolving when move is complete
   * @throws Error if clip not found or new position is invalid
   */
  async moveClip(
    clipId: string,
    newTrackIndex: number,
    newStartTime: number
  ): Promise<void> {
    console.log('[EditAPI] moveClip:', { clipId, newTrackIndex, newStartTime });

    const projectStore = useProjectStore.getState();
    const clip = this.findClip(clipId);

    if (!clip) {
      throw new Error(`Clip not found: ${clipId}`);
    }

    // Validation: Check track index is valid
    if (!projectStore.currentProject) {
      throw new Error('No active project');
    }

    if (newTrackIndex < 0 || newTrackIndex >= projectStore.currentProject.tracks.length) {
      throw new Error(
        `Invalid track index: ${newTrackIndex}. Must be between 0 and ${projectStore.currentProject.tracks.length - 1}`
      );
    }

    // Validation: Check for overlapping clips on target track
    const track = projectStore.currentProject.tracks[newTrackIndex];
    const clipDuration = clip.endTime - clip.startTime;
    const newEndTime = newStartTime + clipDuration;

    const hasOverlap = track.clips.some(c => {
      // Ignore the clip being moved if it's on the same track
      if (c.id === clipId) return false;
      return !(newEndTime <= c.startTime || newStartTime >= c.endTime);
    });

    if (hasOverlap) {
      throw new Error(
        `Cannot move clip to position ${newStartTime} on track ${newTrackIndex}: would overlap with existing clip`
      );
    }

    // Update clip position
    projectStore.updateClip(clipId, {
      trackIndex: newTrackIndex,
      startTime: newStartTime,
      endTime: newEndTime,
    });

    // Record command in history
    projectStore.addCommand({
      type: 'MOVE_CLIP',
      payload: { clipId, newTrackIndex, newStartTime },
      timestamp: Date.now(),
    });

    console.log('[EditAPI] Clip moved successfully');
  }

  /**
   * Add an audio-only track (placeholder for future implementation)
   *
   * @param audioFileId - ID of the audio file to add
   * @returns Promise resolving to the created track ID
   * @throws Error - Not yet implemented
   */
  async addAudioTrack(audioFileId: string): Promise<string> {
    console.log('[EditAPI] addAudioTrack:', { audioFileId });

    // Placeholder for Phase 2
    throw new Error('Audio track support is not yet implemented. Coming in Phase 2.');
  }

  /**
   * Get the current timeline state
   *
   * @returns Current project state including all tracks and clips
   */
  getTimeline() {
    const projectStore = useProjectStore.getState();
    return projectStore.currentProject;
  }

  /**
   * Get details for a specific clip
   *
   * @param clipId - ID of the clip to retrieve
   * @returns Clip details or null if not found
   */
  getClip(clipId: string): TimelineClip | null {
    return this.findClip(clipId);
  }

  /**
   * Get the command history
   *
   * @returns Array of all recorded edit commands
   */
  getCommandHistory() {
    const projectStore = useProjectStore.getState();
    return projectStore.commandHistory;
  }

  // ===== Private Helper Methods =====

  /**
   * Find a clip by ID across all tracks
   */
  private findClip(clipId: string): TimelineClip | null {
    const projectStore = useProjectStore.getState();
    if (!projectStore.currentProject) {
      return null;
    }

    for (const track of projectStore.currentProject.tracks) {
      const clip = track.clips.find(c => c.id === clipId);
      if (clip) {
        return clip;
      }
    }

    return null;
  }

  /**
   * Find the next available position on a track to avoid overlaps
   */
  private findNextAvailablePosition(trackIndex: number, preferredStart: number): number {
    const projectStore = useProjectStore.getState();
    if (!projectStore.currentProject) {
      return preferredStart;
    }

    const track = projectStore.currentProject.tracks[trackIndex];
    if (track.clips.length === 0) {
      return preferredStart;
    }

    // Sort clips by start time
    const sortedClips = [...track.clips].sort((a, b) => a.startTime - b.startTime);

    // Try to place at preferred position first
    let candidatePosition = preferredStart;

    for (const clip of sortedClips) {
      if (candidatePosition < clip.startTime) {
        // Found a gap before this clip
        return candidatePosition;
      }
      // Move past this clip
      candidatePosition = Math.max(candidatePosition, clip.endTime);
    }

    // No gaps found, place after the last clip
    return candidatePosition;
  }
}
