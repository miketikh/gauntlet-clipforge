import React from 'react';

interface LayoutProps {
  header: React.ReactNode;
  mediaLibrary: React.ReactNode;
  preview: React.ReactNode;
  timeline: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ header, mediaLibrary, preview, timeline }) => {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '250px 1fr',
      gridTemplateRows: '60px 1fr 200px',
      gridTemplateAreas: `
        "header header"
        "sidebar preview"
        "timeline timeline"
      `,
      height: '100vh',
      width: '100vw',
      overflow: 'hidden',
      background: '#1a1a1a',
    }}>
      <div style={{ gridArea: 'header', overflow: 'hidden' }}>
        {header}
      </div>
      <div style={{ gridArea: 'sidebar', overflow: 'hidden', minHeight: 0 }}>
        {mediaLibrary}
      </div>
      <div style={{ gridArea: 'preview', overflow: 'hidden', minHeight: 0 }}>
        {preview}
      </div>
      <div style={{ gridArea: 'timeline', overflow: 'hidden', minHeight: 0 }}>
        {timeline}
      </div>
    </div>
  );
};

export default Layout;
