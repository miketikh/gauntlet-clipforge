/**
 * Project state management using Zustand
 * Handles timeline composition and playhead position
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Project, TimelineClip } from '../../types/timeline';
import { calculateTrackDuration } from '../utils/timelineCalculations';
import { useMediaStore } from './mediaStore';

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
            },
            {
              id: `track-1-${Date.now()}`,
              name: 'Overlay 1',
              clips: [],
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
          duration: get().getProjectDuration(),
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
          duration: get().getProjectDuration(),
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
          duration: get().getProjectDuration(),
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
    }),
    {
      name: 'project-storage', // localStorage key
    }
  )
);
