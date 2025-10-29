import OpenAI from 'openai';
import * as fs from 'fs';
import { apiKeyStorage } from './ApiKeyStorage';
import { Transcript, TranscriptSegment } from '../../types/ai';

/**
 * TranscriptionService - OpenAI Whisper API integration
 * Transcribes audio files using Whisper with segment-level timestamps
 */
export class TranscriptionService {
  /**
   * Transcribe audio file using OpenAI Whisper API
   * @param audioPath - Path to audio file (MP3, WAV, etc.)
   * @returns Transcript with full text, segments, duration, and language
   */
  async transcribeAudio(audioPath: string): Promise<Transcript> {
    console.log('[TranscriptionService] Transcribing audio file:', audioPath);

    try {
      // Get API key from secure storage
      const apiKey = await apiKeyStorage.getApiKey();
      if (!apiKey) {
        throw new Error('OpenAI API key not configured');
      }

      // Validate audio file before sending
      const validation = await this.validateAudioFile(audioPath);
      if (!validation.valid) {
        throw new Error(validation.error || 'Audio file validation failed');
      }

      // Initialize OpenAI client
      const openai = new OpenAI({ apiKey });

      // Read audio file as stream
      const audioFile = fs.createReadStream(audioPath);

      // Call Whisper API with verbose_json for timestamps
      const response = await openai.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1',
        response_format: 'verbose_json',
        timestamp_granularities: ['segment'],
      });

      // Parse response to extract segments
      const segments: TranscriptSegment[] = [];
      let fullText = '';
      let duration = 0;

      // Type assertion for verbose_json response
      const verboseResponse = response as any;

      if (verboseResponse.segments && Array.isArray(verboseResponse.segments)) {
        for (const segment of verboseResponse.segments) {
          segments.push({
            start: segment.start || 0,
            end: segment.end || 0,
            text: segment.text || '',
          });
          fullText += segment.text || '';

          // Track the latest end time as duration
          if (segment.end > duration) {
            duration = segment.end;
          }
        }
      } else {
        // Fallback if segments not available - use full text
        fullText = verboseResponse.text || '';
        segments.push({
          start: 0,
          end: verboseResponse.duration || 0,
          text: fullText,
        });
        duration = verboseResponse.duration || 0;
      }

      const transcript: Transcript = {
        fullText: fullText.trim(),
        segments,
        duration,
        language: verboseResponse.language,
      };

      console.log(
        `[TranscriptionService] Transcription complete: ${duration.toFixed(1)}s, ${segments.length} segments, ${fullText.length} chars`
      );

      return transcript;
    } catch (error) {
      console.error('[TranscriptionService] Transcription error:', error);

      // Provide meaningful error messages
      if (error instanceof Error) {
        if (error.message.includes('API key')) {
          throw new Error('Invalid OpenAI API key. Please check your API key configuration.');
        }
        if (error.message.includes('network') || error.message.includes('ENOTFOUND')) {
          throw new Error('Network error. Please check your internet connection.');
        }
        throw error;
      }

      throw new Error('Failed to transcribe audio: Unknown error');
    }
  }

  /**
   * Validate audio file before sending to Whisper API
   * @param audioPath - Path to audio file
   * @returns Validation result with error message if invalid
   */
  async validateAudioFile(
    audioPath: string
  ): Promise<{ valid: boolean; error?: string; sizeInMB?: number }> {
    try {
      // Check if file exists
      if (!fs.existsSync(audioPath)) {
        return {
          valid: false,
          error: `Audio file not found: ${audioPath}`,
        };
      }

      // Get file stats
      const stats = fs.statSync(audioPath);
      const sizeInBytes = stats.size;
      const sizeInMB = sizeInBytes / (1024 * 1024);

      // Whisper API has 25MB limit
      const MAX_SIZE_MB = 25;
      if (sizeInMB > MAX_SIZE_MB) {
        return {
          valid: false,
          error: `Audio file too large: ${sizeInMB.toFixed(2)}MB (max ${MAX_SIZE_MB}MB)`,
          sizeInMB,
        };
      }

      console.log(
        `[TranscriptionService] Audio file validated: ${sizeInMB.toFixed(2)}MB`
      );

      return {
        valid: true,
        sizeInMB,
      };
    } catch (error) {
      console.error('[TranscriptionService] Validation error:', error);
      return {
        valid: false,
        error: `Failed to validate audio file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
}

// Export singleton instance
export const transcriptionService = new TranscriptionService();
