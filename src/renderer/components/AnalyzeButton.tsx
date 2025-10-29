import React from 'react';
import { useProjectStore } from '../store/projectStore';
import { useAIAssistantStore } from '../store/aiAssistantStore';
import { useMediaStore } from '../store/mediaStore';

const AnalyzeButton: React.FC = () => {
  const selectedClipId = useProjectStore((state) => state.selectedClipId);
  const currentProject = useProjectStore((state) => state.currentProject);
  const selectedProfileId = useAIAssistantStore((state) => state.selectedProfileId);
  const isAnalyzing = useAIAssistantStore((state) => state.isAnalyzing);
  const analyzeClip = useAIAssistantStore((state) => state.analyzeClip);
  const mediaFiles = useMediaStore((state) => state.mediaFiles);

  // Determine button state and label
  const getButtonState = () => {
    if (isAnalyzing) {
      return {
        disabled: true,
        label: 'Analyzing...',
        showSpinner: true,
        tooltip: 'Analysis in progress',
      };
    }
    if (!selectedClipId) {
      return {
        disabled: true,
        label: 'No clip selected',
        showSpinner: false,
        tooltip: 'Select a clip from the timeline first',
      };
    }
    if (!selectedProfileId) {
      return {
        disabled: true,
        label: 'Select a profile first',
        showSpinner: false,
        tooltip: 'Choose an audience profile from the Profile Manager above',
      };
    }
    return {
      disabled: false,
      label: 'Analyze Selected Clip 🚀',
      showSpinner: false,
      tooltip: 'Analyze this clip\'s content against your selected profile',
    };
  };

  const buttonState = getButtonState();

  const handleClick = async () => {
    if (!selectedClipId || !selectedProfileId || isAnalyzing || !currentProject) return;

    try {
      // Find the clip in the timeline
      let selectedClip = null;
      for (const track of currentProject.tracks) {
        const clip = track.clips.find((c) => c.id === selectedClipId);
        if (clip) {
          selectedClip = clip;
          break;
        }
      }

      if (!selectedClip) {
        alert('Error: Selected clip not found in timeline.');
        return;
      }

      // Find the media file for this clip
      const mediaFile = mediaFiles.find((m) => m.id === selectedClip.mediaFileId);
      if (!mediaFile) {
        alert('Error: Media file not found for this clip.');
        return;
      }

      // Get the video path
      const videoPath = mediaFile.path;

      console.log('[AnalyzeButton] Starting analysis for:', videoPath);

      // Call the real analyze function
      await analyzeClip(videoPath, selectedProfileId, selectedClipId);

      console.log('[AnalyzeButton] Analysis completed successfully');
    } catch (error) {
      console.error('[AnalyzeButton] Error during analysis:', error);

      // Show user-friendly error message
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Analysis failed: ${errorMessage}\n\nPlease try again or check your API key.`);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={buttonState.disabled}
      title={buttonState.tooltip}
      style={{
        width: '100%',
        padding: '12px 16px',
        background: buttonState.disabled
          ? '#4a5568'
          : 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)',
        color: buttonState.disabled ? '#718096' : '#ffffff',
        border: 'none',
        borderRadius: '6px',
        fontSize: '0.9rem',
        fontWeight: 600,
        cursor: buttonState.disabled ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        transition: 'all 0.2s ease',
        boxShadow: buttonState.disabled
          ? 'none'
          : '0 2px 4px rgba(52, 152, 219, 0.3)',
      }}
      onMouseEnter={(e) => {
        if (!buttonState.disabled) {
          e.currentTarget.style.transform = 'translateY(-1px)';
          e.currentTarget.style.boxShadow = '0 4px 8px rgba(52, 152, 219, 0.4)';
        }
      }}
      onMouseLeave={(e) => {
        if (!buttonState.disabled) {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 2px 4px rgba(52, 152, 219, 0.3)';
        }
      }}
    >
      {buttonState.showSpinner && (
        <div
          style={{
            width: '16px',
            height: '16px',
            border: '2px solid rgba(255, 255, 255, 0.3)',
            borderTop: '2px solid #ffffff',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
      )}
      <span>{buttonState.label}</span>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </button>
  );
};

export default AnalyzeButton;
