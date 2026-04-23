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

export const GENERALIZATION = {
  /** Default size when the container is first placed (no children yet). */
  defaultWidth: 220,
  defaultHeight: 140,
  /** Padding between children bbox and container edge. */
  paddingX: 24,
  paddingY: 28,
  /** Inner gap between container's bottom edge and the "incomplete" extra stroke. */
  incompleteInnerGap: 6,
  stroke: '#1d1d1f',
  strokeWidth: 1.5,
  strokeHover: '#007aff',
  strokeSelected: '#007aff',
  strokeWidthSelected: 2,
  /** Fill is transparent so the container reads as just an outline. */
  fill: 'rgba(255, 255, 255, 0.01)',
  /** Subtle tint when a dragged Type is hovering over the container. */
  fillHighlight: 'rgba(0, 122, 255, 0.08)',
  selectionShadow: {
    color: '#007aff',
    blur: 12,
    opacity: 0.25,
  },
} as const;
