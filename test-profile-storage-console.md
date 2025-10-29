# ProfileStorage Console Test Instructions

Run these commands in the DevTools console when the app is running:

```javascript
// Test the ProfileStorage service via console

// 1. Get all profiles (should be empty initially)
await window.ipcRenderer.invoke('ai:get-profiles')

// 2. Create a test profile
const newProfile = await window.ipcRenderer.invoke('ai:save-profile', {
  name: 'Test Profile',
  targetAudience: 'Developers',
  contentGuidelines: 'Technical and detailed'
})
console.log('Created:', newProfile)

// 3. Get all profiles (should have 1)
await window.ipcRenderer.invoke('ai:get-profiles')

// 4. Get single profile by ID
await window.ipcRenderer.invoke('ai:get-profile', newProfile.id)

// 5. Update profile
const updated = await window.ipcRenderer.invoke('ai:update-profile', newProfile.id, {
  name: 'Updated Test Profile',
  targetAudience: 'All audiences'
})
console.log('Updated:', updated)

// 6. Verify update
await window.ipcRenderer.invoke('ai:get-profile', newProfile.id)

// 7. Delete profile
await window.ipcRenderer.invoke('ai:delete-profile', newProfile.id)

// 8. Verify deletion
await window.ipcRenderer.invoke('ai:get-profiles')
```

NOTE: These IPC handlers will be created in PR 2.2. For now, we're just testing the service exists and compiles.
