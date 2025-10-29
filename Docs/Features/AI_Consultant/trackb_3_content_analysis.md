# AI Consultant - Track B3: Content Analysis (Phase 4)

**Track:** B (Backend/Main Process)
**Contains:** Phase 4 (GPT-4 Content Analysis)
**Previous Document:** [Track B2: Audio Transcription](./trackb_2_audio_transcription.md)
**Main Plan:** [AI Consultant Plan](./aiconsul_plan.md)

---

# AI Consultant Backend - Content Analysis Tasks

## Context

With transcription complete (Phase 3), we can now implement the final piece: GPT-4 content analysis. This phase takes the timestamped transcript + user profile and generates natural language feedback about the video content.

**The Analysis Flow:**
1. **Build prompt** combining profile context + timestamped transcript
2. **Call GPT-4** with instructions to reference specific moments using `{{MM:SS}}` format
3. **Return analysis** as natural language text with clickable timestamps
4. **Handle errors** gracefully (rate limits, network issues, etc.)

This completes Track B. After this phase:
- Track A can display analysis results in the UI panel
- Users can click timestamps to seek the timeline
- The full AI Consultant feature is functional

**Key Design Decisions:**
- Use GPT-4-turbo for larger context window (can handle long transcripts)
- Format timestamps as `{{MM:SS}}` in prompt instructions (makes parsing easy)
- Include profile's target audience and content guidelines in prompt
- Request conversational tone (not formal report)
- Emit progress events so Track A can show loading states

## Instructions for AI Agent

**Standard Workflow:**
1. Read all files mentioned in each PR before making changes
2. Implement tasks in order (top to bottom within each PR)
3. Mark tasks complete with `[x]` after verification
4. Test with console.log after each PR
5. Provide completion summary before moving to next PR
6. Wait for approval before starting next PR

**Critical Guidelines:**
- Test via IPC calls from DevTools console
- Log analysis results to console for verification
- Prompt engineering is critical - iterate if results are poor
- Handle rate limits gracefully (429 errors from OpenAI)
- Consider token limits (GPT-4-turbo has 128k context, but responses are limited)

---

## Phase 4: GPT-4 Content Analysis

**Estimated Time:** 3-4 hours

### PR 4.1: Create Prompt Builder Service

**Goal:** Build prompts that combine user profile + transcript for GPT-4 analysis

**Tasks:**
- [x] Read `/Users/Gauntlet/gauntlet/videojarvis/src/types/ai.ts` for UserProfile and Transcript types
- [x] Create NEW: `/Users/Gauntlet/gauntlet/videojarvis/src/main/services/PromptBuilder.ts` with:
  - Import `UserProfile, Transcript, TranscriptSegment` from '../../types/ai'
  - Create class `PromptBuilder` with methods:
    - `formatTimestamp(seconds: number): string` - Convert seconds to MM:SS format
      - Examples: 65 → "01:05", 130 → "02:10", 3665 → "61:05"
      - Pad minutes and seconds with leading zeros
    - `formatTranscriptWithTimestamps(transcript: Transcript): string` - Format transcript for prompt
      - For each segment, output: `[MM:SS] text`
      - Example:
        ```
        [00:00] Hello everyone, welcome to this tutorial
        [00:05] Today we're going to learn about React hooks
        [00:12] Let's start with useState
        ```
      - Join all segments with newlines
      - Return formatted string
    - `buildAnalysisPrompt(profile: UserProfile, transcript: Transcript): string` - Create full prompt
      - Structure prompt with sections:
        1. **Context**: "You are an expert content consultant analyzing video content."
        2. **Target Audience**: Include profile.targetAudience
        3. **Content Guidelines**: Include profile.contentGuidelines
        4. **Instructions**:
           - Analyze the transcript for effectiveness with this audience
           - Reference specific moments using `{{MM:SS}}` format (e.g., "At {{01:23}} you mention...")
           - Cover: what works well, potential issues, specific suggestions, overall assessment
           - Be conversational and helpful (not formal report style)
        5. **Transcript**: Include formatted transcript with timestamps
        6. **Request**: "Please provide your analysis:"
      - Return complete prompt string
      - Log prompt character count for debugging
  - Export singleton instance: `export const promptBuilder = new PromptBuilder();`

**What to Test:**
1. Test `formatTimestamp()`:
   - `formatTimestamp(0)` → "00:00"
   - `formatTimestamp(65)` → "01:05"
   - `formatTimestamp(3665)` → "61:05"
2. Create sample transcript with 3-4 segments
3. Test `formatTranscriptWithTimestamps(transcript)` - verify format is `[MM:SS] text`
4. Create sample profile (Tech Tutorial audience)
5. Test `buildAnalysisPrompt(profile, transcript)` - log full prompt
6. Verify prompt includes audience, guidelines, formatted transcript
7. Verify instructions mention using `{{MM:SS}}` format
8. Check prompt length - aim for < 50k characters (well under GPT-4 limits)

**Files Changed:**
- NEW: `/Users/Gauntlet/gauntlet/videojarvis/src/main/services/PromptBuilder.ts` - Formats prompts for GPT-4

**Notes:**
- Prompt engineering is critical - iterate on the instructions section if results are poor
- Clear timestamp format (`{{MM:SS}}`) makes parsing easy in Track A
- Conversational tone makes analysis more actionable than formal reports
- Could add more sophisticated formatting (markdown, bullet points) later

---

### PR 4.2: Create Content Analysis Service

**Goal:** Send prompts to GPT-4 and get content analysis responses

**Tasks:**
- [x] Read `/Users/Gauntlet/gauntlet/videojarvis/src/main/services/PromptBuilder.ts` (just created)
- [x] Read `/Users/Gauntlet/gauntlet/videojarvis/src/main/services/ApiKeyStorage.ts` for API key access
- [x] Update `/Users/Gauntlet/gauntlet/videojarvis/src/types/ai.ts`:
  - Add interface:
    ```typescript
    export interface AnalysisResult {
      analysis: string;           // GPT-4 response with {{MM:SS}} markers
      transcript: Transcript;     // Original transcript for reference
      profileUsed: UserProfile;   // Which profile was used
      analyzedAt: string;         // ISO timestamp
      tokenUsage?: {              // Optional API cost tracking
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
      };
    }
    ```
- [x] Create NEW: `/Users/Gauntlet/gauntlet/videojarvis/src/main/services/ContentAnalyzer.ts` with:
  - Import `OpenAI` from 'openai'
  - Import `apiKeyStorage` from './ApiKeyStorage'
  - Import `promptBuilder` from './PromptBuilder'
  - Import `UserProfile, Transcript, AnalysisResult` from '../../types/ai'
  - Create class `ContentAnalyzer` with method:
    - `analyzeContent(profile: UserProfile, transcript: Transcript): Promise<AnalysisResult>` - Call GPT-4
      - Get API key: `const apiKey = await apiKeyStorage.getApiKey()`
      - Throw error if no key: "OpenAI API key not configured"
      - Initialize OpenAI client: `new OpenAI({ apiKey })`
      - Build prompt: `promptBuilder.buildAnalysisPrompt(profile, transcript)`
      - Log: "Sending transcript to GPT-4 for analysis..."
      - Log: "Prompt length: {prompt.length} characters"
      - Call GPT-4 API:
        - Model: 'gpt-4-turbo-preview' or 'gpt-4-0125-preview' (latest turbo model)
        - Messages: `[{ role: 'user', content: prompt }]`
        - Temperature: 0.7 (balanced creativity/consistency)
        - Max tokens: 2000 (enough for detailed analysis)
      - Extract response:
        - Analysis text from response.choices[0].message.content
        - Token usage from response.usage
      - Log: "GPT-4 analysis complete: {analysis.length} chars, {tokenUsage.totalTokens} tokens"
      - Return AnalysisResult object with:
        - analysis (the GPT-4 response)
        - transcript (original)
        - profileUsed (for reference)
        - analyzedAt (current timestamp)
        - tokenUsage (for cost tracking)
      - Handle errors:
        - Invalid API key (401)
        - Rate limit exceeded (429)
        - Network errors
        - Context too long (though 128k should be plenty)
  - Export singleton instance: `export const contentAnalyzer = new ContentAnalyzer();`

**What to Test:**
1. Get API key configured (from Phase 1)
2. Create sample profile (Tech Tutorial)
3. Create or use real transcript (from Phase 3)
4. Call: `const result = await contentAnalyzer.analyzeContent(profile, transcript)`
5. Wait 5-15 seconds (GPT-4 is slower than Whisper)
6. Log `result.analysis` to console
7. Verify analysis mentions specific moments (look for {{MM:SS}} patterns)
8. Verify analysis is relevant to profile's audience and guidelines
9. Test error: Remove API key - verify "No API key" error
10. Test error: Use invalid key - verify "Invalid API key" error

**Files Changed:**
- `/Users/Gauntlet/gauntlet/videojarvis/src/types/ai.ts` - Add AnalysisResult interface
- NEW: `/Users/Gauntlet/gauntlet/videojarvis/src/main/services/ContentAnalyzer.ts` - GPT-4 API integration

**Notes:**
- GPT-4-turbo is significantly cheaper than GPT-4 (~10x cheaper)
- Typical 5-minute video: ~2000 input tokens + ~500 output = ~$0.025
- Temperature 0.7 balances consistency with natural language variety
- Max tokens 2000 allows detailed analysis without excessive cost
- Could add streaming for real-time display (future enhancement)

---

### PR 4.3: Integrate Full Analysis Pipeline

**Goal:** Combine extraction → transcription → analysis into single end-to-end flow

**Tasks:**
- [x] Read `/Users/Gauntlet/gauntlet/videojarvis/src/main/services/VideoAnalysisService.ts` (from Phase 3)
- [x] Read `/Users/Gauntlet/gauntlet/videojarvis/src/main/services/ContentAnalyzer.ts` (just created)
- [x] Update `/Users/Gauntlet/gauntlet/videojarvis/src/main/services/VideoAnalysisService.ts`:
  - Import `contentAnalyzer` from './ContentAnalyzer'
  - Import `UserProfile, AnalysisResult` from '../../types/ai'
  - Add new method:
    - `analyzeVideoContent(videoPath: string, profile: UserProfile, startTime?: number, endTime?: number): Promise<AnalysisResult>` - Full pipeline
      - Log: "Starting full video analysis pipeline: {videoPath}"
      - **Step 1: Transcribe video**
        - Call existing `this.transcribeVideo(videoPath, startTime, endTime)`
        - Store transcript result
        - Log: "Transcription complete: {transcript.segments.length} segments"
      - **Step 2: Analyze content**
        - Call `contentAnalyzer.analyzeContent(profile, transcript)`
        - Store analysis result
        - Log: "Content analysis complete: {result.analysis.length} chars"
      - **Step 3: Return result**
        - Return complete AnalysisResult
      - Handle all errors with descriptive messages
      - Log total pipeline time at end

**What to Test:**
1. Ensure API key is configured
2. Create a profile: `{ name: 'Test', targetAudience: 'Developers', contentGuidelines: 'Technical but clear' }`
3. Get path to video with clear speech
4. Call: `const result = await videoAnalysisService.analyzeVideoContent(videoPath, profile)`
5. Wait 15-45 seconds (depends on video length)
6. Log `result.analysis` - verify contains feedback about the video
7. Look for `{{MM:SS}}` patterns in analysis
8. Verify analysis references specific moments from transcript
9. Verify analysis tone matches profile guidelines
10. Test with different profile - verify analysis changes accordingly

**Files Changed:**
- `/Users/Gauntlet/gauntlet/videojarvis/src/main/services/VideoAnalysisService.ts` - Add full analysis pipeline method

**Notes:**
- This orchestrates all three services: AudioExtractor → TranscriptionService → ContentAnalyzer
- Total time: 15-45 seconds for typical 5-minute video
  - Audio extraction: 1-3 seconds
  - Transcription: 10-30 seconds
  - Analysis: 5-15 seconds
- Consider adding progress callbacks in future (emit events at each stage)

---

### PR 4.4: Add Analysis IPC Handler with Progress Events

**Goal:** Expose full analysis to renderer with progress updates

**Tasks:**
- [x] Read `/Users/Gauntlet/gauntlet/videojarvis/src/main/services/VideoAnalysisService.ts` (just updated)
- [x] Read `/Users/Gauntlet/gauntlet/videojarvis/src/main/ipc/handlers.ts` for patterns
- [x] Update `/Users/Gauntlet/gauntlet/videojarvis/src/main/ipc/handlers.ts`:
  - Import `videoAnalysisService` from '../services/VideoAnalysisService'
  - Import `AnalysisResult` from '../../types/ai'
  - Add handler `ai:analyze-clip`:
    - Receives parameters:
      ```typescript
      {
        videoPath: string;
        profile: UserProfile;
        startTime?: number;
        endTime?: number;
      }
      ```
    - Validate videoPath and profile are provided
    - Log: "IPC: Starting full video analysis for {videoPath}"
    - **Send progress updates** (use mainWindow.webContents.send):
      - Before transcription: `mainWindow.webContents.send('ai:analysis-progress', { stage: 'extracting', message: 'Extracting audio...' })`
      - Before GPT-4: `mainWindow.webContents.send('ai:analysis-progress', { stage: 'analyzing', message: 'Analyzing content with AI...' })`
    - Call `videoAnalysisService.analyzeVideoContent(videoPath, profile, startTime, endTime)`
    - Log: "IPC: Analysis complete - {result.analysis.length} chars"
    - Return analysis result
    - Handle errors with descriptive messages:
      - "No API key configured"
      - "Video file not found"
      - "Audio file too large (max 25MB)"
      - "OpenAI API rate limit exceeded - try again in a moment"
      - "Network error - check connection"
      - "Invalid API key"
  - Note: Will need mainWindow reference (already passed to registerIpcHandlers)

**What to Test:**
1. Open DevTools console
2. Create profile object in console
3. Get video path from media library
4. Set up progress listener (in console):
   ```javascript
   window.ipcRenderer.on('ai:analysis-progress', (event, data) => {
     console.log('Progress:', data.stage, data.message);
   });
   ```
5. Call: `await window.ipcRenderer.invoke('ai:analyze-clip', { videoPath, profile })`
6. Verify progress updates appear in console:
   - "extracting" - Extracting audio...
   - "analyzing" - Analyzing content with AI...
7. Verify result contains analysis with {{MM:SS}} markers
8. Test error cases: no API key, invalid path, etc.

**Files Changed:**
- `/Users/Gauntlet/gauntlet/videojarvis/src/main/ipc/handlers.ts` - Add ai:analyze-clip handler with progress events

**Notes:**
- Progress events are sent via mainWindow.webContents.send (one-way, renderer listens)
- Track A will listen for these events to update loading UI
- Could add more granular progress (percentage) in future
- Missing a "transcribing" progress event - could add between extracting and analyzing

---

### PR 4.5: Update Preload to Expose Analysis API

**Goal:** Add analyze method and progress listener to window.ai API

**Tasks:**
- [x] Read `/Users/Gauntlet/gauntlet/videojarvis/src/preload.ts` (updated in Phase 3)
- [x] Read `/Users/Gauntlet/gauntlet/videojarvis/src/types/window.d.ts` for current declarations
- [x] Update `/Users/Gauntlet/gauntlet/videojarvis/src/preload.ts`:
  - Add to `window.ai` object:
    ```typescript
    analyzeClip: (params: {
      videoPath: string;
      profile: any;  // UserProfile
      startTime?: number;
      endTime?: number;
    }) => ipcRenderer.invoke('ai:analyze-clip', params),

    onAnalysisProgress: (callback: (data: { stage: string; message: string }) => void) => {
      ipcRenderer.on('ai:analysis-progress', (event, data) => callback(data));
    },

    offAnalysisProgress: (callback: Function) => {
      ipcRenderer.removeListener('ai:analysis-progress', callback as any);
    }
    ```
- [x] Update `/Users/Gauntlet/gauntlet/videojarvis/src/types/window.d.ts`:
  - Import `AnalysisResult` from './ai'
  - Add to Window.ai interface:
    ```typescript
    analyzeClip: (params: {
      videoPath: string;
      profile: UserProfile;
      startTime?: number;
      endTime?: number;
    }) => Promise<AnalysisResult>;

    onAnalysisProgress: (callback: (data: { stage: string; message: string }) => void) => void;
    offAnalysisProgress: (callback: Function) => void;
    ```

**What to Test:**
1. Build project: `npm start`
2. Open DevTools console
3. Set up progress listener:
   ```javascript
   window.ai.onAnalysisProgress((data) => {
     console.log('Progress:', data.stage, data.message);
   });
   ```
4. Call: `await window.ai.analyzeClip({ videoPath, profile })`
5. Verify TypeScript autocomplete works
6. Verify progress updates appear
7. Verify result is properly typed (result.analysis, result.transcript, etc.)
8. Test cleanup: Define callback function, call offAnalysisProgress(callback)

**Files Changed:**
- `/Users/Gauntlet/gauntlet/videojarvis/src/preload.ts` - Add analyzeClip + progress listeners to window.ai
- `/Users/Gauntlet/gauntlet/videojarvis/src/types/window.d.ts` - Add TypeScript declarations

**Notes:**
- Track A will use `window.ai.analyzeClip()` when user clicks "Analyze Clip" button
- Progress callbacks enable loading states in UI
- Could add error events too (ai:analysis-error) for better error handling
- Consider adding a cancel mechanism in future (abort analysis mid-process)

---

## Completion Checklist

**Phase 4 Complete When:**
- ✓ Prompts combine user profile + timestamped transcript
- ✓ GPT-4 analyzes content and returns feedback
- ✓ Analysis includes `{{MM:SS}}` timestamp references
- ✓ Full pipeline (extract → transcribe → analyze) works end-to-end
- ✓ Progress events emitted at each stage
- ✓ IPC handler callable from DevTools console
- ✓ window.ai.analyzeClip() is typed and accessible
- ✓ Error cases handled: no key, rate limits, network errors
- ✓ Analysis results log to console for verification

**Full Integration Test (Track B Complete):**
1. Configure API key: `await window.ai.saveApiKey('sk-...')`
2. Create profile: `const profile = await window.ai.saveProfile({ name: 'Test', targetAudience: 'Developers', contentGuidelines: 'Be clear' })`
3. Import video with clear speech (tutorial, presentation, etc.)
4. Set progress listener: `window.ai.onAnalysisProgress(data => console.log(data.stage))`
5. Analyze: `const result = await window.ai.analyzeClip({ videoPath, profile })`
6. Wait 15-45 seconds (watch progress updates)
7. Log `result.analysis` - verify contains feedback with {{MM:SS}} timestamps
8. Verify feedback is relevant to profile's audience/guidelines
9. Test with different profile - verify analysis changes
10. Test with different video - verify analysis is specific to content

**Track B Complete Summary:**
All backend services are now complete:
- ✓ API key storage (secure, encrypted)
- ✓ Profile storage (persistent JSON)
- ✓ Audio extraction (FFmpeg)
- ✓ Transcription (Whisper API)
- ✓ Content analysis (GPT-4)
- ✓ Full analysis pipeline
- ✓ IPC handlers for all operations
- ✓ Typed window.ai API for renderer access
- ✓ Progress events for UI feedback
- ✓ Error handling for all failure modes

Track A can now build the full UI experience:
- Settings panel for API key configuration
- Profile manager for creating/editing profiles
- Analysis panel with loading states
- Display analysis with clickable timestamps
- Timeline seeking on timestamp clicks

---

## Performance & Cost Summary

**Typical 5-Minute Video Analysis:**
- **Time Breakdown:**
  - Audio extraction: 1-3 seconds
  - Whisper transcription: 10-30 seconds
  - GPT-4 analysis: 5-15 seconds
  - **Total: 15-45 seconds**

- **Cost Breakdown (User's API key):**
  - Whisper: ~$0.03 (at $0.006/minute)
  - GPT-4-turbo: ~$0.025 (2000 input + 500 output tokens)
  - **Total: ~$0.055 per analysis**

**Optimization Opportunities (Future):**
- Cache transcripts (avoid re-transcribing same video)
- Batch multiple clips (analyze together for context)
- Use GPT-4o-mini for faster/cheaper analysis (trade-off with quality)
- Stream GPT-4 responses (show partial analysis in real-time)
- Parallel processing (if analyzing multiple clips)

---

## Next Steps

**For Track A:**
Now ready to build full UI experience:
1. Phase 1: API key settings UI
2. Phase 2: Profile manager UI
3. Phase 5: Analysis display with clickable timestamps
4. Integration: Wire up "Analyze Clip" button flow

**For Testing:**
Once Track A is complete, test full user journey:
1. New user enters API key
2. Creates 2-3 profiles for different content types
3. Imports video and adds to timeline
4. Selects clip, chooses profile, clicks "Analyze"
5. Watches progress updates
6. Reads analysis with helpful feedback
7. Clicks timestamps to seek timeline
8. Re-analyzes with different profile

**For Production (Post-MVP):**
- Add analysis history (save past analyses)
- Export analysis as text/PDF
- Show transcript alongside analysis
- Add retry logic for failed API calls
- Implement rate limit backoff strategies
- Add usage/cost tracking dashboard
- Consider adding Claude/Gemini as alternatives to OpenAI
