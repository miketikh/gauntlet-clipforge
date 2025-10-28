import React, { useState } from 'react';
import { useMediaStore } from '../store/mediaStore';
import MediaItem from './MediaItem';
import { importVideo, generateThumbnail, getFilePathForDrop } from '../utils/ipc';

const MediaLibrary: React.FC = () => {
  const mediaFiles = useMediaStore((state) => state.mediaFiles);
  const addMediaFile = useMediaStore((state) => state.addMediaFile);

  const [isDragging, setIsDragging] = useState(false);
  const [importProgress, setImportProgress] = useState<string | null>(null);

  // Allowed media file extensions
  const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.webm', '.avi', '.mkv'];
  const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.aac', '.m4a', '.ogg'];
  const MEDIA_EXTENSIONS = [...VIDEO_EXTENSIONS, ...AUDIO_EXTENSIONS];

  // Check if file is a supported media file (video or audio)
  const isMediaFile = (filename: string): boolean => {
    const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
    return MEDIA_EXTENSIONS.includes(ext);
  };

  // Handle drag enter - show overlay
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  // Handle drag leave - hide overlay (but check if truly leaving)
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Only hide if we're leaving the main container
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;

    if (x <= rect.left || x >= rect.right || y <= rect.top || y >= rect.bottom) {
      setIsDragging(false);
    }
  };

  // Handle drag over - necessary to allow drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  // Handle drop - import files
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    console.log('Files dropped:', files.map(f => f.name));

    // Filter to media files only (video or audio)
    const mediaFiles = files.filter(file => isMediaFile(file.name));
    const invalidFiles = files.filter(file => !isMediaFile(file.name));

    // Warn about non-media files
    if (invalidFiles.length > 0) {
      console.warn('Skipping non-media files:', invalidFiles.map(f => f.name));
      if (mediaFiles.length === 0) {
        alert(`No valid media files found. Please drop video or audio files.`);
        return;
      } else {
        alert(
          `Skipped ${invalidFiles.length} non-media file(s). Importing ${mediaFiles.length} media file(s)...`
        );
      }
    }

    // Import media files sequentially
    for (let i = 0; i < mediaFiles.length; i++) {
      const file = mediaFiles[i];
      try {
        setImportProgress(`Importing ${i + 1} of ${mediaFiles.length} files...`);
        console.log(`Importing file ${i + 1}/${mediaFiles.length}:`, file.name);

        // Get file path using webUtils (works on both macOS and Windows)
        const filePath = getFilePathForDrop(file);
        console.log('File path:', filePath);

        // Import video and get metadata
        const mediaFile = await importVideo(filePath);
        console.log('Video imported successfully:', mediaFile);

        // Generate thumbnail
        const thumbnailUrl = await generateThumbnail(filePath);
        console.log('Thumbnail generated');

        // Update media file with thumbnail and add to store
        mediaFile.thumbnail = thumbnailUrl;
        addMediaFile(mediaFile);
        console.log('Media file added to store');
      } catch (error) {
        console.error(`Error importing ${file.name}:`, error);
        alert(
          `Error importing ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    setImportProgress(null);
  };

  return (
    <div
      style={{
        height: '100%',
        background: '#2c3e50',
        borderRight: '1px solid #1a1a1a',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
      }}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div
        style={{
          padding: '15px 20px',
          borderBottom: '1px solid #1a1a1a',
          background: '#34495e',
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: '1rem',
            color: '#ffffff',
            fontWeight: 600,
          }}
        >
          Media Library
        </h2>
      </div>

      {/* Content Area */}
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          padding: mediaFiles.length > 0 ? '10px' : '20px',
        }}
      >
        {mediaFiles.length === 0 ? (
          // Empty State
          <div
            style={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <p
              style={{
                color: '#7f8c8d',
                fontSize: '0.9rem',
                textAlign: 'center',
                lineHeight: 1.6,
              }}
            >
              Click Import to get started
              <br />
              or drag and drop media files here
            </p>
          </div>
        ) : (
          // Media List
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            {mediaFiles.map((file) => (
              <MediaItem key={file.id} mediaFile={file} />
            ))}
          </div>
        )}
      </div>

      {/* Drag-and-Drop Overlay */}
      {isDragging && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(52, 152, 219, 0.15)',
            border: '3px dashed #3498db',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              textAlign: 'center',
              color: '#3498db',
              fontSize: '1.2rem',
              fontWeight: 600,
            }}
          >
            <div style={{ fontSize: '3rem', marginBottom: '10px' }}>📁</div>
            Drop media files here
            <div
              style={{
                fontSize: '0.9rem',
                color: '#7f8c8d',
                marginTop: '5px',
                fontWeight: 400,
              }}
            >
              Video: .mp4, .mov, .webm, .avi, .mkv
              <br />
              Audio: .mp3, .wav, .aac, .m4a, .ogg
            </div>
          </div>
        </div>
      )}

      {/* Import Progress Overlay */}
      {importProgress && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(44, 62, 80, 0.95)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999,
          }}
        >
          <div
            style={{
              textAlign: 'center',
              color: '#ffffff',
              fontSize: '1rem',
            }}
          >
            <div style={{ fontSize: '2rem', marginBottom: '10px' }}>⏳</div>
            {importProgress}
          </div>
        </div>
      )}
    </div>
  );
};

export default MediaLibrary;
