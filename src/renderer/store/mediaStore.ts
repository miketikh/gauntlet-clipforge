import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { MediaFile } from '../../types/media';

interface MediaState {
  mediaFiles: MediaFile[];
  addMediaFile: (file: MediaFile) => void;
  removeMediaFile: (id: string) => void;
  clearMedia: () => void;
}

export const useMediaStore = create<MediaState>()(
  persist(
    (set) => ({
      mediaFiles: [],
      addMediaFile: (file) =>
        set((state) => ({
          mediaFiles: [...state.mediaFiles, file],
        })),
      removeMediaFile: (id) =>
        set((state) => ({
          mediaFiles: state.mediaFiles.filter((file) => file.id !== id),
        })),
      clearMedia: () => set({ mediaFiles: [] }),
    }),
    {
      name: 'media-storage', // localStorage key
    }
  )
);
