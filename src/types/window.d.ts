/**
 * Window Type Declarations
 * Defines TypeScript types for window object extensions
 */

import { UserProfile, Transcript, AnalysisResult } from './ai';
import { IpcRenderer } from 'electron';

declare global {
  interface Window {
    // Legacy IPC access (direct ipcRenderer exposure)
    ipcRenderer: IpcRenderer;

    // WebUtils for file path conversion
    webUtils: {
      getPathForFile: (file: File) => string;
    };

    // AI API - Typed convenience methods for AI features
    ai: {
      // API Key operations
      saveApiKey: (key: string) => Promise<{ success: boolean }>;
      getApiKey: () => Promise<string | null>;
      hasApiKey: () => Promise<boolean>;
      deleteApiKey: () => Promise<{ success: boolean }>;

      // Profile operations
      getProfiles: () => Promise<UserProfile[]>;
      getProfile: (id: string) => Promise<UserProfile | null>;
      saveProfile: (data: Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt'>) => Promise<UserProfile>;
      updateProfile: (id: string, updates: Partial<Omit<UserProfile, 'id'>>) => Promise<UserProfile>;
      deleteProfile: (id: string) => Promise<{ success: boolean }>;

      // Transcription operations
      transcribeVideo: (params: {
        videoPath: string;
        startTime?: number;
        endTime?: number;
      }) => Promise<Transcript>;

      // Full content analysis (transcription + GPT-4 analysis)
      analyzeClip: (params: {
        videoPath: string;
        profile: UserProfile;
        startTime?: number;
        endTime?: number;
      }) => Promise<AnalysisResult>;

      // Progress event listeners for analysis
      onAnalysisProgress: (callback: (data: { stage: string; message: string }) => void) => void;
      offAnalysisProgress: (callback: Function) => void;
    };
  }
}

export {};
