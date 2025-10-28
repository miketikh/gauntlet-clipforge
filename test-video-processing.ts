/**
 * Test script for VideoProcessor FFmpeg integration
 * This script validates that FFmpeg operations work correctly
 */

import { VideoProcessor } from './src/main/services/VideoProcessor';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';

const TEST_DIR = path.join(__dirname, 'test-output');
const SAMPLE_VIDEO_PATH = path.join(TEST_DIR, 'sample-video.mp4');
const TRIMMED_VIDEO_PATH = path.join(TEST_DIR, 'trimmed-video.mp4');
const THUMBNAIL_PATH = path.join(TEST_DIR, 'thumbnail.png');

/**
 * Download a sample video file for testing
 */
async function downloadSampleVideo(): Promise<void> {
  // Create test directory if it doesn't exist
  if (!fs.existsSync(TEST_DIR)) {
    fs.mkdirSync(TEST_DIR, { recursive: true });
  }

  // If sample video already exists, skip download
  if (fs.existsSync(SAMPLE_VIDEO_PATH)) {
    console.log('✓ Sample video already exists, skipping download');
    return;
  }

  console.log('Downloading sample video...');

  // Use a small test video from a reliable source
  // This is a sample video from the Big Buck Bunny project (open source)
  const videoUrl = 'https://download.blender.org/demo/movies/BBB/bbb_sunflower_1080p_30fps_normal.mp4.zip';

  // For testing purposes, we'll create a simple test video using FFmpeg itself
  console.log('Creating a simple test video using FFmpeg...');

  const ffmpeg = require('fluent-ffmpeg');
  const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
  ffmpeg.setFfmpegPath(ffmpegInstaller.path);

  return new Promise((resolve, reject) => {
    // Create a 10-second black video with a test pattern
    ffmpeg()
      .input('color=c=blue:s=1280x720:d=10')
      .inputFormat('lavfi')
      .output(SAMPLE_VIDEO_PATH)
      .videoCodec('libx264')
      .on('end', () => {
        console.log('✓ Test video created successfully');
        resolve();
      })
      .on('error', (err: Error) => {
        console.error('Error creating test video:', err.message);
        reject(err);
      })
      .run();
  });
}

/**
 * Run all FFmpeg tests
 */
async function runTests(): Promise<void> {
  console.log('=== Starting FFmpeg Integration Tests ===\n');

  try {
    // Step 1: Download or create sample video
    console.log('Step 1: Preparing sample video...');
    await downloadSampleVideo();
    console.log();

    // Step 2: Initialize VideoProcessor
    console.log('Step 2: Initializing VideoProcessor...');
    const processor = new VideoProcessor();
    console.log('✓ VideoProcessor initialized\n');

    // Step 3: Test metadata extraction
    console.log('Step 3: Testing metadata extraction...');
    const metadata = await processor.getVideoMetadata(SAMPLE_VIDEO_PATH);
    console.log('✓ Metadata retrieved:');
    console.log(`  - Duration: ${metadata.duration.toFixed(2)} seconds`);
    console.log(`  - Resolution: ${metadata.width}x${metadata.height}`);
    console.log(`  - Codec: ${metadata.codec}`);
    console.log(`  - Format: ${metadata.format}`);
    console.log(`  - Bitrate: ${Math.round(metadata.bitrate / 1000)} kbps\n`);

    // Step 4: Test video trimming (first 5 seconds)
    console.log('Step 4: Testing video trimming (first 5 seconds)...');
    await processor.trimVideo(SAMPLE_VIDEO_PATH, TRIMMED_VIDEO_PATH, 0, 5);

    // Verify trimmed video exists and check its metadata
    if (!fs.existsSync(TRIMMED_VIDEO_PATH)) {
      throw new Error('Trimmed video file was not created');
    }

    const trimmedMetadata = await processor.getVideoMetadata(TRIMMED_VIDEO_PATH);
    console.log('✓ Video trimmed successfully');
    console.log(`  - Original duration: ${metadata.duration.toFixed(2)}s`);
    console.log(`  - Trimmed duration: ${trimmedMetadata.duration.toFixed(2)}s`);

    // Check if duration is approximately 5 seconds (allow small margin for encoding)
    if (Math.abs(trimmedMetadata.duration - 5) > 0.5) {
      console.warn(`  ⚠ Warning: Trimmed duration ${trimmedMetadata.duration.toFixed(2)}s is not close to expected 5s`);
    }
    console.log();

    // Step 5: Test thumbnail extraction
    console.log('Step 5: Testing thumbnail extraction...');
    await processor.extractThumbnail(SAMPLE_VIDEO_PATH, 2, THUMBNAIL_PATH);

    // Verify thumbnail exists
    if (!fs.existsSync(THUMBNAIL_PATH)) {
      throw new Error('Thumbnail file was not created');
    }

    const thumbnailStats = fs.statSync(THUMBNAIL_PATH);
    console.log('✓ Thumbnail extracted successfully');
    console.log(`  - File size: ${Math.round(thumbnailStats.size / 1024)}KB`);
    console.log(`  - Location: ${THUMBNAIL_PATH}\n`);

    // All tests passed
    console.log('=== All Tests Passed! ===');
    console.log(`\nTest output directory: ${TEST_DIR}`);
    console.log('You can now manually verify the generated files.');

  } catch (error) {
    console.error('\n=== Test Failed ===');
    console.error('Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Run tests
runTests();
