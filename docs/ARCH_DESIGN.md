# 架构设计文档 (ARCH_DESIGN.md)

> Model Editor - Martin Fowler 分析模式建模编辑器

---

## 0. 文档范围

本文档描述的是 **第一阶段（MVP）的实现架构**：纯前端 + localStorage，无后端、无协作。
PRD 第 5 章中提到的 PostgreSQL、Node.js/Express、WebSocket 等属于长期目标架构，在本文档范围之外，
会在后续阶段（Phase 2：协作；Phase 4：部署）单独补充架构文档。

---

## 1. 技术栈决策

### 1.1 核心框架

| 技术 | 选型 | 决策理由 |
|------|------|----------|
| **UI 框架** | React 18 | 成熟的生态，Konva.js 有完美的 React 绑定，组件化思维适合编辑器 |
| **语言** | TypeScript 5.x | 类型安全，配合 JSON Schema 可生成类型定义，减少运行时 Bug |
| **状态管理** | Zustand 5.x | 极简主义，符合 Apple "少即是多" 设计哲学；API 优雅，无样板代码；支持 Immer 中间件做不可变更新 |
| **图形渲染** | Konva.js | 基于 Canvas 2D，性能优秀；内置拖拽、缩放、事件系统；完美支持 React (react-konva) |

### 1.2 构建与工具链

| 技术 | 选型 | 决策理由 |
|------|------|----------|
| **构建工具** | Vite 6.x | 开发服务器启动快，HMR 响应迅速，适合编辑器类项目的开发体验 |
| **代码规范** | ESLint + Prettier | 标准配置，保证代码风格一致性 |
| **样式方案** | CSS Variables + Tailwind CSS 4.x | 原子化 CSS 配合设计系统的 CSS 变量，快速实现 Apple 风格 UI |
| **类型验证** | TypeScript + Zod (可选) | 运行时数据验证，用于导入导出的 Schema 校验 |

### 1.3 功能库

| 功能 | 选型 | 备注 |
|------|------|------|
| **唯一 ID 生成** | `nanoid` | 轻量，生成短 ID 用于元素标识 |
| **深拷贝** | 原生 `structuredClone` | 浏览器原生支持，用于历史栈 |
| **导出 PNG** | Konva `toDataURL` + `canvas-toBlob` | 内置支持，无需额外库 |
| **导出 SVG** | Konva `toSVG` | 内置支持 |

---

## 2. 目录结构设计

```
model-editor/
├── public/                      # 静态资源
│   └── favicon.ico
├── src/
│   ├── assets/                  # 静态资源（图标、字体等）
│   ├── components/              # React 组件
│   │   ├── Toolbar/            # 顶部工具栏
│   │   ├── LeftSidebar/        # 左侧形状库
│   │   ├── Canvas/             # 画布区域
│   │   │   ├── Canvas.tsx      # 画布容器
│   │   │   ├── TypeNode.tsx    # Type 节点渲染
│   │   │   ├── RelationLine.tsx # 关系线渲染
│   │   │   ├── GeneralizationBox.tsx # 泛化容器
│   │   │   └── NoteBox.tsx     # 语义便签
│   │   ├── RightSidebar/       # 右侧属性面板
│   │   ├── StatusBar/          # 底部状态栏
│   │   └── ZoomControls/       # 缩放控制
│   ├── store/                   # 状态管理
│   │   ├── useDiagramStore.ts  # 图表数据 Store
│   │   ├── useEditorStore.ts   # 编辑器状态 Store（选中、工具模式等）
│   │   └── useHistoryStore.ts  # 撤销重做历史栈
│   ├── models/                  # 类型定义
│   │   ├── diagram.ts          # 从 JSON Schema 生成的类型
│   │   └── editor.ts           # 编辑器状态类型
│   ├── utils/                   # 工具函数
│   │   ├── cardinality.ts      # 基数符号绘制逻辑
│   │   ├── geometry.ts         # 几何计算（连线、吸附等）
│   │   ├── export.ts           # 导出工具
│   │   └── storage.ts          # localStorage 持久化
│   ├── constants/               # 常量定义
│   │   ├── designTokens.ts     # 设计系统 Token（颜色、圆角等）
│   │   └── defaults.ts         # 默认值配置
│   ├── hooks/                   # 自定义 Hooks
│   │   ├── useKeyboard.ts      # 键盘快捷键
│   │   ├── useAutoSave.ts      # 自动保存
│   │   └── useZoomPan.ts       # 缩放平移控制
│   ├── styles/                  # 全局样式
│   │   ├── globals.css         # 全局 CSS + CSS Variables
│   │   └── reset.css           # 样式重置
│   ├── App.tsx                  # 根组件
│   ├── main.tsx                 # 入口文件
│   └── vite-env.d.ts           # Vite 类型声明
├── docs/                        # 文档目录（已有）
│   ├── prd.md
│   ├── VISUAL_DESIGN.md
│   ├── ARCH_DESIGN.md
│   ├── stories.csv
│   ├── schema/
│   └── diagram-samples/
├── .gitignore
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
├── .eslintrc.cjs
└── README.md
```

---

## 3. 核心架构原则

### 3.1 数据与渲染分离

**严格遵循 PRD 中的设计：**

```
┌─────────────────────────────────────────┐
│          语义数据 (Semantic)            │  ← 持久化、可导出
│  ┌─────────────┐  ┌─────────────┐      │
│  │   Type      │  │  Relation   │  ...  │
│  └─────────────┘  └─────────────┘      │
├─────────────────────────────────────────┤
│          布局数据 (Layout)              │  ← 仅用于渲染
│  ┌───────────────────────────────────┐ │
│  │  x, y, width, height, rotation    │ │
│  └───────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

**原则：**
- 语义数据是核心，布局数据是附属
- 纯语义导出时可以丢弃所有 layout 字段
- 历史栈记录的是语义数据 + 布局数据的整体快照

### 3.2 状态分层

```
┌─────────────────────────────────────┐
│        Editor State (UI 层)         │  瞬态，不持久化
│  - 当前选中工具 (select/type/line)  │
│  - 选中元素 ID 集合                 │
│  - 缩放比例、画布偏移               │
│  - 悬停元素 ID                      │
├─────────────────────────────────────┤
│       Diagram State (数据层)        │  持久化，进历史栈
│  - elements[] (所有图表元素)        │
│  - metadata (标题、时间戳等)        │
├─────────────────────────────────────┤
│       History State (历史层)        │  独立管理
│  - past[]   撤销栈                 │
│  - future[] 重做栈                 │
│  - pointer  当前位置               │
└─────────────────────────────────────┘
```

### 3.3 单向数据流

```
  User Action
      ↓
  Action Creator (更新 Store)
      ↓
  Store 更新 → 触发 React 重渲染
      ↓
  Konva Canvas 重绘
      ↓
  (可选) 推入历史栈
      ↓
  (可选) 触发自动保存
```

---

## 4. 状态管理详细设计

### 4.1 Diagram Store (图表数据)

```typescript
// store/useDiagramStore.ts
interface DiagramState {
  version: string;
  metadata: {
    title: string;
    createdAt: number;
    updatedAt: number;
  };
  elements: DiagramElement[];  // type | relation | generalization | note
  
  // Actions
  addElement: (element: DiagramElement) => void;
  updateElement: (id: string, updates: Partial<DiagramElement>) => void;
  deleteElement: (id: string) => void;
  setElements: (elements: DiagramElement[]) => void;
  clearAll: () => void;
}
```

**设计要点：**
- 所有元素通过 `id` 唯一标识
- 更新使用 partial update，便于细粒度更新
- 删除 Type 时，级联删除关联的 relations

### 4.2 Editor Store (编辑器状态)

```typescript
// store/useEditorStore.ts
type ToolMode = 'select' | 'type' | 'relation' | 'generalization' | 'note';

interface EditorState {
  currentTool: ToolMode;
  selectedIds: string[];
  hoveredId: string | null;
  zoom: number;           // 1.0 = 100%
  panX: number;           // 画布水平偏移
  panY: number;           // 画布垂直偏移
  gridEnabled: boolean;   // 网格显示
  snapEnabled: boolean;   // 网格吸附
  isDragging: boolean;
  
  // Actions
  setTool: (tool: ToolMode) => void;
  select: (id: string | string[]) => void;
  deselectAll: () => void;
  setZoom: (zoom: number) => void;
  setPan: (x: number, y: number) => void;
  resetView: () => void;
}
```

### 4.3 History Store (历史栈)

```typescript
// store/useHistoryStore.ts
interface HistoryState {
  past: DiagramState[];    // 撤销栈 (最近的在末尾)
  future: DiagramState[];  // 重做栈
  maxSize: number;         // 最大历史记录数 = 100
  
  // Actions
  push: (state: DiagramState) => void;  // 执行新操作，清空 future
  undo: () => DiagramState | null;
  redo: () => DiagramState | null;
  canUndo: () => boolean;
  canRedo: () => boolean;
}
```

**历史栈规则：**
- 每次用户操作后，将当前 diagram state 推入历史栈
- 推入新状态时，清空 future 栈
- 栈满时，丢弃最旧的记录（FIFO）
- 防抖：连续快速操作（如拖拽）合并为一条历史记录

---

## 5. 渲染层设计 (Konva.js)

### 5.1 Canvas 分层策略

Konva 原生支持 Layer 分层，优化渲染性能：

```
┌─────────────────────────────────────┐
│           Selection Layer           │  最上层：选中框、控制点
├─────────────────────────────────────┤
│             Note Layer              │  便签框（在连线之上）
├─────────────────────────────────────┤
│           Relation Layer            │  关系线、基数符号
├─────────────────────────────────────┤
│             Type Layer              │  Type 节点、泛化容器
├─────────────────────────────────────┤
│             Grid Layer              │  最底层：网格背景
└─────────────────────────────────────┘
```

**优化：** 只有变化的 Layer 才会重绘

### 5.2 关系线渲染逻辑

```
            Source                        Target
              ◆                            ◆
              │                            │
              ├────────────────────────────┤
              │                            │
        [0,*] Crow Foot              [1,1] Bar
      (在 Source 端绘制)           (在 Target 端绘制)
```

**关键几何计算（utils/geometry.ts）：**
1. **边框交点计算**：给定两个矩形中心点，计算连线与边框的精确交点
2. **乌鸦脚绘制**：根据基数类型，在交点处绘制精确的符号（15px 宽标准）
3. **标注位置**：语义标记文本在线条中点沿法线方向偏移

---

## 6. 键盘快捷键设计

| 快捷键 | 功能 |
|--------|------|
| `V` | 切换到选择工具 |
| `T` | 切换到 Type 工具 |
| `L` | 切换到关系线工具 |
| `N` | 切换到便签工具 |
| `Delete` / `Backspace` | 删除选中元素 |
| `Ctrl/Cmd + Z` | 撤销 |
| `Ctrl/Cmd + Y` / `Ctrl/Cmd + Shift + Z` | 重做 |
| `Ctrl/Cmd + A` | 全选 |
| `Escape` | 取消选中 / 取消当前操作 |
| `Space + Drag` | 平移画布 |
| `Ctrl/Cmd + +` | 放大 |
| `Ctrl/Cmd + -` | 缩小 |
| `Ctrl/Cmd + 0` | 重置视图（100%） |

---

## 7. 自动保存机制

```typescript
// hooks/useAutoSave.ts
const SAVE_DEBOUNCE_MS = 2000;  // 停止操作 2 秒后保存
const STORAGE_KEY = 'model-editor-current';

// 流程：
// 1. 监听 diagramStore 的变化
// 2. 防抖延迟 SAVE_DEBOUNCE_MS
// 3. 序列化整个 diagram state
// 4. 写入 localStorage
// 5. 异常处理：配额超限、序列化失败
```

**加载流程：**
- 应用启动时，尝试从 localStorage 读取
- 读取失败或无数据 → 使用空图表初始化

---

## 8. 导出机制

### 8.1 SVG 导出
- 使用 Konva `stage.toSVG()`
- 导出范围：内容边界（所有元素的 bounding box + margin）
- 注意：字体嵌入问题（使用系统字体）

### 8.2 PNG 导出
- 使用 Konva `stage.toDataURL({ pixelRatio: 2 })`
- 支持 1x / 2x 分辨率选项
- 透明背景或白色背景可选

---

## 9. 性能优化策略

| 优化点 | 策略 |
|--------|------|
| **渲染性能** | Konva 分层渲染，只重绘变化的层 |
| **元素过多** | 虚拟渲染（超出视口的元素不渲染） |
| **历史栈** | 深拷贝只在 push 时执行，undo/redo 直接引用 |
| **自动保存** | 防抖 + 增量序列化 |
| **拖拽** | requestAnimationFrame 批量更新 |
| **重绘频率** | 拖拽时只更新位置，不触发副作用 |

---

## 10. 开发里程碑与优先级

### P0 - 最小可用版本 (MVP)
- [x] ME-001: JSON Schema 定义
- [ ] ME-002: 项目脚手架初始化
- [ ] ME-003: 四栏式基础布局
- [ ] ME-004: Konva.js 集成
- [ ] ME-005 ~ ME-011: Type 节点创建/选择/拖拽/属性编辑
- [ ] ME-021 ~ ME-023: 画布缩放、平移、重置视图

### P1 - 核心建模功能
- [ ] ME-012 ~ ME-018: 关系线 + 基数符号
- [ ] ME-019: 删除元素
- [ ] ME-024 ~ ME-025: 撤销/重做
- [x] ME-026: 创建新图表文件（顶部工具栏 New 按钮 + 文件下拉的 "+ New Diagram"）
- [x] ME-027: localStorage 多图表自动保存（keys: `model-editor:files:index` / `model-editor:files:<id>` / `model-editor:session:currentFileId`；debounce 800ms；配额错误在状态栏显示）
- [x] ME-044: 历史栈框架（useHistoryStore：past/future/push/undo/redo/canUndo/canRedo，上限 100；subscribe + 400ms debounce 收敛连续拖拽；isApplyingHistory 屏蔽 file-load 触发的 push）
- [x] ME-047: 图表切换下拉（Toolbar 右侧按 updatedAt 倒序，新建入口，高亮当前）
- [x] ME-048: 重命名/删除（标题双击改名，列表项 ✕ 按钮 + confirm；删除当前自动切换；列表为空时自动新建）

### P2 - 完整 Fowler 符号
- [x] ME-028 ~ ME-031: 泛化划分容器（GeneralizationBox：自动收缩/扩展到包含子 Type；容器本身含父连接线；完整=单底边，不完整=底部内侧增补一条水平线；删除容器时子 Type 释放为自由 Type，删除父 Type 时级联删除其容器）
- [ ] ME-032 ~ ME-034: 短语义陈述
- [ ] ME-035 ~ ME-038: 长语义便签
- [ ] ME-039 ~ ME-040: 网格 + 吸附

### P3 - 导出功能
- [ ] ME-041: 导出 SVG
- [ ] ME-042: 导出 PNG
- [ ] ME-043: 清空画布

---

## 11. 代码质量保障

### 11.1 类型安全
- 从 `diagram.schema.json` 自动生成 TypeScript 类型
- Store 所有 action 参数类型化
- Konva 组件 Props 严格类型

### 11.2 测试策略

**测试金字塔：**

```
    ┌─────────────────────┐
    │  E2E 测试 (5%)       │  核心工作流：创建→编辑→导出
    ├─────────────────────┤
    │  集成测试 (15%)      │  Store 集成、组件交互
    ├─────────────────────┤
    │  单元测试 (80%)      │  工具函数、纯逻辑
    └─────────────────────┘
```

**单元测试范围：**
- `utils/geometry.ts` — 几何计算（边框交点、距离、吸附计算）
- `utils/cardinality.ts` — 基数符号绘制逻辑、路径生成
- `utils/export.ts` — 导出数据转换
- History Store — push/undo/redo 边界情况

**集成测试范围：**
- Diagram Store — 增删改查操作、级联删除（删除 Type 同时删除关联 Relation）
- Editor Store — 工具切换、多选、选中状态管理
- 主要 React 组件渲染（TypeNode、RelationLine）

**E2E 测试范围 (Playwright)：**
- 创建 Type 节点 → 修改名称 → 删除
- 创建两个 Type → 连接关系线 → 设置两端基数
- 缩放 + 平移画布 → 重置视图
- 执行操作 → 撤销 → 重做
- 导出 PNG / SVG 功能

**测试工具选型：**
- 单元测试：Vitest
- React 组件测试：@testing-library/react
- E2E 测试：Playwright（可选，P2 优先级）

---

## 12. 开发流程规范

### 12.1 Story 驱动开发
- 每个开发任务必须对应 `stories.csv` 中的一个 User Story
- 开发前确认 Story 状态，从 Backlog 中按优先级选取，并更新被选取的 Story 状态 -> InDev
- 完成后更新 Story 状态 → Done

### 12.2 提交规范
- 遵循 Conventional Commits 格式
- `feat(ME-XXX): 实现 Type 节点创建功能`
- `fix(ME-XXX): 修复关系线拖拽时不跟随的问题`
- `docs: 更新架构设计文档`

*文档版本：1.1*
*最后更新：2026-04-23*
*架构确认：可开始 Phase 1 开发*