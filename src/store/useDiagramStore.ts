import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type {
  CardinalityKind,
  DiagramElement,
  DiagramMetadata,
  RelationElement,
  TypeElement,
} from '@/models/diagram';
import { computeTypeBox } from '@/utils/geometry';
import { DEFAULT_TYPE_NAME } from '@/constants/defaults';

interface DiagramState {
  version: string;
  metadata: DiagramMetadata;
  elements: DiagramElement[];

  // Actions
  addTypeAt: (x: number, y: number, name?: string) => TypeElement;
  renameType: (id: string, name: string) => void;
  moveElement: (id: string, x: number, y: number) => void;

  addRelation: (sourceTypeId: string, targetTypeId: string) => RelationElement | null;
  setCardinality: (
    relationId: string,
    end: 'source' | 'target',
    kind: CardinalityKind,
    range?: [number, number | null],
  ) => void;

  deleteElement: (id: string) => void;
  clearAll: () => void;
}

const now = () => Date.now();

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
        // Center the box on the click point
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

  renameType: (id, name) =>
    set((s) => ({
      elements: s.elements.map((el) => {
        if (el.id !== id || el.type !== 'type') return el;
        const { width, height } = computeTypeBox(name);
        return {
          ...el,
          name,
          layout: { ...el.layout, width, height },
        };
      }),
      metadata: { ...s.metadata, updatedAt: now() },
    })),

  moveElement: (id, x, y) =>
    set((s) => ({
      elements: s.elements.map((el) => {
        if (el.id !== id || el.type !== 'type') return el;
        return { ...el, layout: { ...el.layout, x, y } };
      }),
      metadata: { ...s.metadata, updatedAt: now() },
    })),

  addRelation: (sourceTypeId, targetTypeId) => {
    if (sourceTypeId === targetTypeId) return null;
    const relation: RelationElement = {
      id: `rel-${nanoid(8)}`,
      type: 'relation',
      source: { typeId: sourceTypeId, cardinality: 'exactly_one' },
      target: { typeId: targetTypeId, cardinality: 'exactly_one' },
      isDerived: false,
      semantics: [],
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

  deleteElement: (id) =>
    set((s) => ({
      // Cascade-delete relations connected to a deleted Type (ME-019 groundwork).
      elements: s.elements.filter((el) => {
        if (el.id === id) return false;
        if (
          el.type === 'relation' &&
          (el.source.typeId === id || el.target.typeId === id)
        )
          return false;
        return true;
      }),
      metadata: { ...s.metadata, updatedAt: now() },
    })),

  clearAll: () =>
    set((s) => ({
      elements: [],
      metadata: { ...s.metadata, updatedAt: now() },
    })),
}));

