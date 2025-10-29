/**
 * Z-Index Scale for ClipForge
 *
 * Following best practices from Josh Comeau and Bootstrap:
 * - Use `isolation: isolate` on component boundaries to create stacking contexts
 * - Within isolated components, use small z-index values (1, 2, 3)
 * - Only use this global scale for truly global layers (modals, tooltips, etc.)
 *
 * References:
 * - Josh Comeau: https://www.joshwcomeau.com/css/stacking-contexts/
 * - Bootstrap: https://getbootstrap.com/docs/5.3/layout/z-index/
 */

export const Z_INDEX = {
  // Base layers - use within isolated components
  BASE: 0,
  RAISED: 1,
  OVERLAY: 2,
  POPUP: 3,

  // Global application layers - for elements that need to appear above isolated contexts
  DROPDOWN: 100,
  STICKY_HEADER: 110,
  TIMELINE_CONTROLS: 120,    // Timeline playhead, indicators (isolated within timeline)
  MODAL_BACKDROP: 200,
  MODAL: 201,
  POPOVER: 210,
  TOOLTIP: 220,
  TOAST: 230,
} as const;

/**
 * Usage Examples:
 *
 * // For isolated components (Timeline, MediaLibrary, etc.)
 * <div style={{ isolation: 'isolate' }}>
 *   <div style={{ zIndex: Z_INDEX.BASE }}>Background</div>
 *   <div style={{ zIndex: Z_INDEX.RAISED }}>Foreground</div>
 * </div>
 *
 * // For global overlays
 * <div style={{ zIndex: Z_INDEX.MODAL }}>Modal content</div>
 */
