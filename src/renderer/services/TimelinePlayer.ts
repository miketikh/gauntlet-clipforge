/**
 * Timeline Player Service
 * Handles multi-clip playback across the entire timeline with seamless transitions
 */

import { Project, TimelineClip } from '../../types/timeline';
import { findClipAtPosition, calculateClipDuration } from '../utils/timelineCalculations';
import { useMediaStore } from '../store/mediaStore';
import { MediaFile } from '../../types/media';

export interface TimelinePlayerCallbacks {
  onPlayheadUpdate: (position: number) => void;
  onPlaybackEnd: () => void;
  onClipChange: (clip: TimelineClip | null, media: MediaFile | null) => void;
}

export class TimelinePlayer {
  private project: Project;
  private callbacks: TimelinePlayerCallbacks;

  // Playback state
  private isPlaying: boolean = false;
  private currentPlayheadPosition: number = 0;
  private animationFrameId: number | null = null;
  private lastUpdateTime: number = 0;

  // Current clip tracking
  private currentClip: TimelineClip | null = null;
  private currentMedia: MediaFile | null = null;

  // Video elements
  private currentVideo: HTMLVideoElement | null = null;
  private nextVideo: HTMLVideoElement | null = null;
  private preloadClip: TimelineClip | null = null;

  // Playback speed
  private playbackRate: number = 1.0;

  constructor(project: Project, callbacks: TimelinePlayerCallbacks) {
    this.project = project;
    this.callbacks = callbacks;

    // Create hidden video elements for playback
    this.currentVideo = document.createElement('video');
    this.currentVideo.style.display = 'none';
    document.body.appendChild(this.currentVideo);

    this.nextVideo = document.createElement('video');
    this.nextVideo.style.display = 'none';
    document.body.appendChild(this.nextVideo);

    // Set volume to match main video
    this.currentVideo.volume = 1.0;
    this.nextVideo.volume = 0; // Mute preload video
  }

  /**
   * Update the project data (call when timeline changes)
   */
  updateProject(project: Project): void {
    this.project = project;
  }

  /**
   * Start playback from the current playhead position
   */
  async play(startTime?: number): Promise<void> {
    if (startTime !== undefined) {
      this.currentPlayheadPosition = startTime;
    }

    const clip = this.getClipAtPosition(this.currentPlayheadPosition);

    if (!clip) {
      console.warn('[TimelinePlayer] No clip at playhead position, cannot play');
      return;
    }

    this.isPlaying = true;
    await this.loadAndPlayClip(clip);
    this.startPlaybackLoop();
  }

  /**
   * Pause playback
   */
  pause(): void {
    this.isPlaying = false;

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.currentVideo) {
      this.currentVideo.pause();
    }
  }

  /**
   * Seek to a specific time position
   */
  async seek(time: number): Promise<void> {
    const wasPlaying = this.isPlaying;

    // Pause if currently playing
    if (wasPlaying) {
      this.pause();
    }

    this.currentPlayheadPosition = time;

    const clip = this.getClipAtPosition(time);

    if (clip) {
      // Check if we're still in the same clip
      if (this.currentClip?.id === clip.id) {
        // Just seek within the current video
        await this.seekWithinClip(clip, time);
      } else {
        // Load a different clip
        await this.loadAndPlayClip(clip);
        if (!wasPlaying) {
          this.currentVideo?.pause();
        }
      }
    } else {
      // No clip at this position
      this.callbacks.onClipChange(null, null);
    }

    // Update playhead
    this.callbacks.onPlayheadUpdate(time);

    // Resume playing if we were playing before
    if (wasPlaying) {
      this.play(time);
    }
  }

  /**
   * Set playback speed
   */
  setPlaybackRate(rate: number): void {
    this.playbackRate = rate;
    if (this.currentVideo) {
      this.currentVideo.playbackRate = rate;
    }
  }

  /**
   * Set volume
   */
  setVolume(volume: number): void {
    if (this.currentVideo) {
      this.currentVideo.volume = volume;
    }
  }

  /**
   * Get the clip at a specific playhead position (only Track 0 for MVP)
   */
  private getClipAtPosition(position: number): TimelineClip | null {
    if (!this.project.tracks || this.project.tracks.length === 0) {
      return null;
    }

    // Only play Track 0 (main track) for MVP
    const mainTrack = this.project.tracks[0];
    return findClipAtPosition(mainTrack, position);
  }

  /**
   * Get the next clip after the current one
   */
  private getNextClip(currentClip: TimelineClip): TimelineClip | null {
    const mainTrack = this.project.tracks[0];
    if (!mainTrack) return null;

    // Find clips that start at or after current clip's end time
    const nextClips = mainTrack.clips
      .filter(clip => clip.startTime >= currentClip.endTime)
      .sort((a, b) => a.startTime - b.startTime);

    return nextClips.length > 0 ? nextClips[0] : null;
  }

  /**
   * Load and play a specific clip
   */
  private async loadAndPlayClip(clip: TimelineClip): Promise<void> {
    this.currentClip = clip;

    // Get media file for this clip
    const mediaStore = useMediaStore.getState();
    const media = mediaStore.mediaFiles.find(m => m.id === clip.mediaFileId);

    if (!media) {
      console.error('[TimelinePlayer] Media file not found:', clip.mediaFileId);
      return;
    }

    this.currentMedia = media;

    // Notify about clip change
    this.callbacks.onClipChange(clip, media);

    // Load video
    if (this.currentVideo) {
      const videoPath = media.path;
      const fileUrl = videoPath.startsWith('file://') ? videoPath : `file://${videoPath}`;

      // Only reload if source changed
      if (this.currentVideo.src !== fileUrl) {
        this.currentVideo.src = fileUrl;
        await new Promise<void>((resolve, reject) => {
          if (!this.currentVideo) return reject();

          const onCanPlay = () => {
            this.currentVideo?.removeEventListener('canplay', onCanPlay);
            this.currentVideo?.removeEventListener('error', onError);
            resolve();
          };

          const onError = () => {
            this.currentVideo?.removeEventListener('canplay', onCanPlay);
            this.currentVideo?.removeEventListener('error', onError);
            reject();
          };

          this.currentVideo.addEventListener('canplay', onCanPlay);
          this.currentVideo.addEventListener('error', onError);
        });
      }

      // Seek to the correct position within the clip
      await this.seekWithinClip(clip, this.currentPlayheadPosition);

      // Set playback rate
      this.currentVideo.playbackRate = this.playbackRate;

      // Start playing if we should be playing
      if (this.isPlaying) {
        try {
          await this.currentVideo.play();
        } catch (error) {
          console.error('[TimelinePlayer] Error playing video:', error);
        }
      }
    }

    // Preload next clip if there is one
    this.preloadNextClip(clip);
  }

  /**
   * Seek within the current clip
   */
  private async seekWithinClip(clip: TimelineClip, playheadPosition: number): Promise<void> {
    if (!this.currentVideo) return;

    // Calculate offset within the clip
    const offsetInClip = playheadPosition - clip.startTime;
    const videoTime = clip.trimStart + offsetInClip;

    // Clamp to valid range
    const clampedTime = Math.max(
      clip.trimStart,
      Math.min(videoTime, this.currentMedia!.duration - clip.trimEnd)
    );

    this.currentVideo.currentTime = clampedTime;

    // Wait for seek to complete
    await new Promise<void>((resolve) => {
      if (!this.currentVideo) return resolve();

      const onSeeked = () => {
        this.currentVideo?.removeEventListener('seeked', onSeeked);
        resolve();
      };

      this.currentVideo.addEventListener('seeked', onSeeked);

      // Fallback timeout
      setTimeout(resolve, 100);
    });
  }

  /**
   * Preload the next clip for seamless transition
   */
  private preloadNextClip(currentClip: TimelineClip): void {
    const nextClip = this.getNextClip(currentClip);

    if (!nextClip) {
      this.preloadClip = null;
      return;
    }

    // Only preload if we haven't already
    if (this.preloadClip?.id === nextClip.id) {
      return;
    }

    this.preloadClip = nextClip;

    // Get media file
    const mediaStore = useMediaStore.getState();
    const media = mediaStore.mediaFiles.find(m => m.id === nextClip.mediaFileId);

    if (!media || !this.nextVideo) return;

    const videoPath = media.path;
    const fileUrl = videoPath.startsWith('file://') ? videoPath : `file://${videoPath}`;

    // Load the next video
    this.nextVideo.src = fileUrl;
    this.nextVideo.currentTime = nextClip.trimStart;
  }

  /**
   * Main playback loop using requestAnimationFrame
   */
  private startPlaybackLoop(): void {
    const updateLoop = (timestamp: number) => {
      if (!this.isPlaying) return;

      // Calculate time delta
      const deltaTime = this.lastUpdateTime > 0 ? (timestamp - this.lastUpdateTime) / 1000 : 0;
      this.lastUpdateTime = timestamp;

      // Update playhead position based on video currentTime
      if (this.currentVideo && this.currentClip) {
        const videoTime = this.currentVideo.currentTime;
        const clipTime = videoTime - this.currentClip.trimStart;
        const timelineTime = this.currentClip.startTime + clipTime;

        this.currentPlayheadPosition = timelineTime;

        // Check if we've reached the end of the current clip
        if (this.currentPlayheadPosition >= this.currentClip.endTime) {
          // Try to transition to next clip
          const nextClip = this.getNextClip(this.currentClip);

          if (nextClip) {
            // Check if there's a gap
            const gap = nextClip.startTime - this.currentClip.endTime;

            if (gap > 0.1) {
              // Gap detected - pause playback for MVP
              console.log('[TimelinePlayer] Gap detected, pausing playback');
              this.pause();
              this.currentPlayheadPosition = this.currentClip.endTime;
              this.callbacks.onPlayheadUpdate(this.currentPlayheadPosition);
              return;
            } else {
              // Seamless transition to next clip
              this.loadAndPlayClip(nextClip);
            }
          } else {
            // End of timeline
            this.pause();
            this.callbacks.onPlaybackEnd();
            return;
          }
        } else {
          // Continue playback, update playhead
          this.callbacks.onPlayheadUpdate(this.currentPlayheadPosition);

          // Preload next clip if we're close to the end (1 second before)
          if (this.currentClip.endTime - this.currentPlayheadPosition < 1.0) {
            if (!this.preloadClip || this.preloadClip.id !== this.getNextClip(this.currentClip)?.id) {
              this.preloadNextClip(this.currentClip);
            }
          }
        }
      }

      // Schedule next frame
      this.animationFrameId = requestAnimationFrame(updateLoop);
    };

    this.lastUpdateTime = 0;
    this.animationFrameId = requestAnimationFrame(updateLoop);
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.pause();

    if (this.currentVideo) {
      document.body.removeChild(this.currentVideo);
      this.currentVideo = null;
    }

    if (this.nextVideo) {
      document.body.removeChild(this.nextVideo);
      this.nextVideo = null;
    }
  }
}
