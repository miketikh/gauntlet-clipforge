import { audioExtractor } from './AudioExtractor';
import { transcriptionService } from './TranscriptionService';
import { contentAnalyzer } from './ContentAnalyzer';
import { Transcript, TranscriptSegment, UserProfile, AnalysisResult } from '../../types/ai';
import * as fs from 'fs';

/**
 * VideoAnalysisService - Orchestrates full video transcription pipeline
 *
 * Pipeline:
 * 1. Extract audio from video (AudioExtractor)
 * 2. Validate audio file (size limits)
 * 3. Transcribe audio (TranscriptionService)
 * 4. Clean up temporary files (always, even on error)
 * 5. Adjust timestamps if clip is trimmed
 */
export class VideoAnalysisService {
  constructor() {
    console.log('[VideoAnalysisService] Initialized');
  }

  /**
   * Transcribe video to text with timestamps
   *
   * @param videoPath - Path to video file
   * @param startTime - Optional clip start time (for trimmed clips, in seconds)
   * @param endTime - Optional clip end time (for trimmed clips, in seconds)
   * @returns Transcript with full text, segments, duration, and language
   */
  async transcribeVideo(
    videoPath: string,
    startTime?: number,
    endTime?: number
  ): Promise<Transcript> {
    console.log('[VideoAnalysisService] Starting video transcription pipeline');
    console.log(`[VideoAnalysisService] Video: ${videoPath}`);
    if (startTime !== undefined || endTime !== undefined) {
      console.log(`[VideoAnalysisService] Trimmed clip: ${startTime}s - ${endTime}s`);
    }

    // Validate video file exists
    if (!fs.existsSync(videoPath)) {
      const error = new Error(`Video file not found: ${videoPath}`);
      console.error('[VideoAnalysisService]', error.message);
      throw error;
    }

    let audioPath: string | null = null;

    try {
      // **Step 1: Extract audio**
      console.log('[VideoAnalysisService] Step 1: Extracting audio from video...');
      audioPath = await audioExtractor.extractAudio(videoPath);
      console.log(`[VideoAnalysisService] Audio extracted to: ${audioPath}`);

      // **Step 2: Validate audio file**
      console.log('[VideoAnalysisService] Step 2: Validating audio file...');
      const validation = await transcriptionService.validateAudioFile(audioPath);

      if (!validation.valid) {
        const errorMsg = validation.error || 'Audio file validation failed';
        console.error('[VideoAnalysisService]', errorMsg);
        throw new Error(errorMsg);
      }

      console.log(`[VideoAnalysisService] Audio file validated: ${validation.sizeInMB?.toFixed(2)}MB`);

      // **Step 3: Transcribe audio**
      console.log('[VideoAnalysisService] Step 3: Transcribing audio with Whisper API...');
      const transcript = await transcriptionService.transcribeAudio(audioPath);
      console.log('[VideoAnalysisService] Transcription complete');
      console.log(`[VideoAnalysisService] Transcript: ${transcript.segments.length} segments, ${transcript.fullText.length} chars`);

      // **Step 5: Adjust timestamps if clip is trimmed**
      // If startTime is provided, offset all segment times by startTime
      // This ensures timestamps are relative to original video, not the clip
      if (startTime !== undefined && startTime > 0) {
        console.log(`[VideoAnalysisService] Adjusting timestamps by offset: +${startTime}s`);

        const adjustedSegments: TranscriptSegment[] = transcript.segments.map(segment => ({
          start: segment.start + startTime,
          end: segment.end + startTime,
          text: segment.text,
        }));

        const adjustedTranscript: Transcript = {
          ...transcript,
          segments: adjustedSegments,
        };

        console.log(`[VideoAnalysisService] Timestamps adjusted: ${adjustedSegments[0]?.start.toFixed(2)}s - ${adjustedSegments[adjustedSegments.length - 1]?.end.toFixed(2)}s`);

        return adjustedTranscript;
      }

      return transcript;

    } catch (error) {
      console.error('[VideoAnalysisService] Pipeline error:', error);

      // Re-throw with more descriptive error messages
      if (error instanceof Error) {
        // Check for specific error types and provide better messages
        if (error.message.includes('API key')) {
          throw new Error('OpenAI API key not configured or invalid. Please set your API key in Settings.');
        }
        if (error.message.includes('network') || error.message.includes('ENOTFOUND')) {
          throw new Error('Network error during transcription. Please check your internet connection.');
        }
        if (error.message.includes('too large')) {
          throw new Error(`Audio file too large for Whisper API (max 25MB). ${error.message}`);
        }
        if (error.message.includes('No audio track')) {
          throw new Error('Video file has no audio track. Cannot transcribe.');
        }

        // Pass through other errors
        throw error;
      }

      throw new Error('Failed to transcribe video: Unknown error');

    } finally {
      // **Step 4: Clean up temporary files (ALWAYS runs, even on error)**
      if (audioPath) {
        console.log('[VideoAnalysisService] Step 4: Cleaning up temporary audio file...');
        audioExtractor.deleteTemporaryFile(audioPath);
        console.log('[VideoAnalysisService] Temporary audio file cleaned up');
      }
    }
  }

  /**
   * Analyze video content with GPT-4
   * Full pipeline: Extract audio → Transcribe → Analyze with AI
   *
   * @param videoPath - Path to video file
   * @param profile - User profile for personalized analysis
   * @param startTime - Optional clip start time (for trimmed clips, in seconds)
   * @param endTime - Optional clip end time (for trimmed clips, in seconds)
   * @returns AnalysisResult with GPT-4 feedback and transcript
   */
  async analyzeVideoContent(
    videoPath: string,
    profile: UserProfile,
    startTime?: number,
    endTime?: number
  ): Promise<AnalysisResult> {
    const pipelineStartTime = Date.now();

    console.log('[VideoAnalysisService] ========================================');
    console.log('[VideoAnalysisService] Starting full video analysis pipeline');
    console.log(`[VideoAnalysisService] Video: ${videoPath}`);
    console.log(`[VideoAnalysisService] Profile: ${profile.name} (${profile.targetAudience})`);

    if (startTime !== undefined || endTime !== undefined) {
      console.log(`[VideoAnalysisService] Trimmed clip: ${startTime}s - ${endTime}s`);
    }

    try {
      // **Step 1: Transcribe video**
      console.log('[VideoAnalysisService] Step 1: Transcribing video...');
      const transcriptStartTime = Date.now();

      const transcript = await this.transcribeVideo(videoPath, startTime, endTime);

      const transcriptDuration = ((Date.now() - transcriptStartTime) / 1000).toFixed(2);
      console.log(`[VideoAnalysisService] Transcription complete: ${transcript.segments.length} segments`);
      console.log(`[VideoAnalysisService] Transcription time: ${transcriptDuration}s`);

      // **Step 2: Analyze content with GPT-4**
      console.log('[VideoAnalysisService] Step 2: Analyzing content with GPT-4...');
      const analysisStartTime = Date.now();

      const result = await contentAnalyzer.analyzeContent(profile, transcript);

      const analysisDuration = ((Date.now() - analysisStartTime) / 1000).toFixed(2);
      console.log(`[VideoAnalysisService] Content analysis complete: ${result.analysis.length} chars`);
      console.log(`[VideoAnalysisService] Analysis time: ${analysisDuration}s`);

      // **Step 3: Return complete result**
      const totalDuration = ((Date.now() - pipelineStartTime) / 1000).toFixed(2);
      console.log('[VideoAnalysisService] ========================================');
      console.log(`[VideoAnalysisService] Full pipeline complete in ${totalDuration}s`);
      console.log(`[VideoAnalysisService]   - Transcription: ${transcriptDuration}s`);
      console.log(`[VideoAnalysisService]   - Analysis: ${analysisDuration}s`);
      console.log('[VideoAnalysisService] ========================================');

      return result;

    } catch (error) {
      console.error('[VideoAnalysisService] Full pipeline error:', error);

      // Re-throw with descriptive error messages
      if (error instanceof Error) {
        // Check for specific error types
        if (error.message.includes('API key not configured')) {
          throw new Error('OpenAI API key not configured. Please set your API key in Settings.');
        }
        if (error.message.includes('Invalid OpenAI API key')) {
          throw new Error('Invalid OpenAI API key. Please check your API key in Settings.');
        }
        if (error.message.includes('rate limit')) {
          throw new Error('OpenAI API rate limit exceeded. Please try again in a moment.');
        }
        if (error.message.includes('network') || error.message.includes('ENOTFOUND')) {
          throw new Error('Network error during analysis. Please check your internet connection.');
        }
        if (error.message.includes('too large')) {
          throw new Error(`File too large for analysis. ${error.message}`);
        }
        if (error.message.includes('Video file not found')) {
          throw new Error(`Video file not found: ${videoPath}`);
        }

        // Pass through other errors with context
        throw new Error(`Video analysis failed: ${error.message}`);
      }

      throw new Error('Failed to analyze video: Unknown error');
    }
  }
}

// Export singleton instance
export const videoAnalysisService = new VideoAnalysisService();
