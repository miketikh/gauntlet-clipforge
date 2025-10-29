import React from 'react';

interface RecordingProgressProps {
  elapsedTime: number;
  statusMessage?: string;
}

const RecordingProgress: React.FC<RecordingProgressProps> = ({
  elapsedTime,
  statusMessage = 'Recording...',
}) => {
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
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
        {statusMessage}
      </p>

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
  );
};

export default RecordingProgress;
