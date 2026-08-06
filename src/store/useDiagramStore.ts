const now = () => Date.now();
// DiagramState 类型定义（与 store 结构一致）
export interface DiagramState {
  version: string;
  metadata: DiagramMetadata;
  elements: DiagramElement[];
  addTypeAt: (x: number, y: number, name?: string) => TypeElement;
  replaceContent: (content: { version: string; metadata: DiagramMetadata; elements: DiagramElement[] }) => void;
  setTitle: (title: string) => void;
  addChildTypeAt: (generalizationId: string, x: number, y: number, name?: string) => TypeElement | null;
  renameType: (id: string, name: string) => void;
  moveElement: (id: string, x: number, y: number) => void;
  addRelation: (sourceTypeId: string, targetTypeId: string) => RelationElement;
  setCardinality: (relationId: string, end: 'source' | 'target', kind: CardinalityKind, range?: [number, number]) =>
  addGeneralizationAt: (parentTypeId: string, x: number, y: number) => GeneralizationElement | null;
  setGeneralizationCompleteness: (generalizationId: string, completeness: PartitionCompleteness) => void;
  moveGeneralizationBy: (generalizationId: string, dx: number, dy: number) => void;
  attachTypeToGeneralization: (typeId: string, generalizationId: string) => void;
  detachTypeFromGeneralization: (typeId: string) => void;
  deleteElement: (id: string) => void;
  deleteElements: (ids: string[]) => void;
  clearAll: () => void;
  addTypeSemantic: (typeId: string, marker: ShortSemantic) => void;
  removeTypeSemantic: (typeId: string, index: number) => void;
  addRelationMappingSemantic: () => void;
  removeRelationMappingSemantic: () => void;
  addRelationAssociationSemantic: (relationId: string, marker: ShortSemantic) => void;
  removeRelationAssociationSemantic: (relationId: string, index: number) => void;
  addNoteAt: (x: number, y: number, options?: { heading?: LongSemanticHeading; content?: string; attachedTo?: string }) => NoteElement;
  setNoteHeading: (id: string, heading: LongSemanticHeading) => void;
  setNoteContent: (id: string, content: string) => void;
  setNoteAttachment: (id: string, attachedTo?: string) => void;
  ,addGeneralizationAt: (parentTypeId: string, x: number, y: number): GeneralizationElement | null => {
import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type {
  CardinalityKind,
  DiagramElement,
  DiagramMetadata,
  GeneralizationElement,
  Layout,
  NoteElement,
  LongSemanticHeading,
  RelationElement,
  ShortSemantic,
  TypeElement,
  PartitionCompleteness,
} from '@/models/diagram';
import { computeTypeBox, recomputeAllContainers, findContainerOfType } from '@/utils/geometry';
import { DEFAULT_TYPE_NAME, GENERALIZATION } from '@/constants/defaults';
import { LONG_SEMANTIC } from '@/constants/longSemantic';


// 递归删除元素及其依赖关系（如关系、子类型等）
function cascadeDelete(elements: DiagramElement[], idsToDelete: Set<string>): DiagramElement[] {
  let changed = false;
  const next = elements.filter((el) => {
    if (idsToDelete.has(el.id)) {
      changed = true;
      return false;
    }
    // 删除与被删元素相关的关系
    if (el.type === 'relation' && (idsToDelete.has(el.source.typeId) || idsToDelete.has(el.target.typeId))) {
      changed = true;
      return false;
    }
    // 删除与被删元素相关的 note
    if (el.type === 'note' && el.attachedTo && idsToDelete.has(el.attachedTo)) {
      changed = true;
      return false;
    }
    // 删除 generalization 的子类型
    if (el.type === 'generalization') {
      const filtered = el.childTypeIds.filter((id) => !idsToDelete.has(id));
      if (filtered.length !== el.childTypeIds.length) {
        changed = true;
        return { ...el, childTypeIds: filtered };
      }
    }
    return true;
  // end of store object
});
  // 若有变更，递归处理
  return changed ? cascadeDelete(next, idsToDelete) : next;
}
export const useDiagramStore = create<DiagramState>((set) => ({
  version: '1.0',
  metadata: {
    title: 'Untitled',
    createdAt: now(),
    updatedAt: now(),
  },
  elements: [],
  addTypeAt: (x: number, y: number, name: string = DEFAULT_TYPE_NAME): TypeElement => {
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
    set((s: DiagramState) => ({
      elements: [...s.elements, element],
      metadata: { ...s.metadata, updatedAt: now() },
    }));
    return element;
  },
  replaceContent: (content: { version: string; metadata: DiagramMetadata; elements: DiagramElement[] }): void =>
    set(() => ({
      version: '1.0',
      metadata: {
        title: 'Untitled',
        createdAt: now(),
        updatedAt: now(),
      }
  setCardinality: (relationId: string, end: 'source' | 'target', kind: CardinalityKind, range?: [number, number]) =>
    set((s: DiagramState) => ({
      elements: s.elements.map((el: DiagramElement) => {
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
  },
  addGeneralizationAt: (parentTypeId: string, x: number, y: number): GeneralizationElement | null => {
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
    set((s: DiagramState) => {
      const parent = s.elements.find(
        (e: DiagramElement): e is TypeElement => e.type === 'type' && e.id === parentTypeId,
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
  ,setGeneralizationCompleteness: (generalizationId: string, completeness: PartitionCompleteness) =>
    set((s: DiagramState) => ({
      elements: s.elements.map((el: DiagramElement) =>
        el.type === 'generalization' && el.id === generalizationId
          ? { ...el, completeness }
          : el,
      ),
      metadata: { ...s.metadata, updatedAt: now() },
    })),

  ,moveGeneralizationBy: (generalizationId: string, dx: number, dy: number) =>
    set((s: DiagramState) => {
      if (dx === 0 && dy === 0) return s;
      const container = s.elements.find(
        (e: DiagramElement): e is GeneralizationElement =>
          e.type === 'generalization' && e.id === generalizationId,
      );
      if (!container) return s;
      const childSet = new Set(container.childTypeIds);
      const next = s.elements.map((el: DiagramElement) => {
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

  ,attachTypeToGeneralization: (typeId: string, generalizationId: string) =>
    set((s: DiagramState) => {
      const targetExists = s.elements.some(
        (e: DiagramElement) => e.type === 'generalization' && e.id === generalizationId,
      );
      if (!targetExists) return s;
      const next: DiagramElement[] = s.elements.map((el: DiagramElement) => {
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

  ,detachTypeFromGeneralization: (typeId: string) =>
    set((s: DiagramState) => {
      const owner = findContainerOfType(s.elements, typeId);
      if (!owner) return s;
      const next: DiagramElement[] = s.elements.map((el: DiagramElement) =>
        el.type === 'generalization' && el.id === owner.id
          ? { ...el, childTypeIds: el.childTypeIds.filter((cid) => cid !== typeId) }
          : el,
      );
      return {
        elements: recomputeAllContainers(next),
        metadata: { ...s.metadata, updatedAt: now() },
      };
    }),

  ,deleteElement: (id: string) =>
    set((s: DiagramState) => {
      const remaining = cascadeDelete(s.elements, new Set([id]));
      return {
        elements: recomputeAllContainers(remaining),
        metadata: { ...s.metadata, updatedAt: now() },
      };
    }),

  ,deleteElements: (ids: string[]) =>
    set((s: DiagramState) => {
      const remaining = cascadeDelete(s.elements, new Set(ids));
      return {
        elements: recomputeAllContainers(remaining),
        metadata: { ...s.metadata, updatedAt: now() },
      };
    }),

  ,clearAll: () =>
    set((s: DiagramState) => ({
      elements: [],
      metadata: { ...s.metadata, updatedAt: now() },
    })),

  ,addTypeSemantic: (typeId: string, marker: ShortSemantic) =>
    set((s: DiagramState) => ({
      elements: s.elements.map((el: DiagramElement) =>
        el.id === typeId && el.type === 'type'
          ? { ...el, semantics: [...(el.semantics ?? []), marker] }
          : el,
      ),
      metadata: { ...s.metadata, updatedAt: now() },
    })),

  ,removeTypeSemantic: (typeId: string, index: number) =>
    set((s: DiagramState) => ({
      elements: s.elements.map((el: DiagramElement) => {
        if (el.id !== typeId || el.type !== 'type') return el;
        const list = el.semantics ?? [];
        if (index < 0 || index >= list.length) return el;
        return { ...el, semantics: list.filter((_: unknown, i: number) => i !== index) };
      }),
      metadata: { ...s.metadata, updatedAt: now() },
    })),

  ,addRelationMappingSemantic: () => {},
  ,removeRelationMappingSemantic: () => {},

  ,addRelationAssociationSemantic: (relationId: string, marker: ShortSemantic) =>
    set((s: DiagramState) => ({
      elements: s.elements.map((el: DiagramElement) =>
        el.id === relationId && el.type === 'relation'
          ? {
              ...el,
              semantics: [...(el.semantics ?? []), marker],
            }
          : el,
      ),
      metadata: { ...s.metadata, updatedAt: now() },
    })),

  ,removeRelationAssociationSemantic: (relationId: string, index: number) =>
    set((s: DiagramState) => ({
      elements: s.elements.map((el: DiagramElement) => {
        if (el.id !== relationId || el.type !== 'relation') return el;
        const list = el.semantics ?? [];
        if (index < 0 || index >= list.length) return el;
        return { ...el, semantics: list.filter((_: unknown, i: number) => i !== index) };
      }),
      metadata: { ...s.metadata, updatedAt: now() },
    })),

  ,addNoteAt: (x: number, y: number, options?: { heading?: LongSemanticHeading; content?: string; attachedTo?: string }): NoteElement => {
    const note: NoteElement = {
      id: `note-${nanoid(8)}`,
      type: 'note',
      heading: options?.heading ?? 'Note',
      content: options?.content ?? '',
      layout: {
        x,
        y,
        width: LONG_SEMANTIC.defaultWidth,
        height: LONG_SEMANTIC.defaultHeight,
      },
    };
    set((s: DiagramState) => {
      if (options?.attachedTo) {
        const host = s.elements.find((e: DiagramElement) => e.id === options.attachedTo);
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

  ,setNoteHeading: (id: string, heading: LongSemanticHeading) =>
    set((s: DiagramState) => ({
      elements: s.elements.map((el: DiagramElement) => {
        if (el.id === id && el.type === 'note') {
          return { ...el, heading } as NoteElement;
        }
        return el;
      }),
      metadata: { ...s.metadata, updatedAt: now() },
    })),

  ,setNoteContent: (id: string, content: string) =>
    set((s: DiagramState) => ({
      elements: s.elements.map((el: DiagramElement) => {
        if (el.id === id && el.type === 'note') {
          return { ...el, content } as NoteElement;
        }
        return el;
      }),
      metadata: { ...s.metadata, updatedAt: now() },
    })),

  ,setNoteAttachment: (id: string, attachedTo?: string) =>
    set((s: DiagramState) => {
      let nextAttached: string | undefined;
      if (attachedTo) {
        const host = s.elements.find((e: DiagramElement) => e.id === attachedTo);
        if (host && host.id !== id && (host.type === 'type' || host.type === 'relation')) {
          nextAttached = host.id;
        }
      }
      return {
        elements: s.elements.map((el: DiagramElement) => {
          if (el.id !== id || el.type !== 'note') return el;
          if (nextAttached === undefined) {
            const { attachedTo, ...rest } = el as NoteElement;
            return { ...rest } as NoteElement;
          }
          return { ...el, attachedTo: nextAttached } as NoteElement;
        }),
        metadata: { ...s.metadata, updatedAt: now() },
      };
    }),

