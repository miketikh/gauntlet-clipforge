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
import { generateThumbnailAtTime } from '../utils/ipc';

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

    // Handle overlaps by pushing affected clips forward (insert behavior)
    const track = projectStore.currentProject.tracks[trackIndex];
    const newClipEndTime = startTime + mediaFile.duration;

    // Find ALL clips that would conflict with the new clip
    // A clip conflicts if it overlaps with the new clip's time range
    const conflictingClips = track.clips.filter(clip => {
      // Overlap occurs if: new clip ends after existing starts AND new clip starts before existing ends
      return newClipEndTime > clip.startTime && startTime < clip.endTime;
    });

    if (conflictingClips.length > 0) {
      // Sort by start time (ascending)
      conflictingClips.sort((a, b) => a.startTime - b.startTime);

      // Find the first conflicting clip
      const firstConflict = conflictingClips[0];

      // Calculate how much to shift - we need to push everything to make room
      const shiftAmount = newClipEndTime - firstConflict.startTime;

      // Find ALL clips that need to be pushed (those at or after the first conflict)
      const clipsToShift = track.clips.filter(c => c.startTime >= firstConflict.startTime);

      console.log(
        `[EditAPI] Inserting clip at ${startTime}s. Pushing ${clipsToShift.length} clip(s) forward by ${shiftAmount.toFixed(2)}s`
      );

      // Push all affected clips forward
      for (const clip of clipsToShift) {
        projectStore.updateClip(clip.id, {
          startTime: clip.startTime + shiftAmount,
          endTime: clip.endTime + shiftAmount,
        });
      }
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
   * CRITICAL: This method adjusts both trim offsets AND timeline position
   * to ensure the clip visually shrinks on the timeline when trimmed.
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

    // Minimum clip duration validation (0.5 seconds)
    const newClipDuration = mediaFile.duration - newTrimStart - newTrimEnd;
    if (newClipDuration < 0.5) {
      throw new Error(
        `Clip duration (${newClipDuration.toFixed(2)}s) must be at least 0.5 seconds`
      );
    }

    if (newTrimStart + newTrimEnd >= mediaFile.duration) {
      throw new Error(
        `Total trim (${newTrimStart + newTrimEnd}s) would exceed media duration (${mediaFile.duration}s)`
      );
    }

    // CRITICAL FIX: Adjust timeline position when trimming
    // When trimming from left (trimStart increases), move startTime forward
    if (trimStart !== undefined && trimStart !== clip.trimStart) {
      const trimStartDelta = trimStart - clip.trimStart;
      changes.startTime = clip.startTime + trimStartDelta;
      // Keep endTime unchanged when trimming from left
    }

    // When trimming from right (trimEnd increases), move endTime backward
    if (trimEnd !== undefined && trimEnd !== clip.trimEnd) {
      const trimEndDelta = trimEnd - clip.trimEnd;
      changes.endTime = clip.endTime - trimEndDelta;
      // Keep startTime unchanged when trimming from right
    }

    // Apply changes
    projectStore.updateClip(clipId, changes);

    // Regenerate thumbnail if trimStart changed (showing new first frame)
    if (trimStart !== undefined && trimStart !== clip.trimStart) {
      try {
        console.log('[EditAPI] Regenerating thumbnail at new trimStart:', newTrimStart);
        const newThumbnail = await generateThumbnailAtTime(mediaFile.path, newTrimStart);
        projectStore.updateClip(clipId, { thumbnail: newThumbnail });
        console.log('[EditAPI] Thumbnail updated successfully');
      } catch (error) {
        console.error('[EditAPI] Failed to regenerate thumbnail:', error);
        // Don't throw - thumbnail update is non-critical
      }
    }

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
      endTime: clip.endTime, // CRITICAL: Preserve original clip's end time boundary
    };

    // The new clip was just added, find it by position
    const updatedState = useProjectStore.getState();
    const track = updatedState.currentProject?.tracks[clip.trackIndex];
    const newClip = track?.clips.find(
      c => c.startTime === clip.startTime + splitTime && c.mediaFileId === clip.mediaFileId
    );

    if (newClip) {
      projectStore.updateClip(newClip.id, rightClip);

      // Regenerate thumbnail for the right clip at its new starting position
      try {
        const mediaStore = useMediaStore.getState();
        const mediaFile = mediaStore.mediaFiles.find(f => f.id === clip.mediaFileId);
        if (mediaFile) {
          const newTrimStart = clip.trimStart + splitTime;
          console.log('[EditAPI] Regenerating thumbnail for right clip at trimStart:', newTrimStart);
          const newThumbnail = await generateThumbnailAtTime(mediaFile.path, newTrimStart);
          projectStore.updateClip(newClip.id, { thumbnail: newThumbnail });
          console.log('[EditAPI] Right clip thumbnail updated successfully');
        }
      } catch (error) {
        console.error('[EditAPI] Failed to regenerate thumbnail for right clip:', error);
        // Don't throw - thumbnail update is non-critical
      }
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

    // Handle overlaps by pushing affected clips forward (same as addClip)
    const track = projectStore.currentProject.tracks[newTrackIndex];
    const clipDuration = clip.endTime - clip.startTime;
    const newEndTime = newStartTime + clipDuration;

    // Find conflicting clips on the target track (excluding the clip being moved)
    const conflictingClips = track.clips.filter(c => {
      // Ignore the clip being moved if it's on the same track
      if (c.id === clipId) return false;
      // Overlap occurs if: moved clip ends after existing starts AND moved clip starts before existing ends
      return newEndTime > c.startTime && newStartTime < c.endTime;
    });

    if (conflictingClips.length > 0) {
      // Sort by start time (ascending)
      conflictingClips.sort((a, b) => a.startTime - b.startTime);

      // Find the first conflicting clip
      const firstConflict = conflictingClips[0];

      // Calculate how much to shift
      const shiftAmount = newEndTime - firstConflict.startTime;

      // Find ALL clips that need to be pushed (those at or after the first conflict, excluding moved clip)
      const clipsToShift = track.clips.filter(
        c => c.id !== clipId && c.startTime >= firstConflict.startTime
      );

      console.log(
        `[EditAPI] Moving clip to ${newStartTime}s. Pushing ${clipsToShift.length} clip(s) forward by ${shiftAmount.toFixed(2)}s`
      );

      // Push all affected clips forward
      for (const c of clipsToShift) {
        projectStore.updateClip(c.id, {
          startTime: c.startTime + shiftAmount,
          endTime: c.endTime + shiftAmount,
        });
      }
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

}
