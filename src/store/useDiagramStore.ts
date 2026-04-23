import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type {
  CardinalityKind,
  DiagramElement,
  DiagramMetadata,
  GeneralizationElement,
  Layout,
  LongSemanticElement,
  LongSemanticHeading,
  PartitionCompleteness,
  RelationElement,
  ShortSemantic,
  TypeElement,
} from '@/models/diagram';
import { isGeneralization, isType } from '@/models/diagram';
import { computeTypeBox } from '@/utils/geometry';
import { DEFAULT_TYPE_NAME, GENERALIZATION } from '@/constants/defaults';
import { LONG_SEMANTIC } from '@/constants/longSemantic';

interface DiagramState {
  version: string;
  metadata: DiagramMetadata;
  elements: DiagramElement[];

  // Actions
  addTypeAt: (x: number, y: number, name?: string) => TypeElement;
  /** Create a Type at (x,y) and attach it as a child of `generalizationId`. */
  addChildTypeAt: (
    generalizationId: string,
    x: number,
    y: number,
    name?: string,
  ) => TypeElement | null;
  renameType: (id: string, name: string) => void;
  moveElement: (id: string, x: number, y: number) => void;

  addRelation: (sourceTypeId: string, targetTypeId: string) => RelationElement | null;
  setCardinality: (
    relationId: string,
    end: 'source' | 'target',
    kind: CardinalityKind,
    range?: [number, number | null],
  ) => void;

  addGeneralizationAt: (
    parentTypeId: string,
    x: number,
    y: number,
  ) => GeneralizationElement | null;
  setGeneralizationCompleteness: (
    generalizationId: string,
    completeness: PartitionCompleteness,
  ) => void;
  /** Translate a container and all its child Types by (dx, dy). */
  moveGeneralizationBy: (generalizationId: string, dx: number, dy: number) => void;
  /** Attach `typeId` as a child of `generalizationId` (removing from any previous container). */
  attachTypeToGeneralization: (typeId: string, generalizationId: string) => void;
  /** Detach `typeId` from whatever container currently owns it (no-op if free). */
  detachTypeFromGeneralization: (typeId: string) => void;

  deleteElement: (id: string) => void;
  deleteElements: (ids: string[]) => void;
  clearAll: () => void;

  /** Append a short-semantic marker to a Type's semantics. */
  addTypeSemantic: (typeId: string, marker: ShortSemantic) => void;
  /** Remove a marker from a Type by index. */
  removeTypeSemantic: (typeId: string, index: number) => void;
  /** Append a marker to one end (mapping) of a relation. */
  addRelationMappingSemantic: (
    relationId: string,
    end: 'source' | 'target',
    marker: ShortSemantic,
  ) => void;
  /** Remove a marker from one end of a relation by index. */
  removeRelationMappingSemantic: (
    relationId: string,
    end: 'source' | 'target',
    index: number,
  ) => void;
  /** Append a marker to the association (whole relation line). */
  addRelationAssociationSemantic: (relationId: string, marker: ShortSemantic) => void;
  /** Remove a marker from the association by index. */
  removeRelationAssociationSemantic: (relationId: string, index: number) => void;

  /**
   * Create a long-semantic sticky note at (x, y). If `attachedTo` is given
   * and references a live Type or Relation, the note starts attached; the
   * dashed connector is computed on render.
   */
  addLongSemanticAt: (
    x: number,
    y: number,
    options?: { attachedTo?: string; heading?: LongSemanticHeading; body?: string },
  ) => LongSemanticElement;
  setLongSemanticHeading: (id: string, heading: LongSemanticHeading) => void;
  setLongSemanticBody: (id: string, body: string) => void;
  setLongSemanticAttachment: (id: string, attachedTo: string | null) => void;

  /**
   * Bulk-replace persistent state. Used by file-load and undo/redo.
   * Does NOT bump updatedAt — caller supplies metadata as-is.
   */
  replaceContent: (content: {
    version: string;
    metadata: DiagramMetadata;
    elements: DiagramElement[];
  }) => void;

  /** Update just the diagram title (bumps updatedAt). */
  setTitle: (title: string) => void;
}

const now = () => Date.now();

/**
 * Recompute a container's layout to tightly wrap its children.
 * When a container has no children, keep its current position and reset to default size.
 */
function recomputeContainerLayout(
  gen: GeneralizationElement,
  typesById: Map<string, TypeElement>,
): GeneralizationElement {
  const children = gen.childTypeIds
    .map((id) => typesById.get(id))
    .filter((t): t is TypeElement => !!t);

  if (children.length === 0) {
    return {
      ...gen,
      layout: {
        ...gen.layout,
        width: GENERALIZATION.defaultWidth,
        height: GENERALIZATION.defaultHeight,
      },
    };
  }

  const minX = Math.min(...children.map((c) => c.layout.x));
  const minY = Math.min(...children.map((c) => c.layout.y));
  const maxX = Math.max(...children.map((c) => c.layout.x + c.layout.width));
  const maxY = Math.max(...children.map((c) => c.layout.y + c.layout.height));

  return {
    ...gen,
    layout: {
      x: minX - GENERALIZATION.paddingX,
      y: minY - GENERALIZATION.paddingY,
      width: maxX - minX + GENERALIZATION.paddingX * 2,
      height: maxY - minY + GENERALIZATION.paddingY * 2,
    },
  };
}

/** Recompute every container's layout based on current Type positions. */
function recomputeAllContainers(elements: DiagramElement[]): DiagramElement[] {
  const typesById = new Map(
    elements.filter(isType).map((t) => [t.id, t] as const),
  );
  return elements.map((el) =>
    isGeneralization(el) ? recomputeContainerLayout(el, typesById) : el,
  );
}

/** Return the container (if any) that currently owns `typeId`. */
function findContainerOfType(elements: DiagramElement[], typeId: string) {
  return elements.filter(isGeneralization).find((g) => g.childTypeIds.includes(typeId)) ?? null;
}

export const useDiagramStore = create<DiagramState>((set) => ({
  version: '1.0',
  metadata: {
    title: 'Untitled',
    createdAt: now(),
    updatedAt: now(),
  },
  elements: [],

  addTypeAt: (x, y, name = DEFAULT_TYPE_NAME) => {
    const { width, height } = computeTypeBox(name);
    const element: TypeElement = {
      id: `type-${nanoid(8)}`,
      type: 'type',
      name,
      semantics: [],
      layout: {
        x: x - width / 2,
        y: y - height / 2,
        width,
        height,
      },
    };
    set((s) => ({
      elements: [...s.elements, element],
      metadata: { ...s.metadata, updatedAt: now() },
    }));
    return element;
  },

  addChildTypeAt: (generalizationId, x, y, name = DEFAULT_TYPE_NAME) => {
    const { width, height } = computeTypeBox(name);
    const typeEl: TypeElement = {
      id: `type-${nanoid(8)}`,
      type: 'type',
      name,
      semantics: [],
      layout: {
        x: x - width / 2,
        y: y - height / 2,
        width,
        height,
      },
    };
    let created = false;
    set((s) => {
      const container = s.elements.find(
        (e): e is GeneralizationElement =>
          e.type === 'generalization' && e.id === generalizationId,
      );
      if (!container) return s;
      created = true;
      const nextElements: DiagramElement[] = [
        ...s.elements.map((el) => {
          if (el.id === generalizationId && el.type === 'generalization') {
            return { ...el, childTypeIds: [...el.childTypeIds, typeEl.id] };
          }
          return el;
        }),
        typeEl,
      ];
      return {
        elements: recomputeAllContainers(nextElements),
        metadata: { ...s.metadata, updatedAt: now() },
      };
    });
    return created ? typeEl : null;
  },

  renameType: (id, name) =>
    set((s) => {
      const next = s.elements.map((el) => {
        if (el.id !== id || el.type !== 'type') return el;
        const { width, height } = computeTypeBox(name);
        return {
          ...el,
          name,
          layout: { ...el.layout, width, height },
        };
      });
      return {
        elements: recomputeAllContainers(next),
        metadata: { ...s.metadata, updatedAt: now() },
      };
    }),

  moveElement: (id, x, y) =>
    set((s) => {
      const next = s.elements.map((el) => {
        if (el.id !== id) return el;
        if (el.type === 'type' || el.type === 'longSemantic') {
          return { ...el, layout: { ...el.layout, x, y } };
        }
        return el;
      });
      return {
        elements: recomputeAllContainers(next),
        metadata: { ...s.metadata, updatedAt: now() },
      };
    }),

  addRelation: (sourceTypeId, targetTypeId) => {
    if (sourceTypeId === targetTypeId) return null;
    const relation: RelationElement = {
      id: `rel-${nanoid(8)}`,
      type: 'relation',
      source: { typeId: sourceTypeId, cardinality: 'exactly_one' },
      target: { typeId: targetTypeId, cardinality: 'exactly_one' },
      isDerived: false,
    };
    set((s) => ({
      elements: [...s.elements, relation],
      metadata: { ...s.metadata, updatedAt: now() },
    }));
    return relation;
  },

  setCardinality: (relationId, end, kind, range) =>
    set((s) => ({
      elements: s.elements.map((el) => {
        if (el.id !== relationId || el.type !== 'relation') return el;
        const nextRange =
          kind === 'two_or_more'
            ? [range?.[0] ?? 2, null]
            : kind === 'range'
              ? [range?.[0] ?? 1, range?.[1] ?? (range?.[0] ?? 1) + 1]
              : undefined;
        const updatedEnd = {
          ...el[end],
          cardinality: kind,
          cardinalityRange: nextRange,
        };
        return { ...el, [end]: updatedEnd };
      }),
      metadata: { ...s.metadata, updatedAt: now() },
    })),

  addGeneralizationAt: (parentTypeId, x, y) => {
    const { defaultWidth, defaultHeight } = GENERALIZATION;
    const layout: Layout = {
      x: x - defaultWidth / 2,
      y: y - defaultHeight / 2,
      width: defaultWidth,
      height: defaultHeight,
    };
    const gen: GeneralizationElement = {
      id: `gen-${nanoid(8)}`,
      type: 'generalization',
      parentTypeId,
      childTypeIds: [],
      completeness: 'complete',
      layout,
    };
    let created = false;
    set((s) => {
      const parent = s.elements.find(
        (e): e is TypeElement => e.type === 'type' && e.id === parentTypeId,
      );
      if (!parent) return s;
      created = true;
      return {
        elements: [...s.elements, gen],
        metadata: { ...s.metadata, updatedAt: now() },
      };
    });
    return created ? gen : null;
  },

  setGeneralizationCompleteness: (generalizationId, completeness) =>
    set((s) => ({
      elements: s.elements.map((el) =>
        el.type === 'generalization' && el.id === generalizationId
          ? { ...el, completeness }
          : el,
      ),
      metadata: { ...s.metadata, updatedAt: now() },
    })),

  moveGeneralizationBy: (generalizationId, dx, dy) =>
    set((s) => {
      if (dx === 0 && dy === 0) return s;
      const container = s.elements.find(
        (e): e is GeneralizationElement =>
          e.type === 'generalization' && e.id === generalizationId,
      );
      if (!container) return s;
      const childSet = new Set(container.childTypeIds);
      const next = s.elements.map((el) => {
        if (el.type === 'type' && childSet.has(el.id)) {
          return {
            ...el,
            layout: { ...el.layout, x: el.layout.x + dx, y: el.layout.y + dy },
          };
        }
        if (el.type === 'generalization' && el.id === generalizationId) {
          return {
            ...el,
            layout: { ...el.layout, x: el.layout.x + dx, y: el.layout.y + dy },
          };
        }
        return el;
      });
      return {
        elements: next,
        metadata: { ...s.metadata, updatedAt: now() },
      };
    }),

  attachTypeToGeneralization: (typeId, generalizationId) =>
    set((s) => {
      const targetExists = s.elements.some(
        (e) => e.type === 'generalization' && e.id === generalizationId,
      );
      if (!targetExists) return s;
      const next: DiagramElement[] = s.elements.map((el) => {
        if (el.type !== 'generalization') return el;
        if (el.id === generalizationId) {
          if (el.childTypeIds.includes(typeId)) return el;
          return { ...el, childTypeIds: [...el.childTypeIds, typeId] };
        }
        if (el.childTypeIds.includes(typeId)) {
          return { ...el, childTypeIds: el.childTypeIds.filter((cid) => cid !== typeId) };
        }
        return el;
      });
      return {
        elements: recomputeAllContainers(next),
        metadata: { ...s.metadata, updatedAt: now() },
      };
    }),

  detachTypeFromGeneralization: (typeId) =>
    set((s) => {
      const owner = findContainerOfType(s.elements, typeId);
      if (!owner) return s;
      const next: DiagramElement[] = s.elements.map((el) =>
        el.type === 'generalization' && el.id === owner.id
          ? { ...el, childTypeIds: el.childTypeIds.filter((cid) => cid !== typeId) }
          : el,
      );
      return {
        elements: recomputeAllContainers(next),
        metadata: { ...s.metadata, updatedAt: now() },
      };
    }),

  deleteElement: (id) =>
    set((s) => {
      // Mirror the bulk path: cascade relations + generalizations (children freed).
      const remaining = cascadeDelete(s.elements, new Set([id]));
      return {
        elements: recomputeAllContainers(remaining),
        metadata: { ...s.metadata, updatedAt: now() },
      };
    }),

  deleteElements: (ids) =>
    set((s) => {
      const remaining = cascadeDelete(s.elements, new Set(ids));
      return {
        elements: recomputeAllContainers(remaining),
        metadata: { ...s.metadata, updatedAt: now() },
      };
    }),

  clearAll: () =>
    set((s) => ({
      elements: [],
      metadata: { ...s.metadata, updatedAt: now() },
    })),

  addTypeSemantic: (typeId, marker) =>
    set((s) => ({
      elements: s.elements.map((el) =>
        el.id === typeId && el.type === 'type'
          ? { ...el, semantics: [...(el.semantics ?? []), marker] }
          : el,
      ),
      metadata: { ...s.metadata, updatedAt: now() },
    })),

  removeTypeSemantic: (typeId, index) =>
    set((s) => ({
      elements: s.elements.map((el) => {
        if (el.id !== typeId || el.type !== 'type') return el;
        const list = el.semantics ?? [];
        if (index < 0 || index >= list.length) return el;
        return { ...el, semantics: list.filter((_, i) => i !== index) };
      }),
      metadata: { ...s.metadata, updatedAt: now() },
    })),

  addRelationMappingSemantic: (relationId, end, marker) =>
    set((s) => ({
      elements: s.elements.map((el) => {
        if (el.id !== relationId || el.type !== 'relation') return el;
        const endEl = el[end];
        return {
          ...el,
          [end]: { ...endEl, semantics: [...(endEl.semantics ?? []), marker] },
        };
      }),
      metadata: { ...s.metadata, updatedAt: now() },
    })),

  removeRelationMappingSemantic: (relationId, end, index) =>
    set((s) => ({
      elements: s.elements.map((el) => {
        if (el.id !== relationId || el.type !== 'relation') return el;
        const endEl = el[end];
        const list = endEl.semantics ?? [];
        if (index < 0 || index >= list.length) return el;
        return {
          ...el,
          [end]: { ...endEl, semantics: list.filter((_, i) => i !== index) },
        };
      }),
      metadata: { ...s.metadata, updatedAt: now() },
    })),

  addRelationAssociationSemantic: (relationId, marker) =>
    set((s) => ({
      elements: s.elements.map((el) =>
        el.id === relationId && el.type === 'relation'
          ? {
              ...el,
              associationSemantics: [...(el.associationSemantics ?? []), marker],
            }
          : el,
      ),
      metadata: { ...s.metadata, updatedAt: now() },
    })),

  removeRelationAssociationSemantic: (relationId, index) =>
    set((s) => ({
      elements: s.elements.map((el) => {
        if (el.id !== relationId || el.type !== 'relation') return el;
        const list = el.associationSemantics ?? [];
        if (index < 0 || index >= list.length) return el;
        return { ...el, associationSemantics: list.filter((_, i) => i !== index) };
      }),
      metadata: { ...s.metadata, updatedAt: now() },
    })),

  addLongSemanticAt: (x, y, options) => {
    // Validate attachedTo: must reference a Type or Relation currently in the
    // diagram. Anything else (including the note's own id, or a generalization)
    // is silently dropped to free-floating.
    const note: LongSemanticElement = {
      id: `note-${nanoid(8)}`,
      type: 'longSemantic',
      heading: options?.heading ?? 'note',
      body: options?.body ?? '',
      layout: {
        x,
        y,
        width: LONG_SEMANTIC.defaultWidth,
        height: LONG_SEMANTIC.defaultHeight,
      },
    };
    set((s) => {
      if (options?.attachedTo) {
        const host = s.elements.find((e) => e.id === options.attachedTo);
        if (host && (host.type === 'type' || host.type === 'relation')) {
          note.attachedTo = host.id;
        }
      }
      return {
        elements: [...s.elements, note],
        metadata: { ...s.metadata, updatedAt: now() },
      };
    });
    return note;
  },

  setLongSemanticHeading: (id, heading) =>
    set((s) => ({
      elements: s.elements.map((el) =>
        el.id === id && el.type === 'longSemantic' ? { ...el, heading } : el,
      ),
      metadata: { ...s.metadata, updatedAt: now() },
    })),

  setLongSemanticBody: (id, body) =>
    set((s) => ({
      elements: s.elements.map((el) =>
        el.id === id && el.type === 'longSemantic' ? { ...el, body } : el,
      ),
      metadata: { ...s.metadata, updatedAt: now() },
    })),

  setLongSemanticAttachment: (id, attachedTo) =>
    set((s) => {
      // Normalize: null or missing host → free-floating; a note cannot
      // attach to itself or to a non-existent element.
      let nextAttached: string | undefined;
      if (attachedTo) {
        const host = s.elements.find((e) => e.id === attachedTo);
        if (host && host.id !== id && (host.type === 'type' || host.type === 'relation')) {
          nextAttached = host.id;
        }
      }
      return {
        elements: s.elements.map((el) => {
          if (el.id !== id || el.type !== 'longSemantic') return el;
          if (nextAttached === undefined) {
            const { attachedTo: _, ...rest } = el;
            return rest as LongSemanticElement;
          }
          return { ...el, attachedTo: nextAttached };
        }),
        metadata: { ...s.metadata, updatedAt: now() },
      };
    }),

  replaceContent: (content) =>
    set(() => ({
      version: content.version,
      metadata: { ...content.metadata },
      elements: content.elements,
    })),

  setTitle: (title) =>
    set((s) => ({ metadata: { ...s.metadata, title, updatedAt: now() } })),
}));

/**
 * Cascade deletion rules:
 * - Deleting a Type → cascade delete every relation that touches it, and
 *   every generalization whose parentTypeId == it (container lost its parent).
 * - Deleting a generalization → its children are FREED (kept as free Types),
 *   only the container itself is removed.
 * - When a Type is deleted but its container survives, remove it from that
 *   container's childTypeIds (caller should recompute container layout).
 * - Long-semantic notes attached to a deleted host are NOT deleted; they
 *   are demoted to unattached (free floating) instead.
 */
function cascadeDelete(elements: DiagramElement[], idsToDelete: Set<string>): DiagramElement[] {
  const deletedTypeIds = new Set(
    elements.filter((e) => e.type === 'type' && idsToDelete.has(e.id)).map((e) => e.id),
  );
  // Any generalization whose parent is being deleted is also removed.
  for (const el of elements) {
    if (el.type === 'generalization' && deletedTypeIds.has(el.parentTypeId)) {
      idsToDelete.add(el.id);
    }
  }
  // Collect ids that will disappear after this pass so attached notes can be
  // demoted correctly. This includes explicit deletions plus relations that
  // get cascade-removed because one of their endpoint Types is deleted.
  const disappearingIds = new Set<string>(idsToDelete);
  for (const el of elements) {
    if (
      el.type === 'relation' &&
      (deletedTypeIds.has(el.source.typeId) || deletedTypeIds.has(el.target.typeId))
    ) {
      disappearingIds.add(el.id);
    }
  }
  return elements
    .filter((el) => {
      if (idsToDelete.has(el.id)) return false;
      if (
        el.type === 'relation' &&
        (deletedTypeIds.has(el.source.typeId) || deletedTypeIds.has(el.target.typeId))
      ) {
        return false;
      }
      return true;
    })
    .map((el) => {
      if (el.type === 'generalization' && deletedTypeIds.size > 0) {
        return {
          ...el,
          childTypeIds: el.childTypeIds.filter((cid) => !deletedTypeIds.has(cid)),
        };
      }
      if (
        el.type === 'longSemantic' &&
        el.attachedTo &&
        disappearingIds.has(el.attachedTo)
      ) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { attachedTo: _discard, ...rest } = el;
        return rest as LongSemanticElement;
      }
      return el;
    });
}

