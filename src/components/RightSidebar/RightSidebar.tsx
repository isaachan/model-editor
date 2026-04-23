import { useDiagramStore } from '@/store/useDiagramStore';
import { useEditorStore } from '@/store/useEditorStore';
import { CARDINALITY_OPTIONS } from '@/utils/cardinality';
import type { CardinalityKind, RelationElement } from '@/models/diagram';

export function RightSidebar() {
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const elements = useDiagramStore((s) => s.elements);
  const renameType = useDiagramStore((s) => s.renameType);
  const setCardinality = useDiagramStore((s) => s.setCardinality);

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
        {selected?.type === 'relation' && (
          <RelationInspector
            key={selected.id}
            relation={selected}
            onChange={(end, kind) => setCardinality(selected.id, end, kind)}
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

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="text-[11px] font-semibold uppercase tracking-[0.3px]"
      style={{ color: 'var(--color-text-secondary)' }}
    >
      {children}
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
      <SectionLabel>Type</SectionLabel>

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

function RelationInspector({
  relation,
  onChange,
}: {
  relation: RelationElement;
  onChange: (end: 'source' | 'target', kind: CardinalityKind) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <SectionLabel>Relation</SectionLabel>

      <CardinalityField
        label="Source 基数"
        value={relation.source.cardinality}
        onChange={(k) => onChange('source', k)}
      />
      <CardinalityField
        label="Target 基数"
        value={relation.target.cardinality}
        onChange={(k) => onChange('target', k)}
      />
    </div>
  );
}

function CardinalityField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: CardinalityKind;
  onChange: (kind: CardinalityKind) => void;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as CardinalityKind)}
        className="rounded-[6px] border px-2.5 py-1.5 text-sm outline-none focus:border-[color:var(--color-accent-blue)]"
        style={{
          borderColor: 'var(--color-separator)',
          background: '#fff',
          color: 'var(--color-text-primary)',
          transition: 'border-color var(--transition-fast)',
        }}
      >
        {CARDINALITY_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label} — {opt.description}
          </option>
        ))}
      </select>
    </label>
  );
}
