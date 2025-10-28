import React, { useState, useRef, useEffect } from 'react';
import { useProjectStore } from '../store/projectStore';
import { TRACK_LABEL_WIDTH, timeToPixels, pixelsToTime } from '../utils/timelineCalculations';

interface PlayheadProps {
  position: number; // Current playhead position in seconds
  pixelsPerSecond: number; // Zoom level for calculating x position
  trackCount: number; // Number of tracks to span
}

const Playhead: React.FC<PlayheadProps> = ({ position, pixelsPerSecond, trackCount }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [visualPosition, setVisualPosition] = useState(position); // Visual position during drag
  const containerRef = useRef<HTMLDivElement>(null);
  const setPlayheadPosition = useProjectStore((state) => state.setPlayheadPosition);
  const currentProject = useProjectStore((state) => state.currentProject);

  // Sync visual position with store position when not dragging
  useEffect(() => {
    if (!isDragging) {
      setVisualPosition(position);
    }
  }, [position, isDragging]);

  // Use visual position during drag, store position otherwise
  const displayPosition = isDragging ? visualPosition : position;
  const xPosition = timeToPixels(displayPosition, pixelsPerSecond);
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
    // Prevent negative offset when dragging past left edge
    const offsetX = Math.max(0, mouseX - rect.left);
    const newPosition = pixelsToTime(offsetX, pixelsPerSecond);

    // Snap to whole seconds
    const snappedPosition = Math.round(newPosition);

    // Constrain to valid range
    const projectDuration = currentProject?.duration || 60;
    return Math.max(0, Math.min(snappedPosition, projectDuration));
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
      // Update visual position AND store during drag for live preview
      setVisualPosition(newPosition);
      setPlayheadPosition(newPosition); // Enable real-time seeking during drag
    };

    const handleMouseUp = () => {
      // Commit visual position to store on mouse up
      setPlayheadPosition(visualPosition);
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, pixelsPerSecond, setPlayheadPosition, visualPosition]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        left: `${TRACK_LABEL_WIDTH}px`, // Offset for track labels
        top: '0', // Start at the very top (ruler level)
        pointerEvents: 'none',
        zIndex: 1000, // High z-index to overlay everything
        width: `${timeToPixels(currentProject?.duration || 60, pixelsPerSecond)}px`,
        height: '100%',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: `${xPosition}px`, // Direct positioning using utility function
          transition: isDragging ? 'none' : 'left 0.1s ease-out',
          height: '100%',
        }}
      >
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
              zIndex: 10,
            }}
          >
            {formatTime(displayPosition)}
          </div>
        )}

        {/* Triangular handle at top - draggable - positioned on ruler */}
        <div
          onMouseDown={handleMouseDown}
          style={{
            position: 'absolute',
            top: '0',
            left: '-8px',
            width: 0,
            height: 0,
            borderLeft: '8px solid transparent',
            borderRight: '8px solid transparent',
            borderTop: `10px solid ${isDragging ? '#ff6b6b' : '#e74c3c'}`,
            cursor: 'ew-resize',
            pointerEvents: 'auto',
          }}
        />

        {/* Vertical red line - spans from ruler through all tracks */}
        <div
          style={{
            position: 'absolute',
            top: '10px', // Start just below triangle
            left: '0px', // Centered at container position to align with ruler ticks
            width: '1px', // Match ruler tick width for perfect alignment
            height: 'calc(100% - 10px)',
            background: isDragging ? '#ff6b6b' : '#e74c3c',
            pointerEvents: 'none',
          }}
        />
      </div>
    </div>
  );
};

export default Playhead;
