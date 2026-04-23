import type {
  DiagramElement,
  LongSemanticElement,
  RelationElement,
  TypeElement,
} from '@/models/diagram';
import { isRelation, isType } from '@/models/diagram';
import { routeOrthogonal } from './routing';

/**
 * Compute the dashed connector line from a long-semantic note to its host
 * (Type or Relation). Returns null if the note has no attachment or the
 * referenced host is missing.
 *
 * Strategy:
 *   - Note anchor: pick the midpoint of whichever of the note's four edges
 *     is closest to the host.
 *   - Type host: pick the midpoint of its closest edge to the note's center.
 *   - Relation host: use the polyline midpoint.
 */
export interface NoteConnector {
  from: { x: number; y: number };
  to: { x: number; y: number };
}

export function computeNoteConnector(
  note: LongSemanticElement,
  elements: DiagramElement[],
): NoteConnector | null {
  if (!note.attachedTo) return null;
  const host = elements.find((e) => e.id === note.attachedTo) ?? null;
  if (!host) return null;

  if (isType(host)) {
    return connectNoteToType(note, host);
  }
  if (isRelation(host)) {
    return connectNoteToRelation(note, host, elements);
  }
  return null;
}

function rectEdgeMidpoints(x: number, y: number, w: number, h: number) {
  return [
    { x: x + w / 2, y: y, side: 'top' as const },
    { x: x + w / 2, y: y + h, side: 'bottom' as const },
    { x: x, y: y + h / 2, side: 'left' as const },
    { x: x + w, y: y + h / 2, side: 'right' as const },
  ];
}

function connectNoteToType(
  note: LongSemanticElement,
  host: TypeElement,
): NoteConnector {
  const noteEdges = rectEdgeMidpoints(
    note.layout.x,
    note.layout.y,
    note.layout.width,
    note.layout.height,
  );
  const hostEdges = rectEdgeMidpoints(
    host.layout.x,
    host.layout.y,
    host.layout.width,
    host.layout.height,
  );
  let best: NoteConnector = { from: noteEdges[0], to: hostEdges[0] };
  let bestDist = Infinity;
  for (const n of noteEdges) {
    for (const h of hostEdges) {
      const d = Math.hypot(n.x - h.x, n.y - h.y);
      if (d < bestDist) {
        bestDist = d;
        best = { from: { x: n.x, y: n.y }, to: { x: h.x, y: h.y } };
      }
    }
  }
  return best;
}

function connectNoteToRelation(
  note: LongSemanticElement,
  host: RelationElement,
  elements: DiagramElement[],
): NoteConnector | null {
  const source = elements.find(
    (e): e is TypeElement => isType(e) && e.id === host.source.typeId,
  );
  const target = elements.find(
    (e): e is TypeElement => isType(e) && e.id === host.target.typeId,
  );
  if (!source || !target) return null;
  const route = routeOrthogonal(source.layout, target.layout);
  const mid = polylineMidpoint(route.points);
  const noteEdges = rectEdgeMidpoints(
    note.layout.x,
    note.layout.y,
    note.layout.width,
    note.layout.height,
  );
  let best = noteEdges[0];
  let bestDist = Infinity;
  for (const n of noteEdges) {
    const d = Math.hypot(n.x - mid.x, n.y - mid.y);
    if (d < bestDist) {
      bestDist = d;
      best = n;
    }
  }
  return { from: { x: best.x, y: best.y }, to: mid };
}

function polylineMidpoint(points: number[]): { x: number; y: number } {
  if (points.length < 4) return { x: 0, y: 0 };
  let total = 0;
  const segs: number[] = [];
  for (let i = 2; i < points.length; i += 2) {
    const dx = points[i] - points[i - 2];
    const dy = points[i + 1] - points[i - 1];
    const d = Math.hypot(dx, dy);
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
  const segLen = segs[idx] || 1;
  const t = target / segLen;
  return { x: x1 + (x2 - x1) * t, y: y1 + (y2 - y1) * t };
}
