import React, { useEffect, useRef, useCallback } from 'react';
import { usePlayerStore } from '../store/playerStore';
import { useProjectStore } from '../store/projectStore';
import { useMediaStore } from '../store/mediaStore';
import { TimelinePlayer } from '../services/TimelinePlayer';
import { TimelineClip } from '../../types/timeline';
import { MediaFile } from '../../types/media';

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

  const { isPlaying, currentTime, volume, playbackRate, play, pause, setCurrentTime } = usePlayerStore();
  const { currentProject, playheadPosition, setPlayheadPosition } = useProjectStore();
  const { mediaFiles } = useMediaStore();

  // Current clip and media being displayed
  const [currentClip, setCurrentClip] = React.useState<TimelineClip | null>(null);
  const [currentMedia, setCurrentMedia] = React.useState<MediaFile | null>(null);

  // Initialize TimelinePlayer when project changes
  useEffect(() => {
    if (!currentProject) {
      if (timelinePlayerRef.current) {
        timelinePlayerRef.current.destroy();
        timelinePlayerRef.current = null;
      }
      return;
    }

    // Create TimelinePlayer
    const player = new TimelinePlayer(currentProject, {
      onPlayheadUpdate: (position: number) => {
        if (!isUserSeekingRef.current) {
          setPlayheadPosition(position);
        }
      },
      onPlaybackEnd: () => {
        pause();
      },
      onClipChange: (clip: TimelineClip | null, media: MediaFile | null) => {
        setCurrentClip(clip);
        setCurrentMedia(media);

        // Update video element source
        if (videoRef.current && media) {
          const videoPath = media.path;
          const fileUrl = videoPath.startsWith('file://') ? videoPath : `file://${videoPath}`;

          if (videoRef.current.src !== fileUrl) {
            videoRef.current.src = fileUrl;
          }
        }
      },
    });

    timelinePlayerRef.current = player;

    // Update player with current settings
    player.setVolume(volume);
    player.setPlaybackRate(playbackRate);

    // Seek to current playhead position
    player.seek(playheadPosition);

    return () => {
      if (timelinePlayerRef.current) {
        timelinePlayerRef.current.destroy();
        timelinePlayerRef.current = null;
      }
    };
  }, [currentProject]);

  // Update timeline player when project data changes
  useEffect(() => {
    if (timelinePlayerRef.current && currentProject) {
      timelinePlayerRef.current.updateProject(currentProject);
    }
  }, [currentProject?.tracks, currentProject?.duration]);

  // Handle play/pause changes
  useEffect(() => {
    if (!timelinePlayerRef.current) return;

    if (isPlaying) {
      timelinePlayerRef.current.play(playheadPosition);
    } else {
      timelinePlayerRef.current.pause();
    }
  }, [isPlaying]);

  // Handle playhead scrubbing (when user manually moves playhead)
  const previousPlayheadRef = useRef<number>(playheadPosition);
  useEffect(() => {
    // Only seek if the playhead position changed externally (not from TimelinePlayer)
    if (Math.abs(playheadPosition - previousPlayheadRef.current) > 0.5) {
      if (timelinePlayerRef.current && !isPlaying) {
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
      timelinePlayerRef.current.setVolume(volume);
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

  // Sync video element with TimelinePlayer
  useEffect(() => {
    if (!videoRef.current) return;

    const video = videoRef.current;

    // Sync play/pause state
    if (isPlaying) {
      video.play().catch((error) => {
        console.error('[Preview] Error playing video:', error);
      });
    } else {
      video.pause();
    }

    // Update current time display
    const updateTime = () => {
      if (video && currentClip) {
        const videoTime = video.currentTime;
        setCurrentTime(videoTime);
      }
    };

    video.addEventListener('timeupdate', updateTime);

    return () => {
      video.removeEventListener('timeupdate', updateTime);
    };
  }, [isPlaying, currentClip, setCurrentTime]);

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
      } else if (e.code === 'KeyK') {
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
  const duration = currentMedia?.duration || 0;
  const displayTime = currentClip
    ? currentTime
    : 0;

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
        {currentMedia ? (
          <video
            ref={videoRef}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
            }}
          />
        ) : (
          <p
            style={{
              color: '#7f8c8d',
              fontSize: '1.2rem',
              fontWeight: 300,
            }}
          >
            {currentProject?.tracks[0]?.clips.length === 0
              ? 'No clips on timeline'
              : 'No clip at playhead position'}
          </p>
        )}
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
          disabled={!currentMedia && !currentProject?.tracks[0]?.clips.length}
          style={{
            padding: '8px 16px',
            background: (currentMedia || currentProject?.tracks[0]?.clips.length) ? '#3498db' : '#555',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: (currentMedia || currentProject?.tracks[0]?.clips.length) ? 'pointer' : 'not-allowed',
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
