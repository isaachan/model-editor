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

// Placeholders for elements introduced in later stories.
export type DiagramElement = TypeElement;

export interface DiagramMetadata {
  title: string;
  createdAt: number;
  updatedAt: number;
}
