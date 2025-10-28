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
      <div style={{ gridArea: 'header' }}>
        {header}
      </div>
      <div style={{ gridArea: 'sidebar' }}>
        {mediaLibrary}
      </div>
      <div style={{ gridArea: 'preview' }}>
        {preview}
      </div>
      <div style={{ gridArea: 'timeline' }}>
        {timeline}
      </div>
    </div>
  );
};

export default Layout;
