import React, { useState, useEffect } from 'react';
import { useAIAssistantStore } from '../store/aiAssistantStore';
import { AnalysisStage } from '../../types/aiAssistant';

/**
 * LoadingAnalysis Component
 *
 * Displays loading state with progress indicators during AI analysis
 * Shows current stage (extracting, transcribing, analyzing) with visual feedback
 * Includes fade-in animation, smooth transitions, and cancel button
 */
const LoadingAnalysis: React.FC = () => {
  const analysisStage = useAIAssistantStore((state) => state.analysisStage);
  const clearAnalysis = useAIAssistantStore((state) => state.clearAnalysis);
  const [fadeIn, setFadeIn] = useState(false);
  const [stageText, setStageText] = useState('');

  // Map stages to display information
  const getStageInfo = (stage: AnalysisStage) => {
    switch (stage) {
      case 'extracting':
        return {
          text: 'Extracting audio from clip...',
          progress: 1,
          total: 3,
        };
      case 'transcribing':
        return {
          text: 'Transcribing with Whisper...',
          progress: 2,
          total: 3,
        };
      case 'analyzing':
        return {
          text: 'Analyzing content with AI...',
          progress: 3,
          total: 3,
        };
      default:
        return {
          text: 'Initializing analysis...',
          progress: 0,
          total: 3,
        };
    }
  };

  const stageInfo = getStageInfo(analysisStage);

  /**
   * Handle fade-in animation and smooth stage transitions
   */
  useEffect(() => {
    // Fade in on mount
    setFadeIn(false);
    setTimeout(() => setFadeIn(true), 50);

    // Smooth text transition when stage changes
    setStageText('');
    setTimeout(() => setStageText(stageInfo.text), 100);
  }, [analysisStage, stageInfo.text]);

  /**
   * Cancel the analysis
   */
  const handleCancel = () => {
    console.log('[LoadingAnalysis] Analysis cancelled by user');
    clearAnalysis();
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 24px',
        minHeight: '300px',
        opacity: fadeIn ? 1 : 0,
        transition: 'opacity 0.3s ease-in',
      }}
    >
      {/* Spinner */}
      <div
        style={{
          width: '60px',
          height: '60px',
          border: '4px solid rgba(52, 152, 219, 0.2)',
          borderTop: '4px solid #3498db',
          borderRadius: '50%',
          marginBottom: '32px',
          animation: 'spin 1s linear infinite',
        }}
      />

      {/* Stage Text - With smooth transition */}
      <div
        style={{
          fontSize: '1.125rem',
          fontWeight: 500,
          color: '#f1f5f9',
          marginBottom: '12px',
          textAlign: 'center',
          opacity: stageText ? 1 : 0,
          transition: 'opacity 0.2s ease-in',
          minHeight: '27px',
        }}
      >
        {stageText || stageInfo.text}
      </div>

      {/* Progress Indicator */}
      <div
        style={{
          fontSize: '0.875rem',
          color: '#94a3b8',
          marginBottom: '24px',
        }}
      >
        Step {stageInfo.progress} of {stageInfo.total}
      </div>

      {/* Progress Dots */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '24px',
        }}
      >
        {[1, 2, 3].map((step) => (
          <div
            key={step}
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: step <= stageInfo.progress ? '#3498db' : '#334155',
              transition: 'background-color 0.3s ease',
            }}
          />
        ))}
      </div>

      {/* Estimated Time */}
      <div
        style={{
          fontSize: '0.875rem',
          color: '#64748b',
          fontStyle: 'italic',
          marginBottom: '24px',
        }}
      >
        ~30 seconds remaining
      </div>

      {/* Cancel Button */}
      <button
        onClick={handleCancel}
        title="Stop the analysis process"
        style={{
          padding: '8px 16px',
          fontSize: '0.875rem',
          color: '#f1f5f9',
          backgroundColor: '#475569',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#64748b';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#475569';
        }}
      >
        Cancel Analysis
      </button>

      {/* CSS Animation */}
      <style>
        {`
          @keyframes spin {
            0% {
              transform: rotate(0deg);
            }
            100% {
              transform: rotate(360deg);
            }
          }
        `}
      </style>
    </div>
  );
};

export default LoadingAnalysis;
