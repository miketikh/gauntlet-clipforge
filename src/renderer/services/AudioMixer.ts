/**
 * Audio Mixer Service
 * Mixes multiple audio sources using Web Audio API
 * Supports volume control, fading, and ducking
 */

import { TimelineClip, Track } from '../../types/timeline';

export interface AudioSource {
  id: string;              // Clip ID
  element: HTMLMediaElement;  // Audio or video element
  gainNode: GainNode;      // For volume control
  fadeNode: GainNode;      // For fade in/out
  startTime: number;       // When to start in timeline
  endTime: number;         // When to end in timeline
  clipVolume: number;      // Clip volume setting
  trackVolume: number;     // Track volume setting
}

export class AudioMixer {
  private audioContext: AudioContext;
  private masterGain: GainNode;
  private sources: Map<string, AudioSource>;
  // Store created MediaElementSourceNodes to avoid recreating them
  private elementSourceNodes: Map<HTMLMediaElement, MediaElementAudioSourceNode>;

  constructor() {
    this.audioContext = new AudioContext();
    this.masterGain = this.audioContext.createGain();
    this.masterGain.connect(this.audioContext.destination);
    this.sources = new Map();
    this.elementSourceNodes = new Map();
  }

  /**
   * Add an audio source to the mix
   */
  addSource(
    clipId: string,
    element: HTMLMediaElement,
    clip: TimelineClip,
    track: Track
  ): AudioSource {
    // Create gain nodes for volume control
    const gainNode = this.audioContext.createGain();
    const fadeNode = this.audioContext.createGain();

    // Get or create the MediaElementSourceNode for this element
    // CRITICAL: createMediaElementSource can only be called ONCE per element
    let sourceNode = this.elementSourceNodes.get(element);
    if (!sourceNode) {
      sourceNode = this.audioContext.createMediaElementSource(element);
      this.elementSourceNodes.set(element, sourceNode);
      console.log('[AudioMixer] Created MediaElementSource for element');
    } else {
      console.log('[AudioMixer] Reusing existing MediaElementSource');
    }

    // Connect: source → gainNode → fadeNode → masterGain → output
    sourceNode.connect(gainNode);
    gainNode.connect(fadeNode);
    fadeNode.connect(this.masterGain);

    // Calculate effective volume
    const clipVolume = clip.volume ?? 1.0;
    const trackVolume = track.volume ?? 1.0;
    gainNode.gain.value = clipVolume * trackVolume;

    const source: AudioSource = {
      id: clipId,
      element,
      gainNode,
      fadeNode,
      startTime: clip.startTime,
      endTime: clip.endTime,
      clipVolume,
      trackVolume
    };

    this.sources.set(clipId, source);
    console.log('[AudioMixer] Added source:', clipId);

    return source;
  }

  /**
   * Remove an audio source
   */
  removeSource(clipId: string): void {
    const source = this.sources.get(clipId);
    if (!source) return;

    // Disconnect nodes
    source.gainNode.disconnect();
    source.fadeNode.disconnect();

    this.sources.delete(clipId);
    console.log('[AudioMixer] Removed source:', clipId);
  }

  /**
   * Update volume for a source
   */
  setSourceVolume(clipId: string, volume: number): void {
    const source = this.sources.get(clipId);
    if (!source) return;

    source.gainNode.gain.value = volume;
  }

  /**
   * Apply fade in effect
   */
  applyFadeIn(clipId: string, duration: number): void {
    const source = this.sources.get(clipId);
    if (!source || duration <= 0) return;

    const now = this.audioContext.currentTime;
    const fadeNode = source.fadeNode;

    // Start from 0, ramp to 1 over duration
    fadeNode.gain.setValueAtTime(0, now);
    fadeNode.gain.linearRampToValueAtTime(1, now + duration);

    console.log('[AudioMixer] Applied fade in:', clipId, duration);
  }

  /**
   * Apply fade out effect
   */
  applyFadeOut(clipId: string, duration: number): void {
    const source = this.sources.get(clipId);
    if (!source || duration <= 0) return;

    const now = this.audioContext.currentTime;
    const fadeNode = source.fadeNode;

    // Start from 1, ramp to 0 over duration
    fadeNode.gain.setValueAtTime(1, now);
    fadeNode.gain.linearRampToValueAtTime(0, now + duration);

    console.log('[AudioMixer] Applied fade out:', clipId, duration);
  }

  /**
   * Set master volume
   */
  setMasterVolume(volume: number): void {
    this.masterGain.gain.value = Math.max(0, Math.min(1, volume));
  }

  /**
   * Resume audio context (required after user interaction)
   */
  async resume(): Promise<void> {
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.sources.forEach(source => {
      source.gainNode.disconnect();
      source.fadeNode.disconnect();
    });
    this.sources.clear();

    // Disconnect all element source nodes
    this.elementSourceNodes.forEach(node => {
      node.disconnect();
    });
    this.elementSourceNodes.clear();

    this.masterGain.disconnect();
    this.audioContext.close();
  }
}
