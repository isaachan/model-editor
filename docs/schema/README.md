# Model Editor - JSON Schema

## Overview

This is the JSON Schema definition for model diagrams in the Model Editor, following the Martin Fowler notation system from "Analysis Patterns".

## Design Principles

### Separation of Concerns

The schema clearly separates **semantic information** from **rendering/layout information**:

| Layer | Purpose | Contents |
|-------|---------|----------|
| **Semantic Layer** | Captures the domain model concepts | type names, relationships, cardinalities, constraints |
| **Layout Layer** | Captures visual rendering information | coordinates, sizes, path control points |

This separation enables:
- Pure semantic data export without layout
- Future layout algorithms can re-layout automatically
- Easier diffing and version control of model changes
- Backward compatible extension when layout features change

### Backward Compatibility

- Schema versioning follows [Semantic Versioning](https://semver.org/) (`major.minor`)
- `additionalProperties: false` is used at the top level for strict validation
- Individual element definitions allow future extensions via additional properties
- New element types can be added without breaking existing files

## Element Types

### 1. Type Element (`type: "type"`)

A core type node in the diagram, represented as a rectangle.

```json
{
  "id": "type-1",
  "type": "type",
  "name": "Party",
  "semantics": ["abstract"],
  "layout": { "x": 100, "y": 100, "width": 120, "height": 60 }
}
```

**Fields:**
- `id`: Unique identifier
- `type`: Must be `"type"` (discriminator)
- `name`: Type name displayed in the rectangle
- `semantics`: Array of short semantic markers
- `layout`: Layout information (x, y, width, height)

### 2. Relation Element (`type: "relation"`)

A relationship between two types with cardinality constraints on both ends.

```json
{
  "id": "rel-1",
  "type": "relation",
  "source": {
    "typeId": "type-2",
    "cardinality": "one_or_more"
  },
  "target": {
    "typeId": "type-4",
    "cardinality": "zero_or_more"
  },
  "isDerived": false,
  "semantics": []
}
```

**Cardinality Types:**

| Value | Meaning | Symbol |
|-------|---------|--------|
| `exactly_one` | Exactly one [1,1] | `||` |
| `zero_or_one` | Zero or one [0,1] | `○|` |
| `one_or_more` | One or more [1,*] | Crow's foot |
| `zero_or_more` | Zero or more [0,*] | ○ + Crow's foot |
| `two_or_more` | Two or more [2,*] | Crow's foot + "2" |
| `range` | Custom range [n,m] | `[n,m]` text |
| `unknown` | Unknown | `?` |
| `no_mapping` | No mapping in this direction | `X` |

### 3. Generalization Element (`type: "generalization"`)

A generalization partition container connecting a parent type to child types.

```json
{
  "id": "gen-1",
  "type": "generalization",
  "parentTypeId": "type-1",
  "childTypeIds": ["type-2", "type-3"],
  "completeness": "complete",
  "layout": { "x": 150, "y": 180, "width": 420, "height": 100 }
}
```

**Completeness:**
- `complete`: Complete partition (double bottom line) - all instances must belong to one of the subtypes
- `incomplete`: Incomplete partition (single bottom line) - allows instances not in any defined subtype

### 4. Note Element (`type: "note"`)

Long semantic statement in a folded corner note box.

```json
{
  "id": "note-1",
  "type": "note",
  "heading": "Constraint",
  "content": "A Person must be a member of at least one Organization.",
  "attachedTo": "rel-1",
  "layout": { "x": 50, "y": 450, "width": 280, "height": 80 }
}
```

**Heading Types:**

| Heading | Purpose |
|---------|---------|
| `Constraint` | Assertion that must be true for all instances |
| `Derivation` | How a derived relation is calculated |
| `Instances` | Enumeration of all valid instances |
| `Method` | Algorithm description for an operation |
| `Note` | Informal descriptive comment |
| `Overload` | How this type overloads inherited features |

## Short Semantic Markers

| Marker | Applies To | Meaning |
|--------|------------|---------|
| `abstract` | Type / Relation | Type cannot have direct instances / Relation must be implemented by subtypes |
| `immutable` / `imm` | Relation / Partition | Relation cannot be changed / Subtype cannot be changed |
| `singleton` | Type | Only one instance allowed |
| `list` | Relation (multi-value) | Return as ordered list |
| `class` | Relation | Relation belongs to the class (static), not to instances |
| `key` | Relation | Qualified key lookup |
| `hierarchy` | Recursive relation | Forms a tree hierarchy |
| `dag` | Recursive relation | Forms a directed acyclic graph |
| `multiple_hierarchies` | Recursive relation | Allows multiple hierarchies |
| `historic` | Relation | Keep historical connection trace |

## File Structure

```json
{
  "version": "1.0",
  "metadata": {
    "title": "Diagram Title",
    "createdAt": 1713500000000,
    "updatedAt": 1713600000000,
    "author": "Name"
  },
  "elements": [
    // ... array of elements
  ]
}
```

## Validation

You can validate any diagram against the schema using any JSON Schema validator:

```bash
# Using ajv CLI
npm install -g ajv-cli
ajv validate -s diagram.schema.json -d examples/sample-diagram.json
```

## Changelog

### 1.0 (2026-04-19)

- Initial schema version
- Covers all elements required for Phase 1:
  - Type, Relation, Generalization, Note
  - All cardinality types
  - All short semantic markers
  - All long semantic heading types
- Complete separation of semantics and layout
