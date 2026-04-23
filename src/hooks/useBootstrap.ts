import { useEffect } from 'react';
import { useDiagramStore } from '@/store/useDiagramStore';
import { useHistoryStore, type DiagramSnapshot } from '@/store/useHistoryStore';
import { useFilesStore } from '@/store/useFilesStore';
import type { DiagramElement, DiagramMetadata } from '@/models/diagram';

const HISTORY_DEBOUNCE_MS = 400;
const AUTOSAVE_DEBOUNCE_MS = 800;

interface SnapshotSource {
  version: string;
  metadata: DiagramMetadata;
  elements: DiagramElement[];
}

/**
 * Does this state diff represent a meaningful user edit?
 * Ignore updatedAt-only diffs (those fire on every action).
 */
function hasContentChanged(prev: SnapshotSource, next: SnapshotSource): boolean {
  if (prev.elements !== next.elements) return true;
  if (prev.metadata.title !== next.metadata.title) return true;
  return false;
}

function snapshotOf(s: SnapshotSource): DiagramSnapshot {
  return {
    version: s.version,
    metadata: { ...s.metadata },
    // Shallow copy; every action returns new element references (immutable updates).
    elements: [...s.elements],
  };
}

/**
 * Wire up history-push and auto-save subscribers to the diagram store.
 * Also kicks off the initial file-load via useFilesStore.bootstrap().
 *
 * Mount once from App.
 */
export function useBootstrap(): void {
  useEffect(() => {
    // 1. Load (or create) the current file before wiring auto-save,
    //    so the initial replaceContent doesn't fire a save of its own.
    useFilesStore.getState().bootstrap();

    // 2. History integration: remember the pre-change snapshot and push
    //    it after the user pauses (so continuous drags collapse to one
    //    history entry).
    let pendingPrev: DiagramSnapshot | null = null;
    let historyTimer: ReturnType<typeof setTimeout> | null = null;

    const historyUnsub = useDiagramStore.subscribe((next, prev) => {
      if (!hasContentChanged(prev, next)) return;
      if (useHistoryStore.getState().isApplyingHistory) {
        pendingPrev = null;
        if (historyTimer) clearTimeout(historyTimer);
        historyTimer = null;
        return;
      }
      if (pendingPrev == null) pendingPrev = snapshotOf(prev);
      if (historyTimer) clearTimeout(historyTimer);
      historyTimer = setTimeout(() => {
        if (pendingPrev) useHistoryStore.getState().push(pendingPrev);
        pendingPrev = null;
        historyTimer = null;
      }, HISTORY_DEBOUNCE_MS);
    });

    // 3. Auto-save to localStorage (debounced, skipped while applying history).
    let saveTimer: ReturnType<typeof setTimeout> | null = null;
    const saveUnsub = useDiagramStore.subscribe((next, prev) => {
      if (!hasContentChanged(prev, next)) return;
      if (useHistoryStore.getState().isApplyingHistory) return;
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        useFilesStore.getState().persistCurrent();
        saveTimer = null;
      }, AUTOSAVE_DEBOUNCE_MS);
    });

    return () => {
      historyUnsub();
      saveUnsub();
      if (historyTimer) clearTimeout(historyTimer);
      if (saveTimer) clearTimeout(saveTimer);
    };
  }, []);
}
