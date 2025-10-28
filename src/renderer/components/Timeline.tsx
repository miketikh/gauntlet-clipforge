import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useProjectStore } from '../store/projectStore';
import TimelineRuler from './TimelineRuler';
import TimelineTrack from './TimelineTrack';
import Playhead from './Playhead';
import { editAPI } from '../api';

const Timeline: React.FC = () => {
  // Subscribe to project store
  const currentProject = useProjectStore((state) => state.currentProject);
  const playheadPosition = useProjectStore((state) => state.playheadPosition);
  const selectedClipId = useProjectStore((state) => state.selectedClipId);
  const setSelectedClipId = useProjectStore((state) => state.setSelectedClipId);

  // Zoom state (pixelsPerSecond)
  const [pixelsPerSecond, setPixelsPerSecond] = useState(50);

  // Ref for timeline container to handle focus
  const timelineRef = useRef<HTMLDivElement>(null);

  // Constants for zoom
  const MIN_ZOOM = 20;
  const MAX_ZOOM = 100;
  const ZOOM_STEP = 10;

  // Calculate timeline duration (minimum 60 seconds for empty projects)
  const projectDuration = currentProject?.duration || 60;

  // Zoom controls
  const handleZoomIn = () => {
    setPixelsPerSecond((prev) => Math.min(prev + ZOOM_STEP, MAX_ZOOM));
  };

  const handleZoomOut = () => {
    setPixelsPerSecond((prev) => Math.max(prev - ZOOM_STEP, MIN_ZOOM));
  };

  // Handle keyboard events
  const handleKeyDown = useCallback(async (e: KeyboardEvent) => {
    // Only handle keyboard shortcuts if we have a selected clip
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
  }, [selectedClipId, playheadPosition]);

  // Add keyboard event listener
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

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
      const newPosition = Math.max(0, Math.min(clickedPosition, projectDuration));
      useProjectStore.getState().setPlayheadPosition(newPosition);
    }

    setSelectedClipId(null);
    timelineRef.current?.focus();
  }, [setSelectedClipId, pixelsPerSecond, projectDuration]);

  return (
    <div
      ref={timelineRef}
      tabIndex={0}
      onClick={handleTimelineClick}
      style={{
        height: '100%',
        background: '#34495e',
        borderTop: '1px solid #1a1a1a',
        display: 'flex',
        flexDirection: 'column',
        outline: 'none',
      }}
    >
      {/* Timeline Header with Zoom Controls */}
      <div
        style={{
          padding: '10px 20px',
          borderBottom: '1px solid #1a1a1a',
          background: '#2c3e50',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
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
              'Click a clip to select it'
            )}
          </div>
        </div>

        {/* Zoom Controls */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <button
            onClick={handleZoomOut}
            disabled={pixelsPerSecond <= MIN_ZOOM}
            style={{
              padding: '4px 12px',
              background: pixelsPerSecond <= MIN_ZOOM ? '#546e7a' : '#34495e',
              color: '#ffffff',
              border: '1px solid #1a1a1a',
              borderRadius: '4px',
              cursor: pixelsPerSecond <= MIN_ZOOM ? 'not-allowed' : 'pointer',
              fontSize: '0.8rem',
            }}
          >
            -
          </button>

          <span
            style={{
              fontSize: '0.75rem',
              color: '#95a5a6',
              minWidth: '60px',
              textAlign: 'center',
            }}
          >
            {pixelsPerSecond}px/s
          </span>

          <button
            onClick={handleZoomIn}
            disabled={pixelsPerSecond >= MAX_ZOOM}
            style={{
              padding: '4px 12px',
              background: pixelsPerSecond >= MAX_ZOOM ? '#546e7a' : '#34495e',
              color: '#ffffff',
              border: '1px solid #1a1a1a',
              borderRadius: '4px',
              cursor: pixelsPerSecond >= MAX_ZOOM ? 'not-allowed' : 'pointer',
              fontSize: '0.8rem',
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
        {/* Timeline Ruler */}
        <div
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 10,
            marginLeft: '120px', // Offset for track labels
          }}
        >
          <TimelineRuler duration={projectDuration} pixelsPerSecond={pixelsPerSecond} />
        </div>

        {/* Timeline Tracks */}
        <div style={{ position: 'relative' }}>
          {currentProject?.tracks.map((track, index) => (
            <TimelineTrack
              key={track.id}
              track={track}
              zoom={pixelsPerSecond}
              duration={projectDuration}
              trackIndex={index}
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

        {/* Playhead Indicator */}
        {currentProject && (
          <Playhead
            position={playheadPosition}
            pixelsPerSecond={pixelsPerSecond}
            trackCount={currentProject.tracks.length}
          />
        )}
      </div>
    </div>
  );
};

export default Timeline;
