import { useEffect, useMemo, useRef, useState } from 'react';
import { useDiagramStore } from '@/store/useDiagramStore';
import { useEditorStore } from '@/store/useEditorStore';
import { useFilesStore } from '@/store/useFilesStore';

export function Toolbar() {
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const deselectAll = useEditorStore((s) => s.deselectAll);
  const resetViewport = useEditorStore((s) => s.resetViewport);
  const deleteElements = useDiagramStore((s) => s.deleteElements);

  const createFile = useFilesStore((s) => s.createFile);

  const handleDelete = () => {
    if (selectedIds.length === 0) return;
    deleteElements(selectedIds);
    deselectAll();
  };

  return (
    <header
      className="flex h-12 items-center gap-2 border-b px-4"
      style={{ borderColor: 'var(--color-separator)', background: 'var(--glass-bg)' }}
    >
      {/* File operations */}
      <ToolbarButton label="New" onClick={() => createFile()} />
      <ToolbarButton label="Save" disabled />

      <Divider />

      {/* History — reserved (ME-024 / ME-025) */}
      <ToolbarButton label="Undo" disabled />
      <ToolbarButton label="Redo" disabled />

      <Divider />

      <ToolbarButton
        label="Delete"
        onClick={handleDelete}
        disabled={selectedIds.length === 0}
      />
      <ToolbarButton label="Reset View" onClick={resetViewport} />

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
}: {
  label: string;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="rounded-[10px] px-3 py-1.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40"
      style={{ color: 'var(--color-text-primary)' }}
    >
      {label}
    </button>
  );
}
