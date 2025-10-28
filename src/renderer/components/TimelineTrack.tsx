import React, { useRef } from 'react';
import { useDrop } from 'react-dnd';
import { Track } from '../../types/timeline';
import { MediaFile } from '../../types/media';
import { EditAPI } from '../api/EditAPI';
import { useMediaStore } from '../store/mediaStore';
import TimelineClipView from './TimelineClipView';

interface TimelineTrackProps {
  track: Track;
  zoom: number; // pixelsPerSecond
  duration: number; // Total timeline duration
  trackIndex: number; // For alternating background colors
}

const editAPI = new EditAPI();

const TimelineTrack: React.FC<TimelineTrackProps> = ({
  track,
  zoom,
  duration,
  trackIndex
}) => {
  const totalWidth = duration * zoom;
  const trackContentRef = useRef<HTMLDivElement>(null);
  const mediaFiles = useMediaStore((state) => state.mediaFiles);

  // Setup drop target
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: 'MEDIA_ITEM',
    drop: (item: { mediaFileId: string; mediaFile: MediaFile }, monitor) => {
      const offset = monitor.getClientOffset();
      if (!offset || !trackContentRef.current) return;

      // Calculate drop position in seconds
      const trackRect = trackContentRef.current.getBoundingClientRect();
      const dropX = offset.x - trackRect.left;
      const dropTimeSeconds = Math.max(0, dropX / zoom);

      // Add clip to timeline via EditAPI
      console.log('[TimelineTrack] Dropping media at:', {
        mediaFileId: item.mediaFileId,
        trackIndex,
        dropTimeSeconds,
      });

      editAPI.addClip(item.mediaFileId, trackIndex, dropTimeSeconds).catch((err) => {
        console.error('[TimelineTrack] Failed to add clip:', err);
        alert(`Failed to add clip: ${err.message}`);
      });
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  }));

  // Generate grid lines every 5 seconds
  const gridLines = [];
  for (let time = 5; time <= duration; time += 5) {
    gridLines.push(time);
  }

  // Alternate background colors for visual distinction
  const backgroundColor = trackIndex % 2 === 0 ? '#34495e' : '#2c3e50';

  // Highlight when dragging over
  const dropHighlight = isOver && canDrop ? 'rgba(102, 126, 234, 0.2)' : 'transparent';

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        height: '80px',
        background: backgroundColor,
        borderBottom: '1px solid #1a1a1a',
      }}
    >
      {/* Track label on the left */}
      <div
        style={{
          minWidth: '120px',
          padding: '10px',
          background: '#263238',
          borderRight: '1px solid #1a1a1a',
          display: 'flex',
          alignItems: 'center',
          color: '#95a5a6',
          fontSize: '0.8rem',
          fontWeight: 600,
          position: 'sticky',
          left: 0,
          zIndex: 1,
        }}
      >
        {track.name}
      </div>

      {/* Track content area */}
      <div
        ref={(node) => {
          drop(node);
          trackContentRef.current = node;
        }}
        style={{
          position: 'relative',
          width: `${totalWidth}px`,
          height: '100%',
          background: dropHighlight,
          transition: 'background 0.2s ease',
        }}
      >
        {/* Background grid lines every 5 seconds */}
        {gridLines.map((time) => (
          <div
            key={`grid-${time}`}
            style={{
              position: 'absolute',
              left: `${time * zoom}px`,
              top: 0,
              width: '1px',
              height: '100%',
              background: '#1a1a1a',
              opacity: 0.5,
            }}
          />
        ))}

        {/* Drop zone indicator */}
        {isOver && canDrop && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              color: '#667eea',
              fontSize: '0.875rem',
              fontWeight: 600,
              pointerEvents: 'none',
              textShadow: '0 1px 3px rgba(0, 0, 0, 0.5)',
            }}
          >
            Drop here
          </div>
        )}

        {/* Clips container */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
          }}
        >
          {track.clips.map((clip) => {
            const mediaFile = mediaFiles.find((f) => f.id === clip.mediaFileId);
            return (
              <TimelineClipView
                key={clip.id}
                clip={clip}
                zoom={zoom}
                mediaFile={mediaFile}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TimelineTrack;
