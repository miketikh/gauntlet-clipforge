# Testing window.ai API

This document provides manual testing steps for the `window.ai` API exposed in PR 2.3.

## Prerequisites

1. Start the app: `npm start`
2. Open DevTools (View > Toggle Developer Tools or Cmd+Option+I)
3. Navigate to the Console tab

## Test Commands

Run these commands in the DevTools console:

### Test API Key Operations

```javascript
// 1. Save an API key
await window.ai.saveApiKey('sk-test123456789')
// Expected: { success: true }

// 2. Check if API key exists
await window.ai.hasApiKey()
// Expected: true

// 3. Retrieve the API key
await window.ai.getApiKey()
// Expected: 'sk-test123456789'

// 4. Delete the API key
await window.ai.deleteApiKey()
// Expected: { success: true }

// 5. Verify deletion
await window.ai.hasApiKey()
// Expected: false
```

### Test Profile Operations

```javascript
// 1. Create a new profile
const profile = await window.ai.saveProfile({
  name: 'Tech Tutorial Creator',
  targetAudience: 'Beginner developers',
  contentGuidelines: 'Use simple language, avoid jargon, include code examples'
})
// Expected: Returns profile object with id, createdAt, updatedAt

// 2. Store the profile ID for next tests
const profileId = profile.id

// 3. Get all profiles
await window.ai.getProfiles()
// Expected: Array with 1 profile

// 4. Get single profile by ID
await window.ai.getProfile(profileId)
// Expected: Returns the profile object

// 5. Update the profile
await window.ai.updateProfile(profileId, {
  name: 'Advanced Tech Tutorial Creator',
  contentGuidelines: 'Include advanced concepts and best practices'
})
// Expected: Returns updated profile with new updatedAt timestamp

// 6. Delete the profile
await window.ai.deleteProfile(profileId)
// Expected: { success: true }

// 7. Verify deletion
await window.ai.getProfiles()
// Expected: Empty array []
```

### Test TypeScript Autocomplete

Type `window.ai.` in the console and verify that you see:
- saveApiKey
- getApiKey
- hasApiKey
- deleteApiKey
- getProfiles
- getProfile
- saveProfile
- updateProfile
- deleteProfile

## Persistence Testing

1. Create an API key and profile using the commands above
2. Close the app (Cmd+Q)
3. Restart the app: `npm start`
4. Open DevTools console
5. Run: `await window.ai.hasApiKey()` - should return `true`
6. Run: `await window.ai.getProfiles()` - should return the profile you created

## File System Verification

Check that encrypted files are created:

```bash
# On macOS
ls -la ~/Library/Application\ Support/ClipForge/
```

You should see:
- `ai-api-key.enc` - Encrypted API key file
- `ai-profiles.json` - Profiles JSON file

## Expected Behavior

All operations should:
- Return promises (use `await`)
- Log IPC messages in the main console (visible if running via terminal)
- Handle errors gracefully
- Persist data across app restarts

## Troubleshooting

**Error: "window.ai is undefined"**
- Ensure the app has fully loaded
- Check that preload.ts is being executed
- Verify contextIsolation is false in main.ts

**Error: "No handler registered for 'ai:xxx'"**
- Check that handlers.ts has all IPC handlers registered
- Verify main.ts calls registerIpcHandlers()

**Data not persisting**
- Check userData directory exists
- Verify file permissions
- Check console for file I/O errors
