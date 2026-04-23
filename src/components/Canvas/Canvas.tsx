import { useEffect, useRef, useState } from 'react';
import { Circle, Group, Layer, Line, Rect, Stage } from 'react-konva';
import type Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import { useDiagramStore } from '@/store/useDiagramStore';
import { useEditorStore } from '@/store/useEditorStore';
import { CANVAS, GRID } from '@/constants/defaults';
import { LONG_SEMANTIC } from '@/constants/longSemantic';
import {
  isGeneralization,
  isLongSemantic,
  isRelation,
  isType,
  type GeneralizationElement,
  type LongSemanticElement,
  type ShortSemantic,
  type TypeElement,
} from '@/models/diagram';
import { routeOrthogonal, type Point, type RoutingResult, type Side } from '@/utils/routing';
import { computeNoteConnector } from '@/utils/noteConnector';
import { registerStage } from '@/utils/exportStage';
import {
  SEMANTIC_CATALOG,
  isMultivalued,
  type SemanticCatalogEntry,
  type SemanticScope,
} from '@/constants/semantics';
import { TypeNode } from './TypeNode';
import { RelationLine } from './RelationLine';
import { GeneralizationBox } from './GeneralizationBox';
import { StickyNote } from './StickyNote';

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

/** Midpoint along a Konva polyline (flat [x1,y1,x2,y2,...] form). */
function polylineMid(points: number[]): Point {
  if (points.length < 4) return { x: 0, y: 0 };
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
  return { x: x1 + (x2 - x1) * t, y: y1 + (y2 - y1) * t };
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}

export function Canvas() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<Konva.Stage | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  /**
   * Ephemeral position overrides while a Type is being dragged, so relation
   * lines can follow the moving node in real time (ME-018) without writing
   * to the store on every mousemove.
   */
  const [dragPos, setDragPos] = useState<Record<string, { x: number; y: number }>>({});
  const [spacePressed, setSpacePressed] = useState(false);
  const [altPressed, setAltPressed] = useState(false);
  const [panSession, setPanSession] = useState<{
    start: Point;
    origin: { x: number; y: number };
  } | null>(null);
  const [marquee, setMarquee] = useState<{ start: Point; current: Point } | null>(null);
  /**
   * Short-semantic picker popup. `target` records what was clicked; `x/y` are
   * container-relative pointer coords for positioning the HTML overlay; for
   * relations, `endChoice` lets the user first pick which scope to edit.
   */
  const [semanticPicker, setSemanticPicker] = useState<
    | {
        x: number;
        y: number;
        target:
          | { kind: 'type'; id: string }
          | { kind: 'relation'; id: string; endChoice: 'source' | 'target' | 'association' | null };
      }
    | null
  >(null);

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
  const addTypeSemantic = useDiagramStore((s) => s.addTypeSemantic);
  const addRelationMappingSemantic = useDiagramStore((s) => s.addRelationMappingSemantic);
  const addRelationAssociationSemantic = useDiagramStore((s) => s.addRelationAssociationSemantic);
  const addLongSemanticAt = useDiagramStore((s) => s.addLongSemanticAt);

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
  const showGrid = useEditorStore((s) => s.showGrid);
  const snapToGrid = useEditorStore((s) => s.snapToGrid);

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

  // Register the Konva stage with the module-level singleton so toolbar
  // export actions (PNG) can reach it without prop drilling.
  useEffect(() => {
    registerStage(stageRef.current);
    return () => registerStage(null);
  }, [size.width, size.height]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space' && !isEditableTarget(event.target)) {
        event.preventDefault();
        setSpacePressed(true);
      }

      if (event.altKey) setAltPressed(true);

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
      if (!event.altKey) setAltPressed(false);
    };
    const handleBlur = () => {
      setSpacePressed(false);
      setAltPressed(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [deleteElements, deselectAll, selectedIds, setHovered, setTool]);

  useEffect(() => {
    if (currentTool !== 'shortSemantic') setSemanticPicker(null);
  }, [currentTool]);

  const toWorldPoint = (point: Point): Point => ({
    x: (point.x - viewport.x) / viewport.scale,
    y: (point.y - viewport.y) / viewport.scale,
  });

  const applyDrag = (el: TypeElement): TypeElement => {
    const override = dragPos[el.id];
    if (!override) return el;
    return { ...el, layout: { ...el.layout, x: override.x, y: override.y } };
  };

  const applyDragNote = (el: LongSemanticElement): LongSemanticElement => {
    const override = dragPos[el.id];
    if (!override) return el;
    return { ...el, layout: { ...el.layout, x: override.x, y: override.y } };
  };

  const types = elements.filter(isType).map(applyDrag);
  const typesById = new Map(types.map((t) => [t.id, t]));
  const relations = elements.filter(isRelation);
  const generalizations = elements.filter(isGeneralization);
  const longSemantics = elements.filter(isLongSemantic);
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

    if (currentTool === 'longSemantic') {
      // Empty-canvas click creates an unattached sticky note centered at the
      // pointer. Switching back to select mirrors the Type-tool flow.
      const created = addLongSemanticAt(
        worldPointer.x - LONG_SEMANTIC.defaultWidth / 2,
        worldPointer.y - LONG_SEMANTIC.defaultHeight / 2,
      );
      setTool('select');
      select(created.id);
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

  /** Open the short-semantic picker at the current pointer position. */
  const openSemanticPickerFor = (
    target:
      | { kind: 'type'; id: string }
      | { kind: 'relation'; id: string; endChoice: 'source' | 'target' | 'association' | null },
  ) => {
    const pointer = stageRef.current?.getPointerPosition();
    if (!pointer) return;
    setSemanticPicker({ x: pointer.x, y: pointer.y, target });
  };

  const handleTypeDragSettled = (typeId: string, x: number, y: number) => {
    // Snap to grid (bypassed with Alt) before committing the move.
    const { x: sx, y: sy } = snapPoint(x, y);
    // Commit the move first so the store has fresh coordinates.
    moveElement(typeId, sx, sy);

    const center: Point = {
      x: sx + (typesById.get(typeId)?.layout.width ?? 0) / 2,
      y: sy + (typesById.get(typeId)?.layout.height ?? 0) / 2,
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
        : currentTool === 'type' ||
            currentTool === 'relation' ||
            currentTool === 'generalization' ||
            currentTool === 'shortSemantic' ||
            currentTool === 'longSemantic'
          ? 'crosshair'
          : 'default';
  const typesDraggable = currentTool === 'select' && !spacePressed && !panSession;

  /**
   * Snap a world-space coordinate to the grid when grid-snapping is on.
   * Hold Alt to temporarily bypass snapping. Pass already-world coords.
   */
  const snap = (v: number): number => {
    if (!snapToGrid || altPressed) return v;
    return Math.round(v / GRID.size) * GRID.size;
  };
  const snapPoint = (x: number, y: number) => ({ x: snap(x), y: snap(y) });

  /**
   * Grid dot positions covering the current visible area of the stage,
   * extended to also cover the diagram's content bbox. The bbox extension
   * matters for PNG export: the exporter temporarily resets pan/zoom to
   * snapshot the full content, and without the bbox union the grid would
   * only appear over whatever was visible on-screen before export.
   */
  const gridDots = (() => {
    if (!showGrid || size.width === 0 || size.height === 0) return null;
    const step = GRID.size;

    // Visible viewport in world space.
    const viewLeft = -viewport.x / viewport.scale;
    const viewTop = -viewport.y / viewport.scale;
    const viewRight = viewLeft + size.width / viewport.scale;
    const viewBottom = viewTop + size.height / viewport.scale;

    // Content bbox across all positioned elements.
    let bboxLeft = Infinity;
    let bboxTop = Infinity;
    let bboxRight = -Infinity;
    let bboxBottom = -Infinity;
    for (const el of elements) {
      if (isRelation(el)) continue;
      const { x, y, width, height } = el.layout;
      bboxLeft = Math.min(bboxLeft, x);
      bboxTop = Math.min(bboxTop, y);
      bboxRight = Math.max(bboxRight, x + width);
      bboxBottom = Math.max(bboxBottom, y + height);
    }

    // Union of viewport and bbox (margin so dots don't butt against edges).
    const margin = 40;
    const left = Math.min(viewLeft, isFinite(bboxLeft) ? bboxLeft - margin : viewLeft);
    const top = Math.min(viewTop, isFinite(bboxTop) ? bboxTop - margin : viewTop);
    const right = Math.max(
      viewRight,
      isFinite(bboxRight) ? bboxRight + margin : viewRight,
    );
    const bottom = Math.max(
      viewBottom,
      isFinite(bboxBottom) ? bboxBottom + margin : viewBottom,
    );

    const startX = Math.floor(left / step) * step;
    const startY = Math.floor(top / step) * step;
    const cols = Math.ceil((right - startX) / step) + 1;
    const rows = Math.ceil((bottom - startY) / step) + 1;

    // Hard cap on dot count to keep rendering cheap when extreme zoom-out
    // combined with a huge bbox would otherwise generate hundreds of
    // thousands of circles.
    const MAX_DOTS = 20000;
    if (cols * rows > MAX_DOTS) {
      // Fall back to viewport-only when the union would be too large; the
      // user is zoomed far out and dots at GRID.size would be invisible
      // anyway. PNG export in this regime already covers the bbox via the
      // exporter's own margin.
      const startVX = Math.floor(viewLeft / step) * step;
      const startVY = Math.floor(viewTop / step) * step;
      const dots: { x: number; y: number }[] = [];
      for (let x = startVX; x <= viewRight; x += step) {
        for (let y = startVY; y <= viewBottom; y += step) {
          dots.push({ x, y });
        }
      }
      return dots;
    }

    const dots: { x: number; y: number }[] = [];
    for (let i = 0; i < cols; i += 1) {
      for (let j = 0; j < rows; j += 1) {
        dots.push({ x: startX + i * step, y: startY + j * step });
      }
    }
    return dots;
  })();

  return (
    <div
      ref={containerRef}
      className="relative flex-1 overflow-hidden"
      style={{ background: CANVAS.background, cursor: containerCursor }}
    >
      {size.width > 0 && size.height > 0 && (
        <Stage
          ref={stageRef}
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

          {/* Grid layer — dot grid at every GRID.size world-space intersection. */}
          {gridDots && (
            <Layer listening={false}>
              <Group x={viewport.x} y={viewport.y} scaleX={viewport.scale} scaleY={viewport.scale}>
                {gridDots.map((d) => (
                  <Circle
                    key={`${d.x},${d.y}`}
                    x={d.x}
                    y={d.y}
                    radius={GRID.dotRadius / viewport.scale}
                    fill={GRID.dotColor}
                  />
                ))}
              </Group>
            </Layer>
          )}

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
                  onDragEnd={(dx, dy) => {
                    // Snap final top-left corner to the grid (bypassed with Alt).
                    const targetX = gen.layout.x + dx;
                    const targetY = gen.layout.y + dy;
                    const { x: sx, y: sy } = snapPoint(targetX, targetY);
                    moveGeneralizationBy(gen.id, sx - gen.layout.x, sy - gen.layout.y);
                  }}
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
                      else if (currentTool === 'shortSemantic') {
                        select(relation.id);
                        openSemanticPickerFor({
                          kind: 'relation',
                          id: relation.id,
                          endChoice: null,
                        });
                      } else if (currentTool === 'longSemantic') {
                        // Create a note near the relation midpoint, attached.
                        const mid = polylineMid(route.points);
                        const created = addLongSemanticAt(
                          mid.x - LONG_SEMANTIC.defaultWidth / 2,
                          mid.y + 40,
                          { attachedTo: relation.id },
                        );
                        setTool('select');
                        select(created.id);
                      }
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
                    } else if (currentTool === 'shortSemantic') {
                      select(el.id);
                      openSemanticPickerFor({ kind: 'type', id: el.id });
                    } else if (currentTool === 'longSemantic') {
                      // Attach a sticky note below the Type by default.
                      const created = addLongSemanticAt(
                        el.layout.x + el.layout.width / 2 - LONG_SEMANTIC.defaultWidth / 2,
                        el.layout.y + el.layout.height + 40,
                        { attachedTo: el.id, heading: 'constraint' },
                      );
                      setTool('select');
                      select(created.id);
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

          {/* Long-semantic layer: notes + dashed connectors to their hosts. */}
          <Layer>
            <Group x={viewport.x} y={viewport.y} scaleX={viewport.scale} scaleY={viewport.scale}>
              {longSemantics.map((note) => {
                const applied = applyDragNote(note);
                const connector = computeNoteConnector(applied, elements);
                return (
                  <Group key={note.id}>
                    {connector && (
                      <Line
                        points={[
                          connector.from.x,
                          connector.from.y,
                          connector.to.x,
                          connector.to.y,
                        ]}
                        stroke={LONG_SEMANTIC.connectorStroke}
                        strokeWidth={1}
                        dash={[LONG_SEMANTIC.connectorDash[0], LONG_SEMANTIC.connectorDash[1]]}
                        listening={false}
                      />
                    )}
                    <StickyNote
                      element={applied}
                      selected={selectedIds.includes(note.id)}
                      hovered={hoveredId === note.id}
                      panModeActive={spacePressed}
                      draggable={typesDraggable}
                      onSelect={() => {
                        if (currentTool === 'select' || currentTool === 'longSemantic') {
                          select(note.id);
                        }
                      }}
                      onHoverChange={(h) => setHovered(h ? note.id : null)}
                      onDragMove={(x, y) =>
                        setDragPos((prev) => ({ ...prev, [note.id]: { x, y } }))
                      }
                      onDragEnd={(x, y) => {
                        const { x: sx, y: sy } = snapPoint(x, y);
                        moveElement(note.id, sx, sy);
                        setDragPos((prev) => {
                          const next = { ...prev };
                          delete next[note.id];
                          return next;
                        });
                      }}
                    />
                  </Group>
                );
              })}
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

      {currentTool === 'shortSemantic' && !semanticPicker && (
        <div
          className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 rounded-full border px-4 py-2 text-xs shadow-sm"
          style={{
            background: 'rgba(255, 255, 255, 0.95)',
            borderColor: 'var(--color-separator)',
            color: 'var(--color-text-primary)',
          }}
        >
          点击 Type 或 Relation 以添加短语义标记（ESC 退出）
        </div>
      )}

      {currentTool === 'longSemantic' && (
        <div
          className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 rounded-full border px-4 py-2 text-xs shadow-sm"
          style={{
            background: 'rgba(255, 255, 255, 0.95)',
            borderColor: 'var(--color-separator)',
            color: 'var(--color-text-primary)',
          }}
        >
          点击 Type / Relation 附着长语义便签；点空白处创建游离便签（ESC 退出）
        </div>
      )}

      {semanticPicker && (
        <SemanticPickerPopup
          state={semanticPicker}
          elements={elements}
          onClose={() => setSemanticPicker(null)}
          onPickType={(marker) => {
            if (semanticPicker.target.kind !== 'type') return;
            addTypeSemantic(semanticPicker.target.id, marker);
            setSemanticPicker(null);
          }}
          onPickRelationMapping={(end, marker) => {
            if (semanticPicker.target.kind !== 'relation') return;
            addRelationMappingSemantic(semanticPicker.target.id, end, marker);
            setSemanticPicker(null);
          }}
          onPickRelationAssociation={(marker) => {
            if (semanticPicker.target.kind !== 'relation') return;
            addRelationAssociationSemantic(semanticPicker.target.id, marker);
            setSemanticPicker(null);
          }}
          onChooseScope={(scope) => {
            setSemanticPicker((s) =>
              s && s.target.kind === 'relation'
                ? { ...s, target: { ...s.target, endChoice: scope } }
                : s,
            );
          }}
        />
      )}
    </div>
  );
}

interface PickerState {
  x: number;
  y: number;
  target:
    | { kind: 'type'; id: string }
    | {
        kind: 'relation';
        id: string;
        endChoice: 'source' | 'target' | 'association' | null;
      };
}

/**
 * Floating picker for short-semantic markers. Anchored at the click pointer,
 * rendered as plain HTML over the canvas. Filters the marker catalog by
 * scope and by per-kind constraints (multivalued mapping / recursive relation
 * / duplicates). For relations, first shows a scope chooser; once the user
 * picks Source/Target/Association, it renders the filtered marker list.
 * Markers needing a parameter (key) render an inline text input.
 */
function SemanticPickerPopup({
  state,
  elements,
  onClose,
  onPickType,
  onPickRelationMapping,
  onPickRelationAssociation,
  onChooseScope,
}: {
  state: PickerState;
  elements: ReturnType<typeof useDiagramStore.getState>['elements'];
  onClose: () => void;
  onPickType: (marker: ShortSemantic) => void;
  onPickRelationMapping: (end: 'source' | 'target', marker: ShortSemantic) => void;
  onPickRelationAssociation: (marker: ShortSemantic) => void;
  onChooseScope: (scope: 'source' | 'target' | 'association') => void;
}) {
  const { target } = state;
  const element = elements.find((e) => e.id === target.id) ?? null;
  const [pendingKey, setPendingKey] = useState<SemanticCatalogEntry | null>(null);
  const [keyInput, setKeyInput] = useState('');

  if (!element) return null;

  // Build (scope, existing-kinds, multivalued, recursive) based on target.
  let scope: SemanticScope | null = null;
  let existingKinds = new Set<string>();
  let multivalued = false;
  let recursive = false;

  if (target.kind === 'type' && element.type === 'type') {
    scope = 'type';
    existingKinds = new Set((element.semantics ?? []).map((m) => m.kind));
  } else if (target.kind === 'relation' && element.type === 'relation') {
    recursive = element.source.typeId === element.target.typeId;
    if (target.endChoice === 'source') {
      scope = 'mapping';
      existingKinds = new Set((element.source.semantics ?? []).map((m) => m.kind));
      multivalued = isMultivalued(element.source.cardinality);
    } else if (target.endChoice === 'target') {
      scope = 'mapping';
      existingKinds = new Set((element.target.semantics ?? []).map((m) => m.kind));
      multivalued = isMultivalued(element.target.cardinality);
    } else if (target.endChoice === 'association') {
      scope = 'association';
      existingKinds = new Set(
        (element.associationSemantics ?? []).map((m) => m.kind),
      );
    }
  }

  const commit = (marker: ShortSemantic) => {
    if (target.kind === 'type') {
      onPickType(marker);
    } else if (target.kind === 'relation') {
      if (target.endChoice === 'source' || target.endChoice === 'target') {
        onPickRelationMapping(target.endChoice, marker);
      } else if (target.endChoice === 'association') {
        onPickRelationAssociation(marker);
      }
    }
  };

  const pickEntry = (entry: SemanticCatalogEntry) => {
    if (entry.needsParam) {
      setPendingKey(entry);
      setKeyInput('');
      return;
    }
    commit({ kind: entry.kind } as ShortSemantic);
  };

  const commitKey = () => {
    const trimmed = keyInput.trim();
    if (!trimmed || !pendingKey) return;
    commit({ kind: 'key', keyType: trimmed });
  };

  const available = scope
    ? SEMANTIC_CATALOG.filter((e) => {
        if (scope && !e.scopes.includes(scope)) return false;
        if (e.requiresMultivalued && !multivalued) return false;
        if (e.requiresRecursive && !recursive) return false;
        if (existingKinds.has(e.kind)) return false;
        return true;
      })
    : [];

  // Position so the popup doesn't overflow the canvas; simple clamp.
  const style: React.CSSProperties = {
    position: 'absolute',
    left: Math.max(8, state.x + 12),
    top: Math.max(8, state.y + 12),
    zIndex: 20,
    minWidth: 180,
    maxWidth: 240,
  };

  const relationScopeChooser =
    target.kind === 'relation' && target.endChoice === null ? (
      <div className="flex flex-col gap-1 p-1.5">
        <div
          className="px-2 py-1 text-[11px]"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          在 Relation 的哪个范围添加？
        </div>
        <button
          type="button"
          onClick={() => onChooseScope('source')}
          className="rounded-[6px] px-2 py-1.5 text-left text-xs transition-colors hover:bg-black/5"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Source 端 (mapping)
        </button>
        <button
          type="button"
          onClick={() => onChooseScope('target')}
          className="rounded-[6px] px-2 py-1.5 text-left text-xs transition-colors hover:bg-black/5"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Target 端 (mapping)
        </button>
        <button
          type="button"
          onClick={() => onChooseScope('association')}
          className="rounded-[6px] px-2 py-1.5 text-left text-xs transition-colors hover:bg-black/5"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Association
        </button>
      </div>
    ) : null;

  return (
    <>
      {/* click-catcher overlay to close on outside click */}
      <div
        className="absolute inset-0"
        style={{ zIndex: 15 }}
        onMouseDown={(e) => {
          e.stopPropagation();
          onClose();
        }}
      />
      <div
        className="rounded-[10px] border shadow-lg"
        style={{
          ...style,
          borderColor: 'var(--color-separator)',
          background: '#fff',
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {relationScopeChooser ?? (
          <div className="flex flex-col gap-0.5 p-1.5">
            {pendingKey ? (
              <div className="flex flex-col gap-1.5 p-1">
                <div
                  className="text-[11px]"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  key 的类型参数
                </div>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={keyInput}
                    onChange={(e) => setKeyInput(e.target.value)}
                    autoFocus
                    placeholder="CustomerId"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitKey();
                      else if (e.key === 'Escape') setPendingKey(null);
                    }}
                    className="flex-1 rounded-[6px] border px-2 py-1 text-xs outline-none"
                    style={{
                      borderColor: 'var(--color-separator)',
                      background: '#fff',
                    }}
                  />
                  <button
                    type="button"
                    onClick={commitKey}
                    className="rounded-[6px] px-2 py-1 text-xs text-white"
                    style={{ background: 'var(--color-accent-blue)' }}
                  >
                    确定
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div
                  className="px-2 py-1 text-[11px]"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {target.kind === 'relation' && target.endChoice
                    ? {
                        source: 'Source 端 (mapping)',
                        target: 'Target 端 (mapping)',
                        association: 'Association',
                      }[target.endChoice]
                    : 'Type 标记'}
                </div>
                {available.length === 0 && (
                  <div
                    className="px-2 py-2 text-xs"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    无可添加的标记
                  </div>
                )}
                {available.map((entry) => (
                  <button
                    key={entry.kind}
                    type="button"
                    onClick={() => pickEntry(entry)}
                    className="rounded-[6px] px-2 py-1.5 text-left text-xs transition-colors hover:bg-black/5"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    [{entry.label}]
                    {entry.needsParam && (
                      <span
                        className="ml-1 text-[10px]"
                        style={{ color: 'var(--color-text-secondary)' }}
                      >
                        需参数
                      </span>
                    )}
                  </button>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
}
