import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type { DiagramElement, DiagramMetadata, TypeElement } from '@/models/diagram';
import { computeTypeBox } from '@/utils/geometry';
import { DEFAULT_TYPE_NAME } from '@/constants/defaults';

interface DiagramState {
  version: string;
  metadata: DiagramMetadata;
  elements: DiagramElement[];

  // Actions
  addTypeAt: (x: number, y: number, name?: string) => TypeElement;
  updateElement: (id: string, updates: Partial<DiagramElement>) => void;
  renameType: (id: string, name: string) => void;
  moveElement: (id: string, x: number, y: number) => void;
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

  updateElement: (id, updates) =>
    set((s) => ({
      elements: s.elements.map((el) =>
        el.id === id ? ({ ...el, ...updates } as DiagramElement) : el,
      ),
      metadata: { ...s.metadata, updatedAt: now() },
    })),

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
      elements: s.elements.map((el) =>
        el.id === id ? { ...el, layout: { ...el.layout, x, y } } : el,
      ),
      metadata: { ...s.metadata, updatedAt: now() },
    })),

  deleteElement: (id) =>
    set((s) => ({
      elements: s.elements.filter((el) => el.id !== id),
      metadata: { ...s.metadata, updatedAt: now() },
    })),

  clearAll: () =>
    set((s) => ({
      elements: [],
      metadata: { ...s.metadata, updatedAt: now() },
    })),
}));
