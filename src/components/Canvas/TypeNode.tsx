import { Group, Rect, Text } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import { TYPE_NODE } from '@/constants/defaults';
import type { TypeElement } from '@/models/diagram';

interface TypeNodeProps {
  element: TypeElement;
  selected: boolean;
  hovered: boolean;
  draggable: boolean;
  onSelect: () => void;
  onHoverChange: (hovered: boolean) => void;
  onDragEnd: (x: number, y: number) => void;
}

export function TypeNode({
  element,
  selected,
  hovered,
  draggable,
  onSelect,
  onHoverChange,
  onDragEnd,
}: TypeNodeProps) {
  const { layout, name } = element;

  const stroke = selected
    ? TYPE_NODE.strokeSelected
    : hovered
      ? TYPE_NODE.strokeHover
      : TYPE_NODE.stroke;
  const strokeWidth = selected ? TYPE_NODE.strokeWidthSelected : TYPE_NODE.strokeWidth;

  return (
    <Group
      x={layout.x}
      y={layout.y}
      draggable={draggable}
      onMouseDown={(e) => {
        // Prevent stage-level deselect when clicking the node body
        e.cancelBubble = true;
        onSelect();
      }}
      onTap={(e) => {
        e.cancelBubble = true;
        onSelect();
      }}
      onMouseEnter={(e) => {
        onHoverChange(true);
        const stage = e.target.getStage();
        if (stage && draggable) stage.container().style.cursor = 'move';
      }}
      onMouseLeave={(e) => {
        onHoverChange(false);
        const stage = e.target.getStage();
        if (stage) stage.container().style.cursor = '';
      }}
      onDragStart={(e) => {
        e.cancelBubble = true;
      }}
      onDragEnd={(e: KonvaEventObject<DragEvent>) => {
        onDragEnd(e.target.x(), e.target.y());
      }}
    >
      <Rect
        width={layout.width}
        height={layout.height}
        fill={TYPE_NODE.fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        /* Fowler notation: sharp corners */
        cornerRadius={0}
        shadowEnabled={selected || hovered}
        shadowColor={selected ? TYPE_NODE.selectionShadow.color : '#000'}
        shadowBlur={selected ? TYPE_NODE.selectionShadow.blur : hovered ? 10 : 0}
        shadowOpacity={selected ? TYPE_NODE.selectionShadow.opacity : hovered ? 0.1 : 0}
        shadowOffsetX={0}
        shadowOffsetY={hovered && !selected ? 2 : 0}
        perfectDrawEnabled={false}
      />
      <Text
        text={name}
        width={layout.width}
        height={layout.height}
        align="center"
        verticalAlign="middle"
        fontFamily={TYPE_NODE.fontFamily}
        fontSize={TYPE_NODE.fontSize}
        fill={TYPE_NODE.stroke}
        listening={false}
      />
    </Group>
  );
}
