/**
 * Singleton EditAPI instance for global access
 *
 * This module exports a single instance of EditAPI to ensure
 * consistent state management across the application.
 *
 * @example
 * ```typescript
 * import { editAPI } from './api';
 *
 * // Add a clip to the timeline
 * await editAPI.addClip('media-123', 0, 0);
 *
 * // Get current timeline state
 * const timeline = editAPI.getTimeline();
 *
 * // Trim a clip
 * await editAPI.trimClip('clip-456', 2, 5);
 *
 * // Split a clip
 * const [leftId, rightId] = await editAPI.splitClip('clip-456', 3);
 *
 * // Move a clip
 * await editAPI.moveClip('clip-456', 1, 10);
 *
 * // Delete a clip
 * await editAPI.deleteClip('clip-456');
 *
 * // View command history (for debugging or undo/redo)
 * const history = editAPI.getCommandHistory();
 * console.log('Last 5 commands:', history.slice(-5));
 * ```
 *
 * @example Browser Console Usage
 * ```javascript
 * // Access from browser console for testing
 * const editAPI = window.editAPI;
 *
 * // Add a clip
 * await editAPI.addClip('media-123', 0, 0);
 *
 * // Get timeline
 * editAPI.getTimeline();
 * ```
 */

import { EditAPI } from './EditAPI';

/**
 * Singleton instance of EditAPI
 *
 * Use this instance throughout the application for all timeline editing operations.
 * The singleton pattern ensures consistent state management and command history.
 */
export const editAPI = new EditAPI();

// Expose editAPI to window for browser console testing during development
if (typeof window !== 'undefined') {
  (window as any).editAPI = editAPI;
}

// Re-export the class for type definitions and testing
export { EditAPI } from './EditAPI';
export type { EditCommand } from '../store/projectStore';
