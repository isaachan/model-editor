# User Stories - 建模图编辑器

## 第一阶段：基础功能

| ID | User Story | Priority | Type | Status | Remark | Acceptance Condition |
|----|------------|----------|------|--------|--------|----------------------|
| ME-001 | As a 建模者, I want 能够缩放和平移画布, so that 我可以在不同尺寸下查看和编辑大图 | High | Business Story | Backlog | 提供画布基础操作能力，包括缩放、平移、重置视图，这是所有绘图操作的基础 | |
| ME-002 | As a 建模者, I want 能够创建 Type 节点, so that 我可以在图中表示领域概念 | High | Business Story | Backlog | Type 是Martin Fowler符号体系中的核心元素，用矩形方块表示，内部只需要显示名称 | |
| ME-003 | As a 建模者, I want 能够在两个 Type 之间创建关系并标注基数, so that 我可以表达类型之间的关联约束 | High | Business Story | Backlog | 这是该建模方法的核心特征，连线两端都需要标注基数，支持所有定义好的基数符号 | |
| ME-004 | As a 建模者, I want 能够创建类型泛化划分, so that 我可以表达父类和子类之间的分类关系 | High | Business Story | Backlog | 父类型连接到一个容器框，容器框内包含多个子类型，容器框底线区分完整划分和不完整划分 | |
| ME-005 | As a 建模者, I want 能够添加短语义陈述, so that 我可以为类型或关系附加简短约束标记 | High | Business Story | Backlog | 使用方括号 `[marker]` 标注在类型框顶部或关系线上，支持所有预定义的短语义标记 | |
| ME-006 | As a 建模者, I want 能够添加长语义陈述便签, so that 我可以详细描述复杂的业务规则 | High | Business Story | Backlog | 使用折角便签符号，支持按标题分类：Constraint、Derivation、Instances、Method、Note、Overload | |
| ME-007 | As a 建模者, I want 能够删除选中的元素, so that 我可以纠正错误的创建 | High | Business Story | Backlog | 支持选中单个或多个元素后删除 | |
| ME-008 | As a 建模者, I want 能够清空整个画布, so that 我可以重新开始一张新图 | High | Business Story | Backlog | 提供清空画布功能，需要二次确认防止误操作 | |
| ME-009 | As a 建模者, I want 能够使用拖放来调整元素位置, so that 我可以重新布局图表 | High | Business Story | Backlog | 支持拖放调整单个元素位置，关系线自动跟随重绘 | |
| ME-010 | As a 建模者, I want 能够撤销/重做我的操作, so that 我可以方便地回滚错误操作 | High | Business Story | Backlog | 维护操作历史栈，支持撤销和重做 | |
| ME-011 | As a 建模者, I want 能够将图表保存到浏览器本地存储, so that 我下次打开可以继续编辑 | High | Business Story | Backlog | 第一阶段使用 localStorage 存储单张图表，自动保存 | |
| ME-012 | As a 建模者, I want 能够将图表导出为 SVG 格式, so that 我可以在其他文档中使用矢量图 | Middle | Business Story | Backlog | 导出当前画布内容为SVG文件，保留所有元素和样式 | |
| ME-013 | As a 建模者, I want 能够将图表导出为 PNG 格式, so that 我可以方便地分享给他人 | Middle | Business Story | Backlog | 导出当前画布内容为PNG图片，支持不同分辨率 | |
| ME-014 | As a 技术 story, I want 建立项目脚手架, so that 开发可以开始进行 | High | Technical Task | Backlog | 创建前端项目骨架，配置好构建工具、依赖、目录结构 | |
| ME-015 | As a 技术 story, I want 实现网格和吸附对齐功能, so that 用户可以画出整齐的图表 | Middle | Technical Task | Backlog | 显示背景网格，移动元素时自动吸附到网格线 | |

