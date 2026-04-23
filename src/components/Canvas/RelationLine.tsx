import { Group, Line } from 'react-konva';
import { Text } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { RelationElement, TypeElement } from '@/models/diagram';
import type { RoutingResult } from '@/utils/routing';
import { cardinalityLabel } from '@/utils/cardinality';
import { renderBrackets } from '@/constants/semantics';
import { CardinalityMarker } from './CardinalityMarker';

interface RelationLineProps {
  relation: RelationElement;
  source: TypeElement;
  target: TypeElement;
  route: RoutingResult;
  panModeActive?: boolean;
  selected: boolean;
  hovered: boolean;
  onSelect: () => void;
  onHoverChange: (hovered: boolean) => void;
}

const STROKE = '#1d1d1f';
const STROKE_WIDTH = 1.5;
const STROKE_WIDTH_SELECTED = 2;
const ACCENT = '#007aff';
const HIT_STROKE_WIDTH = 14; // invisible fat line for easier clicking

export function RelationLine({
  relation,
  source: _source,
  target: _target,
  route,
  panModeActive = false,
  selected,
  hovered,
  onSelect,
  onHoverChange,
}: RelationLineProps) {
  const stroke = selected ? ACCENT : hovered ? ACCENT : STROKE;
  const strokeWidth = selected ? STROKE_WIDTH_SELECTED : STROKE_WIDTH;

  const handleMouseEnter = (e: KonvaEventObject<MouseEvent>) => {
    onHoverChange(true);
    const stage = e.target.getStage();
    if (stage) stage.container().style.cursor = panModeActive ? 'grab' : 'pointer';
  };
  const handleMouseLeave = (e: KonvaEventObject<MouseEvent>) => {
    onHoverChange(false);
    const stage = e.target.getStage();
    if (stage) stage.container().style.cursor = '';
  };
  const handleClick = (e: KonvaEventObject<MouseEvent>) => {
    if (panModeActive || e.evt.button === 1) return;
    e.cancelBubble = true;
    onSelect();
  };

  // 自关联 loop 路径
  const isSelfReference = _source.id === _target.id;
  let linePoints = route.points;
  let sourceAttach = route.sourceAttach;
  let targetAttach = route.targetAttach;
  let sourceTangent = route.sourceTangent;
  let targetTangent = route.targetTangent;
  if (isSelfReference) {
    // 以 type box 右上角为起点，画一个矩形 loop
    const { x, y, width, height } = _source.layout;
    const loopW = Math.max(60, width * 0.8);
    const loopH = Math.max(60, height * 0.8);
    const startX = x + width;
    const startY = y + 0.2 * height;
    const endX = x + width / 2;
    const endY = y;
    linePoints = [
      startX, startY, // 起点：右侧
      startX + loopW, startY, // 向右
      startX + loopW, startY - loopH, // 向上
      endX, startY - loopH, // 向左
      endX, endY, // 向下到 box 顶部
    ];
    // 端点坐标和切线
    sourceAttach = { x: startX, y: startY };
    targetAttach = { x: endX, y: endY };
    sourceTangent = { x: 1, y: 0 };
    targetTangent = { x: 0, y: -1 };
  }

  return (
    <Group>
      {/* Visible line */}
      <Line
        points={linePoints}
        stroke={stroke}
        strokeWidth={strokeWidth}
        lineJoin="round"
        lineCap="round"
        listening={false}
      />
      {/* Invisible fat hit line for click/hover */}
      <Line
        points={linePoints}
        stroke="transparent"
        strokeWidth={HIT_STROKE_WIDTH}
        lineJoin="round"
        lineCap="round"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onMouseDown={handleClick}
        onTap={handleClick}
      />

      {/* Cardinality markers at each end */}
      <CardinalityMarker
        kind={relation.source.cardinality}
        endpoint={sourceAttach}
        tangent={sourceTangent}
        label={
          relation.source.cardinality === 'two_or_more'
            ? String(relation.source.cardinalityRange?.[0] ?? 'n')
            : relation.source.cardinality === 'range'
              ? cardinalityLabel('range', relation.source.cardinalityRange)
            : undefined
        }
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
      <CardinalityMarker
        kind={relation.target.cardinality}
        endpoint={targetAttach}
        tangent={targetTangent}
        label={
          relation.target.cardinality === 'two_or_more'
            ? String(relation.target.cardinalityRange?.[0] ?? 'n')
            : relation.target.cardinality === 'range'
              ? cardinalityLabel('range', relation.target.cardinalityRange)
            : undefined
        }
        stroke={stroke}
        strokeWidth={strokeWidth}
      />

      {/* Per-mapping semantic markers, rendered near each cardinality symbol. */}
      <EndSemanticLabel
        markers={relation.source.semantics}
        endpoint={sourceAttach}
        tangent={sourceTangent}
      />
      <EndSemanticLabel
        markers={relation.target.semantics}
        endpoint={targetAttach}
        tangent={targetTangent}
      />

      {/* Association-level semantic markers at线的中点. */}
      <AssociationSemanticLabel
        markers={relation.associationSemantics}
        points={linePoints}
      />
    </Group>
  );
}

/**
 * Render a mapping-scope marker string offset outward from the relation's
 * endpoint along the inward tangent (so text sits past the cardinality glyph,
 * not underneath it). The tangent points from endpoint into the line body; we
 * negate it to push text away from the box.
 */
function EndSemanticLabel({
  markers,
  endpoint,
  tangent,
}: {
  markers: RelationElement['source']['semantics'];
  endpoint: { x: number; y: number };
  tangent: { x: number; y: number };
}) {
  if (!markers || markers.length === 0) return null;
  const text = renderBrackets(markers);
  // Push text ~28px along the line past the cardinality glyph, then anchor it
  // so the text grows OUTWARD away from the Type box (preventing clipping
  // when multiple markers make the label longer than a fixed width).
  const along = 28;
  const perp = 12;
  const ax = endpoint.x + tangent.x * along + -tangent.y * perp;
  const ay = endpoint.y + tangent.y * along + tangent.x * perp;

  // Predominantly horizontal tangent → anchor left/right.
  // Predominantly vertical tangent → anchor top/bottom with center alignment.
  const BOX = 240;
  return (
    <Text
      x={ax - BOX / 2}
      y={tangent.y >= 0 ? ay : ay - 14}
      width={BOX}
      text={text}
      align="center"
      fontFamily="-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif"
      fontSize={11}
      fill="#515154"
      listening={false}
    />
  );
}

function AssociationSemanticLabel({
  markers,
  points,
}: {
  markers: RelationElement['associationSemantics'];
  points: number[];
}) {
  if (!markers || markers.length === 0) return null;
  if (points.length < 4) return null;
  // Approximate midpoint by walking the polyline's cumulative length.
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
  const mx = x1 + (x2 - x1) * t;
  const my = y1 + (y2 - y1) * t;
  // Offset perpendicular to the midpoint segment so text sits beside the line.
  const dx = (x2 - x1) / segLen;
  const dy = (y2 - y1) / segLen;
  const perp = 14;
  const tx = mx + -dy * perp;
  const ty = my + dx * perp;
  return (
    <Text
      x={tx - 80}
      y={ty - 7}
      width={160}
      text={renderBrackets(markers)}
      align="center"
      fontFamily="-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif"
      fontSize={11}
      fill="#515154"
      listening={false}
    />
  );
}
