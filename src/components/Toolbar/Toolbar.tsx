export function Toolbar() {
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

function ToolbarButton({ label, disabled }: { label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      className="rounded-[10px] px-3 py-1.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40"
      style={{ color: 'var(--color-text-primary)' }}
    >
      {label}
    </button>
  );
}
