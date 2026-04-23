/**
 * Access to the Konva Stage for export features (PNG, SVG).
 * Canvas registers its stage on mount; the Toolbar reads it on user action.
 * A tiny module-level singleton avoids drilling refs through the component
 * tree or standing up a dedicated context just for exports.
 */
import type Konva from 'konva';

let stage: Konva.Stage | null = null;

export function registerStage(s: Konva.Stage | null) {
  stage = s;
}

export function getStage(): Konva.Stage | null {
  return stage;
}

function triggerDownload(dataUrl: string, filename: string) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/**
 * Export the current stage content to PNG and trigger a download.
 *
 * We temporarily reset the viewport transform so the exported image covers
 * the diagram's bounding box at 1:1 world scale (modulated by `pixelRatio`
 * for hi-dpi output), instead of whatever the user is currently zoomed to.
 */
export function exportPng(filename = 'diagram.png', pixelRatio = 2) {
  if (!stage) return;
  const rect = computeContentBounds(stage);
  if (!rect) return;

  const originalX = stage.x();
  const originalY = stage.y();
  const originalScaleX = stage.scaleX();
  const originalScaleY = stage.scaleY();

  // Temporarily reset pan/zoom so toDataURL's (x, y, w, h) refers to world
  // space rather than the currently-visible screen region.
  stage.position({ x: 0, y: 0 });
  stage.scale({ x: 1, y: 1 });

  const padding = 20;
  const dataUrl = stage.toDataURL({
    mimeType: 'image/png',
    pixelRatio,
    x: rect.x - padding,
    y: rect.y - padding,
    width: rect.width + padding * 2,
    height: rect.height + padding * 2,
  });

  // Restore the user's viewport so the on-screen view isn't disturbed.
  stage.position({ x: originalX, y: originalY });
  stage.scale({ x: originalScaleX, y: originalScaleY });

  triggerDownload(dataUrl, filename);
}

/**
 * Compute the axis-aligned bounding box of all non-background, non-grid
 * content in world-space coordinates.
 */
function computeContentBounds(
  s: Konva.Stage,
): { x: number; y: number; width: number; height: number } | null {
  const layers = s.getLayers();
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const layer of layers) {
    // Skip non-listening decorative layers (background + grid).
    if (!layer.listening()) continue;
    const children = layer.getChildren();
    for (const child of children) {
      const rect = child.getClientRect({ relativeTo: s });
      if (rect.width === 0 || rect.height === 0) continue;
      // Convert back to world coords by undoing stage transform, because
      // getClientRect(relativeTo: stage) returns screen-space coords.
      const worldX = (rect.x - s.x()) / s.scaleX();
      const worldY = (rect.y - s.y()) / s.scaleY();
      const worldW = rect.width / s.scaleX();
      const worldH = rect.height / s.scaleY();
      minX = Math.min(minX, worldX);
      minY = Math.min(minY, worldY);
      maxX = Math.max(maxX, worldX + worldW);
      maxY = Math.max(maxY, worldY + worldH);
    }
  }

  if (!isFinite(minX)) return null;
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}
