import { Group, Line, Path, Rect, Text } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { LongSemanticElement } from '@/models/diagram';
import { LONG_SEMANTIC, headingColor, headingLabel } from '@/constants/longSemantic';

interface StickyNoteProps {
  element: LongSemanticElement;
  selected: boolean;
  hovered: boolean;
  panModeActive?: boolean;
  draggable: boolean;
  onSelect: () => void;
  onHoverChange: (hovered: boolean) => void;
  onDragMove: (x: number, y: number) => void;
  onDragEnd: (x: number, y: number) => void;
}

/**
 * Renders the folded-corner sticky note for a LongSemanticElement.
 * Body text is naively wrapped per-line by Konva's `text` wrapping since we
 * fix width. Folded corner is baked into the outline path; the triangular
 * fold patch sits on top.
 */
export function StickyNote({
  element,
  selected,
  hovered,
  panModeActive = false,
  draggable,
  onSelect,
  onHoverChange,
  onDragMove,
  onDragEnd,
}: StickyNoteProps) {
  const { layout, heading, body } = element;
  const w = layout.width;
  const h = layout.height;
  const fold = LONG_SEMANTIC.fold;
  const pad = LONG_SEMANTIC.padding;

  // Outline with the top-right corner folded inward.
  // Origin is (0,0) at the Group. Points go clockwise.
  const outlinePath = [
    `M 0 0`,
    `L ${w - fold} 0`,
    `L ${w} ${fold}`,
    `L ${w} ${h}`,
    `L 0 ${h}`,
    `Z`,
  ].join(' ');
  const foldPath = [
    `M ${w - fold} 0`,
    `L ${w} ${fold}`,
    `L ${w - fold} ${fold}`,
    `Z`,
  ].join(' ');

  const stroke = selected
    ? LONG_SEMANTIC.strokeSelected
    : hovered
      ? LONG_SEMANTIC.strokeHover
      : LONG_SEMANTIC.border;
  const strokeWidth = selected ? 2 : 1;

  const bodyWidth = w - pad * 2;
  const headingText = `${headingLabel(heading)}:`;

  return (
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
        onDragMove(e.target.x(), e.target.y());
      }}
      onDragEnd={(e: KonvaEventObject<DragEvent>) => {
        onDragEnd(e.target.x(), e.target.y());
      }}
    >
      {/* Hit area for selection; Path strokes only, so we need a Rect underneath. */}
      <Rect width={w} height={h} fill="transparent" />
      {/* Body paper */}
      <Path
        data={outlinePath}
        fill={LONG_SEMANTIC.paper}
        stroke={stroke}
        strokeWidth={strokeWidth}
        perfectDrawEnabled={false}
      />
      {/* Folded corner fill */}
      <Path
        data={foldPath}
        fill={LONG_SEMANTIC.foldFill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        perfectDrawEnabled={false}
        listening={false}
      />
      {/* Heading (italic bold, colored by type) */}
      <Text
        x={pad}
        y={pad}
        width={bodyWidth}
        text={headingText}
        fontFamily="-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif"
        fontSize={LONG_SEMANTIC.headingFontSize}
        fontStyle="italic bold"
        fill={headingColor(heading)}
        listening={false}
      />
      {/* Body text */}
      <Text
        x={pad}
        y={pad + LONG_SEMANTIC.headingFontSize + LONG_SEMANTIC.headingGap}
        width={bodyWidth}
        height={h - (pad * 2 + LONG_SEMANTIC.headingFontSize + LONG_SEMANTIC.headingGap)}
        text={body}
        fontFamily="-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif"
        fontSize={LONG_SEMANTIC.fontSize}
        fill={LONG_SEMANTIC.bodyFill}
        lineHeight={LONG_SEMANTIC.lineHeight / LONG_SEMANTIC.fontSize}
        ellipsis
        listening={false}
      />
      {/* Selection outline overlay (kept after content so it reads above the fold). */}
      {selected && (
        <Line
          points={[0, 0, w - fold, 0, w, fold, w, h, 0, h, 0, 0]}
          stroke={LONG_SEMANTIC.strokeSelected}
          strokeWidth={1.5}
          dash={[4, 3]}
          listening={false}
        />
      )}
    </Group>
  );
}
