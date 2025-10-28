import React from 'react';

const Header: React.FC = () => {
  return (
    <div style={{
      height: '100%',
      background: '#2c3e50',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 20px',
      borderBottom: '1px solid #1a1a1a',
    }}>
      <h1 style={{
        margin: 0,
        fontSize: '1.5rem',
        color: '#ffffff',
        fontWeight: 600,
      }}>
        ClipForge
      </h1>
      <div style={{ display: 'flex', gap: '10px' }}>
        <button style={{
          padding: '8px 16px',
          background: '#3498db',
          color: '#ffffff',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '0.9rem',
        }}>
          Import
        </button>
        <button style={{
          padding: '8px 16px',
          background: '#e74c3c',
          color: '#ffffff',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '0.9rem',
        }}>
          Record
        </button>
        <button style={{
          padding: '8px 16px',
          background: '#27ae60',
          color: '#ffffff',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '0.9rem',
        }}>
          Export
        </button>
      </div>
    </div>
  );
};

export default Header;
