import type { Layout } from '@/models/diagram';

export type Side = 'top' | 'right' | 'bottom' | 'left';

export interface Point {
  x: number;
  y: number;
}

export interface RoutingResult {
  /** Flat [x1,y1,x2,y2,...] polyline points for Konva Line. */
  points: number[];
  sourceSide: Side;
  targetSide: Side;
  sourceAttach: Point;
  targetAttach: Point;
  /**
   * Unit tangent at each endpoint pointing FROM the endpoint INTO the line body
   * (i.e. along the last segment, away from the attached box).
   * Used to orient cardinality symbols.
   */
  sourceTangent: Point;
  targetTangent: Point;
}

interface RouteOffsetOptions {
  sourceNormalOffset?: number;
  targetNormalOffset?: number;
}

function offsetPointForSide(point: Point, side: Side, amount: number): Point {
  if (amount === 0) return point;

  switch (side) {
    case 'left':
    case 'right':
      return { x: point.x, y: point.y + amount };
    case 'top':
    case 'bottom':
      return { x: point.x - amount, y: point.y };
  }
}

/** Build an orthogonal (horizontal/vertical only) polyline between two rectangles. */
export function routeOrthogonal(
  source: Layout,
  target: Layout,
  offsets: RouteOffsetOptions = {},
): RoutingResult {
  const sCx = source.x + source.width / 2;
  const sCy = source.y + source.height / 2;
  const tCx = target.x + target.width / 2;
  const tCy = target.y + target.height / 2;

  const dx = tCx - sCx;
  const dy = tCy - sCy;

  // Determine routing direction:
  // - If the boxes overlap vertically, prefer horizontal routing.
  // - If they overlap horizontally, prefer vertical routing.
  // - Otherwise, pick the axis with larger separation (Manhattan distance).
  const yOverlap =
    Math.max(source.y, target.y) <
    Math.min(source.y + source.height, target.y + target.height);
  const xOverlap =
    Math.max(source.x, target.x) <
    Math.min(source.x + source.width, target.x + target.width);

  let horizontalFirst: boolean;
  if (yOverlap && !xOverlap) horizontalFirst = true;
  else if (xOverlap && !yOverlap) horizontalFirst = false;
  else horizontalFirst = Math.abs(dx) >= Math.abs(dy);

  let sourceSide: Side;
  let targetSide: Side;
  let sourceAttach: Point;
  let targetAttach: Point;
  let sourceTangent: Point;
  let targetTangent: Point;
  let points: number[];

  if (horizontalFirst) {
    if (dx >= 0) {
      sourceSide = 'right';
      targetSide = 'left';
      sourceAttach = { x: source.x + source.width, y: sCy };
      targetAttach = { x: target.x, y: tCy };
      sourceTangent = { x: 1, y: 0 };
      targetTangent = { x: -1, y: 0 };
    } else {
      sourceSide = 'left';
      targetSide = 'right';
      sourceAttach = { x: source.x, y: sCy };
      targetAttach = { x: target.x + target.width, y: tCy };
      sourceTangent = { x: -1, y: 0 };
      targetTangent = { x: 1, y: 0 };
    }

    sourceAttach = offsetPointForSide(sourceAttach, sourceSide, offsets.sourceNormalOffset ?? 0);
    targetAttach = offsetPointForSide(targetAttach, targetSide, offsets.targetNormalOffset ?? 0);

    if (Math.abs(sourceAttach.y - targetAttach.y) < 0.5) {
      points = [sourceAttach.x, sourceAttach.y, targetAttach.x, targetAttach.y];
    } else {
      const midX = (sourceAttach.x + targetAttach.x) / 2;
      points = [
        sourceAttach.x,
        sourceAttach.y,
        midX,
        sourceAttach.y,
        midX,
        targetAttach.y,
        targetAttach.x,
        targetAttach.y,
      ];
    }
  } else {
    if (dy >= 0) {
      sourceSide = 'bottom';
      targetSide = 'top';
      sourceAttach = { x: sCx, y: source.y + source.height };
      targetAttach = { x: tCx, y: target.y };
      sourceTangent = { x: 0, y: 1 };
      targetTangent = { x: 0, y: -1 };
    } else {
      sourceSide = 'top';
      targetSide = 'bottom';
      sourceAttach = { x: sCx, y: source.y };
      targetAttach = { x: tCx, y: target.y + target.height };
      sourceTangent = { x: 0, y: -1 };
      targetTangent = { x: 0, y: 1 };
    }

    sourceAttach = offsetPointForSide(sourceAttach, sourceSide, offsets.sourceNormalOffset ?? 0);
    targetAttach = offsetPointForSide(targetAttach, targetSide, offsets.targetNormalOffset ?? 0);

    if (Math.abs(sourceAttach.x - targetAttach.x) < 0.5) {
      points = [sourceAttach.x, sourceAttach.y, targetAttach.x, targetAttach.y];
    } else {
      const midY = (sourceAttach.y + targetAttach.y) / 2;
      points = [
        sourceAttach.x,
        sourceAttach.y,
        sourceAttach.x,
        midY,
        targetAttach.x,
        midY,
        targetAttach.x,
        targetAttach.y,
      ];
    }
  }

  return {
    points,
    sourceSide,
    targetSide,
    sourceAttach,
    targetAttach,
    sourceTangent,
    targetTangent,
  };
}
