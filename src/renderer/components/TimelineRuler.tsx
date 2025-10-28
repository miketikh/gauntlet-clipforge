import React from 'react';

interface TimelineRulerProps {
  duration: number; // Total timeline duration in seconds
  pixelsPerSecond: number; // Zoom level
}

const TimelineRuler: React.FC<TimelineRulerProps> = ({ duration, pixelsPerSecond }) => {
  const totalWidth = duration * pixelsPerSecond;

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

  return (
    <div
      style={{
        position: 'relative',
        width: `${totalWidth}px`,
        height: '40px',
        background: '#2c3e50',
        borderBottom: '1px solid #1a1a1a',
        userSelect: 'none',
      }}
    >
      {/* Major time markers (every 5 seconds) */}
      {markers.map((time) => (
        <div
          key={`marker-${time}`}
          style={{
            position: 'absolute',
            left: `${time * pixelsPerSecond}px`,
            top: 0,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
          }}
        >
          {/* Vertical line */}
          <div
            style={{
              width: '1px',
              height: '12px',
              background: '#7f8c8d',
            }}
          />
          {/* Time label */}
          <span
            style={{
              fontSize: '0.7rem',
              color: '#95a5a6',
              marginTop: '2px',
              marginLeft: '4px',
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
            left: `${time * pixelsPerSecond}px`,
            top: 0,
            width: '1px',
            height: '8px',
            background: '#546e7a',
          }}
        />
      ))}
    </div>
  );
};

export default TimelineRuler;
