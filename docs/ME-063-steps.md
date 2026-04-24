# ME-063 实现步骤：确保 diagram 数据结构符合 JSON Schema

## 1. 理解和梳理 Schema 结构
- 阅读 docs/schema/diagram.schema.json，整理顶层字段及每种 element 的字段和类型要求：
  - **顶层字段**：
    - `version` (string, required)：schema 版本号，格式如 "1.0"
    - `metadata` (object, optional)：图表元数据，含 title, createdAt, updatedAt, author 等
    - `elements` (array, required)：所有图元的数组，元素类型为 type/relation/generalization/note
  - **元素类型定义**：
    - `typeElement`：id, type, name, semantics[], layout
    - `relationElement`：id, type, source, target, isDerived, semantics[], layout
    - `generalizationElement`：id, type, parentTypeId, childTypeIds[], completeness, semantics[], layout
    - `noteElement`：id, type, heading, content, attachedTo, layout
  - **通用嵌套结构**：
    - `layout`：x, y, width, height (number)
    - `relationEnd`：typeId, cardinality, cardinalityRange[]
    - `shortSemantic`：kind 及参数
    - `longSemanticHeading`：Constraint/Derivation/Note
  - 参考 docs/schema/README.md，理解语义层与布局层的分离原则。


## 2. 梳理现有 TypeScript 数据结构
- 阅读 src/models/diagram.ts，整理所有导出的 interface/type：
  - `TypeElement`：id, type, name, semantics?（可选）, layout
  - `RelationElement`：id, type, source, target, isDerived?, associationSemantics?, layout
  - `GeneralizationElement`：id, type, parentTypeId, childTypeIds[], completeness, layout
  - `LongSemanticElement`：id, type, heading, body, attachedTo?, layout
  - 相关嵌套类型：Layout, RelationEnd, ShortSemantic, PartitionCompleteness, LongSemanticHeading
  - `DiagramElement` 联合类型
  - `DiagramMetadata`：title, createdAt, updatedAt
- 标注每个字段的类型、可选性、默认值，并注意 TS 类型和 schema 的命名/结构差异。


## 3. 建立字段映射表并分析差异
- 对照 schema 和 TypeScript 类型，建立一一对应表，标出：
  - 缺失字段（如 schema 有但 TS 没有）
  - 类型不一致（如 schema 要求 string，TS 用 number）
  - 命名不一致或结构嵌套不同
  - 额外字段（TS 有但 schema 没有）

### 主要差异举例（初步分析）：
- schema 的 noteElement 用 `type: "note"`，TS 用 `LongSemanticElement` 和 `type: 'longSemantic'`，需统一
- noteElement 的内容字段 schema 用 `content`，TS 用 `body`
- schema 的所有 element 都允许 `semantics` 字段，TS 某些类型未实现
- relationElement 的 `semantics` 字段，TS 用 `associationSemantics`，schema 用 `semantics`
- generalizationElement schema 有 `semantics`，TS 未实现
- metadata 字段 schema 可选，TS 里为必填
- cardinalityRange 类型需严格对齐
- 需补充/调整 TS 类型，确保所有 required 字段都存在且类型一致

## 4. 补齐/调整 TypeScript 类型定义
- 按照 schema 要求，补充/修改 TS 类型定义，确保字段、类型、可选性、默认值完全一致。
- 处理所有 element 类型（type, relation, generalization, longSemantic/note）。
- 明确哪些字段是 required，哪些是 optional。

## 5. 全面修正数据创建/更新/导出逻辑
- 检查并修正所有创建、更新 diagram 数据的代码（如 useDiagramStore、fileStorage、exportStage 等），确保生成的数据结构符合 schema。
- 移除或迁移所有 schema 未定义的 legacy 字段。

## 6. 集成 JSON Schema 校验工具
- 安装 ajv（或类似库）作为 devDependency。
- 编写 validateDiagram(diagram): boolean 工具函数，利用 schema 校验 diagram 对象。
- 在 diagram 保存、导出等关键路径增加校验，开发模式下可在控制台输出校验结果。

## 7. 编写/补充单元测试
- 新建或补充测试用例，验证典型 diagram 对象能通过 schema 校验。
- 增加不合法结构的负例测试，确保校验能发现问题。

## 8. 完善开发文档和注释
- 在 docs/CODE_DESIGN.md 或新文档中，补充 diagram 数据结构说明，明确与 schema 的一一对应关系。
- 在 src/models/diagram.ts 类型定义处补充注释，说明字段含义和约束。
- 编写开发 checklist：任何 diagram 结构变更都需同步 schema 和 TS 类型，并通过校验。

---

可选进阶：
- 研究 schema-to-TypeScript 自动生成工具，减少手工同步负担（如 json-schema-to-typescript）。
- 在 CI 流程中自动校验所有导出 diagram 是否符合 schema。
