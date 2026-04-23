import { useDiagramStore } from '@/store/useDiagramStore';
import { useEditorStore } from '@/store/useEditorStore';

export function Toolbar() {
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const deselectAll = useEditorStore((s) => s.deselectAll);
  const resetViewport = useEditorStore((s) => s.resetViewport);
  const deleteElements = useDiagramStore((s) => s.deleteElements);

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
      {/* File operations — reserved placeholders (ME-026 / ME-027 / ME-043 later) */}
      <ToolbarButton label="New" disabled />
      <ToolbarButton label="Save" disabled />

      <Divider />

      {/* History — reserved (ME-024 / ME-025) */}
      <ToolbarButton label="Undo" disabled />
      <ToolbarButton label="Redo" disabled />

      <Divider />

      <ToolbarButton label="Delete" onClick={handleDelete} disabled={selectedIds.length === 0} />
      <ToolbarButton label="Reset View" onClick={resetViewport} />

      <div
        className="ml-auto flex items-center text-sm"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        Model Editor
      </div>
    </header>
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
