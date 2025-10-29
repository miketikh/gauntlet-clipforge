import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { UserProfile } from '../../types/ai';

/**
 * ProfileStorage - File-based profile storage service
 * Provides CRUD operations for user-defined content analysis profiles
 * - Stores profiles as JSON in userData directory
 * - Uses in-memory cache for performance
 * - Write-through strategy (immediate persistence)
 */
export class ProfileStorage {
  private readonly profilesFilePath: string;
  private profiles: UserProfile[] | null = null; // In-memory cache

  constructor() {
    // Store profiles in userData directory
    const userDataPath = app.getPath('userData');
    this.profilesFilePath = path.join(userDataPath, 'ai-profiles.json');
    console.log('[ProfileStorage] Initialized with storage path:', this.profilesFilePath);
  }

  /**
   * Load profiles from file into memory cache
   * Creates empty file if it doesn't exist
   */
  private async loadProfiles(): Promise<UserProfile[]> {
    try {
      // Return cached data if already loaded
      if (this.profiles !== null) {
        return this.profiles;
      }

      // Check if file exists
      if (!fs.existsSync(this.profilesFilePath)) {
        console.log('[ProfileStorage] No profiles file found - creating empty file');
        // Create empty profiles array
        this.profiles = [];
        await this.saveProfilesToFile();
        return this.profiles;
      }

      // Read and parse file
      const fileContent = fs.readFileSync(this.profilesFilePath, 'utf-8');
      this.profiles = JSON.parse(fileContent);

      console.log('[ProfileStorage] Loaded', this.profiles.length, 'profiles from file');
      return this.profiles;
    } catch (error) {
      console.error('[ProfileStorage] Error loading profiles:', error);
      throw new Error(`Failed to load profiles: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Write profiles to file (write-through strategy)
   */
  private async saveProfilesToFile(): Promise<void> {
    try {
      // Ensure directory exists
      const dir = path.dirname(this.profilesFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Write profiles to file
      const jsonContent = JSON.stringify(this.profiles, null, 2);
      fs.writeFileSync(this.profilesFilePath, jsonContent, 'utf-8');

      console.log('[ProfileStorage] Saved', this.profiles?.length || 0, 'profiles to file');
    } catch (error) {
      console.error('[ProfileStorage] Error saving profiles:', error);
      throw new Error(`Failed to save profiles: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get all profiles
   * @returns Array of all profiles
   */
  async getAllProfiles(): Promise<UserProfile[]> {
    try {
      const profiles = await this.loadProfiles();
      console.log('[ProfileStorage] getAllProfiles returning', profiles.length, 'profiles');
      return [...profiles]; // Return copy to prevent external mutation
    } catch (error) {
      console.error('[ProfileStorage] Error in getAllProfiles:', error);
      throw error;
    }
  }

  /**
   * Get a single profile by ID
   * @param id - Profile ID to retrieve
   * @returns Profile if found, null otherwise
   */
  async getProfile(id: string): Promise<UserProfile | null> {
    try {
      const profiles = await this.loadProfiles();
      const profile = profiles.find(p => p.id === id);

      if (profile) {
        console.log('[ProfileStorage] Found profile:', profile.name);
        return { ...profile }; // Return copy
      } else {
        console.log('[ProfileStorage] Profile not found:', id);
        return null;
      }
    } catch (error) {
      console.error('[ProfileStorage] Error in getProfile:', error);
      throw error;
    }
  }

  /**
   * Create a new profile
   * @param profile - Profile data (without id, createdAt, updatedAt)
   * @returns Complete profile with generated ID and timestamps
   */
  async saveProfile(profile: Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt'>): Promise<UserProfile> {
    try {
      const profiles = await this.loadProfiles();

      // Generate new profile with ID and timestamps
      const now = new Date().toISOString();
      const newProfile: UserProfile = {
        id: crypto.randomUUID(),
        ...profile,
        createdAt: now,
        updatedAt: now,
      };

      // Add to cache
      profiles.push(newProfile);

      // Write to file
      await this.saveProfilesToFile();

      console.log('[ProfileStorage] Created new profile:', newProfile.name, 'with ID:', newProfile.id);
      return { ...newProfile };
    } catch (error) {
      console.error('[ProfileStorage] Error in saveProfile:', error);
      throw error;
    }
  }

  /**
   * Update an existing profile
   * @param id - Profile ID to update
   * @param updates - Partial profile data to update
   * @returns Updated profile
   */
  async updateProfile(id: string, updates: Partial<Omit<UserProfile, 'id'>>): Promise<UserProfile> {
    try {
      const profiles = await this.loadProfiles();
      const profileIndex = profiles.findIndex(p => p.id === id);

      if (profileIndex === -1) {
        throw new Error(`Profile not found: ${id}`);
      }

      // Update profile with new data and updated timestamp
      const updatedProfile: UserProfile = {
        ...profiles[profileIndex],
        ...updates,
        id, // Ensure ID doesn't change
        updatedAt: new Date().toISOString(),
      };

      // Update in cache
      profiles[profileIndex] = updatedProfile;

      // Write to file
      await this.saveProfilesToFile();

      console.log('[ProfileStorage] Updated profile:', updatedProfile.name, 'with ID:', id);
      return { ...updatedProfile };
    } catch (error) {
      console.error('[ProfileStorage] Error in updateProfile:', error);
      throw error;
    }
  }

  /**
   * Delete a profile
   * @param id - Profile ID to delete
   */
  async deleteProfile(id: string): Promise<void> {
    try {
      const profiles = await this.loadProfiles();
      const profileIndex = profiles.findIndex(p => p.id === id);

      if (profileIndex === -1) {
        console.log('[ProfileStorage] Profile not found for deletion:', id);
        return; // Silently succeed if profile doesn't exist
      }

      // Remove from cache
      const deletedProfile = profiles.splice(profileIndex, 1)[0];

      // Write to file
      await this.saveProfilesToFile();

      console.log('[ProfileStorage] Deleted profile:', deletedProfile.name, 'with ID:', id);
    } catch (error) {
      console.error('[ProfileStorage] Error in deleteProfile:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const profileStorage = new ProfileStorage();
