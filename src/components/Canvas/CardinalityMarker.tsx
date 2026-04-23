import { Circle, Group, Line, Text } from 'react-konva';
import type { CardinalityKind } from '@/models/diagram';
import type { Point } from '@/utils/routing';

interface CardinalityMarkerProps {
  kind: CardinalityKind;
  /** Attach point on the box edge. */
  endpoint: Point;
  /** Unit tangent pointing from endpoint INTO the line (away from box). */
  tangent: Point;
  /** Custom range label when kind === 'range'. */
  rangeLabel?: string;
  stroke?: string;
  strokeWidth?: number;
}

const DEFAULT_STROKE = '#1d1d1f';
const DEFAULT_WIDTH = 1.5;

// Offsets measured from the endpoint, along the tangent into the line.
const OFFSET_NEAR = 5;   // inner bar / stub
const OFFSET_FAR = 15;   // outer bar / crow base / label anchor
const OFFSET_CIRCLE = 20; // circle center (zero markers)
const HALF_BAR = 7;      // bar extends ±7 perpendicular
const CROW_HALF = 7;     // crow foot spread ±7 perpendicular
const CIRCLE_R = 5;

export function CardinalityMarker({
  kind,
  endpoint,
  tangent,
  rangeLabel,
  stroke = DEFAULT_STROKE,
  strokeWidth = DEFAULT_WIDTH,
}: CardinalityMarkerProps) {
  const t = tangent;
  const n = { x: -t.y, y: t.x }; // 90° CCW rotation
  const at = (k: number): Point => ({ x: endpoint.x + k * t.x, y: endpoint.y + k * t.y });
  const plusN = (p: Point, k: number): Point => ({ x: p.x + k * n.x, y: p.y + k * n.y });

  const elements: React.ReactNode[] = [];
  const line = (p1: Point, p2: Point, key: string) => (
    <Line
      key={key}
      points={[p1.x, p1.y, p2.x, p2.y]}
      stroke={stroke}
      strokeWidth={strokeWidth}
      lineCap="round"
    />
  );
  const bar = (center: Point, key: string, halfLen = HALF_BAR) =>
    line(plusN(center, halfLen), plusN(center, -halfLen), key);
  const crowFoot = (base: Point, tipCenter: Point, key: string) => {
    const tipUp = plusN(tipCenter, CROW_HALF);
    const tipDown = plusN(tipCenter, -CROW_HALF);
    return [
      line(base, tipUp, `${key}-u`),
      line(base, tipDown, `${key}-d`),
      // short middle spoke for clarity
      line(
        base,
        { x: base.x + (tipCenter.x - base.x) * 0.66, y: base.y + (tipCenter.y - base.y) * 0.66 },
        `${key}-m`,
      ),
    ];
  };

  switch (kind) {
    case 'exactly_one':
      // ||  — two bars
      elements.push(bar(at(OFFSET_NEAR), 'near'));
      elements.push(bar(at(OFFSET_FAR), 'far'));
      break;

    case 'zero_or_one':
      // ○|  — circle + inner bar
      elements.push(
        <Circle
          key="circle"
          x={at(OFFSET_CIRCLE).x}
          y={at(OFFSET_CIRCLE).y}
          radius={CIRCLE_R}
          fill="#fff"
          stroke={stroke}
          strokeWidth={strokeWidth}
        />,
      );
      elements.push(bar(at(OFFSET_NEAR), 'near'));
      break;

    case 'one_or_more':
      // >|  — crow foot opening TOWARD the box, with a bar at the base
      elements.push(bar(at(OFFSET_FAR), 'bar'));
      elements.push(...crowFoot(at(OFFSET_FAR), endpoint, 'crow'));
      break;

    case 'zero_or_more':
      // ○>  — circle outer, crow foot toward box
      elements.push(
        <Circle
          key="circle"
          x={at(OFFSET_CIRCLE).x}
          y={at(OFFSET_CIRCLE).y}
          radius={CIRCLE_R}
          fill="#fff"
          stroke={stroke}
          strokeWidth={strokeWidth}
        />,
      );
      elements.push(...crowFoot(at(OFFSET_FAR), endpoint, 'crow'));
      break;

    case 'two_or_more': {
      // "2" label above the base + crow foot
      const labelAnchor = plusN(at(OFFSET_FAR), HALF_BAR + 6);
      elements.push(
        <Text
          key="label"
          x={labelAnchor.x - 4}
          y={labelAnchor.y - 6}
          text="2"
          fontSize={11}
          fontStyle="600"
          fill={stroke}
        />,
      );
      elements.push(...crowFoot(at(OFFSET_FAR), endpoint, 'crow'));
      break;
    }

    case 'range': {
      const labelAnchor = plusN(at(OFFSET_FAR), HALF_BAR + 8);
      elements.push(
        <Text
          key="label"
          x={labelAnchor.x - 14}
          y={labelAnchor.y - 6}
          text={rangeLabel ?? '[n,m]'}
          fontSize={11}
          fontStyle="500"
          fill={stroke}
        />,
      );
      // a small stub bar to anchor visually
      elements.push(bar(at(OFFSET_NEAR), 'stub', 5));
      break;
    }

    case 'unknown': {
      const labelAnchor = plusN(at(OFFSET_FAR), HALF_BAR + 6);
      elements.push(
        <Text
          key="label"
          x={labelAnchor.x - 4}
          y={labelAnchor.y - 7}
          text="?"
          fontSize={13}
          fontStyle="600"
          fill={stroke}
        />,
      );
      break;
    }

    case 'no_mapping': {
      // Draw an X centered at OFFSET_NEAR+OFFSET_FAR midpoint
      const center = at((OFFSET_NEAR + OFFSET_FAR) / 2);
      const d = 6;
      const p1 = { x: center.x - d * t.x + d * n.x, y: center.y - d * t.y + d * n.y };
      const p2 = { x: center.x + d * t.x - d * n.x, y: center.y + d * t.y - d * n.y };
      const p3 = { x: center.x - d * t.x - d * n.x, y: center.y - d * t.y - d * n.y };
      const p4 = { x: center.x + d * t.x + d * n.x, y: center.y + d * t.y + d * n.y };
      elements.push(line(p1, p2, 'x1'));
      elements.push(line(p3, p4, 'x2'));
      break;
    }
  }

  return <Group listening={false}>{elements}</Group>;
}
