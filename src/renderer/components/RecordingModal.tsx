import React, { useState, useEffect, useRef } from 'react';
import { getDesktopSources, startRecording, stopRecording, saveRecordingFile } from '../utils/ipc';
import { DesktopSource, RecordingState } from '../../types/recording';
import { Z_INDEX } from '../styles/zIndex';
import { MediaRecorderService } from '../services/MediaRecorderService';

interface RecordingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const RecordingModal: React.FC<RecordingModalProps> = ({ isOpen, onClose }) => {
  const [sources, setSources] = useState<DesktopSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [elapsedTime, setElapsedTime] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorderService | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch desktop sources when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchSources();
      setRecordingState('selecting');
    } else {
      // Cleanup when modal closes
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      setRecordingState('idle');
      setElapsedTime(0);
      setSelectedSource(null);
    }
  }, [isOpen]);

  const fetchSources = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('RecordingModal: Fetching desktop sources...');

      const desktopSources = await getDesktopSources();
      console.log(`RecordingModal: Received ${desktopSources.length} sources`);

      setSources(desktopSources);
    } catch (err) {
      console.error('RecordingModal: Error fetching sources:', err);
      setError(err instanceof Error ? err.message : 'Failed to get desktop sources');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSource = (sourceId: string) => {
    console.log('RecordingModal: Selected source:', sourceId);
    setSelectedSource(sourceId);
  };

  const handleStartRecording = async () => {
    if (!selectedSource) return;

    try {
      console.log('RecordingModal: Starting recording with source:', selectedSource);
      setRecordingState('recording');
      setElapsedTime(0);

      // Initialize MediaRecorder
      if (!mediaRecorderRef.current) {
        mediaRecorderRef.current = new MediaRecorderService();
      }

      // Start recording in main process
      await startRecording(selectedSource);

      // Start browser-based recording
      await mediaRecorderRef.current.startRecording(selectedSource);

      // Start timer
      timerIntervalRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);

      console.log('RecordingModal: Recording started successfully');
    } catch (err) {
      console.error('RecordingModal: Error starting recording:', err);
      setError(err instanceof Error ? err.message : 'Failed to start recording');
      setRecordingState('selecting');
      setSelectedSource(null);
    }
  };

  const handleStopRecording = async () => {
    try {
      console.log('RecordingModal: Stopping recording...');
      setRecordingState('processing');

      // Stop timer
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }

      // Stop browser recording and get blob
      if (!mediaRecorderRef.current) {
        throw new Error('No media recorder available');
      }

      const blob = await mediaRecorderRef.current.stopRecording();
      console.log(`RecordingModal: Got recording blob (${blob.size} bytes)`);

      // Convert blob to Uint8Array for IPC
      // Electron IPC will automatically convert Uint8Array to Buffer in main process
      const arrayBuffer = await blob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      // Save file via IPC
      const filePath = await saveRecordingFile(uint8Array);
      console.log(`RecordingModal: Recording saved to ${filePath}`);

      // Stop recording in main process
      await stopRecording();

      // Success! Close modal
      onClose();
    } catch (err) {
      console.error('RecordingModal: Error stopping recording:', err);
      setError(err instanceof Error ? err.message : 'Failed to stop recording');
      setRecordingState('selecting');
    }
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
          maxWidth: '900px',
          maxHeight: '80vh',
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
          display: 'flex',
          flexDirection: 'column',
          isolation: 'isolate', // Create stacking context for modal contents
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
            Choose What to Record
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              fontSize: '1.5rem',
              cursor: 'pointer',
              padding: '4px 8px',
              lineHeight: 1,
              transition: 'color 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#f1f5f9')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
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
          }}
        >
          {/* Recording UI - Show when recording */}
          {recordingState === 'recording' && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '60px 0',
              }}
            >
              {/* Recording Indicator */}
              <div
                style={{
                  width: '80px',
                  height: '80px',
                  backgroundColor: '#ef4444',
                  borderRadius: '50%',
                  marginBottom: '24px',
                  animation: 'pulse 2s ease-in-out infinite',
                  boxShadow: '0 0 20px rgba(239, 68, 68, 0.5)',
                }}
              />

              {/* Timer */}
              <div
                style={{
                  fontSize: '3rem',
                  fontWeight: 700,
                  color: '#f1f5f9',
                  marginBottom: '16px',
                  fontFamily: 'monospace',
                }}
              >
                {formatTime(elapsedTime)}
              </div>

              {/* Status Message */}
              <p
                style={{
                  margin: 0,
                  fontSize: '1.125rem',
                  color: '#94a3b8',
                  marginBottom: '32px',
                }}
              >
                Recording screen...
              </p>

              {/* Stop Button */}
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

              {/* CSS Animation */}
              <style>
                {`
                  @keyframes pulse {
                    0%, 100% {
                      transform: scale(1);
                      opacity: 1;
                    }
                    50% {
                      transform: scale(0.9);
                      opacity: 0.7;
                    }
                  }
                `}
              </style>
            </div>
          )}

          {/* Processing UI */}
          {recordingState === 'processing' && (
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
              <p style={{ margin: 0, fontSize: '0.9rem' }}>Saving recording...</p>
              <style>
                {`
                  @keyframes spin {
                    to { transform: rotate(360deg); }
                  }
                `}
              </style>
            </div>
          )}

          {/* Source Selection UI - Only show when selecting */}
          {recordingState === 'selecting' && loading && (
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
              <p style={{ margin: 0, fontSize: '0.9rem' }}>Loading available sources...</p>
              <style>
                {`
                  @keyframes spin {
                    to { transform: rotate(360deg); }
                  }
                `}
              </style>
            </div>
          )}

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
              }}
            >
              <strong>Error:</strong> {error}
              {error.includes('permission') && (
                <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #991b1b' }}>
                  <strong>How to fix:</strong>
                  <ol style={{ margin: '8px 0 0 20px', padding: 0 }}>
                    <li>Open System Preferences</li>
                    <li>Go to Security & Privacy → Privacy → Screen Recording</li>
                    <li>Enable screen recording for ClipForge</li>
                    <li>Restart the app</li>
                  </ol>
                </div>
              )}
            </div>
          )}

          {recordingState === 'selecting' && !loading && !error && sources.length === 0 && (
            <div
              style={{
                textAlign: 'center',
                padding: '60px 20px',
                color: '#94a3b8',
              }}
            >
              <p style={{ margin: 0, fontSize: '1rem' }}>No sources available</p>
            </div>
          )}

          {recordingState === 'selecting' && !loading && !error && sources.length > 0 && (
            <div>
              {/* Screens Section */}
              {sources.some((s) => s.display_id) && (
                <div style={{ marginBottom: '32px' }}>
                  <h3
                    style={{
                      margin: '0 0 16px 0',
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      color: '#cbd5e1',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    Screens
                  </h3>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                      gap: '16px',
                    }}
                  >
                    {sources
                      .filter((source) => source.display_id)
                      .map((source) => (
                        <SourceCard
                          key={source.id}
                          source={source}
                          isSelected={selectedSource === source.id}
                          onSelect={() => handleSelectSource(source.id)}
                        />
                      ))}
                  </div>
                </div>
              )}

              {/* Windows Section */}
              {sources.some((s) => !s.display_id) && (
                <div>
                  <h3
                    style={{
                      margin: '0 0 16px 0',
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      color: '#cbd5e1',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    Windows
                  </h3>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                      gap: '16px',
                    }}
                  >
                    {sources
                      .filter((source) => !source.display_id)
                      .map((source) => (
                        <SourceCard
                          key={source.id}
                          source={source}
                          isSelected={selectedSource === source.id}
                          onSelect={() => handleSelectSource(source.id)}
                        />
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {recordingState === 'selecting' && (
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
            {/* Hint text */}
            <div style={{ flex: 1 }}>
              {!selectedSource && (
                <p
                  style={{
                    margin: 0,
                    fontSize: '0.875rem',
                    color: '#64748b',
                    fontStyle: 'italic',
                  }}
                >
                  Select a source above to begin
                </p>
              )}
            </div>

            {/* Action buttons */}
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
                disabled={!selectedSource}
                style={{
                  padding: '10px 24px',
                  backgroundColor: selectedSource ? '#a855f7' : '#334155',
                  color: selectedSource ? '#ffffff' : '#64748b',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: selectedSource ? 'pointer' : 'not-allowed',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  transition: 'background-color 0.2s, transform 0.1s',
                  opacity: selectedSource ? 1 : 0.5,
                }}
                onMouseEnter={(e) => {
                  if (selectedSource) {
                    e.currentTarget.style.backgroundColor = '#9333ea';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = selectedSource ? '#a855f7' : '#334155';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                Start Recording
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Source Card Component
interface SourceCardProps {
  source: DesktopSource;
  isSelected: boolean;
  onSelect: () => void;
}

const SourceCard: React.FC<SourceCardProps> = ({ source, isSelected, onSelect }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      onClick={onSelect}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        backgroundColor: isSelected ? '#334155' : '#0f172a',
        border: `2px solid ${isSelected ? '#a855f7' : isHovered ? '#475569' : '#1e293b'}`,
        borderRadius: '8px',
        padding: '12px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
        boxShadow: isHovered ? '0 8px 16px rgba(0, 0, 0, 0.3)' : '0 2px 4px rgba(0, 0, 0, 0.2)',
      }}
    >
      {/* Thumbnail */}
      <div
        style={{
          width: '100%',
          aspectRatio: '16/9',
          backgroundColor: '#0f172a',
          borderRadius: '6px',
          overflow: 'hidden',
          marginBottom: '12px',
        }}
      >
        <img
          src={source.thumbnail}
          alt={source.name}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
      </div>

      {/* Source Info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {source.appIcon && (
          <img
            src={source.appIcon}
            alt=""
            style={{
              width: '20px',
              height: '20px',
              flexShrink: 0,
            }}
          />
        )}
        <p
          style={{
            margin: 0,
            fontSize: '0.875rem',
            fontWeight: 500,
            color: '#f1f5f9',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={source.name}
        >
          {source.name}
        </p>
      </div>

      {isSelected && (
        <div
          style={{
            marginTop: '8px',
            padding: '6px 12px',
            backgroundColor: '#a855f7',
            color: '#ffffff',
            borderRadius: '4px',
            fontSize: '0.75rem',
            fontWeight: 600,
            textAlign: 'center',
          }}
        >
          Selected
        </div>
      )}
    </div>
  );
};

export default RecordingModal;
