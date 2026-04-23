import { Group, Line } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { RelationElement, TypeElement } from '@/models/diagram';
import type { RoutingResult } from '@/utils/routing';
import { cardinalityLabel } from '@/utils/cardinality';
import { CardinalityMarker } from './CardinalityMarker';

interface RelationLineProps {
  relation: RelationElement;
  source: TypeElement;
  target: TypeElement;
  route: RoutingResult;
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
    if (stage) stage.container().style.cursor = 'pointer';
  };
  const handleMouseLeave = (e: KonvaEventObject<MouseEvent>) => {
    onHoverChange(false);
    const stage = e.target.getStage();
    if (stage) stage.container().style.cursor = '';
  };
  const handleClick = (e: KonvaEventObject<MouseEvent>) => {
    e.cancelBubble = true;
    onSelect();
  };

  return (
    <Group>
      {/* Visible line */}
      <Line
        points={route.points}
        stroke={stroke}
        strokeWidth={strokeWidth}
        lineJoin="round"
        lineCap="round"
        listening={false}
      />
      {/* Invisible fat hit line for click/hover */}
      <Line
        points={route.points}
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
        endpoint={route.sourceAttach}
        tangent={route.sourceTangent}
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
        endpoint={route.targetAttach}
        tangent={route.targetTangent}
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
    </Group>
  );
}
