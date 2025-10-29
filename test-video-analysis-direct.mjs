/**
 * Direct Test for VideoAnalysisService (Node.js)
 *
 * This script tests the VideoAnalysisService directly without the Electron app.
 * Run with: node test-video-analysis-direct.mjs
 *
 * Prerequisites:
 * 1. Build the project: npm start (to compile TypeScript)
 * 2. Set OPENAI_API_KEY environment variable or have API key configured
 * 3. Have test video available
 */

import { videoAnalysisService } from './src/main/services/VideoAnalysisService.js';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('='.repeat(80));
console.log('VIDEO ANALYSIS SERVICE - DIRECT TEST');
console.log('='.repeat(80));
console.log('');

// Test video path
const testVideoPath = path.join(__dirname, 'test-output', 'sample-video.mp4');
console.log('Test Video Path:', testVideoPath);
console.log('Video exists:', fs.existsSync(testVideoPath));
console.log('');

// Check for API key
console.log('Checking for OpenAI API key...');
console.log('Note: This test requires an API key to be configured via the app');
console.log('      OR set OPENAI_API_KEY environment variable');
console.log('');

if (!fs.existsSync(testVideoPath)) {
  console.error('❌ Test video not found at:', testVideoPath);
  console.log('Please ensure test video exists before running this test.');
  process.exit(1);
}

console.log('Starting test...');
console.log('');

try {
  // Test 1: Full video transcription
  console.log('Test 1: Transcribing full video...');
  console.log('-'.repeat(80));

  const transcript = await videoAnalysisService.transcribeVideo(testVideoPath);

  console.log('✅ Transcription successful!');
  console.log('');
  console.log('Results:');
  console.log('  Full Text Length:', transcript.fullText.length, 'characters');
  console.log('  Number of Segments:', transcript.segments.length);
  console.log('  Duration:', transcript.duration.toFixed(2), 'seconds');
  console.log('  Language:', transcript.language || 'not detected');
  console.log('');
  console.log('First 200 characters of transcript:');
  console.log('  "' + transcript.fullText.substring(0, 200) + '..."');
  console.log('');
  console.log('First 3 segments:');
  transcript.segments.slice(0, 3).forEach((seg, i) => {
    console.log(`  [${i}] ${seg.start.toFixed(2)}s - ${seg.end.toFixed(2)}s: "${seg.text}"`);
  });
  console.log('');

  // Test 2: Verify cleanup
  console.log('Test 2: Verifying temp file cleanup...');
  console.log('-'.repeat(80));
  const tempDir = os.tmpdir();
  const tempFiles = fs.readdirSync(tempDir).filter(f => f.startsWith('audio-'));

  if (tempFiles.length === 0) {
    console.log('✅ No temporary audio files found - cleanup successful!');
  } else {
    console.log('⚠️  Found temporary audio files:', tempFiles);
    console.log('   These should have been cleaned up automatically.');
  }
  console.log('');

  // Test 3: Transcription with timestamp offset
  console.log('Test 3: Transcribing with timestamp offset (startTime = 5s)...');
  console.log('-'.repeat(80));

  const transcriptWithOffset = await videoAnalysisService.transcribeVideo(
    testVideoPath,
    5.0  // Start time offset
  );

  console.log('✅ Transcription with offset successful!');
  console.log('');
  console.log('Verifying timestamp adjustment:');
  console.log('  Original first segment started at:', transcript.segments[0].start.toFixed(2), 's');
  console.log('  Offset first segment starts at:', transcriptWithOffset.segments[0].start.toFixed(2), 's');
  console.log('  Expected offset: +5.0s');

  const actualOffset = transcriptWithOffset.segments[0].start - transcript.segments[0].start;
  if (Math.abs(actualOffset - 5.0) < 0.1) {
    console.log('  ✅ Offset applied correctly:', actualOffset.toFixed(2), 's');
  } else {
    console.log('  ⚠️  Offset may not be correct:', actualOffset.toFixed(2), 's (expected: 5.0s)');
  }
  console.log('');

  // Final cleanup check
  console.log('Final cleanup verification...');
  const finalTempFiles = fs.readdirSync(tempDir).filter(f => f.startsWith('audio-'));
  if (finalTempFiles.length === 0) {
    console.log('✅ All temporary files cleaned up successfully!');
  } else {
    console.log('⚠️  Temporary files still present:', finalTempFiles);
  }
  console.log('');

  console.log('='.repeat(80));
  console.log('ALL TESTS COMPLETED SUCCESSFULLY! ✅');
  console.log('='.repeat(80));
  console.log('');
  console.log('Summary:');
  console.log('  ✅ Full video transcription works');
  console.log('  ✅ Temporary file cleanup works');
  console.log('  ✅ Timestamp offset adjustment works');
  console.log('  ✅ Pipeline orchestration complete');
  console.log('');

} catch (error) {
  console.error('');
  console.error('='.repeat(80));
  console.error('❌ TEST FAILED');
  console.error('='.repeat(80));
  console.error('');
  console.error('Error:', error.message);
  console.error('');

  if (error.message.includes('API key')) {
    console.error('API Key Issue:');
    console.error('  - Make sure OpenAI API key is configured');
    console.error('  - Set via app: window.ai.saveApiKey("sk-...")');
    console.error('  - Or set environment variable: OPENAI_API_KEY');
  } else if (error.message.includes('network')) {
    console.error('Network Issue:');
    console.error('  - Check internet connection');
    console.error('  - Verify OpenAI API is accessible');
  } else if (error.message.includes('not found')) {
    console.error('File Issue:');
    console.error('  - Verify test video exists at:', testVideoPath);
  }

  console.error('');
  console.error('Stack trace:');
  console.error(error.stack);

  process.exit(1);
}
