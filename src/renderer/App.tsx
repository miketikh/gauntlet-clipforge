import React from 'react';

const App: React.FC = () => {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      background: '#1a1a1a',
      color: '#ffffff',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '3rem', margin: 0 }}>ClipForge</h1>
        <p style={{ opacity: 0.7, marginTop: '1rem' }}>Video Editor - Ready to Build</p>
      </div>
    </div>
  );
};

export default App;
