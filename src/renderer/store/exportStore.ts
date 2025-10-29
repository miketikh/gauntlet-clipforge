import { create } from 'zustand';

export interface ExportConfig {
  resolution: '720p' | '1080p' | 'source';
  frameRate: 24 | 30 | 60;
  videoCodec: 'h264';
  audioCodec: 'aac';
  savePath: string | null;
}

interface ExportState {
  isExporting: boolean;
  exportProgress: number;
  exportError: string | null;
  exportConfig: ExportConfig;

  // Actions
  setExportConfig: (config: Partial<ExportConfig>) => void;
  startExport: (config: ExportConfig) => void;
  updateProgress: (percent: number) => void;
  completeExport: () => void;
  cancelExport: () => void;
  setExportError: (error: string | null) => void;
}

export const useExportStore = create<ExportState>((set) => ({
  isExporting: false,
  exportProgress: 0,
  exportError: null,
  exportConfig: {
    resolution: '1080p',
    frameRate: 30,
    videoCodec: 'h264',
    audioCodec: 'aac',
    savePath: null,
  },

  setExportConfig: (config: Partial<ExportConfig>) =>
    set((state) => ({
      exportConfig: { ...state.exportConfig, ...config },
    })),

  startExport: (config: ExportConfig) =>
    set({
      isExporting: true,
      exportProgress: 0,
      exportError: null,
      exportConfig: config,
    }),

  updateProgress: (percent: number) =>
    set({ exportProgress: Math.max(0, Math.min(100, percent)) }),

  completeExport: () =>
    set({
      isExporting: false,
      exportProgress: 100,
      exportError: null,
    }),

  cancelExport: () =>
    set({
      isExporting: false,
      exportProgress: 0,
      exportError: null,
    }),

  setExportError: (error: string | null) =>
    set({
      isExporting: false,
      exportError: error,
    }),
}));
