import React, { useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, FolderOpen, RotateCcw } from 'lucide-react';
import { useExportStore, ExportConfig } from '../store/exportStore';
import { useProjectStore } from '../store/projectStore';
import { useMediaStore } from '../store/mediaStore';
import {
  selectSaveLocation,
  startExport,
  cancelExport,
  onExportProgress,
  onExportComplete,
  onExportError,
  openExportFile,
} from '../utils/ipc';
import { validateExport } from '../utils/exportValidation';

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const ExportDialog: React.FC<ExportDialogProps> = ({ isOpen, onClose }) => {
  const {
    exportConfig,
    setExportConfig,
    isExporting,
    exportProgress,
    exportError,
    startExport: setExportingState,
    updateProgress,
    completeExport,
    setExportError,
    cancelExport: cancelExportState,
  } = useExportStore();
  const currentProject = useProjectStore((state) => state.currentProject);
  const mediaFiles = useMediaStore((state) => state.mediaFiles);

  const [resolution, setResolution] = useState<'720p' | '1080p' | 'source'>(
    exportConfig.resolution
  );
  const [frameRate, setFrameRate] = useState<24 | 30 | 60>(exportConfig.frameRate);
  const [savePath, setSavePath] = useState<string | null>(exportConfig.savePath);
  const [timeRemaining, setTimeRemaining] = useState<string | undefined>(undefined);
  const [showErrorDetails, setShowErrorDetails] = useState(false);
  const [exportCompleted, setExportCompleted] = useState(false);
  const [completedFilePath, setCompletedFilePath] = useState<string | null>(null);

  // Calculate estimated file size based on resolution and project duration
  const calculateEstimatedFileSize = (): string => {
    if (!currentProject) return '0 MB';

    const duration = currentProject.duration;

    // Rough bitrate estimates (in Mbps)
    const bitrates: Record<string, number> = {
      '720p': 3,
      '1080p': 5,
      'source': 5, // Assume similar to 1080p for estimation
    };

    const bitrate = bitrates[resolution];
    const estimatedSizeMB = (bitrate * duration) / 8; // Convert Mbps to MB

    if (estimatedSizeMB < 1) {
      return `${Math.round(estimatedSizeMB * 1024)} KB`;
    }

    return `${Math.round(estimatedSizeMB)} MB`;
  };

  // Get source resolution from first clip
  const getSourceResolution = (): string => {
    if (!currentProject || currentProject.tracks.length === 0) return 'N/A';

    // Find first video clip
    for (const track of currentProject.tracks) {
      if (track.clips.length > 0) {
        const firstClip = track.clips[0];
        const mediaFile = mediaFiles.find((f) => f.id === firstClip.mediaFileId);
        if (mediaFile?.resolution) {
          return `${mediaFile.resolution.width}x${mediaFile.resolution.height}`;
        }
      }
    }

    return 'N/A';
  };

  const handleChooseSaveLocation = async () => {
    try {
      const path = await selectSaveLocation();
      if (path) {
        setSavePath(path);
      }
    } catch (error) {
      console.error('Error selecting save location:', error);
      alert(`Error selecting save location: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Set up IPC event listeners for export progress and completion
  useEffect(() => {
    if (!isOpen) return;

    const cleanupProgress = onExportProgress((data) => {
      updateProgress(data.percent);
      setTimeRemaining(data.timeRemaining);
    });

    const cleanupComplete = onExportComplete((data) => {
      completeExport();
      setExportCompleted(true);
      setCompletedFilePath(data.outputPath);
      setExportError(null);
    });

    const cleanupError = onExportError((data) => {
      setExportError(data.message);
      setExportError(data.message);
      setExportCompleted(false);
    });

    return () => {
      cleanupProgress();
      cleanupComplete();
      cleanupError();
    };
  }, [isOpen, updateProgress, completeExport, setExportError]);

  const handleStartExport = async () => {
    // Reset state
    setExportError(null);
    setExportCompleted(false);
    setShowErrorDetails(false);

    // Validation: Check if save path is selected
    if (!savePath) {
      setExportError('Please choose an export location first.');
      return;
    }

    // Update export config
    const config: ExportConfig = {
      resolution,
      frameRate,
      videoCodec: 'h264',
      audioCodec: 'aac',
      savePath,
    };

    // Client-side validation
    const validationError = validateExport(currentProject, config);
    if (validationError) {
      setExportError(validationError);
      return;
    }

    setExportConfig(config);
    setExportingState(config);

    try {
      console.log('[ExportDialog] Starting export with config:', config);
      await startExport(currentProject, config, savePath, mediaFiles);
    } catch (error) {
      console.error('[ExportDialog] Export failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setExportError(errorMessage);
      setExportError(errorMessage);
    }
  };

  const handleCancelExport = async () => {
    try {
      await cancelExport();
      cancelExportState();
      setTimeRemaining(undefined);
    } catch (error) {
      console.error('[ExportDialog] Cancel failed:', error);
    }
  };

  const handleOpenExport = async () => {
    if (!completedFilePath) return;

    try {
      await openExportFile(completedFilePath);
    } catch (error) {
      console.error('[ExportDialog] Failed to open export file:', error);
      alert(`Failed to open file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleExportAnother = () => {
    setExportCompleted(false);
    setCompletedFilePath(null);
    setExportError(null);
    cancelExportState();
  };

  const handleClose = () => {
    // Reset state when closing
    if (!isExporting) {
      setExportCompleted(false);
      setCompletedFilePath(null);
      setExportError(null);
      setShowErrorDetails(false);
      cancelExportState();
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={handleClose}
    >
      <div
        style={{
          backgroundColor: '#2c3e50',
          borderRadius: '8px',
          padding: '24px',
          width: '500px',
          maxWidth: '90vw',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '24px',
          }}
        >
          <h2 style={{ margin: 0, color: '#ffffff', fontSize: '1.5rem' }}>
            {exportCompleted ? 'Export Complete' : 'Export Video'}
          </h2>
          <button
            onClick={handleClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#ffffff',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <X size={24} />
          </button>
        </div>

        {/* Export Success State */}
        {exportCompleted && completedFilePath && (
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '16px',
                backgroundColor: '#10B981',
                borderRadius: '6px',
                marginBottom: '20px',
              }}
            >
              <CheckCircle size={24} color="#ffffff" />
              <div>
                <div style={{ color: '#ffffff', fontWeight: 600, marginBottom: '4px' }}>
                  Export completed successfully!
                </div>
                <div style={{ color: '#D1FAE5', fontSize: '0.875rem', wordBreak: 'break-all' }}>
                  {completedFilePath}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={handleOpenExport}
                style={{
                  padding: '10px 20px',
                  background: 'linear-gradient(180deg, #10B981 0%, #059669 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <FolderOpen size={16} />
                Open Export
              </button>
              <button
                onClick={handleExportAnother}
                style={{
                  padding: '10px 20px',
                  background: 'linear-gradient(180deg, #3B82F6 0%, #2563EB 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <RotateCcw size={16} />
                Export Another
              </button>
              <button
                onClick={handleClose}
                style={{
                  padding: '10px 20px',
                  background: 'linear-gradient(180deg, #6B7280 0%, #4B5563 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                }}
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Export Error State */}
        {exportError && !exportCompleted && (
          <div style={{ marginBottom: '20px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                padding: '16px',
                backgroundColor: '#EF4444',
                borderRadius: '6px',
                marginBottom: '12px',
              }}
            >
              <AlertCircle size={24} color="#ffffff" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ flex: 1 }}>
                <div style={{ color: '#ffffff', fontWeight: 600, marginBottom: '4px' }}>
                  Export Failed
                </div>
                <div style={{ color: '#FEE2E2', fontSize: '0.875rem' }}>
                  {exportError.split('\n')[0]}
                </div>
              </div>
            </div>

            {exportError.includes('\n') && (
              <div>
                <button
                  onClick={() => setShowErrorDetails(!showErrorDetails)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: 'transparent',
                    color: '#9CA3AF',
                    border: '1px solid #4B5563',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    marginBottom: showErrorDetails ? '12px' : '0',
                  }}
                >
                  {showErrorDetails ? 'Hide Details' : 'View Details'}
                </button>

                {showErrorDetails && (
                  <div
                    style={{
                      padding: '12px',
                      backgroundColor: '#1a252f',
                      borderRadius: '4px',
                      color: '#9CA3AF',
                      fontSize: '0.75rem',
                      fontFamily: 'monospace',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-all',
                      maxHeight: '200px',
                      overflowY: 'auto',
                    }}
                  >
                    {exportError}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Only show config options if not completed */}
        {!exportCompleted && (
          <>
        {/* Resolution Options */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', color: '#ffffff', marginBottom: '8px', fontWeight: 500 }}>
            Resolution
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ display: 'flex', alignItems: 'center', color: '#ffffff', cursor: 'pointer' }}>
              <input
                type="radio"
                name="resolution"
                value="720p"
                checked={resolution === '720p'}
                onChange={(e) => setResolution(e.target.value as '720p')}
                style={{ marginRight: '8px' }}
              />
              720p (1280x720)
            </label>
            <label style={{ display: 'flex', alignItems: 'center', color: '#ffffff', cursor: 'pointer' }}>
              <input
                type="radio"
                name="resolution"
                value="1080p"
                checked={resolution === '1080p'}
                onChange={(e) => setResolution(e.target.value as '1080p')}
                style={{ marginRight: '8px' }}
              />
              1080p (1920x1080)
            </label>
            <label style={{ display: 'flex', alignItems: 'center', color: '#ffffff', cursor: 'pointer' }}>
              <input
                type="radio"
                name="resolution"
                value="source"
                checked={resolution === 'source'}
                onChange={(e) => setResolution(e.target.value as 'source')}
                style={{ marginRight: '8px' }}
              />
              Source ({getSourceResolution()})
            </label>
          </div>
        </div>

        {/* Frame Rate Options */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', color: '#ffffff', marginBottom: '8px', fontWeight: 500 }}>
            Frame Rate
          </label>
          <select
            value={frameRate}
            onChange={(e) => setFrameRate(Number(e.target.value) as 24 | 30 | 60)}
            style={{
              width: '100%',
              padding: '8px 12px',
              backgroundColor: '#1a252f',
              color: '#ffffff',
              border: '1px solid #4B5563',
              borderRadius: '4px',
              fontSize: '0.875rem',
            }}
          >
            <option value={24}>24 fps</option>
            <option value={30}>30 fps</option>
            <option value={60}>60 fps</option>
          </select>
        </div>

        {/* Codec Information */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ color: '#9CA3AF', fontSize: '0.875rem' }}>
            <div style={{ marginBottom: '4px' }}>
              <strong>Video Codec:</strong> H.264
            </div>
            <div>
              <strong>Audio Codec:</strong> AAC
            </div>
          </div>
        </div>

        {/* Estimated File Size */}
        <div
          style={{
            marginBottom: '20px',
            padding: '12px',
            backgroundColor: '#1a252f',
            borderRadius: '4px',
          }}
        >
          <div style={{ color: '#9CA3AF', fontSize: '0.875rem', marginBottom: '4px' }}>
            Estimated File Size
          </div>
          <div style={{ color: '#ffffff', fontSize: '1.25rem', fontWeight: 600 }}>
            {calculateEstimatedFileSize()}
          </div>
        </div>

        {/* Save Location */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', color: '#ffffff', marginBottom: '8px', fontWeight: 500 }}>
            Export Location
          </label>
          <button
            onClick={handleChooseSaveLocation}
            style={{
              width: '100%',
              padding: '10px 16px',
              background: 'linear-gradient(180deg, #6B7280 0%, #4B5563 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: 500,
              marginBottom: '8px',
            }}
          >
            Choose Export Location...
          </button>
          {savePath && (
            <div
              style={{
                padding: '8px',
                backgroundColor: '#1a252f',
                borderRadius: '4px',
                color: '#9CA3AF',
                fontSize: '0.75rem',
                wordBreak: 'break-all',
              }}
            >
              {savePath}
            </div>
          )}
        </div>

        {/* Progress Bar (shown during export) */}
        {isExporting && (
          <div style={{ marginBottom: '20px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '8px',
              }}
            >
              <div style={{ color: '#ffffff', fontSize: '0.875rem', fontWeight: 500 }}>
                Exporting...
              </div>
              <div style={{ color: '#9CA3AF', fontSize: '0.875rem' }}>
                {Math.round(exportProgress)}% {timeRemaining && `(${timeRemaining} remaining)`}
              </div>
            </div>
            <div
              style={{
                width: '100%',
                height: '8px',
                backgroundColor: '#1a252f',
                borderRadius: '4px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${exportProgress}%`,
                  height: '100%',
                  backgroundColor: '#3B82F6',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </div>
        )}
          </>
        )}

        {/* Action Buttons - only show if not completed */}
        {!exportCompleted && (
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          {isExporting ? (
            <button
              onClick={handleCancelExport}
              style={{
                padding: '10px 20px',
                background: 'linear-gradient(180deg, #EF4444 0%, #DC2626 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: 600,
              }}
            >
              Cancel Export
            </button>
          ) : (
            <>
              <button
                onClick={handleClose}
                style={{
                  padding: '10px 20px',
                  background: 'linear-gradient(180deg, #6B7280 0%, #4B5563 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleStartExport}
                disabled={!savePath}
                style={{
                  padding: '10px 20px',
                  background: savePath
                    ? 'linear-gradient(180deg, #3B82F6 0%, #2563EB 100%)'
                    : '#4B5563',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: savePath ? 'pointer' : 'not-allowed',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  opacity: savePath ? 1 : 0.6,
                }}
              >
                Start Export
              </button>
            </>
          )}
        </div>
        )}
      </div>
    </div>
  );
};

export default ExportDialog;
