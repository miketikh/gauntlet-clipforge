import React, { useCallback, useState, useEffect, useRef } from 'react';
import { useDrag } from 'react-dnd';
import { getEmptyImage } from 'react-dnd-html5-backend';
import { TimelineClip } from '../../types/timeline';
import { MediaFile, MediaType } from '../../types/media';
import { calculateClipDuration } from '../utils/timelineCalculations';
import { useProjectStore } from '../store/projectStore';
import { editAPI } from '../api';

interface TimelineClipViewProps {
  clip: TimelineClip;
  zoom: number; // pixelsPerSecond
  mediaFile?: MediaFile;
}

const TimelineClipView: React.FC<TimelineClipViewProps> = ({
  clip,
  zoom,
  mediaFile,
}) => {
  const selectedClipId = useProjectStore((state) => state.selectedClipId);
  const setSelectedClipId = useProjectStore((state) => state.setSelectedClipId);
  const playheadPosition = useProjectStore((state) => state.playheadPosition);

  // Trim handle state
  const [isDraggingStart, setIsDraggingStart] = useState(false);
  const [isDraggingEnd, setIsDraggingEnd] = useState(false);
  const [tempTrimStart, setTempTrimStart] = useState(clip.trimStart);
  const [tempTrimEnd, setTempTrimEnd] = useState(clip.trimEnd);
  const dragStartX = useRef<number>(0);
  const originalTrimStart = useRef<number>(0);
  const originalTrimEnd = useRef<number>(0);

  const clipDuration = calculateClipDuration(clip);
  const width = clipDuration * zoom;
  const leftPosition = clip.startTime * zoom;
  const isSelected = selectedClipId === clip.id;

  // Reset temp trim values when clip changes
  useEffect(() => {
    setTempTrimStart(clip.trimStart);
    setTempTrimEnd(clip.trimEnd);
  }, [clip.trimStart, clip.trimEnd]);

  // Check if playhead is over this clip
  const isPlayheadOverClip = playheadPosition >= clip.startTime && playheadPosition <= clip.endTime;

  // Setup drag source for repositioning
  const [{ isDragging }, drag, preview] = useDrag(() => ({
    type: 'TIMELINE_CLIP',
    item: { clipId: clip.id, clip, trackIndex: clip.trackIndex },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }), [clip]);

  // Hide the default drag preview (use ghost preview instead)
  useEffect(() => {
    preview(getEmptyImage(), { captureDraggingState: true });
  }, [preview]);

  // Handle clip selection
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedClipId(clip.id);
  }, [clip.id, setSelectedClipId]);

  // Trim handle mouse down handlers
  const handleTrimStartMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsDraggingStart(true);
    dragStartX.current = e.clientX;
    originalTrimStart.current = clip.trimStart;
  }, [clip.trimStart]);

  const handleTrimEndMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsDraggingEnd(true);
    dragStartX.current = e.clientX;
    originalTrimEnd.current = clip.trimEnd;
  }, [clip.trimEnd]);

  // Handle trim dragging
  useEffect(() => {
    if (!isDraggingStart && !isDraggingEnd) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!mediaFile) return;

      const deltaX = e.clientX - dragStartX.current;
      const deltaTime = deltaX / zoom;

      if (isDraggingStart) {
        // Trimming from the left (start)
        const newTrimStart = Math.max(
          0, // Cannot trim before media start
          Math.min(
            originalTrimStart.current + deltaTime,
            mediaFile.duration - clip.trimEnd - 0.5 // Minimum 0.5s clip duration
          )
        );
        setTempTrimStart(newTrimStart);
      } else if (isDraggingEnd) {
        // Trimming from the right (end)
        const newTrimEnd = Math.max(
          0, // Cannot trim before media end
          Math.min(
            originalTrimEnd.current - deltaTime,
            mediaFile.duration - clip.trimStart - 0.5 // Minimum 0.5s clip duration
          )
        );
        setTempTrimEnd(newTrimEnd);
      }
    };

    const handleMouseUp = async () => {
      if (isDraggingStart || isDraggingEnd) {
        try {
          // Apply the trim to the clip
          await editAPI.trimClip(clip.id, tempTrimStart, tempTrimEnd);
        } catch (error) {
          console.error('Failed to trim clip:', error);
          alert(`Failed to trim clip: ${error instanceof Error ? error.message : 'Unknown error'}`);
          // Reset to original values on error
          setTempTrimStart(clip.trimStart);
          setTempTrimEnd(clip.trimEnd);
        }
      }
      setIsDraggingStart(false);
      setIsDraggingEnd(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingStart, isDraggingEnd, zoom, clip.id, clip.trimStart, clip.trimEnd, tempTrimStart, tempTrimEnd, mediaFile]);

  // Handle context menu (right-click)
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Select the clip when right-clicking
    setSelectedClipId(clip.id);

    // Create custom context menu
    const menu = document.createElement('div');
    menu.style.position = 'fixed';
    menu.style.left = `${e.clientX}px`;
    menu.style.top = `${e.clientY}px`;
    menu.style.background = '#2c3e50';
    menu.style.border = '1px solid #1a1a1a';
    menu.style.borderRadius = '4px';
    menu.style.padding = '4px 0';
    menu.style.zIndex = '10000';
    menu.style.minWidth = '150px';
    menu.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.4)';

    // Delete option
    const deleteOption = document.createElement('div');
    deleteOption.textContent = 'Delete Clip';
    deleteOption.style.padding = '8px 16px';
    deleteOption.style.cursor = 'pointer';
    deleteOption.style.color = '#ffffff';
    deleteOption.style.fontSize = '0.85rem';
    deleteOption.style.transition = 'background 0.1s';
    deleteOption.onmouseenter = () => {
      deleteOption.style.background = '#e74c3c';
    };
    deleteOption.onmouseleave = () => {
      deleteOption.style.background = 'transparent';
    };
    deleteOption.onclick = async () => {
      try {
        await editAPI.deleteClip(clip.id);
      } catch (error) {
        console.error('Failed to delete clip:', error);
        alert(`Failed to delete clip: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      document.body.removeChild(menu);
    };

    // Split option (only show if playhead is over this clip)
    if (isPlayheadOverClip) {
      const splitOption = document.createElement('div');
      splitOption.textContent = 'Split at Playhead';
      splitOption.style.padding = '8px 16px';
      splitOption.style.cursor = 'pointer';
      splitOption.style.color = '#ffffff';
      splitOption.style.fontSize = '0.85rem';
      splitOption.style.transition = 'background 0.1s';
      splitOption.onmouseenter = () => {
        splitOption.style.background = '#3498db';
      };
      splitOption.onmouseleave = () => {
        splitOption.style.background = 'transparent';
      };
      splitOption.onclick = async () => {
        try {
          const splitTime = playheadPosition - clip.startTime;
          await editAPI.splitClip(clip.id, splitTime);
        } catch (error) {
          console.error('Failed to split clip:', error);
          alert(`Failed to split clip: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        document.body.removeChild(menu);
      };
      menu.appendChild(splitOption);
    }

    menu.appendChild(deleteOption);
    document.body.appendChild(menu);

    // Close menu when clicking anywhere
    const closeMenu = () => {
      if (document.body.contains(menu)) {
        document.body.removeChild(menu);
      }
      document.removeEventListener('click', closeMenu);
    };
    setTimeout(() => {
      document.addEventListener('click', closeMenu);
    }, 0);
  }, [clip.id, clip.startTime, isPlayheadOverClip, playheadPosition, setSelectedClipId]);

  // Truncate filename if too long
  const displayName = mediaFile?.filename || 'Unknown';
  const maxChars = Math.floor(width / 8); // Approximate characters that fit
  const truncatedName =
    displayName.length > maxChars
      ? displayName.substring(0, maxChars - 3) + '...'
      : displayName;

  // Determine clip background color based on media type
  const isAudioOnly = mediaFile?.type === MediaType.AUDIO;
  const clipBackground = isAudioOnly
    ? 'linear-gradient(135deg, #5e35b1 0%, #311b92 100%)' // Purple gradient for audio
    : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'; // Blue/purple gradient for video

  // Calculate display width based on temp trim values during drag
  const displayTrimStart = isDraggingStart ? tempTrimStart : clip.trimStart;
  const displayTrimEnd = isDraggingEnd ? tempTrimEnd : clip.trimEnd;
  const displayDuration = mediaFile ? mediaFile.duration - displayTrimStart - displayTrimEnd : clipDuration;
  const displayWidth = (isDraggingStart || isDraggingEnd) ? displayDuration * zoom : width;

  // CRITICAL FIX: Adjust left position when trimming from start
  // When trimStart increases, the clip's left edge should move rightward
  const trimStartDelta = isDraggingStart ? (tempTrimStart - clip.trimStart) : 0;
  const displayLeftPosition = leftPosition + (trimStartDelta * zoom);

  return (
    <div
      ref={drag}
      data-clip-id={clip.id}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      style={{
        position: 'absolute',
        left: `${displayLeftPosition}px`,
        top: '10px',
        width: `${displayWidth}px`,
        height: '60px',
        background: clipBackground,
        borderRadius: '4px',
        border: isSelected ? '3px solid #f39c12' : '1px solid #5a67d8',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#ffffff',
        fontSize: '0.75rem',
        fontWeight: 500,
        overflow: 'visible', // Changed to visible to show trim handles
        cursor: isDragging ? 'grabbing' : 'pointer',
        boxShadow: isSelected ? '0 4px 12px rgba(243, 156, 18, 0.5)' : '0 2px 4px rgba(0, 0, 0, 0.3)',
        transition: isDraggingStart || isDraggingEnd ? 'none' : 'transform 0.1s ease, box-shadow 0.1s ease',
        opacity: isDragging ? 0.5 : 1,
      }}
      onMouseEnter={(e) => {
        if (!isSelected && !isDragging) {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.4)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected && !isDragging) {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.3)';
        }
      }}
    >
      {/* Optional thumbnail preview or audio icon */}
      {width > 80 && (
        <div
          style={{
            position: 'absolute',
            left: '4px',
            top: '4px',
            width: '52px',
            height: '52px',
            borderRadius: '2px',
            overflow: 'hidden',
            background: '#1a1a1a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {isAudioOnly ? (
            // Show audio icon for audio-only clips
            <div
              style={{
                fontSize: '1.5rem',
              }}
            >
              🎵
            </div>
          ) : (clip.thumbnail || mediaFile?.thumbnail) ? (
            // Show clip thumbnail (from trimStart position) or media file thumbnail as fallback
            <img
              src={clip.thumbnail || mediaFile.thumbnail}
              alt=""
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          ) : null}
        </div>
      )}

      {/* Clip label */}
      <div
        style={{
          flex: 1,
          padding: '0 8px',
          textAlign: 'center',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          marginLeft: mediaFile?.thumbnail && width > 80 ? '56px' : '0',
        }}
      >
        {truncatedName}
      </div>

      {/* Duration badge (if wide enough) */}
      {width > 120 && (
        <div
          style={{
            position: 'absolute',
            right: '4px',
            top: '4px',
            background: 'rgba(0, 0, 0, 0.4)',
            borderRadius: '3px',
            padding: '2px 6px',
            fontSize: '0.65rem',
            fontWeight: 600,
          }}
        >
          {Math.floor(clipDuration)}s
        </div>
      )}

      {/* PiP indicator badge (for overlay clips) */}
      {clip.position && clip.scale && width > 80 && (
        <div
          style={{
            position: 'absolute',
            left: '4px',
            bottom: '4px',
            background: 'rgba(99, 102, 241, 0.9)',
            borderRadius: '3px',
            padding: '2px 6px',
            fontSize: '0.6rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '3px',
          }}
        >
          📹 PiP
        </div>
      )}

      {/* Selection indicator */}
      {isSelected && (
        <div
          style={{
            position: 'absolute',
            bottom: '4px',
            right: '4px',
            background: '#f39c12',
            borderRadius: '3px',
            padding: '2px 6px',
            fontSize: '0.6rem',
            fontWeight: 700,
            textTransform: 'uppercase',
          }}
        >
          Selected
        </div>
      )}

      {/* Trim handles - only show when selected */}
      {isSelected && (
        <>
          {/* Left trim handle */}
          <div
            onMouseDown={handleTrimStartMouseDown}
            style={{
              position: 'absolute',
              left: '0',
              top: '0',
              width: '10px',
              height: '100%',
              background: isDraggingStart ? '#ffd700' : 'rgba(255, 215, 0, 0.8)',
              cursor: 'ew-resize',
              borderTopLeftRadius: '4px',
              borderBottomLeftRadius: '4px',
              zIndex: 10,
              transition: 'background 0.1s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#ffd700';
            }}
            onMouseLeave={(e) => {
              if (!isDraggingStart) {
                e.currentTarget.style.background = 'rgba(255, 215, 0, 0.8)';
              }
            }}
          />

          {/* Right trim handle */}
          <div
            onMouseDown={handleTrimEndMouseDown}
            style={{
              position: 'absolute',
              right: '0',
              top: '0',
              width: '10px',
              height: '100%',
              background: isDraggingEnd ? '#ffd700' : 'rgba(255, 215, 0, 0.8)',
              cursor: 'ew-resize',
              borderTopRightRadius: '4px',
              borderBottomRightRadius: '4px',
              zIndex: 10,
              transition: 'background 0.1s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#ffd700';
            }}
            onMouseLeave={(e) => {
              if (!isDraggingEnd) {
                e.currentTarget.style.background = 'rgba(255, 215, 0, 0.8)';
              }
            }}
          />

          {/* Trim amount tooltip during drag */}
          {(isDraggingStart || isDraggingEnd) && (
            <div
              style={{
                position: 'absolute',
                top: '-30px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(0, 0, 0, 0.9)',
                color: '#ffffff',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '0.7rem',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                pointerEvents: 'none',
                zIndex: 1000,
              }}
            >
              {isDraggingStart && `Trim Start: +${tempTrimStart.toFixed(2)}s`}
              {isDraggingEnd && `Trim End: +${tempTrimEnd.toFixed(2)}s`}
              <br />
              Duration: {displayDuration.toFixed(2)}s
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default TimelineClipView;
