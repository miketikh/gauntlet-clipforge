import ffmpeg from 'fluent-ffmpeg';
import { app } from 'electron';
import path from 'node:path';

/**
 * Resolve FFmpeg binary path for both development and packaged app modes
 */
function resolveFfmpegPath(): string {
  if (app.isPackaged) {
    // In packaged app: use binary from resources/bin (copied by Forge hook)
    const binName = process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';
    const ffmpegPath = path.join(process.resourcesPath, 'bin', binName);
    console.log('[FFmpeg] Packaged mode - using binary from:', ffmpegPath);
    return ffmpegPath;
  } else {
    // In development: use @ffmpeg-installer/ffmpeg package
    try {
      const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
      console.log('[FFmpeg] Development mode - using installer path:', ffmpegInstaller.path);
      return ffmpegInstaller.path;
    } catch (error) {
      console.error('[FFmpeg] Failed to load @ffmpeg-installer/ffmpeg:', error);
      throw new Error('FFmpeg installer not found. Run: npm install @ffmpeg-installer/ffmpeg');
    }
  }
}

/**
 * Resolve ffprobe binary path for both development and packaged app modes
 */
function resolveFfprobePath(): string {
  if (app.isPackaged) {
    // In packaged app: use binary from resources/bin (copied by Forge hook)
    const binName = process.platform === 'win32' ? 'ffprobe.exe' : 'ffprobe';
    const ffprobePath = path.join(process.resourcesPath, 'bin', binName);
    console.log('[FFmpeg] Packaged mode - using ffprobe from:', ffprobePath);
    return ffprobePath;
  } else {
    // In development: use @ffprobe-installer/ffprobe package
    try {
      const ffprobeInstaller = require('@ffprobe-installer/ffprobe');
      console.log('[FFmpeg] Development mode - using ffprobe installer path:', ffprobeInstaller.path);
      return ffprobeInstaller.path;
    } catch (error) {
      console.error('[FFmpeg] Failed to load @ffprobe-installer/ffprobe:', error);
      throw new Error('ffprobe installer not found. Run: npm install @ffprobe-installer/ffprobe');
    }
  }
}

// Configure fluent-ffmpeg with the resolved FFmpeg and ffprobe paths
const ffmpegPath = resolveFfmpegPath();
const ffprobePath = resolveFfprobePath();

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

// Also set environment variables for fluent-ffmpeg fallback
process.env.FFMPEG_PATH = ffmpegPath;
process.env.FFPROBE_PATH = ffprobePath;

console.log('[FFmpeg] Configured FFmpeg path:', ffmpegPath);
console.log('[FFmpeg] Configured ffprobe path:', ffprobePath);

export default ffmpeg;
