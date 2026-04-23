import { useDiagramStore } from '@/store/useDiagramStore';
import { useEditorStore } from '@/store/useEditorStore';

export function RightSidebar() {
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const elements = useDiagramStore((s) => s.elements);
  const renameType = useDiagramStore((s) => s.renameType);

  const selected = selectedIds.length === 1
    ? elements.find((el) => el.id === selectedIds[0])
    : null;

  return (
    <aside
      className="flex w-72 flex-col border-l"
      style={{ borderColor: 'var(--color-separator)', background: 'var(--glass-bg)' }}
    >
      <div
        className="border-b px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.3px]"
        style={{
          borderColor: 'var(--color-separator)',
          color: 'var(--color-text-secondary)',
        }}
      >
        Inspector
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {!selected && <EmptyState multiple={selectedIds.length > 1} />}
        {selected?.type === 'type' && (
          <TypeInspector
            key={selected.id}
            id={selected.id}
            name={selected.name}
            onRename={(name) => renameType(selected.id, name)}
          />
        )}
      </div>
    </aside>
  );
}

function EmptyState({ multiple }: { multiple: boolean }) {
  return (
    <div
      className="mt-6 text-center text-sm"
      style={{ color: 'var(--color-text-secondary)' }}
    >
      {multiple ? '已选中多个元素' : '未选中任何元素'}
      <div className="mt-1 text-xs opacity-70">
        {multiple ? '单选以查看属性' : '请在画布上选择一个元素'}
      </div>
    </div>
  );
}

function TypeInspector({
  name,
  onRename,
}: {
  id: string;
  name: string;
  onRename: (name: string) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.3px]"
        style={{ color: 'var(--color-text-secondary)' }}>
        Type
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
          名称 / Name
        </span>
        <input
          type="text"
          value={name}
          onChange={(e) => onRename(e.target.value)}
          className="rounded-[6px] border px-2.5 py-1.5 text-sm outline-none focus:border-[color:var(--color-accent-blue)]"
          style={{
            borderColor: 'var(--color-separator)',
            background: '#fff',
            color: 'var(--color-text-primary)',
            transition: 'border-color var(--transition-fast)',
          }}
          spellCheck={false}
          autoFocus
        />
      </label>
    </div>
  );
}
