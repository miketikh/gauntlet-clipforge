// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { ipcRenderer, webUtils } from 'electron';

// Expose ipcRenderer to renderer process
// Note: contextIsolation is false, so this is available directly on window
(window as any).ipcRenderer = ipcRenderer;

// Expose webUtils for getting file paths from drag-and-drop File objects
(window as any).webUtils = webUtils;

// Expose AI API for cleaner access to AI features
(window as any).ai = {
  // API Key operations
  saveApiKey: (key: string) => ipcRenderer.invoke('ai:save-api-key', key),
  getApiKey: () => ipcRenderer.invoke('ai:get-api-key'),
  hasApiKey: () => ipcRenderer.invoke('ai:has-api-key'),
  deleteApiKey: () => ipcRenderer.invoke('ai:delete-api-key'),

  // Profile operations
  getProfiles: () => ipcRenderer.invoke('ai:get-profiles'),
  getProfile: (id: string) => ipcRenderer.invoke('ai:get-profile', id),
  saveProfile: (data: any) => ipcRenderer.invoke('ai:save-profile', data),
  updateProfile: (id: string, updates: any) => ipcRenderer.invoke('ai:update-profile', id, updates),
  deleteProfile: (id: string) => ipcRenderer.invoke('ai:delete-profile', id),

  // Transcription operations
  transcribeVideo: (params: { videoPath: string; startTime?: number; endTime?: number }) =>
    ipcRenderer.invoke('ai:transcribe-video', params),

  // Full content analysis (transcription + GPT-4 analysis)
  analyzeClip: (params: {
    videoPath: string;
    profile: any;  // UserProfile
    startTime?: number;
    endTime?: number;
  }) => ipcRenderer.invoke('ai:analyze-clip', params),

  // Progress event listeners for analysis
  onAnalysisProgress: (callback: (data: { stage: string; message: string }) => void) => {
    ipcRenderer.on('ai:analysis-progress', (_event, data) => callback(data));
  },

  offAnalysisProgress: (callback: Function) => {
    ipcRenderer.removeListener('ai:analysis-progress', callback as any);
  }
};
