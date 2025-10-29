# AI Consultant - Track A Phase 2: Profile Management UI

## Context

This is **Track A Phase 2** - building the Profile Management UI with MOCK DATA only. No file persistence or backend integration yet (that's Track B's responsibility).

Users need to create and manage content profiles that define their target audience and content guidelines. Each profile contains:
- Profile name (e.g., "Tech Tutorial", "Marketing Video")
- Target audience description (free-form text)
- Content guidelines (free-form text)

This phase builds the UI components for creating, selecting, editing, and deleting profiles. All data will be stored in-memory or localStorage for now - NO file system or IPC integration needed.

**Design Goal:**
Profile Manager fits into the first section of the AI Assistant panel (the 200px placeholder from Phase 1). It includes form fields, a profile selector dropdown, and save/delete buttons.

## Instructions for AI Agent

1. **Read Phase**: Read all files listed in each PR's tasks before making changes
2. **Implement**: Complete tasks in order, marking each with [x] when done
3. **Test**: Follow "What to Test" section after implementation
4. **Report**: Provide completion summary with what was built and any issues
5. **Wait**: Wait for approval before moving to next PR

---

## Phase 2: Profile Management UI

**Estimated Time:** 3-4 hours

Build profile creation/editing UI with in-memory storage. Users can create profiles, switch between them, edit them, and delete them. Everything works in the UI but doesn't persist to files yet.

### PR 2.1: Profile Data Types and Store

**Goal:** Define TypeScript interfaces for profiles and extend AI Assistant store to manage profile state.

**Tasks:**
- [ ] Read `src/renderer/store/aiAssistantStore.ts` to understand current store structure
- [ ] Read `src/types/media.ts` to see example type definitions
- [ ] Create NEW: `src/types/aiAssistant.ts`:
  - Define `UserProfile` interface with properties:
    - `id: string` - Unique identifier (uuid or timestamp-based)
    - `name: string` - Profile name (e.g., "Tech Tutorial")
    - `targetAudience: string` - Free-form description of audience
    - `contentGuidelines: string` - Free-form content rules/guidelines
    - `createdAt: Date` - Creation timestamp
    - `updatedAt: Date` - Last update timestamp
  - Export interface for use across components
- [ ] Update `src/renderer/store/aiAssistantStore.ts`:
  - Import `UserProfile` type
  - Add to state:
    - `profiles: UserProfile[]` (default empty array)
    - `selectedProfileId: string | null` (default null)
    - `editingProfile: Partial<UserProfile> | null` - For form state
  - Add actions:
    - `addProfile: (profile: Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt'>) => void`
    - `updateProfile: (id: string, changes: Partial<UserProfile>) => void`
    - `deleteProfile: (id: string) => void`
    - `selectProfile: (id: string | null) => void`
    - `setEditingProfile: (profile: Partial<UserProfile> | null) => void`
    - `loadProfile: (id: string) => void` - Load profile into editing state
    - `clearEditingProfile: () => void` - Reset form
  - Generate IDs using `profile-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  - Set `createdAt` and `updatedAt` timestamps automatically in actions
- [ ] Add 2-3 mock profiles to initial state for testing:
  - "Tech Tutorial" profile
  - "Marketing Video" profile
  - Leave one empty for testing creation flow

**What to Test:**
1. Build project - verify no compilation errors
2. Open React DevTools → check aiAssistantStore has `profiles` array with mock data
3. Types are properly exported and importable in other files
4. Mock profiles have all required fields (id, name, timestamps, etc.)

**Files Changed:**
- NEW: `src/types/aiAssistant.ts` - Type definitions for profiles
- `src/renderer/store/aiAssistantStore.ts` - Add profile state and actions

**Notes:**
- Follow the patterns from `projectStore.ts` for Zustand actions
- Keep dates as Date objects in store (not strings)
- Mock profile content should be realistic for testing UI layout
- Use descriptive placeholder text that will help test text wrapping

---

### PR 2.2: ProfileManager Component - Basic Form

**Goal:** Create ProfileManager component with form fields for profile name, target audience, and content guidelines.

**Tasks:**
- [x] Read `src/renderer/components/AIAssistantPanel.tsx` to see where ProfileManager will be placed
- [x] Read `src/renderer/store/aiAssistantStore.ts` to understand available state/actions
- [x] Read `src/renderer/components/Header.tsx` for styling reference (buttons, inputs)
- [x] Create NEW: `src/renderer/components/ProfileManager.tsx`:
  - Import `useAIAssistantStore` and `UserProfile` type
  - Create component with form fields:
    - Profile Name: `<input type="text" />` with label
    - Target Audience: `<textarea rows={4} />` with label
    - Content Guidelines: `<textarea rows={4} />` with label
  - Use controlled inputs bound to `editingProfile` from store
  - Style inputs with dark theme:
    - Background: #2a2a2a
    - Border: #404040
    - Text: #e0e0e0
    - Focus border: #3498db
    - Padding: 8px
    - Border radius: 4px
  - Add "Save Profile" button at bottom:
    - Calls `addProfile()` or `updateProfile()` based on whether editing existing profile
    - Disabled if profile name is empty
    - Primary button styling (blue background)
  - Add character count hints under textareas (e.g., "250 characters")
  - Add placeholder text for guidance:
    - Target Audience: "e.g., Beginner developers learning React..."
    - Content Guidelines: "e.g., Use simple analogies, avoid jargon..."

**What to Test:**
1. Build project - verify no compilation errors
2. Component renders in AI panel (temporarily add to AIAssistantPanel.tsx)
3. Can type into all three fields
4. Form state updates in Zustand store (check DevTools)
5. Save button disabled when name is empty
6. Input styling matches dark theme aesthetic
7. Textareas are scrollable if content exceeds visible area
8. Placeholder text is visible and helpful

**Files Changed:**
- NEW: `src/renderer/components/ProfileManager.tsx` - Profile form component

**Notes:**
- Don't implement profile selector yet - that's PR 2.3
- Focus on making form feel responsive and polished
- Use `onChange` handlers that call `setEditingProfile()` from store
- Consider adding subtle hover effects on inputs
- Make sure textareas auto-resize or have appropriate height

---

### PR 2.3: Profile Selector Dropdown

**Goal:** Add dropdown to select existing profiles and load them into the form for editing.

**Tasks:**
- [ ] Read `src/renderer/components/ProfileManager.tsx` (just created)
- [ ] Read `src/renderer/store/aiAssistantStore.ts` for profile access
- [ ] Update `src/renderer/components/ProfileManager.tsx`:
  - Add dropdown/select element above form fields:
    - Label: "Select Profile"
    - Options: "New Profile" (default) + list of existing profile names
    - On change: Call `loadProfile(id)` or `clearEditingProfile()` for "New Profile"
  - Add visual separator (border-top) between selector and form
  - Style dropdown to match theme:
    - Same dark background/border as inputs
    - Custom arrow icon (optional) or default browser styling
    - Full width
  - When profile selected:
    - Load profile data into form fields via `loadProfile()`
    - Change "Save Profile" button text to "Update Profile"
    - Show "Delete Profile" button (secondary/danger styling)
  - When "New Profile" selected:
    - Clear all form fields via `clearEditingProfile()`
    - Hide "Delete Profile" button
    - Show "Save Profile" button
  - Add profile count indicator (e.g., "3 profiles saved")

**What to Test:**
1. Build project - verify no compilation errors
2. Dropdown shows "New Profile" + all mock profiles
3. Select mock profile → form fields populate with profile data
4. Select "New Profile" → form fields clear
5. "Delete Profile" button only visible when editing existing profile
6. Button text changes between "Save Profile" and "Update Profile" appropriately
7. Profile count shows correct number

**Files Changed:**
- `src/renderer/components/ProfileManager.tsx` - Add profile selector dropdown

**Notes:**
- Use value={selectedProfileId || 'new'} for dropdown controlled state
- Make sure dropdown is keyboard-accessible (tab, arrow keys)
- Consider sorting profiles alphabetically in dropdown
- Delete button should have red/danger color (e.g., #e74c3c)

---

### PR 2.4: Profile Actions - Create, Update, Delete

**Goal:** Wire up all profile CRUD operations to the UI and handle edge cases.

**Tasks:**
- [ ] Read `src/renderer/components/ProfileManager.tsx` (current state)
- [ ] Read `src/renderer/store/aiAssistantStore.ts` for available actions
- [ ] Update `src/renderer/components/ProfileManager.tsx`:
  - Implement "Save Profile" button click handler:
    - Validate all fields are filled (name, targetAudience, contentGuidelines)
    - Show error message if validation fails (simple alert or inline text)
    - Call `addProfile()` with form data
    - Clear form and show success feedback (console.log or brief message)
    - Auto-select newly created profile in dropdown
  - Implement "Update Profile" button click handler:
    - Validate fields
    - Call `updateProfile(id, changes)` with updated data
    - Show success feedback
    - Keep profile selected
  - Implement "Delete Profile" button click handler:
    - Show confirmation prompt: "Delete this profile?"
    - On confirm: Call `deleteProfile(id)`
    - Clear form and select "New Profile"
    - Show success feedback
  - Add visual feedback for actions (loading state, success/error messages)
  - Handle edge case: Can't delete if it's the last profile (show warning)
  - Add keyboard shortcut: Cmd/Ctrl+S to save profile

**What to Test:**
1. Build project - verify no compilation errors
2. Create new profile:
   - Fill out form with "Test Profile"
   - Click "Save Profile"
   - Profile appears in dropdown
   - Form clears
3. Edit existing profile:
   - Select profile from dropdown
   - Change content
   - Click "Update Profile"
   - Changes persist when re-selecting profile
4. Delete profile:
   - Select profile
   - Click "Delete Profile"
   - Confirmation appears
   - Confirm → profile removed from dropdown
5. Validation works:
   - Try saving with empty name → shows error
   - Try saving with empty audience → shows error
6. Keyboard shortcut Cmd/Ctrl+S saves profile

**Files Changed:**
- `src/renderer/components/ProfileManager.tsx` - Add all CRUD action handlers

**Notes:**
- Use `window.confirm()` for delete confirmation (simple and sufficient)
- Validation errors can be simple inline text or alerts (no fancy toast needed)
- Consider adding slight delay/animation for success feedback
- Make sure store updates trigger re-renders correctly

---

### PR 2.5: Integrate ProfileManager into Panel

**Goal:** Add ProfileManager component to AIAssistantPanel and polish the layout.

**Tasks:**
- [ ] Read `src/renderer/components/AIAssistantPanel.tsx` to see current structure
- [ ] Read `src/renderer/components/ProfileManager.tsx` (completed component)
- [ ] Update `src/renderer/components/AIAssistantPanel.tsx`:
  - Import ProfileManager component
  - Replace "Profile Management" placeholder div with `<ProfileManager />`
  - Add section header: "Profile Management" (collapsible optional, but not required)
  - Add visual separator between sections (1px border, #404040 color)
  - Ensure ProfileManager scrolls within its section if content overflows
  - Add min/max height constraints for ProfileManager section (min 250px, max 500px)
- [ ] Polish section layout:
  - Add padding between sections (16px)
  - Ensure consistent spacing throughout panel
  - Make sure collapsed robot icon doesn't break with new content
- [ ] Test panel with ProfileManager at different window sizes

**What to Test:**
1. Build project - verify no compilation errors
2. Open AI panel → ProfileManager visible in top section
3. All profile operations work within panel context
4. Panel remains scrollable if ProfileManager content is tall
5. Section doesn't overflow panel width
6. Panel still collapses/expands smoothly with ProfileManager inside
7. Layout looks polished and consistent
8. Test at different window heights - content adapts gracefully

**Files Changed:**
- `src/renderer/components/AIAssistantPanel.tsx` - Integrate ProfileManager component

**Notes:**
- ProfileManager should take up natural height, not flex-grow
- Leave room for other sections (Analyze button, Results) below
- Consider adding subtle section separators (horizontal lines)
- Make sure scrollbars appear when needed but don't affect layout

---

## Phase 2 Complete Checklist

When all PRs in Phase 2 are complete, verify:
- [ ] ProfileManager visible in AI Assistant panel
- [ ] Can create new profiles with name, audience, and guidelines
- [ ] Can select existing profiles from dropdown
- [ ] Can edit existing profiles and save changes
- [ ] Can delete profiles (with confirmation)
- [ ] Form validation works (prevents empty profiles)
- [ ] Mock profiles load correctly on startup
- [ ] UI is polished and matches dark theme
- [ ] All profile data stored in Zustand store
- [ ] No console errors or layout issues
- [ ] Keyboard shortcuts work (Cmd/Ctrl+S)

**Next Phase:** Phase 5 (Interactive Results Display) - Build AnalysisDisplay component with timestamp parsing and clickable links (Phase 3-4 are backend-focused and handled by Track B).
