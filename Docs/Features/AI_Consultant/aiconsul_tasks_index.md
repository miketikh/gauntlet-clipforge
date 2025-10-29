# AI Consultant Tasks Index

Quick reference for the AI Consultant feature implementation tasks.

## Overview

The AI Consultant feature is split into **3 parallel tracks** for efficient development:
- **Track A**: Frontend/UI components (uses mock data)
- **Track B**: Backend/AI services (console testing)
- **Track C**: Integration & polish (requires A + B complete)

---

## Track A: Frontend (UI Components)

**Can work independently with mock data. Zero file conflicts with Track B.**

### tracka_1_panel_infrastructure.md
**Phase 1 - Panel Infrastructure** | ~3-4 hours
- Collapsible AIAssistantPanel component (robot icon ↔ full panel)
- Layout.tsx integration (Preview resizing)
- Zustand store for panel state

**Files touched:**
- `src/renderer/components/AIAssistantPanel.tsx` (new)
- `src/renderer/components/Layout.tsx` (modify)
- `src/renderer/stores/aiAssistantStore.ts` (new)

---

### tracka_2_profile_ui.md
**Phase 2 - Profile Management UI** | ~3-4 hours
- ProfileManager component with form fields
- Profile dropdown selector
- CRUD operations (in-memory/localStorage)
- Mock profile data

**Files touched:**
- `src/renderer/components/ProfileManager.tsx` (new)
- `src/types/ai.ts` (new - UserProfile types)
- Extends aiAssistantStore

---

### tracka_3_results_display.md
**Phase 5 - Interactive Results Display** | ~4-5 hours
- Timestamp parser ({{MM:SS}} → links)
- LoadingAnalysis component
- AnalysisDisplay component
- Click timestamp → seek timeline
- Mock analysis generation

**Files touched:**
- `src/renderer/components/AnalysisDisplay.tsx` (new)
- `src/renderer/components/LoadingAnalysis.tsx` (new)
- `src/renderer/utils/timestampParser.ts` (new)
- Timeline seeking integration

**Track A Total: ~10-13 hours**

---

## Track B: Backend (Main Process Services)

**Can work independently with console testing. Zero file conflicts with Track A.**

### trackb_1_storage_infrastructure.md
**Phase 1 & 2 - Storage Infrastructure** | ~3-4 hours
- API key storage (Electron safeStorage)
- Profile storage (JSON file in userData)
- IPC handlers for both
- Update preload.ts with window.ai API

**Files touched:**
- `src/main/services/ApiKeyStorage.ts` (new)
- `src/main/services/ProfileStorage.ts` (new)
- `src/main/ipc/handlers.ts` (modify)
- `src/preload.ts` (modify)
- `src/types/window.d.ts` (new)

---

### trackb_2_audio_transcription.md
**Phase 3 - Audio Extraction & Whisper** | ~3-4 hours
- FFmpeg audio extraction
- OpenAI Whisper API integration
- Temporary file handling
- Transcription pipeline
- IPC handlers

**Files touched:**
- `src/main/services/AudioExtractor.ts` (new)
- `src/main/services/TranscriptionService.ts` (new)
- `src/main/services/VideoAnalysisService.ts` (new)
- `src/main/ipc/handlers.ts` (modify)
- `src/preload.ts` (modify)
- Install: `npm install openai`

---

### trackb_3_content_analysis.md
**Phase 4 - GPT-4 Content Analysis** | ~3-4 hours
- Prompt builder service
- GPT-4 API integration
- Full pipeline: extract → transcribe → analyze
- Progress events
- Error handling

**Files touched:**
- `src/main/services/PromptBuilder.ts` (new)
- `src/main/services/ContentAnalyzer.ts` (new)
- `src/main/services/VideoAnalysisService.ts` (modify)
- `src/main/ipc/handlers.ts` (modify)
- `src/preload.ts` (modify)

**Track B Total: ~8-12 hours**

---

## Track C: Integration

**Requires Track A AND Track B to be complete. Cannot start early.**

### trackc_integration.md
**Phase 6 - Integration & Polish** | ~10 hours
- Connect frontend UI to backend services
- Replace all mock data with real IPC calls
- Wire up API key management
- Connect profile management to file storage
- Full analysis pipeline integration
- Timestamp click → timeline seek (real)
- Error handling & edge cases
- UI polish & animations
- End-to-end testing

**Files touched:**
- All Track A components (remove mocks)
- IPC integration throughout
- Error handling utilities
- Testing and refinement

**Track C Total: ~10 hours**

---

## Execution Strategy

### Parallel Development (Fastest)
```
Track A (Frontend)     Track B (Backend)
      ↓                       ↓
  10-13 hours              8-12 hours
      ↓                       ↓
      └───────┬───────────────┘
              ↓
      Track C (Integration)
              ↓
          10 hours
```

**Total Time: ~28-35 hours with parallelization**
**Wall Clock Time: ~20-25 hours if A+B run in parallel**

### Sequential Development
If working alone or prefer one track at a time:
- **Backend-first recommended** (validate AI quality early)
- Order: Track B → Track A → Track C
- Total time: Same 28-35 hours, but longer wall clock time

---

## File Conflict Matrix

|  | Track A Files | Track B Files | Shared Files |
|---|---|---|---|
| **Track A** | ✍️ Writes | - | - |
| **Track B** | - | ✍️ Writes | - |
| **Track C** | ✍️ Modifies | ✍️ Modifies | ✍️ Integrates |

**Zero conflicts between Track A and Track B** ✅

---

## Success Criteria

### Track A Complete When:
✅ Panel opens/closes smoothly
✅ Profile UI works with mock data
✅ Analysis displays with clickable timestamps (mock)
✅ UI looks polished with loading states

### Track B Complete When:
✅ API keys stored securely
✅ Profiles persist to JSON file
✅ Audio extracts from video
✅ Whisper returns timestamped transcript
✅ GPT-4 returns natural language analysis
✅ Full pipeline works end-to-end (console tested)

### Track C Complete When:
✅ Full user flow works: import → select → analyze → view results
✅ Clicking timestamps seeks timeline correctly
✅ All errors handled gracefully
✅ UI is polished and professional
✅ Ready to ship 🚀

---

## Quick Start

**For Frontend Dev/Agent:**
```bash
cd Docs/Features/AI_Consultant
# Start with tracka_1, then tracka_2, then tracka_3
```

**For Backend Dev/Agent:**
```bash
cd Docs/Features/AI_Consultant
npm install openai
# Start with trackb_1, then trackb_2, then trackb_3
```

**For Integration Dev/Agent:**
```bash
cd Docs/Features/AI_Consultant
# Wait for Track A + B completion
# Then execute trackc_integration.md
```

---

## Related Documents

- **`aiconsul_plan.md`** - Full feature plan with architecture, UI/UX, data models
- **`tracka_*.md`** - Frontend task documents (3 files)
- **`trackb_*.md`** - Backend task documents (3 files)
- **`trackc_integration.md`** - Integration task document (1 file)

---

**Last Updated:** 2025-10-29
