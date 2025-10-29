import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useDragLayer } from 'react-dnd';
import { useProjectStore } from '../store/projectStore';
import { useMediaStore } from '../store/mediaStore';
import TimelineRuler from './TimelineRuler';
import TimelineTrack from './TimelineTrack';
import Playhead from './Playhead';
import { editAPI } from '../api';
import { TRACK_LABEL_WIDTH, timeToPixels } from '../utils/timelineCalculations';
import { Z_INDEX } from '../styles/zIndex';

const Timeline: React.FC = () => {
  // Subscribe to project store
  const currentProject = useProjectStore((state) => state.currentProject);
  const playheadPosition = useProjectStore((state) => state.playheadPosition);
  const selectedClipId = useProjectStore((state) => state.selectedClipId);
  const setSelectedClipId = useProjectStore((state) => state.setSelectedClipId);
  const setClipVolume = useProjectStore((state) => state.setClipVolume);
  const setClipFades = useProjectStore((state) => state.setClipFades);

  // Subscribe to media store
  const mediaFiles = useMediaStore((state) => state.mediaFiles);

  // Zoom state (pixelsPerSecond)
  // This controls how many pixels represent one second on the timeline
  // Higher values = more zoomed in (timeline is wider)
  // Lower values = more zoomed out (timeline is narrower)
  // Default: 50px/s provides a good balance for most editing tasks
  const [pixelsPerSecond, setPixelsPerSecond] = useState(50);

  // Ref for timeline container to handle focus
  const timelineRef = useRef<HTMLDivElement>(null);
  const tracksContainerRef = useRef<HTMLDivElement>(null);

  // Track drag position for ruler indicator
  const [dragPosition, setDragPosition] = useState<number | null>(null);

  // Monitor drag state globally
  const { isDragging, itemType } = useDragLayer((monitor) => ({
    isDragging: monitor.isDragging(),
    itemType: monitor.getItemType(),
  }));

  // Constants for zoom
  const MIN_ZOOM = 20;
  const MAX_ZOOM = 100;
  const ZOOM_STEP = 10;

  // Find selected clip and its media file
  const selectedClip = selectedClipId
    ? currentProject?.tracks
        .flatMap((track) => track.clips)
        .find((clip) => clip.id === selectedClipId)
    : null;

  const selectedMediaFile = selectedClip
    ? mediaFiles.find((file) => file.id === selectedClip.mediaFileId)
    : null;

  // Calculate timeline duration (minimum 60 seconds for empty projects)
  const actualProjectDuration = currentProject?.duration || 0;
  // Visual timeline extends 60 seconds beyond last clip for easier editing
  const visualDuration = currentProject
    ? Math.max(actualProjectDuration + 60, 60)
    : 60;

  // Zoom controls
  // These functions adjust the zoom level for ALL tracks simultaneously
  // Since we pass the same pixelsPerSecond value to all TimelineTrack components,
  // both audio and video tracks will always resize in perfect sync
  const handleZoomIn = () => {
    setPixelsPerSecond((prev) => Math.min(prev + ZOOM_STEP, MAX_ZOOM));
  };

  const handleZoomOut = () => {
    setPixelsPerSecond((prev) => Math.max(prev - ZOOM_STEP, MIN_ZOOM));
  };

  // Clip control handlers
  const handleVolumeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!selectedClip) return;
      const volume = parseFloat(e.target.value);
      setClipVolume(selectedClip.id, volume);
    },
    [selectedClip, setClipVolume]
  );

  const handleFadeInChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!selectedClip) return;
      const fadeIn = parseFloat(e.target.value);
      const fadeOut = selectedClip.fadeOut ?? 0;
      setClipFades(selectedClip.id, fadeIn, fadeOut);
    },
    [selectedClip, setClipFades]
  );

  const handleFadeOutChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!selectedClip) return;
      const fadeIn = selectedClip.fadeIn ?? 0;
      const fadeOut = parseFloat(e.target.value);
      setClipFades(selectedClip.id, fadeIn, fadeOut);
    },
    [selectedClip, setClipFades]
  );

  // Handle keyboard events
  const handleKeyDown = useCallback(async (e: KeyboardEvent) => {
    // Don't intercept keyboard shortcuts when user is typing in an input/textarea
    const target = e.target as HTMLElement;
    const isInputField = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

    // Skip all shortcuts if user is typing (even modifier keys, to allow natural typing)
    if (isInputField) {
      return;
    }

    // Zoom shortcuts - work globally (no need for selected clip)
    // Cmd/Ctrl + Plus/Equal - Zoom in
    if ((e.metaKey || e.ctrlKey) && (e.key === '+' || e.key === '=')) {
      e.preventDefault();
      handleZoomIn();
      return;
    }

    // Cmd/Ctrl + Minus - Zoom out
    if ((e.metaKey || e.ctrlKey) && e.key === '-') {
      e.preventDefault();
      handleZoomOut();
      return;
    }

    // Cmd/Ctrl + 0 - Reset zoom to default (50px/s)
    if ((e.metaKey || e.ctrlKey) && e.key === '0') {
      e.preventDefault();
      setPixelsPerSecond(50);
      return;
    }

    // Only handle clip operations if we have a selected clip
    if (!selectedClipId) return;

    // Delete/Backspace - Delete selected clip
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      try {
        await editAPI.deleteClip(selectedClipId);
        console.log('[Timeline] Deleted clip via keyboard:', selectedClipId);
      } catch (error) {
        console.error('Failed to delete clip:', error);
        alert(`Failed to delete clip: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Cmd+K (Mac) or Ctrl+K (Windows/Linux) - Split clip at playhead
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      try {
        const clip = editAPI.getClip(selectedClipId);
        if (clip) {
          // Check if playhead is over the selected clip
          if (playheadPosition >= clip.startTime && playheadPosition <= clip.endTime) {
            const splitTime = playheadPosition - clip.startTime;
            await editAPI.splitClip(selectedClipId, splitTime);
            console.log('[Timeline] Split clip via keyboard:', selectedClipId);
          } else {
            alert('Playhead must be positioned over the selected clip to split');
          }
        }
      } catch (error) {
        console.error('Failed to split clip:', error);
        alert(`Failed to split clip: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }, [selectedClipId, playheadPosition, handleZoomIn, handleZoomOut]);

  // Add keyboard event listener
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // Reset drag position when drag ends
  useEffect(() => {
    if (!isDragging) {
      setDragPosition(null);
    }
  }, [isDragging]);

  // Click on timeline container to focus it (and deselect clips)
  const handleTimelineClick = useCallback((e: React.MouseEvent) => {
    // Check if we clicked on the timeline tracks area (not clips, not buttons)
    const target = e.target as HTMLElement;
    const isTrackArea = target.classList.contains('timeline-track-area');

    if (isTrackArea) {
      // Calculate clicked position and seek playhead
      const rect = target.getBoundingClientRect();
      const offsetX = e.clientX - rect.left;
      const clickedPosition = offsetX / pixelsPerSecond;
      const newPosition = Math.max(0, Math.min(clickedPosition, visualDuration));
      useProjectStore.getState().setPlayheadPosition(newPosition);
    }

    setSelectedClipId(null);
    timelineRef.current?.focus();
  }, [setSelectedClipId, pixelsPerSecond, visualDuration]);

  return (
    <div
      ref={timelineRef}
      tabIndex={0}
      onClick={handleTimelineClick}
      style={{
        height: '100%',
        background: 'linear-gradient(180deg, #354758 0%, #2d3e4f 100%)',
        borderTop: '2px solid #1a252f',
        display: 'flex',
        flexDirection: 'column',
        outline: 'none',
        isolation: 'isolate', // Create stacking context - z-index values inside are isolated
      }}
    >
      {/* Timeline Header with Zoom Controls */}
      <div
        style={{
          padding: '12px 24px',
          borderBottom: '1px solid #1a252f',
          background: 'linear-gradient(180deg, #2c3e50 0%, #273849 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <h2
            style={{
              margin: 0,
              fontSize: '0.9rem',
              color: '#ffffff',
              fontWeight: 600,
            }}
          >
            Timeline
          </h2>

          {/* Keyboard shortcuts hint */}
          <div
            style={{
              fontSize: '0.7rem',
              color: '#95a5a6',
              fontStyle: 'italic',
            }}
          >
            {selectedClipId ? (
              <>
                <span style={{ marginRight: '12px' }}>
                  <kbd style={{
                    background: '#34495e',
                    padding: '2px 6px',
                    borderRadius: '3px',
                    fontFamily: 'monospace',
                  }}>Delete</kbd> to delete
                </span>
                <span>
                  <kbd style={{
                    background: '#34495e',
                    padding: '2px 6px',
                    borderRadius: '3px',
                    fontFamily: 'monospace',
                  }}>Cmd+K</kbd> to split
                </span>
              </>
            ) : (
              <>
                <span style={{ marginRight: '12px' }}>
                  <kbd style={{
                    background: '#34495e',
                    padding: '2px 6px',
                    borderRadius: '3px',
                    fontFamily: 'monospace',
                  }}>Cmd +/-</kbd> to zoom
                </span>
                <span>
                  <kbd style={{
                    background: '#34495e',
                    padding: '2px 6px',
                    borderRadius: '3px',
                    fontFamily: 'monospace',
                  }}>Cmd+0</kbd> reset zoom
                </span>
              </>
            )}
          </div>
        </div>

        {/* Clip Controls Panel (shown when clip is selected) */}
        {selectedClip && selectedMediaFile && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              background: '#1f2d3a',
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid #2a3c4d',
              flex: '1',
              maxWidth: '500px',
              marginLeft: '20px',
            }}
          >
            {/* Clip info */}
            <div style={{ minWidth: '120px', maxWidth: '150px' }}>
              <div
                style={{
                  fontSize: '0.7rem',
                  color: '#95a5a6',
                  marginBottom: '2px',
                }}
              >
                Selected Clip
              </div>
              <div
                style={{
                  fontSize: '0.75rem',
                  color: '#ffffff',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
                title={selectedMediaFile.filename}
              >
                {selectedMediaFile.filename}
              </div>
            </div>

            {/* Volume control */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '120px' }}>
              <label
                style={{
                  fontSize: '0.65rem',
                  color: '#95a5a6',
                  fontWeight: 600,
                }}
              >
                Volume
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={selectedClip.volume ?? 1.0}
                  onChange={handleVolumeChange}
                  style={{
                    flex: 1,
                    cursor: 'pointer',
                  }}
                />
                <span
                  style={{
                    fontSize: '0.7rem',
                    color: '#ffffff',
                    fontWeight: 600,
                    minWidth: '35px',
                    textAlign: 'right',
                  }}
                >
                  {Math.round((selectedClip.volume ?? 1.0) * 100)}%
                </span>
              </div>
            </div>

            {/* Fade In control */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label
                style={{
                  fontSize: '0.65rem',
                  color: '#95a5a6',
                  fontWeight: 600,
                }}
              >
                Fade In (s)
              </label>
              <input
                type="number"
                min="0"
                max="5"
                step="0.1"
                value={selectedClip.fadeIn ?? 0}
                onChange={handleFadeInChange}
                style={{
                  width: '70px',
                  padding: '4px 6px',
                  borderRadius: '3px',
                  border: '1px solid #2a3c4d',
                  background: '#273849',
                  color: '#ffffff',
                  fontSize: '0.7rem',
                }}
              />
            </div>

            {/* Fade Out control */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label
                style={{
                  fontSize: '0.65rem',
                  color: '#95a5a6',
                  fontWeight: 600,
                }}
              >
                Fade Out (s)
              </label>
              <input
                type="number"
                min="0"
                max="5"
                step="0.1"
                value={selectedClip.fadeOut ?? 0}
                onChange={handleFadeOutChange}
                style={{
                  width: '70px',
                  padding: '4px 6px',
                  borderRadius: '3px',
                  border: '1px solid #2a3c4d',
                  background: '#273849',
                  color: '#ffffff',
                  fontSize: '0.7rem',
                }}
              />
            </div>
          </div>
        )}

        {/* Zoom Controls */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            background: '#1f2d3a',
            padding: '6px 12px',
            borderRadius: '6px',
            border: '1px solid #2a3c4d',
          }}
        >
          <button
            onClick={handleZoomOut}
            disabled={pixelsPerSecond <= MIN_ZOOM}
            style={{
              padding: '6px 14px',
              background: pixelsPerSecond <= MIN_ZOOM ? '#3a4754' : 'linear-gradient(180deg, #4a5568 0%, #3d4452 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '4px',
              cursor: pixelsPerSecond <= MIN_ZOOM ? 'not-allowed' : 'pointer',
              fontSize: '0.875rem',
              fontWeight: 600,
              opacity: pixelsPerSecond <= MIN_ZOOM ? 0.5 : 1,
              transition: 'all 0.2s ease',
              boxShadow: pixelsPerSecond <= MIN_ZOOM ? 'none' : '0 1px 3px rgba(0, 0, 0, 0.2)',
            }}
          >
            -
          </button>

          <span
            style={{
              fontSize: '0.75rem',
              color: '#a0aec0',
              minWidth: '60px',
              textAlign: 'center',
              fontWeight: 500,
            }}
          >
            {(pixelsPerSecond / 50).toFixed(1)}x
          </span>

          <button
            onClick={handleZoomIn}
            disabled={pixelsPerSecond >= MAX_ZOOM}
            style={{
              padding: '6px 14px',
              background: pixelsPerSecond >= MAX_ZOOM ? '#3a4754' : 'linear-gradient(180deg, #4a5568 0%, #3d4452 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '4px',
              cursor: pixelsPerSecond >= MAX_ZOOM ? 'not-allowed' : 'pointer',
              fontSize: '0.875rem',
              fontWeight: 600,
              opacity: pixelsPerSecond >= MAX_ZOOM ? 0.5 : 1,
              transition: 'all 0.2s ease',
              boxShadow: pixelsPerSecond >= MAX_ZOOM ? 'none' : '0 1px 3px rgba(0, 0, 0, 0.2)',
            }}
          >
            +
          </button>
        </div>
      </div>

      {/* Scrollable Timeline Container */}
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          position: 'relative',
        }}
      >
        {/* Timeline Ruler with Label Spacer */}
        <div style={{ display: 'flex', position: 'sticky', top: 0, zIndex: Z_INDEX.RAISED }}>
          {/* Spacer to match track labels */}
          <div
            style={{
              minWidth: '150px',
              height: '40px',
              background: 'linear-gradient(180deg, #1f2d3a 0%, #1a2633 100%)',
              borderRight: '1px solid #2a3c4d',
              position: 'sticky',
              left: 0,
              zIndex: Z_INDEX.OVERLAY,
              boxShadow: '2px 0 4px rgba(0, 0, 0, 0.1)',
            }}
          />
          {/* Ruler content */}
          <TimelineRuler duration={visualDuration} pixelsPerSecond={pixelsPerSecond} />
        </div>

        {/* Timeline Tracks */}
        <div ref={tracksContainerRef} style={{ position: 'relative' }}>
          {currentProject?.tracks.map((track, index) => (
            <TimelineTrack
              key={track.id}
              track={track}
              zoom={pixelsPerSecond}
              duration={visualDuration}
              trackIndex={index}
              onDragPositionChange={setDragPosition}
            />
          ))}

          {/* Show placeholder if no project */}
          {!currentProject && (
            <div
              style={{
                padding: '40px 20px',
                textAlign: 'center',
                color: '#7f8c8d',
                fontSize: '0.85rem',
              }}
            >
              No project loaded. Create or open a project to get started.
            </div>
          )}
        </div>

        {/* Indicators Container - spans full height from top */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: Z_INDEX.POPUP,
          }}
        >
          {/* Playhead Indicator */}
          {currentProject && (
            <Playhead
              position={playheadPosition}
              pixelsPerSecond={pixelsPerSecond}
              trackCount={currentProject.tracks.length}
            />
          )}

          {/* Small Arrow Drop Indicator - only during drag */}
          {isDragging && (itemType === 'MEDIA_ITEM' || itemType === 'TIMELINE_CLIP') && dragPosition !== null && currentProject && (
            <div
              style={{
                position: 'absolute',
                left: `${TRACK_LABEL_WIDTH + timeToPixels(dragPosition, pixelsPerSecond)}px`,
                top: '0',
                pointerEvents: 'none',
              }}
            >
              {/* Small downward-pointing triangle on ruler */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: '-8px',
                  width: 0,
                  height: 0,
                  borderLeft: '8px solid transparent',
                  borderRight: '8px solid transparent',
                  borderTop: '12px solid #ffffff',
                  filter: 'drop-shadow(0 1px 3px rgba(0, 0, 0, 0.5))',
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Timeline;
