import React from 'react';

const MediaLibrary: React.FC = () => {
  return (
    <div style={{
      height: '100%',
      background: '#2c3e50',
      borderRight: '1px solid #1a1a1a',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{
        padding: '15px 20px',
        borderBottom: '1px solid #1a1a1a',
        background: '#34495e',
      }}>
        <h2 style={{
          margin: 0,
          fontSize: '1rem',
          color: '#ffffff',
          fontWeight: 600,
        }}>
          Media Library
        </h2>
      </div>
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}>
        <p style={{
          color: '#7f8c8d',
          fontSize: '0.9rem',
          textAlign: 'center',
          lineHeight: 1.6,
        }}>
          No media imported
        </p>
      </div>
    </div>
  );
};

export default MediaLibrary;
