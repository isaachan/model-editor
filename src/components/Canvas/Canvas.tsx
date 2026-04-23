import { useEffect, useRef, useState } from 'react';
import { Group, Layer, Rect, Stage } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import { useDiagramStore } from '@/store/useDiagramStore';
import { useEditorStore } from '@/store/useEditorStore';
import { CANVAS } from '@/constants/defaults';
import { isGeneralization, isRelation, isType, type GeneralizationElement, type TypeElement } from '@/models/diagram';
import { routeOrthogonal, type Point, type RoutingResult, type Side } from '@/utils/routing';
import { TypeNode } from './TypeNode';
import { RelationLine } from './RelationLine';
import { GeneralizationBox } from './GeneralizationBox';

const MARKER_OFFSET_STEP = 18;
const MIN_SCALE = 0.25;
const MAX_SCALE = 4;
const MARQUEE_THRESHOLD = 4;

interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface MarkerEndpoint {
  relationId: string;
  end: 'source' | 'target';
  typeId: string;
  side: Side;
  attachX: number;
  attachY: number;
}

function buildMarkerOffsetMap(entries: MarkerEndpoint[]) {
  const grouped = new Map<string, MarkerEndpoint[]>();

  for (const entry of entries) {
    const key = `${entry.typeId}:${entry.side}`;
    const bucket = grouped.get(key);
    if (bucket) bucket.push(entry);
    else grouped.set(key, [entry]);
  }

  const offsets = new Map<string, number>();

  for (const group of grouped.values()) {
    if (group.length < 2) continue;

    group.sort((a, b) => {
      const axisA = a.side === 'left' || a.side === 'right' ? a.attachY : a.attachX;
      const axisB = b.side === 'left' || b.side === 'right' ? b.attachY : b.attachX;
      if (axisA !== axisB) return axisA - axisB;
      if (a.end !== b.end) return a.end === 'source' ? -1 : 1;
      return a.relationId.localeCompare(b.relationId);
    });

    const center = (group.length - 1) / 2;
    group.forEach((entry, index) => {
      offsets.set(`${entry.relationId}:${entry.end}`, (index - center) * MARKER_OFFSET_STEP);
    });
  }

  return offsets;
}

function normalizeBounds(a: Point, b: Point): Bounds {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return {
    x,
    y,
    width: Math.abs(b.x - a.x),
    height: Math.abs(b.y - a.y),
  };
}

function intersects(a: Bounds, b: Bounds) {
  return !(
    a.x + a.width < b.x ||
    b.x + b.width < a.x ||
    a.y + a.height < b.y ||
    b.y + b.height < a.y
  );
}

function routeBounds(points: number[]): Bounds {
  const xs: number[] = [];
  const ys: number[] = [];
  for (let i = 0; i < points.length; i += 2) {
    xs.push(points[i]);
    ys.push(points[i + 1]);
  }
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}

export function Canvas() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  /**
   * Ephemeral position overrides while a Type is being dragged, so relation
   * lines can follow the moving node in real time (ME-018) without writing
   * to the store on every mousemove.
   */
  const [dragPos, setDragPos] = useState<Record<string, { x: number; y: number }>>({});
  const [spacePressed, setSpacePressed] = useState(false);
  const [panSession, setPanSession] = useState<{
    start: Point;
    origin: { x: number; y: number };
  } | null>(null);
  const [marquee, setMarquee] = useState<{ start: Point; current: Point } | null>(null);

  const elements = useDiagramStore((s) => s.elements);
  const addTypeAt = useDiagramStore((s) => s.addTypeAt);
  const addChildTypeAt = useDiagramStore((s) => s.addChildTypeAt);
  const moveElement = useDiagramStore((s) => s.moveElement);
  const addRelation = useDiagramStore((s) => s.addRelation);
  const deleteElements = useDiagramStore((s) => s.deleteElements);
  const addGeneralizationAt = useDiagramStore((s) => s.addGeneralizationAt);
  const moveGeneralizationBy = useDiagramStore((s) => s.moveGeneralizationBy);
  const attachTypeToGeneralization = useDiagramStore((s) => s.attachTypeToGeneralization);
  const detachTypeFromGeneralization = useDiagramStore((s) => s.detachTypeFromGeneralization);

  const currentTool = useEditorStore((s) => s.currentTool);
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const hoveredId = useEditorStore((s) => s.hoveredId);
  const viewport = useEditorStore((s) => s.viewport);
  const pendingRelationSource = useEditorStore((s) => s.pendingRelationSource);
  const pendingGeneralizationParent = useEditorStore((s) => s.pendingGeneralizationParent);
  const select = useEditorStore((s) => s.select);
  const selectMany = useEditorStore((s) => s.selectMany);
  const deselectAll = useEditorStore((s) => s.deselectAll);
  const setHovered = useEditorStore((s) => s.setHovered);
  const setTool = useEditorStore((s) => s.setTool);
  const setViewport = useEditorStore((s) => s.setViewport);
  const resetViewport = useEditorStore((s) => s.resetViewport);
  const setPendingRelationSource = useEditorStore((s) => s.setPendingRelationSource);
  const setPendingGeneralizationParent = useEditorStore((s) => s.setPendingGeneralizationParent);

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

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space' && !isEditableTarget(event.target)) {
        event.preventDefault();
        setSpacePressed(true);
      }

      if ((event.key === 'Delete' || event.key === 'Backspace') && !isEditableTarget(event.target)) {
        if (selectedIds.length === 0) return;
        event.preventDefault();
        deleteElements(selectedIds);
        deselectAll();
        setHovered(null);
      }

      if (event.key === 'Escape' && !isEditableTarget(event.target)) {
        setTool('select');
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code === 'Space') setSpacePressed(false);
    };

    const handleBlur = () => setSpacePressed(false);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [deleteElements, deselectAll, selectedIds, setHovered, setTool]);

  const toWorldPoint = (point: Point): Point => ({
    x: (point.x - viewport.x) / viewport.scale,
    y: (point.y - viewport.y) / viewport.scale,
  });

  const applyDrag = (el: TypeElement): TypeElement => {
    const override = dragPos[el.id];
    if (!override) return el;
    return { ...el, layout: { ...el.layout, x: override.x, y: override.y } };
  };

  const types = elements.filter(isType).map(applyDrag);
  const typesById = new Map(types.map((t) => [t.id, t]));
  const relations = elements.filter(isRelation);
  const generalizations = elements.filter(isGeneralization);
  const generalizationsWithParent = generalizations
    .map((gen) => {
      const parent = typesById.get(gen.parentTypeId);
      if (!parent) return null;
      return { gen, parent };
    })
    .filter((entry): entry is { gen: GeneralizationElement; parent: TypeElement } => entry !== null);

  /** Return the innermost container whose bounding box contains `point` (world coords). */
  const containerAtPoint = (point: Point): GeneralizationElement | null => {
    const hits = generalizations.filter(
      (g) =>
        point.x >= g.layout.x &&
        point.x <= g.layout.x + g.layout.width &&
        point.y >= g.layout.y &&
        point.y <= g.layout.y + g.layout.height,
    );
    if (hits.length === 0) return null;
    // Smallest area wins (innermost in nested case).
    hits.sort((a, b) => a.layout.width * a.layout.height - b.layout.width * b.layout.height);
    return hits[0];
  };
  const baseRelationRenderData = relations
    .map((relation) => {
      const source = typesById.get(relation.source.typeId);
      const target = typesById.get(relation.target.typeId);
      if (!source || !target) return null;

      return {
        relation,
        source,
        target,
        route: routeOrthogonal(source.layout, target.layout),
      };
    })
    .filter((entry): entry is { relation: (typeof relations)[number]; source: TypeElement; target: TypeElement; route: RoutingResult } => entry !== null);

  const markerOffsets = buildMarkerOffsetMap(
    baseRelationRenderData.flatMap(({ relation, route }) => [
      {
        relationId: relation.id,
        end: 'source' as const,
        typeId: relation.source.typeId,
        side: route.sourceSide,
        attachX: route.sourceAttach.x,
        attachY: route.sourceAttach.y,
      },
      {
        relationId: relation.id,
        end: 'target' as const,
        typeId: relation.target.typeId,
        side: route.targetSide,
        attachX: route.targetAttach.x,
        attachY: route.targetAttach.y,
      },
    ]),
  );

  const relationRenderData = baseRelationRenderData.map(({ relation, source, target }) => ({
    relation,
    source,
    target,
    route: routeOrthogonal(source.layout, target.layout, {
      sourceNormalOffset: markerOffsets.get(`${relation.id}:source`) ?? 0,
      targetNormalOffset: markerOffsets.get(`${relation.id}:target`) ?? 0,
    }),
  }));

  const marqueeBounds = marquee ? normalizeBounds(marquee.start, marquee.current) : null;

  const finishMarqueeSelection = () => {
    if (!marqueeBounds) return;

    if (marqueeBounds.width < MARQUEE_THRESHOLD / viewport.scale && marqueeBounds.height < MARQUEE_THRESHOLD / viewport.scale) {
      deselectAll();
      setMarquee(null);
      return;
    }

    const selectedTypeIds = types
      .filter((type) =>
        intersects(marqueeBounds, {
          x: type.layout.x,
          y: type.layout.y,
          width: type.layout.width,
          height: type.layout.height,
        }),
      )
      .map((type) => type.id);

    const selectedRelationIds = relationRenderData
      .filter(({ route }) => intersects(marqueeBounds, routeBounds(route.points)))
      .map(({ relation }) => relation.id);

    selectMany([...selectedTypeIds, ...selectedRelationIds]);
    setMarquee(null);
  };

  const startPan = (pointer: Point) => {
    setPanSession({
      start: pointer,
      origin: { x: viewport.x, y: viewport.y },
    });
    setMarquee(null);
  };

  const handleStageMouseDown = (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    if ('button' in e.evt && (e.evt.button === 1 || (spacePressed && e.evt.button === 0))) {
      startPan(pointer);
      return;
    }

    const clickedOnEmpty = e.target === stage;
    if (!clickedOnEmpty || ('button' in e.evt && e.evt.button !== 0)) return;

    const worldPointer = toWorldPoint(pointer);

    if (currentTool === 'type') {
      // If clicked inside a container on empty space, create the Type as a child.
      const container = containerAtPoint(worldPointer);
      if (container) {
        const created = addChildTypeAt(container.id, worldPointer.x, worldPointer.y);
        if (created) {
          setTool('select');
          select(created.id);
        }
        return;
      }
      const created = addTypeAt(worldPointer.x, worldPointer.y);
      setTool('select');
      select(created.id);
      return;
    }

    if (currentTool === 'relation') {
      // Clicking empty cancels the pending source, but we stay in relation mode.
      setPendingRelationSource(null);
      return;
    }

    if (currentTool === 'generalization') {
      // Clicking empty without a pending parent is a no-op (prompt stays visible).
      if (!pendingGeneralizationParent) return;
      const created = addGeneralizationAt(
        pendingGeneralizationParent,
        worldPointer.x,
        worldPointer.y,
      );
      if (created) {
        setTool('select');
        select(created.id);
      }
      return;
    }

    setMarquee({ start: worldPointer, current: worldPointer });
  };

  const handleStageMouseMove = (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    if (panSession) {
      setViewport({
        x: panSession.origin.x + (pointer.x - panSession.start.x),
        y: panSession.origin.y + (pointer.y - panSession.start.y),
      });
      return;
    }

    if (marquee) {
      setMarquee((current) => (current ? { ...current, current: toWorldPoint(pointer) } : current));
    }
  };

  const handleStageMouseUp = () => {
    if (panSession) {
      setPanSession(null);
      return;
    }

    if (marquee) finishMarqueeSelection();
  };

  const handleWheel = (e: KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = e.target.getStage();
    if (!stage) return;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const worldPoint = toWorldPoint(pointer);
    const direction = e.evt.deltaY > 0 ? -1 : 1;
    const scaleFactor = direction > 0 ? 1.1 : 1 / 1.1;
    const nextScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, viewport.scale * scaleFactor));

    setViewport({
      scale: nextScale,
      x: pointer.x - worldPoint.x * nextScale,
      y: pointer.y - worldPoint.y * nextScale,
    });
  };

  const handleStageDoubleClick = (e: KonvaEventObject<MouseEvent>) => {
    if (e.target === e.target.getStage()) resetViewport();
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

  const handleTypeClickInGeneralizationMode = (typeId: string) => {
    // Clicking the currently-pending parent toggles it off.
    if (pendingGeneralizationParent === typeId) {
      setPendingGeneralizationParent(null);
      return;
    }
    setPendingGeneralizationParent(typeId);
  };

  const handleTypeDragSettled = (typeId: string, x: number, y: number) => {
    // Commit the move first so the store has fresh coordinates.
    moveElement(typeId, x, y);

    const center: Point = {
      x: x + (typesById.get(typeId)?.layout.width ?? 0) / 2,
      y: y + (typesById.get(typeId)?.layout.height ?? 0) / 2,
    };
    const hitContainer = containerAtPoint(center);
    const previousOwner = generalizations.find((g) => g.childTypeIds.includes(typeId)) ?? null;

    if (hitContainer && hitContainer.id !== previousOwner?.id) {
      // Do not allow a Type to become a child of a container whose parent is itself.
      if (hitContainer.parentTypeId === typeId) {
        if (previousOwner) detachTypeFromGeneralization(typeId);
        return;
      }
      attachTypeToGeneralization(typeId, hitContainer.id);
      return;
    }
    if (!hitContainer && previousOwner) {
      detachTypeFromGeneralization(typeId);
    }
  };

  const containerCursor =
    panSession
      ? 'grabbing'
      : spacePressed
        ? 'grab'
        : currentTool === 'type' || currentTool === 'relation' || currentTool === 'generalization'
          ? 'crosshair'
          : 'default';
  const typesDraggable = currentTool === 'select' && !spacePressed && !panSession;

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
          onMouseMove={handleStageMouseMove}
          onMouseUp={handleStageMouseUp}
          onMouseLeave={handleStageMouseUp}
          onTouchStart={handleStageMouseDown}
          onWheel={handleWheel}
          onDblClick={handleStageDoubleClick}
          className="konva-stage"
        >
          {/* Background layer — opaque rect so stage clicks hit an empty target */}
          <Layer listening={false}>
            <Rect width={size.width} height={size.height} fill={CANVAS.background} />
          </Layer>

          {/* Generalization layer (below relations and types). */}
          <Layer>
            <Group x={viewport.x} y={viewport.y} scaleX={viewport.scale} scaleY={viewport.scale}>
              {generalizationsWithParent.map(({ gen, parent }) => (
                <GeneralizationBox
                  key={gen.id}
                  element={gen}
                  parent={parent}
                  selected={selectedIds.includes(gen.id)}
                  hovered={hoveredId === gen.id}
                  panModeActive={spacePressed}
                  draggable={typesDraggable}
                  onSelect={() => {
                    if (currentTool === 'select') select(gen.id);
                  }}
                  onHoverChange={(h) => setHovered(h ? gen.id : null)}
                  onDragMove={() => {
                    /* Live drag preview is handled by Konva's local transform; no store writes. */
                  }}
                  onDragEnd={(dx, dy) => moveGeneralizationBy(gen.id, dx, dy)}
                />
              ))}
            </Group>
          </Layer>

          {/* Relation layer (below types so line ends tuck under the boxes) */}
          <Layer>
            <Group x={viewport.x} y={viewport.y} scaleX={viewport.scale} scaleY={viewport.scale}>
              {relationRenderData.map(({ relation, source, target, route }) => {
                return (
                  <RelationLine
                    key={relation.id}
                    relation={relation}
                    source={source}
                    target={target}
                    route={route}
                    panModeActive={spacePressed}
                    selected={selectedIds.includes(relation.id)}
                    hovered={hoveredId === relation.id}
                    onSelect={() => {
                      if (currentTool === 'select') select(relation.id);
                    }}
                    onHoverChange={(h) => setHovered(h ? relation.id : null)}
                  />
                );
              })}
            </Group>
          </Layer>

          {/* Type layer */}
          <Layer>
            <Group x={viewport.x} y={viewport.y} scaleX={viewport.scale} scaleY={viewport.scale}>
              {types.map((el) => (
                <TypeNode
                  key={el.id}
                  element={el}
                  selected={selectedIds.includes(el.id)}
                  hovered={hoveredId === el.id}
                  pendingSource={
                    pendingRelationSource === el.id || pendingGeneralizationParent === el.id
                  }
                  panModeActive={spacePressed}
                  draggable={typesDraggable}
                  onSelect={() => {
                    if (currentTool === 'relation') {
                      handleTypeClickInRelationMode(el.id);
                    } else if (currentTool === 'generalization') {
                      handleTypeClickInGeneralizationMode(el.id);
                    } else {
                      select(el.id);
                    }
                  }}
                  onHoverChange={(h) => setHovered(h ? el.id : null)}
                  onDragMove={(x, y) =>
                    setDragPos((prev) => ({ ...prev, [el.id]: { x, y } }))
                  }
                  onDragEnd={(x, y) => {
                    handleTypeDragSettled(el.id, x, y);
                    setDragPos((prev) => {
                      const next = { ...prev };
                      delete next[el.id];
                      return next;
                    });
                  }}
                />
              ))}

              {marqueeBounds && (
                <Rect
                  x={marqueeBounds.x}
                  y={marqueeBounds.y}
                  width={marqueeBounds.width}
                  height={marqueeBounds.height}
                  fill="rgba(0, 122, 255, 0.12)"
                  stroke="#007aff"
                  strokeWidth={1 / viewport.scale}
                  dash={[6 / viewport.scale, 4 / viewport.scale]}
                  listening={false}
                />
              )}
            </Group>
          </Layer>
        </Stage>
      )}

      {currentTool === 'generalization' && (
        <div
          className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 rounded-full border px-4 py-2 text-xs shadow-sm"
          style={{
            background: 'rgba(255, 255, 255, 0.95)',
            borderColor: 'var(--color-separator)',
            color: 'var(--color-text-primary)',
          }}
        >
          {pendingGeneralizationParent
            ? '已选择父 Type — 在画布空白处点击以放置容器（ESC 取消）'
            : '请先点击一个 Type 作为父类，然后在画布空白处点击以放置容器'}
        </div>
      )}
    </div>
  );
}
