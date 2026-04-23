/**
 * Default sizing/styling values shared across the editor.
 * Pull in from here rather than hardcoding magic numbers inside components.
 */

export const TYPE_NODE = {
  minWidth: 100,
  minHeight: 44,
  paddingX: 16,
  paddingY: 10,
  fontSize: 13,
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Inter', 'SF Pro Display', sans-serif",
  fill: '#ffffff',
  stroke: '#1d1d1f',
  strokeWidth: 1.5,
  strokeHover: '#007aff',
  strokeSelected: '#007aff',
  strokeWidthSelected: 2,
  /** Selection glow (matches VISUAL_DESIGN.md) */
  selectionShadow: {
    color: '#007aff',
    blur: 12,
    opacity: 0.35,
  },
} as const;

export const DEFAULT_TYPE_NAME = 'Type';

export const CANVAS = {
  background: '#f5f5f7',
} as const;
