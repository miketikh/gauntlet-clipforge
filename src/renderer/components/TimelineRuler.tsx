import React, { useRef } from 'react';
import { useProjectStore } from '../store/projectStore';
import { timeToPixels, pixelsToTime } from '../utils/timelineCalculations';

interface TimelineRulerProps {
  duration: number; // Total timeline duration in seconds
  pixelsPerSecond: number; // Zoom level
}

const TimelineRuler: React.FC<TimelineRulerProps> = ({ duration, pixelsPerSecond }) => {
  const rulerRef = useRef<HTMLDivElement>(null);
  const setPlayheadPosition = useProjectStore((state) => state.setPlayheadPosition);

  const totalWidth = timeToPixels(duration, pixelsPerSecond);

  // Generate time markers every 5 seconds
  const markers = [];
  for (let time = 0; time <= duration; time += 5) {
    markers.push(time);
  }

  // Generate tick marks every 1 second
  const ticks = [];
  for (let time = 1; time <= duration; time += 1) {
    if (time % 5 !== 0) { // Skip major markers (they have their own display)
      ticks.push(time);
    }
  }

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Handle click on ruler to seek
  const handleRulerClick = (e: React.MouseEvent) => {
    if (!rulerRef.current) return;

    const rect = rulerRef.current.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    // Prevent negative offset when clicking outside ruler bounds
    const clampedOffsetX = Math.max(0, offsetX);
    const clickedPosition = pixelsToTime(clampedOffsetX, pixelsPerSecond);

    // Snap to whole seconds
    const snappedPosition = Math.round(clickedPosition);

    // Constrain to valid range
    const newPosition = Math.max(0, Math.min(snappedPosition, duration));
    setPlayheadPosition(newPosition);
  };

  return (
    <div
      ref={rulerRef}
      onClick={handleRulerClick}
      style={{
        position: 'relative',
        width: `${totalWidth}px`,
        height: '40px',
        background: 'linear-gradient(180deg, #2a3845 0%, #243340 100%)',
        borderBottom: '1px solid #1a252f',
        userSelect: 'none',
        cursor: 'pointer',
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.15)',
      }}
    >
      {/* Major time markers (every 5 seconds) */}
      {markers.map((time) => (
        <div
          key={`marker-${time}`}
          style={{
            position: 'absolute',
            left: `${timeToPixels(time, pixelsPerSecond)}px`,
            top: 0,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            pointerEvents: 'none',
          }}
        >
          {/* Vertical line */}
          <div
            style={{
              width: '2px',
              height: '14px',
              background: '#a0aec0',
              borderRadius: '1px',
            }}
          />
          {/* Time label */}
          <span
            style={{
              fontSize: '0.7rem',
              color: '#cbd5e0',
              marginTop: '3px',
              marginLeft: '4px',
              fontWeight: 500,
            }}
          >
            {formatTime(time)}
          </span>
        </div>
      ))}

      {/* Minor tick marks (every 1 second) */}
      {ticks.map((time) => (
        <div
          key={`tick-${time}`}
          style={{
            position: 'absolute',
            left: `${timeToPixels(time, pixelsPerSecond)}px`,
            top: 0,
            width: '1px',
            height: '8px',
            background: '#718096',
            pointerEvents: 'none',
            opacity: 0.6,
          }}
        />
      ))}
    </div>
  );
};

export default TimelineRuler;
