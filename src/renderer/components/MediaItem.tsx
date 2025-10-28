import React, { useState } from 'react';
import { MediaFile } from '../../types/media';
import { useMediaStore } from '../store/mediaStore';

interface MediaItemProps {
  mediaFile: MediaFile;
  onClick?: () => void;
}

// Helper function to format duration as MM:SS
const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const MediaItem: React.FC<MediaItemProps> = ({ mediaFile, onClick }) => {
  const [isHovered, setIsHovered] = useState(false);
  const removeMediaFile = useMediaStore((state) => state.removeMediaFile);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering parent click handlers
    if (confirm(`Delete "${mediaFile.filename}" from library?`)) {
      removeMediaFile(mediaFile.id);
    }
  };

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: 'flex',
        gap: '12px',
        padding: '10px',
        background: isHovered ? '#34495e' : 'transparent',
        cursor: 'pointer',
        borderRadius: '4px',
        transition: 'background 0.2s ease',
        position: 'relative',
      }}
    >
      {/* Thumbnail */}
      <div
        style={{
          width: '80px',
          height: '60px',
          flexShrink: 0,
          background: '#1a1a1a',
          borderRadius: '4px',
          overflow: 'hidden',
        }}
      >
        <img
          src={mediaFile.thumbnail}
          alt={mediaFile.filename}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
      </div>

      {/* Metadata */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: '4px',
          minWidth: 0, // Allow text truncation
        }}
      >
        {/* Filename */}
        <div
          style={{
            color: '#ffffff',
            fontSize: '0.875rem',
            fontWeight: 500,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {mediaFile.filename}
        </div>

        {/* Duration and Resolution */}
        <div
          style={{
            display: 'flex',
            gap: '12px',
            color: '#95a5a6',
            fontSize: '0.75rem',
          }}
        >
          <span>{formatDuration(mediaFile.duration)}</span>
          <span>
            {mediaFile.resolution.width}x{mediaFile.resolution.height}
          </span>
        </div>
      </div>

      {/* Delete button */}
      <button
        onClick={handleDelete}
        style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          background: '#e74c3c',
          color: 'white',
          border: 'none',
          borderRadius: '3px',
          padding: '4px 8px',
          fontSize: '11px',
          cursor: 'pointer',
          opacity: 0.8,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.8')}
      >
        ×
      </button>
    </div>
  );
};

export default MediaItem;
