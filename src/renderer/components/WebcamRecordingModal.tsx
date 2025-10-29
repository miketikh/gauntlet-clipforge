import React, { useState, useEffect, useRef } from 'react';
import { saveRecordingFile, importRecording } from '../utils/ipc';
import { RecordingState } from '../../types/recording';
import { Z_INDEX } from '../styles/zIndex';
import { MediaRecorderService } from '../services/MediaRecorderService';
import { WebcamService, WebcamDevice } from '../services/WebcamService';
import { useMediaStore } from '../store/mediaStore';

interface WebcamRecordingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const WebcamRecordingModal: React.FC<WebcamRecordingModalProps> = ({ isOpen, onClose }) => {
  const [devices, setDevices] = useState<WebcamDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [elapsedTime, setElapsedTime] = useState(0);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const webcamServiceRef = useRef<WebcamService>(new WebcamService());
  const mediaRecorderRef = useRef<MediaRecorderService | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const addMediaFile = useMediaStore((state) => state.addMediaFile);

  // Initialize webcam when modal opens
  useEffect(() => {
    if (isOpen) {
      initializeWebcam();
    } else {
      // Cleanup when modal closes
      cleanup();
    }

    return () => {
      cleanup();
    };
  }, [isOpen]);

  // Update video preview when device changes
  useEffect(() => {
    if (selectedDeviceId && recordingState === 'selecting') {
      startPreview(selectedDeviceId);
    }
  }, [selectedDeviceId]);

  const initializeWebcam = async () => {
    try {
      setLoading(true);
      setError(null);
      setRecordingState('selecting');
      console.log('WebcamRecordingModal: Initializing webcam...');

      // Get available devices
      const availableDevices = await webcamServiceRef.current.getAvailableDevices();
      console.log(`WebcamRecordingModal: Found ${availableDevices.length} camera(s)`);

      if (availableDevices.length === 0) {
        setError('No camera found. Please connect a camera and try again.');
        setLoading(false);
        return;
      }

      setDevices(availableDevices);

      // Select first device by default
      const defaultDevice = availableDevices[0].deviceId;
      setSelectedDeviceId(defaultDevice);

      // Start preview with default device
      await startPreview(defaultDevice);

      setLoading(false);
    } catch (err) {
      console.error('WebcamRecordingModal: Error initializing webcam:', err);
      setError(err instanceof Error ? err.message : 'Failed to access camera');
      setLoading(false);
    }
  };

  const startPreview = async (deviceId: string) => {
    try {
      // Stop existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      // Get new stream for selected device
      const stream = await webcamServiceRef.current.getWebcamStream(deviceId);
      streamRef.current = stream;

      // Attach to video element
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        console.log('WebcamRecordingModal: Preview started');
      }
    } catch (err) {
      console.error('WebcamRecordingModal: Error starting preview:', err);
      setError(err instanceof Error ? err.message : 'Failed to start camera preview');
    }
  };

  const handleStartRecording = async () => {
    if (!streamRef.current) {
      setError('No camera stream available');
      return;
    }

    try {
      console.log('WebcamRecordingModal: Starting recording...');
      setRecordingState('recording');
      setElapsedTime(0);

      // Initialize MediaRecorder with the webcam stream
      if (!mediaRecorderRef.current) {
        mediaRecorderRef.current = new MediaRecorderService();
      }

      // Create a custom version of MediaRecorder for webcam
      // We'll directly use the browser's MediaRecorder since we already have the stream
      const mediaRecorder = new MediaRecorder(streamRef.current, {
        mimeType: 'video/webm;codecs=vp8,opus',
      });

      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunks.push(event.data);
          console.log(`WebcamRecordingModal: Received chunk (${event.data.size} bytes)`);
        }
      };

      mediaRecorder.onstop = async () => {
        console.log('WebcamRecordingModal: Recording stopped, processing...');
        setRecordingState('processing');

        try {
          // Create blob from chunks
          const blob = new Blob(chunks, { type: 'video/webm' });
          console.log(`WebcamRecordingModal: Created blob (${blob.size} bytes)`);

          // Convert blob to Uint8Array for IPC
          const arrayBuffer = await blob.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);

          // Save file via IPC
          const filePath = await saveRecordingFile(uint8Array);
          console.log(`WebcamRecordingModal: Recording saved to ${filePath}`);

          // Import recording to media library
          console.log('WebcamRecordingModal: Importing recording to media library...');
          const mediaFile = await importRecording(filePath);
          console.log('WebcamRecordingModal: Recording imported:', mediaFile);

          // Add to media store
          addMediaFile(mediaFile);

          // Show success message
          setSuccessMessage('Webcam recording added to library');
          setRecordingState('idle');

          // Auto-close modal after 2 seconds
          setTimeout(() => {
            onClose();
          }, 2000);
        } catch (err) {
          console.error('WebcamRecordingModal: Error processing recording:', err);
          setError(err instanceof Error ? err.message : 'Failed to process recording');
          setRecordingState('selecting');
        }
      };

      // Store reference for stopping
      (mediaRecorderRef.current as any).webcamRecorder = mediaRecorder;

      // Start recording
      mediaRecorder.start(1000); // Request data every second

      // Start timer
      timerIntervalRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);

      console.log('WebcamRecordingModal: Recording started successfully');
    } catch (err) {
      console.error('WebcamRecordingModal: Error starting recording:', err);
      setError(err instanceof Error ? err.message : 'Failed to start recording');
      setRecordingState('selecting');
    }
  };

  const handleStopRecording = () => {
    try {
      console.log('WebcamRecordingModal: Stopping recording...');

      // Stop timer
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }

      // Stop the MediaRecorder
      const recorder = (mediaRecorderRef.current as any)?.webcamRecorder;
      if (recorder && recorder.state !== 'inactive') {
        recorder.stop();
      }
    } catch (err) {
      console.error('WebcamRecordingModal: Error stopping recording:', err);
      setError(err instanceof Error ? err.message : 'Failed to stop recording');
      setRecordingState('selecting');
    }
  };

  const cleanup = () => {
    // Stop timer
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    // Stop stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    // Stop webcam service
    webcamServiceRef.current.stopStream();

    // Reset state
    setRecordingState('idle');
    setElapsedTime(0);
    setSelectedDeviceId(null);
    setError(null);
    setSuccessMessage(null);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: Z_INDEX.MODAL_BACKDROP,
        backdropFilter: 'blur(4px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#1e293b',
          borderRadius: '12px',
          width: '90%',
          maxWidth: '800px',
          maxHeight: '80vh',
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
          display: 'flex',
          flexDirection: 'column',
          isolation: 'isolate',
          zIndex: Z_INDEX.MODAL,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '24px',
            borderBottom: '1px solid #334155',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: '1.5rem',
              fontWeight: 600,
              color: '#f1f5f9',
            }}
          >
            Record Webcam
          </h2>
          <button
            onClick={onClose}
            disabled={recordingState === 'recording'}
            style={{
              background: 'none',
              border: 'none',
              color: recordingState === 'recording' ? '#475569' : '#94a3b8',
              fontSize: '1.5rem',
              cursor: recordingState === 'recording' ? 'not-allowed' : 'pointer',
              padding: '4px 8px',
              lineHeight: 1,
              transition: 'color 0.2s',
            }}
            onMouseEnter={(e) => {
              if (recordingState !== 'recording') {
                e.currentTarget.style.color = '#f1f5f9';
              }
            }}
            onMouseLeave={(e) => {
              if (recordingState !== 'recording') {
                e.currentTarget.style.color = '#94a3b8';
              }
            }}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div
          style={{
            padding: '24px',
            overflowY: 'auto',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          {/* Loading State */}
          {loading && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '60px 0',
                color: '#94a3b8',
              }}
            >
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  border: '4px solid #334155',
                  borderTopColor: '#667eea',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  marginBottom: '16px',
                }}
              />
              <p style={{ margin: 0, fontSize: '0.9rem' }}>Accessing camera...</p>
              <style>
                {`
                  @keyframes spin {
                    to { transform: rotate(360deg); }
                  }
                `}
              </style>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div
              style={{
                backgroundColor: '#7f1d1d',
                color: '#fca5a5',
                padding: '16px',
                borderRadius: '8px',
                marginBottom: '16px',
                fontSize: '0.9rem',
                lineHeight: 1.6,
                width: '100%',
              }}
            >
              <strong>Error:</strong> {error}
              {error.includes('permission') && (
                <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #991b1b' }}>
                  <strong>How to fix:</strong>
                  <ol style={{ margin: '8px 0 0 20px', padding: 0 }}>
                    <li>Click "Allow" when prompted for camera access</li>
                    <li>If you previously denied access, go to System Preferences</li>
                    <li>Navigate to Security & Privacy → Privacy → Camera</li>
                    <li>Enable camera access for ClipForge</li>
                  </ol>
                  <button
                    onClick={initializeWebcam}
                    style={{
                      marginTop: '12px',
                      padding: '8px 16px',
                      backgroundColor: '#dc2626',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                    }}
                  >
                    Retry
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Camera Preview */}
          {!loading && !error && (recordingState === 'selecting' || recordingState === 'recording') && (
            <div style={{ width: '100%', maxWidth: '640px' }}>
              {/* Video Preview */}
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  aspectRatio: '16/9',
                  backgroundColor: '#0f172a',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  marginBottom: '24px',
                }}
              >
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />

                {/* Recording Indicator Overlay */}
                {recordingState === 'recording' && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '16px',
                      left: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      backgroundColor: 'rgba(0, 0, 0, 0.7)',
                      padding: '8px 16px',
                      borderRadius: '20px',
                    }}
                  >
                    <div
                      style={{
                        width: '12px',
                        height: '12px',
                        backgroundColor: '#ef4444',
                        borderRadius: '50%',
                        animation: 'pulse 2s ease-in-out infinite',
                      }}
                    />
                    <span
                      style={{
                        color: '#ffffff',
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        fontFamily: 'monospace',
                      }}
                    >
                      {formatTime(elapsedTime)}
                    </span>
                    <style>
                      {`
                        @keyframes pulse {
                          0%, 100% {
                            opacity: 1;
                          }
                          50% {
                            opacity: 0.3;
                          }
                        }
                      `}
                    </style>
                  </div>
                )}
              </div>

              {/* Camera Selection (only when not recording) */}
              {recordingState === 'selecting' && devices.length > 1 && (
                <div style={{ marginBottom: '16px' }}>
                  <label
                    style={{
                      display: 'block',
                      marginBottom: '8px',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      color: '#cbd5e1',
                    }}
                  >
                    Select Camera:
                  </label>
                  <select
                    value={selectedDeviceId || ''}
                    onChange={(e) => setSelectedDeviceId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      backgroundColor: '#0f172a',
                      color: '#f1f5f9',
                      border: '1px solid #334155',
                      borderRadius: '6px',
                      fontSize: '0.875rem',
                      cursor: 'pointer',
                    }}
                  >
                    {devices.map((device) => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Status Message when Recording */}
              {recordingState === 'recording' && (
                <p
                  style={{
                    margin: '0 0 16px 0',
                    fontSize: '1rem',
                    color: '#94a3b8',
                    textAlign: 'center',
                  }}
                >
                  Recording in progress...
                </p>
              )}
            </div>
          )}

          {/* Processing State */}
          {recordingState === 'processing' && !successMessage && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '60px 0',
                color: '#94a3b8',
              }}
            >
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  border: '4px solid #334155',
                  borderTopColor: '#667eea',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  marginBottom: '16px',
                }}
              />
              <p style={{ margin: 0, fontSize: '0.9rem' }}>Processing recording...</p>
              <style>
                {`
                  @keyframes spin {
                    to { transform: rotate(360deg); }
                  }
                `}
              </style>
            </div>
          )}

          {/* Success State */}
          {successMessage && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '60px 0',
              }}
            >
              <div
                style={{
                  width: '80px',
                  height: '80px',
                  backgroundColor: '#10b981',
                  borderRadius: '50%',
                  marginBottom: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '3rem',
                  boxShadow: '0 0 20px rgba(16, 185, 129, 0.5)',
                }}
              >
                ✓
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: '1.125rem',
                  color: '#f1f5f9',
                  fontWeight: 600,
                }}
              >
                {successMessage}
              </p>
              <p
                style={{
                  margin: '8px 0 0 0',
                  fontSize: '0.875rem',
                  color: '#94a3b8',
                }}
              >
                Closing in 2 seconds...
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        {recordingState === 'selecting' && !loading && !error && (
          <div
            style={{
              padding: '16px 24px',
              borderTop: '1px solid #334155',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <div style={{ flex: 1 }}>
              <p
                style={{
                  margin: 0,
                  fontSize: '0.875rem',
                  color: '#64748b',
                  fontStyle: 'italic',
                }}
              >
                {devices.length > 1
                  ? `${devices.length} cameras available`
                  : 'Camera ready to record'}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={onClose}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#334155',
                  color: '#f1f5f9',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#475569')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#334155')}
              >
                Cancel
              </button>
              <button
                onClick={handleStartRecording}
                style={{
                  padding: '10px 24px',
                  backgroundColor: '#ef4444',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  transition: 'background-color 0.2s, transform 0.1s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#dc2626';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#ef4444';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div
                  style={{
                    width: '12px',
                    height: '12px',
                    backgroundColor: '#ffffff',
                    borderRadius: '50%',
                  }}
                />
                Start Recording
              </button>
            </div>
          </div>
        )}

        {recordingState === 'recording' && (
          <div
            style={{
              padding: '16px 24px',
              borderTop: '1px solid #334155',
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            <button
              onClick={handleStopRecording}
              style={{
                padding: '12px 32px',
                backgroundColor: '#ef4444',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: 600,
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#dc2626')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ef4444')}
            >
              Stop Recording
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default WebcamRecordingModal;
