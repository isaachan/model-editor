import type { DiagramElement, DiagramMetadata } from '@/models/diagram';

/**
 * localStorage layout for multi-file support (ME-026 / ME-027 / ME-047 / ME-048).
 *
 *   model-editor:files:index          → FileIndexEntry[]
 *   model-editor:files:<id>           → FileContent
 *   model-editor:session:currentFileId → string
 *
 * Kept intentionally flat so a single write touches at most one file's
 * contents plus the index.
 */

const KEY_INDEX = 'model-editor:files:index';
const KEY_CURRENT = 'model-editor:session:currentFileId';
const KEY_FILE_PREFIX = 'model-editor:files:';

export interface FileIndexEntry {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

export interface FileContent {
  version: string;
  metadata: DiagramMetadata;
  elements: DiagramElement[];
}

export class QuotaExceededError extends Error {
  constructor(message = 'localStorage quota exceeded') {
    super(message);
    this.name = 'QuotaExceededError';
  }
}

function fileKey(id: string): string {
  return `${KEY_FILE_PREFIX}${id}`;
}

function isQuotaError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  // Matches Chrome/Firefox/Safari variants.
  return (
    err.name === 'QuotaExceededError' ||
    err.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    /quota/i.test(err.message)
  );
}

function safeParse<T>(raw: string | null): T | null {
  if (raw == null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeString(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch (err) {
    if (isQuotaError(err)) throw new QuotaExceededError();
    throw err;
  }
}

export function readIndex(): FileIndexEntry[] {
  const arr = safeParse<FileIndexEntry[]>(localStorage.getItem(KEY_INDEX));
  return Array.isArray(arr) ? arr : [];
}

function writeIndex(index: FileIndexEntry[]): void {
  writeString(KEY_INDEX, JSON.stringify(index));
}

export function readFile(id: string): FileContent | null {
  return safeParse<FileContent>(localStorage.getItem(fileKey(id)));
}

/**
 * Persist one file's content and mirror the updated (title, updatedAt)
 * back into the index in a single logical write.
 */
export function writeFile(
  id: string,
  content: FileContent,
): void {
  writeString(fileKey(id), JSON.stringify(content));
  const index = readIndex();
  const i = index.findIndex((e) => e.id === id);
  const entry: FileIndexEntry = {
    id,
    title: content.metadata.title,
    createdAt:
      i >= 0 ? index[i].createdAt : content.metadata.createdAt ?? Date.now(),
    updatedAt: content.metadata.updatedAt ?? Date.now(),
  };
  if (i >= 0) index[i] = entry;
  else index.push(entry);
  writeIndex(index);
}

/** Update only the title on an index entry (used during rename). */
export function renameFile(id: string, title: string): void {
  const index = readIndex();
  const i = index.findIndex((e) => e.id === id);
  if (i < 0) return;
  index[i] = { ...index[i], title, updatedAt: Date.now() };
  writeIndex(index);
  // Also patch the file content's metadata.title for consistency.
  const content = readFile(id);
  if (content) {
    const next: FileContent = {
      ...content,
      metadata: { ...content.metadata, title, updatedAt: index[i].updatedAt },
    };
    writeString(fileKey(id), JSON.stringify(next));
  }
}

export function deleteFile(id: string): void {
  localStorage.removeItem(fileKey(id));
  const index = readIndex().filter((e) => e.id !== id);
  writeIndex(index);
  if (getCurrentFileId() === id) {
    localStorage.removeItem(KEY_CURRENT);
  }
}

export function getCurrentFileId(): string | null {
  return localStorage.getItem(KEY_CURRENT);
}

export function setCurrentFileId(id: string | null): void {
  if (id == null) localStorage.removeItem(KEY_CURRENT);
  else writeString(KEY_CURRENT, id);
}

/**
 * Generate a title that does not collide with any existing entry,
 * e.g. "Untitled", "Untitled 2", "Untitled 3", ...
 */
export function makeUntitledName(index: FileIndexEntry[]): string {
  const base = 'Untitled';
  const taken = new Set(index.map((e) => e.title));
  if (!taken.has(base)) return base;
  for (let n = 2; n < 10_000; n++) {
    const candidate = `${base} ${n}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `${base} ${Date.now()}`;
}
