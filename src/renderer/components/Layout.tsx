import React, { useState, useCallback, useRef } from 'react';
import { useAIAssistantStore } from '../store/aiAssistantStore';

interface LayoutProps {
  header: React.ReactNode;
  mediaLibrary: React.ReactNode;
  preview: React.ReactNode;
  timeline: React.ReactNode;
  aiPanel: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ header, mediaLibrary, preview, timeline, aiPanel }) => {
  // Timeline height state (default 320px - enough for 2 tracks + controls)
  const [timelineHeight, setTimelineHeight] = useState(320);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // AI Panel state from Zustand store
  const isPanelOpen = useAIAssistantStore((state) => state.isPanelOpen);
  const panelWidth = useAIAssistantStore((state) => state.panelWidth);

  // Min/max constraints
  const MIN_TIMELINE_HEIGHT = 150;
  const MIN_PREVIEW_HEIGHT = 200;

  // Handle mouse down on resize handle
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  // Handle mouse move during drag
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const containerHeight = containerRect.height;
    const mouseY = e.clientY - containerRect.top;

    // Calculate new timeline height (from bottom of container)
    const newTimelineHeight = containerHeight - mouseY;

    // Calculate what the preview height would be (accounting for header)
    const headerHeight = 60;
    const newPreviewHeight = containerHeight - headerHeight - newTimelineHeight;

    // Apply constraints
    if (newTimelineHeight >= MIN_TIMELINE_HEIGHT && newPreviewHeight >= MIN_PREVIEW_HEIGHT) {
      setTimelineHeight(newTimelineHeight);
    }
  }, [isDragging]);

  // Handle mouse up to stop dragging
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Add/remove global mouse event listeners
  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'ns-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div
      ref={containerRef}
      style={{
        display: 'grid',
        gridTemplateColumns: isPanelOpen ? `250px 1fr ${panelWidth}px` : '250px 1fr 50px',
        gridTemplateRows: `60px 1fr ${timelineHeight}px`,
        gridTemplateAreas: `
          "header header header"
          "sidebar preview aiPanel"
          "timeline timeline timeline"
        `,
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        background: '#1a1a1a',
        transition: 'grid-template-columns 0.3s ease',
      }}
    >
      <div style={{ gridArea: 'header', overflow: 'hidden' }}>
        {header}
      </div>
      <div style={{ gridArea: 'sidebar', overflow: 'hidden', minHeight: 0 }}>
        {mediaLibrary}
      </div>
      <div style={{ gridArea: 'preview', overflow: 'hidden', minHeight: 0 }}>
        {preview}
      </div>
      <div style={{ gridArea: 'timeline', overflow: 'hidden', minHeight: 0, position: 'relative' }}>
        {/* Resize Handle */}
        <div
          onMouseDown={handleMouseDown}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '6px',
            cursor: 'ns-resize',
            zIndex: 1000,
            background: isDragging ? '#3498db' : 'transparent',
            transition: isDragging ? 'none' : 'background 0.2s',
          }}
          onMouseEnter={(e) => {
            if (!isDragging) {
              e.currentTarget.style.background = '#3498db';
            }
          }}
          onMouseLeave={(e) => {
            if (!isDragging) {
              e.currentTarget.style.background = 'transparent';
            }
          }}
        />
        {timeline}
      </div>
      <div style={{ gridArea: 'aiPanel', overflow: 'hidden', minHeight: 0 }}>
        {aiPanel}
      </div>
    </div>
  );
};

export default Layout;
