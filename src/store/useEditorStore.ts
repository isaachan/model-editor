import { create } from 'zustand';
import type { ToolMode } from '@/models/editor';

interface EditorState {
  currentTool: ToolMode;
  selectedIds: string[];
  hoveredId: string | null;
  /**
   * While in relation-creation mode, the first Type clicked is held here
   * until a second Type is clicked to complete the relation.
   */
  pendingRelationSource: string | null;

  setTool: (tool: ToolMode) => void;
  select: (id: string | null) => void;
  deselectAll: () => void;
  setHovered: (id: string | null) => void;
  setPendingRelationSource: (id: string | null) => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  currentTool: 'select',
  selectedIds: [],
  hoveredId: null,
  pendingRelationSource: null,

  setTool: (tool) => set({ currentTool: tool, pendingRelationSource: null }),

  select: (id) => set({ selectedIds: id ? [id] : [] }),

  deselectAll: () => set({ selectedIds: [] }),

  setHovered: (id) => set({ hoveredId: id }),

  setPendingRelationSource: (id) => set({ pendingRelationSource: id }),
}));
