import React, { useState, useEffect } from 'react';
import { useAIAssistantStore } from '../store/aiAssistantStore';
import { useProjectStore } from '../store/projectStore';
import { usePlayerStore } from '../store/playerStore';
import { parseAnalysisText } from '../utils/timestampParser';

/**
 * AnalysisDisplay Component
 *
 * Displays AI analysis results with clickable timestamps
 * Shows empty state when no analysis is available
 * Includes fade-in animation, relative timestamps, and profile indicators
 */
const AnalysisDisplay: React.FC = () => {
  const currentAnalysis = useAIAssistantStore((state) => state.currentAnalysis);
  const clearAnalysis = useAIAssistantStore((state) => state.clearAnalysis);
  const profiles = useAIAssistantStore((state) => state.profiles);

  // Timeline and playback control stores
  const currentProject = useProjectStore((state) => state.currentProject);
  const setPlayheadPosition = useProjectStore((state) => state.setPlayheadPosition);
  const pause = usePlayerStore((state) => state.pause);

  // State for visual feedback and animations
  const [clickedTimestampId, setClickedTimestampId] = useState<string | null>(null);
  const [fadeIn, setFadeIn] = useState(false);
  const [relativeTime, setRelativeTime] = useState('');

  /**
   * Format relative time (e.g., "just now", "2 minutes ago")
   */
  const formatRelativeTime = (date: Date): string => {
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 10) return 'just now';
    if (seconds < 60) return `${seconds} seconds ago`;

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return minutes === 1 ? '1 minute ago' : `${minutes} minutes ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return hours === 1 ? '1 hour ago' : `${hours} hours ago`;

    const days = Math.floor(hours / 24);
    return days === 1 ? '1 day ago' : `${days} days ago`;
  };

  /**
   * Update relative time every 10 seconds
   */
  useEffect(() => {
    if (currentAnalysis) {
      // Initial fade-in animation
      setFadeIn(false);
      setTimeout(() => setFadeIn(true), 50);

      // Set initial relative time
      setRelativeTime(formatRelativeTime(currentAnalysis.analyzedAt));

      // Update relative time every 10 seconds
      const interval = setInterval(() => {
        setRelativeTime(formatRelativeTime(currentAnalysis.analyzedAt));
      }, 10000);

      return () => clearInterval(interval);
    }
  }, [currentAnalysis]);

  /**
   * Copy analysis text to clipboard
   */
  const handleCopyAnalysis = async () => {
    if (!currentAnalysis) return;

    try {
      await navigator.clipboard.writeText(currentAnalysis.analysis);
      console.log('[AnalysisDisplay] Analysis copied to clipboard');
      // TODO: Could add a toast notification here in PR 5.6
    } catch (err) {
      console.error('[AnalysisDisplay] Failed to copy analysis:', err);
    }
  };

  /**
   * Re-analyze the clip (clears current analysis)
   */
  const handleReAnalyze = () => {
    clearAnalysis();
    console.log('[AnalysisDisplay] Re-analyze requested - analysis cleared');
    // Note: User will need to click "Analyze Clip" button again (PR 5.5)
  };

  /**
   * Handle timestamp click - seek timeline to the timestamp position
   * Edge case: Handles deleted clips gracefully
   */
  const handleTimestampClick = (timestamp: number, timestampId: string) => {
    console.log('[AnalysisDisplay] Timestamp clicked:', timestamp, 'seconds');

    if (!currentAnalysis || !currentProject) {
      console.error('[AnalysisDisplay] Cannot seek - no analysis or project loaded');
      alert('Error: Cannot seek to timestamp. Please ensure a project is loaded.');
      return;
    }

    // Find the clip in the timeline
    const clipId = currentAnalysis.clipId;
    let targetClip = null;

    for (const track of currentProject.tracks) {
      const foundClip = track.clips.find((clip) => clip.id === clipId);
      if (foundClip) {
        targetClip = foundClip;
        break;
      }
    }

    // Edge case: Clip was deleted after analysis
    if (!targetClip) {
      console.error('[AnalysisDisplay] Clip not found in timeline:', clipId);
      alert('Error: The analyzed clip is no longer in the timeline. It may have been deleted.\n\nConsider re-analyzing a different clip.');
      return;
    }

    // Calculate absolute timeline position
    // Timestamp is relative to clip start, so add clip.startTime
    let absolutePosition = targetClip.startTime + timestamp;

    // Get clip duration (accounting for trim)
    const clipDuration = targetClip.endTime - targetClip.startTime;

    // Handle edge case: timestamp beyond clip duration (clamp to clip end)
    if (timestamp > clipDuration) {
      console.warn('[AnalysisDisplay] Timestamp beyond clip duration, clamping to clip end');
      absolutePosition = targetClip.endTime;
    }

    console.log('[AnalysisDisplay] Seeking to absolute position:', absolutePosition);
    console.log('[AnalysisDisplay] Clip range:', targetClip.startTime, 'to', targetClip.endTime);

    // Pause playback before seeking
    pause();

    // Seek to the calculated position
    setPlayheadPosition(absolutePosition);

    // Visual feedback: flash the clicked timestamp
    setClickedTimestampId(timestampId);
    setTimeout(() => {
      setClickedTimestampId(null);
    }, 300);
  };

  // Empty state - no analysis available
  if (!currentAnalysis) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px 24px',
          minHeight: '300px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontSize: '1rem',
            color: '#94a3b8',
            lineHeight: 1.6,
          }}
        >
          Select a clip and click Analyze to get AI feedback
        </div>
      </div>
    );
  }

  // Parse analysis text into segments (text + clickable timestamps)
  const segments = parseAnalysisText(currentAnalysis.analysis);

  // Edge case: Find profile name (handle deleted profiles)
  const profile = profiles.find((p) => p.id === currentAnalysis.profileId);
  const profileName = profile ? profile.name : 'Unknown Profile (deleted)';

  // Edge case: Check if analysis has no timestamps
  const hasTimestamps = segments.some((seg) => seg.type === 'timestamp');

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        position: 'relative',
        opacity: fadeIn ? 1 : 0,
        transition: 'opacity 0.3s ease-in',
      }}
    >
      {/* Metadata Header - Relative Time & Profile */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid #334155',
          background: 'rgba(52, 152, 219, 0.05)',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
        }}
      >
        <div
          style={{
            fontSize: '0.75rem',
            color: '#94a3b8',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
          title={currentAnalysis.analyzedAt.toLocaleString()}
        >
          <span>📊</span>
          <span>Analyzed {relativeTime}</span>
        </div>
        <div
          style={{
            fontSize: '0.75rem',
            color: '#94a3b8',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
          title={`Profile ID: ${currentAnalysis.profileId}`}
        >
          <span>👤</span>
          <span>Analyzed using: <strong style={{ color: '#e2e8f0' }}>{profileName}</strong></span>
        </div>
        {!hasTimestamps && (
          <div
            style={{
              fontSize: '0.75rem',
              color: '#f39c12',
              fontStyle: 'italic',
              marginTop: '4px',
            }}
            title="This analysis contains no clickable timestamps"
          >
            ⚠️ No timestamps found in analysis
          </div>
        )}
      </div>

      {/* Header with Copy Button */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          padding: '12px 16px',
          borderBottom: '1px solid #334155',
        }}
      >
        <button
          onClick={handleCopyAnalysis}
          title="Copy analysis text to clipboard"
          style={{
            padding: '6px 12px',
            fontSize: '0.875rem',
            color: '#3498db',
            backgroundColor: 'transparent',
            border: '1px solid #3498db',
            borderRadius: '4px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(52, 152, 219, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          Copy Analysis
        </button>
      </div>

      {/* Analysis Content - Scrollable */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px 24px',
          lineHeight: 1.6,
          color: '#f1f5f9',
          fontSize: '0.9375rem',
          whiteSpace: 'pre-wrap',
          wordWrap: 'break-word',
        }}
        className="analysis-content-scrollbar"
      >
        {/* Render parsed segments */}
        {segments.map((segment, index) => {
          if (segment.type === 'text') {
            return (
              <span key={index} style={{ color: '#e2e8f0' }}>
                {segment.content}
              </span>
            );
          } else if (segment.type === 'timestamp' && segment.timestamp) {
            const timestampValue = segment.timestamp.timestamp;
            const timestampId = segment.timestamp.id;
            const isClicked = clickedTimestampId === timestampId;

            return (
              <span
                key={index}
                onClick={() => handleTimestampClick(timestampValue, timestampId)}
                title="Click to jump to this moment in the timeline"
                style={{
                  color: isClicked ? '#f1c40f' : '#3498db',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  backgroundColor: isClicked ? 'rgba(241, 196, 15, 0.2)' : 'transparent',
                  padding: isClicked ? '2px 4px' : '0',
                  borderRadius: '3px',
                }}
                onMouseEnter={(e) => {
                  if (!isClicked) {
                    e.currentTarget.style.textDecoration = 'underline';
                    e.currentTarget.style.color = '#5dade2';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isClicked) {
                    e.currentTarget.style.textDecoration = 'none';
                    e.currentTarget.style.color = '#3498db';
                  }
                }}
              >
                {segment.content}
              </span>
            );
          }
          return null;
        })}
      </div>

      {/* Footer with Re-analyze Button */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          padding: '16px 24px',
          borderTop: '1px solid #334155',
        }}
      >
        <button
          onClick={handleReAnalyze}
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
          Re-analyze
        </button>
      </div>

      {/* Custom Scrollbar Styling */}
      <style>
        {`
          .analysis-content-scrollbar::-webkit-scrollbar {
            width: 8px;
          }

          .analysis-content-scrollbar::-webkit-scrollbar-track {
            background: #1e293b;
            border-radius: 4px;
          }

          .analysis-content-scrollbar::-webkit-scrollbar-thumb {
            background: #475569;
            border-radius: 4px;
            transition: background 0.2s ease;
          }

          .analysis-content-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #64748b;
          }
        `}
      </style>
    </div>
  );
};

export default AnalysisDisplay;
