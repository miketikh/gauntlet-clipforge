import React, { useEffect, useRef, useCallback } from 'react';
import { usePlayerStore } from '../store/playerStore';
import { useProjectStore } from '../store/projectStore';
import { useMediaStore } from '../store/mediaStore';
import { findClipAtPosition } from '../utils/timelineCalculations';

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
  const animationFrameRef = useRef<number>();
  const isSeekingRef = useRef<boolean>(false); // Track if user is manually seeking

  const { isPlaying, currentTime, volume, playbackRate, play, pause, setCurrentTime } = usePlayerStore();
  const { currentProject, playheadPosition, setPlayheadPosition } = useProjectStore();
  const { mediaFiles } = useMediaStore();

  // Find the clip at the current playhead position
  const currentClip = currentProject?.tracks[0] // For MVP, only play Track 0
    ? findClipAtPosition(currentProject.tracks[0], playheadPosition)
    : null;

  // Get the media file for the current clip
  const currentMedia = currentClip
    ? mediaFiles.find((m) => m.id === currentClip.mediaFileId)
    : null;

  // Load video when clip changes (NOT on every playhead update)
  useEffect(() => {
    if (videoRef.current && currentMedia) {
      const videoPath = currentMedia.path;
      // Convert to file:// URL for Electron
      const fileUrl = videoPath.startsWith('file://')
        ? videoPath
        : `file://${videoPath}`;

      // Only reload video if the source actually changed
      if (videoRef.current.src !== fileUrl) {
        videoRef.current.src = fileUrl;
      }

      // Calculate the time offset within the clip (accounting for trim)
      if (currentClip) {
        const offsetInClip = playheadPosition - currentClip.startTime;
        const videoTime = currentClip.trimStart + offsetInClip;
        // Only seek if not currently playing (avoid interrupting playback)
        if (!isPlaying || isSeekingRef.current) {
          videoRef.current.currentTime = videoTime;
          isSeekingRef.current = false;
        }
      }
    }
  }, [currentClip?.id, currentMedia?.path]); // Only depend on clip ID and media path, NOT playheadPosition

  // Handle manual playhead scrubbing (when user drags playhead while paused)
  useEffect(() => {
    if (videoRef.current && currentClip && !isPlaying) {
      const offsetInClip = playheadPosition - currentClip.startTime;
      const videoTime = currentClip.trimStart + offsetInClip;

      // Only seek if the time difference is significant (avoid micro-updates)
      if (Math.abs(videoRef.current.currentTime - videoTime) > 0.1) {
        videoRef.current.currentTime = videoTime;
      }
    }
  }, [playheadPosition, currentClip, isPlaying]);

  // Update video playback state
  useEffect(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.play().catch((error) => {
          console.error('[Preview] Error playing video:', error);
          pause();
        });
      } else {
        videoRef.current.pause();
      }
    }
  }, [isPlaying, pause]);

  // Update video volume
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
    }
  }, [volume]);

  // Update video playback rate
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  // Sync playhead with video currentTime during playback
  const updatePlayhead = useCallback(() => {
    if (videoRef.current && isPlaying && currentClip) {
      const videoTime = videoRef.current.currentTime;
      const clipTime = videoTime - currentClip.trimStart;
      const timelineTime = currentClip.startTime + clipTime;

      // Check if we've reached the end of the clip
      if (timelineTime >= currentClip.endTime) {
        // Pause at the end of the clip (for MVP, multi-clip playback is next PR)
        pause();
        setPlayheadPosition(currentClip.endTime);
      } else {
        setPlayheadPosition(timelineTime);
        setCurrentTime(videoTime);
      }

      // Continue updating
      animationFrameRef.current = requestAnimationFrame(updatePlayhead);
    }
  }, [isPlaying, currentClip, pause, setPlayheadPosition, setCurrentTime]);

  useEffect(() => {
    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(updatePlayhead);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, updatePlayhead]);

  // Handle video ended event
  const handleVideoEnded = () => {
    pause();
  };

  // Handle spacebar for play/pause
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
        isSeekingRef.current = true;
        setPlayheadPosition(Math.max(0, playheadPosition - 5));
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        isSeekingRef.current = true;
        const maxTime = currentProject?.duration || 0;
        setPlayheadPosition(Math.min(maxTime, playheadPosition + 5));
      } else if (e.code === 'KeyJ') {
        e.preventDefault();
        isSeekingRef.current = true;
        setPlayheadPosition(Math.max(0, playheadPosition - 1));
      } else if (e.code === 'KeyK') {
        e.preventDefault();
        if (isPlaying) {
          pause();
        } else {
          play();
        }
      } else if (e.code === 'KeyL') {
        e.preventDefault();
        isSeekingRef.current = true;
        setPlayheadPosition(Math.min(currentProject?.duration || 0, playheadPosition + 1));
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
    ? playheadPosition - currentClip.startTime + currentClip.trimStart
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
          minHeight: 0, // Allow flex child to shrink
          minWidth: 0,  // Allow flex child to shrink
        }}
      >
        {currentMedia ? (
          <video
            ref={videoRef}
            onEnded={handleVideoEnded}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain', // Maintains aspect ratio, letterbox/pillarbox as needed
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
            No clip at playhead position
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
          disabled={!currentMedia}
          style={{
            padding: '8px 16px',
            background: currentMedia ? '#3498db' : '#555',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: currentMedia ? 'pointer' : 'not-allowed',
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
