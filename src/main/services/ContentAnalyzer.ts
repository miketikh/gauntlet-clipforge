/**
 * ContentAnalyzer Service
 * Sends prompts to GPT-4 and gets content analysis responses
 */

import OpenAI from 'openai';
import { apiKeyStorage } from './ApiKeyStorage';
import { promptBuilder } from './PromptBuilder';
import { UserProfile, Transcript, AnalysisResult } from '../../types/ai';

class ContentAnalyzer {
  /**
   * Analyze video content using GPT-4
   * Combines user profile + transcript to generate personalized feedback
   */
  async analyzeContent(profile: UserProfile, transcript: Transcript): Promise<AnalysisResult> {
    try {
      // Step 1: Get API key
      const apiKey = await apiKeyStorage.getApiKey();
      if (!apiKey) {
        throw new Error('OpenAI API key not configured. Please configure your API key in settings.');
      }

      // Step 2: Initialize OpenAI client
      const openai = new OpenAI({ apiKey });

      // Step 3: Build prompt
      const prompt = promptBuilder.buildAnalysisPrompt(profile, transcript);

      console.log('[ContentAnalyzer] Sending transcript to GPT-4 for analysis...');
      console.log(`[ContentAnalyzer] Prompt length: ${prompt.length} characters`);

      // Step 4: Call GPT-4 API
      const response = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview', // Latest GPT-4 Turbo model
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7, // Balanced creativity/consistency
        max_tokens: 2000  // Enough for detailed analysis
      });

      // Step 5: Extract response
      const analysisText = response.choices[0].message.content;
      if (!analysisText) {
        throw new Error('GPT-4 returned empty response');
      }

      const tokenUsage = response.usage ? {
        promptTokens: response.usage.prompt_tokens,
        completionTokens: response.usage.completion_tokens,
        totalTokens: response.usage.total_tokens
      } : undefined;

      console.log(`[ContentAnalyzer] GPT-4 analysis complete: ${analysisText.length} chars, ${tokenUsage?.totalTokens || 'unknown'} tokens`);

      // Step 6: Return AnalysisResult
      const result: AnalysisResult = {
        analysis: analysisText,
        transcript,
        profileUsed: profile,
        analyzedAt: new Date().toISOString(),
        tokenUsage
      };

      return result;

    } catch (error: any) {
      // Handle specific OpenAI errors
      if (error.status === 401) {
        throw new Error('Invalid OpenAI API key. Please check your API key in settings.');
      } else if (error.status === 429) {
        throw new Error('OpenAI API rate limit exceeded. Please try again in a moment.');
      } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        throw new Error('Network error - check your internet connection.');
      } else if (error.message?.includes('maximum context length')) {
        throw new Error('Transcript is too long for GPT-4 to process. Try analyzing a shorter clip.');
      } else {
        console.error('[ContentAnalyzer] Error during content analysis:', error);
        throw new Error(`Content analysis failed: ${error.message || 'Unknown error'}`);
      }
    }
  }
}

// Export singleton instance
export const contentAnalyzer = new ContentAnalyzer();
