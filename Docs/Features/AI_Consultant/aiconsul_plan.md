# AI Consultant Feature Plan

## Overview

The AI Consultant is an intelligent content analysis assistant built directly into the video editor. It allows users to analyze their video clips using OpenAI's Whisper (for transcription) and GPT-4 (for content analysis) to get personalized feedback based on custom audience profiles.

**Key Value Proposition:**
- Analyze video content against specific audience profiles
- Get natural language feedback with clickable timestamps
- Make informed editing decisions based on AI insights
- No backend required - runs entirely from Electron main process

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Renderer (React)                      │
│  ┌────────────┐  ┌────────────────┐  ┌──────────────────┐  │
│  │  Preview   │  │  AI Assistant  │  │    Timeline      │  │
│  │            │  │  Panel (New)   │  │                  │  │
│  │            │  │  - Profiles    │  │  [Selected Clip] │  │
│  │            │  │  - Analysis    │  │                  │  │
│  └────────────┘  └────────────────┘  └──────────────────┘  │
└─────────────────────────────┬───────────────────────────────┘
                              │ IPC
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Main Process (Node.js)                     │
│  ┌────────────┐  ┌────────────┐  ┌────────────────────┐    │
│  │  FFmpeg    │→ │  Whisper   │→ │  GPT-4 Analysis    │    │
│  │  Extract   │  │  API       │  │  with Profile      │    │
│  └────────────┘  └────────────┘  └────────────────────┘    │
└─────────────────────────────┬───────────────────────────────┘
                              │ HTTPS
                              ▼
                        OpenAI API
```

## UI/UX Design

### Collapsible Side Panel

**Location:** Right side of the Preview component

**Behavior:**
- Collapsed: Shows robot icon (🤖), fixed narrow width (~50px)
- Expanded: Shows full panel with "AI Assistant" header, variable width (300-500px)
- When expanding, Preview component shrinks horizontally to accommodate
- Panel extends vertically from below Header to above Timeline

**Layout Structure:**
```
┌─────────────────────────────────────────────────────────────┐
│                          Header                              │
├──────────────────────────┬──────────────────────────────────┤
│                          │  AI Assistant           [×]      │
│                          ├──────────────────────────────────┤
│                          │  Profile Management              │
│       Preview            │  ┌────────────────────────────┐  │
│    (shrinks when         │  │ Profile Name: ____________ │  │
│     panel opens)         │  │                            │  │
│                          │  │ Target Audience:           │  │
│                          │  │ [Free-form textarea]       │  │
│                          │  │                            │  │
│                          │  │ Content Guidelines:        │  │
│                          │  │ [Free-form textarea]       │  │
│                          │  └────────────────────────────┘  │
│                          │  [Save Profile] [Use Profile ▼] │
│                          │                                  │
│                          │  ────────────────────────────    │
│                          │                                  │
│                          │  Analyze Clip                    │
│                          │  [Analyze Selected Clip 🚀]      │
│                          │                                  │
│                          │  ────────────────────────────    │
│                          │                                  │
│                          │  Analysis Results                │
│                          │  [Scrollable analysis area]      │
├──────────────────────────┴──────────────────────────────────┤
│                         Timeline                             │
└──────────────────────────────────────────────────────────────┘
```

### Panel States

1. **Collapsed:**
   - Width: ~50px
   - Shows: Robot icon 🤖
   - Hover: Show tooltip "AI Assistant"
   - Click: Expand panel

2. **Expanded (Idle):**
   - Width: ~350px (adjustable via drag handle)
   - Shows: Profile management + Analyze button
   - "Analyze Selected Clip" button disabled if no clip selected

3. **Expanded (Analyzing):**
   - Shows: Loading spinner + progress text
   - Progress stages:
     - "Extracting audio..."
     - "Transcribing with Whisper..."
     - "Analyzing content with AI..."
   - Disable all controls during analysis

4. **Expanded (Results):**
   - Shows: Analysis results with clickable timestamps
   - Scroll to view full analysis
   - "Re-analyze" button available

## Profile System

### Profile Data Structure

```typescript
interface UserProfile {
  id: string;
  name: string;
  targetAudience: string;      // Free-form text
  contentGuidelines: string;    // Free-form text
  createdAt: Date;
  updatedAt: Date;
}
```

### Profile Management

**Add Profile:**
- Two free-form text fields for flexible user input
- **Target Audience** - Describe who will watch this content
- **Content Guidelines** - What tone, style, topics to focus on or avoid
- Click "Save Profile" → Stores in local JSON file in userData directory
- Profile added to dropdown for future use

**Use Profile:**
- Dropdown shows all saved profiles by name
- Select profile → Loads profile data into fields
- Can edit and update existing profiles
- Can delete profiles

**Storage:**
- Location: `{app.getPath('userData')}/ai-profiles.json`
- Simple JSON file with array of profiles
- Load on app startup, persist on changes

### Example Profiles

**Tech Tutorial Profile:**
```
Name: Tech Tutorial
Target Audience: Beginner developers learning web development
Content Guidelines: Use simple analogies. Avoid assuming prior knowledge. Be encouraging and patient. Break down complex concepts.
```

**Marketing Video Profile:**
```
Name: Marketing Video
Target Audience: Small business owners, age 35-55, looking for growth strategies
Content Guidelines: Professional but approachable. Focus on ROI and practical benefits. Use success stories. Avoid technical jargon.
```

## Analysis Flow

### Step-by-Step Process

1. **User Selects Clip on Timeline**
   - Clip becomes active/highlighted in timeline
   - "Analyze Selected Clip" button becomes enabled in AI panel

2. **User Clicks "Analyze Selected Clip"**
   - Panel enters loading state with progress indicator
   - IPC call to main process with clip metadata and selected profile

3. **Main Process: Extract Audio**
   - Use FFmpeg to extract audio track from video file
   - Output as temporary MP3 file in system temp directory
   - Handle clips that may not have audio (error case)

4. **Main Process: Transcribe with Whisper**
   - Send audio file to OpenAI Whisper API
   - Use `response_format: "verbose_json"` to get timestamps
   - Use `timestamp_granularities: ["segment"]` for segment-level timing
   - Receive full text transcript plus array of timed segments

5. **Main Process: Analyze with GPT-4**
   - Build prompt combining:
     - User's target audience from profile
     - User's content guidelines from profile
     - Full transcript with timestamps formatted as `[MM:SS] text`
   - Instruct GPT-4 to reference specific moments using `{{MM:SS}}` format
   - Request natural language analysis covering strengths, concerns, suggestions
   - Use GPT-4-turbo model for larger context window

6. **Return Results to Renderer**
   - Send analysis text back via IPC
   - Also send full transcript for potential display
   - Update panel to show results state

### Analysis Prompt Strategy

The prompt should:
- Provide the target audience context upfront
- Include the content guidelines the user specified
- Present the timestamped transcript clearly
- Instruct GPT-4 to use `{{MM:SS}}` format when referencing specific moments
- Ask for conversational, helpful tone rather than formal report
- Request coverage of: what works well, potential issues, specific suggestions, overall assessment

Example output we want from GPT-4:
```
I loved the opening hook at {{00:15}} where you grabbed attention with that question.
However, around {{01:30}} the explanation might be too technical for your target audience
of beginner developers. Consider using a simpler analogy here...
```

## Technical Implementation

### Component Structure

**New Components to Create:**

1. **`AIAssistantPanel.tsx`** - Main collapsible panel container
2. **`ProfileManager.tsx`** - Profile creation/selection UI section
3. **`AnalysisDisplay.tsx`** - Display analysis results with clickable timestamps
4. **`LoadingAnalysis.tsx`** - Progress indicator during analysis stages

**Components to Modify:**

1. **`Layout.tsx`** - Add AI panel to grid layout, adjust Preview width dynamically
2. **`Timeline.tsx`** - Add clip selection tracking, expose selected clip to global state
3. **`Header.tsx`** - Possibly add "Settings" or "AI" menu for API key configuration

### State Management

**New Global State (use Context or Zustand):**

```typescript
interface AIAssistantState {
  // Panel state
  isPanelOpen: boolean;
  panelWidth: number;

  // Profile state
  profiles: UserProfile[];
  selectedProfile: UserProfile | null;

  // Analysis state
  isAnalyzing: boolean;
  analysisStage: 'extracting' | 'transcribing' | 'analyzing' | null;
  currentAnalysis: AnalysisResult | null;

  // Actions
  togglePanel: () => void;
  setPanelWidth: (width: number) => void;
  saveProfile: (profile: UserProfile) => void;
  selectProfile: (id: string) => void;
  deleteProfile: (id: string) => void;
  analyzeClip: (clipId: string) => Promise<void>;
}
```

### IPC Communication

**Channels to Implement:**

Renderer → Main:
- `ai:save-api-key` - Store API key securely
- `ai:get-api-key` - Retrieve stored API key (returns boolean for existence check)
- `ai:save-profile` - Save new or updated profile
- `ai:get-profiles` - Load all profiles
- `ai:delete-profile` - Remove profile by ID
- `ai:analyze-clip` - Start analysis process

Main → Renderer:
- `ai:analysis-progress` - Send progress updates during analysis
- `ai:analysis-complete` - Send final results
- `ai:analysis-error` - Send error information

**Types for IPC:**

```typescript
interface AnalyzeClipParams {
  clipPath: string;
  profile: UserProfile;
  startTime?: number;    // If clip is trimmed
  endTime?: number;      // If clip is trimmed
}

interface AnalysisResult {
  success: boolean;
  analysis?: string;
  transcript?: {
    fullText: string;
    segments: TranscriptSegment[];
  };
  error?: string;
}

interface TranscriptSegment {
  start: number;      // Seconds
  end: number;        // Seconds
  text: string;
}
```

### Data Models

```typescript
interface AnalysisResult {
  clipId: string;
  profileId: string;
  analyzedAt: Date;
  transcript: {
    fullText: string;
    segments: TranscriptSegment[];
  };
  analysis: string;         // Natural language with {{timestamp}} markers
  rawAnalysis: string;      // Unparsed GPT-4 response
}

interface TimestampReference {
  id: string;
  timestamp: number;        // Seconds from clip start
  displayTime: string;      // "MM:SS" format
  context: string;          // Surrounding text for tooltip
  position: number;         // Character position in analysis text
}
```

### Clickable Timestamps

**Parsing Strategy:**
- Look for pattern `{{MM:SS}}` in analysis text
- Extract timestamp, convert to seconds
- Split analysis text around timestamps
- Render text parts with clickable links between them

**Interaction:**
- Click timestamp → Seek timeline to that position
- Optionally highlight region on timeline for visual feedback
- Ensure clip's start time is added to relative timestamp

## API Key Management

### Storage Approach

**Use Electron's `safeStorage` API:**
- Encrypts sensitive data using OS-level encryption
- On macOS: Uses Keychain
- On Windows: Uses DPAPI
- On Linux: Uses Secret Service API or libsecret

**Files to Modify:**
- `src/main.ts` - Add IPC handlers for key storage/retrieval
- Create new file: `src/services/apiKeyStorage.ts` - Encapsulate storage logic

### Settings UI

**Location Options:**
1. Section in AI Assistant panel itself (simpler)
2. Separate Settings modal accessible from Header menu

**UI Flow:**
1. On first use of AI features, detect no API key
2. Show prompt: "OpenAI API Key Required"
3. Input field for key (password type for security)
4. Link/button: "Get API key from OpenAI" (opens browser)
5. "Test Connection" button - Verify key works with simple API call
6. "Save" button - Store encrypted
7. After save, show status: "✓ API Key configured"
8. Allow editing/removing key later

### Error Handling

**Error States to Handle:**

- **No API key** - Show setup prompt, disable analyze button
- **Invalid API key** - Show error message with option to re-enter
- **Rate limit exceeded** - Show message with retry time estimate
- **Network error** - Check connection, suggest retry
- **No audio in clip** - Detect and inform user clearly
- **File too large** - Whisper has 25MB limit, inform user
- **API timeout** - Handle gracefully with retry option

## Implementation Phases

### Phase 1: Foundation (Core Infrastructure)

**Goal:** Get basic panel and API integration working

**Tasks:**
- Create AIAssistantPanel component with collapse/expand
- Update Layout.tsx to include panel and handle width changes
- Set up API key storage using Electron safeStorage
- Create settings UI for API key entry
- Install OpenAI SDK: `npm install openai`
- Test basic OpenAI API call from main process

**Files to Create/Modify:**
- Create: `src/renderer/components/AIAssistantPanel.tsx`
- Create: `src/services/apiKeyStorage.ts`
- Modify: `src/renderer/components/Layout.tsx`
- Modify: `src/main.ts` (IPC handlers)
- Modify: `src/preload.ts` (expose API)

**Testing:**
- Panel opens and closes smoothly
- Preview resizes correctly when panel opens
- API key saves and loads across app restarts
- Can make test call to OpenAI (e.g., simple GPT-4 completion)

### Phase 2: Profile System

**Goal:** Users can create, save, and manage content profiles

**Tasks:**
- Create ProfileManager component with form fields
- Implement profile storage as JSON file
- Add CRUD operations via IPC
- Create profile dropdown/selector
- Handle profile state in React

**Files to Create/Modify:**
- Create: `src/renderer/components/ProfileManager.tsx`
- Create: `src/services/profileStorage.ts`
- Modify: `src/main.ts` (profile IPC handlers)
- Create: State management for profiles (Context or Zustand store)

**Testing:**
- Can create new profile with free-form text
- Profiles persist to file and reload on app start
- Can switch between multiple profiles
- Can edit existing profile
- Can delete profile

### Phase 3: Audio Extraction & Transcription

**Goal:** Extract audio from video clips and get timestamped transcripts

**Tasks:**
- Implement FFmpeg audio extraction in main process
- Create temporary file handling (cleanup after use)
- Integrate OpenAI Whisper API
- Handle progress updates back to renderer
- Store transcript data with segments

**Files to Create/Modify:**
- Create: `src/services/audioExtractor.ts`
- Create: `src/services/transcriptionService.ts`
- Modify: `src/main.ts` (analysis workflow)
- Create: `src/renderer/components/LoadingAnalysis.tsx`

**Testing:**
- Audio correctly extracts from video files
- Temporary files created and cleaned up properly
- Whisper returns accurate transcription
- Timestamps align with video content
- Progress updates show in UI correctly
- Handle videos with no audio track

### Phase 4: Content Analysis

**Goal:** Send transcript to GPT-4 and get analysis

**Tasks:**
- Build prompt template system
- Combine profile + transcript into analysis prompt
- Call GPT-4 API with proper parameters
- Handle response and extract analysis text
- Return to renderer for display

**Files to Create/Modify:**
- Create: `src/services/contentAnalyzer.ts`
- Create: `src/services/promptBuilder.ts`
- Modify: `src/main.ts` (complete analysis flow)

**Testing:**
- GPT-4 returns relevant, useful analysis
- Analysis references specific moments in video
- Timestamps appear in `{{MM:SS}}` format
- Analysis tone matches expected style
- Different profiles produce different analyses

### Phase 5: Interactive Results

**Goal:** Display analysis with clickable timestamps that control timeline

**Tasks:**
- Create AnalysisDisplay component
- Parse `{{MM:SS}}` markers from analysis text
- Render parsed content with clickable timestamp links
- Connect clicks to timeline seeking
- Add visual feedback when timestamp clicked

**Files to Create/Modify:**
- Create: `src/renderer/components/AnalysisDisplay.tsx`
- Create: `src/renderer/utils/timestampParser.ts`
- Modify: Timeline store/context (add seek method if not present)

**Testing:**
- Timestamps are clickable and visually distinct
- Clicking timestamp seeks timeline to correct position
- Position accounts for clip start time (not just absolute)
- Visual feedback shows where user is in timeline
- Smooth scrolling/seeking experience

### Phase 6: Polish & UX

**Goal:** Refine interface and handle edge cases

**Tasks:**
- Add loading animations and transitions
- Improve error messages and user guidance
- Add keyboard shortcuts (optional)
- Add export functionality (copy analysis to clipboard)
- Consider analysis history/caching (optional)
- Add help text and tooltips

**Files to Modify:**
- All AI components for polish
- Add styles for animations
- Error boundary components

**Testing:**
- All error states display helpful messages
- Loading states are clear and not jarring
- UI feels responsive and polished
- Users can easily understand how to use features
- Edge cases handled gracefully

## Technical Dependencies

### NPM Packages to Install

- `openai` - Official OpenAI Node SDK

### Existing Dependencies to Use

- FFmpeg - Already in project for video processing
- Electron APIs - `safeStorage`, `app.getPath()`
- React - For all UI components
- Existing timeline/clip state management

## Performance & Cost Considerations

### Performance

- **Audio extraction** - Use FFmpeg efficiently, limit processing for very long clips
- **API calls** - Sequential (extract → transcribe → analyze), show clear progress
- **File cleanup** - Always delete temporary audio files after transcription
- **Caching** - Consider storing transcripts to avoid re-transcribing same clip

### API Costs (User's Responsibility)

For a typical 5-minute video clip:
- Whisper: ~$0.006/minute = ~$0.03
- GPT-4-turbo: ~2000 input tokens + ~500 output = ~$0.025
- **Total per analysis: ~$0.05-0.06**

Very affordable when users bring their own keys.

### File Size Limits

- **Whisper API limit:** 25MB audio file
- Most extracted audio clips will be well under this
- If exceeded, show clear error and suggest trimming clip first

## Security & Privacy

**Security Measures:**
- ✅ API keys encrypted with OS-level encryption (safeStorage)
- ✅ Keys never exposed to renderer process directly
- ✅ Temp files cleaned up immediately after use
- ✅ No data sent anywhere except OpenAI API
- ✅ All processing happens on user's machine

**User Responsibilities:**
- Users provide their own OpenAI API key
- Users responsible for API costs
- Users should understand data sent to OpenAI for processing

**Privacy Notes:**
- Video content and transcripts sent to OpenAI for processing
- OpenAI's data usage policies apply
- Consider adding privacy notice in settings

## Success Criteria

**MVP Complete When:**

✅ User can save OpenAI API key securely
✅ User can create and manage content profiles
✅ User can select a clip and click "Analyze"
✅ System extracts audio, transcribes, and analyzes automatically
✅ Analysis displays in panel with natural language feedback
✅ Timestamps in analysis are clickable
✅ Clicking timestamp seeks timeline to that position
✅ All major error cases handled with user-friendly messages

**Stretch Goals:**

🎯 Save analysis history for later reference
🎯 Export analysis as text file or PDF
🎯 Quick-switch between multiple profiles
🎯 Keyboard shortcuts for common actions
🎯 Re-analyze same clip with different profile
🎯 Show transcript alongside analysis

---

## Next Steps

1. Review and approve this plan
2. Install OpenAI SDK
3. Start with Phase 1 - Foundation
4. Build incrementally, test each phase
5. Iterate on prompts based on real results

**Estimated Total Time:** 8-13 hours for complete MVP

Let's build! 🚀
