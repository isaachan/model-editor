import { create } from 'zustand';
import type { DiagramElement, DiagramMetadata } from '@/models/diagram';

/**
 * A point-in-time snapshot of the diagram's persistent state.
 * Editor/UI state (selection, tool, viewport) is intentionally excluded.
 */
export interface DiagramSnapshot {
  version: string;
  metadata: DiagramMetadata;
  elements: DiagramElement[];
}

const MAX_HISTORY = 100;

interface HistoryState {
  /** Previous snapshots; most recent is at the end. */
  past: DiagramSnapshot[];
  /** Undone snapshots; most recent-undone is at the end. */
  future: DiagramSnapshot[];
  maxSize: number;
  /**
   * Set to true while undo/redo/file-load is programmatically mutating
   * the diagram store. Subscribers should skip pushing during this window.
   */
  isApplyingHistory: boolean;

  /** Record a snapshot of the *previous* state and clear the redo stack. */
  push: (prev: DiagramSnapshot) => void;
  /** Pop from past → return snapshot to apply; push `current` to future. */
  undo: (current: DiagramSnapshot) => DiagramSnapshot | null;
  /** Pop from future → return snapshot to apply; push `current` to past. */
  redo: (current: DiagramSnapshot) => DiagramSnapshot | null;
  canUndo: () => boolean;
  canRedo: () => boolean;
  /** Clear both stacks; use when switching files or loading a fresh diagram. */
  reset: () => void;
  /** Guard setter for subscribers to suppress pushes during programmatic updates. */
  setApplyingHistory: (v: boolean) => void;
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  past: [],
  future: [],
  maxSize: MAX_HISTORY,
  isApplyingHistory: false,

  push: (prev) =>
    set((s) => {
      const nextPast = [...s.past, prev];
      // FIFO: drop oldest when over capacity.
      while (nextPast.length > s.maxSize) nextPast.shift();
      return { past: nextPast, future: [] };
    }),

  undo: (current) => {
    const { past } = get();
    if (past.length === 0) return null;
    const target = past[past.length - 1];
    set((s) => ({
      past: s.past.slice(0, -1),
      future: [...s.future, current],
    }));
    return target;
  },

  redo: (current) => {
    const { future } = get();
    if (future.length === 0) return null;
    const target = future[future.length - 1];
    set((s) => ({
      past: [...s.past, current],
      future: s.future.slice(0, -1),
    }));
    return target;
  },

  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,

  reset: () => set({ past: [], future: [] }),
  setApplyingHistory: (v) => set({ isApplyingHistory: v }),
}));
