import React, { useEffect, useRef, useState } from 'react';

interface AudioVolumeMeterProps {
  stream: MediaStream | null;
}

/**
 * AudioVolumeMeter - Real-time microphone volume visualization
 * Uses Web Audio API's AnalyserNode to measure audio levels
 */
export const AudioVolumeMeter: React.FC<AudioVolumeMeterProps> = ({ stream }) => {
  const [volume, setVolume] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>();
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  useEffect(() => {
    if (!stream) {
      // Clean up if stream is removed
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      setVolume(0);
      return;
    }

    // Create AudioContext and AnalyserNode
    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();

    // Configure analyser for volume measurement
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.8;

    source.connect(analyser);

    audioContextRef.current = audioContext;
    analyserRef.current = analyser;
    sourceRef.current = source;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    // Update volume in animation loop
    const updateVolume = () => {
      if (analyserRef.current) {
        analyserRef.current.getByteTimeDomainData(dataArray);

        // Calculate RMS (root mean square) for smooth volume reading
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const normalized = (dataArray[i] - 128) / 128;
          sum += normalized * normalized;
        }
        const rms = Math.sqrt(sum / dataArray.length);

        setVolume(rms);
      }
      animationFrameRef.current = requestAnimationFrame(updateVolume);
    };

    updateVolume();

    // Cleanup function
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (sourceRef.current) {
        sourceRef.current.disconnect();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [stream]);

  return (
    <div style={{ marginTop: '12px', width: '100%' }}>
      <div style={{
        fontSize: '12px',
        marginBottom: '6px',
        color: '#888',
        fontWeight: 500,
      }}>
        Microphone Level
      </div>
      <div style={{
        width: '100%',
        height: '8px',
        backgroundColor: '#2a2a2a',
        borderRadius: '4px',
        overflow: 'hidden',
        border: '1px solid #444',
      }}>
        <div style={{
          width: `${Math.min(volume * 200, 100)}%`,
          height: '100%',
          backgroundColor: volume > 0.1 ? '#4ade80' : '#666',
          transition: 'width 0.05s ease-out, background-color 0.2s ease-out',
          borderRadius: '3px',
        }} />
      </div>
      {volume > 0.1 && (
        <div style={{
          fontSize: '11px',
          color: '#4ade80',
          marginTop: '4px',
          fontWeight: 500,
        }}>
          ✓ Audio detected
        </div>
      )}
    </div>
  );
};
