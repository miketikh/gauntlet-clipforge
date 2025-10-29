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
        background: 'linear-gradient(180deg, #2c3e50 0%, #273849 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        borderBottom: '1px solid #1a252f',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      }}
    >
      <h1
        style={{
          margin: 0,
          fontSize: '1.3rem',
          color: '#ffffff',
          fontWeight: 600,
          letterSpacing: '0.5px',
        }}
      >
        ClipForge
      </h1>
      <div style={{ display: 'flex', gap: '12px' }}>
        {!currentProject && (
          <button
            onClick={() => createProject('My Video Project')}
            style={{
              padding: '10px 18px',
              background: 'linear-gradient(180deg, #667eea 0%, #5a67d8 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: 500,
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)';
            }}
          >
            New Project
          </button>
        )}
        {currentProject && (
          <button
            onClick={resetProject}
            style={{
              padding: '10px 18px',
              background: 'linear-gradient(180deg, #718096 0%, #5a6472 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: 500,
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)';
            }}
          >
            Reset Project
          </button>
        )}
        <button
          onClick={handleImport}
          disabled={isImporting}
          style={{
            padding: '10px 18px',
            background: isImporting ? '#5a6472' : 'linear-gradient(180deg, #4a5568 0%, #3d4452 100%)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            cursor: isImporting ? 'not-allowed' : 'pointer',
            fontSize: '0.875rem',
            fontWeight: 500,
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
            transition: 'all 0.2s ease',
            opacity: isImporting ? 0.6 : 1,
          }}
          onMouseEnter={(e) => {
            if (!isImporting) {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)';
          }}
        >
          {isImporting ? 'Importing...' : 'Import'}
        </button>
        <button
          style={{
            padding: '10px 18px',
            background: 'linear-gradient(180deg, #4a5568 0%, #3d4452 100%)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: 500,
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)';
          }}
        >
          Record
        </button>
        <button
          style={{
            padding: '10px 20px',
            background: 'linear-gradient(180deg, #48bb78 0%, #38a169 100%)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: 600,
            boxShadow: '0 2px 6px rgba(56, 161, 105, 0.4)',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 4px 10px rgba(56, 161, 105, 0.5)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 2px 6px rgba(56, 161, 105, 0.4)';
          }}
        >
          Export
        </button>
      </div>
    </div>
  );
};

export default Header;
