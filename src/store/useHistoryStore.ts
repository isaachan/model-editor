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
const PUSH_DEBOUNCE_MS = 400;

interface HistoryState {
  /** Previous snapshots; most recent is at the end. */
  past: DiagramSnapshot[];
  /** Undone snapshots; most recent-undone is at the end. */
  future: DiagramSnapshot[];
  maxSize: number;
  /**
   * Set to true while undo/redo/file-load is programmatically mutating
   * the diagram store. Subscribers should skip scheduling during this window.
   */
  isApplyingHistory: boolean;

  /**
   * Schedule `prev` as the next history entry, coalescing with any existing
   * pending snapshot so rapid edits (e.g. continuous drag) collapse to one.
   */
  schedulePush: (prev: DiagramSnapshot) => void;
  /** Flush any pending scheduled push immediately (used before undo). */
  flushPending: () => void;
  /** Pop from past → return snapshot to apply; push `current` to future. */
  undo: (current: DiagramSnapshot) => DiagramSnapshot | null;
  /** Pop from future → return snapshot to apply; push `current` to past. */
  redo: (current: DiagramSnapshot) => DiagramSnapshot | null;
  canUndo: () => boolean;
  canRedo: () => boolean;
  /** Clear both stacks; use when switching files or loading a fresh diagram. */
  reset: () => void;
  /** Guard setter for subscribers to suppress schedules during programmatic updates. */
  setApplyingHistory: (v: boolean) => void;
}

// Pending push state lives outside the store so timer handles don't leak
// into the serialized state object.
let pendingPrev: DiagramSnapshot | null = null;
let pendingTimer: ReturnType<typeof setTimeout> | null = null;

function commitPending(set: (patch: Partial<HistoryState>) => void, get: () => HistoryState) {
  if (!pendingPrev) return;
  const prev = pendingPrev;
  pendingPrev = null;
  if (pendingTimer) {
    clearTimeout(pendingTimer);
    pendingTimer = null;
  }
  const s = get();
  const nextPast = [...s.past, prev];
  while (nextPast.length > s.maxSize) nextPast.shift();
  set({ past: nextPast, future: [] });
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  past: [],
  future: [],
  maxSize: MAX_HISTORY,
  isApplyingHistory: false,

  schedulePush: (prev) => {
    // Coalesce: first edit in a burst captures prev; later edits extend the timer.
    if (pendingPrev == null) pendingPrev = prev;
    if (pendingTimer) clearTimeout(pendingTimer);
    pendingTimer = setTimeout(() => commitPending(set, get), PUSH_DEBOUNCE_MS);
  },

  flushPending: () => commitPending(set, get),

  undo: (current) => {
    // Flush any in-flight push so the most recent edit is undoable.
    commitPending(set, get);
    const { past } = get();
    if (past.length === 0) return null;
    const target = past[past.length - 1];
    set({
      past: past.slice(0, -1),
      future: [...get().future, current],
    });
    return target;
  },

  redo: (current) => {
    const { future } = get();
    if (future.length === 0) return null;
    const target = future[future.length - 1];
    set({
      past: [...get().past, current],
      future: future.slice(0, -1),
    });
    return target;
  },

  canUndo: () => get().past.length > 0 || pendingPrev != null,
  canRedo: () => get().future.length > 0,

  reset: () => {
    pendingPrev = null;
    if (pendingTimer) {
      clearTimeout(pendingTimer);
      pendingTimer = null;
    }
    set({ past: [], future: [] });
  },
  setApplyingHistory: (v) => {
    if (v) {
      // Drop any stale pending snapshot: the about-to-happen replaceContent
      // is programmatic (undo/redo/file-load), not a user edit.
      pendingPrev = null;
      if (pendingTimer) {
        clearTimeout(pendingTimer);
        pendingTimer = null;
      }
    }
    set({ isApplyingHistory: v });
  },
}));
