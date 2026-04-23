import { useEffect, useRef, useState } from 'react';
import { Layer, Rect, Stage } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import { useDiagramStore } from '@/store/useDiagramStore';
import { useEditorStore } from '@/store/useEditorStore';
import { CANVAS } from '@/constants/defaults';
import { TypeNode } from './TypeNode';

export function Canvas() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  const elements = useDiagramStore((s) => s.elements);
  const addTypeAt = useDiagramStore((s) => s.addTypeAt);
  const moveElement = useDiagramStore((s) => s.moveElement);

  const currentTool = useEditorStore((s) => s.currentTool);
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const hoveredId = useEditorStore((s) => s.hoveredId);
  const select = useEditorStore((s) => s.select);
  const deselectAll = useEditorStore((s) => s.deselectAll);
  const setHovered = useEditorStore((s) => s.setHovered);
  const setTool = useEditorStore((s) => s.setTool);

  // Resize the stage to fill the container.
  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const update = () => {
      setSize({ width: el.clientWidth, height: el.clientHeight });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const handleStageMouseDown = (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
    const clickedOnEmpty = e.target === e.target.getStage();
    if (!clickedOnEmpty) return;

    if (currentTool === 'type') {
      const stage = e.target.getStage();
      if (!stage) return;
      const pointer = stage.getPointerPosition();
      if (!pointer) return;
      const created = addTypeAt(pointer.x, pointer.y);
      // Switch to select so the new node can be edited immediately (ME-006 AC: exit create mode)
      setTool('select');
      select(created.id);
      return;
    }

    // Select tool: clicking empty space deselects
    deselectAll();
  };

  const containerCursor = currentTool === 'type' ? 'crosshair' : 'default';
  const draggable = currentTool === 'select';

  return (
    <div
      ref={containerRef}
      className="relative flex-1 overflow-hidden"
      style={{ background: CANVAS.background, cursor: containerCursor }}
    >
      {size.width > 0 && size.height > 0 && (
        <Stage
          width={size.width}
          height={size.height}
          onMouseDown={handleStageMouseDown}
          onTouchStart={handleStageMouseDown}
          className="konva-stage"
        >
          {/* Background layer — opaque rect so stage clicks hit an empty target */}
          <Layer listening={false}>
            <Rect width={size.width} height={size.height} fill={CANVAS.background} />
          </Layer>

          {/* Type layer (more layers added in later stories) */}
          <Layer>
            {elements.map((el) => {
              if (el.type !== 'type') return null;
              return (
                <TypeNode
                  key={el.id}
                  element={el}
                  selected={selectedIds.includes(el.id)}
                  hovered={hoveredId === el.id}
                  draggable={draggable}
                  onSelect={() => select(el.id)}
                  onHoverChange={(h) => setHovered(h ? el.id : null)}
                  onDragEnd={(x, y) => moveElement(el.id, x, y)}
                />
              );
            })}
          </Layer>
        </Stage>
      )}
    </div>
  );
}
