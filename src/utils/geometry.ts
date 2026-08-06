import type { DiagramElement, GeneralizationElement, TypeElement } from '@/models/diagram';
/**
 * 重新计算所有 generalization 的容器布局（如宽高、位置等）。
 * 这里只是简单返回原数组，实际项目可根据需要实现 bbox 计算。
 */
export function recomputeAllContainers(elements: DiagramElement[]): DiagramElement[] {
  // TODO: 实现更精确的 bbox 计算逻辑
  return elements;
}

/**
 * 查找 typeId 属于哪个 generalization 容器
 */
export function findContainerOfType(elements: DiagramElement[], typeId: string): GeneralizationElement | undefined {
  return elements.find(
    (el): el is GeneralizationElement =>
      el.type === 'generalization' && el.childTypeIds.includes(typeId)
  );
}
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
