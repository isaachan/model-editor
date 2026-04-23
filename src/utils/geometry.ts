import { TYPE_NODE } from '@/constants/defaults';

/**
 * Measure the rendered width of a short text string using an offscreen canvas,
 * so that the Type rectangle can auto-size to its label (ME-007 AC).
 * Falls back to an estimate if Canvas 2D is unavailable.
 */
let measureCtx: CanvasRenderingContext2D | null = null;
function getCtx(): CanvasRenderingContext2D | null {
  if (measureCtx) return measureCtx;
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  measureCtx = canvas.getContext('2d');
  return measureCtx;
}

export function measureTextWidth(
  text: string,
  fontSize = TYPE_NODE.fontSize,
  fontFamily = TYPE_NODE.fontFamily,
): number {
  const ctx = getCtx();
  if (ctx) {
    ctx.font = `${fontSize}px ${fontFamily}`;
    return ctx.measureText(text).width;
  }
  // Rough fallback: 0.6em per char
  return text.length * fontSize * 0.6;
}

/** Compute a Type node's auto-sized box for a given label. */
export function computeTypeBox(name: string): { width: number; height: number } {
  const textWidth = measureTextWidth(name);
  const width = Math.max(
    TYPE_NODE.minWidth,
    Math.ceil(textWidth) + TYPE_NODE.paddingX * 2,
  );
  const height = TYPE_NODE.minHeight;
  return { width, height };
}
