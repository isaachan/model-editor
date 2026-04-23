/**
 * Diagram element types.
 * Aligned with docs/schema/diagram.schema.json (Phase 1 subset).
 */

export type ElementId = string;

export interface Layout {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TypeElement {
  id: ElementId;
  type: 'type';
  name: string;
  /** Phase 1: not yet edited via UI but kept in shape for forward compatibility. */
  semantics?: ShortSemantic[];
  layout: Layout;
}

/** Cardinality enum (schema §definitions.cardinality). */
export type CardinalityKind =
  | 'exactly_one'
  | 'zero_or_one'
  | 'one_or_more'
  | 'zero_or_more'
  | 'two_or_more'
  | 'range'
  | 'unknown'
  | 'no_mapping';

export interface RelationEnd {
  typeId: ElementId;
  cardinality: CardinalityKind;
  /** [min, max] when cardinality === 'range'. max=null means unbounded (*). */
  cardinalityRange?: [number, number | null];
}

export interface RelationElement {
  id: ElementId;
  type: 'relation';
  source: RelationEnd;
  target: RelationEnd;
  isDerived?: boolean;
  semantics?: ShortSemantic[];
}

/** Discriminated union matching schema v1.1 shortSemantic. */
export type ShortSemantic =
  | { kind: 'abstract' }
  | { kind: 'immutable' }
  | { kind: 'singleton' }
  | { kind: 'list' }
  | { kind: 'class' }
  | { kind: 'hierarchy' }
  | { kind: 'dag' }
  | { kind: 'multiple_hierarchies' }
  | { kind: 'historic' }
  | { kind: 'key'; keyType: string }
  | { kind: 'range'; min: number; max: number | null };

// Placeholders for later-story elements (generalization, note) go here.
export type DiagramElement = TypeElement | RelationElement;

export interface DiagramMetadata {
  title: string;
  createdAt: number;
  updatedAt: number;
}

/** Type guards */
export const isType = (e: DiagramElement): e is TypeElement => e.type === 'type';
export const isRelation = (e: DiagramElement): e is RelationElement =>
  e.type === 'relation';

