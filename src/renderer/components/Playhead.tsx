import React from 'react';

interface PlayheadProps {
  position: number; // Current playhead position in seconds
  pixelsPerSecond: number; // Zoom level for calculating x position
  trackCount: number; // Number of tracks to span
}

const Playhead: React.FC<PlayheadProps> = ({ position, pixelsPerSecond, trackCount }) => {
  const xPosition = position * pixelsPerSecond;
  const trackHeight = 80; // Height per track
  const totalHeight = trackCount * trackHeight + trackCount; // +trackCount for borders

  return (
    <div
      style={{
        position: 'absolute',
        left: '120px', // Offset for track labels
        top: '40px', // Offset for ruler
        pointerEvents: 'none',
        zIndex: 100,
      }}
    >
      <div
        style={{
          position: 'absolute',
          transform: `translateX(${xPosition}px)`,
          transition: 'transform 0.1s ease-out',
        }}
      >
        {/* Triangular handle at top */}
        <div
          style={{
            width: 0,
            height: 0,
            borderLeft: '8px solid transparent',
            borderRight: '8px solid transparent',
            borderTop: '10px solid #e74c3c',
            marginLeft: '-8px',
            marginBottom: '-1px',
          }}
        />

        {/* Vertical red line */}
        <div
          style={{
            width: '2px',
            height: `${totalHeight}px`,
            background: '#e74c3c',
            marginLeft: '-1px',
          }}
        />
      </div>
    </div>
  );
};

export default Playhead;
