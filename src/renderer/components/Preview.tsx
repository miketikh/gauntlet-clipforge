import React from 'react';

const Preview: React.FC = () => {
  return (
    <div style={{
      height: '100%',
      background: '#000000',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <p style={{
        color: '#7f8c8d',
        fontSize: '1.2rem',
        fontWeight: 300,
      }}>
        Preview
      </p>
    </div>
  );
};

export default Preview;
