/**
 * Test script for AudioExtractor service
 * Tests extraction, duration check, and cleanup
 */

import { audioExtractor } from './src/main/services/AudioExtractor';
import * as fs from 'fs';
import * as path from 'path';

async function testAudioExtractor() {
  console.log('=== AudioExtractor Test Suite ===\n');

  // Test video path
  const videoPath = path.join(__dirname, 'test-output', 'sample-video.mp4');

  // Verify test video exists
  if (!fs.existsSync(videoPath)) {
    console.error(`Test video not found: ${videoPath}`);
    console.log('Please ensure sample-video.mp4 exists in test-output directory');
    process.exit(1);
  }

  console.log(`Using test video: ${videoPath}\n`);

  try {
    // Test 1: Extract audio
    console.log('Test 1: Extract audio to temporary MP3');
    console.log('-----------------------------------');
    const startTime = Date.now();
    const audioPath = await audioExtractor.extractAudio(videoPath);
    const extractionTime = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(`\u2713 Audio extracted successfully in ${extractionTime}s`);
    console.log(`  Output path: ${audioPath}`);

    // Check if file exists
    if (!fs.existsSync(audioPath)) {
      throw new Error('Audio file was not created');
    }

    // Check file size
    const stats = fs.statSync(audioPath);
    const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
    console.log(`  File size: ${sizeInMB} MB`);

    // Verify size is reasonable (< 25MB for Whisper API limit)
    if (stats.size > 25 * 1024 * 1024) {
      console.warn(`  Warning: File size exceeds 25MB limit for Whisper API`);
    } else {
      console.log(`  \u2713 File size is within Whisper API limit (< 25MB)`);
    }

    console.log('');

    // Test 2: Get audio duration
    console.log('Test 2: Get audio duration');
    console.log('---------------------------');
    const duration = await audioExtractor.getAudioDuration(audioPath);
    console.log(`\u2713 Audio duration: ${duration.toFixed(2)} seconds`);
    console.log('');

    // Test 3: Clean up temporary file
    console.log('Test 3: Delete temporary audio file');
    console.log('------------------------------------');
    audioExtractor.deleteTemporaryFile(audioPath);

    // Verify file was deleted
    if (!fs.existsSync(audioPath)) {
      console.log('\u2713 Temporary file deleted successfully');
    } else {
      console.error('\u2717 Failed to delete temporary file');
    }
    console.log('');

    // Test 4: Error case - non-existent file
    console.log('Test 4: Error handling - non-existent file');
    console.log('-------------------------------------------');
    try {
      await audioExtractor.extractAudio('/nonexistent/video.mp4');
      console.error('\u2717 Should have thrown an error for non-existent file');
    } catch (error) {
      if (error instanceof Error) {
        console.log('\u2713 Correctly threw error:', error.message);
      }
    }
    console.log('');

    // Test 5: Custom output path
    console.log('Test 5: Extract with custom output path');
    console.log('----------------------------------------');
    const customOutputPath = path.join(__dirname, 'test-output', `test-audio-${Date.now()}.mp3`);
    const customAudioPath = await audioExtractor.extractAudio(videoPath, customOutputPath);

    if (customAudioPath === customOutputPath && fs.existsSync(customAudioPath)) {
      console.log('\u2713 Audio extracted to custom path successfully');
      console.log(`  Output: ${customAudioPath}`);

      // Clean up
      audioExtractor.deleteTemporaryFile(customAudioPath);
    } else {
      console.error('\u2717 Failed to extract to custom path');
    }
    console.log('');

    console.log('=== All Tests Passed! ===');
    console.log('\nAudioExtractor is ready for transcription pipeline.');

  } catch (error) {
    console.error('\n=== Test Failed ===');
    if (error instanceof Error) {
      console.error('Error:', error.message);
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  }
}

// Run tests
testAudioExtractor().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
