import type { LongSemanticHeading } from '@/models/diagram';

/**
 * Sticky-note visual parameters for LongSemanticElement.
 * Folded corner is on the top-right; heading rendered italic bold in its
 * heading color; body rendered as plain dark text beneath.
 */
export const LONG_SEMANTIC = {
  defaultWidth: 220,
  defaultHeight: 100,
  minWidth: 140,
  minHeight: 70,
  maxHeight: 400,
  fold: 18, // size of folded corner triangle
  padding: 10,
  headingGap: 6,
  lineHeight: 18,
  fontSize: 13,
  headingFontSize: 13,
  paper: '#fffbe6',
  border: '#d4b94e',
  foldFill: '#e9d380',
  bodyFill: '#1d1d1f',
  strokeHover: '#007aff',
  strokeSelected: '#007aff',
  connectorStroke: '#515154',
  connectorDash: [4, 3] as [number, number],
} as const;

export const LONG_SEMANTIC_HEADINGS: Array<{
  value: LongSemanticHeading;
  label: string;
  description: string;
  color: string;
}> = [
  {
    value: 'constraint',
    label: 'Constraint',
    description: '业务约束断言（Type）',
    color: '#b36200',
  },
  {
    value: 'derivation',
    label: 'Derivation',
    description: '派生映射计算逻辑（Relation）',
    color: '#2f6bff',
  },
  {
    value: 'note',
    label: 'Note',
    description: '非正式描述（任何对象）',
    color: '#515154',
  },
];

export function headingLabel(heading: LongSemanticHeading): string {
  return LONG_SEMANTIC_HEADINGS.find((h) => h.value === heading)?.label ?? heading;
}

export function headingColor(heading: LongSemanticHeading): string {
  return LONG_SEMANTIC_HEADINGS.find((h) => h.value === heading)?.color ?? '#515154';
}
