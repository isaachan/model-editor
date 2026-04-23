import { create } from 'zustand';
import { nanoid } from 'nanoid';
import {
  type FileIndexEntry,
  deleteFile as storageDeleteFile,
  getCurrentFileId,
  makeUntitledName,
  readFile,
  readIndex,
  renameFile as storageRenameFile,
  setCurrentFileId,
  writeFile,
} from '@/utils/fileStorage';
import { useDiagramStore } from '@/store/useDiagramStore';
import { useHistoryStore } from '@/store/useHistoryStore';

/**
 * In-memory mirror of the localStorage file index plus the id of whichever
 * file is currently loaded into useDiagramStore.  Mutations here perform
 * the localStorage write and then refresh this mirror.
 */
interface FilesState {
  files: FileIndexEntry[];
  currentFileId: string | null;
  /** Last-known localStorage error (e.g. quota exceeded), for UI surfacing. */
  storageError: string | null;

  /** Load index + session pointer from localStorage. */
  bootstrap: () => void;
  /** Create a new empty file, open it, return its id. */
  createFile: (title?: string) => string;
  /** Switch the loaded diagram to a different existing file. */
  openFile: (id: string) => void;
  /** Rename a file by id. */
  renameFile: (id: string, title: string) => void;
  /** Delete a file; if it was current, switch to another (or create empty). */
  deleteFile: (id: string) => void;
  /** Reload just the index from localStorage (after external writes). */
  refreshIndex: () => void;
  /** Persist the current diagram to the current file's storage slot. */
  persistCurrent: () => void;
  /** Clear any surfaced storage error. */
  clearStorageError: () => void;
}

function newId(): string {
  return `file-${nanoid(8)}`;
}

function emptyContent(title: string) {
  const ts = Date.now();
  return {
    version: '1.0',
    metadata: { title, createdAt: ts, updatedAt: ts },
    elements: [],
  };
}

/**
 * Load `id`'s content into the diagram store and set it as current.
 * Suppresses history pushes during the replace via isApplyingHistory.
 */
function loadIntoDiagram(id: string): boolean {
  const content = readFile(id);
  if (!content) return false;
  const history = useHistoryStore.getState();
  history.setApplyingHistory(true);
  try {
    useDiagramStore.getState().replaceContent(content);
    history.reset();
  } finally {
    history.setApplyingHistory(false);
  }
  setCurrentFileId(id);
  return true;
}

export const useFilesStore = create<FilesState>((set, get) => ({
  files: [],
  currentFileId: null,
  storageError: null,

  bootstrap: () => {
    const index = readIndex();
    const current = getCurrentFileId();
    if (index.length === 0) {
      // First-time visit → create an empty file.
      const id = newId();
      const title = makeUntitledName([]);
      const content = emptyContent(title);
      try {
        writeFile(id, content);
      } catch (err) {
        set({ storageError: (err as Error).message });
      }
      loadIntoDiagram(id);
      set({ files: readIndex(), currentFileId: id });
      return;
    }
    // Try to open the previously-current file, else most recently updated.
    const targetId =
      current && index.some((e) => e.id === current)
        ? current
        : [...index].sort((a, b) => b.updatedAt - a.updatedAt)[0].id;
    const ok = loadIntoDiagram(targetId);
    if (!ok) {
      // File entry exists but content missing → drop the bad entry.
      const filtered = index.filter((e) => e.id !== targetId);
      if (filtered.length === 0) {
        get().bootstrap();
        return;
      }
      const fallback = filtered.sort((a, b) => b.updatedAt - a.updatedAt)[0].id;
      loadIntoDiagram(fallback);
      set({ files: readIndex(), currentFileId: fallback });
      return;
    }
    set({ files: index, currentFileId: targetId });
  },

  createFile: (title) => {
    const index = readIndex();
    const id = newId();
    const name = title?.trim() ? title : makeUntitledName(index);
    const content = emptyContent(name);
    try {
      writeFile(id, content);
    } catch (err) {
      set({ storageError: (err as Error).message });
      return get().currentFileId ?? id;
    }
    loadIntoDiagram(id);
    set({ files: readIndex(), currentFileId: id, storageError: null });
    return id;
  },

  openFile: (id) => {
    if (get().currentFileId === id) return;
    // Persist whatever's currently in-flight before switching.
    get().persistCurrent();
    const ok = loadIntoDiagram(id);
    if (!ok) return;
    set({ files: readIndex(), currentFileId: id });
  },

  renameFile: (id, title) => {
    const trimmed = title.trim();
    if (!trimmed) return;
    try {
      storageRenameFile(id, trimmed);
    } catch (err) {
      set({ storageError: (err as Error).message });
      return;
    }
    // Mirror into the diagram store's metadata.title. This is a real user
    // edit, so we deliberately let the subscriber schedule a history entry
    // (do NOT wrap in setApplyingHistory) — otherwise a subsequent Undo
    // would revert both the rename AND the last prior action.
    //
    // Flush any in-flight debounced push first so rename does NOT coalesce
    // into the previous action's snapshot.
    if (get().currentFileId === id) {
      useHistoryStore.getState().flushPending();
      useDiagramStore.getState().setTitle(trimmed);
    }
    set({ files: readIndex() });
  },

  deleteFile: (id) => {
    storageDeleteFile(id);
    const remaining = readIndex();
    const wasCurrent = get().currentFileId === id;
    if (!wasCurrent) {
      set({ files: remaining });
      return;
    }
    if (remaining.length === 0) {
      // List became empty → auto-create an empty file.
      const newFileId = newId();
      const name = makeUntitledName([]);
      const content = emptyContent(name);
      try {
        writeFile(newFileId, content);
      } catch (err) {
        set({ storageError: (err as Error).message });
        return;
      }
      loadIntoDiagram(newFileId);
      set({ files: readIndex(), currentFileId: newFileId });
      return;
    }
    const nextId = [...remaining].sort((a, b) => b.updatedAt - a.updatedAt)[0]
      .id;
    loadIntoDiagram(nextId);
    set({ files: remaining, currentFileId: nextId });
  },

  refreshIndex: () => set({ files: readIndex() }),

  persistCurrent: () => {
    const id = get().currentFileId;
    if (!id) return;
    const { version, metadata, elements } = useDiagramStore.getState();
    try {
      writeFile(id, { version, metadata, elements });
      set({ files: readIndex(), storageError: null });
    } catch (err) {
      set({ storageError: (err as Error).message });
    }
  },

  clearStorageError: () => set({ storageError: null }),
}));
