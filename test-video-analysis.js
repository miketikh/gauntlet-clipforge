/**
 * Test Script for VideoAnalysisService
 *
 * This script tests the full video transcription pipeline:
 * 1. Extract audio from video
 * 2. Validate audio file
 * 3. Transcribe with Whisper API
 * 4. Clean up temporary files
 * 5. Adjust timestamps for trimmed clips
 *
 * Usage: node test-video-analysis.js
 */

// Note: This is a CommonJS test file for quick verification
// Run from project root after building with: npm start

const path = require('path');

// Test video path
const TEST_VIDEO = path.join(__dirname, 'test-output', 'sample-video.mp4');

console.log('='.repeat(80));
console.log('VIDEO ANALYSIS SERVICE TEST');
console.log('='.repeat(80));
console.log('');
console.log('Test Video:', TEST_VIDEO);
console.log('');
console.log('Prerequisites:');
console.log('1. OpenAI API key must be configured');
console.log('2. Test video must exist at path above');
console.log('3. Run this test from DevTools console after app starts');
console.log('');
console.log('To test from DevTools console, paste this:');
console.log('');
console.log('-------------------------------------------------------------');
console.log(`
// Test 1: Transcribe full video
const testVideoPath = '${TEST_VIDEO}';
console.log('Test 1: Transcribing full video...');
window.ipcRenderer.invoke('ai:transcribe-video', { videoPath: testVideoPath })
  .then(transcript => {
    console.log('✓ Transcription complete!');
    console.log('Full text:', transcript.fullText);
    console.log('Segments:', transcript.segments.length);
    console.log('Duration:', transcript.duration, 'seconds');
    console.log('Language:', transcript.language);
    console.log('First 3 segments:');
    transcript.segments.slice(0, 3).forEach((seg, i) => {
      console.log(\`  [\${i}] \${seg.start.toFixed(2)}s - \${seg.end.toFixed(2)}s: "\${seg.text}"\`);
    });
  })
  .catch(err => {
    console.error('✗ Test failed:', err.message);
  });

// Test 2: Transcribe with timestamp offset (simulating trimmed clip)
console.log('\\nTest 2: Transcribing with timestamp offset (clip starts at 5s)...');
window.ipcRenderer.invoke('ai:transcribe-video', {
  videoPath: testVideoPath,
  startTime: 5.0
})
  .then(transcript => {
    console.log('✓ Transcription with offset complete!');
    console.log('First segment should start at ~5s:');
    console.log(\`  Start: \${transcript.segments[0].start.toFixed(2)}s\`);
    console.log(\`  End: \${transcript.segments[0].end.toFixed(2)}s\`);
    console.log(\`  Text: "\${transcript.segments[0].text}"\`);
  })
  .catch(err => {
    console.error('✗ Test failed:', err.message);
  });

// Test 3: Verify temp file cleanup
console.log('\\nTest 3: Check temp directory for leftover files...');
// On macOS, temp directory is usually /var/folders/...
// Manual check: Open Finder -> Go -> Go to Folder -> paste temp path
console.log('Temp directory:', require('os').tmpdir());
console.log('Look for files starting with "audio-" - there should be none after transcription');
`);
console.log('-------------------------------------------------------------');
console.log('');
console.log('Note: Make sure API key is set first:');
console.log('  await window.ai.saveApiKey("sk-...")');
console.log('');
