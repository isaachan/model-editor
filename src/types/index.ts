// 基础元素类型
export type ElementType = 'type' | 'relation' | 'generalization' | 'semantic' | 'note';

// 基数类型
export type Cardinality =
  | 'exactly_one'      // [1,1]
  | 'zero_or_one'      // [0,1]
  | 'one_or_more'      // [1,*]
  | 'zero_or_more'     // [0,*]
  | 'two_or_more'      // [2,*]
  | 'range'            // [n,m]
  | 'unknown'           // ?
  | 'no_mapping';       // X

// 短语义标记类型
export type ShortSemantic =
  | 'abstract'
  | 'immutable'
  | 'imm'
  | 'singleton'
  | 'list'
  | 'class'
  | 'key'
  | 'hierarchy'
  | 'dag'
  | 'multiple_hierarchies'
  | 'historic';

// 长语义标题类型
export type LongSemanticHeading =
  | 'Constraint'
  | 'Derivation'
  | 'Instances'
  | 'Method'
  | 'Note'
  | 'Overload';

// 划分完整性
export type PartitionCompleteness = 'complete' | 'incomplete';

// 布局信息（渲染层）
export interface Layout {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Type 节点（业务层）
export interface TypeElement {
  id: string;
  type: 'type';
  name: string;
  semantics: ShortSemantic[];
  layout: Layout;
}

// 关系端点
export interface RelationEnd {
  typeId: string;
  cardinality: Cardinality;
  cardinalityRange?: [number, number]; // 用于 range 类型
}

// 关系线（业务层）
export interface RelationElement {
  id: string;
  type: 'relation';
  source: RelationEnd;
  target: RelationEnd;
  isDerived: boolean;
  semantics: ShortSemantic[];
  // 贝塞尔曲线控制点，用于路径调整
  controlPoints?: Array<{ x: number; y: number }>;
}

// 泛化划分（业务层）
export interface GeneralizationElement {
  id: string;
  type: 'generalization';
  parentTypeId: string;
  childTypeIds: string[];
  completeness: PartitionCompleteness;
  layout: Layout;
}

// 长语义便签（业务层）
export interface NoteElement {
  id: string;
  type: 'note';
  heading: LongSemanticHeading;
  content: string;
  attachedTo?: string; // 关联到哪个元素
  layout: Layout;
}

// 联合类型
export type ModelElement =
  | TypeElement
  | RelationElement
  | GeneralizationElement
  | NoteElement;

// 完整图表模型
export interface DiagramModel {
  version: string;
  elements: ModelElement[];
}

// 工具类型
export type Tool = 'select' | 'type' | 'relation' | 'generalization' | 'note';
