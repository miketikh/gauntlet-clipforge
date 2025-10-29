/**
 * Test script for TranscriptionService (PR 3.2)
 * Tests the Whisper API integration
 *
 * Usage: Run this from DevTools console after app starts, or create IPC handler
 */

import { audioExtractor } from './src/main/services/AudioExtractor';
import { transcriptionService } from './src/main/services/TranscriptionService';
import { apiKeyStorage } from './src/main/services/ApiKeyStorage';
import * as path from 'path';

async function testTranscription() {
  console.log('\n========== PR 3.2: TranscriptionService Test ==========\n');

  try {
    // Step 1: Check API key
    console.log('Step 1: Checking for API key...');
    const hasKey = await apiKeyStorage.hasApiKey();

    if (!hasKey) {
      console.error('❌ No API key found. Please set API key first:');
      console.error('   await apiKeyStorage.saveApiKey("sk-...")');
      return;
    }
    console.log('✓ API key found');

    // Step 2: Extract audio from sample video
    const videoPath = path.join(__dirname, 'test-output', 'sample-video.mp4');
    console.log('\nStep 2: Extracting audio from:', videoPath);

    const audioPath = await audioExtractor.extractAudio(videoPath);
    console.log('✓ Audio extracted to:', audioPath);

    // Step 3: Validate audio file
    console.log('\nStep 3: Validating audio file...');
    const validation = await transcriptionService.validateAudioFile(audioPath);

    if (!validation.valid) {
      console.error('❌ Audio validation failed:', validation.error);
      audioExtractor.deleteTemporaryFile(audioPath);
      return;
    }
    console.log(`✓ Audio validated: ${validation.sizeInMB?.toFixed(2)}MB`);

    // Step 4: Transcribe audio
    console.log('\nStep 4: Transcribing audio (this may take 10-30 seconds)...');
    const startTime = Date.now();

    const transcript = await transcriptionService.transcribeAudio(audioPath);

    const endTime = Date.now();
    const elapsedSeconds = ((endTime - startTime) / 1000).toFixed(1);

    console.log(`✓ Transcription complete in ${elapsedSeconds}s`);

    // Step 5: Display results
    console.log('\n========== TRANSCRIPTION RESULTS ==========');
    console.log('\nFull Text:');
    console.log(transcript.fullText);
    console.log('\n---');
    console.log(`Duration: ${transcript.duration.toFixed(1)}s`);
    console.log(`Language: ${transcript.language || 'not detected'}`);
    console.log(`Segments: ${transcript.segments.length}`);
    console.log('\nFirst 3 Segments:');

    transcript.segments.slice(0, 3).forEach((segment, index) => {
      console.log(`  [${index + 1}] ${segment.start.toFixed(2)}s - ${segment.end.toFixed(2)}s: "${segment.text}"`);
    });

    // Step 6: Cleanup
    console.log('\nStep 6: Cleaning up temporary audio file...');
    audioExtractor.deleteTemporaryFile(audioPath);
    console.log('✓ Cleanup complete');

    console.log('\n========== TEST COMPLETE ✓ ==========\n');
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error);

    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Stack trace:', error.stack);
    }
  }
}

// Export for console testing
export { testTranscription };
