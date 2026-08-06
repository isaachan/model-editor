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
  semantics: ShortSemantic[]; // required, default []
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
  /** Only present when cardinality === 'range' */
  cardinalityRange?: [number, number];
}

export interface RelationElement {
  id: ElementId;
  type: 'relation';
  source: RelationEnd;
  target: RelationEnd;
  isDerived?: boolean;
  semantics: ShortSemantic[]; // required, default []
  layout?: RelationLayout;
}

export interface RelationLayout {
  controlPoints?: Point[];
  sourceLabelOffset?: Point;
  export interface NoteElement {
    id: ElementId;
    type: 'note';
    heading: LongSemanticHeading;
    content: string;
    attachedTo?: ElementId;
    layout: Layout;
  }
  targetLabelOffset?: Point;
  semanticLabelOffset?: Point;
}

export interface Point {
    | NoteElement;
  x: number;
  y: number;
}

/** Discriminated union matching schema v1.1 shortSemantic. */
export type ShortSemantic =
  | { kind: 'abstract' }
  | { kind: 'class' }
  | { kind: 'hierarchy' }
  | { kind: 'dag' }
export const isRelation = (e: DiagramElement): e is RelationElement => e.type === 'relation';
export const isGeneralization = (e: DiagramElement): e is GeneralizationElement => e.type === 'generalization';
export const isNote = (e: DiagramElement): e is NoteElement => e.type === 'note';
/**
// 兼容旧类型定义，彻底移除 LongSemanticElement 相关内容
// export interface LongSemanticElement { ... }
// export const isLongSemantic = ...
 * The connector line from parent to container is a rendering detail of
 * this element (NOT a separate `relation`).
 */
export interface GeneralizationElement {
  id: ElementId;
  type: 'generalization';
  parentTypeId: ElementId;
  childTypeIds: ElementId[];
  completeness: PartitionCompleteness;
  /** Auto-computed from childTypeIds bbox + padding; falls back to defaults when empty. */
  layout: Layout;
}

/**
 * Long semantic statement — the "folded-corner sticky note" symbol in Fowler
 * notation. Phase 1 supports three headings (Constraint / Derivation / Note);
 * the reserved headings Instances / Method / Overload depend on Types owning
 * attributes/operations and are deferred.
 *
 * `attachedTo` is an optional id of a Type or Relation. A note with no
 * attachment is rendered alone; a note with attachment renders a dashed
 * connector from its nearest edge to the host's nearest edge. Notes are
 * positioned in absolute canvas coordinates and do NOT follow their host
 * when the host is moved — only the dashed connector is re-routed.
 */
export type LongSemanticHeading = 'Constraint' | 'Derivation' | 'Note';

export interface LongSemanticElement {
  id: ElementId;
  type: 'longSemantic';
  heading: LongSemanticHeading;
  body: string;
  attachedTo?: ElementId;
  layout: Layout;
}

export interface DiagramMetadata {
  title: string;
  createdAt: number;
  updatedAt: number;
  author?: string;
}

/** Type guards */
export const isType = (e: DiagramElement): e is TypeElement => e.type === 'type';
export const isRelation = (e: DiagramElement): e is RelationElement => e.type === 'relation';
export const isGeneralization = (e: DiagramElement): e is GeneralizationElement => e.type === 'generalization';
export const isNote = (e: DiagramElement): e is NoteElement => e.type === 'note';

// PartitionCompleteness: 'complete' | 'incomplete' (schema enum)
export type PartitionCompleteness = 'complete' | 'incomplete';

// DiagramElement 联合类型
export type DiagramElement = TypeElement | RelationElement | GeneralizationElement | NoteElement;

