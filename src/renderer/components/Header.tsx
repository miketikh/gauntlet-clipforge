import React, { useState } from 'react';
import { selectFile, importVideo, generateThumbnail } from '../utils/ipc';
import { useMediaStore } from '../store/mediaStore';
import { useProjectStore } from '../store/projectStore';

const Header: React.FC = () => {
  const [isImporting, setIsImporting] = useState(false);
  const addMediaFile = useMediaStore((state) => state.addMediaFile);
  const createProject = useProjectStore((state) => state.createProject);
  const resetProject = useProjectStore((state) => state.resetProject);
  const currentProject = useProjectStore((state) => state.currentProject);

  const handleImport = async () => {
    try {
      setIsImporting(true);
      console.log('Opening file dialog...');
      const filePath = await selectFile();

      if (!filePath) {
        console.log('File selection cancelled');
        setIsImporting(false);
        return;
      }

      console.log('File selected:', filePath);

      // Import video and get metadata
      console.log('Importing video metadata...');
      const mediaFile = await importVideo(filePath);
      console.log('Video imported successfully:', mediaFile);

      // Generate thumbnail
      console.log('Generating thumbnail...');
      const thumbnailUrl = await generateThumbnail(filePath);
      console.log('Thumbnail generated:', thumbnailUrl.substring(0, 50) + '...');

      // Update media file with thumbnail
      mediaFile.thumbnail = thumbnailUrl;
      console.log('Complete MediaFile object:', mediaFile);

      // Add to media store instead of showing alert
      addMediaFile(mediaFile);
      console.log('Media file added to store');
    } catch (error) {
      console.error('Error during import:', error);
      alert(
        `Error importing video: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div
      style={{
        height: '100%',
        background: '#2c3e50',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        borderBottom: '1px solid #1a1a1a',
      }}
    >
      <h1
        style={{
          margin: 0,
          fontSize: '1.5rem',
          color: '#ffffff',
          fontWeight: 600,
        }}
      >
        ClipForge
      </h1>
      <div style={{ display: 'flex', gap: '10px' }}>
        {!currentProject && (
          <button
            onClick={() => createProject('My Video Project')}
            style={{
              padding: '8px 16px',
              background: '#9b59b6',
              color: '#ffffff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.9rem',
            }}
          >
            New Project
          </button>
        )}
        {currentProject && (
          <button
            onClick={resetProject}
            style={{
              padding: '8px 16px',
              background: '#e67e22',
              color: '#ffffff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.9rem',
            }}
          >
            Reset Project
          </button>
        )}
        <button
          onClick={handleImport}
          disabled={isImporting}
          style={{
            padding: '8px 16px',
            background: isImporting ? '#7f8c8d' : '#3498db',
            color: '#ffffff',
            border: 'none',
            borderRadius: '4px',
            cursor: isImporting ? 'not-allowed' : 'pointer',
            fontSize: '0.9rem',
            opacity: isImporting ? 0.7 : 1,
          }}
        >
          {isImporting ? 'Importing...' : 'Import'}
        </button>
        <button
          style={{
            padding: '8px 16px',
            background: '#e74c3c',
            color: '#ffffff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '0.9rem',
          }}
        >
          Record
        </button>
        <button
          style={{
            padding: '8px 16px',
            background: '#27ae60',
            color: '#ffffff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '0.9rem',
          }}
        >
          Export
        </button>
      </div>
    </div>
  );
};

export default Header;
