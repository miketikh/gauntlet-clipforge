import React, { useState, useRef, useEffect } from 'react';
import { useProjectStore } from '../store/projectStore';

interface PlayheadProps {
  position: number; // Current playhead position in seconds
  pixelsPerSecond: number; // Zoom level for calculating x position
  trackCount: number; // Number of tracks to span
}

const Playhead: React.FC<PlayheadProps> = ({ position, pixelsPerSecond, trackCount }) => {
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const setPlayheadPosition = useProjectStore((state) => state.setPlayheadPosition);
  const currentProject = useProjectStore((state) => state.currentProject);

  const xPosition = position * pixelsPerSecond;
  const trackHeight = 80; // Height per track
  const totalHeight = trackCount * trackHeight + trackCount; // +trackCount for borders

  // Format time as MM:SS or HH:MM:SS
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Calculate playhead position from mouse X coordinate
  const calculatePositionFromMouse = (mouseX: number): number => {
    if (!containerRef.current) return position;

    const rect = containerRef.current.getBoundingClientRect();
    const offsetX = mouseX - rect.left;
    const newPosition = offsetX / pixelsPerSecond;

    // Constrain to valid range
    const projectDuration = currentProject?.duration || 60;
    return Math.max(0, Math.min(newPosition, projectDuration));
  };

  // Handle mouse down on playhead handle
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  // Handle mouse move (document level)
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newPosition = calculatePositionFromMouse(e.clientX);
      setPlayheadPosition(newPosition);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, pixelsPerSecond, setPlayheadPosition]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        left: '120px', // Offset for track labels
        top: '40px', // Offset for ruler
        pointerEvents: 'none',
        zIndex: 100,
        width: `${(currentProject?.duration || 60) * pixelsPerSecond}px`,
      }}
    >
      <div
        style={{
          position: 'absolute',
          transform: `translateX(${xPosition}px)`,
          transition: isDragging ? 'none' : 'transform 0.1s ease-out',
        }}
      >
        {/* Triangular handle at top - draggable */}
        <div
          onMouseDown={handleMouseDown}
          style={{
            width: 0,
            height: 0,
            borderLeft: '8px solid transparent',
            borderRight: '8px solid transparent',
            borderTop: `10px solid ${isDragging ? '#ff6b6b' : '#e74c3c'}`,
            marginLeft: '-8px',
            marginBottom: '-1px',
            cursor: 'ew-resize',
            pointerEvents: 'auto',
          }}
        />

        {/* Time display tooltip */}
        {isDragging && (
          <div
            style={{
              position: 'absolute',
              top: '-30px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: '#2c3e50',
              color: '#ffffff',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '0.75rem',
              fontFamily: 'monospace',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
            }}
          >
            {formatTime(position)}
          </div>
        )}

        {/* Vertical red line */}
        <div
          style={{
            width: '2px',
            height: `${totalHeight}px`,
            background: isDragging ? '#ff6b6b' : '#e74c3c',
            marginLeft: '-1px',
            pointerEvents: 'none',
          }}
        />
      </div>
    </div>
  );
};

export default Playhead;
