/**
 * Waveform Extractor Service
 * Extracts audio waveform data from video/audio files using Web Audio API
 * Uses min/max algorithm (like Audacity/DAWs) for accurate waveform representation
 */

export interface WaveformConfig {
  sampleCount?: number;  // Number of amplitude samples (default: 1000)
  channel?: number;      // Which audio channel (0 = left, 1 = right, -1 = average all channels)
}

export interface WaveformPeak {
  min: number;  // Minimum value in this sample window (-1 to 0)
  max: number;  // Maximum value in this sample window (0 to 1)
}

export class WaveformExtractor {
  private audioContext: AudioContext | null = null;

  /**
   * Extract waveform data from a file
   * @param filePath - Absolute path to audio/video file
   * @param config - Configuration options
   * @returns Array of min/max peak pairs (like Audacity/professional DAWs)
   */
  async extract(filePath: string, config?: WaveformConfig): Promise<WaveformPeak[]> {
    const sampleCount = config?.sampleCount ?? 1000;
    const channel = config?.channel ?? -1; // Default: average all channels

    console.log('[WaveformExtractor] Extracting waveform:', {
      filePath,
      sampleCount,
      channel
    });

    try {
      // Create audio context if not exists
      if (!this.audioContext) {
        this.audioContext = new AudioContext();
      }

      // Fetch file as ArrayBuffer
      console.log('[WaveformExtractor] Fetching file...');
      const response = await fetch('file://' + filePath);
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      console.log('[WaveformExtractor] File loaded, size:', arrayBuffer.byteLength);

      // Decode audio data
      console.log('[WaveformExtractor] Decoding audio...');
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      console.log('[WaveformExtractor] Audio decoded:', {
        duration: audioBuffer.duration,
        channels: audioBuffer.numberOfChannels,
        sampleRate: audioBuffer.sampleRate,
        length: audioBuffer.length
      });

      // Extract and process channel data
      const rawData = this.extractChannelData(audioBuffer, channel);
      console.log('[WaveformExtractor] Channel data extracted, length:', rawData.length);

      // Downsample to desired sample count using min/max algorithm
      const downsampled = this.downsample(rawData, sampleCount);
      console.log('[WaveformExtractor] Downsampled to', downsampled.length, 'min/max pairs');

      // Normalize to ensure values fit in -1 to 1 range
      const normalized = this.normalize(downsampled);
      console.log('[WaveformExtractor] Normalized waveform data ready');

      return normalized;
    } catch (error) {
      console.error('[WaveformExtractor] Error extracting waveform:', error);
      throw error;
    }
  }

  /**
   * Extract channel data from AudioBuffer
   * @param audioBuffer - Decoded audio buffer
   * @param channel - Channel to extract (-1 for average, 0+ for specific channel)
   * @returns Float32Array of audio samples
   */
  private extractChannelData(audioBuffer: AudioBuffer, channel: number): Float32Array {
    const numChannels = audioBuffer.numberOfChannels;
    const length = audioBuffer.length;

    if (channel === -1) {
      // Average all channels
      console.log('[WaveformExtractor] Averaging', numChannels, 'channels');
      const averaged = new Float32Array(length);

      // Sum all channels
      for (let ch = 0; ch < numChannels; ch++) {
        const channelData = audioBuffer.getChannelData(ch);
        for (let i = 0; i < length; i++) {
          averaged[i] += channelData[i];
        }
      }

      // Divide by number of channels to get average
      for (let i = 0; i < length; i++) {
        averaged[i] /= numChannels;
      }

      return averaged;
    } else {
      // Extract specific channel
      if (channel >= numChannels) {
        console.warn('[WaveformExtractor] Channel', channel, 'not available, using channel 0');
        return audioBuffer.getChannelData(0);
      }
      console.log('[WaveformExtractor] Extracting channel', channel);
      return audioBuffer.getChannelData(channel);
    }
  }

  /**
   * Downsample audio data using min/max algorithm (like Audacity/DAWs)
   * Stores both minimum and maximum values per block for accurate waveform
   * @param data - Raw audio samples (-1 to 1 range)
   * @param targetSampleCount - Desired number of samples
   * @returns Array of min/max peak pairs
   */
  private downsample(data: Float32Array, targetSampleCount: number): WaveformPeak[] {
    const dataLength = data.length;
    const blockSize = Math.floor(dataLength / targetSampleCount);
    const downsampled: WaveformPeak[] = [];

    console.log('[WaveformExtractor] Downsampling with min/max algorithm:', {
      originalLength: dataLength,
      targetSampleCount,
      blockSize
    });

    for (let i = 0; i < targetSampleCount; i++) {
      const blockStart = i * blockSize;
      const blockEnd = Math.min(blockStart + blockSize, dataLength);

      // Find min and max values in this block (preserves waveform asymmetry)
      let minValue = 1;
      let maxValue = -1;
      for (let j = blockStart; j < blockEnd; j++) {
        const sample = data[j];
        if (sample < minValue) minValue = sample;
        if (sample > maxValue) maxValue = sample;
      }

      downsampled.push({ min: minValue, max: maxValue });
    }

    return downsampled;
  }

  /**
   * Normalize min/max peak values to fit in -1 to 1 range
   * Finds the maximum absolute value and scales all peaks proportionally
   * @param data - Array of min/max peaks
   * @returns Normalized peak array
   */
  private normalize(data: WaveformPeak[]): WaveformPeak[] {
    // Find maximum absolute value across all peaks
    let maxAbsValue = 0;
    for (let i = 0; i < data.length; i++) {
      const absMin = Math.abs(data[i].min);
      const absMax = Math.abs(data[i].max);
      maxAbsValue = Math.max(maxAbsValue, absMin, absMax);
    }

    // Avoid division by zero
    if (maxAbsValue === 0) {
      console.warn('[WaveformExtractor] Max absolute value is 0, returning zeros');
      return data.map(() => ({ min: 0, max: 0 }));
    }

    // Already in good range, no scaling needed
    if (maxAbsValue <= 1.0) {
      console.log('[WaveformExtractor] Peaks already in range, no normalization needed');
      return data;
    }

    // Scale to fit in -1 to 1 range
    const scale = 1.0 / maxAbsValue;
    const normalized = data.map(peak => ({
      min: peak.min * scale,
      max: peak.max * scale
    }));

    console.log('[WaveformExtractor] Normalized peaks, scale factor:', scale);
    return normalized;
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.audioContext) {
      console.log('[WaveformExtractor] Closing audio context');
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}
