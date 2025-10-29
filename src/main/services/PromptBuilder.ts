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
Analyze the transcript below for effectiveness with the target audience. You MUST format your response using the structure shown below.

**CRITICAL TIMESTAMP FORMAT:**
All timestamps MUST be wrapped in double curly braces: {{MM:SS}} or {{HH:MM:SS}}
Examples: {{00:07}}, {{01:23}}, {{01:23:45}}
You can use timestamps anywhere in your text - they will become clickable links to jump to that moment.
This exact format is required for the timestamp parser to work.

**REQUIRED OUTPUT FORMAT:**

📊 QUICK STATS
Pacing: [Too Fast/Just Right/Too Slow] | Clarity: [Excellent/Good/Needs Work/Confusing] | Engagement: [High/Moderate/Low]
Target Audience Match: [percentage]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ KEEP (What's Working)
- [What's working and why] (reference timestamps like {{MM:SS}} in your text)
- [What's working and why]

⚠️ NEEDS CONTEXT (Confusing for Audience)
- At {{MM:SS}} - "[Quote or issue]"
  → Add: [Specific suggestion]
  → Or: [Alternative approach]

✂️ CONSIDER CUTTING
- At {{MM:SS}} - [What to cut and why]
  → Replace with: [Specific suggestion if applicable]

⚡ CONTROVERSIAL/RISKY
- At {{MM:SS}} - "[Quote or claim]"
  → Risk: [Why this might be problematic]
  → Action: [Specific mitigation suggestion]

🎯 MISSING CONTENT
- [What's missing]
- [What's missing]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎬 EDITING RECOMMENDATIONS (Priority Order)
1. [Highest priority action with specifics]
2. [Next priority action with specifics]
3. [Additional recommendations]

**Example Response Format:**

📊 QUICK STATS
Pacing: Too Fast | Clarity: Needs Work | Engagement: Moderate
Target Audience Match: 60%

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ KEEP (What's Working)
- Strong opening energy at {{00:00}}, welcoming tone
- Overall conversational delivery style

⚠️ NEEDS CONTEXT (Confusing for Audience)
- At {{00:07}} - "Cursor" mentioned without explanation
  → Add: 5-10 sec explainer or b-roll showing the tool
  → Or: Cut and simplify to "using AI coding tools"

✂️ CONSIDER CUTTING
- At {{00:14}} - Ending too abrupt, no payoff
  → Replace with: actual demo or clearer next steps

⚡ CONTROVERSIAL/RISKY
- At {{00:07}} - "Just tell it what app you want"
  → Risk: Sets unrealistic expectations
  → Action: Add disclaimer or show actual complexity

🎯 MISSING CONTENT
- No overview of what coding actually involves
- No realistic timeframe expectations
- No clear call-to-action

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎬 EDITING RECOMMENDATIONS (Priority Order)
1. Add 10-15 sec intro explaining what you'll teach
2. Insert b-roll/screenshot of Cursor at {{00:07}}
3. Extend ending by 15-20 sec with next steps
4. Consider adding text overlay: "Step 1 of X"

**Transcript:**
${formattedTranscript}

**Please provide your analysis using the format shown above:**`;

    // Log prompt character count for debugging
    console.log(`[PromptBuilder] Prompt generated: ${prompt.length} characters`);

    return prompt;
  }
}

// Export singleton instance
export const promptBuilder = new PromptBuilder();
