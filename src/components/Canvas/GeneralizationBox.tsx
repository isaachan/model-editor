import { Group, Line, Rect } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import { GENERALIZATION } from '@/constants/defaults';
import type { GeneralizationElement, TypeElement } from '@/models/diagram';
import { routeOrthogonal } from '@/utils/routing';

interface GeneralizationBoxProps {
  element: GeneralizationElement;
  parent: TypeElement;
  selected: boolean;
  hovered: boolean;
  /** Highlighted while a Type is being dragged over this container. */
  dropTarget?: boolean;
  panModeActive?: boolean;
  draggable: boolean;
  onSelect: () => void;
  onHoverChange: (hovered: boolean) => void;
  onDragMove: (dx: number, dy: number) => void;
  onDragEnd: (dx: number, dy: number) => void;
}

/**
 * Renders a generalization partition: the rectangular container, its connector
 * line to the parent Type, and (when incomplete) the inner extra bottom stroke.
 */
export function GeneralizationBox({
  element,
  parent,
  selected,
  hovered,
  dropTarget = false,
  panModeActive = false,
  draggable,
  onSelect,
  onHoverChange,
  onDragMove,
  onDragEnd,
}: GeneralizationBoxProps) {
  const { layout, completeness } = element;

  const stroke = selected
    ? GENERALIZATION.strokeSelected
    : hovered || dropTarget
      ? GENERALIZATION.strokeHover
      : GENERALIZATION.stroke;
  const strokeWidth = selected
    ? GENERALIZATION.strokeWidthSelected
    : GENERALIZATION.strokeWidth;

  // Connector: from nearest side of parent to nearest side of container.
  const route = routeOrthogonal(parent.layout, layout);

  return (
    <Group>
      {/* Connector line (rendering detail of the generalization, NOT a relation) */}
      <Line
        points={route.points}
        stroke={stroke}
        strokeWidth={strokeWidth}
        lineCap="square"
        lineJoin="miter"
        listening={false}
      />

      <Group
        x={layout.x}
        y={layout.y}
        draggable={draggable}
        onMouseDown={(e) => {
          if (panModeActive || e.evt.button === 1) return;
          e.cancelBubble = true;
          onSelect();
        }}
        onTap={(e) => {
          if (panModeActive) return;
          e.cancelBubble = true;
          onSelect();
        }}
        onMouseEnter={(e) => {
          onHoverChange(true);
          const stage = e.target.getStage();
          if (stage && panModeActive) stage.container().style.cursor = 'grab';
          else if (stage && draggable) stage.container().style.cursor = 'move';
        }}
        onMouseLeave={(e) => {
          onHoverChange(false);
          const stage = e.target.getStage();
          if (stage) stage.container().style.cursor = '';
        }}
        onDragStart={(e) => {
          e.cancelBubble = true;
        }}
        onDragMove={(e: KonvaEventObject<DragEvent>) => {
          const dx = e.target.x() - layout.x;
          const dy = e.target.y() - layout.y;
          onDragMove(dx, dy);
        }}
        onDragEnd={(e: KonvaEventObject<DragEvent>) => {
          const dx = e.target.x() - layout.x;
          const dy = e.target.y() - layout.y;
          onDragEnd(dx, dy);
          // Reset local transform — store has absorbed the delta.
          e.target.position({ x: layout.x, y: layout.y });
        }}
      >
        <Rect
          width={layout.width}
          height={layout.height}
          fill={dropTarget ? GENERALIZATION.fillHighlight : GENERALIZATION.fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
          cornerRadius={0}
          shadowEnabled={selected}
          shadowColor={GENERALIZATION.selectionShadow.color}
          shadowBlur={selected ? GENERALIZATION.selectionShadow.blur : 0}
          shadowOpacity={selected ? GENERALIZATION.selectionShadow.opacity : 0}
          perfectDrawEnabled={false}
        />

        {/* Incomplete → extra inner stroke just above bottom edge. */}
        {completeness === 'incomplete' && (
          <Line
            points={[
              0,
              layout.height - GENERALIZATION.incompleteInnerGap,
              layout.width,
              layout.height - GENERALIZATION.incompleteInnerGap,
            ]}
            stroke={stroke}
            strokeWidth={strokeWidth}
            listening={false}
          />
        )}
      </Group>
    </Group>
  );
}
