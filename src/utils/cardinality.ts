import type { CardinalityKind } from '@/models/diagram';

export interface CardinalityOption {
  value: CardinalityKind;
  label: string;
  description: string;
}

/** Dropdown options in display order. */
export const CARDINALITY_OPTIONS: CardinalityOption[] = [
  { value: 'exactly_one', label: '[1,1]', description: '必须且仅有一个' },
  { value: 'zero_or_one', label: '[0,1]', description: '零个或一个' },
  { value: 'one_or_more', label: '[1,*]', description: '一个或多个' },
  { value: 'zero_or_more', label: '[0,*]', description: '零个或多个' },
  { value: 'two_or_more', label: '[n,*]', description: 'n 个或更多' },
  { value: 'range', label: '[n,m]', description: '指定范围' },
  { value: 'unknown', label: '?', description: '未知' },
  { value: 'no_mapping', label: 'X', description: '此方向无映射' },
];

export function cardinalityLabel(
  kind: CardinalityKind,
  range?: [number, number | null],
): string {
  if (kind === 'two_or_more' && range) {
    return `[${range[0]},*]`;
  }
  if (kind === 'range' && range) {
    const [min, max] = range;
    return `[${min},${max ?? min + 1}]`;
  }
  return CARDINALITY_OPTIONS.find((o) => o.value === kind)?.label ?? '';
}
