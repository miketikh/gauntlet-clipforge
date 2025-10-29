import { app, safeStorage } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

/**
 * ApiKeyStorage - Secure API key storage service using Electron's safeStorage
 * Provides encrypted storage for OpenAI API keys using OS-level encryption
 * - macOS: Uses Keychain
 * - Windows: Uses DPAPI
 * - Linux: Uses libsecret (requires keyring setup)
 */
export class ApiKeyStorage {
  private readonly keyFilePath: string;

  constructor() {
    // Store encrypted key in userData directory
    const userDataPath = app.getPath('userData');
    this.keyFilePath = path.join(userDataPath, 'ai-api-key.enc');
    console.log('[ApiKeyStorage] Initialized with storage path:', this.keyFilePath);
  }

  /**
   * Save an API key with encryption
   * @param key - The API key to encrypt and store
   */
  async saveApiKey(key: string): Promise<void> {
    try {
      // Check if safeStorage is available
      if (!safeStorage.isEncryptionAvailable()) {
        console.warn('[ApiKeyStorage] Encryption not available on this system - falling back to less secure storage');
        throw new Error('Encryption not available on this system. On Linux, ensure keyring is set up.');
      }

      // Encrypt the key
      const encryptedBuffer = safeStorage.encryptString(key);

      // Ensure directory exists
      const dir = path.dirname(this.keyFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Write encrypted data to file
      fs.writeFileSync(this.keyFilePath, encryptedBuffer);

      console.log('[ApiKeyStorage] API key saved successfully (encrypted)');
    } catch (error) {
      console.error('[ApiKeyStorage] Error saving API key:', error);
      throw new Error(`Failed to save API key: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Retrieve and decrypt the stored API key
   * @returns The decrypted API key or null if no key is stored
   */
  async getApiKey(): Promise<string | null> {
    try {
      // Check if file exists
      if (!fs.existsSync(this.keyFilePath)) {
        console.log('[ApiKeyStorage] No API key file found');
        return null;
      }

      // Check if safeStorage is available
      if (!safeStorage.isEncryptionAvailable()) {
        console.warn('[ApiKeyStorage] Encryption not available - cannot decrypt stored key');
        throw new Error('Encryption not available on this system. Cannot decrypt stored key.');
      }

      // Read encrypted data
      const encryptedBuffer = fs.readFileSync(this.keyFilePath);

      // Decrypt the key
      const decryptedKey = safeStorage.decryptString(encryptedBuffer);

      console.log('[ApiKeyStorage] API key retrieved successfully (first 8 chars):', decryptedKey.substring(0, 8));
      return decryptedKey;
    } catch (error) {
      console.error('[ApiKeyStorage] Error retrieving API key:', error);
      throw new Error(`Failed to retrieve API key: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if an API key is stored
   * @returns True if a key exists, false otherwise
   */
  async hasApiKey(): Promise<boolean> {
    try {
      const exists = fs.existsSync(this.keyFilePath);
      console.log('[ApiKeyStorage] API key exists:', exists);
      return exists;
    } catch (error) {
      console.error('[ApiKeyStorage] Error checking for API key:', error);
      return false;
    }
  }

  /**
   * Delete the stored API key
   */
  async deleteApiKey(): Promise<void> {
    try {
      // Check if file exists
      if (!fs.existsSync(this.keyFilePath)) {
        console.log('[ApiKeyStorage] No API key file to delete');
        return;
      }

      // Delete the file
      fs.unlinkSync(this.keyFilePath);

      console.log('[ApiKeyStorage] API key deleted successfully');
    } catch (error) {
      console.error('[ApiKeyStorage] Error deleting API key:', error);
      throw new Error(`Failed to delete API key: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Export singleton instance
export const apiKeyStorage = new ApiKeyStorage();
