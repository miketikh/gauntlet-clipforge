/**
 * Player state management using Zustand
 * Handles video playback state and controls
 */

import { create } from 'zustand';

interface PlayerState {
  isPlaying: boolean;
  currentTime: number; // Current playback time in seconds
  volume: number; // Volume level 0-1
  playbackRate: number; // Playback speed (1.0 = normal)

  // Actions
  play: () => void;
  pause: () => void;
  seek: (time: number) => void;
  setVolume: (level: number) => void;
  setPlaybackRate: (rate: number) => void;
  setCurrentTime: (time: number) => void;
}

export const usePlayerStore = create<PlayerState>((set) => ({
  isPlaying: false,
  currentTime: 0,
  volume: 1.0,
  playbackRate: 1.0,

  /**
   * Start playback
   */
  play: () => {
    set({ isPlaying: true });
  },

  /**
   * Pause playback
   */
  pause: () => {
    set({ isPlaying: false });
  },

  /**
   * Seek to a specific time position
   */
  seek: (time: number) => {
    set({ currentTime: Math.max(0, time) });
  },

  /**
   * Set volume level (0-1)
   */
  setVolume: (level: number) => {
    set({ volume: Math.max(0, Math.min(1, level)) });
  },

  /**
   * Set playback speed
   */
  setPlaybackRate: (rate: number) => {
    set({ playbackRate: Math.max(0.25, Math.min(2, rate)) });
  },

  /**
   * Update current time (called during playback)
   */
  setCurrentTime: (time: number) => {
    set({ currentTime: time });
  },
}));
