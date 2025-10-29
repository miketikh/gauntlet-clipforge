import React, { useEffect, useRef, useCallback } from 'react';
import { Play, Pause } from 'lucide-react';
import { usePlayerStore } from '../store/playerStore';
import { useProjectStore } from '../store/projectStore';
import { TimelinePlayer } from '../services/TimelinePlayer';

/**
 * Format seconds to MM:SS or HH:MM:SS
 */
const formatTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

const Preview: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const timelinePlayerRef = useRef<TimelinePlayer | null>(null);
  const isUserSeekingRef = useRef<boolean>(false); // Track if user is manually seeking
  const wasPlayingRef = useRef<boolean>(false); // Track previous play state to detect changes

  const { isPlaying, volume, playbackRate, play, pause } = usePlayerStore();
  const { currentProject, playheadPosition, setPlayheadPosition } = useProjectStore();

  // Initialize TimelinePlayer when project changes
  useEffect(() => {
    if (!currentProject) {
      if (timelinePlayerRef.current) {
        timelinePlayerRef.current.destroy();
        timelinePlayerRef.current = null;
      }
      return;
    }

    // Check that video element is ready
    if (!videoRef.current) {
      console.error('[Preview] Video element not ready for TimelinePlayer');
      return;
    }

    // Create TimelinePlayer with the video element
    const player = new TimelinePlayer(
      currentProject,
      {
        onPlayheadUpdate: (position: number) => {
          if (!isUserSeekingRef.current) {
            setPlayheadPosition(position);
          }
        },
        onPlaybackEnd: () => {
          pause();
        },
      },
      videoRef.current
    );

    timelinePlayerRef.current = player;

    // Update player with current settings
    player.setGlobalVolume(volume);
    player.setPlaybackRate(playbackRate);

    // Seek to current playhead position
    player.seek(playheadPosition);

    return () => {
      if (timelinePlayerRef.current) {
        timelinePlayerRef.current.destroy();
        timelinePlayerRef.current = null;
      }
    };
  }, [currentProject?.id]); // Only recreate when project ID changes, not when project data mutates

  // Update timeline player when project data changes
  useEffect(() => {
    if (timelinePlayerRef.current && currentProject) {
      timelinePlayerRef.current.updateProject(currentProject);
    }
  }, [currentProject?.tracks, currentProject?.duration]);

  // Handle play/pause changes
  // Only trigger when isPlaying state changes (not on clip changes)
  // wasPlayingRef prevents infinite loops from RAF updates triggering state changes
  useEffect(() => {
    if (!timelinePlayerRef.current || isUserSeekingRef.current) return;

    // Only act when play state actually changes
    if (isPlaying !== wasPlayingRef.current) {
      if (isPlaying) {
        timelinePlayerRef.current.play(playheadPosition);
      } else {
        timelinePlayerRef.current.pause();
      }
      wasPlayingRef.current = isPlaying;
    }
  }, [isPlaying, playheadPosition]);

  // Handle playhead scrubbing (when user manually moves playhead)
  const previousPlayheadRef = useRef<number>(playheadPosition);

  useEffect(() => {
    // Only seek when paused - don't react to RAF updates during playback
    if (isPlaying) {
      previousPlayheadRef.current = playheadPosition;
      return;
    }

    // Seek if playhead position changed (enable responsive scrubbing during drag)
    const positionDelta = Math.abs(playheadPosition - previousPlayheadRef.current);

    if (positionDelta > 0.03) { // ~1 frame at 30fps for smooth scrubbing
      if (timelinePlayerRef.current && !isUserSeekingRef.current) {
        isUserSeekingRef.current = true;
        timelinePlayerRef.current.seek(playheadPosition).then(() => {
          isUserSeekingRef.current = false;
        });
      }
    }
    previousPlayheadRef.current = playheadPosition;
  }, [playheadPosition, isPlaying]);

  // Update volume
  useEffect(() => {
    if (timelinePlayerRef.current) {
      timelinePlayerRef.current.setGlobalVolume(volume);
    }
    if (videoRef.current) {
      videoRef.current.volume = volume;
    }
  }, [volume]);

  // Update playback rate
  useEffect(() => {
    if (timelinePlayerRef.current) {
      timelinePlayerRef.current.setPlaybackRate(playbackRate);
    }
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't intercept keyboard shortcuts when user is typing in an input/textarea
      const target = e.target as HTMLElement;
      const isInputField = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

      // Skip all shortcuts if user is typing
      if (isInputField) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        if (isPlaying) {
          pause();
        } else {
          play();
        }
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        const newPosition = Math.max(0, playheadPosition - 5);
        setPlayheadPosition(newPosition);
        if (timelinePlayerRef.current) {
          timelinePlayerRef.current.seek(newPosition);
        }
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        const maxTime = currentProject?.duration || 0;
        const newPosition = Math.min(maxTime, playheadPosition + 5);
        setPlayheadPosition(newPosition);
        if (timelinePlayerRef.current) {
          timelinePlayerRef.current.seek(newPosition);
        }
      } else if (e.code === 'KeyJ') {
        e.preventDefault();
        const newPosition = Math.max(0, playheadPosition - 1);
        setPlayheadPosition(newPosition);
        if (timelinePlayerRef.current) {
          timelinePlayerRef.current.seek(newPosition);
        }
      } else if (e.code === 'KeyK' && !e.metaKey && !e.ctrlKey) {
        // Only trigger on bare 'K' key, not Cmd+K or Ctrl+K (which is used for splitting)
        e.preventDefault();
        if (isPlaying) {
          pause();
        } else {
          play();
        }
      } else if (e.code === 'KeyL') {
        e.preventDefault();
        const newPosition = Math.min(currentProject?.duration || 0, playheadPosition + 1);
        setPlayheadPosition(newPosition);
        if (timelinePlayerRef.current) {
          timelinePlayerRef.current.seek(newPosition);
        }
      }
    },
    [isPlaying, play, pause, playheadPosition, setPlayheadPosition, currentProject]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // Toggle play/pause
  const handlePlayPause = () => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  };

  // Handle volume change
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    usePlayerStore.getState().setVolume(newVolume);
  };

  // Calculate duration for display
  // Show total timeline duration, not current media duration
  const duration = currentProject?.duration || 0;
  // Always show playhead position on timeline, not video element's currentTime
  const displayTime = playheadPosition;

  return (
    <div
      style={{
        height: '100%',
        background: '#000000',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Video Container */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          minHeight: 0,
          minWidth: 0,
        }}
      >
        <video
          ref={videoRef}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
          }}
        />
      </div>

      {/* Playback Controls */}
      <div
        style={{
          padding: '16px 24px',
          background: 'linear-gradient(180deg, #1a1a1a 0%, #151515 100%)',
          borderTop: '2px solid #2a3c4d',
          display: 'flex',
          alignItems: 'center',
          gap: '20px',
          boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.3)',
        }}
      >
        {/* Play/Pause Button */}
        <button
          onClick={handlePlayPause}
          style={{
            padding: '10px 20px',
            minWidth: '110px',
            background: isPlaying
              ? 'linear-gradient(180deg, #718096 0%, #5a6472 100%)'
              : 'linear-gradient(180deg, #48bb78 0%, #38a169 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 600,
            boxShadow: isPlaying
              ? '0 2px 4px rgba(0, 0, 0, 0.2)'
              : '0 2px 6px rgba(56, 161, 105, 0.3)',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          {isPlaying ? <Pause size={16} /> : <Play size={16} fill="currentColor" />}
          {isPlaying ? 'Pause' : 'Play'}
        </button>

        {/* Time Display */}
        <div
          style={{
            color: '#e2e8f0',
            fontSize: '14px',
            fontFamily: 'monospace',
            minWidth: '120px',
            fontWeight: 500,
            background: '#0f0f0f',
            padding: '8px 14px',
            borderRadius: '6px',
            border: '1px solid #2a2a2a',
          }}
        >
          {formatTime(displayTime)} / {formatTime(duration)}
        </div>

        {/* Playhead Position Display */}
        <div
          style={{
            color: '#a0aec0',
            fontSize: '12px',
            fontFamily: 'monospace',
            background: '#0f0f0f',
            padding: '6px 12px',
            borderRadius: '4px',
            border: '1px solid #2a2a2a',
          }}
        >
          Timeline: {formatTime(playheadPosition)}
        </div>

        {/* Volume Control */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            background: '#0f0f0f',
            padding: '8px 16px',
            borderRadius: '6px',
            border: '1px solid #2a2a2a',
          }}
        >
          <span style={{ color: '#cbd5e0', fontSize: '13px', fontWeight: 500 }}>Volume</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={handleVolumeChange}
            style={{
              width: '100px',
              accentColor: '#48bb78',
            }}
          />
          <span style={{ color: '#a0aec0', fontSize: '12px', minWidth: '40px', fontFamily: 'monospace' }}>
            {Math.round(volume * 100)}%
          </span>
        </div>

        {/* Keyboard Shortcuts Info */}
        <div
          style={{
            marginLeft: 'auto',
            color: '#718096',
            fontSize: '11px',
            background: '#0f0f0f',
            padding: '8px 14px',
            borderRadius: '6px',
            border: '1px solid #2a2a2a',
            fontFamily: 'monospace',
          }}
        >
          Space: Play/Pause | ←/→: Seek ±5s | J/K/L: -1s/Pause/+1s
        </div>
      </div>
    </div>
  );
};

export default Preview;
