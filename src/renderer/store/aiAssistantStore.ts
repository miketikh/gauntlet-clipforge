/**
 * AI Assistant state management using Zustand
 * Handles panel visibility, size, and configuration for AI Consultant feature
 */

import { create } from 'zustand';
import { UserProfile, AnalysisStage, AnalysisResult } from '../../types/aiAssistant';

interface AIAssistantState {
  isPanelOpen: boolean;
  panelWidth: number;

  // Profile Management
  profiles: UserProfile[];
  selectedProfileId: string | null;
  editingProfile: Partial<UserProfile> | null;

  // Analysis State
  isAnalyzing: boolean;
  analysisStage: AnalysisStage;
  currentAnalysis: AnalysisResult | null;
  isAnalysisExpanded: boolean;

  // Panel Actions
  togglePanel: () => void;
  setPanelOpen: (open: boolean) => void;
  setPanelWidth: (width: number) => void;

  // Profile Actions
  loadProfiles: () => Promise<void>;
  addProfile: (profile: Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateProfile: (id: string, changes: Partial<UserProfile>) => Promise<void>;
  deleteProfile: (id: string) => Promise<void>;
  selectProfile: (id: string | null) => void;
  setEditingProfile: (profile: Partial<UserProfile> | null) => void;
  loadProfile: (id: string) => void;
  clearEditingProfile: () => void;

  // Analysis Actions
  startAnalysis: (clipId: string) => void;
  setAnalysisStage: (stage: AnalysisStage) => void;
  setAnalysisResult: (result: AnalysisResult) => void;
  clearAnalysis: () => void;
  analyzeClip: (videoPath: string, profileId: string, clipId: string) => Promise<void>;
  setAnalysisExpanded: (expanded: boolean) => void;
}

export const useAIAssistantStore = create<AIAssistantState>((set, get) => ({
  isPanelOpen: false,
  panelWidth: 350,

  // Profile state - will be loaded from backend
  profiles: [],
  selectedProfileId: null,
  editingProfile: null,

  // Analysis state
  isAnalyzing: false,
  analysisStage: null,
  currentAnalysis: null,
  isAnalysisExpanded: false,

  /**
   * Toggle the AI panel open/closed state
   */
  togglePanel: () => {
    set((state) => {
      console.log('[AIAssistantStore] Toggle panel:', !state.isPanelOpen);
      return { isPanelOpen: !state.isPanelOpen };
    });
  },

  /**
   * Explicitly set panel open state
   */
  setPanelOpen: (open: boolean) => {
    set({ isPanelOpen: open });
  },

  /**
   * Set panel width (for future resizing feature)
   */
  setPanelWidth: (width: number) => {
    // Clamp between reasonable bounds (200-500px)
    const clampedWidth = Math.max(200, Math.min(500, width));
    set({ panelWidth: clampedWidth });
  },

  /**
   * Load all profiles from backend storage
   */
  loadProfiles: async () => {
    try {
      console.log('[AIAssistantStore] Loading profiles from backend...');
      const backendProfiles = await (window as any).ai.getProfiles();

      // Convert ISO date strings to Date objects
      const profiles = backendProfiles.map((p: any) => ({
        ...p,
        createdAt: new Date(p.createdAt),
        updatedAt: new Date(p.updatedAt),
      }));

      set({ profiles });
      console.log('[AIAssistantStore] Loaded', profiles.length, 'profiles');
    } catch (error) {
      console.error('[AIAssistantStore] Failed to load profiles:', error);
      throw error;
    }
  },

  /**
   * Add a new profile
   * Calls backend IPC to persist profile to file system
   */
  addProfile: async (profile: Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      console.log('[AIAssistantStore] Saving new profile:', profile.name);
      const backendProfile = await (window as any).ai.saveProfile(profile);

      // Convert date strings to Date objects
      const savedProfile = {
        ...backendProfile,
        createdAt: new Date(backendProfile.createdAt),
        updatedAt: new Date(backendProfile.updatedAt),
      };

      set((state) => ({
        profiles: [...state.profiles, savedProfile],
        selectedProfileId: savedProfile.id,
        editingProfile: null,
      }));

      console.log('[AIAssistantStore] Profile saved with ID:', savedProfile.id);
    } catch (error) {
      console.error('[AIAssistantStore] Failed to save profile:', error);
      throw error;
    }
  },

  /**
   * Update an existing profile
   * Calls backend IPC to persist changes
   */
  updateProfile: async (id: string, changes: Partial<UserProfile>) => {
    try {
      console.log('[AIAssistantStore] Updating profile:', id);
      const backendProfile = await (window as any).ai.updateProfile(id, changes);

      // Convert date strings to Date objects
      const updatedProfile = {
        ...backendProfile,
        createdAt: new Date(backendProfile.createdAt),
        updatedAt: new Date(backendProfile.updatedAt),
      };

      set((state) => ({
        profiles: state.profiles.map((profile) =>
          profile.id === id ? updatedProfile : profile
        ),
        editingProfile: null,
      }));

      console.log('[AIAssistantStore] Profile updated successfully');
    } catch (error) {
      console.error('[AIAssistantStore] Failed to update profile:', error);
      throw error;
    }
  },

  /**
   * Delete a profile
   * Calls backend IPC to remove from file system
   */
  deleteProfile: async (id: string) => {
    try {
      console.log('[AIAssistantStore] Deleting profile:', id);
      await (window as any).ai.deleteProfile(id);

      set((state) => {
        const newSelectedId = state.selectedProfileId === id ? null : state.selectedProfileId;
        return {
          profiles: state.profiles.filter((profile) => profile.id !== id),
          selectedProfileId: newSelectedId,
          editingProfile: state.editingProfile?.id === id ? null : state.editingProfile,
        };
      });

      console.log('[AIAssistantStore] Profile deleted successfully');
    } catch (error) {
      console.error('[AIAssistantStore] Failed to delete profile:', error);
      throw error;
    }
  },

  /**
   * Select a profile (or null to deselect)
   */
  selectProfile: (id: string | null) => {
    set({ selectedProfileId: id });
    console.log('[AIAssistantStore] Profile selected:', id);
  },

  /**
   * Set the editing profile state (for form management)
   */
  setEditingProfile: (profile: Partial<UserProfile> | null) => {
    set({ editingProfile: profile });
  },

  /**
   * Load a profile into the editing state for modification
   */
  loadProfile: (id: string) => {
    const state = get();
    const profile = state.profiles.find((p) => p.id === id);

    if (profile) {
      set({
        editingProfile: { ...profile },
        selectedProfileId: id,
      });
      console.log('[AIAssistantStore] Profile loaded for editing:', profile.name);
    } else {
      console.warn('[AIAssistantStore] Profile not found:', id);
    }
  },

  /**
   * Clear the editing profile state (reset form)
   */
  clearEditingProfile: () => {
    set({
      editingProfile: null,
      selectedProfileId: null,
    });
    console.log('[AIAssistantStore] Editing profile cleared');
  },

  /**
   * Start analysis for a clip
   * Sets isAnalyzing to true and initializes stage to 'extracting'
   */
  startAnalysis: (clipId: string) => {
    set({
      isAnalyzing: true,
      analysisStage: 'extracting',
      currentAnalysis: null,
    });
    console.log('[AIAssistantStore] Analysis started for clip:', clipId);
  },

  /**
   * Update the current analysis stage
   */
  setAnalysisStage: (stage: AnalysisStage) => {
    set({ analysisStage: stage });
    console.log('[AIAssistantStore] Analysis stage:', stage);
  },

  /**
   * Set the analysis result and mark analysis as complete
   * Auto-expands the analysis results section for better readability
   */
  setAnalysisResult: (result: AnalysisResult) => {
    set({
      currentAnalysis: result,
      isAnalyzing: false,
      analysisStage: 'complete',
      isAnalysisExpanded: true, // Auto-expand when results arrive
    });
    console.log('[AIAssistantStore] Analysis complete for clip:', result.clipId);
  },

  /**
   * Clear the current analysis
   */
  clearAnalysis: () => {
    set({
      currentAnalysis: null,
      isAnalyzing: false,
      analysisStage: null,
      isAnalysisExpanded: false,
    });
    console.log('[AIAssistantStore] Analysis cleared');
  },

  /**
   * Set whether the analysis results section is expanded
   */
  setAnalysisExpanded: (expanded: boolean) => {
    set({ isAnalysisExpanded: expanded });
    console.log('[AIAssistantStore] Analysis expanded:', expanded);
  },

  /**
   * Analyze a clip using the real backend pipeline
   * Calls window.ai.analyzeClip and listens for progress events
   * @param videoPath - Path to the video file
   * @param profileId - ID of the profile to use for analysis
   * @param clipId - ID of the clip being analyzed (for UI reference)
   */
  analyzeClip: async (videoPath: string, profileId: string, clipId: string) => {
    console.log('[AIAssistantStore] Starting real analysis for clip:', clipId);

    try {
      // Find the profile
      const state = get();
      const profile = state.profiles.find((p) => p.id === profileId);
      if (!profile) {
        throw new Error('Selected profile not found');
      }

      // Set up progress listener
      const progressHandler = (data: { stage: string; message: string }) => {
        console.log('[AIAssistantStore] Progress update:', data.stage, '-', data.message);

        // Map backend stage to our AnalysisStage type
        let analysisStage: AnalysisStage = null;
        if (data.stage === 'extracting') analysisStage = 'extracting';
        else if (data.stage === 'transcribing') analysisStage = 'transcribing';
        else if (data.stage === 'analyzing') analysisStage = 'analyzing';

        set({ analysisStage });
      };

      // Register progress listener
      (window as any).ai.onAnalysisProgress(progressHandler);

      // Initialize analysis state
      set({
        isAnalyzing: true,
        analysisStage: 'extracting',
        currentAnalysis: null,
      });

      // Call backend analysis
      const backendResult = await (window as any).ai.analyzeClip({
        videoPath,
        profile,
        // TODO: Add startTime/endTime if clip is trimmed
      });

      console.log('[AIAssistantStore] Analysis complete');
      console.log('[AIAssistantStore] Token usage:', backendResult.tokenUsage);

      // Format the result to match our AnalysisResult type
      const analysisResult: AnalysisResult = {
        clipId,
        profileId,
        analyzedAt: new Date(backendResult.analyzedAt),
        analysis: backendResult.analysis,
        transcript: backendResult.transcript?.fullText, // Store full text only for now
      };

      // Update store with result
      set({
        currentAnalysis: analysisResult,
        isAnalyzing: false,
        analysisStage: 'complete',
        isAnalysisExpanded: true, // Auto-expand when results arrive
      });

      // Clean up progress listener
      (window as any).ai.offAnalysisProgress(progressHandler);

    } catch (error) {
      console.error('[AIAssistantStore] Analysis failed:', error);

      // Reset analysis state on error
      set({
        isAnalyzing: false,
        analysisStage: null,
      });

      // Re-throw so UI can handle the error
      throw error;
    }
  },
}));
