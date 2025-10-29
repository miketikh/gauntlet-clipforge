# AI Consultant - Track C: Integration & Polish - Implementation Tasks

## Context

This is the **final integration track** for the AI Consultant feature. Track C brings together the frontend components built in Track A and the backend services built in Track B, connecting them through IPC communication and creating a complete end-to-end user experience.

**What Track C Does:**
- Wires up IPC calls from frontend to backend services
- Replaces all mock data with real API responses
- Connects UI interactions to actual functionality (profile storage, analysis pipeline, timeline seeking)
- Adds comprehensive error handling for network, API, and file system errors
- Polishes the UI with loading states, animations, and helpful user guidance
- Ensures the complete user journey works seamlessly from profile creation to timestamp clicking

**Critical Dependencies:**
- **REQUIRES Track A completion** - All UI components must be built (AIAssistantPanel, ProfileManager, AnalysisDisplay, LoadingAnalysis)
- **REQUIRES Track B completion** - All backend services must be implemented (API key storage, profile storage, audio extraction, Whisper transcription, GPT-4 analysis)

This track does NOT add new features - it focuses entirely on **integration, testing, and polish**.

**Architecture Overview:**
```
┌─────────────────────────────────────────────────────────────┐
│                        Renderer (React)                      │
│  ┌────────────────┐     IPC Calls      ┌──────────────────┐ │
│  │ ProfileManager │ ──────────────────► │ Profile Storage  │ │
│  │ (Track A)      │ ◄────────────────── │ (Track B)        │ │
│  └────────────────┘     Real Data       └──────────────────┘ │
│                                                               │
│  ┌────────────────┐     IPC Calls      ┌──────────────────┐ │
│  │ Analyze Button │ ──────────────────► │ Analysis Pipeline│ │
│  │ (Track A)      │ ◄────────────────── │ (Track B)        │ │
│  └────────────────┘   Progress Events   └──────────────────┘ │
│                                                               │
│  ┌────────────────┐     Seek Commands   ┌──────────────────┐ │
│  │ AnalysisDisplay│ ──────────────────► │ Timeline Store   │ │
│  │ (Track A)      │                     │ (Existing)       │ │
│  └────────────────┘                     └──────────────────┘ │
└───────────────────────────────────────────────────────────────┘
```

## Instructions for AI Agent

1. **Read Phase**: Before starting any PR, read all files listed in the "Tasks" section to understand current implementation
2. **Implement**: Work through tasks in order, checking off each with [x] as completed
3. **Test**: Verify all items in "What to Test" section before considering PR complete
4. **Mark Complete**: When all tasks and tests pass, mark the PR header with [x]
5. **Report**: Provide completion summary listing what was implemented and any deviations
6. **Wait**: Do not proceed to next PR until current one is approved

**Integration-Specific Guidelines:**
- Test end-to-end flows, not just individual functions
- Verify error cases work correctly (network failures, invalid API keys, missing files)
- Ensure loading states transition smoothly
- Check that all IPC channels are registered before use
- Test with real OpenAI API calls (small test clips to minimize cost)

---

## Phase 6: Integration & Polish

**Estimated Time:** 6-8 hours

Integrate all Track A and Track B components into a working end-to-end feature with comprehensive error handling and polished UX.

### PR 6.1: API Key Integration

**Goal:** Connect API key storage UI to backend safeStorage, ensure keys work with OpenAI API

**Tasks:**
- [ ] Read `src/renderer/components/AIAssistantPanel.tsx` (or wherever API key UI was added in Track A)
- [ ] Read `src/main/services/apiKeyStorage.ts` (created in Track B)
- [ ] Read `src/main/ipc/handlers.ts` to understand existing IPC patterns
- [ ] Add IPC handlers in `src/main/ipc/handlers.ts`:
  - `ai:save-api-key` handler → calls `apiKeyStorage.saveKey(key)`
  - `ai:get-api-key-exists` handler → calls `apiKeyStorage.hasKey()` (returns boolean only)
  - `ai:validate-api-key` handler → makes test OpenAI API call, returns validation result
  - `ai:delete-api-key` handler → calls `apiKeyStorage.deleteKey()`
- [ ] Update API key UI component (Track A):
  - Wire up "Save" button → invoke `ai:save-api-key` IPC call
  - Wire up "Test Connection" button → invoke `ai:validate-api-key` IPC call
  - On component mount → check `ai:get-api-key-exists` to show status
  - Display validation results (success/error messages)
  - Show loading state during validation
- [ ] Add error handling:
  - Invalid API key format (not starting with "sk-")
  - Network errors during validation
  - OpenAI API errors (rate limits, invalid key)
  - Empty key submission
- [ ] Update UI state based on API key status:
  - If no key exists → show setup prompt, disable "Analyze" button
  - If key exists → show "✓ API Key configured" status
  - If key invalid → show error with option to re-enter

**What to Test:**
1. Enter valid OpenAI API key → click "Save" → verify success message appears
2. Restart app → verify key persists and status shows "✓ API Key configured"
3. Click "Test Connection" → verify it makes successful API call to OpenAI
4. Enter invalid key → verify helpful error message explains the issue
5. Test with no internet connection → verify network error is handled gracefully
6. Delete API key → verify "Analyze" button becomes disabled
7. Try to analyze without API key → verify appropriate error message

**Files Changed:**
- `src/main/ipc/handlers.ts` - Add API key IPC handlers
- `src/renderer/components/AIAssistantPanel.tsx` (or API key settings component) - Wire up IPC calls
- Potentially `src/main/services/apiKeyStorage.ts` - Add validation method if not present

**Notes:**
- NEVER expose the actual API key to renderer process - only return boolean for existence checks
- Use `safeStorage.isEncryptionAvailable()` check before saving
- For validation, make a minimal API call (e.g., list models) to minimize cost
- Store validation state to avoid repeated API calls

---

### PR 6.2: Profile Management Integration

**Goal:** Connect ProfileManager UI to backend profile storage, enable full CRUD operations

**Tasks:**
- [ ] Read `src/renderer/components/ProfileManager.tsx` (created in Track A)
- [ ] Read `src/main/services/profileStorage.ts` (created in Track B)
- [ ] Read `src/main/ipc/handlers.ts` to see existing patterns
- [ ] Add IPC handlers in `src/main/ipc/handlers.ts`:
  - `ai:get-profiles` handler → calls `profileStorage.loadProfiles()`, returns profile array
  - `ai:save-profile` handler → calls `profileStorage.saveProfile(profile)`, returns saved profile with ID
  - `ai:update-profile` handler → calls `profileStorage.updateProfile(id, updates)`, returns updated profile
  - `ai:delete-profile` handler → calls `profileStorage.deleteProfile(id)`, returns success boolean
- [ ] Update ProfileManager component:
  - On mount → invoke `ai:get-profiles` to load existing profiles
  - "Save Profile" button → invoke `ai:save-profile` with form data
  - Profile dropdown selection → update local state with selected profile data
  - "Delete Profile" button → invoke `ai:delete-profile` with confirmation dialog
  - "Update Profile" button → invoke `ai:update-profile` with changes
  - Display loading states during save/delete/update operations
- [ ] Add validation:
  - Profile name required (show error if empty)
  - Target audience and content guidelines required
  - Check for duplicate profile names (warn user)
  - Prevent deleting currently selected profile without confirmation
- [ ] Add error handling:
  - File system errors during save/load (show user-friendly message)
  - Invalid profile data (missing fields)
  - Concurrent modification conflicts (rare, but handle gracefully)
- [ ] Update state management:
  - Keep profiles in sync between UI and file system
  - Refresh profile list after any CRUD operation
  - Update selected profile when editing

**What to Test:**
1. Create new profile with name, audience, guidelines → verify it saves and appears in dropdown
2. Restart app → verify profile persists and loads correctly
3. Select profile from dropdown → verify form fields populate with profile data
4. Edit existing profile → save → verify changes persist
5. Create profile with empty name → verify validation error appears
6. Delete profile → verify confirmation dialog → confirm → verify profile removed
7. Create multiple profiles → verify all appear in dropdown correctly
8. Try to save when file system is readonly (simulate with permissions) → verify error handling

**Files Changed:**
- `src/main/ipc/handlers.ts` - Add profile CRUD IPC handlers
- `src/renderer/components/ProfileManager.tsx` - Wire up IPC calls, add validation
- Potentially add confirmation dialog component if not present

**Notes:**
- Use UUIDs for profile IDs (can use `crypto.randomUUID()`)
- Always return full profile objects from save/update operations
- Consider debouncing auto-save if implementing real-time updates
- Profile file location: `{app.getPath('userData')}/ai-profiles.json`

---

### PR 6.3: Analysis Pipeline Integration

**Goal:** Connect "Analyze Clip" button to full backend pipeline (audio extraction → Whisper → GPT-4), display results

**Tasks:**
- [ ] Read `src/renderer/components/AIAssistantPanel.tsx` (Track A) - locate "Analyze Clip" button
- [ ] Read `src/renderer/components/LoadingAnalysis.tsx` (Track A) - understand progress display
- [ ] Read `src/renderer/components/AnalysisDisplay.tsx` (Track A) - understand result display
- [ ] Read `src/main/services/audioExtractor.ts` (Track B) - audio extraction service
- [ ] Read `src/main/services/transcriptionService.ts` (Track B) - Whisper API service
- [ ] Read `src/main/services/contentAnalyzer.ts` (Track B) - GPT-4 analysis service
- [ ] Read `src/main/ipc/handlers.ts` - existing handler patterns
- [ ] Add main analysis orchestration in `src/main/ipc/handlers.ts`:
  - `ai:analyze-clip` handler that orchestrates full pipeline:
    1. Receive clipPath, profile, startTime, endTime from renderer
    2. Call `audioExtractor.extractAudio(clipPath, startTime, endTime)` → get temp audio file
    3. Send progress event: `ai:analysis-progress` with stage "extracting"
    4. Call `transcriptionService.transcribe(audioPath)` → get transcript with timestamps
    5. Send progress event: `ai:analysis-progress` with stage "transcribing"
    6. Call `contentAnalyzer.analyze(transcript, profile)` → get analysis text
    7. Send progress event: `ai:analysis-progress` with stage "analyzing"
    8. Clean up temp audio file
    9. Send `ai:analysis-complete` event with full results
  - Handle errors at each stage → send `ai:analysis-error` event with details
- [ ] Update AIAssistantPanel component:
  - "Analyze Clip" button click → invoke `ai:analyze-clip` IPC call with:
    - Currently selected clip path from timeline
    - Selected profile from ProfileManager
    - Clip trim times if applicable
  - Listen for `ai:analysis-progress` events → update LoadingAnalysis component
  - Listen for `ai:analysis-complete` events → pass results to AnalysisDisplay
  - Listen for `ai:analysis-error` events → show error message, allow retry
  - Disable "Analyze" button during analysis
  - Show cancel button during analysis (optional but nice UX)
- [ ] Add comprehensive error handling:
  - No clip selected → disable button, show tooltip
  - No profile selected → show warning message
  - No API key → show setup prompt
  - Clip has no audio track → detect and show clear error
  - Audio file too large (>25MB) → show size error with suggestion to trim
  - Whisper API errors (rate limit, network, etc.) → show specific error
  - GPT-4 API errors (rate limit, network, etc.) → show specific error
  - FFmpeg errors → show extraction error with retry option
  - File system errors → handle temp file creation/cleanup failures
- [ ] Add progress tracking:
  - Show current stage name (Extracting audio, Transcribing, Analyzing)
  - Optionally show estimated time remaining
  - Show spinner or progress bar
  - Allow cancellation (send cancel event to main process)

**What to Test:**
1. Select clip on timeline → click "Analyze Selected Clip" → verify full pipeline runs
2. During analysis → verify progress updates show correct stages
3. Analysis completes → verify results appear in AnalysisDisplay component
4. Analysis with no profile selected → verify warning appears
5. Analysis with no API key → verify setup prompt appears
6. Analyze clip with no audio → verify clear error message
7. Simulate Whisper API error → verify error handling and retry option
8. Simulate GPT-4 API error → verify error handling and retry option
9. Cancel analysis mid-way → verify cancellation works and cleanup happens
10. Restart app during analysis → verify no zombie processes or temp files

**Files Changed:**
- `src/main/ipc/handlers.ts` - Add `ai:analyze-clip` orchestration handler
- `src/renderer/components/AIAssistantPanel.tsx` - Wire up analyze button, handle events
- `src/renderer/components/LoadingAnalysis.tsx` - Update to show real progress
- `src/renderer/components/AnalysisDisplay.tsx` - Display real results (not mocks)

**Notes:**
- Always clean up temp audio files in finally block
- Use try-catch blocks around each pipeline stage
- Log errors to console for debugging (will help during testing)
- Consider caching transcript results to avoid re-transcribing same clip
- Test with short clips first to minimize API costs during development

---

### PR 6.4: Timeline Seeking Integration

**Goal:** Make timestamp clicks in analysis results seek the timeline to the correct position

**Tasks:**
- [ ] Read `src/renderer/components/AnalysisDisplay.tsx` (Track A) - find timestamp click handlers
- [ ] Read `src/renderer/components/Timeline.tsx` - understand timeline state management
- [ ] Read `src/renderer/components/Preview.tsx` - understand video player control
- [ ] Read existing codebase to find timeline state management (may be in Timeline.tsx or separate store)
- [ ] Identify how timeline seeking currently works:
  - Check if there's a seek function in Timeline component
  - Check if Preview component exposes a seek method
  - Check if there's a global state for playhead position
- [ ] Add timeline seeking functionality if not present:
  - Create `seekToTime(seconds: number)` method in timeline state
  - Update playhead position in timeline UI
  - Update video player currentTime in Preview component
  - Ensure both timeline and preview stay in sync
- [ ] Connect AnalysisDisplay to timeline:
  - When timestamp clicked → parse `{{MM:SS}}` format to seconds
  - Account for clip start time (timestamp is relative to clip, not project)
  - Calculate absolute timeline position: `clipStartTime + relativeTimestamp`
  - Call timeline seek function with absolute position
  - Optionally scroll timeline viewport to show playhead
  - Optionally highlight the relevant clip temporarily
- [ ] Add visual feedback:
  - Show timestamp as "active" when clicked (different color/style)
  - Animate playhead movement (smooth seek vs instant)
  - Flash or highlight the clip being referenced
  - Show a small indicator that seek happened (optional)
- [ ] Handle edge cases:
  - Timestamp outside clip bounds → seek to clip end, show warning
  - Clip no longer exists on timeline → show error message
  - Multiple clips from same source → ensure correct clip is targeted
  - Timeline not visible → consider auto-scrolling to make it visible

**What to Test:**
1. Analyze clip → get results with timestamps → click timestamp → verify playhead moves
2. Verify video preview also seeks to correct position when timestamp clicked
3. Click timestamp at beginning of clip ({{00:05}}) → verify correct seeking
4. Click timestamp near end of clip → verify correct position
5. Click multiple timestamps in sequence → verify all work correctly
6. Analyze clip that's been trimmed → verify timestamps account for trim start time
7. Test with clip at different timeline positions → verify absolute position calculation
8. Click timestamp when timeline is scrolled out of view → verify auto-scroll if implemented
9. Test keyboard shortcut (spacebar) after timestamp click → verify playback works from new position

**Files Changed:**
- `src/renderer/components/AnalysisDisplay.tsx` - Add timestamp click logic with seeking
- `src/renderer/components/Timeline.tsx` - Add/expose seek functionality if needed
- `src/renderer/components/Preview.tsx` - Ensure video player can be controlled externally
- Potentially create/update timeline state management file

**Notes:**
- Timestamps in analysis are relative to clip start (not project timeline)
- MM:SS format needs parsing: `const [min, sec] = "01:23".split(":").map(Number); const totalSec = min * 60 + sec;`
- Consider using React refs if direct DOM manipulation needed for video element
- Smooth seeking provides better UX than instant jumps
- Test with clips that have been trimmed (startTime !== 0)

---

### PR 6.5: Error Handling & Edge Cases

**Goal:** Comprehensive error handling across all integration points, graceful degradation

**Tasks:**
- [ ] Read all previously modified files from Track C
- [ ] Read `src/main/services/*.ts` files to understand error throwing patterns
- [ ] Create error handling utilities:
  - Create NEW: `src/renderer/utils/errorMessages.ts` - User-friendly error message formatter
  - Create NEW: `src/renderer/components/ErrorBoundary.tsx` - React error boundary for AI panel
  - Create NEW: `src/renderer/components/ErrorDisplay.tsx` - Reusable error display component
- [ ] Add error handling in API key management:
  - Network timeout → "Cannot connect to OpenAI. Check your internet connection."
  - Invalid key format → "API key must start with 'sk-'. Please check your key."
  - Expired/revoked key → "This API key is no longer valid. Please update your key."
  - Rate limit → "OpenAI rate limit exceeded. Please try again in a few minutes."
  - Encryption not available → "Cannot securely store API key on this system."
- [ ] Add error handling in profile management:
  - File read/write errors → "Cannot save profile. Check disk permissions."
  - Invalid JSON in profile file → "Profile data corrupted. Reset to defaults?"
  - Disk full → "Not enough disk space to save profile."
- [ ] Add error handling in analysis pipeline:
  - No audio in video → "This clip has no audio track. Analysis requires audio."
  - Audio file too large → "Audio is too large for Whisper API (limit: 25MB). Try trimming the clip."
  - FFmpeg extraction failure → "Cannot extract audio from this video file. Format may not be supported."
  - Whisper API timeout → "Transcription taking longer than expected. Continue waiting?"
  - Whisper API error → "Transcription failed: [specific error]. Try again?"
  - GPT-4 API timeout → "Analysis taking longer than expected. Continue waiting?"
  - GPT-4 API error → "Analysis failed: [specific error]. Try again?"
  - Temp file cleanup failure → Log warning but don't block user
- [ ] Add error handling in timeline seeking:
  - Invalid timestamp format → Log warning, ignore click
  - Timestamp out of bounds → Seek to clip end, show tooltip
  - Clip deleted → "Referenced clip no longer exists on timeline."
- [ ] Add retry mechanisms:
  - Network errors → Show "Retry" button
  - Timeout errors → Show "Continue Waiting" and "Cancel" buttons
  - API errors → Show "Retry" button with exponential backoff
- [ ] Add error logging:
  - Log all errors to console with context (clip ID, stage, etc.)
  - Consider adding error telemetry for debugging (optional)
- [ ] Add user guidance for errors:
  - Each error message includes what happened and what to do
  - Link to OpenAI status page for API errors
  - Link to support/documentation where relevant

**What to Test:**
1. Disconnect internet → try analysis → verify network error shown with retry option
2. Use invalid API key → verify clear error message with correction guidance
3. Analyze video with no audio track → verify specific error about no audio
4. Simulate FFmpeg failure → verify extraction error with helpful message
5. Simulate Whisper timeout → verify continue/cancel options appear
6. Simulate GPT-4 rate limit → verify rate limit message with time estimate
7. Fill disk (if possible in test) → verify disk full error when saving profile
8. Corrupt profile JSON file → verify graceful handling with reset option
9. Click malformed timestamp → verify no crash, just ignored
10. Trigger multiple errors in sequence → verify each is handled correctly

**Files Changed:**
- Create: `src/renderer/utils/errorMessages.ts` - Error message formatter
- Create: `src/renderer/components/ErrorBoundary.tsx` - React error boundary
- Create: `src/renderer/components/ErrorDisplay.tsx` - Error UI component
- Modify: All Track C integration files to add try-catch and error handling
- Modify: `src/main/ipc/handlers.ts` - Add error event emissions

**Notes:**
- Always provide actionable error messages (tell user what to do)
- Log technical details to console, show friendly messages to users
- Consider adding error codes for easier debugging
- Test error states as thoroughly as success states
- Never let errors crash the app or leave it in broken state

---

### PR 6.6: UI Polish & Animations

**Goal:** Smooth transitions, loading states, and visual polish for professional feel

**Tasks:**
- [ ] Read all AI Consultant components (Track A files)
- [ ] Review existing app styles in `src/renderer/styles/` for consistency
- [ ] Add animations for panel transitions:
  - Smooth expand/collapse of AIAssistantPanel (CSS transitions)
  - Slide-in animation when analysis results appear
  - Fade-in for loading states
  - Smooth height transitions when switching panel states
- [ ] Enhance loading states:
  - Animated spinner during API calls
  - Progress bar showing pipeline stages (extraction → transcription → analysis)
  - Percentage complete indicators where applicable
  - Animated dots for "Analyzing..." text effect
  - Show estimated time remaining (optional)
- [ ] Add micro-interactions:
  - Hover effects on clickable timestamps (color change, underline)
  - Button press animations (slight scale down on click)
  - Ripple effect for important buttons (optional)
  - Smooth scroll when navigating to timestamps
  - Highlight flash when playhead moves after timestamp click
- [ ] Improve visual hierarchy:
  - Clear section dividers in AI panel
  - Consistent spacing and padding
  - Typography hierarchy (headings, body, labels)
  - Color coding for different states (idle, loading, error, success)
  - Icons for different actions (save, delete, analyze, etc.)
- [ ] Add empty states:
  - "No profiles yet" state with clear call-to-action
  - "No analysis yet" state with instructions
  - "Select a clip to analyze" when no clip selected
- [ ] Add success feedback:
  - Green checkmark when API key saved successfully
  - Success message when profile saved
  - Completion animation when analysis finishes
  - Subtle sound effect for completion (optional)
- [ ] Ensure responsive layout:
  - Panel resizes smoothly when dragged (if resizable)
  - Text wraps properly in analysis results
  - Scrollbars appear only when needed
  - Works at different window sizes
- [ ] Add keyboard shortcuts (optional but nice):
  - Toggle AI panel visibility (e.g., Cmd/Ctrl + A)
  - Focus profile name input (e.g., Cmd/Ctrl + P)
  - Quick analyze (e.g., Cmd/Ctrl + Shift + A)
- [ ] Polish color scheme:
  - Ensure AI panel matches app dark theme
  - Use accent colors for interactive elements
  - Ensure sufficient contrast for accessibility
  - Highlight timestamps in distinct color

**What to Test:**
1. Expand/collapse AI panel → verify smooth animation with no jank
2. Start analysis → verify loading animation appears immediately
3. Hover over timestamps → verify clear hover state
4. Complete analysis → verify results slide in smoothly
5. Save profile → verify success feedback appears
6. Switch between different panel states → verify smooth transitions
7. Scroll long analysis text → verify smooth scrolling
8. Test at different window sizes → verify responsive layout
9. Test with keyboard shortcuts → verify they work consistently
10. Overall feel → verify professional, polished experience

**Files Changed:**
- Modify: `src/renderer/components/AIAssistantPanel.tsx` - Add panel animations
- Modify: `src/renderer/components/LoadingAnalysis.tsx` - Enhanced loading UI
- Modify: `src/renderer/components/AnalysisDisplay.tsx` - Add hover effects, animations
- Modify: `src/renderer/components/ProfileManager.tsx` - Add micro-interactions
- Create: `src/renderer/styles/aiConsultant.css` - AI-specific styles and animations
- Potentially update: `src/renderer/styles/global.css` - Global animation utilities

**Notes:**
- Use CSS transitions where possible (better performance than JS animations)
- Keep animations quick (200-300ms) to feel responsive
- Respect user's reduced motion preferences: `prefers-reduced-motion` media query
- Test on slower machines to ensure animations don't cause performance issues
- Consistency is more important than fancy effects

---

### PR 6.7: End-to-End Testing & Bug Fixes

**Goal:** Test complete user journeys, fix integration bugs, ensure production-ready quality

**Tasks:**
- [ ] Set up test environment:
  - Have valid OpenAI API key ready
  - Prepare test video clips (short clips to minimize API cost):
    - Clip with clear speech (1-2 minutes)
    - Clip with no audio
    - Very short clip (5 seconds)
    - Longer clip (5 minutes)
  - Create multiple test profiles with different guidelines
- [ ] Test complete user journey #1 (First-time user):
  1. Open app with no API key configured
  2. Verify AI panel shows setup prompt
  3. Enter API key and save
  4. Verify "Test Connection" works
  5. Create first profile with name, audience, guidelines
  6. Verify profile saves and appears in dropdown
  7. Import video clip to timeline
  8. Select clip and click "Analyze"
  9. Verify all progress stages appear correctly
  10. Verify analysis appears with clickable timestamps
  11. Click timestamps and verify seeking works
  12. Verify can analyze same clip with different profile
- [ ] Test complete user journey #2 (Returning user):
  1. Restart app
  2. Verify API key and profiles persist
  3. Verify can immediately analyze without re-entering key
  4. Test editing existing profile
  5. Test deleting profile
  6. Test analyzing multiple different clips
- [ ] Test error scenarios:
  - Network disconnected during analysis
  - Invalid API key after initial setup
  - Clip deleted while analysis in progress
  - Disk full during profile save
  - Multiple analyses running (should queue or prevent)
- [ ] Test edge cases:
  - Very long analysis results (test scrolling)
  - Profile with very long text in guidelines
  - Many profiles (20+) in dropdown
  - Rapid clicking of analyze button (debouncing)
  - Switching clips during analysis
  - Closing app during analysis
- [ ] Performance testing:
  - Analysis pipeline completes in reasonable time
  - UI remains responsive during analysis
  - No memory leaks after multiple analyses
  - Temp files are cleaned up properly
  - App startup time not affected by number of profiles
- [ ] Cross-platform testing (if applicable):
  - macOS - test with Keychain integration
  - Windows - test with DPAPI (if supported)
  - Linux - test with Secret Service (if supported)
- [ ] Bug fixing:
  - Create list of all bugs found during testing
  - Fix critical bugs (blocking functionality)
  - Fix high-priority bugs (poor UX)
  - Document known minor issues as future improvements
- [ ] Code cleanup:
  - Remove any debug console.logs not needed
  - Remove commented-out code
  - Ensure consistent code formatting
  - Add comments for complex integration logic
  - Ensure no TypeScript errors or warnings
- [ ] Documentation:
  - Update code comments for IPC handlers
  - Document any gotchas or quirks discovered
  - Note any API cost considerations for users

**What to Test:**
1. **Complete first-time user flow** - fresh app to first successful analysis
2. **Complete returning user flow** - app restart to immediate analysis
3. **All error paths** - network errors, API errors, file errors
4. **All edge cases** - long text, many profiles, rapid interactions
5. **Performance** - no slowdowns, no memory leaks, proper cleanup
6. **Persistence** - API keys, profiles, settings survive restart
7. **Cross-component integration** - everything works together seamlessly
8. **Professional UX** - smooth, polished, no rough edges

**Files Changed:**
- Potentially any file if bugs are found
- Focus on files modified in PRs 6.1 through 6.6

**Notes:**
- Use real OpenAI API for testing (short clips to minimize cost)
- Keep detailed notes of bugs found and how they were fixed
- This PR is about quality assurance, not new features
- Don't rush - thorough testing prevents future issues
- Consider creating a test checklist for future regression testing
- Estimated testing time: 2-3 hours minimum for thorough coverage

---

## Success Criteria

Track C is complete when:

✅ **API Key Management:**
- User can enter, save, and validate OpenAI API key
- Key persists across app restarts using secure storage
- Invalid keys show helpful error messages
- API key status visible in UI

✅ **Profile Management:**
- User can create, edit, and delete content profiles
- Profiles persist to file system
- Profile dropdown shows all saved profiles
- Can switch between profiles seamlessly

✅ **Analysis Pipeline:**
- "Analyze Clip" button triggers full backend pipeline
- Progress updates show current stage (extracting, transcribing, analyzing)
- Results display in AnalysisDisplay component with formatted text
- All errors handled gracefully with retry options

✅ **Timeline Integration:**
- Clicking timestamps in analysis seeks timeline to correct position
- Video preview updates to match playhead position
- Seeking accounts for clip start time (relative timestamps)
- Visual feedback confirms successful seek

✅ **Error Handling:**
- All error states display user-friendly messages
- Network errors provide retry options
- API errors explain what happened and how to fix
- No crashes or broken states from any error

✅ **Polish & UX:**
- Smooth animations for panel states and transitions
- Loading states clearly indicate progress
- Professional visual design consistent with app
- Responsive layout works at different window sizes
- Overall experience feels polished and production-ready

✅ **End-to-End Testing:**
- Complete user journey works from start to finish
- All edge cases handled appropriately
- Performance is acceptable (no slowdowns or freezes)
- Persistence works correctly (no data loss)
- No critical or high-priority bugs remain

---

## Estimated Timeline

- **PR 6.1 (API Key Integration):** 1 hour
- **PR 6.2 (Profile Management Integration):** 1.5 hours
- **PR 6.3 (Analysis Pipeline Integration):** 2 hours
- **PR 6.4 (Timeline Seeking Integration):** 1 hour
- **PR 6.5 (Error Handling):** 1.5 hours
- **PR 6.6 (UI Polish):** 1 hour
- **PR 6.7 (E2E Testing & Fixes):** 2 hours

**Total: 10 hours** (conservative estimate including testing and debugging)

---

## Post-Integration Notes

After Track C completion, the AI Consultant feature will be fully functional. Potential future enhancements (not in scope for Track C):

- Analysis history/caching (avoid re-transcribing same clip)
- Export analysis as text/PDF
- Side-by-side transcript view alongside analysis
- Batch analysis of multiple clips
- Custom prompt templates
- Analysis comparison between profiles
- Keyboard shortcuts for power users

These are stretch goals and should only be pursued after Track C is complete and tested.
