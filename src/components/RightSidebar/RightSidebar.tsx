import { useState } from 'react';
import { useDiagramStore } from '@/store/useDiagramStore';
import { useEditorStore } from '@/store/useEditorStore';
import { CARDINALITY_OPTIONS } from '@/utils/cardinality';
import {
  SEMANTIC_CATALOG,
  isMultivalued,
  labelOf,
  type SemanticCatalogEntry,
  type SemanticScope,
} from '@/constants/semantics';
import type {
  CardinalityKind,
  GeneralizationElement,
  PartitionCompleteness,
  RelationElement,
  RelationEnd,
  ShortSemantic,
  TypeElement,
} from '@/models/diagram';

export function RightSidebar() {
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const elements = useDiagramStore((s) => s.elements);
  const renameType = useDiagramStore((s) => s.renameType);
  const setCardinality = useDiagramStore((s) => s.setCardinality);
  const setGeneralizationCompleteness = useDiagramStore(
    (s) => s.setGeneralizationCompleteness,
  );
  const addTypeSemantic = useDiagramStore((s) => s.addTypeSemantic);
  const removeTypeSemantic = useDiagramStore((s) => s.removeTypeSemantic);
  const addRelationMappingSemantic = useDiagramStore(
    (s) => s.addRelationMappingSemantic,
  );
  const removeRelationMappingSemantic = useDiagramStore(
    (s) => s.removeRelationMappingSemantic,
  );
  const addRelationAssociationSemantic = useDiagramStore(
    (s) => s.addRelationAssociationSemantic,
  );
  const removeRelationAssociationSemantic = useDiagramStore(
    (s) => s.removeRelationAssociationSemantic,
  );

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
            semantics={selected.semantics}
            onRename={(name) => renameType(selected.id, name)}
            onAddSemantic={(m) => addTypeSemantic(selected.id, m)}
            onRemoveSemantic={(i) => removeTypeSemantic(selected.id, i)}
          />
        )}
        {selected?.type === 'relation' && (
          <RelationInspector
            key={selected.id}
            relation={selected}
            onChange={(end, kind, range) => setCardinality(selected.id, end, kind, range)}
            onAddMappingSemantic={(end, m) =>
              addRelationMappingSemantic(selected.id, end, m)
            }
            onRemoveMappingSemantic={(end, i) =>
              removeRelationMappingSemantic(selected.id, end, i)
            }
            onAddAssociationSemantic={(m) =>
              addRelationAssociationSemantic(selected.id, m)
            }
            onRemoveAssociationSemantic={(i) =>
              removeRelationAssociationSemantic(selected.id, i)
            }
          />
        )}
        {selected?.type === 'generalization' && (
          <GeneralizationInspector
            key={selected.id}
            element={selected}
            onCompletenessChange={(c) => setGeneralizationCompleteness(selected.id, c)}
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
  semantics,
  onRename,
  onAddSemantic,
  onRemoveSemantic,
}: {
  id: string;
  name: string;
  semantics: TypeElement['semantics'];
  onRename: (name: string) => void;
  onAddSemantic: (marker: ShortSemantic) => void;
  onRemoveSemantic: (index: number) => void;
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

      <SemanticSlot
        label="短语义 / Short Semantic"
        scope="type"
        markers={semantics}
        onAdd={onAddSemantic}
        onRemove={onRemoveSemantic}
      />
    </div>
  );
}

function RelationInspector({
  relation,
  onChange,
  onAddMappingSemantic,
  onRemoveMappingSemantic,
  onAddAssociationSemantic,
  onRemoveAssociationSemantic,
}: {
  relation: RelationElement;
  onChange: (
    end: 'source' | 'target',
    kind: CardinalityKind,
    range?: [number, number | null],
  ) => void;
  onAddMappingSemantic: (end: 'source' | 'target', marker: ShortSemantic) => void;
  onRemoveMappingSemantic: (end: 'source' | 'target', index: number) => void;
  onAddAssociationSemantic: (marker: ShortSemantic) => void;
  onRemoveAssociationSemantic: (index: number) => void;
}) {
  const isRecursive = relation.source.typeId === relation.target.typeId;
  return (
    <div className="flex flex-col gap-4">
      <SectionLabel>Relation</SectionLabel>

      <div className="flex flex-col gap-3 rounded-[10px] border p-3" style={{ borderColor: 'var(--color-separator)' }}>
        <div className="text-[11px] font-semibold uppercase tracking-[0.3px]" style={{ color: 'var(--color-text-secondary)' }}>
          Source 端
        </div>
        <CardinalityField
          label="基数"
          endState={relation.source}
          onChange={(k, range) => onChange('source', k, range)}
        />
        <SemanticSlot
          label="短语义 (mapping)"
          scope="mapping"
          markers={relation.source.semantics}
          multivalued={isMultivalued(relation.source.cardinality)}
          onAdd={(m) => onAddMappingSemantic('source', m)}
          onRemove={(i) => onRemoveMappingSemantic('source', i)}
        />
      </div>

      <div className="flex flex-col gap-3 rounded-[10px] border p-3" style={{ borderColor: 'var(--color-separator)' }}>
        <div className="text-[11px] font-semibold uppercase tracking-[0.3px]" style={{ color: 'var(--color-text-secondary)' }}>
          Target 端
        </div>
        <CardinalityField
          label="基数"
          endState={relation.target}
          onChange={(k, range) => onChange('target', k, range)}
        />
        <SemanticSlot
          label="短语义 (mapping)"
          scope="mapping"
          markers={relation.target.semantics}
          multivalued={isMultivalued(relation.target.cardinality)}
          onAdd={(m) => onAddMappingSemantic('target', m)}
          onRemove={(i) => onRemoveMappingSemantic('target', i)}
        />
      </div>

      <div className="flex flex-col gap-3 rounded-[10px] border p-3" style={{ borderColor: 'var(--color-separator)' }}>
        <div className="text-[11px] font-semibold uppercase tracking-[0.3px]" style={{ color: 'var(--color-text-secondary)' }}>
          Association
        </div>
        <SemanticSlot
          label="短语义 (association)"
          scope="association"
          markers={relation.associationSemantics}
          recursive={isRecursive}
          onAdd={onAddAssociationSemantic}
          onRemove={onRemoveAssociationSemantic}
        />
      </div>
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

function GeneralizationInspector({
  element,
  onCompletenessChange,
}: {
  element: GeneralizationElement;
  onCompletenessChange: (c: PartitionCompleteness) => void;
}) {
  const options: Array<{
    value: PartitionCompleteness;
    label: string;
    description: string;
  }> = [
    { value: 'complete', label: 'Complete — 完整划分', description: '容器底部单水平线' },
    { value: 'incomplete', label: 'Incomplete — 不完整划分', description: '容器底部双水平线（内侧补线）' },
  ];

  return (
    <div className="flex flex-col gap-4">
      <SectionLabel>Generalization</SectionLabel>

      <div className="flex flex-col gap-1.5">
        <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
          划分类型 / Partition
        </span>
        <div className="flex flex-col gap-1.5">
          {options.map((opt) => {
            const selected = element.completeness === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onCompletenessChange(opt.value)}
                className="flex items-center gap-2 rounded-[8px] border px-3 py-2 text-left transition-colors"
                style={{
                  borderColor: selected ? 'var(--color-accent-blue)' : 'var(--color-separator)',
                  background: selected ? 'rgba(0, 122, 255, 0.08)' : '#fff',
                }}
              >
                <span
                  className="mt-0.5 inline-flex h-3 w-3 items-center justify-center rounded-full border"
                  style={{
                    borderColor: selected ? 'var(--color-accent-blue)' : '#c6c6c8',
                  }}
                >
                  {selected && (
                    <span
                      className="inline-block h-1.5 w-1.5 rounded-full"
                      style={{ background: 'var(--color-accent-blue)' }}
                    />
                  )}
                </span>
                <span className="flex flex-col">
                  <span className="text-sm" style={{ color: 'var(--color-text-primary)' }}>
                    {opt.label}
                  </span>
                  <span className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
                    {opt.description}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
        子类数量：{element.childTypeIds.length}
      </div>
    </div>
  );
}

/**
 * Inline pill list + "+ Add" picker for short-semantic markers.
 * Filters the catalog by scope, plus optional multivalued/recursive constraints.
 * For `key`, prompts for the keyType inline; duplicates of the same kind are
 * prevented (key can still be updated by removing + re-adding).
 */
function SemanticSlot({
  label,
  scope,
  markers,
  multivalued,
  recursive,
  onAdd,
  onRemove,
}: {
  label: string;
  scope: SemanticScope;
  markers: ShortSemantic[] | undefined;
  multivalued?: boolean;
  recursive?: boolean;
  onAdd: (marker: ShortSemantic) => void;
  onRemove: (index: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pendingKeyEntry, setPendingKeyEntry] = useState<SemanticCatalogEntry | null>(null);
  const [keyInput, setKeyInput] = useState('');
  const list = markers ?? [];
  const existingKinds = new Set(list.map((m) => m.kind));

  const available = SEMANTIC_CATALOG.filter((e) => {
    if (!e.scopes.includes(scope)) return false;
    if (e.requiresMultivalued && !multivalued) return false;
    if (e.requiresRecursive && !recursive) return false;
    if (existingKinds.has(e.kind)) return false;
    return true;
  });

  const handlePick = (entry: SemanticCatalogEntry) => {
    if (entry.needsParam) {
      setPendingKeyEntry(entry);
      setKeyInput('');
      return;
    }
    onAdd({ kind: entry.kind } as ShortSemantic);
    setOpen(false);
  };

  const commitKey = () => {
    const trimmed = keyInput.trim();
    if (!trimmed || !pendingKeyEntry) {
      setPendingKeyEntry(null);
      return;
    }
    onAdd({ kind: 'key', keyType: trimmed });
    setPendingKeyEntry(null);
    setOpen(false);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
        {label}
      </span>
      <div className="flex flex-wrap gap-1.5">
        {list.map((m, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]"
            style={{
              borderColor: 'var(--color-separator)',
              background: '#fff',
              color: 'var(--color-text-primary)',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            }}
          >
            [{labelOf(m)}]
            <button
              type="button"
              onClick={() => onRemove(i)}
              aria-label="移除标记"
              className="ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full text-[11px] leading-none hover:bg-black/5"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              ×
            </button>
          </span>
        ))}
        {available.length > 0 && !open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center rounded-full border border-dashed px-2 py-0.5 text-[11px] transition-colors hover:bg-black/5"
            style={{
              borderColor: 'var(--color-separator)',
              color: 'var(--color-text-secondary)',
            }}
          >
            + Add
          </button>
        )}
      </div>
      {open && (
        <div
          className="flex flex-col gap-1 rounded-[8px] border p-2"
          style={{ borderColor: 'var(--color-separator)', background: '#fafafa' }}
        >
          {pendingKeyEntry ? (
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
                key 的类型参数（例如 CustomerId）
              </span>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitKey();
                    else if (e.key === 'Escape') setPendingKeyEntry(null);
                  }}
                  className="flex-1 rounded-[6px] border px-2 py-1 text-xs outline-none"
                  style={{ borderColor: 'var(--color-separator)', background: '#fff' }}
                />
                <button
                  type="button"
                  onClick={commitKey}
                  className="rounded-[6px] px-2 py-1 text-xs text-white"
                  style={{ background: 'var(--color-accent-blue)' }}
                >
                  确定
                </button>
              </div>
            </div>
          ) : (
            <>
              {available.map((e) => (
                <button
                  key={e.kind}
                  type="button"
                  onClick={() => handlePick(e)}
                  className="rounded-[6px] px-2 py-1 text-left text-xs transition-colors hover:bg-black/5"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  [{e.label}]
                  {e.needsParam && (
                    <span className="ml-1 text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>
                      需参数
                    </span>
                  )}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="mt-1 text-[11px]"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                取消
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
