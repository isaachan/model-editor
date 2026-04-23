/**
 * SVG export for the current diagram.
 *
 * Rather than stringifying the Konva scene graph, we walk the semantic
 * elements and emit a small, readable vector file. The geometry mirrors
 * the on-screen renderers (TypeNode / RelationLine / GeneralizationBox /
 * StickyNote) closely enough for documentation use, while keeping the
 * output free of Konva-specific attributes.
 */

import {
  isGeneralization,
  isLongSemantic,
  isRelation,
  isType,
  type DiagramElement,
  type GeneralizationElement,
  type LongSemanticElement,
  type RelationElement,
  type TypeElement,
} from '@/models/diagram';
import { routeOrthogonal } from '@/utils/routing';
import { computeNoteConnector } from '@/utils/noteConnector';
import { cardinalityLabel } from '@/utils/cardinality';
import { renderBrackets } from '@/constants/semantics';
import { TYPE_NODE, GENERALIZATION } from '@/constants/defaults';
import { LONG_SEMANTIC, headingColor, headingLabel } from '@/constants/longSemantic';

const FONT_FAMILY =
  "-apple-system, BlinkMacSystemFont, 'Inter', 'SF Pro Display', sans-serif";

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

function expandBounds(b: Bounds, x: number, y: number, w = 0, h = 0) {
  b.minX = Math.min(b.minX, x);
  b.minY = Math.min(b.minY, y);
  b.maxX = Math.max(b.maxX, x + w);
  b.maxY = Math.max(b.maxY, y + h);
}

/**
 * Export the diagram elements as an SVG file.
 *
 * The viewBox is computed from the union of all element bounding boxes with
 * a small margin so the output doesn't clip at the edges.
 */
export function exportSvg(elements: DiagramElement[], filename = 'diagram.svg') {
  const types = elements.filter(isType);
  const typesById = new Map(types.map((t) => [t.id, t]));
  const relations = elements.filter(isRelation);
  const gens = elements.filter(isGeneralization);
  const notes = elements.filter(isLongSemantic);

  const bounds: Bounds = {
    minX: Infinity,
    minY: Infinity,
    maxX: -Infinity,
    maxY: -Infinity,
  };

  for (const t of types) {
    expandBounds(bounds, t.layout.x, t.layout.y, t.layout.width, t.layout.height);
  }
  for (const g of gens) {
    expandBounds(bounds, g.layout.x, g.layout.y, g.layout.width, g.layout.height);
  }
  for (const n of notes) {
    expandBounds(bounds, n.layout.x, n.layout.y, n.layout.width, n.layout.height);
  }

  if (!isFinite(bounds.minX)) {
    // Empty diagram — still emit a small placeholder.
    bounds.minX = 0;
    bounds.minY = 0;
    bounds.maxX = 100;
    bounds.maxY = 100;
  }

  const margin = 40;
  const vbX = bounds.minX - margin;
  const vbY = bounds.minY - margin;
  const vbW = bounds.maxX - bounds.minX + margin * 2;
  const vbH = bounds.maxY - bounds.minY + margin * 2;

  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vbX} ${vbY} ${vbW} ${vbH}" width="${vbW}" height="${vbH}" font-family="${FONT_FAMILY}">`,
  );

  // Generalization containers + connector from parent to container top-center.
  for (const g of gens) {
    parts.push(renderGeneralization(g, typesById.get(g.parentTypeId) ?? null));
  }

  // Relations (orthogonal polyline + end cardinality labels + association semantics).
  for (const r of relations) {
    const s = typesById.get(r.source.typeId);
    const t = typesById.get(r.target.typeId);
    if (!s || !t) continue;
    parts.push(renderRelation(r, s, t));
  }

  // Types (rect + name + short semantics brackets above).
  for (const t of types) {
    parts.push(renderType(t));
  }

  // Long semantic notes (folded rect + heading + body + dashed connector to host).
  for (const n of notes) {
    const connector = computeNoteConnector(n, elements);
    if (connector) {
      parts.push(
        `<line x1="${connector.from.x}" y1="${connector.from.y}" x2="${connector.to.x}" y2="${connector.to.y}" stroke="${LONG_SEMANTIC.connectorStroke}" stroke-width="1" stroke-dasharray="${LONG_SEMANTIC.connectorDash.join(',')}" />`,
      );
    }
    parts.push(renderNote(n));
  }

  parts.push('</svg>');

  const blob = new Blob([parts.join('\n')], { type: 'image/svg+xml;charset=utf-8' });
  triggerDownload(blob, filename);
}

function renderType(t: TypeElement): string {
  const { x, y, width, height } = t.layout;
  const brackets = renderBrackets(t.semantics);
  const out: string[] = [];

  if (brackets) {
    out.push(
      `<text x="${x + width / 2}" y="${y - 6}" text-anchor="middle" font-size="12" fill="${TYPE_NODE.stroke}">${escapeXml(brackets)}</text>`,
    );
  }

  out.push(
    `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${TYPE_NODE.fill}" stroke="${TYPE_NODE.stroke}" stroke-width="${TYPE_NODE.strokeWidth}" />`,
  );
  out.push(
    `<text x="${x + width / 2}" y="${y + height / 2}" text-anchor="middle" dominant-baseline="central" font-size="${TYPE_NODE.fontSize}" fill="${TYPE_NODE.stroke}">${escapeXml(t.name)}</text>`,
  );

  return out.join('\n');
}

function renderRelation(
  r: RelationElement,
  source: TypeElement,
  target: TypeElement,
): string {
  const route = routeOrthogonal(source.layout, target.layout);
  const pts: string[] = [];
  for (let i = 0; i < route.points.length; i += 2) {
    pts.push(`${route.points[i]},${route.points[i + 1]}`);
  }

  const out: string[] = [];
  out.push(
    `<polyline points="${pts.join(' ')}" fill="none" stroke="#1d1d1f" stroke-width="1.5" />`,
  );

  // Cardinality labels near each end.
  const srcLabel = cardinalityLabel(r.source.cardinality, r.source.cardinalityRange);
  const tgtLabel = cardinalityLabel(r.target.cardinality, r.target.cardinalityRange);
  const srcEnd = { x: route.points[0], y: route.points[1] };
  const tgtEnd = {
    x: route.points[route.points.length - 2],
    y: route.points[route.points.length - 1],
  };

  if (srcLabel) {
    out.push(
      `<text x="${srcEnd.x}" y="${srcEnd.y - 6}" text-anchor="middle" font-size="11" fill="#1d1d1f">${escapeXml(srcLabel)}</text>`,
    );
  }
  if (tgtLabel) {
    out.push(
      `<text x="${tgtEnd.x}" y="${tgtEnd.y - 6}" text-anchor="middle" font-size="11" fill="#1d1d1f">${escapeXml(tgtLabel)}</text>`,
    );
  }

  // Per-end short-semantic brackets.
  const srcBrackets = renderBrackets(r.source.semantics);
  if (srcBrackets) {
    out.push(
      `<text x="${srcEnd.x}" y="${srcEnd.y + 14}" text-anchor="middle" font-size="11" fill="#1d1d1f">${escapeXml(srcBrackets)}</text>`,
    );
  }
  const tgtBrackets = renderBrackets(r.target.semantics);
  if (tgtBrackets) {
    out.push(
      `<text x="${tgtEnd.x}" y="${tgtEnd.y + 14}" text-anchor="middle" font-size="11" fill="#1d1d1f">${escapeXml(tgtBrackets)}</text>`,
    );
  }

  // Association short-semantic brackets at polyline midpoint.
  const assoc = renderBrackets(r.associationSemantics);
  if (assoc) {
    const mid = midpointOfPolyline(route.points);
    out.push(
      `<text x="${mid.x}" y="${mid.y - 6}" text-anchor="middle" font-size="11" fill="#1d1d1f">${escapeXml(assoc)}</text>`,
    );
  }

  return out.join('\n');
}

function midpointOfPolyline(points: number[]): { x: number; y: number } {
  if (points.length < 4) return { x: 0, y: 0 };
  let total = 0;
  const segs: number[] = [];
  for (let i = 2; i < points.length; i += 2) {
    const d = Math.hypot(points[i] - points[i - 2], points[i + 1] - points[i - 1]);
    segs.push(d);
    total += d;
  }
  let target = total / 2;
  let idx = 0;
  while (idx < segs.length && target > segs[idx]) {
    target -= segs[idx];
    idx += 1;
  }
  const x1 = points[idx * 2];
  const y1 = points[idx * 2 + 1];
  const x2 = points[idx * 2 + 2];
  const y2 = points[idx * 2 + 3];
  const t = target / (segs[idx] || 1);
  return { x: x1 + (x2 - x1) * t, y: y1 + (y2 - y1) * t };
}

function renderGeneralization(
  g: GeneralizationElement,
  parent: TypeElement | null,
): string {
  const { x, y, width, height } = g.layout;
  const out: string[] = [];

  // Container rect.
  out.push(
    `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="none" stroke="${GENERALIZATION.stroke}" stroke-width="${GENERALIZATION.strokeWidth}" />`,
  );

  // Incomplete partition: inner double line.
  if (g.completeness === 'incomplete') {
    const innerY = y + height - GENERALIZATION.incompleteInnerGap;
    out.push(
      `<line x1="${x}" y1="${innerY}" x2="${x + width}" y2="${innerY}" stroke="${GENERALIZATION.stroke}" stroke-width="${GENERALIZATION.strokeWidth}" />`,
    );
  }

  // Parent → container top-center connector (simple vertical from parent bottom).
  if (parent) {
    const px = parent.layout.x + parent.layout.width / 2;
    const py = parent.layout.y + parent.layout.height;
    const cx = x + width / 2;
    const cy = y;
    out.push(
      `<polyline points="${px},${py} ${px},${(py + cy) / 2} ${cx},${(py + cy) / 2} ${cx},${cy}" fill="none" stroke="${GENERALIZATION.stroke}" stroke-width="${GENERALIZATION.strokeWidth}" />`,
    );
  }

  return out.join('\n');
}

function renderNote(n: LongSemanticElement): string {
  const { x, y, width, height } = n.layout;
  const fold = LONG_SEMANTIC.fold;
  // Folded-corner outline: six points, fold at top-right.
  const path = `M${x},${y} L${x + width - fold},${y} L${x + width},${y + fold} L${x + width},${y + height} L${x},${y + height} Z`;
  const foldPath = `M${x + width - fold},${y} L${x + width - fold},${y + fold} L${x + width},${y + fold}`;

  const out: string[] = [];
  out.push(
    `<path d="${path}" fill="${LONG_SEMANTIC.paper}" stroke="${LONG_SEMANTIC.border}" stroke-width="1" />`,
  );
  out.push(
    `<path d="${foldPath}" fill="${LONG_SEMANTIC.foldFill}" stroke="${LONG_SEMANTIC.border}" stroke-width="1" />`,
  );

  // Heading.
  const textX = x + LONG_SEMANTIC.padding;
  const headingY = y + LONG_SEMANTIC.padding + LONG_SEMANTIC.headingFontSize;
  out.push(
    `<text x="${textX}" y="${headingY}" font-size="${LONG_SEMANTIC.headingFontSize}" font-weight="bold" font-style="italic" fill="${headingColor(n.heading)}">${escapeXml(headingLabel(n.heading))}</text>`,
  );

  // Body — naive line-break by character count; good enough for export.
  const bodyTop = headingY + LONG_SEMANTIC.headingGap + LONG_SEMANTIC.fontSize;
  const innerWidth = width - LONG_SEMANTIC.padding * 2 - fold;
  const lines = wrapText(n.body, innerWidth, LONG_SEMANTIC.fontSize);
  lines.forEach((line, i) => {
    out.push(
      `<text x="${textX}" y="${bodyTop + i * LONG_SEMANTIC.lineHeight}" font-size="${LONG_SEMANTIC.fontSize}" fill="#1d1d1f">${escapeXml(line)}</text>`,
    );
  });

  return out.join('\n');
}

/**
 * Approximate text wrapping by character-width heuristic. Not perfect for
 * CJK vs. Latin, but acceptable for SVG export which is a best-effort view.
 */
function wrapText(text: string, width: number, fontSize: number): string[] {
  const avgCharWidth = fontSize * 0.6;
  const maxChars = Math.max(4, Math.floor(width / avgCharWidth));
  const lines: string[] = [];
  for (const paragraph of text.split(/\n/)) {
    if (paragraph.length === 0) {
      lines.push('');
      continue;
    }
    for (let i = 0; i < paragraph.length; i += maxChars) {
      lines.push(paragraph.slice(i, i + maxChars));
    }
  }
  return lines;
}
