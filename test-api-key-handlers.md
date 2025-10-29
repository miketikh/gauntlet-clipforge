# API Key IPC Handlers - Test Instructions

## Testing PR 1.2 - IPC Handlers

Run these commands in the DevTools console (F12 or Cmd+Option+I) while the app is running:

### Test 1: Check if API key exists (should return false initially)
```javascript
await window.ipcRenderer.invoke('ai:has-api-key')
```
Expected: `false`

### Test 2: Save an API key
```javascript
await window.ipcRenderer.invoke('ai:save-api-key', 'sk-test123')
```
Expected: `{ success: true }`

### Test 3: Check if API key exists (should return true now)
```javascript
await window.ipcRenderer.invoke('ai:has-api-key')
```
Expected: `true`

### Test 4: Retrieve the API key
```javascript
await window.ipcRenderer.invoke('ai:get-api-key')
```
Expected: `'sk-test123'`

### Test 5: Delete the API key
```javascript
await window.ipcRenderer.invoke('ai:delete-api-key')
```
Expected: `{ success: true }`

### Test 6: Verify key is deleted (should return false)
```javascript
await window.ipcRenderer.invoke('ai:has-api-key')
```
Expected: `false`

## Expected Console Logs (Main Process)

You should see these logs in the terminal where you ran `npm start`:

1. `IPC: Checking for API key...`
2. `IPC: Saving OpenAI API key...`
3. `[ApiKeyStorage] API key saved successfully (encrypted)`
4. `IPC: Checking for API key...`
5. `IPC: Retrieved API key`
6. `[ApiKeyStorage] API key retrieved successfully (first 8 chars): sk-test1`
7. `IPC: Deleted API key`
8. `[ApiKeyStorage] API key deleted successfully`

## Verification

- All 6 tests should pass
- The encrypted key file should be created at: `{userData}/ai-api-key.enc`
- After deletion, the file should be removed
- Key should persist across app restarts (restart and run Test 4 after Test 2)
