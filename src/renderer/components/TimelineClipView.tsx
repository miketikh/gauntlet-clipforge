import React, { useCallback } from 'react';
import { useDrag } from 'react-dnd';
import { TimelineClip } from '../../types/timeline';
import { MediaFile } from '../../types/media';
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

  const clipDuration = calculateClipDuration(clip);
  const width = clipDuration * zoom;
  const leftPosition = clip.startTime * zoom;
  const isSelected = selectedClipId === clip.id;

  // Check if playhead is over this clip
  const isPlayheadOverClip = playheadPosition >= clip.startTime && playheadPosition <= clip.endTime;

  // Setup drag source for repositioning
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'TIMELINE_CLIP',
    item: { clipId: clip.id, clip, trackIndex: clip.trackIndex },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }), [clip]);

  // Handle clip selection
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedClipId(clip.id);
  }, [clip.id, setSelectedClipId]);

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

  return (
    <div
      ref={drag}
      data-clip-id={clip.id}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      style={{
        position: 'absolute',
        left: `${leftPosition}px`,
        top: '10px',
        width: `${width}px`,
        height: '60px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '4px',
        border: isSelected ? '3px solid #f39c12' : '1px solid #5a67d8',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#ffffff',
        fontSize: '0.75rem',
        fontWeight: 500,
        overflow: 'hidden',
        cursor: isDragging ? 'grabbing' : 'pointer',
        boxShadow: isSelected ? '0 4px 12px rgba(243, 156, 18, 0.5)' : '0 2px 4px rgba(0, 0, 0, 0.3)',
        transition: 'transform 0.1s ease, box-shadow 0.1s ease',
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
      {/* Optional thumbnail preview */}
      {mediaFile?.thumbnail && width > 80 && (
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
          }}
        >
          <img
            src={mediaFile.thumbnail}
            alt=""
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
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
    </div>
  );
};

export default TimelineClipView;
