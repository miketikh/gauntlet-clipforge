# AI Consultant - Track A Phase 5: Interactive Results Display

## Context

This is **Track A Phase 5** - building the analysis results display with MOCK DATA. This is the final frontend piece that completes the UI side of the AI Consultant feature.

When users analyze a video clip (Track B will handle the actual analysis), the results display shows:
- Natural language feedback about the video content
- Clickable timestamps in {{MM:SS}} format
- Loading states during analysis (mock for now)
- Scrollable results area with good readability

This phase builds all the UI for displaying analysis results and handling timestamp interactions. We'll use hardcoded mock analysis text with fake timestamps to test the functionality.

**Design Goal:**
Results display fits into the bottom section of the AI Assistant panel (the "Analysis Results" placeholder from Phase 1). It should feel like a conversation with the AI, with timestamps that jump the timeline to specific moments.

## Instructions for AI Agent

1. **Read Phase**: Read all files listed in each PR's tasks before making changes
2. **Implement**: Complete tasks in order, marking each with [x] when done
3. **Test**: Follow "What to Test" section after implementation
4. **Report**: Provide completion summary with what was built and any issues
5. **Wait**: Wait for approval before moving to next PR

---

## Phase 5: Interactive Results Display

**Estimated Time:** 4-5 hours

Build the analysis display component with timestamp parsing, clickable links, loading states, and timeline integration (mocked).

### PR 5.1: Timestamp Parser Utility

**Goal:** Create utility function to parse {{MM:SS}} timestamps from analysis text and prepare for rendering.

**Tasks:**
- [x] Read `src/renderer/store/playerStore.ts` to understand timeline/playhead patterns
- [x] Read `src/types/aiAssistant.ts` to see if we need new types
- [x] Create NEW: `src/renderer/utils/timestampParser.ts`:
  - Define `ParsedTimestamp` interface:
    - `id: string` - Unique identifier for this timestamp
    - `timestamp: number` - Time in seconds
    - `displayTime: string` - Formatted string (e.g., "01:30")
    - `startIndex: number` - Character position in original text
    - `endIndex: number` - Character position end
  - Define `ParsedTextSegment` interface:
    - `type: 'text' | 'timestamp'`
    - `content: string` - Text content or display time
    - `timestamp?: ParsedTimestamp` - If type is 'timestamp'
  - Create function `parseAnalysisText(text: string): ParsedTextSegment[]`:
    - Use regex to find all {{MM:SS}} or {{HH:MM:SS}} patterns
    - Extract timestamp values and convert to seconds
    - Split text into alternating text/timestamp segments
    - Return array of segments for rendering
  - Create function `formatTimestamp(seconds: number): string`:
    - Convert seconds to MM:SS or HH:MM:SS format
    - Handle edge cases (0 seconds, negative, very large numbers)
  - Create function `parseTimestamp(timeString: string): number`:
    - Parse "MM:SS" or "HH:MM:SS" format to seconds
    - Handle malformed input gracefully (return 0 or throw)
- [x] Add unit test examples as comments (no jest needed, just example inputs/outputs)

**What to Test:**
1. Build project - verify no compilation errors
2. Test parsing examples manually (add to component temporarily):
   - Input: "Great intro at {{01:30}} but the ending at {{05:45}} needs work"
   - Output: Array of 5 segments (text, timestamp, text, timestamp, text)
3. Test edge cases:
   - Empty string → empty array
   - No timestamps → single text segment
   - Adjacent timestamps → "{{01:00}}{{02:00}}" → 2 timestamp segments
4. Test formatTimestamp:
   - 90 seconds → "01:30"
   - 3661 seconds → "01:01:01"
   - 0 seconds → "00:00"

**Files Changed:**
- NEW: `src/renderer/utils/timestampParser.ts` - Timestamp parsing utilities

**Notes:**
- Use regex pattern: `/\{\{(\d{1,2}):(\d{2})(?::(\d{2}))?\}\}/g`
- Make sure to handle both MM:SS and HH:MM:SS formats
- Consider adding validation to ensure minutes/seconds are valid (< 60)
- Keep utility pure (no side effects, easy to test)

---

### PR 5.2: LoadingAnalysis Component

**Goal:** Create loading state component showing progress stages during analysis.

**Tasks:**
- [x] Read `src/renderer/components/RecordingProgress.tsx` for loading pattern reference
- [x] Read `src/renderer/store/aiAssistantStore.ts` to see what state we need
- [x] Update `src/types/aiAssistant.ts`:
  - Add `AnalysisStage` type: `'extracting' | 'transcribing' | 'analyzing' | 'complete' | null`
  - Add `AnalysisResult` interface:
    - `clipId: string`
    - `profileId: string`
    - `analyzedAt: Date`
    - `analysis: string` - Natural language text with {{timestamps}}
    - `transcript?: string` - Full transcript (optional for now)
- [x] Update `src/renderer/store/aiAssistantStore.ts`:
  - Add to state:
    - `isAnalyzing: boolean` (default false)
    - `analysisStage: AnalysisStage` (default null)
    - `currentAnalysis: AnalysisResult | null` (default null)
  - Add actions:
    - `startAnalysis: (clipId: string) => void` - Start mock analysis
    - `setAnalysisStage: (stage: AnalysisStage) => void`
    - `setAnalysisResult: (result: AnalysisResult) => void`
    - `clearAnalysis: () => void`
- [x] Create NEW: `src/renderer/components/LoadingAnalysis.tsx`:
  - Component reads `analysisStage` from store
  - Show spinner/loading animation (can use CSS animation or simple rotating icon)
  - Show stage-specific text:
    - 'extracting' → "Extracting audio from clip..."
    - 'transcribing' → "Transcribing with Whisper..."
    - 'analyzing' → "Analyzing content with AI..."
  - Add progress indicator (3 stages, show which is active)
  - Style with dark theme, centered content
  - Add subtle animations (fade in, pulse, etc.)
  - Estimated time display: "~30 seconds remaining" (hardcoded for now)

**What to Test:**
1. Build project - verify no compilation errors
2. Test component with different stages (manually set store state):
   - Stage 1: Shows "Extracting audio..."
   - Stage 2: Shows "Transcribing..."
   - Stage 3: Shows "Analyzing..."
3. Animations are smooth and not distracting
4. Component is centered and visually appealing
5. Progress indicator clearly shows current stage (e.g., 2/3)

**Files Changed:**
- `src/types/aiAssistant.ts` - Add analysis types
- `src/renderer/store/aiAssistantStore.ts` - Add analysis state and actions
- NEW: `src/renderer/components/LoadingAnalysis.tsx` - Loading state component

**Notes:**
- Keep animations subtle (avoid flashy or distracting effects)
- Consider using CSS keyframes for spinner rotation
- Progress indicator could be dots or bars (your choice)
- Make sure text is readable against dark background

---

### PR 5.3: AnalysisDisplay Component - Basic Rendering

**Goal:** Create component to display analysis text with parsed timestamps as clickable links.

**Tasks:**
- [x] Read `src/renderer/utils/timestampParser.ts` (just created)
- [x] Read `src/renderer/store/aiAssistantStore.ts` for analysis state
- [x] Create NEW: `src/renderer/components/AnalysisDisplay.tsx`:
  - Component reads `currentAnalysis` from store
  - If no analysis, show empty state:
    - Message: "Select a clip and click Analyze to get AI feedback"
    - Icon or placeholder graphic (optional)
  - If analysis exists:
    - Parse analysis text using `parseAnalysisText()`
    - Render segments as mix of text and clickable timestamp links
    - Timestamps styled as links:
      - Color: #3498db (blue)
      - Hover: underline + slightly brighter blue
      - Cursor: pointer
      - Font weight: 500 (medium)
    - Regular text: normal paragraph styling, line-height 1.6 for readability
  - Add "Copy Analysis" button at top-right (copies full text to clipboard)
  - Add "Re-analyze" button at bottom (clears current analysis, triggers re-run)
  - Make content scrollable with custom scrollbar styling

**What to Test:**
1. Build project - verify no compilation errors
2. Test with no analysis → shows empty state message
3. Test with mock analysis text:
   - Create mock AnalysisResult with hardcoded text containing {{01:30}}, {{02:45}} timestamps
   - Set in store: `setAnalysisResult(mockResult)`
   - Component renders text with blue clickable timestamps
4. Hover timestamps → underline appears
5. Click "Copy Analysis" → text copied to clipboard (check via paste)
6. Scrollbar appears if content is long

**Files Changed:**
- NEW: `src/renderer/components/AnalysisDisplay.tsx` - Analysis display component

**Notes:**
- Don't implement timestamp click handlers yet - that's PR 5.4
- Use `navigator.clipboard.writeText()` for copy functionality
- Consider using `white-space: pre-wrap` to preserve line breaks from AI
- Make sure long words don't break layout (word-wrap: break-word)
- Custom scrollbar: thin, dark themed, subtle

---

### PR 5.4: Timestamp Click Handler - Timeline Seeking

**Goal:** Make timestamp clicks seek the timeline to the correct position.

**Tasks:**
- [x] Read `src/renderer/store/playerStore.ts` to understand playhead control
- [x] Read `src/renderer/store/projectStore.ts` for clip/timeline access
- [x] Read `src/renderer/components/AnalysisDisplay.tsx` (just created)
- [x] Update `src/renderer/components/AnalysisDisplay.tsx`:
  - [x] Import `useProjectStore` and `usePlayerStore`
  - [x] Add click handler to timestamp links:
    - [x] Get clicked timestamp value (in seconds)
    - [x] Get current analysis `clipId` from `currentAnalysis`
    - [x] Find clip in timeline using `clipId`
    - [x] Calculate absolute timeline position: `clip.startTime + timestamp`
    - [x] Call `setPlayheadPosition(absolutePosition)` from projectStore
    - [x] Pause playback before seeking to prevent jarring behavior
  - [x] Add visual feedback on click:
    - [x] Brief highlight/flash animation on clicked timestamp (yellow glow for 300ms)
  - [x] Handle edge case: Timestamp beyond clip duration (clamp to clip end)
  - [x] Handle edge case: Clip not found (show alert with helpful message)

**What to Test:**
1. Build project - verify no compilation errors
2. Mock scenario:
   - Add a clip to timeline manually
   - Set mock analysis for that clip with timestamps
   - Click timestamp in analysis
   - Playhead moves to correct position in timeline (verify visually)
3. Click multiple timestamps → playhead jumps to each
4. Click timestamp beyond clip duration → playhead goes to clip end
5. Visual feedback shows on click (flash or message)
6. Test with clip at different timeline positions (not at 0:00)

**Files Changed:**
- `src/renderer/components/AnalysisDisplay.tsx` - Add timestamp click handler

**Notes:**
- Remember: timestamp is relative to clip start, must add clip.startTime
- If player is playing, might want to pause before seeking
- Consider debouncing rapid clicks (prevent timeline jumping too fast)
- Could add hover preview showing exact absolute time (e.g., "2:30 in timeline")

---

### PR 5.5: Mock Analysis Flow - "Analyze Clip" Button

**Goal:** Add "Analyze Clip" button that triggers mock analysis flow with loading states and displays fake results.

**Tasks:**
- [x] Read `src/renderer/components/AIAssistantPanel.tsx` to see panel structure
- [x] Read `src/renderer/store/projectStore.ts` for selected clip tracking
- [x] Read `src/renderer/store/aiAssistantStore.ts` for analysis actions
- [x] Update `src/renderer/store/aiAssistantStore.ts`:
  - Add action `analyzeMockClip: (clipId: string, profileId: string) => Promise<void>`:
    - Set `isAnalyzing: true`
    - Set `analysisStage: 'extracting'`
    - Wait 2 seconds (simulate)
    - Set `analysisStage: 'transcribing'`
    - Wait 3 seconds
    - Set `analysisStage: 'analyzing'`
    - Wait 2 seconds
    - Generate mock AnalysisResult:
      - Use hardcoded analysis text with multiple {{timestamps}}
      - Example: "Great opening at {{00:15}} where you introduce the topic. Around {{01:30}} the explanation becomes a bit technical - consider simplifying for your audience. The conclusion at {{04:45}} is strong and actionable."
    - Set `currentAnalysis` with mock result
    - Set `isAnalyzing: false`, `analysisStage: 'complete'`
- [x] Create NEW: `src/renderer/components/AnalyzeButton.tsx`:
  - Read `selectedClipId` from projectStore
  - Read `selectedProfileId` from aiAssistantStore
  - Button shows "Analyze Selected Clip 🚀"
  - Disabled states:
    - No clip selected → "No clip selected"
    - No profile selected → "Select a profile first"
    - Currently analyzing → Show loading spinner
  - On click: Call `analyzeMockClip(clipId, profileId)`
  - Style as primary action button (prominent, blue background)
- [x] Update `src/renderer/components/AIAssistantPanel.tsx`:
  - Import AnalyzeButton, LoadingAnalysis, AnalysisDisplay
  - Replace "Analyze Clip" placeholder section with AnalyzeButton
  - Replace "Analysis Results" placeholder section with:
    - Show LoadingAnalysis if `isAnalyzing === true`
    - Show AnalysisDisplay if `currentAnalysis !== null && !isAnalyzing`
    - Show empty state otherwise

**What to Test:**
1. Build project - verify no compilation errors
2. Full mock flow:
   - Select a clip on timeline (or add one)
   - Select a profile in ProfileManager
   - Click "Analyze Selected Clip"
   - Loading component appears with stages progressing
   - After ~7 seconds, analysis results appear
   - Timestamps in results are clickable
   - Click timestamp → timeline seeks
3. Test disabled states:
   - No clip selected → button disabled
   - No profile selected → button disabled
4. Click "Re-analyze" → clears results, can run again
5. Test with different profiles → analysis text is same (mock) but shows profile was selected

**Files Changed:**
- `src/renderer/store/aiAssistantStore.ts` - Add mock analysis action
- NEW: `src/renderer/components/AnalyzeButton.tsx` - Analyze button component
- `src/renderer/components/AIAssistantPanel.tsx` - Integrate all analysis components

**Notes:**
- Use `setTimeout()` for mock delays (Promise-based)
- Make sure loading states feel realistic (not too fast)
- Could add different mock analysis texts based on profile name (optional polish)
- Consider adding error state handling (try/catch in mock flow)

---

### PR 5.6: Polish and Edge Cases

**Goal:** Add final polish, handle edge cases, and ensure smooth UX throughout the analysis flow.

**Tasks:**
- [ ] Read all components created in Phase 5
- [ ] Add polish to `src/renderer/components/AnalysisDisplay.tsx`:
  - Add fade-in animation when analysis appears
  - Add loading skeleton while rendering long analysis (optional)
  - Add "Analyzed X minutes ago" timestamp at top
  - Format timestamp using relative time (e.g., "just now", "2 minutes ago")
  - Add profile name indicator: "Analyzed using: {profileName}"
- [ ] Add polish to `src/renderer/components/LoadingAnalysis.tsx`:
  - Add fade-in transition when loading starts
  - Add smooth stage transitions (not instant jumps)
  - Add cancel button: "Cancel Analysis" (sets isAnalyzing to false)
- [ ] Handle edge cases across all components:
  - What if clip is deleted while analyzing? (check clip still exists)
  - What if profile is deleted after analysis? (show "Unknown Profile")
  - What if analysis text has no timestamps? (still display normally)
  - What if user closes panel during analysis? (continue in background)
- [ ] Add keyboard shortcuts:
  - Escape key: Close/collapse AI panel
  - Cmd/Ctrl+K: Focus analyze button
  - Cmd/Ctrl+C: Copy analysis (when focused)
- [ ] Add tooltips to key UI elements:
  - Analyze button: "Analyze this clip's content against your profile"
  - Profile selector: "Choose an audience profile for analysis"
  - Timestamps: "Click to jump to this moment"
- [ ] Test full flow multiple times for smooth UX

**What to Test:**
1. Build project - verify no compilation errors
2. Full analysis flow feels polished:
   - Loading transitions are smooth
   - Results appear with nice animation
   - Timestamps clearly indicate they're clickable
3. Edge cases handled:
   - Delete clip during analysis → graceful handling
   - Delete profile after analysis → shows fallback
   - Close panel during analysis → analysis continues
4. Keyboard shortcuts work:
   - Esc closes panel
   - Cmd/Ctrl+K focuses analyze button
5. Tooltips appear on hover
6. Relative timestamps update correctly
7. Multiple analyses work sequentially (no state contamination)

**Files Changed:**
- `src/renderer/components/AnalysisDisplay.tsx` - Add polish and metadata
- `src/renderer/components/LoadingAnalysis.tsx` - Add cancel and transitions
- `src/renderer/components/AnalyzeButton.tsx` - Add tooltips and keyboard shortcuts
- `src/renderer/components/AIAssistantPanel.tsx` - Add keyboard event listeners

**Notes:**
- Use CSS transitions for smooth animations (avoid jank)
- Relative time can use simple logic (< 60s = "just now", < 3600s = "X minutes ago")
- Cancel button should be secondary styled (not as prominent as primary actions)
- Consider using `title` attribute for simple tooltips (no library needed)
- Make sure keyboard shortcuts don't conflict with existing app shortcuts

---

## Phase 5 Complete Checklist

When all PRs in Phase 5 are complete, verify:
- [ ] Can click "Analyze Selected Clip" button
- [ ] Loading component shows 3 stages with progress
- [ ] Analysis results display with readable formatting
- [ ] Timestamps in analysis are clickable and styled as links
- [ ] Clicking timestamp seeks timeline to correct position
- [ ] Can copy analysis to clipboard
- [ ] Can re-analyze clip (clears and runs again)
- [ ] All edge cases handled gracefully
- [ ] Keyboard shortcuts work
- [ ] Animations and transitions are smooth
- [ ] Empty states are clear and helpful
- [ ] No console errors during full flow
- [ ] Works with multiple clips and profiles

**Integration with Track B:**
When Track B implements the real backend (audio extraction, Whisper, GPT-4), they will:
1. Replace `analyzeMockClip()` with real IPC calls
2. Pass actual analysis text from GPT-4
3. Handle real loading states and errors
4. All UI components built here will work as-is with real data

**Track A is now complete!** All frontend components for AI Consultant are built and functional with mock data.
