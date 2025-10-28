import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerRpm } from '@electron-forge/maker-rpm';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { FuseV1Options, FuseVersion } from '@electron/fuses';
import fs from 'node:fs';
import path from 'node:path';

const config: ForgeConfig = {
  packagerConfig: {
    // Enable ASAR but unpack binaries so they're executable
    asar: {
      unpack: '{bin/**,**/*.{node,dll,exe,so,dylib}}'
    },
  },
  rebuildConfig: {},
  hooks: {
    // Copy FFmpeg and ffprobe binaries to resources/bin during packaging
    packageAfterCopy: async (_config, buildPath, _electronVersion, platform) => {
      console.log('[packageAfterCopy] Starting FFmpeg/ffprobe binary copy...');
      console.log('[packageAfterCopy] Build path:', buildPath);
      console.log('[packageAfterCopy] Platform:', platform);

      // Get the FFmpeg binary path from @ffmpeg-installer/ffmpeg
      let ffmpegPath: string;
      let ffprobePath: string;

      try {
        const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
        ffmpegPath = ffmpegInstaller.path;
        console.log('[packageAfterCopy] Found FFmpeg at:', ffmpegPath);
      } catch (error) {
        console.error('[packageAfterCopy] Failed to locate FFmpeg installer:', error);
        throw new Error('FFmpeg installer not found. Run: npm install @ffmpeg-installer/ffmpeg');
      }

      try {
        const ffprobeInstaller = require('@ffprobe-installer/ffprobe');
        ffprobePath = ffprobeInstaller.path;
        console.log('[packageAfterCopy] Found ffprobe at:', ffprobePath);
      } catch (error) {
        console.error('[packageAfterCopy] Failed to locate ffprobe installer:', error);
        throw new Error('ffprobe installer not found. Run: npm install @ffprobe-installer/ffprobe');
      }

      // Determine the resources path (parent of buildPath)
      const resourcesPath = path.dirname(buildPath);
      const binDir = path.join(resourcesPath, 'bin');

      console.log('[packageAfterCopy] Creating bin directory at:', binDir);
      await fs.promises.mkdir(binDir, { recursive: true });

      // Copy FFmpeg binary with platform-appropriate name
      const ffmpegName = platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';
      const ffmpegDest = path.join(binDir, ffmpegName);
      console.log('[packageAfterCopy] Copying FFmpeg binary to:', ffmpegDest);
      await fs.promises.copyFile(ffmpegPath, ffmpegDest);

      // Copy ffprobe binary with platform-appropriate name
      const ffprobeName = platform === 'win32' ? 'ffprobe.exe' : 'ffprobe';
      const ffprobeDest = path.join(binDir, ffprobeName);
      console.log('[packageAfterCopy] Copying ffprobe binary to:', ffprobeDest);
      await fs.promises.copyFile(ffprobePath, ffprobeDest);

      // Make binaries executable on Unix platforms
      if (platform !== 'win32') {
        await fs.promises.chmod(ffmpegDest, 0o755);
        await fs.promises.chmod(ffprobeDest, 0o755);
        console.log('[packageAfterCopy] Set executable permissions on both binaries');
      }

      console.log('[packageAfterCopy] FFmpeg and ffprobe binaries copied successfully!');
    },
  },
  makers: [
    new MakerSquirrel({}),
    new MakerZIP({}, ['darwin']),
    new MakerRpm({}),
    new MakerDeb({}),
  ],
  plugins: [
    new VitePlugin({
      // `build` can specify multiple entry builds, which can be Main process, Preload scripts, Worker process, etc.
      // If you are familiar with Vite configuration, it will look really familiar.
      build: [
        {
          // `entry` is just an alias for `build.lib.entry` in the corresponding file of `config`.
          entry: 'src/main.ts',
          config: 'vite.main.config.mjs',
          target: 'main',
        },
        {
          entry: 'src/preload.ts',
          config: 'vite.preload.config.mjs',
          target: 'preload',
        },
      ],
      renderer: [
        {
          name: 'main_window',
          config: 'vite.renderer.config.mjs',
        },
      ],
    }),
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};

export default config;
