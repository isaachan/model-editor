import { useDiagramStore } from '@/store/useDiagramStore';
import { useEditorStore } from '@/store/useEditorStore';
import { CARDINALITY_OPTIONS } from '@/utils/cardinality';
import type { CardinalityKind, RelationElement, RelationEnd } from '@/models/diagram';

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
            onChange={(end, kind, range) => setCardinality(selected.id, end, kind, range)}
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
  onChange: (
    end: 'source' | 'target',
    kind: CardinalityKind,
    range?: [number, number | null],
  ) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <SectionLabel>Relation</SectionLabel>

      <CardinalityField
        label="Source 基数"
        endState={relation.source}
        onChange={(k, range) => onChange('source', k, range)}
      />
      <CardinalityField
        label="Target 基数"
        endState={relation.target}
        onChange={(k, range) => onChange('target', k, range)}
      />
    </div>
  );
}

function CardinalityField({
  label,
  endState,
  onChange,
}: {
  label: string;
  endState: RelationEnd;
  onChange: (kind: CardinalityKind, range?: [number, number | null]) => void;
}) {
  const value = endState.cardinality;
  const minValue = endState.cardinalityRange?.[0] ?? (value === 'two_or_more' ? 2 : 1);
  const maxValue =
    value === 'range'
      ? Math.max(minValue + 1, endState.cardinalityRange?.[1] ?? minValue + 1)
      : null;

  const handleKindChange = (kind: CardinalityKind) => {
    if (kind === 'two_or_more') {
      onChange(kind, [endState.cardinalityRange?.[0] ?? 2, null]);
      return;
    }
    if (kind === 'range') {
      const nextMin = endState.cardinalityRange?.[0] ?? 1;
      onChange(kind, [nextMin, Math.max(nextMin + 1, endState.cardinalityRange?.[1] ?? nextMin + 1)]);
      return;
    }
    onChange(kind, undefined);
  };

  const handleMinChange = (nextMin: string) => {
    const parsedMin = Number.parseInt(nextMin, 10);
    const safeMin = Number.isFinite(parsedMin) ? Math.max(0, parsedMin) : 0;
    if (value === 'two_or_more') {
      onChange('two_or_more', [safeMin, null]);
      return;
    }

    const normalizedMax = Math.max(safeMin + 1, maxValue ?? safeMin + 1);
    onChange('range', [safeMin, normalizedMax]);
  };

  const handleMaxChange = (nextMax: string) => {
    const parsedMax = Number.parseInt(nextMax, 10);
    const safeMax = Number.isFinite(parsedMax) ? Math.max(minValue + 1, parsedMax) : minValue + 1;
    onChange('range', [minValue, safeMax]);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => handleKindChange(e.target.value as CardinalityKind)}
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

      {(value === 'two_or_more' || value === 'range') && (
        <div className="grid grid-cols-2 gap-2 rounded-[8px] border p-2" style={{ borderColor: 'var(--color-separator)' }}>
          <label className="flex flex-col gap-1">
            <span className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
              n / Min
            </span>
            <input
              type="number"
              min={0}
              step={1}
              value={minValue}
              onChange={(e) => handleMinChange(e.target.value)}
              className="rounded-[6px] border px-2.5 py-1.5 text-sm outline-none focus:border-[color:var(--color-accent-blue)]"
              style={{
                borderColor: 'var(--color-separator)',
                background: '#fff',
                color: 'var(--color-text-primary)',
                transition: 'border-color var(--transition-fast)',
              }}
            />
          </label>
          {value === 'range' && (
            <label className="flex flex-col gap-1">
              <span className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
                m / Max
              </span>
              <input
                type="number"
                min={minValue + 1}
                step={1}
                value={maxValue ?? minValue + 1}
                onChange={(e) => handleMaxChange(e.target.value)}
                className="rounded-[6px] border px-2.5 py-1.5 text-sm outline-none focus:border-[color:var(--color-accent-blue)]"
                style={{
                  borderColor: 'var(--color-separator)',
                  background: '#fff',
                  color: 'var(--color-text-primary)',
                  transition: 'border-color var(--transition-fast)',
                }}
              />
            </label>
          )}
          <div className="col-span-2 text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
            {value === 'two_or_more' ? '填写 n，显示为 [n,*]。' : 'm 必须是数字，且默认至少为 n+1。'}
          </div>
        </div>
      )}
    </div>
  );
}
