import React from 'react';
import { TimelineClip } from '../../types/timeline';

interface PiPPreviewProps {
  screenClip: TimelineClip;
  webcamClip: TimelineClip;
  screenVideoPath: string;
  webcamVideoPath: string;
  currentTime: number;
}

/**
 * PiPPreview - Preview component showing how PiP will look in export
 * Displays screen video as background with webcam overlay in configured position
 */
const PiPPreview: React.FC<PiPPreviewProps> = ({
  // screenClip is not currently used but kept for future enhancements
  webcamClip,
  screenVideoPath,
  webcamVideoPath,
  currentTime,
}) => {
  // Get PiP position and scale from webcam clip
  const position = webcamClip.position || { x: 75, y: 75 };
  const scale = webcamClip.scale || 0.25;

  // Calculate webcam overlay position and size
  const webcamStyle: React.CSSProperties = {
    position: 'absolute',
    left: `${position.x}%`,
    top: `${position.y}%`,
    width: `${scale * 100}%`,
    height: `${scale * 100}%`,
    transform: 'translate(-50%, -50%)',
    border: '2px solid rgba(255, 255, 255, 0.5)',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
    zIndex: 2,
  };

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        backgroundColor: '#000',
        overflow: 'hidden',
      }}
    >
      {/* Screen video - background layer */}
      <video
        src={`file://${screenVideoPath}`}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          zIndex: 1,
        }}
        currentTime={currentTime}
      />

      {/* Webcam video - overlay layer */}
      <video
        src={`file://${webcamVideoPath}`}
        style={webcamStyle}
        currentTime={currentTime}
      />

      {/* PiP indicator badge */}
      <div
        style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          padding: '4px 10px',
          background: 'rgba(99, 102, 241, 0.9)',
          color: '#fff',
          fontSize: '0.7rem',
          fontWeight: 600,
          borderRadius: '4px',
          zIndex: 3,
        }}
      >
        PiP Preview
      </div>
    </div>
  );
};

export default PiPPreview;
