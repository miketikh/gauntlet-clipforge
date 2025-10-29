import React, { useEffect, useRef, useState } from 'react';
import { useAIAssistantStore } from '../store/aiAssistantStore';
import ProfileManager from './ProfileManager';
import LoadingAnalysis from './LoadingAnalysis';
import AnalysisDisplay from './AnalysisDisplay';
import AnalyzeButton from './AnalyzeButton';

const AIAssistantPanel: React.FC = () => {
  const isOpen = useAIAssistantStore((state) => state.isPanelOpen);
  const panelWidth = useAIAssistantStore((state) => state.panelWidth);
  const togglePanel = useAIAssistantStore((state) => state.togglePanel);
  const setPanelOpen = useAIAssistantStore((state) => state.setPanelOpen);
  const isAnalyzing = useAIAssistantStore((state) => state.isAnalyzing);
  const currentAnalysis = useAIAssistantStore((state) => state.currentAnalysis);

  const analyzeButtonRef = useRef<HTMLDivElement>(null);

  // API Key state management
  const [hasKey, setHasKey] = useState(false);
  const [isEditingKey, setIsEditingKey] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [isSavingKey, setIsSavingKey] = useState(false);
  const [keySuccessMessage, setKeySuccessMessage] = useState('');
  const [keyErrorMessage, setKeyErrorMessage] = useState('');

  /**
   * Check if API key exists on mount
   */
  useEffect(() => {
    if (isOpen) {
      window.ai.hasApiKey().then(setHasKey).catch(() => setHasKey(false));
    }
  }, [isOpen]);

  /**
   * Handle saving API key
   */
  const handleSaveKey = async () => {
    setKeyErrorMessage('');
    setKeySuccessMessage('');

    if (!apiKeyInput.trim()) {
      setKeyErrorMessage('API key cannot be empty');
      return;
    }

    setIsSavingKey(true);
    try {
      await window.ai.saveApiKey(apiKeyInput.trim());
      setHasKey(true);
      setIsEditingKey(false);
      setApiKeyInput('');
      setKeySuccessMessage('API key saved successfully!');

      // Clear success message after 3 seconds
      setTimeout(() => setKeySuccessMessage(''), 3000);
    } catch (error) {
      console.error('[AIAssistantPanel] Failed to save API key:', error);
      setKeyErrorMessage('Failed to save API key. Please try again.');
    } finally {
      setIsSavingKey(false);
    }
  };

  /**
   * Handle changing API key
   */
  const handleChangeKey = () => {
    setIsEditingKey(true);
    setKeySuccessMessage('');
    setKeyErrorMessage('');
  };

  /**
   * Keyboard shortcuts for AI Assistant panel
   * - Escape: Close panel
   * - Cmd/Ctrl+K: Focus analyze button
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept keyboard shortcuts when user is typing in an input/textarea
      const target = e.target as HTMLElement;
      const isInputField = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

      // Skip all shortcuts if user is typing
      if (isInputField) {
        return;
      }

      // Escape key: Close panel
      if (e.key === 'Escape' && isOpen) {
        console.log('[AIAssistantPanel] Escape pressed - closing panel');
        setPanelOpen(false);
        e.preventDefault();
        return;
      }

      // Cmd/Ctrl+K: Focus analyze button
      if ((e.metaKey || e.ctrlKey) && e.key === 'k' && isOpen) {
        console.log('[AIAssistantPanel] Cmd/Ctrl+K pressed - focusing analyze button');
        // Find the analyze button and focus it
        const analyzeButton = analyzeButtonRef.current?.querySelector('button');
        if (analyzeButton) {
          analyzeButton.focus();
          e.preventDefault();
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, setPanelOpen]);

  return (
    <div
      style={{
        width: isOpen ? `${panelWidth}px` : '50px',
        height: '100%',
        background: '#1a1a1a',
        borderLeft: '1px solid #1a252f',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.3s ease',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Collapsed State - Robot Icon */}
      {!isOpen && (
        <div
          onClick={togglePanel}
          title="AI Assistant"
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontSize: '1.5rem',
            transition: 'transform 0.2s ease, background 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#2a2a2a';
            e.currentTarget.style.transform = 'scale(1.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          🤖
        </div>
      )}

      {/* Expanded State - Full Panel */}
      {isOpen && (
        <>
          {/* Panel Header */}
          <div
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid #1a252f',
              background: 'linear-gradient(180deg, #2c3e50 0%, #273849 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: '1rem',
                color: '#ffffff',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>🤖</span>
              <span>AI Assistant</span>
            </h2>
            <button
              onClick={togglePanel}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#a0aec0',
                fontSize: '1.5rem',
                cursor: 'pointer',
                padding: '4px 8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '4px',
                transition: 'all 0.2s ease',
                lineHeight: 1,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#3a4754';
                e.currentTarget.style.color = '#ffffff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = '#a0aec0';
              }}
              title="Close AI Assistant"
            >
              ×
            </button>
          </div>

          {/* Panel Content - Scrollable */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              overflowX: 'hidden',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            {/* API Key Settings Section */}
            <div
              style={{
                border: '1px solid #2a3c4d',
                borderRadius: '6px',
                background: '#2c3e50',
                padding: '16px',
              }}
            >
              <h3
                style={{
                  margin: '0 0 12px 0',
                  fontSize: '0.875rem',
                  color: '#a0aec0',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
                title="Configure your OpenAI API key for AI features"
              >
                OpenAI API Key
              </h3>

              {/* Error Message */}
              {keyErrorMessage && (
                <div
                  style={{
                    padding: '10px 12px',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '4px',
                    color: '#F87171',
                    fontSize: '0.8rem',
                    fontWeight: 500,
                    marginBottom: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <span style={{ fontSize: '1rem' }}>⚠</span>
                  {keyErrorMessage}
                </div>
              )}

              {/* Success Message */}
              {keySuccessMessage && (
                <div
                  style={{
                    padding: '10px 12px',
                    background: 'rgba(76, 175, 80, 0.1)',
                    border: '1px solid rgba(76, 175, 80, 0.3)',
                    borderRadius: '4px',
                    color: '#4caf50',
                    fontSize: '0.8rem',
                    fontWeight: 500,
                    marginBottom: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <span style={{ fontSize: '1rem' }}>✓</span>
                  {keySuccessMessage}
                </div>
              )}

              {/* Show input when editing or no key exists */}
              {(!hasKey || isEditingKey) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <input
                    type="password"
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    placeholder="sk-..."
                    style={{
                      background: '#2a2a2a',
                      border: '1px solid #404040',
                      color: '#e0e0e0',
                      padding: '10px',
                      borderRadius: '4px',
                      fontSize: '0.875rem',
                      outline: 'none',
                      transition: 'border-color 0.2s ease',
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#3498db';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#404040';
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSaveKey();
                      }
                    }}
                  />
                  <button
                    onClick={handleSaveKey}
                    disabled={isSavingKey}
                    style={{
                      padding: '10px 18px',
                      background: isSavingKey
                        ? '#4B5563'
                        : 'linear-gradient(180deg, #3B82F6 0%, #2563EB 100%)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: isSavingKey ? 'not-allowed' : 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      boxShadow: isSavingKey
                        ? 'none'
                        : '0 2px 4px rgba(59, 130, 246, 0.3)',
                      transition: 'all 0.2s ease',
                      opacity: isSavingKey ? 0.7 : 1,
                    }}
                    onMouseEnter={(e) => {
                      if (!isSavingKey) {
                        e.currentTarget.style.background = 'linear-gradient(180deg, #60A5FA 0%, #3B82F6 100%)';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSavingKey) {
                        e.currentTarget.style.background = 'linear-gradient(180deg, #3B82F6 0%, #2563EB 100%)';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }
                    }}
                  >
                    {isSavingKey ? 'Saving...' : 'Save API Key'}
                  </button>
                </div>
              )}

              {/* Show success state when key exists and not editing */}
              {hasKey && !isEditingKey && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div
                    style={{
                      color: '#4caf50',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <span style={{ fontSize: '1.2rem' }}>✓</span>
                    <span>API Key Configured</span>
                  </div>
                  <button
                    onClick={handleChangeKey}
                    style={{
                      padding: '6px 12px',
                      background: 'transparent',
                      color: '#3498db',
                      border: '1px solid #3498db',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#3498db';
                      e.currentTarget.style.color = '#ffffff';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = '#3498db';
                    }}
                  >
                    Change Key
                  </button>
                </div>
              )}
            </div>

            {/* Profile Management Section */}
            <div
              style={{
                minHeight: '250px',
                maxHeight: '500px',
                border: '1px solid #2a3c4d',
                borderRadius: '6px',
                background: '#2c3e50',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <h3
                style={{
                  margin: '0 0 16px 0',
                  fontSize: '0.875rem',
                  color: '#a0aec0',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
                title="Create and manage audience profiles for AI analysis"
              >
                Profile Management
              </h3>
              <div
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  overflowX: 'hidden',
                }}
              >
                <ProfileManager />
              </div>
            </div>

            {/* Analyze Clip Section */}
            <div
              ref={analyzeButtonRef}
              style={{
                minHeight: '60px',
                border: '1px solid #2a3c4d',
                borderRadius: '6px',
                background: '#2c3e50',
                padding: '16px',
              }}
            >
              <h3
                style={{
                  margin: '0 0 12px 0',
                  fontSize: '0.875rem',
                  color: '#a0aec0',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
                title="Select a clip and profile, then click analyze"
              >
                Analyze Clip
              </h3>
              <AnalyzeButton />
            </div>

            {/* Analysis Results Section */}
            <div
              style={{
                flex: 1,
                minHeight: '250px',
                border: '1px solid #2a3c4d',
                borderRadius: '6px',
                background: '#2c3e50',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              <h3
                style={{
                  margin: '0',
                  padding: '16px 16px 12px 16px',
                  fontSize: '0.875rem',
                  color: '#a0aec0',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  borderBottom: '1px solid #2a3c4d',
                }}
                title="AI analysis results with clickable timestamps"
              >
                Analysis Results
              </h3>
              {/* Show LoadingAnalysis when analyzing, AnalysisDisplay when done, or empty state */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {isAnalyzing ? (
                  <LoadingAnalysis />
                ) : currentAnalysis ? (
                  <AnalysisDisplay />
                ) : (
                  <div
                    style={{
                      color: '#718096',
                      fontSize: '0.875rem',
                      textAlign: 'center',
                      marginTop: '60px',
                      padding: '0 16px',
                      lineHeight: 1.6,
                    }}
                  >
                    <div style={{ fontSize: '2rem', marginBottom: '12px' }}>🎬</div>
                    <div style={{ color: '#a0aec0', marginBottom: '8px' }}>
                      Select a clip and click Analyze to get AI feedback
                    </div>
                    <div style={{ fontSize: '0.75rem', fontStyle: 'italic' }}>
                      Analysis results will appear here
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AIAssistantPanel;
