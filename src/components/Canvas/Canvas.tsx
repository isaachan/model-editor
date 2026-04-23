import { useEffect, useRef, useState } from 'react';
import { Layer, Rect, Stage } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import { useDiagramStore } from '@/store/useDiagramStore';
import { useEditorStore } from '@/store/useEditorStore';
import { CANVAS } from '@/constants/defaults';
import { isRelation, isType, type TypeElement } from '@/models/diagram';
import { TypeNode } from './TypeNode';
import { RelationLine } from './RelationLine';

export function Canvas() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  /**
   * Ephemeral position overrides while a Type is being dragged, so relation
   * lines can follow the moving node in real time (ME-018) without writing
   * to the store on every mousemove.
   */
  const [dragPos, setDragPos] = useState<Record<string, { x: number; y: number }>>({});

  const elements = useDiagramStore((s) => s.elements);
  const addTypeAt = useDiagramStore((s) => s.addTypeAt);
  const moveElement = useDiagramStore((s) => s.moveElement);
  const addRelation = useDiagramStore((s) => s.addRelation);

  const currentTool = useEditorStore((s) => s.currentTool);
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const hoveredId = useEditorStore((s) => s.hoveredId);
  const pendingRelationSource = useEditorStore((s) => s.pendingRelationSource);
  const select = useEditorStore((s) => s.select);
  const deselectAll = useEditorStore((s) => s.deselectAll);
  const setHovered = useEditorStore((s) => s.setHovered);
  const setTool = useEditorStore((s) => s.setTool);
  const setPendingRelationSource = useEditorStore((s) => s.setPendingRelationSource);

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

  const applyDrag = (el: TypeElement): TypeElement => {
    const override = dragPos[el.id];
    if (!override) return el;
    return { ...el, layout: { ...el.layout, x: override.x, y: override.y } };
  };

  const types = elements.filter(isType).map(applyDrag);
  const typesById = new Map(types.map((t) => [t.id, t]));
  const relations = elements.filter(isRelation);

  const handleStageMouseDown = (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
    const clickedOnEmpty = e.target === e.target.getStage();
    if (!clickedOnEmpty) return;

    if (currentTool === 'type') {
      const stage = e.target.getStage();
      if (!stage) return;
      const pointer = stage.getPointerPosition();
      if (!pointer) return;
      const created = addTypeAt(pointer.x, pointer.y);
      setTool('select');
      select(created.id);
      return;
    }

    if (currentTool === 'relation') {
      // Clicking empty cancels the pending source, but we stay in relation mode.
      setPendingRelationSource(null);
      return;
    }

    // Select tool: clicking empty space deselects
    deselectAll();
  };

  const handleTypeClickInRelationMode = (typeId: string) => {
    if (!pendingRelationSource) {
      setPendingRelationSource(typeId);
      return;
    }
    if (pendingRelationSource === typeId) {
      setPendingRelationSource(null);
      return;
    }
    const created = addRelation(pendingRelationSource, typeId);
    setPendingRelationSource(null);
    setTool('select');
    if (created) select(created.id);
  };

  const containerCursor =
    currentTool === 'type' || currentTool === 'relation' ? 'crosshair' : 'default';
  const typesDraggable = currentTool === 'select';

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

          {/* Relation layer (below types so line ends tuck under the boxes) */}
          <Layer>
            {relations.map((rel) => {
              const src = typesById.get(rel.source.typeId);
              const tgt = typesById.get(rel.target.typeId);
              if (!src || !tgt) return null;
              return (
                <RelationLine
                  key={rel.id}
                  relation={rel}
                  source={src}
                  target={tgt}
                  selected={selectedIds.includes(rel.id)}
                  hovered={hoveredId === rel.id}
                  onSelect={() => {
                    if (currentTool === 'select') select(rel.id);
                  }}
                  onHoverChange={(h) => setHovered(h ? rel.id : null)}
                />
              );
            })}
          </Layer>

          {/* Type layer */}
          <Layer>
            {types.map((el) => (
              <TypeNode
                key={el.id}
                element={el}
                selected={selectedIds.includes(el.id)}
                hovered={hoveredId === el.id}
                pendingSource={pendingRelationSource === el.id}
                draggable={typesDraggable}
                onSelect={() => {
                  if (currentTool === 'relation') {
                    handleTypeClickInRelationMode(el.id);
                  } else {
                    select(el.id);
                  }
                }}
                onHoverChange={(h) => setHovered(h ? el.id : null)}
                onDragMove={(x, y) =>
                  setDragPos((prev) => ({ ...prev, [el.id]: { x, y } }))
                }
                onDragEnd={(x, y) => {
                  moveElement(el.id, x, y);
                  setDragPos((prev) => {
                    const next = { ...prev };
                    delete next[el.id];
                    return next;
                  });
                }}
              />
            ))}
          </Layer>
        </Stage>
      )}
    </div>
  );
}
