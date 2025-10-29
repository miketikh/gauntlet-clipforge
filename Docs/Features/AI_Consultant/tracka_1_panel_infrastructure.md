# AI Consultant - Track A Phase 1: Panel Infrastructure

## Context

This is **Track A (Frontend)** of the AI Consultant feature implementation. Track A builds all UI components using MOCK DATA and runs completely independently from Track B (Backend Integration).

The AI Consultant adds an intelligent content analysis assistant to ClipForge. Users will be able to analyze video clips against custom audience profiles and receive AI-powered feedback with clickable timestamps. This phase builds the foundational collapsible panel infrastructure on the right side of the Preview component.

**Key UI Pattern:**
- Collapsed state: Shows robot icon (🤖), ~50px width
- Expanded state: Shows full panel with profile management and analysis UI, ~350px width
- Panel expands/collapses smoothly, Preview component adjusts width accordingly
- Panel extends vertically from Header bottom to Timeline top

## Instructions for AI Agent

1. **Read Phase**: Read all files listed in each PR's tasks before making changes
2. **Implement**: Complete tasks in order, marking each with [x] when done
3. **Test**: Follow "What to Test" section after implementation
4. **Report**: Provide completion summary with what was built and any issues
5. **Wait**: Wait for approval before moving to next PR

---

## Phase 1: Panel Infrastructure (UI Components Only)

**Estimated Time:** 3-4 hours

Build the collapsible AI Assistant panel with all visual states working. Use mock/hardcoded data - no backend integration needed yet.

### PR 1.1: Collapsible Panel Component

**Goal:** Create AIAssistantPanel component with collapse/expand functionality and basic layout structure.

**Tasks:**
- [x] Read `src/renderer/components/Layout.tsx` to understand current grid layout structure
- [x] Read `src/renderer/components/Preview.tsx` to understand preview component structure
- [x] Read `src/renderer/components/Header.tsx` and `src/renderer/components/Timeline.tsx` to understand height constraints
- [x] Create NEW: `src/renderer/components/AIAssistantPanel.tsx`:
  - [x] Component accepts `isOpen: boolean` and `onToggle: () => void` props
  - [x] Collapsed state: 50px width, shows centered robot emoji 🤖
  - [x] Expanded state: 350px width, shows full panel content
  - [x] Add hover tooltip "AI Assistant" when collapsed
  - [x] Include close button (×) in header when expanded
  - [x] Use dark theme colors matching existing app aesthetic (#1a1a1a background)
  - [x] Smooth CSS transitions for width changes (0.3s ease)
- [x] Add panel header with "AI Assistant" title (only visible when expanded)
- [x] Add three placeholder sections (will be filled in later PRs):
  - [x] Profile Management section (empty div with border, 200px min-height)
  - [x] Analyze Clip section (empty div with border, 100px height)
  - [x] Analysis Results section (empty scrollable div, flex-grow to fill space)
- [x] Add basic CSS styling using inline styles or styled-components pattern

**What to Test:**
1. Build project - verify no compilation errors
2. Component renders in isolated state (add temporary to App.tsx to test)
3. Click robot icon → panel expands smoothly
4. Click × button → panel collapses smoothly
5. Hover collapsed panel → tooltip appears
6. Visual layout matches dark theme aesthetic

**Files Changed:**
- NEW: `src/renderer/components/AIAssistantPanel.tsx` - Main collapsible panel component

**Notes:**
- Don't integrate with Layout.tsx yet - that's PR 1.2
- Use React useState for local collapsed/expanded state
- Keep styling consistent with existing components (check Header.tsx for color references)
- Make panel scrollable when content overflows

---

### PR 1.2: Integrate Panel with Layout

**Goal:** Add AI panel to Layout.tsx and make Preview component respond to panel state.

**Tasks:**
- [x] Read `src/renderer/components/Layout.tsx` to understand current CSS Grid structure
- [x] Read `src/renderer/components/AIAssistantPanel.tsx` (just created)
- [x] Update `src/renderer/components/Layout.tsx`:
  - [x] Add state for `isPanelOpen: boolean` (default false)
  - [x] Update grid template to include AI panel column when open
  - [x] Collapsed: `gridTemplateColumns: '250px 1fr 50px'`
  - [x] Expanded: `gridTemplateColumns: '250px 1fr 350px'`
  - [x] Add new grid area `"aiPanel"` to template
  - [x] Update grid areas to: `"header header header"`, `"sidebar preview aiPanel"`, `"timeline timeline timeline"`
  - [x] Pass `isPanelOpen` and toggle handler to AIAssistantPanel
- [x] Update `src/renderer/App.tsx` to render AIAssistantPanel in Layout:
  - [x] Read current App.tsx structure
  - [x] Pass new `aiPanel={<AIAssistantPanel ... />}` prop to Layout
  - [x] Update Layout component props interface to accept `aiPanel: React.ReactNode`
- [x] Ensure Preview component shrinks/grows smoothly when panel toggles

**What to Test:**
1. Build project - verify no compilation errors
2. Launch app - panel should be collapsed by default (robot icon visible on right)
3. Click robot icon → panel expands, preview shrinks horizontally
4. Click × button → panel collapses, preview expands back
5. Timeline resizer still works correctly (vertical resize)
6. No layout jank or flickering during transitions
7. MediaLibrary (left sidebar) remains fixed at 250px
8. Zoom in/out on window - layout remains stable

**Files Changed:**
- `src/renderer/components/Layout.tsx` - Add AI panel to grid layout with dynamic columns
- `src/renderer/components/App.tsx` - Include AIAssistantPanel in Layout composition

**Notes:**
- Preview auto-adjusts width because it's in CSS Grid's `1fr` column
- Don't worry about persisting panel state yet (localStorage can be added later)
- Panel state lives in Layout.tsx for now (can be lifted to Zustand store in future)
- Make sure timeline resize handle still works after layout changes

---

### PR 1.3: Panel State Management with Zustand

**Goal:** Move panel state to Zustand store for global access and prepare for cross-component integration.

**Tasks:**
- [x] Read `src/renderer/store/projectStore.ts` to understand Zustand store pattern
- [x] Read `src/renderer/store/playerStore.ts` for additional pattern reference
- [x] Create NEW: `src/renderer/store/aiAssistantStore.ts`:
  - Define `AIAssistantState` interface with properties:
    - `isPanelOpen: boolean` (default false)
    - `panelWidth: number` (default 350)
  - Define actions:
    - `togglePanel: () => void`
    - `setPanelOpen: (open: boolean) => void`
    - `setPanelWidth: (width: number) => void` (for future resizing)
  - Create Zustand store with `create<AIAssistantState>()`
  - No persistence needed yet (can add `persist` middleware later)
- [x] Update `src/renderer/components/Layout.tsx`:
  - Remove local `isPanelOpen` state
  - Import and use `useAIAssistantStore`
  - Get `isPanelOpen` and `togglePanel` from store
  - Use `panelWidth` from store for grid column width
- [x] Update `src/renderer/components/AIAssistantPanel.tsx`:
  - Remove props for `isOpen` and `onToggle`
  - Import and use `useAIAssistantStore` directly
  - Get state and actions from store

**What to Test:**
1. Build project - verify no compilation errors
2. Panel still opens/closes correctly via robot icon and × button
3. Store state is accessible from React DevTools (if available)
4. Multiple components could theoretically read panel state (test by console.logging in different components)
5. Panel width from store controls actual rendered width

**Files Changed:**
- NEW: `src/renderer/store/aiAssistantStore.ts` - Global state for AI panel
- `src/renderer/components/Layout.tsx` - Use store instead of local state
- `src/renderer/components/AIAssistantPanel.tsx` - Use store instead of props

**Notes:**
- Follow existing store patterns from projectStore.ts and playerStore.ts
- Keep store simple for now - more state will be added in Phase 2 (Profile System)
- This makes panel state accessible from Header.tsx if we add menu controls later
- Store pattern allows Timeline.tsx or other components to check if panel is open

---

## Phase 1 Complete Checklist

When all PRs in Phase 1 are complete, verify:
- [x] AI Assistant panel visible on right side of app (collapsed by default)
- [x] Panel smoothly expands/collapses when clicked
- [x] Preview component adjusts width correctly
- [x] Panel state managed by Zustand store
- [x] Three placeholder sections visible in expanded panel
- [x] Dark theme styling consistent with rest of app
- [x] No console errors or layout issues
- [x] Robot icon 🤖 visible and clickable when collapsed

**Next Phase:** Phase 2 (Profile Management UI) - Build ProfileManager component with form fields for creating and selecting audience profiles (mock data only).
