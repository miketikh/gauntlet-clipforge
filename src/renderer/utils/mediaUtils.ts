/**
 * Media utility functions
 * Helpers for working with media file paths and URLs
 */

/**
 * Build a file URL from a local file path
 * Adds file:// protocol if not already present
 *
 * @param path - Local file path
 * @returns File URL with file:// protocol
 */
export function buildFileUrl(path: string): string {
  return path.startsWith('file://') ? path : `file://${path}`;
}
