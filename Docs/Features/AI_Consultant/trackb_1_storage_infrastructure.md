# AI Consultant - Track B: Storage Infrastructure (Phase 1 & 2)

**Track:** B (Backend/Main Process)
**Contains:** Phase 1 (API Key Storage) + Phase 2 (Profile Storage)
**Next Document:** [Track B2: Audio Transcription](./trackb_2_audio_transcription.md)
**Main Plan:** [AI Consultant Plan](./aiconsul_plan.md)

---

# AI Consultant Backend - Storage Infrastructure Tasks

## Context

The AI Consultant feature enables users to analyze video clips using OpenAI's Whisper (transcription) and GPT-4 (content analysis) APIs. Before we can transcribe or analyze content, we need secure storage for API keys and a simple file-based system for user-defined content profiles.

This document covers **Track B's foundation**: secure API key storage and profile management. All work happens in the Electron main process - no UI components. Track A (UI) will consume these services via IPC handlers.

**Key Architectural Decisions:**
- **API Keys:** Use Electron's `safeStorage` API for OS-level encryption (Keychain on macOS, DPAPI on Windows)
- **Profiles:** Store as JSON file in Electron's userData directory
- **IPC Communication:** Expose operations through well-defined IPC handlers
- **Security:** API keys never exposed directly to renderer process

## Instructions for AI Agent

**Standard Workflow:**
1. Read all files mentioned in each PR before making changes
2. Implement tasks in order (top to bottom within each PR)
3. Mark tasks complete with `[x]` after verification
4. Test with console.log after each PR (no UI testing in Track B)
5. Provide completion summary before moving to next PR
6. Wait for approval before starting next PR

**Critical Guidelines:**
- This is Track B (backend only) - test everything with console.log
- No UI components - all testing via IPC calls or main process logs
- Follow existing IPC handler patterns in `/Users/Gauntlet/gauntlet/videojarvis/src/main/ipc/handlers.ts`
- Always clean up resources (file handles, etc.)

---

## Phase 1: API Key Storage (Secure Encryption)

**Estimated Time:** 2-3 hours

This phase implements secure API key storage using Electron's safeStorage API, which provides OS-level encryption.

### PR 1.1: Create API Key Storage Service

**Goal:** Implement secure API key storage service using Electron safeStorage

**Tasks:**
- [x] Read `/Users/Gauntlet/gauntlet/videojarvis/src/main/ipc/handlers.ts` to understand IPC handler patterns
- [x] Read `/Users/Gauntlet/gauntlet/videojarvis/src/preload.ts` to understand current IPC exposure
- [x] Create NEW: `/Users/Gauntlet/gauntlet/videojarvis/src/main/services/ApiKeyStorage.ts` with:
  - Import `safeStorage` and `app` from 'electron'
  - Create class `ApiKeyStorage` with methods:
    - `saveApiKey(key: string): Promise<void>` - Encrypt and store key
    - `getApiKey(): Promise<string | null>` - Retrieve and decrypt key
    - `hasApiKey(): Promise<boolean>` - Check if key exists
    - `deleteApiKey(): Promise<void>` - Remove stored key
  - Store encrypted key at `{app.getPath('userData')}/ai-api-key.enc`
  - Use `safeStorage.encryptString()` to encrypt
  - Use `safeStorage.decryptString()` to decrypt
  - Handle cases where safeStorage is not available (Linux without keyring)
- [x] Add error handling for encryption failures
- [x] Export singleton instance: `export const apiKeyStorage = new ApiKeyStorage();`

**What to Test:**
1. Import the service in main.ts temporarily
2. Call `saveApiKey('test-key-123')` - verify file created in userData
3. Call `hasApiKey()` - verify returns true
4. Call `getApiKey()` - verify returns 'test-key-123'
5. Restart app - verify key persists and decrypts correctly
6. Call `deleteApiKey()` - verify file removed

**Files Changed:**
- NEW: `/Users/Gauntlet/gauntlet/videojarvis/src/main/services/ApiKeyStorage.ts` - Secure key storage with safeStorage

**Notes:**
- On macOS, this uses Keychain (most secure)
- On Windows, this uses DPAPI
- On Linux without keyring, may fall back to less secure storage (document in error)
- Never log actual API keys - use `key.substring(0, 8)` for debugging

---

### PR 1.2: Add API Key IPC Handlers

**Goal:** Expose API key operations to renderer process via IPC

**Tasks:**
- [x] Read `/Users/Gauntlet/gauntlet/videojarvis/src/main/services/ApiKeyStorage.ts` (just created)
- [x] Update `/Users/Gauntlet/gauntlet/videojarvis/src/main/ipc/handlers.ts`:
  - Import `apiKeyStorage` from '../services/ApiKeyStorage'
  - Add handler `ai:save-api-key`:
    - Receives API key string from renderer
    - Calls `apiKeyStorage.saveApiKey(key)`
    - Returns `{ success: true }` or throws error
    - Log: "IPC: Saving OpenAI API key..."
  - Add handler `ai:get-api-key`:
    - Calls `apiKeyStorage.getApiKey()`
    - Returns the decrypted key or null
    - Log: "IPC: Retrieved API key" (don't log actual key)
  - Add handler `ai:has-api-key`:
    - Calls `apiKeyStorage.hasApiKey()`
    - Returns boolean
    - Log: "IPC: Checking for API key..."
  - Add handler `ai:delete-api-key`:
    - Calls `apiKeyStorage.deleteApiKey()`
    - Returns `{ success: true }`
    - Log: "IPC: Deleted API key"
- [x] Follow existing error handling patterns (try/catch with descriptive errors)

**What to Test:**
1. Open DevTools console in running app
2. Call: `window.ipcRenderer.invoke('ai:save-api-key', 'sk-test123')` - verify success
3. Call: `window.ipcRenderer.invoke('ai:has-api-key')` - verify returns true
4. Call: `window.ipcRenderer.invoke('ai:get-api-key')` - verify returns 'sk-test123'
5. Call: `window.ipcRenderer.invoke('ai:delete-api-key')` - verify success
6. Call: `window.ipcRenderer.invoke('ai:has-api-key')` - verify returns false

**Files Changed:**
- `/Users/Gauntlet/gauntlet/videojarvis/src/main/ipc/handlers.ts` - Add 4 new AI key IPC handlers

**Notes:**
- Renderer can retrieve the key, but it's only used for display purposes
- Main process will use the key for actual API calls (coming in Phase 3-4)
- Consider security: renderer is technically privileged in this app (contextIsolation: false)

---

## Phase 2: Profile Storage (JSON File Persistence)

**Estimated Time:** 2-3 hours

This phase implements simple file-based profile storage for user-defined content analysis profiles.

### PR 2.1: Create Profile Storage Service

**Goal:** Implement file-based profile storage as JSON

**Tasks:**
- [x] Read `/Users/Gauntlet/gauntlet/videojarvis/src/main/services/ApiKeyStorage.ts` for patterns
- [x] Create NEW: `/Users/Gauntlet/gauntlet/videojarvis/src/types/ai.ts` with:
  - Define interface:
    ```typescript
    export interface UserProfile {
      id: string;
      name: string;
      targetAudience: string;
      contentGuidelines: string;
      createdAt: string;  // ISO date string
      updatedAt: string;  // ISO date string
    }
    ```
- [x] Create NEW: `/Users/Gauntlet/gauntlet/videojarvis/src/main/services/ProfileStorage.ts` with:
  - Import `fs`, `path`, and `app` from required modules
  - Import `UserProfile` from '../../types/ai'
  - Create class `ProfileStorage` with methods:
    - `getAllProfiles(): Promise<UserProfile[]>` - Load all profiles from file
    - `getProfile(id: string): Promise<UserProfile | null>` - Get single profile
    - `saveProfile(profile: Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt'>): Promise<UserProfile>` - Add new profile
    - `updateProfile(id: string, updates: Partial<Omit<UserProfile, 'id'>>): Promise<UserProfile>` - Update existing
    - `deleteProfile(id: string): Promise<void>` - Remove profile
  - Store profiles at `{app.getPath('userData')}/ai-profiles.json`
  - Generate IDs using `crypto.randomUUID()` or `Date.now().toString(36)`
  - Load file on first access, keep in-memory cache
  - Write to file after every change (simple approach for 72-hour project)
  - Create file with empty array `[]` if doesn't exist
- [x] Add error handling for file I/O failures
- [x] Export singleton instance: `export const profileStorage = new ProfileStorage();`

**What to Test:**
1. Import service in main.ts temporarily
2. Call `getAllProfiles()` - verify returns empty array initially
3. Call `saveProfile({ name: 'Test', targetAudience: 'Developers', contentGuidelines: 'Technical' })` - verify returns profile with ID and timestamps
4. Call `getAllProfiles()` - verify returns 1 profile
5. Restart app - verify profile persists
6. Call `updateProfile(id, { name: 'Updated Test' })` - verify name changed, updatedAt updated
7. Call `deleteProfile(id)` - verify profile removed

**Files Changed:**
- NEW: `/Users/Gauntlet/gauntlet/videojarvis/src/types/ai.ts` - Profile data structure
- NEW: `/Users/Gauntlet/gauntlet/videojarvis/src/main/services/ProfileStorage.ts` - Profile CRUD operations

**Notes:**
- Simple JSON file approach is fine for demo project (no need for SQLite)
- Keep in-memory cache to avoid repeated file reads
- Write-through strategy (save to file immediately) prevents data loss
- Could optimize later with debounced writes if performance is an issue

---

### PR 2.2: Add Profile Management IPC Handlers

**Goal:** Expose profile operations to renderer process via IPC

**Tasks:**
- [x] Read `/Users/Gauntlet/gauntlet/videojarvis/src/main/services/ProfileStorage.ts` (just created)
- [x] Read `/Users/Gauntlet/gauntlet/videojarvis/src/types/ai.ts` for UserProfile type
- [x] Update `/Users/Gauntlet/gauntlet/videojarvis/src/main/ipc/handlers.ts`:
  - Import `profileStorage` from '../services/ProfileStorage'
  - Import `UserProfile` from '../../types/ai'
  - Add handler `ai:get-profiles`:
    - Calls `profileStorage.getAllProfiles()`
    - Returns array of profiles
    - Log: "IPC: Loading AI profiles..."
  - Add handler `ai:get-profile`:
    - Receives profile ID
    - Calls `profileStorage.getProfile(id)`
    - Returns profile or null
    - Log: "IPC: Loading profile {id}"
  - Add handler `ai:save-profile`:
    - Receives partial profile (name, targetAudience, contentGuidelines)
    - Calls `profileStorage.saveProfile(data)`
    - Returns complete profile with ID
    - Log: "IPC: Saving new profile: {name}"
  - Add handler `ai:update-profile`:
    - Receives profile ID and updates object
    - Calls `profileStorage.updateProfile(id, updates)`
    - Returns updated profile
    - Log: "IPC: Updating profile {id}"
  - Add handler `ai:delete-profile`:
    - Receives profile ID
    - Calls `profileStorage.deleteProfile(id)`
    - Returns `{ success: true }`
    - Log: "IPC: Deleted profile {id}"
- [x] Follow existing error handling patterns (try/catch)

**What to Test:**
1. Open DevTools console
2. Call: `window.ipcRenderer.invoke('ai:save-profile', { name: 'Tech Tutorial', targetAudience: 'Beginners', contentGuidelines: 'Simple language' })` - verify returns profile with ID
3. Store the returned profile ID
4. Call: `window.ipcRenderer.invoke('ai:get-profiles')` - verify returns array with 1 profile
5. Call: `window.ipcRenderer.invoke('ai:get-profile', profileId)` - verify returns matching profile
6. Call: `window.ipcRenderer.invoke('ai:update-profile', profileId, { name: 'Updated Tutorial' })` - verify name updated
7. Call: `window.ipcRenderer.invoke('ai:delete-profile', profileId)` - verify success
8. Call: `window.ipcRenderer.invoke('ai:get-profiles')` - verify returns empty array

**Files Changed:**
- `/Users/Gauntlet/gauntlet/videojarvis/src/main/ipc/handlers.ts` - Add 5 new profile IPC handlers

**Notes:**
- These handlers will be consumed by Track A's ProfileManager UI component
- Validation could be added (e.g., require non-empty name) but keep simple for MVP
- Consider adding a "default profile" concept if user wants quick access

---

### PR 2.3: Update Preload to Expose AI APIs

**Goal:** Make AI IPC calls available as typed API in renderer

**Tasks:**
- [x] Read `/Users/Gauntlet/gauntlet/videojarvis/src/preload.ts` (current implementation)
- [x] Update `/Users/Gauntlet/gauntlet/videojarvis/src/preload.ts`:
  - Note: Currently using `(window as any).ipcRenderer = ipcRenderer` with contextIsolation: false
  - Add typed API object for AI features:
    ```typescript
    (window as any).ai = {
      // API Key operations
      saveApiKey: (key: string) => ipcRenderer.invoke('ai:save-api-key', key),
      getApiKey: () => ipcRenderer.invoke('ai:get-api-key'),
      hasApiKey: () => ipcRenderer.invoke('ai:has-api-key'),
      deleteApiKey: () => ipcRenderer.invoke('ai:delete-api-key'),

      // Profile operations
      getProfiles: () => ipcRenderer.invoke('ai:get-profiles'),
      getProfile: (id: string) => ipcRenderer.invoke('ai:get-profile', id),
      saveProfile: (data: any) => ipcRenderer.invoke('ai:save-profile', data),
      updateProfile: (id: string, updates: any) => ipcRenderer.invoke('ai:update-profile', id, updates),
      deleteProfile: (id: string) => ipcRenderer.invoke('ai:delete-profile', id),
    };
    ```
- [x] Create NEW: `/Users/Gauntlet/gauntlet/videojarvis/src/types/window.d.ts` (if doesn't exist) or update existing:
  - Add TypeScript declarations for window.ai:
    ```typescript
    import { UserProfile } from './ai';

    declare global {
      interface Window {
        ai: {
          // API Key operations
          saveApiKey: (key: string) => Promise<{ success: boolean }>;
          getApiKey: () => Promise<string | null>;
          hasApiKey: () => Promise<boolean>;
          deleteApiKey: () => Promise<{ success: boolean }>;

          // Profile operations
          getProfiles: () => Promise<UserProfile[]>;
          getProfile: (id: string) => Promise<UserProfile | null>;
          saveProfile: (data: Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt'>) => Promise<UserProfile>;
          updateProfile: (id: string, updates: Partial<Omit<UserProfile, 'id'>>) => Promise<UserProfile>;
          deleteProfile: (id: string) => Promise<{ success: boolean }>;
        };
      }
    }
    ```

**What to Test:**
1. Build project: `npm start`
2. Open DevTools console
3. Call: `window.ai.saveApiKey('test-key')` - verify TypeScript autocomplete works
4. Call: `window.ai.hasApiKey()` - verify returns true
5. Call: `await window.ai.saveProfile({ name: 'Test', targetAudience: 'All', contentGuidelines: 'None' })` - verify works
6. Call: `window.ai.getProfiles()` - verify returns profiles array
7. Verify no TypeScript errors in renderer code when using window.ai

**Files Changed:**
- `/Users/Gauntlet/gauntlet/videojarvis/src/preload.ts` - Add window.ai API object
- NEW or UPDATE: `/Users/Gauntlet/gauntlet/videojarvis/src/types/window.d.ts` - TypeScript declarations for window.ai

**Notes:**
- This provides a cleaner API than calling ipcRenderer directly
- Track A (UI) will use `window.ai.*` methods to access storage
- Could enhance with more specific types later (validation, etc.)
- Since contextIsolation is false, this is straightforward - would need contextBridge if hardening security

---

## Completion Checklist

**Phase 1 Complete When:**
- ✓ API keys can be saved, retrieved, and deleted
- ✓ Keys are encrypted using safeStorage
- ✓ Keys persist across app restarts
- ✓ IPC handlers work from DevTools console
- ✓ No plain-text keys visible in userData directory

**Phase 2 Complete When:**
- ✓ Profiles can be created with name, audience, guidelines
- ✓ Profiles persist to JSON file
- ✓ Profiles can be retrieved, updated, and deleted
- ✓ IPC handlers work from DevTools console
- ✓ window.ai API is typed and accessible in renderer

**Track B Phase 1 & 2 Summary:**
At this point, all storage infrastructure is complete. Track A can build the UI components (API key settings, profile manager) while Track B continues with Phase 3 (Audio Transcription) in the next document.

---

## Next Steps

**For Track B:**
Continue to [Track B2: Audio Transcription](./trackb_2_audio_transcription.md) to implement FFmpeg audio extraction and Whisper API integration.

**For Track A:**
Can now start building UI components that use `window.ai` APIs for settings and profile management.

**Integration Testing:**
Once Track A has basic UI, test the full flow:
1. Enter API key in settings UI
2. Create a profile with name/audience/guidelines
3. Verify data persists across app restarts
4. Verify profiles appear in dropdown selector
