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
import { AudioMixer } from './AudioMixer';

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
  // Constant ID for the main video element in AudioMixer
  // We use a constant because we reuse the same video element for all clips
  private static readonly VIDEO_ELEMENT_SOURCE_ID = 'main-video-element';

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

  // Global volume (multiplied with clip/track volume)
  private globalVolume: number = 1.0;

  // Audio mixer for Web Audio API-based mixing
  private audioMixer: AudioMixer;

  // Track which media elements are already connected to Web Audio API
  // createMediaElementSource can only be called once per element
  private connectedElements: Set<HTMLMediaElement> = new Set();

  // Audio elements for audio-only clips (separate from video element)
  private audioElements: Map<string, HTMLAudioElement> = new Map();

  // Track currently playing audio clip IDs
  private currentAudioClipIds: Set<string> = new Set();

  // Preloading state (for predictive preloading optimization)
  private isPreloading: boolean = false;

  constructor(project: Project, callbacks: TimelinePlayerCallbacks, videoElement: HTMLVideoElement) {
    this.project = project;
    this.callbacks = callbacks;
    this.videoElement = videoElement;

    // Set volume
    this.videoElement.volume = 1.0;

    // Initialize audio mixer
    this.audioMixer = new AudioMixer();

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

    // Play audio clips if any
    if (audioClips.length > 0) {
      console.log('[TimelinePlayer] Detected', audioClips.length, 'audio clips at position');
      for (const audioClip of audioClips) {
        await this.loadAndPlayAudioClip(audioClip);
      }
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

    // Pause all audio elements
    this.audioElements.forEach((audioElement) => {
      audioElement.pause();
    });
    // Clear tracking state
    this.currentAudioClipIds.clear();
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
   * Set global volume (multiplied with clip/track volume)
   */
  setGlobalVolume(volume: number): void {
    // Store global volume for future clips
    this.globalVolume = volume;

    // Apply to AudioMixer master volume
    this.audioMixer.setMasterVolume(volume);

    console.log('[TimelinePlayer] Set global volume:', volume);
  }

  /**
   * Update volume for a specific clip
   */
  updateClipVolume(clipId: string, volume: number): void {
    this.audioMixer.setSourceVolume(TimelinePlayer.VIDEO_ELEMENT_SOURCE_ID, volume);
    console.log('[TimelinePlayer] Updated clip volume:', clipId, volume);
  }

  /**
   * Set master volume on AudioMixer
   */
  setMasterVolume(volume: number): void {
    this.audioMixer.setMasterVolume(volume);
    console.log('[TimelinePlayer] Set master volume:', volume);
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
   * Searches ALL tracks and returns the earliest clip
   */
  private findNextClipAfter(position: number): TimelineClip | null {
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
   * Load and play a specific clip
   * NOTE: currentClip and currentMedia should already be set by caller before calling this function
   */
  private async loadAndPlayClip(clip: TimelineClip): Promise<void> {
    // Verify currentMedia is set (should have been set by caller)
    if (!this.currentMedia) {
      console.error('[TimelinePlayer] currentMedia not set - this is a bug');
      return;
    }

    const media = this.currentMedia;

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

    // Apply audio settings (mute and volume)
    // Get track for this clip
    const track = this.project.tracks[clip.trackIndex];

    // Calculate effective mute state
    const isClipMuted = clip.muted ?? false;
    const isTrackMuted = track.muted ?? false;
    const effectiveMute = isClipMuted || isTrackMuted;

    // Calculate effective volume
    const clipVolume = clip.volume ?? 1.0;
    const trackVolume = track.volume ?? 1.0;
    const effectiveVolume = clipVolume * trackVolume * this.globalVolume;

    // Apply mute to video element (AudioMixer will handle volume)
    this.videoElement.muted = effectiveMute;

    console.log('[TimelinePlayer] Audio settings:', {
      clipVolume, trackVolume, effectiveVolume,
      clipMuted: isClipMuted, trackMuted: isTrackMuted, effectiveMute
    });

    // Connect to AudioMixer for Web Audio API mixing
    // CRITICAL: createMediaElementSource can only be called ONCE per element
    if (!this.connectedElements.has(this.videoElement)) {
      try {
        // Resume audio context (required after user interaction)
        await this.audioMixer.resume();

        // Add source to mixer (creates MediaElementSource node)
        // Use a constant ID since we reuse the same element for all clips
        this.audioMixer.addSource(TimelinePlayer.VIDEO_ELEMENT_SOURCE_ID, this.videoElement, clip, track);
        this.connectedElements.add(this.videoElement);

        console.log('[TimelinePlayer] Connected video element to AudioMixer');
      } catch (error) {
        console.error('[TimelinePlayer] Error connecting to AudioMixer:', error);
        // Fallback to direct audio without Web Audio API
        this.videoElement.volume = Math.max(0, Math.min(1, effectiveVolume));
      }
    } else {
      // Element already connected to Web Audio API - update volume
      console.log('[TimelinePlayer] Updating volume for clip:', clip.id);
      const effectiveVol = clipVolume * trackVolume;
      this.audioMixer.setSourceVolume(TimelinePlayer.VIDEO_ELEMENT_SOURCE_ID, effectiveVol);
    }

    // Apply fade in effect if configured
    if (clip.fadeIn && clip.fadeIn > 0) {
      this.audioMixer.applyFadeIn(TimelinePlayer.VIDEO_ELEMENT_SOURCE_ID, clip.fadeIn);
      console.log('[TimelinePlayer] Applied fade in:', clip.fadeIn, 'seconds');
    }

    // Schedule fade out effect if configured
    if (clip.fadeOut && clip.fadeOut > 0) {
      const clipDuration = clip.endTime - clip.startTime;
      const fadeOutStartTime = clipDuration - clip.fadeOut;

      if (fadeOutStartTime > 0) {
        setTimeout(() => {
          this.audioMixer.applyFadeOut(TimelinePlayer.VIDEO_ELEMENT_SOURCE_ID, clip.fadeOut!);
          console.log('[TimelinePlayer] Applied fade out:', clip.fadeOut, 'seconds');
        }, fadeOutStartTime * 1000);
      } else {
        // Fade out duration is longer than clip - start immediately
        this.audioMixer.applyFadeOut(TimelinePlayer.VIDEO_ELEMENT_SOURCE_ID, clip.fadeOut);
        console.log('[TimelinePlayer] Applied immediate fade out (duration longer than clip)');
      }
    }

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
   * Preload a video clip in the background (optimization)
   * Only loads and buffers video data, does NOT seek or play
   * This reduces loading delay when the playhead reaches the clip
   */
  private async preloadClip(clip: TimelineClip): Promise<void> {
    try {
      // Get media file for this clip
      const mediaStore = useMediaStore.getState();
      const media = mediaStore.mediaFiles.find(m => m.id === clip.mediaFileId);

      if (!media) {
        console.warn('[TimelinePlayer] Cannot preload - media file not found:', clip.mediaFileId);
        return;
      }

      // Skip if audio-only (no video element to preload)
      if (this.isAudioOnly(media)) {
        return;
      }

      // Build file URL
      const videoPath = media.path;
      const fileUrl = videoPath.startsWith('file://') ? videoPath : `file://${videoPath}`;

      // Only preload if source is different (avoid redundant loads)
      if (this.videoElement.src === fileUrl) {
        console.log('[TimelinePlayer] Clip already loaded, skipping preload');
        return;
      }

      console.log('[TimelinePlayer] Starting preload for:', clip.id);

      // Set source and wait for canplay (browser will start buffering)
      this.videoElement.src = fileUrl;
      await new Promise<void>((resolve, reject) => {
        const onCanPlay = () => {
          this.videoElement.removeEventListener('canplay', onCanPlay);
          this.videoElement.removeEventListener('error', onError);
          console.log('[TimelinePlayer] Preload complete for:', clip.id);
          resolve();
        };

        const onError = (e: Event) => {
          this.videoElement.removeEventListener('canplay', onCanPlay);
          this.videoElement.removeEventListener('error', onError);
          console.error('[TimelinePlayer] Preload error:', e);
          reject(new Error('Video preload failed'));
        };

        this.videoElement.addEventListener('canplay', onCanPlay);
        this.videoElement.addEventListener('error', onError);

        // Timeout fallback (10 seconds)
        setTimeout(() => {
          this.videoElement.removeEventListener('canplay', onCanPlay);
          this.videoElement.removeEventListener('error', onError);
          console.warn('[TimelinePlayer] Preload timeout for:', clip.id);
          resolve(); // Resolve anyway to not block playback
        }, 10000);
      });
    } finally {
      // Always reset preloading flag when done (success or failure)
      this.isPreloading = false;
    }
  }

  /**
   * Load and play an audio-only clip
   */
  private async loadAndPlayAudioClip(clip: TimelineClip): Promise<void> {
    // Get media file for this clip
    const mediaStore = useMediaStore.getState();
    const media = mediaStore.mediaFiles.find(m => m.id === clip.mediaFileId);
    if (!media) {
      console.error('[TimelinePlayer] Media file not found for clip:', clip.mediaFileId);
      return;
    }

    // Get track for volume/mute settings
    const track = this.project.tracks[clip.trackIndex];
    if (!track) {
      console.error('[TimelinePlayer] Track not found for clip:', clip.id, 'trackIndex:', clip.trackIndex);
      return;
    }

    // Calculate effective mute and volume
    const isClipMuted = clip.muted ?? false;
    const isTrackMuted = track.muted ?? false;
    const effectiveMute = isClipMuted || isTrackMuted;

    const clipVolume = clip.volume ?? 1.0;
    const trackVolume = track.volume ?? 1.0;
    const effectiveVolume = clipVolume * trackVolume;

    console.log('[TimelinePlayer] Loading audio clip:', clip.id, media.name);

    // Get or create audio element for this clip
    let audioElement = this.audioElements.get(clip.id);
    if (!audioElement) {
      audioElement = new Audio();
      // Add file:// prefix for local files (same pattern as video clips line 389)
      const fileUrl = media.path.startsWith('file://') ? media.path : `file://${media.path}`;
      audioElement.src = fileUrl;
      this.audioElements.set(clip.id, audioElement);

      // Add 'ended' event handler for automatic cleanup
      audioElement.addEventListener('ended', () => {
        console.log('[TimelinePlayer] Audio clip ended naturally:', clip.id);
        this.currentAudioClipIds.delete(clip.id);
        this.audioElements.delete(clip.id);
        this.audioMixer.removeSource(clip.id);
      });
    }

    // Set playback rate
    audioElement.playbackRate = this.playbackRate;

    // Calculate offset within the clip
    const offsetInClip = this.currentPlayheadPosition - clip.startTime;
    const audioTime = clip.trimStart + offsetInClip;

    // Set current time in audio
    audioElement.currentTime = Math.max(0, audioTime);

    // Connect to AudioMixer if not already connected
    if (!this.connectedElements.has(audioElement)) {
      try {
        await this.audioMixer.resume();
        this.audioMixer.addSource(clip.id, audioElement, clip, track);
        this.connectedElements.add(audioElement);
        console.log('[TimelinePlayer] Connected audio element to AudioMixer:', clip.id);
      } catch (error) {
        console.error('[TimelinePlayer] Error connecting audio to AudioMixer:', error);
        // Fallback to direct audio
        audioElement.volume = Math.max(0, Math.min(1, effectiveVolume));
        audioElement.muted = effectiveMute;
      }
    } else {
      // Update volume for already-connected element
      this.audioMixer.setSourceVolume(clip.id, clipVolume * trackVolume);
    }

    // Apply fade in if configured
    if (clip.fadeIn && clip.fadeIn > 0 && offsetInClip < clip.fadeIn) {
      this.audioMixer.applyFadeIn(clip.id, clip.fadeIn - offsetInClip);
    }

    // Schedule fade out if configured
    if (clip.fadeOut && clip.fadeOut > 0) {
      const clipDuration = clip.endTime - clip.startTime;
      const fadeOutStartTime = clipDuration - clip.fadeOut;
      const timeUntilFadeOut = fadeOutStartTime - offsetInClip;

      if (timeUntilFadeOut > 0) {
        setTimeout(() => {
          this.audioMixer.applyFadeOut(clip.id, clip.fadeOut!);
        }, timeUntilFadeOut * 1000);
      } else {
        // Already in fade out region
        this.audioMixer.applyFadeOut(clip.id, clip.fadeOut);
      }
    }

    // Track this clip as currently playing
    this.currentAudioClipIds.add(clip.id);

    // Play the audio
    try {
      await audioElement.play();
      console.log('[TimelinePlayer] Audio clip playing:', clip.id);
    } catch (error) {
      console.error('[TimelinePlayer] Error playing audio clip:', error);
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
   * Transition after current clip ends
   * Instead of skipping gaps, we let the RAF loop handle playback through empty space
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

    // Move playhead to end of current clip
    const clipEndTime = this.currentClip!.endTime;
    this.currentPlayheadPosition = clipEndTime;
    this.callbacks.onPlayheadUpdate(clipEndTime);

    // Check for seamless transition: is there a clip at the exact end time?
    const nextClip = this.getClipAtPosition(clipEndTime);

    if (nextClip) {
      // FAST PATH: Seamless transition - load next clip directly
      console.log('[TimelinePlayer] Seamless transition to next clip:', nextClip.id);

      this.currentClip = nextClip;

      // Get media file for next clip
      const mediaStore = useMediaStore.getState();
      this.currentMedia = mediaStore.mediaFiles.find(m => m.id === nextClip.mediaFileId) || null;

      if (!this.currentMedia) {
        console.error('[TimelinePlayer] Media file not found for next clip:', nextClip.mediaFileId);
        this.pause();
        this.callbacks.onPlaybackEnd();
        return;
      }

      // Load and play the next clip immediately
      this.playbackState = PlaybackState.LOADING;
      await this.loadAndPlayClip(nextClip);
      this.playbackState = PlaybackState.PLAYING;
      return;
    }

    // No clip at end time - check if there are any clips ahead (gap scenario)
    const nextClipExists = this.findNextClipAfter(clipEndTime);

    if (!nextClipExists) {
      // No more clips ahead - end playback
      console.log('[TimelinePlayer] No more clips, ending playback');
      this.pause();
      this.callbacks.onPlaybackEnd();
      return;
    }

    // GAP PATH: There are clips ahead but not immediately - clear and let RAF loop handle the gap
    console.log('[TimelinePlayer] Clip ended, continuing playback through gap (black screen)');
    this.currentClip = null;
    this.currentMedia = null;

    this.videoElement.pause();
    this.videoElement.removeAttribute('src');
    this.videoElement.load(); // Reset to black screen

    // Stay in PLAYING state - RAF loop will advance through gap and load next clip
    this.playbackState = PlaybackState.PLAYING;
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

        // Boundary detection removed - rely on browser's natural 'ended' event for transitions
        // This prevents race conditions and timing issues with side-by-side clips
      }
      // Case 2: No current clip - we're in a gap or empty timeline (but may have audio playing)
      // Only run gap-handling logic if we're not currently loading a clip (prevents race condition)
      else if (!this.currentClip && this.playbackState !== PlaybackState.LOADING) {
        // Advance playhead at normal speed through empty space
        const adjustedDelta = deltaTime * this.playbackRate;
        this.currentPlayheadPosition += adjustedDelta;
        this.callbacks.onPlayheadUpdate(this.currentPlayheadPosition);

        // Check for audio clips that need to be stopped (exceeded their end time)
        this.currentAudioClipIds.forEach(clipId => {
          // Find the clip in all tracks
          for (const track of this.project.tracks) {
            const clip = track.clips.find(c => c.id === clipId);
            if (clip && this.currentPlayheadPosition >= clip.endTime) {
              console.log('[TimelinePlayer] Stopping audio clip (end time reached):', clipId);
              const audioElement = this.audioElements.get(clipId);
              if (audioElement) {
                audioElement.pause();
              }
              this.currentAudioClipIds.delete(clipId);
              this.audioElements.delete(clipId);
              this.audioMixer.removeSource(clipId);
              break;
            }
          }
        });

        // OPTIMIZATION: Look ahead 500ms to preload upcoming video clips
        // This reduces loading delay when transitioning from gap/audio to video
        // Only preload when video element is paused (not currently playing)
        if (!this.isPreloading && this.videoElement.paused) {
          const lookaheadTime = this.currentPlayheadPosition + 0.5; // 500ms ahead
          const upcomingClips = this.getClipsAtPosition(lookaheadTime);

          if (upcomingClips.videoClip) {
            console.log('[TimelinePlayer] Preloading upcoming clip:', upcomingClips.videoClip.id);
            this.isPreloading = true;
            this.preloadClip(upcomingClips.videoClip).catch((err) => {
              console.error('[TimelinePlayer] Error preloading clip:', err);
            });
          }
        }

        // Check if we've reached any clips (video or audio)
        const clipsAtPosition = this.getClipsAtPosition(this.currentPlayheadPosition);

        // Start video clip if found
        if (clipsAtPosition.videoClip) {
          console.log('[TimelinePlayer] Reached video clip at', clipsAtPosition.videoClip.startTime);

          // CRITICAL FIX: Set currentClip IMMEDIATELY to prevent Case 2 from running again
          // This prevents the "timing black hole" where RAF does nothing during LOADING state
          this.currentClip = clipsAtPosition.videoClip;
          this.playbackState = PlaybackState.LOADING;

          // Get media file early (loadAndPlayClip needs this anyway)
          const mediaStore = useMediaStore.getState();
          this.currentMedia = mediaStore.mediaFiles.find(m => m.id === clipsAtPosition.videoClip!.mediaFileId) || null;

          this.loadAndPlayClip(clipsAtPosition.videoClip).then(() => {
            this.playbackState = PlaybackState.PLAYING;
          }).catch((err) => {
            console.error('[TimelinePlayer] Error loading clip:', err);
            // Clear clip state on error
            this.currentClip = null;
            this.currentMedia = null;
            this.pause();
          });
        }

        // Start audio clips if found
        if (clipsAtPosition.audioClips.length > 0) {
          for (const audioClip of clipsAtPosition.audioClips) {
            // Only start if not already playing
            if (!this.currentAudioClipIds.has(audioClip.id)) {
              console.log('[TimelinePlayer] Reached audio clip at', audioClip.startTime);
              this.loadAndPlayAudioClip(audioClip).catch((err) => {
                console.error('[TimelinePlayer] Error loading audio clip:', err);
              });
            }
          }
        }

        // If no clips at current position, check if we've passed all clips
        if (!clipsAtPosition.videoClip && clipsAtPosition.audioClips.length === 0) {
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

    // Stop and cleanup all audio elements
    this.audioElements.forEach((audioElement, clipId) => {
      audioElement.pause();
      audioElement.src = '';
      this.audioMixer.removeSource(clipId);
    });
    this.audioElements.clear();
    this.currentAudioClipIds.clear();

    // Cleanup AudioMixer
    this.audioMixer.destroy();
    this.connectedElements.clear();

    console.log('[TimelinePlayer] Destroyed');
  }
}
