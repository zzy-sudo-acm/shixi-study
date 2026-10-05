---
version: 1
slug: 'src-ui-knowledgestudio-tsx'
primary_target: 'src/ui/KnowledgeStudio.tsx'
related_targets:
  [
    'src/ui/KnowledgeTree.tsx',
    'src/ui/NodeDetails.tsx',
    'src/ui/Markdown.tsx',
    'src/ui/SpacePage.tsx',
    'src/ui/Home.tsx',
    'src/studio.css',
  ]
---

# 知识目录与 Markdown 编辑

Mode: Operate. 面向在电脑与手机整理个人知识的用户；沿用白色展台视觉，目录负责组织，编辑与预览负责正文。所有节点均可拥有子节点和正文，稳定 ID 与五层上限保留。

## Direction contract

THESIS: 以可折叠目录整理知识，打开节点后专注 Markdown 正文与实时预览。

OWN-WORLD: 白纸、墨色文字、细分隔与浅灰选中行；首页领域树图沿用浅灰圆角展台。

STORY: 建立根节点，通过三点菜单或拖动整理层级，打开任何目录项写正文，保存后返回原目录。

FIRST VIEWPORT: 领域默认显示知识卡片；编辑工作台在目录与正文状态都采用等宽、独立圆角白框，间隔 24px。左侧目录或 Markdown，右侧节点图或预览；手机单列上下排布。

FORM: 用户明确指定语雀式目录与 Markdown 双栏；继承现有白色视觉，本次未重新选形或生成 seed。

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## 实际行为与边界

- 目录加号建立根节点；三点菜单提供打开、添加子节点、重命名、移动、删除。拖到节点上成为子节点，底部“最外层”区域回根；移动对话框兼顾手机与键盘操作。无 folder/document 数据类型。
- 首页节点点击直接阅读知识点；编辑图或目录名称点击直接打开正文。节点图总根显示领域名称，只用于展示，不持久化或占用五层深度。编辑时隐藏并保留目录状态，返回恢复折叠、搜索及显示数量；此时右侧只显示 Markdown 预览。
- 图片支持选择、粘贴、拖入与远程 Markdown URL；本地图片存 IndexedDB 并进入备份。Ctrl/Cmd+S 在文本区保存；未保存正文与图片插入有保护。
- 首页球体仅展出数据；无球体加号、领域卡底部编辑/删除/箭头。整张树图卡片进入领域，领域管理在领域页。目标、步骤界面已移除；历史数据、既有关系与备份保持兼容，旧节点详情/关联编辑界面已移除。

## 完成证据

本轮沿用既有白色视觉与用户指定的对称双框。桌面与手机的首页、知识卡片、目录及正文截图位于 .impeccable/review/knowledge-cards/，metrics.json 记录两栏均 572px、手机单列 350px，无页面水平溢出；首页节点字约 20px / 16px。上一轮独立审查只适用于当时版本，本轮由截图与行为回归验证。

核心 Vitest 53 项、全量生产 Playwright 42 项桌面/手机用例通过；最后的画布尺寸与边界修正由 6 项入口及目录菜单回归复核。TypeScript、Vite 构建通过；源码和文档格式与 diff 检查一并验收。发布状态以 GitHub Pages 部署记录为准。
