import React from 'react';

const Timeline: React.FC = () => {
  return (
    <div style={{
      height: '100%',
      background: '#34495e',
      borderTop: '1px solid #1a1a1a',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{
        padding: '10px 20px',
        borderBottom: '1px solid #1a1a1a',
        background: '#2c3e50',
      }}>
        <h2 style={{
          margin: 0,
          fontSize: '0.9rem',
          color: '#ffffff',
          fontWeight: 600,
        }}>
          Timeline
        </h2>
      </div>
      <div style={{
        flex: 1,
        padding: '20px',
        color: '#7f8c8d',
        fontSize: '0.85rem',
      }}>
        {/* Timeline tracks will be added in future PRs */}
      </div>
    </div>
  );
};

export default Timeline;
