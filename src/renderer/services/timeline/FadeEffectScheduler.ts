/**
 * Fade Effect Scheduler
 * Centralized service for applying fade in/out effects to audio sources
 */

import { TimelineClip } from '../../../types/timeline';
import { AudioMixer } from '../AudioMixer';

export class FadeEffectScheduler {
  private audioMixer: AudioMixer;

  constructor(audioMixer: AudioMixer) {
    this.audioMixer = audioMixer;
  }

  /**
   * Apply fade effects (both in and out) to an audio source
   *
   * @param sourceId - AudioMixer source ID
   * @param clip - Timeline clip with fade settings
   * @param offsetInClip - Current offset within the clip (for resuming mid-clip)
   */
  applyFadeEffects(
    sourceId: string,
    clip: TimelineClip,
    offsetInClip: number = 0
  ): void {
    this.scheduleFadeIn(sourceId, clip, offsetInClip);
    this.scheduleFadeOut(sourceId, clip, offsetInClip);
  }

  /**
   * Schedule fade in effect
   */
  private scheduleFadeIn(sourceId: string, clip: TimelineClip, offsetInClip: number): void {
    if (!clip.fadeIn || clip.fadeIn <= 0) {
      return; // No fade in configured
    }

    // Only apply if we're within the fade in region
    if (offsetInClip < clip.fadeIn) {
      const remainingFadeIn = clip.fadeIn - offsetInClip;
      this.audioMixer.applyFadeIn(sourceId, remainingFadeIn);
      console.log('[FadeEffectScheduler] Applied fade in:', remainingFadeIn, 'seconds');
    }
  }

  /**
   * Schedule fade out effect
   */
  private scheduleFadeOut(sourceId: string, clip: TimelineClip, offsetInClip: number): void {
    if (!clip.fadeOut || clip.fadeOut <= 0) {
      return; // No fade out configured
    }

    const clipDuration = clip.endTime - clip.startTime;
    const fadeOutStartTime = clipDuration - clip.fadeOut;
    const timeUntilFadeOut = fadeOutStartTime - offsetInClip;

    if (timeUntilFadeOut > 0) {
      // Schedule fade out for later
      setTimeout(() => {
        this.audioMixer.applyFadeOut(sourceId, clip.fadeOut!);
        console.log('[FadeEffectScheduler] Applied fade out:', clip.fadeOut, 'seconds');
      }, timeUntilFadeOut * 1000);
    } else if (fadeOutStartTime > 0) {
      // Already in fade out region, but not immediate
      const remainingFadeOut = clip.fadeOut - (offsetInClip - fadeOutStartTime);
      this.audioMixer.applyFadeOut(sourceId, Math.max(0, remainingFadeOut));
      console.log('[FadeEffectScheduler] Applied immediate fade out (already in region):', remainingFadeOut, 'seconds');
    } else {
      // Fade out duration is longer than clip - start immediately
      this.audioMixer.applyFadeOut(sourceId, clip.fadeOut);
      console.log('[FadeEffectScheduler] Applied immediate fade out (duration longer than clip)');
    }
  }
}
