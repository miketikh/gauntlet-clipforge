import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';

// Set FFmpeg binary path from @ffmpeg-installer
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

// Note: @ffmpeg-installer/ffmpeg includes ffprobe, but we need to extract it
// For now, we rely on fluent-ffmpeg's default ffprobe detection
// If issues arise, we can add @ffprobe-installer/ffprobe package

export default ffmpeg;
