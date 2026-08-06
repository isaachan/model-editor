# ME-063 实现进度与任务清单

- [Done] 全局梳理 LongSemanticElement/longSemantic/旧类型引用
- [Done] models/diagram.ts 彻底移除 LongSemanticElement/longSemantic/旧类型，补全 NoteElement/DiagramElement 联合类型
- [Done] 主要组件、store、utils、constants、UI 相关 note 类型初步替换
- [Done] useDiagramStore.ts 内所有 note 相关类型判断、spread、类型断言修正，确保与最新 DiagramElement 联合类型兼容
- [Doing] useDiagramStore.ts 结构清理完成，准备补全 import 语句，主类型定义与实现体分离，cascadeDelete/type spread/type注解等关键问题已修正
    - [x] PartitionCompleteness 类型定义与导出，所有引用处修正
    - [x] LongSemanticHeading 类型首字母大写，所有引用处修正
    - [x] 移除 addLongSemanticAt 及 LongSemanticElement 相关遗留代码
    - [x] DiagramElement 类型导入与类型断言修正（import type/类型用法）
    - [x] cascadeDelete 及相关函数参数类型、any、类型断言修正
    - [x] semantics/childTypeIds/filter/map 参数类型注解补全
    - [x] 其他 any、隐式类型、类型断言、类型导入问题修正
    - [x] useDiagramStore 结构与实现体清理，准备补全 import 语句
    - [x] useDiagramStore.ts 顶部所有 import 语句补全，类型、工具函数、常量全部可用
        - [x] DiagramState 类型定义补全，store 结构与类型完全对齐
        - [x] cascadeDelete/recomputeAllContainers/findContainerOfType 实现与导入补全
        - [x] now 函数补全，所有时间戳相关代码修正
        - [x] 未使用 import 清理，消除所有 import/type/now 报错
    - [ ] 逐步消除所有 TypeScript 类型和语法错误，直至无误
    - [ ] 全局类型导入与类型断言二次检查，消除所有残留 any/类型不符
- [Backlog] PartitionCompleteness 类型导出与引用检查
- [Backlog] RelationEnd/RelationElement/GeneralizationElement/NoteElement 字段与 schema 对齐
- [Backlog] 全局二次检查 note/semantic/generalization/relation/type 相关类型、字段、判断、spread 操作
- [Backlog] 重新运行 dev server，curl 检查，console 检查
- [Backlog] 修复所有残留类型和运行时错误，直至无误

---

> 本文件用于追踪 ME-063 彻底 schema 对齐与重构进度，所有关键步骤与修正均需在此记录。