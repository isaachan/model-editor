# CODE_DESIGN.md

本文件旨在帮助新开发者快速理解 model-editor 的 src 目录代码结构、核心模块、数据流与扩展点。

---

## 1. 目录结构与职责

- **App.tsx / main.tsx**：应用入口，挂载主组件，初始化全局样式。
- **components/**：UI 组件，分为画布（Canvas）、工具栏、侧边栏、状态栏等子目录。
- **store/**：Zustand 状态管理，分为 diagram（图数据）、editor（UI 状态）、history（历史栈）、files（文件管理）。
- **models/**：核心类型定义，diagram.ts（图元素/关系/泛化/语义等）、editor.ts（工具模式等）。
- **utils/**：纯函数工具库，几何计算、基数符号、导出、路由、localStorage 持久化等。
- **constants/**：常量配置，默认样式、语义定义等。
- **hooks/**：自定义 React Hooks，如 useBootstrap（初始化）、useAutoSave（自动保存）。
- **styles/**：全局 CSS。

---

## 2. 应用入口与主组件结构

- **main.tsx**：入口，挂载 `<App />` 到 #root。
- **App.tsx**：主布局，包含 Toolbar、LeftSidebar、Canvas、RightSidebar、StatusBar。
  - Toolbar：顶部工具栏，切换工具/文件等
  - LeftSidebar/RightSidebar：属性、文件、元素列表等
  - Canvas：核心画布，承载所有图形渲染
  - StatusBar：底部状态栏

---

## 3. 状态管理（Zustand stores）

- **useDiagramStore.ts**：图表语义数据（elements、metadata），及所有增删改查、拖拽、关系/泛化等操作。
- **useEditorStore.ts**：UI 状态（当前工具、选中/悬停元素、画布缩放/平移、网格/吸附等），支持多选、快捷键、视图重置。
- **useHistoryStore.ts**：历史快照栈，支持撤销/重做，带防抖合并（如拖拽连续操作）。
- **useFilesStore.ts**：本地文件管理，支持多文件、重命名、删除、切换，基于 localStorage。

---

## 4. 数据模型与类型

- **models/diagram.ts**：定义 Type、Relation、Generalization、Note 等元素类型，Cardinality（基数）、Layout（位置/尺寸）、Short/LongSemantic（语义标记）等。
- **models/editor.ts**：定义 ToolMode（工具模式枚举），配合 editor store 管理 UI 状态。

---

## 5. 画布与核心渲染组件

- **Canvas/Canvas.tsx**：主画布，分层渲染（Type、Relation、Generalization、Note、Selection、Grid），响应拖拽、缩放、选择等交互。
- **TypeNode.tsx**：类型节点渲染，支持选中/悬停/拖拽。
- **RelationLine.tsx**：关系线渲染，支持基数符号、选中/悬停。
- **GeneralizationBox.tsx**：泛化容器，支持父子连接、完整/不完整分割。
- **StickyNote.tsx**：长语义便签。
- **CardinalityMarker.tsx**：基数符号（乌鸦脚、圆圈、区间等）渲染。

---

## 6. 工具函数与常用扩展点

- **utils/geometry.ts**：几何计算（节点自适应尺寸、边框交点、距离等）。
- **utils/cardinality.ts**：基数符号 label/渲染辅助。
- **utils/routing.ts**：正交连线、路径计算。
- **utils/exportStage.ts / exportSvg.ts**：画布导出为 PNG/SVG。
- **utils/fileStorage.ts**：localStorage 读写封装。
- **utils/history.ts**：历史快照辅助。

---

## 7. 文件管理与本地存储

- 支持多文件，自动保存（防抖），切换/重命名/删除，所有数据持久化于 localStorage。
- 文件结构与索引见 utils/fileStorage.ts。

---

## 8. 推荐开发/扩展方式

- 新增功能优先查阅 docs/ARCH_DESIGN.md、stories.csv，确保符合架构与 Story 驱动开发。
- 新增 UI 组件放入 components/，保持分层清晰。
- 状态变更优先通过 zustand store，避免组件间直接传递。
- 工具函数保持纯函数、可单元测试。
- 遵循 Conventional Commits 规范提交。

---

如需更详细的接口/流程说明，请查阅 docs/ARCH_DESIGN.md、src/models/diagram.ts 及各 store 文件。