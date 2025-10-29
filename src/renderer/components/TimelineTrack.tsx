import React, { useRef, useState } from 'react';
import { useDrop } from 'react-dnd';
import { Track, TimelineClip, TrackType } from '../../types/timeline';
import { MediaFile, MediaType } from '../../types/media';
import { EditAPI } from '../api/EditAPI';
import { useMediaStore } from '../store/mediaStore';
import { useProjectStore } from '../store/projectStore';
import TimelineClipView from './TimelineClipView';
import { formatTime } from '../utils/timelineCalculations';

interface TimelineTrackProps {
  track: Track;
  zoom: number; // pixelsPerSecond
  duration: number; // Total timeline duration
  trackIndex: number; // For alternating background colors
  onDragPositionChange?: (position: number | null) => void; // Callback for ruler indicator
}

const editAPI = new EditAPI();

const TimelineTrack: React.FC<TimelineTrackProps> = ({
  track,
  zoom,
  duration,
  trackIndex,
  onDragPositionChange
}) => {
  const totalWidth = duration * zoom;
  const trackContentRef = useRef<HTMLDivElement>(null);
  const mediaFiles = useMediaStore((state) => state.mediaFiles);
  const setPlayheadPosition = useProjectStore((state) => state.setPlayheadPosition);

  // Track hover position for ghost preview
  const [hoverPosition, setHoverPosition] = useState<number | null>(null);
  const [draggedItemDuration, setDraggedItemDuration] = useState<number>(0);

  // Setup drop target - accepts both MEDIA_ITEM (from library) and TIMELINE_CLIP (repositioning)
  const [{ isOver, canDrop, draggedItem }, drop] = useDrop(() => ({
    accept: ['MEDIA_ITEM', 'TIMELINE_CLIP'],
    drop: (item: { mediaFileId?: string; mediaFile?: MediaFile; clipId?: string; clip?: TimelineClip; trackIndex?: number }, monitor) => {
      const offset = monitor.getClientOffset();
      if (!offset || !trackContentRef.current) return;

      // Calculate drop position in seconds
      const trackRect = trackContentRef.current.getBoundingClientRect();
      const dropX = offset.x - trackRect.left;
      const rawPosition = Math.max(0, dropX / zoom);

      // Snap to whole seconds
      const dropTimeSeconds = Math.round(rawPosition);

      // Determine if this is a new clip from library or repositioning existing clip
      if (item.mediaFileId) {
        // Dropping from media library - add new clip
        console.log('[TimelineTrack] Dropping media at:', {
          mediaFileId: item.mediaFileId,
          trackIndex,
          dropTimeSeconds,
        });

        editAPI.addClip(item.mediaFileId, trackIndex, dropTimeSeconds).catch((err) => {
          console.error('[TimelineTrack] Failed to add clip:', err);
          alert(`Failed to add clip: ${err.message}`);
        });
      } else if (item.clipId) {
        // Repositioning existing clip
        console.log('[TimelineTrack] Repositioning clip:', {
          clipId: item.clipId,
          trackIndex,
          dropTimeSeconds,
        });

        editAPI.moveClip(item.clipId, trackIndex, dropTimeSeconds).catch((err) => {
          console.error('[TimelineTrack] Failed to move clip:', err);
          alert(`Failed to move clip: ${err.message}`);
        });
      }
    },
    hover: (item: { mediaFileId?: string; mediaFile?: MediaFile; clipId?: string; clip?: TimelineClip }, monitor) => {
      const offset = monitor.getClientOffset();

      if (!offset || !trackContentRef.current) {
        setHoverPosition(null);
        onDragPositionChange?.(null);
        return;
      }

      // Simple calculation: where is the cursor right now?
      const trackRect = trackContentRef.current.getBoundingClientRect();
      const hoverX = offset.x - trackRect.left;
      const rawPosition = Math.max(0, hoverX / zoom);

      // Snap to whole seconds
      const dropPositionSeconds = Math.round(rawPosition);

      // Calculate duration for ghost preview
      let itemDuration = 0;
      if (item.mediaFile) {
        // New clip from library - use full media duration
        itemDuration = item.mediaFile.duration;
      } else if (item.clip) {
        // Existing clip being repositioned - use clip duration
        itemDuration = item.clip.endTime - item.clip.startTime;
      }
      setDraggedItemDuration(itemDuration);

      // The clip will START at this position (snapped to whole seconds)
      setHoverPosition(dropPositionSeconds);

      // Update parent component for arrow indicator on ruler
      onDragPositionChange?.(dropPositionSeconds);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
      draggedItem: monitor.getItem(),
    }),
  }), [zoom, onDragPositionChange]);

  // Generate grid lines every 5 seconds
  const gridLines = [];
  for (let time = 5; time <= duration; time += 5) {
    gridLines.push(time);
  }

  // Background colors based on track type
  const getTrackBackgroundColor = () => {
    if (track.type === TrackType.AUDIO) {
      // Audio tracks: dark blue with subtle gradient
      return trackIndex % 2 === 0
        ? 'linear-gradient(180deg, #1e2837 0%, #1a2333 100%)'
        : 'linear-gradient(180deg, #1a2333 0%, #151f2e 100%)';
    } else {
      // Video tracks: dark gray with subtle gradient
      return trackIndex % 2 === 0
        ? 'linear-gradient(180deg, #354758 0%, #2f3f4f 100%)'
        : 'linear-gradient(180deg, #2f3f4f 0%, #2a3845 100%)';
    }
  };

  const backgroundColor = getTrackBackgroundColor();

  // Highlight when dragging over
  const dropHighlight = isOver && canDrop ? 'rgba(102, 126, 234, 0.2)' : 'transparent';

  // Generate track label with type indicator
  const trackTypeLabel = track.type === TrackType.AUDIO ? '🎵 Audio' : '🎬 Video';
  const trackLabel = `${trackTypeLabel} - ${track.name}`;

  // Handle click on track area to seek playhead
  const handleTrackClick = (e: React.MouseEvent) => {
    // Don't handle clicks on clips - they have their own handlers
    if ((e.target as HTMLElement).closest('[data-clip-id]')) {
      return;
    }

    if (!trackContentRef.current) return;

    const rect = trackContentRef.current.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const clickedPosition = offsetX / zoom;

    // Snap to whole seconds
    const snappedPosition = Math.round(clickedPosition);
    const newPosition = Math.max(0, Math.min(snappedPosition, duration));
    setPlayheadPosition(newPosition);
  };

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        height: '80px',
        background: backgroundColor,
        borderBottom: '1px solid rgba(26, 37, 47, 0.6)',
      }}
    >
      {/* Track label on the left */}
      <div
        style={{
          minWidth: '150px',
          padding: '12px',
          background: 'linear-gradient(180deg, #1f2d3a 0%, #1a2633 100%)',
          borderRight: '1px solid #2a3c4d',
          display: 'flex',
          alignItems: 'center',
          color: '#a0aec0',
          fontSize: '0.75rem',
          fontWeight: 600,
          position: 'sticky',
          left: 0,
          zIndex: 1,
          boxShadow: '2px 0 4px rgba(0, 0, 0, 0.1)',
          whiteSpace: 'nowrap',
          textOverflow: 'ellipsis',
          overflow: 'hidden',
        }}
      >
        {trackLabel}
      </div>

      {/* Track content area */}
      <div
        ref={(node) => {
          drop(node);
          trackContentRef.current = node;
        }}
        onClick={handleTrackClick}
        style={{
          position: 'relative',
          width: `${totalWidth}px`,
          height: '100%',
          background: dropHighlight,
          transition: 'background 0.2s ease',
          cursor: 'pointer',
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

        {/* Empty state message */}
        {track.clips.length === 0 && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
              color: '#718096',
              fontSize: '0.9rem',
              fontStyle: 'italic',
              userSelect: 'none',
            }}
          >
            {track.type === TrackType.AUDIO
              ? 'Drag audio clips here to get started'
              : 'Drag video clips here to get started'}
          </div>
        )}

        {/* Ghost preview while dragging - shows where clip will land */}
        {isOver && canDrop && hoverPosition !== null && draggedItemDuration > 0 && (
          <div
            style={{
              position: 'absolute',
              left: `${hoverPosition * zoom}px`, // Clip starts at cursor position
              top: '10px',
              width: `${draggedItemDuration * zoom}px`,
              height: '60px',
              background: 'rgba(243, 156, 18, 0.2)', // Yellow tint to match indicator
              border: '2px dashed #f39c12',
              borderRadius: '4px',
              pointerEvents: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 50,
            }}
          >
            {/* Timecode display in ghost preview - shows clip start time */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <span
                style={{
                  color: '#fff',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  textShadow: '0 1px 3px rgba(0, 0, 0, 0.8)',
                }}
              >
                Start: {formatTime(hoverPosition)}
              </span>
              <span
                style={{
                  color: '#95a5a6',
                  fontSize: '0.65rem',
                  textShadow: '0 1px 2px rgba(0, 0, 0, 0.8)',
                }}
              >
                {Math.floor(draggedItemDuration)}s
              </span>
            </div>
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
