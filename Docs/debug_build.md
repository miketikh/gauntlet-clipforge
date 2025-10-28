# FFmpeg Build Packaging Issue - Debug Notes

## Problem
App builds successfully but crashes when launched from packaged `.app` with "ffmpeg can't be found" error on M1 Mac.

## Root Cause
**Electron Forge 7.5.0+ Bug**: External dependencies marked in Vite's `rollupOptions.external` are not copied to the packaged app.

- GitHub Issues: #3738, #3917
- When dependencies are externalized in Vite config, Vite doesn't bundle them (correct)
- BUT Electron Forge 7.5.0+ fails to copy those external dependencies to the package
- Result: **NO `node_modules` folder in packaged app** - only `.vite/` and `package.json`

## Current Configuration

### Dependencies
- `ffmpeg-static` (production dependency)
- Marked as `external` in `vite.main.config.mjs`

### Forge Config (`forge.config.ts`)
```typescript
packagerConfig: {
  asar: false,  // Disabled to work around bug
}
// AutoUnpackNativesPlugin removed (requires ASAR)
```

### Package Structure (Current - BROKEN)
```
videojarvis.app/Contents/Resources/app/
├── .vite/           # Vite build output
└── package.json     # Package metadata
# ❌ NO node_modules/ folder!
```

## What We Tried

### 1. ASAR Unpacking (FAILED)
- **Tried**: `asar: { unpack: '**/node_modules/ffmpeg-static/**/*' }`
- **Result**: `app.asar.unpacked` folder never created
- **Why**: Forge 7.5.0+ doesn't copy externals before ASAR packing

### 2. Switched from @ffmpeg-installer/ffmpeg to ffmpeg-static (FAILED)
- **Reason**: ffmpeg-static supposedly has better bundler support
- **Result**: Same issue - not copied to package

### 3. AutoUnpackNativesPlugin (FAILED)
- **Tried**: Added plugin to unpack native modules
- **Result**: Requires `asar: true` or ASAR object, conflicts with workaround

### 4. Disabled ASAR (CURRENT - PARTIAL)
- **Status**: Build succeeds, but still missing node_modules
- **Issue**: Even without ASAR, Forge 7.5.0+ doesn't copy external deps

## Solutions (Untested)

### Option 1: Downgrade to Electron Forge 7.4.0
Last version before the bug was introduced.

**Implementation:**
```bash
npm install --save-dev \
  @electron-forge/cli@7.4.0 \
  @electron-forge/maker-deb@7.4.0 \
  @electron-forge/maker-rpm@7.4.0 \
  @electron-forge/maker-squirrel@7.4.0 \
  @electron-forge/maker-zip@7.4.0 \
  @electron-forge/plugin-vite@7.4.0 \
  @electron-forge/plugin-fuses@7.4.0 \
  @electron-forge/plugin-auto-unpack-natives@7.4.0
```

### Option 2: packageAfterPrune Hook
Manually reinstall external dependencies during packaging.

**Implementation:** Add to `forge.config.ts`:
```typescript
hooks: {
  packageAfterPrune: async (config, buildPath) => {
    const { execSync } = require('child_process');
    const path = require('path');

    console.log('Reinstalling external dependencies...');

    // Install only ffmpeg-static
    execSync('npm install --production ffmpeg-static', {
      cwd: buildPath,
      stdio: 'inherit'
    });
  }
}
```

### Option 3: Copy Manually via extraResource (NOT RECOMMENDED)
Use `packagerConfig.extraResource` to copy ffmpeg binary directly, but requires hardcoded paths.

## Recommended Next Step
**Try Option 1 first** (downgrade to 7.4.0) - safest, proven to work.

If that fails or causes other issues, implement Option 2 (packageAfterPrune hook).

## Key Files Modified
- `vite.main.config.mjs` - externalized ffmpeg-static
- `forge.config.ts` - disabled ASAR, removed AutoUnpackNatives
- `src/main/utils/ffmpegConfig.ts` - switched to ffmpeg-static
- `src/main/services/VideoProcessor.ts` - updated import

## Verification Commands
```bash
# After packaging:
ls -la "out/videojarvis-darwin-arm64/videojarvis.app/Contents/Resources/app/"
# Should see node_modules/ folder

find "out/videojarvis-darwin-arm64" -name "ffmpeg-static" -type d
# Should find the package

# Test the packaged app
open "out/videojarvis-darwin-arm64/videojarvis.app"
# Check console for FFmpeg path log
```
