import React, { useState } from 'react';
import { useDrag } from 'react-dnd';
import { MediaFile, MediaType } from '../../types/media';
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

  // Setup drag source
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'MEDIA_ITEM',
    item: { mediaFileId: mediaFile.id, mediaFile },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering parent click handlers
    if (confirm(`Delete "${mediaFile.filename}" from library?`)) {
      removeMediaFile(mediaFile.id);
    }
  };

  return (
    <div
      ref={drag}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: 'flex',
        gap: '12px',
        padding: '12px',
        background: isHovered ? '#3d5464' : 'transparent',
        cursor: isDragging ? 'grabbing' : 'pointer',
        borderRadius: '6px',
        transition: 'all 0.2s ease',
        position: 'relative',
        opacity: isDragging ? 0.5 : 1,
        border: isHovered ? '1px solid #4a5f6f' : '1px solid transparent',
        boxShadow: isHovered ? '0 2px 8px rgba(0, 0, 0, 0.2)' : 'none',
      }}
    >
      {/* Thumbnail or Audio Icon */}
      <div
        style={{
          width: '80px',
          height: '60px',
          flexShrink: 0,
          background: '#0f0f0f',
          borderRadius: '6px',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid #2a2a2a',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
        }}
      >
        {mediaFile.type === MediaType.AUDIO ? (
          // Show audio icon for audio files
          <div
            style={{
              fontSize: '2rem',
            }}
          >
            🎵
          </div>
        ) : (
          // Show video thumbnail
          <img
            src={mediaFile.thumbnail}
            alt={mediaFile.filename}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        )}
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

        {/* Duration and Resolution/Type */}
        <div
          style={{
            display: 'flex',
            gap: '12px',
            color: '#95a5a6',
            fontSize: '0.75rem',
          }}
        >
          <span>{formatDuration(mediaFile.duration)}</span>
          {mediaFile.type === MediaType.AUDIO ? (
            <span>Audio</span>
          ) : mediaFile.resolution ? (
            <span>
              {mediaFile.resolution.width}x{mediaFile.resolution.height}
            </span>
          ) : null}
        </div>
      </div>

      {/* Delete button - only show on hover */}
      <button
        onClick={handleDelete}
        style={{
          position: 'absolute',
          top: '6px',
          right: '6px',
          background: 'rgba(231, 76, 60, 0.9)',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          width: '24px',
          height: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '16px',
          cursor: 'pointer',
          opacity: isHovered ? 1 : 0,
          transition: 'opacity 0.2s ease, background 0.2s ease',
          zIndex: 10,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(231, 76, 60, 1)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(231, 76, 60, 0.9)')}
      >
        ×
      </button>
    </div>
  );
};

export default MediaItem;
