# 建模编辑器 - Apple 风格设计说明

## 设计理念

本设计深度遵循 Apple 的设计语言，核心原则：

1. **极简主义 (Minimalism)** — 去除一切不必要的元素，只保留最核心的功能
2. **层次清晰 (Depth & Clarity)** — 通过玻璃拟态、微妙阴影营造空间层次感
3. **动效细腻 (Delightful Animations)** — 每一个交互都有自然、恰到好处的反馈
4. **一致性 (Consistency)** — 所有控件的圆角、间距、颜色都遵循统一的设计系统

---

## 设计规范

### 颜色系统

| 变量 | 值 | 用途 |
|------|-----|------|
| `--bg-primary` | `#f5f5f7` | 主背景（Apple 经典浅灰） |
| `--glass-bg` | `rgba(255, 255, 255, 0.72)` | 玻璃面板背景 |
| `--text-primary` | `#1d1d1f` | 主要文字（深灰黑） |
| `--text-secondary` | `#86868b` | 次要文字 |
| `--accent-blue` | `#007aff` | 强调色（系统蓝） |
| `--accent-purple` | `#af52de` | 语义标记色 |
| `--separator` | `rgba(0, 0, 0, 0.08)` | 分割线 |

### 圆角系统

| 类型 | 圆角值 | 应用场景 |
|------|--------|----------|
| XL | 20px | 弹出菜单、Toast |
| LG | 14px | 侧边栏按钮、缩放控件 |
| MD | 10px | 工具栏按钮、基数选择器 |
| SM | 6px | 输入框、语义标记 |

**重要：Martin Fowler 的图形符号（Type Box、Partition 等）不使用圆角，保持直角以严格遵循 UML 规范。**

---

## 界面组件

### 1. 顶部工具栏 (Toolbar)

**玻璃拟态风格：**
- 背景: 72% 不透明度的白色 + 20px 毛玻璃模糊
- 分割线: 8% 不透明度的黑色
- 按钮: 透明背景 + hover 时 5% 黑色遮罩 + active 时缩放 0.96
- 选中状态: 纯蓝色填充 (`#007aff`)

**功能分区：**
```
[ 文件操作 ] — [ 撤销/重做 ] — [ 工具选择 ] — [ 文档标题 ] — [ 导出/分享 ] — [ 协作者头像 ]
```

### 2. 左侧形状库 (Shape Library)

- 宽度: 64px 的窄边栏
- 图标按钮: 48x48px，大点击区域
- 选中状态: 12% 透明度蓝色背景 + 内嵌蓝色边框（符合 Apple 选中样式）

**包含元素：**
- Type Box (类型框)
- Connection (连接线)
- Complete Partition (完整划分 - 双底线)
- Incomplete Partition (不完整划分 - 单底线)
- Semantic Note (语义便签)

### 3. 画布区域 (Canvas)

- 浅灰色网格背景 (20px 间距，1px 圆点)
- 所有 Martin Fowler 符号**严格遵循 PRD 和图例**：
  - Type Box: 直角矩形、无圆角、1.5px 边框
  - Cardinality: 严格的乌鸦脚表示法（Exactly One/Zero or One/One or More/Zero or More）
  - Partition: 完整划分 = 双底线，不完整划分 = 单底线
  - Semantic Markers: `[abstract]`, `[hierarchy]` 等紫色标记
  - Semantic Note: 淡黄色便签，轻微旋转的自然效果

### 4. 右侧属性面板 (Inspector)

- 玻璃拟态背景 + 左侧边框
- 标签使用全大写 + 字间距 0.3px 的 Apple 风格
- 语义标记网格布局
- 基数选择的可视化预览

### 5. 底部状态栏 (Status Bar)

- 高度 28px 的窄条
- 连接状态呼吸动画 (pulse)
- 显示节点数量、选中状态、当前缩放级别

### 6. 缩放控制 (Zoom Controls)

- 右下角浮动面板
- 玻璃拟态风格
- 垂直布局: + / − / 百分比 / 适应画布

---

## 交互设计

### 选择状态
- 蓝色外发光: `0 0 0 3px rgba(0, 122, 255, 0.3)`
- 增强的阴影效果

### 悬停反馈
- 按钮: 背景透明度变化
- 节点: 阴影增强 (`0 4px 16px rgba(0, 0, 0, 0.1)`)
- 协作者头像: 缩放 1.1 倍

### 动效曲线
- 所有过渡使用 Apple 标准贝塞尔曲线: `cubic-bezier(0.25, 0.1, 0.25, 1)`
- 快速过渡: 150ms
- 正常过渡: 300ms

---

## 字体规范

```css
font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'SF Pro Display', sans-serif;
```

- 优先使用系统原生字体 (SF Pro)
- Fallback 到 Inter
- 字重分布: 300/400/500/600/700

---

## 特殊说明

### 符号保真度 > 视觉风格

**关键原则：Fowler 的符号规范优先级最高**

- Type Box 必须是**直角**，不能有圆角
- 基数的乌鸦脚表示法必须严格按照图例
- 完整划分的双底线、不完整划分的单底线不能混淆
- 语义便签使用淡黄色经典便签样式

### 玻璃拟态的正确使用

```css
backdrop-filter: blur(20px) saturate(1.2);
-webkit-backdrop-filter: blur(20px) saturate(1.2);
```

- 模糊半径 20px (macOS 风格)
- 饱和度 1.2 (抵消模糊带来的灰度效果)
- 背景不透明度 72% (平衡可读性和通透感)

---

## 技术栈建议

- **框架**: React + TypeScript
- **图形库**: Canvas 2D / Konva.js
- **状态管理**: Zustand (简单轻量，符合 Apple 的"少即是多")
- **样式方案**: CSS Variables + Tailwind (或 styled-components)
- **协作**: Yjs + WebSocket (CRDT 算法，自动冲突解决)

---

*Design inspired by Apple Human Interface Guidelines*
*Fowler notation strictly per Analysis Patterns: Reusable Object Models (1996)*
