/**
 * Timeline Player Service
 * Handles multi-clip playback across the entire timeline with seamless transitions
 *
 * Architecture: Event-driven state machine for robust clip transitions
 * - Uses video element events ('ended', 'timeupdate', 'seeked') instead of RAF polling
 * - Explicit state machine prevents race conditions
 * - Separation of concerns: playback logic vs UI updates
 */

import { Project, TimelineClip, TrackType } from '../../types/timeline';
import { findClipAtPosition, calculateClipDuration } from '../utils/timelineCalculations';
import { useMediaStore } from '../store/mediaStore';
import { MediaFile, MediaType } from '../../types/media';

/**
 * Playback state machine
 * Prevents re-entrant transitions and race conditions
 */
enum PlaybackState {
  IDLE = 'idle',                    // Not playing
  LOADING = 'loading',              // Loading a clip
  PLAYING = 'playing',              // Currently playing a clip
  TRANSITIONING = 'transitioning',  // Between clips (prevents re-entry)
  SEEKING = 'seeking'               // User is seeking
}

export interface TimelinePlayerCallbacks {
  onPlayheadUpdate: (position: number) => void;
  onPlaybackEnd: () => void;
}

export class TimelinePlayer {
  private project: Project;
  private callbacks: TimelinePlayerCallbacks;

  // State machine
  private playbackState: PlaybackState = PlaybackState.IDLE;

  // Playback state
  private isPlaying: boolean = false;
  private currentPlayheadPosition: number = 0;
  private animationFrameId: number | null = null;
  private lastUpdateTime: number = 0;

  // Current clip tracking
  private currentClip: TimelineClip | null = null;
  private currentMedia: MediaFile | null = null;

  // Video element
  private videoElement: HTMLVideoElement;

  // Playback speed
  private playbackRate: number = 1.0;

  constructor(project: Project, callbacks: TimelinePlayerCallbacks, videoElement: HTMLVideoElement) {
    this.project = project;
    this.callbacks = callbacks;
    this.videoElement = videoElement;

    // Set volume
    this.videoElement.volume = 1.0;

    // Set up event-driven playback control
    this.setupVideoEventListeners();
  }

  /**
   * Set up event listeners for event-driven playback
   * This is the core of robust clip transitions
   */
  private setupVideoEventListeners(): void {
    // CRITICAL: Use 'ended' event for clip transitions (not RAF polling)
    // Browser guarantees this fires exactly once when video completes
    this.videoElement.addEventListener('ended', () => {
      console.log('[TimelinePlayer] Video ended event fired');
      this.handleVideoEnded();
    });

    // Use 'timeupdate' for accurate position (don't update UI directly - too infrequent)
    // This serves as ground truth, RAF loop handles smooth visual updates
    this.videoElement.addEventListener('timeupdate', () => {
      // Just sync internal position, don't trigger UI update here
      // RAF loop will handle smooth interpolation
    });

    // Handle seek completion
    this.videoElement.addEventListener('seeked', () => {
      if (this.playbackState === PlaybackState.SEEKING) {
        console.log('[TimelinePlayer] Seek completed');
        this.playbackState = PlaybackState.IDLE;
      }
    });
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
    console.log('[TimelinePlayer] Play requested, current state:', this.playbackState);

    if (startTime !== undefined) {
      this.currentPlayheadPosition = startTime;
    }

    this.isPlaying = true;

    const { videoClip, audioClips } = this.getClipsAtPosition(this.currentPlayheadPosition);

    if (audioClips.length > 0) {
      console.log('[TimelinePlayer] Detected', audioClips.length, 'audio clips at position (playback not yet implemented)');
    }

    if (videoClip) {
      // Start playing from the current clip
      this.playbackState = PlaybackState.LOADING;
      await this.loadAndPlayClip(videoClip);
      this.playbackState = PlaybackState.PLAYING;

      // CRITICAL FIX: Wait for video to actually start playing before starting RAF loop
      // This prevents the RAF loop from reading stale video.currentTime
      await this.waitForVideoPlaying();
    } else {
      // No clip at current position - CRITICAL: Clear stale clip reference
      this.currentClip = null;
      this.currentMedia = null;
      this.videoElement.pause(); // Hide video in empty space

      // Find the next clip ahead
      const nextClip = this.findNextClipAfter(this.currentPlayheadPosition);

      if (nextClip) {
        console.log('[TimelinePlayer] No clip at playhead, will play from next clip at', nextClip.startTime);
        this.playbackState = PlaybackState.PLAYING;
      } else {
        // No clips ahead at all - show empty
        console.log('[TimelinePlayer] No clips on timeline to play');
        this.playbackState = PlaybackState.PLAYING;
      }
    }

    this.startPlaybackLoop();
  }

  /**
   * Pause playback
   */
  pause(): void {
    console.log('[TimelinePlayer] Pause requested');
    this.isPlaying = false;
    this.playbackState = PlaybackState.IDLE;

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    this.videoElement.pause();
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
          this.videoElement.pause();
        }
      }
    } else {
      // No clip at this position - show black screen
      this.currentClip = null;
      this.currentMedia = null;
      this.videoElement.pause();
      this.videoElement.removeAttribute('src');
      this.videoElement.load(); // Reset to black screen
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
    this.videoElement.playbackRate = rate;
  }

  /**
   * Set volume
   */
  setVolume(volume: number): void {
    this.videoElement.volume = volume;
  }

  /**
   * Check if a media file is audio-only
   */
  private isAudioOnly(mediaFile: MediaFile): boolean {
    return mediaFile.type === MediaType.AUDIO;
  }

  /**
   * Get all clips at a specific playhead position
   */
  private getClipsAtPosition(position: number): {
    videoClip: TimelineClip | null;
    audioClips: TimelineClip[];
  } {
    const result = {
      videoClip: null as TimelineClip | null,
      audioClips: [] as TimelineClip[]
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
   * Find the next clip after a given timeline position
   */
  private findNextClipAfter(position: number): TimelineClip | null {
    const mainTrack = this.project.tracks[0];
    if (!mainTrack) return null;

    // Find clips that start after the current position
    const nextClips = mainTrack.clips
      .filter(clip => clip.startTime > position)
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

    // Check if audio-only
    if (this.isAudioOnly(media)) {
      console.log('[TimelinePlayer] Audio-only clip detected, playback not yet implemented');
      return; // Skip video element loading
    }

    // Load video
    const videoPath = media.path;
    const fileUrl = videoPath.startsWith('file://') ? videoPath : `file://${videoPath}`;

    // Only reload if source changed
    if (this.videoElement.src !== fileUrl) {
      this.videoElement.src = fileUrl;
      await new Promise<void>((resolve, reject) => {
        const onCanPlay = () => {
          this.videoElement.removeEventListener('canplay', onCanPlay);
          this.videoElement.removeEventListener('error', onError);
          resolve();
        };

        const onError = () => {
          this.videoElement.removeEventListener('canplay', onCanPlay);
          this.videoElement.removeEventListener('error', onError);
          reject();
        };

        this.videoElement.addEventListener('canplay', onCanPlay);
        this.videoElement.addEventListener('error', onError);
      });
    }

    // Seek to the correct position within the clip
    await this.seekWithinClip(clip, this.currentPlayheadPosition);

    // Set playback rate
    this.videoElement.playbackRate = this.playbackRate;

    // Start playing if we should be playing
    if (this.isPlaying) {
      try {
        await this.videoElement.play();
      } catch (error) {
        console.error('[TimelinePlayer] Error playing video:', error);
      }
    }
  }

  /**
   * Seek within the current clip
   */
  private async seekWithinClip(clip: TimelineClip, playheadPosition: number): Promise<void> {
    // Calculate offset within the clip
    const offsetInClip = playheadPosition - clip.startTime;
    const videoTime = clip.trimStart + offsetInClip;

    // Clamp to valid range
    const clampedTime = Math.max(
      clip.trimStart,
      Math.min(videoTime, this.currentMedia!.duration - clip.trimEnd)
    );

    this.videoElement.currentTime = clampedTime;

    // Wait for seek to complete
    await new Promise<void>((resolve) => {
      const onSeeked = () => {
        this.videoElement.removeEventListener('seeked', onSeeked);
        resolve();
      };

      this.videoElement.addEventListener('seeked', onSeeked);

      // Fallback timeout
      setTimeout(resolve, 100);
    });
  }

  /**
   * Wait for video to actually start playing
   * This ensures video.currentTime is accurate before RAF loop reads it
   */
  private async waitForVideoPlaying(): Promise<void> {
    return new Promise<void>((resolve) => {
      // If video is already playing, resolve immediately
      if (!this.videoElement.paused) {
        resolve();
        return;
      }

      const onPlaying = () => {
        this.videoElement.removeEventListener('playing', onPlaying);
        resolve();
      };

      this.videoElement.addEventListener('playing', onPlaying);

      // Fallback timeout to prevent hanging
      setTimeout(() => {
        this.videoElement.removeEventListener('playing', onPlaying);
        resolve();
      }, 200);
    });
  }

  /**
   * EVENT HANDLER: Video 'ended' event fired
   * This is the ROBUST way to handle clip transitions (not RAF polling)
   */
  private handleVideoEnded(): void {
    console.log('[TimelinePlayer] handleVideoEnded, state:', this.playbackState, 'clip:', this.currentClip?.id);

    // Guard: Only transition if we're actively playing
    if (this.playbackState !== PlaybackState.PLAYING) {
      console.warn('[TimelinePlayer] Video ended but not in PLAYING state, ignoring');
      return;
    }

    // Guard: Must have a current clip
    if (!this.currentClip) {
      console.warn('[TimelinePlayer] Video ended but no current clip');
      return;
    }

    // Transition to next clip
    this.transitionToNextClip();
  }


  /**
   * Transition to the next clip (state-machine controlled)
   * This method has guards to prevent re-entry and race conditions
   */
  private async transitionToNextClip(): Promise<void> {
    console.log('[TimelinePlayer] transitionToNextClip called');

    // CRITICAL GUARD: Prevent re-entry
    if (this.playbackState === PlaybackState.TRANSITIONING) {
      console.warn('[TimelinePlayer] Already transitioning, ignoring duplicate request');
      return;
    }

    // Set state to TRANSITIONING to block any other transitions
    this.playbackState = PlaybackState.TRANSITIONING;

    const nextClip = this.getNextClip(this.currentClip!);

    if (!nextClip) {
      // End of timeline
      console.log('[TimelinePlayer] No more clips, ending playback');
      this.pause();
      this.callbacks.onPlaybackEnd();
      return;
    }

    // Calculate gap between clips
    const gap = nextClip.startTime - this.currentClip!.endTime;
    console.log('[TimelinePlayer] Gap to next clip:', gap, 'seconds');

    if (gap > 0.1) {
      // Jump over gap
      console.log('[TimelinePlayer] Jumping gap to next clip at', nextClip.startTime);
      this.currentPlayheadPosition = nextClip.startTime;
      this.callbacks.onPlayheadUpdate(this.currentPlayheadPosition);
    }

    // Load and play next clip
    try {
      await this.loadAndPlayClip(nextClip);
      // Successfully loaded and playing
      this.playbackState = PlaybackState.PLAYING;
      console.log('[TimelinePlayer] Transition complete, now playing clip:', nextClip.id);
    } catch (error) {
      console.error('[TimelinePlayer] Error loading next clip:', error);
      this.pause();
      this.callbacks.onPlaybackEnd();
    }
  }

  /**
   * Main playback loop using requestAnimationFrame
   * SIMPLIFIED: Only handles UI updates and gap advancement
   * Clip transitions are handled by video 'ended' event (event-driven)
   */
  private startPlaybackLoop(): void {
    // GUARD: Don't start multiple loops
    if (this.animationFrameId !== null) {
      console.warn('[TimelinePlayer] Playback loop already running');
      return;
    }

    console.log('[TimelinePlayer] Starting playback loop');

    const updateLoop = (timestamp: number) => {
      if (!this.isPlaying) return;

      // Calculate time delta
      const deltaTime = this.lastUpdateTime > 0 ? (timestamp - this.lastUpdateTime) / 1000 : 0;
      this.lastUpdateTime = timestamp;

      // Case 1: Playing a clip (video element is active)
      // Get current position from video element and update UI smoothly at 60 FPS
      // CRITICAL: Verify there's ACTUALLY a clip at current position, not just a stale reference
      const clipAtPosition = this.getClipAtPosition(this.currentPlayheadPosition);
      if (this.currentClip && clipAtPosition) {
        // Update playhead position from video element
        const videoTime = this.videoElement.currentTime;
        const clipTime = videoTime - this.currentClip.trimStart;
        const timelineTime = this.currentClip.startTime + clipTime;

        this.currentPlayheadPosition = timelineTime;
        // Update UI at RAF frequency (60 FPS) for smooth motion
        this.callbacks.onPlayheadUpdate(timelineTime);
      }
      // Case 2: No current clip - we're in a gap or empty timeline
      else if (!this.currentClip) {
        // Advance playhead at normal speed through empty space
        const adjustedDelta = deltaTime * this.playbackRate;
        this.currentPlayheadPosition += adjustedDelta;
        this.callbacks.onPlayheadUpdate(this.currentPlayheadPosition);

        // Check if we've reached a clip
        const nextClip = this.getClipAtPosition(this.currentPlayheadPosition);
        if (nextClip) {
          // We've reached a clip - start playing it
          console.log('[TimelinePlayer] Reached clip at', nextClip.startTime);
          this.playbackState = PlaybackState.LOADING;
          this.loadAndPlayClip(nextClip).then(() => {
            this.playbackState = PlaybackState.PLAYING;
          }).catch((err) => {
            console.error('[TimelinePlayer] Error loading clip:', err);
            this.pause();
          });
        } else {
          // Check if we've passed all clips (end of timeline)
          const anyClipAhead = this.findNextClipAfter(this.currentPlayheadPosition);
          if (!anyClipAhead) {
            // No more clips ahead - stop at project duration
            const projectDuration = this.project.duration || 0;
            if (this.currentPlayheadPosition >= projectDuration) {
              console.log('[TimelinePlayer] Reached end of timeline at', projectDuration);
              this.pause();
              this.callbacks.onPlaybackEnd();
              return;
            }
            // Otherwise, continue playing through empty space until project end
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
  }
}
