import { create } from 'zustand';
import type { ToolMode } from '@/models/editor';

interface EditorState {
  currentTool: ToolMode;
  selectedIds: string[];
  hoveredId: string | null;
  viewport: {
    x: number;
    y: number;
    scale: number;
  };
  /**
   * While in relation-creation mode, the first Type clicked is held here
   * until a second Type is clicked to complete the relation.
   */
  pendingRelationSource: string | null;
  /**
   * While in generalization-creation mode, the first Type clicked becomes
   * the pending parent; the next empty-canvas click places the container.
   */
  pendingGeneralizationParent: string | null;

  setTool: (tool: ToolMode) => void;
  select: (id: string | null) => void;
  selectMany: (ids: string[]) => void;
  toggleSelection: (id: string) => void;
  deselectAll: () => void;
  setHovered: (id: string | null) => void;
  setPendingRelationSource: (id: string | null) => void;
  setPendingGeneralizationParent: (id: string | null) => void;
  setViewport: (viewport: Partial<EditorState['viewport']>) => void;
  resetViewport: () => void;
}

const DEFAULT_VIEWPORT = { x: 0, y: 0, scale: 1 };

export const useEditorStore = create<EditorState>((set) => ({
  currentTool: 'select',
  selectedIds: [],
  hoveredId: null,
  viewport: DEFAULT_VIEWPORT,
  pendingRelationSource: null,
  pendingGeneralizationParent: null,

  setTool: (tool) =>
    set({ currentTool: tool, pendingRelationSource: null, pendingGeneralizationParent: null }),

  select: (id) => set({ selectedIds: id ? [id] : [] }),

  selectMany: (ids) => set({ selectedIds: [...new Set(ids)] }),

  toggleSelection: (id) =>
    set((state) => ({
      selectedIds: state.selectedIds.includes(id)
        ? state.selectedIds.filter((selectedId) => selectedId !== id)
        : [...state.selectedIds, id],
    })),

  deselectAll: () => set({ selectedIds: [] }),

  setHovered: (id) => set({ hoveredId: id }),

  setPendingRelationSource: (id) => set({ pendingRelationSource: id }),

  setPendingGeneralizationParent: (id) => set({ pendingGeneralizationParent: id }),

  setViewport: (viewport) =>
    set((state) => ({ viewport: { ...state.viewport, ...viewport } })),

  resetViewport: () => set({ viewport: DEFAULT_VIEWPORT }),
}));
