# Audio Support Tasks - Index

This document has been split into 5 manageable parts for easier navigation and AI context management.

---

## Document Structure

### **Part 1: Core Architecture (Groups A-B)**
**File:** [audio_support_tasks_part1.md](./audio_support_tasks_part1.md)
**Lines:** ~556 | **Priority:** Critical | **Time:** 4-6 hours

**Contents:**
- Context and project overview
- Instructions for AI agents
- **Group A: Fix Video Player Bugs** (BLOCKING)
  - Task A1: Refactor TimelinePlayer to accept external video element
  - Task A2: Update Preview to pass video element
  - Task A3: Remove onClipChange callback (cleanup)
- **Group B: Data Model Foundation**
  - Task B1: Add MediaType enum and update MediaFile
  - Task B2: Add audio properties to TimelineClip
  - Task B3: Add TrackType enum and update Track
  - Task B4: Add transcript storage to Project
  - Task B5: Create migration utility

---

### **Part 2: Audio Track Support (Groups C-D)**
**File:** [audio_support_tasks_part2.md](./audio_support_tasks_part2.md)
**Lines:** ~530 | **Priority:** Critical | **Time:** 5-6 hours

**Contents:**
- **Group C: Audio Track Support**
  - Task C1: Update Timeline UI to show track types ✅
  - Task C2: Enable audio file import (MP3, WAV) ✅
  - Task C3: Update TimelinePlayer to handle audio-only clips ✅
  - Task C4: Implement basic mute/volume in playback
- **Group D: ProjectStore Actions**
  - Task D1: Add transcript management actions
  - Task D2: Add cut range management actions
  - Task D3: Add audio control actions

**>> Last progress:** Completed C1-C3. Audio import working, track types display correctly (🎬 Video, 🎵 Audio). Fixed getAudioMetadata() for proper audio file handling. createProject() now creates VIDEO + AUDIO tracks. Next: C4 (mute/volume), then D1-D3 in parallel.

---

### **Part 3: Waveform Support (Groups E-F)**
**File:** [audio_support_tasks_part3.md](./audio_support_tasks_part3.md)
**Lines:** ~540 | **Priority:** Secondary | **Time:** 6-7 hours

**Contents:**
- **Group E: Waveform Support**
  - Task E1: Create WaveformExtractor service (Web Audio API)
  - Task E2: Extract waveform during media import
  - Task E3: Render waveforms on timeline clips
- **Group F: Multiple Audio Tracks UI**
  - Task F1: Add "Add Audio Track" button
  - Task F2: Enable drag-and-drop to audio tracks
  - Task F3: Update Timeline to show multiple audio tracks

---

### **Part 4: Advanced Audio Features (Groups G-H)**
**File:** [audio_support_tasks_part4.md](./audio_support_tasks_part4.md)
**Lines:** ~514 | **Priority:** Secondary | **Time:** 8-10 hours

**Contents:**
- **Group G: Web Audio API Integration**
  - Task G1: Create AudioMixer service (advanced mixing)
  - Task G2: Integrate AudioMixer with TimelinePlayer
- **Group H: Advanced Audio Controls**
  - Task H1: Add volume slider to timeline clips
  - Task H2: Add track-level mute/solo buttons
  - Task H3: Add fade in/out duration controls

---

### **Part 5: Export & Summary (Group I)**
**File:** [audio_support_tasks_part5.md](./audio_support_tasks_part5.md)
**Lines:** ~274 | **Priority:** Secondary | **Time:** 4-5 hours

**Contents:**
- **Group I: Export with Cut Ranges**
  - Task I1: Generate FFmpeg filter for cut ranges
  - Task I2: Apply cut range filters during export
- **Summary Section**
  - Total time estimates
  - Implementation order
  - Success metrics
- **Related Documents**

---

## Quick Navigation

### By Priority

**Critical Path (Must Complete First):**
1. [Part 1: Groups A-B](./audio_support_tasks_part1.md) - Fix bugs + data models
2. [Part 2: Groups C-D](./audio_support_tasks_part2.md) - Audio track support + store actions

**Enhancements (After Critical Path):**
3. [Part 3: Groups E-F](./audio_support_tasks_part3.md) - Waveform support + multi-track UI
4. [Part 4: Groups G-H](./audio_support_tasks_part4.md) - Web Audio API + advanced controls
5. [Part 5: Group I](./audio_support_tasks_part5.md) - Export features + summary

### By Feature Area

**Playback Bug Fixes:**
- [Part 1, Group A](./audio_support_tasks_part1.md#group-a-fix-video-player-bugs-blocking-all-other-work)

**Data Model & State Management:**
- [Part 1, Group B](./audio_support_tasks_part1.md#group-b-data-model-foundation)
- [Part 2, Group D](./audio_support_tasks_part2.md#group-d-projectstore-audio-actions)

**Timeline UI & Playback:**
- [Part 2, Group C](./audio_support_tasks_part2.md#group-c-audio-track-support-in-timeline)
- [Part 3, Group F](./audio_support_tasks_part3.md#group-f-multiple-audio-tracks-ui)

**Audio Processing:**
- [Part 3, Group E](./audio_support_tasks_part3.md#group-e-waveform-support)
- [Part 4, Group G](./audio_support_tasks_part4.md#group-g-web-audio-api-integration-advanced)

**User Controls:**
- [Part 4, Group H](./audio_support_tasks_part4.md#group-h-advanced-audio-controls-polish)

**Export & Processing:**
- [Part 5, Group I](./audio_support_tasks_part5.md#group-i-export-with-cut-ranges-advanced)

---

## Execution Flow

### Part 2: Groups C-D

**Group C (Sequential):**
1. C1: Update Timeline UI → C2: Enable audio import → C3: Handle audio clips → C4: Mute/volume

**Group D (Parallel after C):**
- D1, D2, D3 run simultaneously (all modify projectStore independently)

**Recommended:**
- Execute C1 → C2 → C3 → C4 sequentially
- After C4 complete, launch D1 + D2 + D3 in parallel
- **Time saved:** ~1-1.5 hours via parallelization

---

## Total Effort Estimate

- **Core Tasks (Priority 1):** 9-11 hours
- **Secondary Tasks (Priority 2):** 18-22 hours
- **Total:** 27-33 hours

---

## Implementation Strategy

### Phase 1: Foundation (Parts 1-2)
Complete all critical path tasks before moving to enhancements. These tasks fix existing bugs and establish the data model for audio features.

**Estimated Time:** 9-11 hours

### Phase 2: Enhancements (Parts 3-5)
Add visual and advanced features after foundation is stable. These can be implemented in any order based on priority.

**Estimated Time:** 18-22 hours

---

## Related Documents

- [Enhanced App with Audio Plan](../enhanced_app_with_audio_plan.md) - High-level architecture overview
- [Product PRD](../../product_prd.md) - Product requirements
- [Fix Timeline Issues](../../Bugs/fix_timeline_issues.md) - Current bug analysis
- [Project Guidelines](../../../CLAUDE.md) - Development standards

---

**Last Updated:** October 28, 2025
**Document Version:** 1.0 (Split from original 2416-line document)
