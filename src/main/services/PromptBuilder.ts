/**
 * PromptBuilder Service
 * Builds GPT-4 prompts that combine user profile + transcript for content analysis
 */

import { UserProfile, Transcript, TranscriptSegment } from '../../types/ai';

class PromptBuilder {
  /**
   * Convert seconds to MM:SS format
   * Examples: 65 → "01:05", 130 → "02:10", 3665 → "61:05"
   */
  formatTimestamp(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);

    // Pad with leading zeros
    const minutesStr = minutes.toString().padStart(2, '0');
    const secsStr = secs.toString().padStart(2, '0');

    return `${minutesStr}:${secsStr}`;
  }

  /**
   * Format transcript with timestamps for prompt
   * Output format: [MM:SS] text
   */
  formatTranscriptWithTimestamps(transcript: Transcript): string {
    const formattedSegments = transcript.segments.map((segment: TranscriptSegment) => {
      const timestamp = this.formatTimestamp(segment.start);
      return `[${timestamp}] ${segment.text}`;
    });

    return formattedSegments.join('\n');
  }

  /**
   * Build complete GPT-4 analysis prompt
   * Combines profile context + transcript with clear instructions
   */
  buildAnalysisPrompt(profile: UserProfile, transcript: Transcript): string {
    const formattedTranscript = this.formatTranscriptWithTimestamps(transcript);

    const prompt = `You are an expert content consultant analyzing video content.

**Target Audience:**
${profile.targetAudience}

**Content Guidelines:**
${profile.contentGuidelines}

**Instructions:**
Analyze the transcript below for effectiveness with the target audience. Your analysis should:
- Reference specific moments using {{MM:SS}} format (e.g., "At {{01:23}} you mention...")
- Cover what works well and what could be improved
- Identify any potential issues or concerns
- Provide specific, actionable suggestions
- Give an overall assessment of the content

Be conversational and helpful in your tone - think of yourself as a friendly consultant, not a formal report writer.

**Transcript:**
${formattedTranscript}

**Please provide your analysis:**`;

    // Log prompt character count for debugging
    console.log(`[PromptBuilder] Prompt generated: ${prompt.length} characters`);

    return prompt;
  }
}

// Export singleton instance
export const promptBuilder = new PromptBuilder();
