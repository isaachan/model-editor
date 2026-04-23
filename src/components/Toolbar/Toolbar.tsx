import { useEffect, useMemo, useRef, useState } from 'react';
import { useDiagramStore } from '@/store/useDiagramStore';
import { useEditorStore } from '@/store/useEditorStore';
import { useFilesStore } from '@/store/useFilesStore';
import { useHistoryStore } from '@/store/useHistoryStore';
import { performRedo, performUndo } from '@/utils/history';
import { exportPng } from '@/utils/exportStage';
import { exportSvg } from '@/utils/exportSvg';

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    target.isContentEditable
  );
}

export function Toolbar() {
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const deselectAll = useEditorStore((s) => s.deselectAll);
  const resetViewport = useEditorStore((s) => s.resetViewport);
  const deleteElements = useDiagramStore((s) => s.deleteElements);

  const createFile = useFilesStore((s) => s.createFile);

  // Re-render on history stack changes so buttons reflect canUndo/canRedo.
  // Note: a pending (debounced) push is not reflected here; the keyboard
  // shortcut still works because performUndo flushes pending first.
  const canUndo = useHistoryStore((s) => s.past.length > 0);
  const canRedo = useHistoryStore((s) => s.future.length > 0);

  const showGrid = useEditorStore((s) => s.showGrid);
  const snapToGrid = useEditorStore((s) => s.snapToGrid);
  const setShowGrid = useEditorStore((s) => s.setShowGrid);
  const setSnapToGrid = useEditorStore((s) => s.setSnapToGrid);

  const elements = useDiagramStore((s) => s.elements);
  const currentFileTitle = useFilesStore((s) =>
    s.files.find((f) => f.id === s.currentFileId)?.title ?? 'diagram',
  );

  const [pngOpen, setPngOpen] = useState(false);
  const pngWrapperRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!pngOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!pngWrapperRef.current?.contains(e.target as Node)) setPngOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [pngOpen]);

  const safeFilename = (ext: string) => {
    const base = currentFileTitle.replace(/[\\/:*?"<>|]/g, '_').trim() || 'diagram';
    return `${base}.${ext}`;
  };

  const handleDelete = () => {
    if (selectedIds.length === 0) return;
    deleteElements(selectedIds);
    deselectAll();
  };

  // Cmd/Ctrl+Z → undo ; Cmd/Ctrl+Shift+Z or Cmd/Ctrl+Y → redo.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return;
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      const key = e.key.toLowerCase();
      if (key === 'z' && !e.shiftKey) {
        e.preventDefault();
        performUndo();
      } else if ((key === 'z' && e.shiftKey) || key === 'y') {
        e.preventDefault();
        performRedo();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <header
      className="flex h-12 items-center gap-2 border-b px-4"
      style={{ borderColor: 'var(--color-separator)', background: 'var(--glass-bg)' }}
    >
      {/* File operations */}
      <ToolbarButton label="New" onClick={() => createFile()} />
      <ToolbarButton label="Save" disabled />

      <Divider />

      <ToolbarButton
        label="Undo"
        onClick={() => performUndo()}
        disabled={!canUndo}
        title="Undo (⌘Z)"
      />
      <ToolbarButton
        label="Redo"
        onClick={() => performRedo()}
        disabled={!canRedo}
        title="Redo (⇧⌘Z)"
      />

      <Divider />

      <ToolbarButton
        label="Delete"
        onClick={handleDelete}
        disabled={selectedIds.length === 0}
      />
      <ToolbarButton label="Reset View" onClick={resetViewport} />

      <Divider />

      <ToolbarToggle
        label="Grid"
        active={showGrid}
        onClick={() => setShowGrid(!showGrid)}
        title="显示背景网格"
      />
      <ToolbarToggle
        label="Snap"
        active={snapToGrid}
        onClick={() => setSnapToGrid(!snapToGrid)}
        title="吸附到网格（按住 Alt 临时关闭）"
      />

      <Divider />

      <div ref={pngWrapperRef} className="relative">
        <ToolbarButton
          label="Export PNG ▾"
          onClick={() => setPngOpen((v) => !v)}
          title="导出为 PNG 图片"
        />
        {pngOpen && (
          <div
            className="absolute left-0 top-full z-50 mt-1 w-32 overflow-hidden rounded-[10px] border shadow-lg"
            style={{
              borderColor: 'var(--color-separator)',
              background: 'var(--color-bg-elevated, #ffffff)',
            }}
          >
            <button
              type="button"
              onClick={() => {
                exportPng(safeFilename('png'), 1);
                setPngOpen(false);
              }}
              className="block w-full px-3 py-2 text-left text-sm hover:bg-black/5"
              style={{ color: 'var(--color-text-primary)' }}
            >
              1× 分辨率
            </button>
            <button
              type="button"
              onClick={() => {
                exportPng(safeFilename('png'), 2);
                setPngOpen(false);
              }}
              className="block w-full px-3 py-2 text-left text-sm hover:bg-black/5"
              style={{ color: 'var(--color-text-primary)' }}
            >
              2× 分辨率
            </button>
          </div>
        )}
      </div>
      <ToolbarButton
        label="Export SVG"
        onClick={() => exportSvg(elements, safeFilename('svg'))}
        title="导出为 SVG 矢量图"
      />

      <div className="ml-auto flex items-center">
        <FileSwitcher />
      </div>
    </header>
  );
}

/**
 * Current file name with a dropdown listing all saved files.
 * - Single click opens the dropdown.
 * - Double click on the name enters inline-rename mode.
 * - Each list row has a delete button.
 */
function FileSwitcher() {
  const files = useFilesStore((s) => s.files);
  const currentFileId = useFilesStore((s) => s.currentFileId);
  const createFile = useFilesStore((s) => s.createFile);
  const openFile = useFilesStore((s) => s.openFile);
  const renameFile = useFilesStore((s) => s.renameFile);
  const deleteFile = useFilesStore((s) => s.deleteFile);

  const [open, setOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentFile = useMemo(
    () => files.find((f) => f.id === currentFileId) ?? null,
    [files, currentFileId],
  );

  const sortedFiles = useMemo(
    () => [...files].sort((a, b) => b.updatedAt - a.updatedAt),
    [files],
  );

  // Close dropdown on outside click.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  // Focus the rename input when editing starts.
  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const commitRename = () => {
    if (!currentFile) {
      setIsEditing(false);
      return;
    }
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== currentFile.title) {
      renameFile(currentFile.id, trimmed);
    }
    setIsEditing(false);
  };

  const startRename = () => {
    if (!currentFile) return;
    setEditValue(currentFile.title);
    setIsEditing(true);
    setOpen(false);
  };

  const handleDelete = (id: string, title: string) => {
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return;
    deleteFile(id);
  };

  return (
    <div ref={wrapperRef} className="relative">
      {isEditing ? (
        <input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitRename();
            else if (e.key === 'Escape') setIsEditing(false);
          }}
          className="rounded-[10px] border px-2 py-1 text-sm outline-none"
          style={{
            borderColor: 'var(--color-accent, #007aff)',
            color: 'var(--color-text-primary)',
            background: 'transparent',
            minWidth: 160,
          }}
        />
      ) : (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          onDoubleClick={startRename}
          title="Click to switch file · Double-click to rename"
          className="flex items-center gap-1 rounded-[10px] px-3 py-1.5 text-sm transition-colors"
          style={{ color: 'var(--color-text-primary)' }}
        >
          <span className="max-w-[220px] truncate">
            {currentFile?.title ?? 'Untitled'}
          </span>
          <span
            aria-hidden
            style={{ color: 'var(--color-text-secondary)', fontSize: 10 }}
          >
            ▾
          </span>
        </button>
      )}

      {open && !isEditing && (
        <div
          className="absolute right-0 top-full z-50 mt-1 w-72 overflow-hidden rounded-[10px] border shadow-lg"
          style={{
            borderColor: 'var(--color-separator)',
            background: 'var(--color-bg-elevated, #ffffff)',
          }}
        >
          <button
            type="button"
            onClick={() => {
              createFile();
              setOpen(false);
            }}
            className="flex w-full items-center px-3 py-2 text-left text-sm hover:bg-black/5"
            style={{ color: 'var(--color-text-primary)' }}
          >
            + New Diagram
          </button>
          <div
            className="h-px w-full"
            style={{ background: 'var(--color-separator)' }}
          />
          <ul className="max-h-72 overflow-y-auto py-1">
            {sortedFiles.map((f) => {
              const isCurrent = f.id === currentFileId;
              return (
                <li
                  key={f.id}
                  className="group flex items-center justify-between px-3 py-1.5 text-sm hover:bg-black/5"
                  style={{
                    color: 'var(--color-text-primary)',
                    background: isCurrent ? 'rgba(0,122,255,0.08)' : 'transparent',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      openFile(f.id);
                      setOpen(false);
                    }}
                    className="min-w-0 flex-1 truncate text-left"
                    title={f.title}
                  >
                    <span className={isCurrent ? 'font-medium' : ''}>
                      {f.title}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(f.id, f.title);
                    }}
                    aria-label={`Delete ${f.title}`}
                    className="ml-2 shrink-0 rounded px-2 py-0.5 text-xs opacity-0 transition-opacity group-hover:opacity-100"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    ✕
                  </button>
                </li>
              );
            })}
            {sortedFiles.length === 0 && (
              <li
                className="px-3 py-2 text-sm"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                No files yet
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

function Divider() {
  return (
    <div className="mx-1 h-5 w-px" style={{ background: 'var(--color-separator)' }} />
  );
}

function ToolbarButton({
  label,
  disabled,
  onClick,
  title,
}: {
  label: string;
  disabled?: boolean;
  onClick?: () => void;
  title?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={title}
      className="rounded-[10px] px-3 py-1.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40"
      style={{ color: 'var(--color-text-primary)' }}
    >
      {label}
    </button>
  );
}

function ToolbarToggle({
  label,
  active,
  onClick,
  title,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={active}
      className="rounded-[10px] px-3 py-1.5 text-sm transition-colors"
      style={{
        color: active ? 'var(--color-accent, #007aff)' : 'var(--color-text-primary)',
        background: active ? 'rgba(0,122,255,0.10)' : 'transparent',
      }}
    >
      {label}
    </button>
  );
}
