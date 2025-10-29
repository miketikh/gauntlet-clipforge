/**
 * Project state management using Zustand
 * Handles timeline composition and playhead position
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Project, TimelineClip, TrackType } from '../../types/timeline';
import { calculateTrackDuration, calculateProjectDuration } from '../utils/timelineCalculations';
import { useMediaStore } from './mediaStore';
import { migrateProject } from '../utils/projectMigration';

/**
 * Map PiP position string to percentage coordinates
 */
const PIP_POSITION_MAP: Record<string, { x: number; y: number }> = {
  'bottom-right': { x: 75, y: 75 },
  'bottom-left': { x: 5, y: 75 },
  'top-right': { x: 75, y: 5 },
  'top-left': { x: 5, y: 5 },
};

/**
 * Map PiP size string to scale decimal
 */
const PIP_SIZE_MAP: Record<string, number> = {
  small: 0.20,
  medium: 0.25,
  large: 0.30,
};

/**
 * Command pattern structure for edit history
 */
export interface EditCommand {
  type: string;
  payload: Record<string, unknown>;
  timestamp: number;
}

interface ProjectState {
  currentProject: Project | null;
  playheadPosition: number; // Current playhead position in seconds
  commandHistory: EditCommand[]; // Command history for potential undo/redo
  selectedClipId: string | null; // Currently selected clip for editing

  // Actions
  createProject: (name: string) => void;
  resetProject: () => void;
  addClipToTrack: (
    mediaFileId: string,
    trackIndex: number,
    position: number
  ) => void;
  removeClip: (clipId: string) => void;
  updateClip: (
    clipId: string,
    changes: Partial<Omit<TimelineClip, 'id' | 'mediaFileId'>>
  ) => void;
  setPlayheadPosition: (position: number) => void;
  getProjectDuration: () => number;
  addCommand: (command: EditCommand) => void;
  setSelectedClipId: (clipId: string | null) => void;

  // Audio control actions
  setClipVolume: (clipId: string, volume: number) => void;
  setClipMuted: (clipId: string, muted: boolean) => void;
  setClipFades: (clipId: string, fadeIn: number, fadeOut: number) => void;
  setTrackVolume: (trackId: string, volume: number) => void;
  setTrackMuted: (trackId: string, muted: boolean) => void;

  // PiP recording actions
  addPiPRecording: (
    screenMediaId: string,
    webcamMediaId: string,
    pipConfig: { position: string; size: string },
    linkedRecordingId: string
  ) => void;
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      currentProject: null,
      playheadPosition: 0,
      commandHistory: [],
      selectedClipId: null,

      /**
       * Create a new project with 2 empty tracks (Main and Overlay)
       */
      createProject: (name: string) => {
        const newProject: Project = {
          id: `project-${Date.now()}`,
          name,
          tracks: [
            {
              id: `track-0-${Date.now()}`,
              name: 'Main',
              clips: [],
              type: TrackType.VIDEO,
              volume: 1.0,
              muted: false,
            },
            {
              id: `track-1-${Date.now()}`,
              name: 'Audio 1',
              clips: [],
              type: TrackType.AUDIO,
              volume: 1.0,
              muted: false,
            },
          ],
          duration: 0,
        };

        set({
          currentProject: newProject,
          playheadPosition: 0,
        });
      },

      /**
       * Reset the project - clears everything and creates a fresh project
       */
      resetProject: () => {
        // Clear media store
        const mediaStore = useMediaStore.getState();
        mediaStore.clearMedia();

        // Reset project state
        set({
          currentProject: null,
          playheadPosition: 0,
          commandHistory: [],
          selectedClipId: null,
        });

        // Create a fresh new project
        get().createProject('My Video Project');
      },

      /**
       * Add a new clip to the timeline at the specified track and position
       * Clip duration will need to be set based on the media file's duration
       * For now, we'll add a placeholder that should be updated with actual media duration
       */
      addClipToTrack: (
        mediaFileId: string,
        trackIndex: number,
        position: number
      ) => {
        const state = get();
        if (!state.currentProject) return;

        // Get actual media duration from media store
        const mediaStore = useMediaStore.getState();
        const mediaFile = mediaStore.mediaFiles.find((f) => f.id === mediaFileId);

        if (!mediaFile) {
          console.error(`[ProjectStore] Media file not found: ${mediaFileId}`);
          return;
        }

        const clipDuration = mediaFile.duration;

        const newClip: TimelineClip = {
          id: `clip-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          mediaFileId,
          trackIndex,
          startTime: position,
          endTime: position + clipDuration,
          trimStart: 0,
          trimEnd: 0,
        };

        const updatedTracks = state.currentProject.tracks.map((track, index) => {
          if (index === trackIndex) {
            return {
              ...track,
              clips: [...track.clips, newClip].sort(
                (a, b) => a.startTime - b.startTime
              ),
            };
          }
          return track;
        });

        const updatedProject = {
          ...state.currentProject,
          tracks: updatedTracks,
          duration: calculateProjectDuration(updatedTracks),
        };

        set({ currentProject: updatedProject });
      },

      /**
       * Remove a clip from the timeline
       */
      removeClip: (clipId: string) => {
        const state = get();
        if (!state.currentProject) return;

        const updatedTracks = state.currentProject.tracks.map((track) => ({
          ...track,
          clips: track.clips.filter((clip) => clip.id !== clipId),
        }));

        const updatedProject = {
          ...state.currentProject,
          tracks: updatedTracks,
          duration: calculateProjectDuration(updatedTracks),
        };

        set({ currentProject: updatedProject });
      },

      /**
       * Update clip properties (trim points, position, etc.)
       */
      updateClip: (
        clipId: string,
        changes: Partial<Omit<TimelineClip, 'id' | 'mediaFileId'>>
      ) => {
        const state = get();
        if (!state.currentProject) return;

        const updatedTracks = state.currentProject.tracks.map((track) => ({
          ...track,
          clips: track.clips
            .map((clip) => {
              if (clip.id === clipId) {
                return { ...clip, ...changes };
              }
              return clip;
            })
            .sort((a, b) => a.startTime - b.startTime),
        }));

        const updatedProject = {
          ...state.currentProject,
          tracks: updatedTracks,
          duration: calculateProjectDuration(updatedTracks),
        };

        set({ currentProject: updatedProject });
      },

      /**
       * Set the playhead position
       */
      setPlayheadPosition: (position: number) => {
        set({ playheadPosition: Math.max(0, position) });
      },

      /**
       * Calculate total project duration (longest track duration)
       */
      getProjectDuration: () => {
        const state = get();
        if (!state.currentProject || state.currentProject.tracks.length === 0) {
          return 0;
        }

        return Math.max(
          ...state.currentProject.tracks.map(calculateTrackDuration)
        );
      },

      /**
       * Add a command to the command history (max 50 entries)
       */
      addCommand: (command: EditCommand) => {
        set((state) => {
          const newHistory = [...state.commandHistory, command];
          // Keep only the last 50 commands to avoid memory issues
          if (newHistory.length > 50) {
            newHistory.shift();
          }
          return { commandHistory: newHistory };
        });
      },

      /**
       * Set the currently selected clip ID
       */
      setSelectedClipId: (clipId: string | null) => {
        set({ selectedClipId: clipId });
      },

      /**
       * Set clip volume (0-1 range, clamped)
       */
      setClipVolume: (clipId: string, volume: number) => {
        const clampedVolume = Math.max(0, Math.min(1, volume));
        get().updateClip(clipId, { volume: clampedVolume });
        console.log('[ProjectStore] Set clip volume:', clipId, clampedVolume);
      },

      /**
       * Set clip muted state
       */
      setClipMuted: (clipId: string, muted: boolean) => {
        get().updateClip(clipId, { muted });
        console.log('[ProjectStore] Set clip muted:', clipId, muted);
      },

      /**
       * Set clip fade in/out durations (non-negative values)
       */
      setClipFades: (clipId: string, fadeIn: number, fadeOut: number) => {
        get().updateClip(clipId, {
          fadeIn: Math.max(0, fadeIn),
          fadeOut: Math.max(0, fadeOut)
        });
        console.log('[ProjectStore] Set clip fades:', clipId, { fadeIn, fadeOut });
      },

      /**
       * Set track volume (0-1 range, clamped)
       */
      setTrackVolume: (trackId: string, volume: number) => {
        const state = get();
        if (!state.currentProject) return;

        const clampedVolume = Math.max(0, Math.min(1, volume));
        const updatedTracks = state.currentProject.tracks.map(track =>
          track.id === trackId ? { ...track, volume: clampedVolume } : track
        );

        set({
          currentProject: {
            ...state.currentProject,
            tracks: updatedTracks
          }
        });
        console.log('[ProjectStore] Set track volume:', trackId, clampedVolume);
      },

      /**
       * Set track muted state
       */
      setTrackMuted: (trackId: string, muted: boolean) => {
        const state = get();
        if (!state.currentProject) return;

        const updatedTracks = state.currentProject.tracks.map(track =>
          track.id === trackId ? { ...track, muted } : track
        );

        set({
          currentProject: {
            ...state.currentProject,
            tracks: updatedTracks
          }
        });
        console.log('[ProjectStore] Set track muted:', trackId, muted);
      },

      /**
       * Add PiP recording to timeline
       * Places screen recording on Track 0 (main) and webcam on Track 1 (overlay)
       * @param screenMediaId - ID of screen recording media file
       * @param webcamMediaId - ID of webcam recording media file
       * @param pipConfig - PiP configuration (position and size)
       * @param linkedRecordingId - Shared ID linking the two recordings
       */
      addPiPRecording: (
        screenMediaId: string,
        webcamMediaId: string,
        pipConfig: { position: string; size: string },
        linkedRecordingId: string
      ) => {
        const state = get();
        if (!state.currentProject) {
          console.error('[ProjectStore] No project loaded - cannot add PiP recording');
          return;
        }

        // Get media files from media store
        const mediaStore = useMediaStore.getState();
        const screenMedia = mediaStore.mediaFiles.find((f) => f.id === screenMediaId);
        const webcamMedia = mediaStore.mediaFiles.find((f) => f.id === webcamMediaId);

        if (!screenMedia || !webcamMedia) {
          console.error('[ProjectStore] Media files not found for PiP recording');
          return;
        }

        console.log('[ProjectStore] Adding PiP recording to timeline');
        console.log(`[ProjectStore] Screen: ${screenMedia.filename}, Webcam: ${webcamMedia.filename}`);
        console.log(`[ProjectStore] PiP config:`, pipConfig);

        // Get current timeline end position (or 0 if empty)
        const currentDuration = get().getProjectDuration();
        const startPosition = currentDuration;

        // Use the longer duration for both clips (they should be similar)
        const clipDuration = Math.max(screenMedia.duration, webcamMedia.duration);

        // Map PiP position and size to clip properties
        const position = PIP_POSITION_MAP[pipConfig.position] || { x: 75, y: 75 };
        const scale = PIP_SIZE_MAP[pipConfig.size] || 0.25;

        // Create screen clip for Track 0 (main video track)
        const screenClip: TimelineClip = {
          id: `clip-screen-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          mediaFileId: screenMediaId,
          trackIndex: 0,
          startTime: startPosition,
          endTime: startPosition + clipDuration,
          trimStart: 0,
          trimEnd: 0,
          linkedRecordingId,
        };

        // Create webcam clip for Track 1 (overlay track) with PiP positioning
        const webcamClip: TimelineClip = {
          id: `clip-webcam-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          mediaFileId: webcamMediaId,
          trackIndex: 1,
          startTime: startPosition,
          endTime: startPosition + clipDuration,
          trimStart: 0,
          trimEnd: 0,
          position,
          scale,
          linkedRecordingId,
        };

        // Ensure we have at least 2 tracks (Main and Overlay)
        const tracks = [...state.currentProject.tracks];

        // If we don't have Track 1, create it
        if (tracks.length < 2) {
          tracks.push({
            id: `track-1-${Date.now()}`,
            name: 'Overlay 1',
            clips: [],
            type: TrackType.OVERLAY,
          });
        }

        // Add clips to their respective tracks
        const updatedTracks = tracks.map((track, index) => {
          if (index === 0) {
            // Add screen clip to Track 0
            return {
              ...track,
              clips: [...track.clips, screenClip].sort(
                (a, b) => a.startTime - b.startTime
              ),
            };
          } else if (index === 1) {
            // Add webcam clip to Track 1
            return {
              ...track,
              clips: [...track.clips, webcamClip].sort(
                (a, b) => a.startTime - b.startTime
              ),
            };
          }
          return track;
        });

        const updatedProject = {
          ...state.currentProject,
          tracks: updatedTracks,
          duration: calculateProjectDuration(updatedTracks),
        };

        set({ currentProject: updatedProject });
        console.log('[ProjectStore] PiP recording added to timeline successfully');
      },
    }),
    {
      name: 'project-storage', // localStorage key
      onRehydrateStorage: () => (state) => {
        if (state?.currentProject) {
          state.currentProject = migrateProject(state.currentProject);
        }
      }
    }
  )
);
