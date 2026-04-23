import { useDiagramStore } from '@/store/useDiagramStore';
import { useEditorStore } from '@/store/useEditorStore';
import { useFilesStore } from '@/store/useFilesStore';
import { useHistoryStore, type DiagramSnapshot } from '@/store/useHistoryStore';

function currentSnapshot(): DiagramSnapshot {
  const { version, metadata, elements } = useDiagramStore.getState();
  return {
    version,
    metadata: { ...metadata },
    elements: [...elements],
  };
}

function apply(target: DiagramSnapshot): void {
  const history = useHistoryStore.getState();
  history.setApplyingHistory(true);
  try {
    useDiagramStore.getState().replaceContent(target);
  } finally {
    history.setApplyingHistory(false);
  }
  // Drop any stale selection/hover/pending-op state after mutating elements.
  const editor = useEditorStore.getState();
  editor.deselectAll();
  editor.setHovered(null);
  editor.setPendingRelationSource(null);
  editor.setPendingGeneralizationParent(null);
  // Persist the reverted state so a page reload mirrors the visible diagram.
  useFilesStore.getState().persistCurrent();
}

/** Undo if possible; no-op otherwise. */
export function performUndo(): boolean {
  const target = useHistoryStore.getState().undo(currentSnapshot());
  if (!target) return false;
  apply(target);
  return true;
}

/** Redo if possible; no-op otherwise. */
export function performRedo(): boolean {
  const target = useHistoryStore.getState().redo(currentSnapshot());
  if (!target) return false;
  apply(target);
  return true;
}
