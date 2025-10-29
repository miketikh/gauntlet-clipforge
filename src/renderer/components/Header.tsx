import React, { useState } from 'react';
import { RotateCcw, Upload, Circle, Download } from 'lucide-react';
import { selectFile, importVideo, generateThumbnail } from '../utils/ipc';
import { useMediaStore } from '../store/mediaStore';
import { useProjectStore } from '../store/projectStore';
import RecordingModal from './RecordingModal';
import ExportDialog from './ExportDialog';

const Header: React.FC = () => {
  const [isImporting, setIsImporting] = useState(false);
  const [isRecordingModalOpen, setIsRecordingModalOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
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
    <>
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
              background: 'linear-gradient(180deg, #6B7280 0%, #4B5563 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: 500,
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'linear-gradient(180deg, #9CA3AF 0%, #6B7280 100%)';
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'linear-gradient(180deg, #6B7280 0%, #4B5563 100%)';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)';
            }}
          >
            <RotateCcw size={16} />
            Reset Project
          </button>
        )}
        <button
          onClick={handleImport}
          disabled={isImporting}
          style={{
            padding: '10px 18px',
            background: isImporting ? '#4B5563' : 'linear-gradient(180deg, #6B7280 0%, #4B5563 100%)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            cursor: isImporting ? 'not-allowed' : 'pointer',
            fontSize: '0.875rem',
            fontWeight: 500,
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
            transition: 'all 0.2s ease',
            opacity: isImporting ? 0.6 : 1,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
          onMouseEnter={(e) => {
            if (!isImporting) {
              e.currentTarget.style.background = 'linear-gradient(180deg, #9CA3AF 0%, #6B7280 100%)';
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isImporting) {
              e.currentTarget.style.background = 'linear-gradient(180deg, #6B7280 0%, #4B5563 100%)';
            }
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)';
          }}
        >
          <Upload size={16} />
          {isImporting ? 'Importing...' : 'Import'}
        </button>
        <button
          onClick={() => setIsRecordingModalOpen(true)}
          style={{
            padding: '10px 18px',
            background: 'linear-gradient(180deg, #B91C1C 0%, #991B1B 100%)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: 500,
            boxShadow: '0 2px 4px rgba(185, 28, 28, 0.3)',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'linear-gradient(180deg, #DC2626 0%, #B91C1C 100%)';
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 4px 8px rgba(220, 38, 38, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'linear-gradient(180deg, #B91C1C 0%, #991B1B 100%)';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 2px 4px rgba(185, 28, 28, 0.3)';
          }}
        >
          <Circle size={12} fill="currentColor" />
          Record
        </button>
        <button
          onClick={() => setIsExportDialogOpen(true)}
          style={{
            padding: '10px 20px',
            background: 'linear-gradient(180deg, #3B82F6 0%, #2563EB 100%)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: 600,
            boxShadow: '0 2px 4px rgba(59, 130, 246, 0.3)',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'linear-gradient(180deg, #60A5FA 0%, #3B82F6 100%)';
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 4px 8px rgba(59, 130, 246, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'linear-gradient(180deg, #3B82F6 0%, #2563EB 100%)';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 2px 4px rgba(59, 130, 246, 0.3)';
          }}
        >
          <Download size={16} />
          Export
        </button>
      </div>
    </div>

    <RecordingModal isOpen={isRecordingModalOpen} onClose={() => setIsRecordingModalOpen(false)} />
    <ExportDialog isOpen={isExportDialogOpen} onClose={() => setIsExportDialogOpen(false)} />
    </>
  );
};

export default Header;
