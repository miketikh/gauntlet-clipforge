import React, { useEffect, useRef, useCallback } from 'react';
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
  }, [!!currentProject]); // Only recreate when project existence changes (null ↔ project), not when clips change

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
      if (e.code === 'Space' && e.target === document.body) {
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
          padding: '16px',
          background: '#1a1a1a',
          borderTop: '1px solid #333',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
        }}
      >
        {/* Play/Pause Button */}
        <button
          onClick={handlePlayPause}
          style={{
            padding: '8px 16px',
            background: '#3498db',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 500,
          }}
        >
          {isPlaying ? 'Pause' : 'Play'}
        </button>

        {/* Time Display */}
        <div
          style={{
            color: '#ecf0f1',
            fontSize: '14px',
            fontFamily: 'monospace',
            minWidth: '120px',
          }}
        >
          {formatTime(displayTime)} / {formatTime(duration)}
        </div>

        {/* Playhead Position Display */}
        <div
          style={{
            color: '#95a5a6',
            fontSize: '12px',
            fontFamily: 'monospace',
          }}
        >
          Timeline: {formatTime(playheadPosition)}
        </div>

        {/* Volume Control */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span style={{ color: '#ecf0f1', fontSize: '14px' }}>Volume</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={handleVolumeChange}
            style={{
              width: '100px',
            }}
          />
          <span style={{ color: '#ecf0f1', fontSize: '12px', minWidth: '35px' }}>
            {Math.round(volume * 100)}%
          </span>
        </div>

        {/* Keyboard Shortcuts Info */}
        <div
          style={{
            marginLeft: 'auto',
            color: '#7f8c8d',
            fontSize: '12px',
          }}
        >
          Space: Play/Pause | ←/→: Seek ±5s | J/K/L: -1s/Pause/+1s
        </div>
      </div>
    </div>
  );
};

export default Preview;
