import type { ShortSemantic, CardinalityKind } from '@/models/diagram';

/**
 * Where a marker can be attached:
 *   - 'type'        → TypeElement.semantics
 *   - 'mapping'     → RelationEnd.semantics (one per end)
 *   - 'association' → RelationElement.associationSemantics (midpoint)
 *
 * Some markers additionally constrain the allowed endpoint/association:
 *   - requiresMultivalued: only valid on a mapping whose cardinality is multi-valued
 *   - requiresRecursive:   only valid on an association where source.typeId === target.typeId
 */
export type SemanticScope = 'type' | 'mapping' | 'association';

export type SemanticKind = ShortSemantic['kind'];

export interface SemanticCatalogEntry {
  kind: SemanticKind;
  /** Short display label inside brackets, e.g. "abstract", "key: …". */
  label: string;
  scopes: SemanticScope[];
  requiresMultivalued?: boolean;
  requiresRecursive?: boolean;
  /** True for markers that carry a parameter (e.g. `key: <type>`). */
  needsParam?: boolean;
}

/**
 * Authoritative catalog of short-semantic markers.
 * Keep in sync with docs/prd.md §3.1 (short semantic statements) and the
 * prototype's scope matrix (docs/ux_prototype/short-semantic-preview.html §5).
 *
 * NOTE: `range` is intentionally excluded — the prior `[n1, n2]` marker
 * duplicates the `range` cardinality and has been removed from the UI per
 * PRD v1.1 cleanup. The underlying ShortSemantic type still carries a
 * `range` variant for backward compatibility when loading older diagrams.
 */
export const SEMANTIC_CATALOG: SemanticCatalogEntry[] = [
  { kind: 'abstract', label: 'abstract', scopes: ['type', 'mapping'] },
  { kind: 'immutable', label: 'immutable', scopes: ['mapping'] },
  { kind: 'singleton', label: 'singleton', scopes: ['type'] },
  { kind: 'list', label: 'list', scopes: ['mapping'], requiresMultivalued: true },
  { kind: 'class', label: 'class', scopes: ['mapping'] },
  { kind: 'key', label: 'key', scopes: ['mapping'], needsParam: true },
  {
    kind: 'hierarchy',
    label: 'hierarchy',
    scopes: ['association'],
    requiresRecursive: true,
  },
  { kind: 'dag', label: 'dag', scopes: ['association'], requiresRecursive: true },
  {
    kind: 'multiple_hierarchies',
    label: 'multiple hierarchies',
    scopes: ['association'],
    requiresRecursive: true,
  },
  { kind: 'historic', label: 'historic', scopes: ['mapping'] },
];

const BY_KIND = new Map(SEMANTIC_CATALOG.map((e) => [e.kind, e]));

export function catalogEntry(kind: SemanticKind): SemanticCatalogEntry | undefined {
  return BY_KIND.get(kind);
}

/** Return true when `kind` can be attached under `scope` (ignoring card/recursion constraints). */
export function isKindAllowedInScope(kind: SemanticKind, scope: SemanticScope): boolean {
  const entry = BY_KIND.get(kind);
  if (!entry) return false;
  return entry.scopes.includes(scope);
}

/** Multi-valued = cardinality where the upper bound may be > 1. */
export function isMultivalued(cardinality: CardinalityKind): boolean {
  switch (cardinality) {
    case 'one_or_more':
    case 'zero_or_more':
    case 'two_or_more':
    case 'range':
      return true;
    default:
      return false;
  }
}

/** Human-readable full label for a marker, e.g. "abstract" or "key: CustomerId". */
export function labelOf(marker: ShortSemantic): string {
  switch (marker.kind) {
    case 'key':
      return `key: ${marker.keyType || '?'}`;
    case 'range': {
      const max = marker.max == null ? '*' : String(marker.max);
      return `${marker.min}, ${max}`;
    }
    case 'multiple_hierarchies':
      return 'multiple hierarchies';
    default:
      return marker.kind;
  }
}

/** Text to render on canvas inside brackets. */
export function renderBrackets(markers: ShortSemantic[] | undefined): string {
  if (!markers || markers.length === 0) return '';
  return markers.map((m) => `[${labelOf(m)}]`).join(' ');
}
