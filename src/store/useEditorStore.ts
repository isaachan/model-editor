import { create } from 'zustand';
import type { ToolMode } from '@/models/editor';

interface EditorState {
  currentTool: ToolMode;
  selectedIds: string[];
  hoveredId: string | null;

  setTool: (tool: ToolMode) => void;
  select: (id: string | null) => void;
  toggleSelect: (id: string) => void;
  deselectAll: () => void;
  setHovered: (id: string | null) => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  currentTool: 'select',
  selectedIds: [],
  hoveredId: null,

  setTool: (tool) => set({ currentTool: tool }),

  select: (id) => set({ selectedIds: id ? [id] : [] }),

  toggleSelect: (id) =>
    set((s) => ({
      selectedIds: s.selectedIds.includes(id)
        ? s.selectedIds.filter((x) => x !== id)
        : [...s.selectedIds, id],
    })),

  deselectAll: () => set({ selectedIds: [] }),

  setHovered: (id) => set({ hoveredId: id }),
}));
