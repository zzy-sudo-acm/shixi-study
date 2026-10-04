---
name: 时习
description: 雾绿纸面与真实点线关系构成的个人学习空间
colors:
  ink: '#263e35'
  accent: '#416b53'
  muted: '#607267'
  page: '#f8faf8'
  paper: '#fff'
  soft: '#e9f0ea'
  line: '#dfe7e1'
  sidebar: '#fff'
  navigation-text: '#607267'
  tree-surface: '#f0f5f1'
  map-surface: '#eef3ef'
  button-hover: '#edf3ee'
  focus: '#688d76'
  input-line: '#bbcbbf'
  placeholder: '#607267'
  relation: '#367861'
  danger: '#8c3e37'
  error-text: '#8a3e35'
  error-surface: '#fff1ee'
typography:
  brand:
    fontFamily: "'Songti SC', 'Noto Serif CJK SC', SimSun, serif"
    fontSize: '27px'
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: '0.08em'
  headline:
    fontFamily: "'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif"
    fontSize: '30px'
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: '0.02em'
  title:
    fontFamily: "'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif"
    fontSize: '20px'
    fontWeight: 600
    lineHeight: 1.65
  subheading:
    fontFamily: "'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif"
    fontSize: '17px'
    fontWeight: 600
    lineHeight: 1.65
  body:
    fontFamily: "'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif"
    fontSize: '15px'
    fontWeight: 400
    lineHeight: 1.65
  body-mobile:
    fontFamily: "'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif"
    fontSize: '14px'
    fontWeight: 400
    lineHeight: 1.65
  secondary:
    fontFamily: "'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif"
    fontSize: '14px'
    fontWeight: 400
    lineHeight: 1.65
  label:
    fontFamily: "'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif"
    fontSize: '13px'
    fontWeight: 400
    lineHeight: 1.65
  control:
    fontFamily: "'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif"
    fontSize: '15px'
    fontWeight: 500
    lineHeight: 1.4
rounded:
  field: '7px'
  control: '8px'
  graph-node: '10px'
  container: '14px'
  map: '18px'
  pill: '999px'
  progress: '3px'
spacing:
  compact: '8px'
  control-gap: '9px'
  action-gap: '12px'
  regular: '16px'
  inset: '18px'
  grid-gap: '22px'
  section: '26px'
components:
  button-primary:
    backgroundColor: '{colors.ink}'
    textColor: '{colors.paper}'
    typography: '{typography.control}'
    rounded: '{rounded.control}'
    padding: '10px 19px'
  button-primary-hover:
    backgroundColor: '{colors.accent}'
  button-secondary:
    backgroundColor: '{colors.paper}'
    textColor: '{colors.ink}'
    typography: '{typography.control}'
    rounded: '{rounded.control}'
    padding: '10px 19px'
  button-text:
    backgroundColor: 'transparent'
    textColor: '{colors.accent}'
    typography: '{typography.control}'
    padding: '4px 2px'
  field:
    backgroundColor: '{colors.paper}'
    textColor: '{colors.ink}'
    rounded: '{rounded.field}'
    padding: '11px 12px'
  tag:
    backgroundColor: '{colors.soft}'
    textColor: '{colors.ink}'
    rounded: '{rounded.pill}'
    padding: '3px 12px'
  navigation-item:
    textColor: '{colors.navigation-text}'
    rounded: '{rounded.field}'
    padding: '12px 16px'
  navigation-item-active:
    backgroundColor: '{colors.paper}'
    textColor: '{colors.ink}'
  space-icon-picker:
    backgroundColor: '{colors.paper}'
    textColor: '{colors.ink}'
  space-card:
    backgroundColor: 'transparent'
    textColor: '{colors.ink}'
    padding: '22px 0 10px'
  learning-map:
    backgroundColor: '{colors.map-surface}'
    rounded: '{rounded.map}'
  node-details:
    backgroundColor: '{colors.paper}'
    textColor: '{colors.ink}'
    rounded: '{rounded.container}'
    padding: '26px'
  tree-panel:
    backgroundColor: '{colors.tree-surface}'
    textColor: '{colors.ink}'
    rounded: '{rounded.container}'
    padding: '20px 18px'
  tree-item-selected:
    backgroundColor: '{colors.accent}'
    textColor: '{colors.paper}'
    rounded: '{rounded.field}'
    padding: '9px 10px'
  graph-node:
    backgroundColor: '{colors.paper}'
    textColor: '{colors.ink}'
    rounded: '{rounded.graph-node}'
    padding: '10px 14px'
    width: '208px'
    height: '64px'
  progress-track:
    backgroundColor: '{colors.soft}'
    rounded: '{rounded.progress}'
    height: '6px'
---

# Design System: 时习

## Overview

**Creative North Star: "时习知识坐标场"**

雾绿底、白色纸面与墨绿文字组成安静的个人学习界面。圆点、细线与留白形成首页的知识坐标场，领域和知识的大小关系来自实际实体；导航与编辑界面沿用轻分隔。品牌使用宋体，功能标题和正文使用系统中文黑体，不加载外部字体。

当前首页是用户自建领域的知识地图：首次打开呈现可创建的空白起点，创建后才出现领域地图与紧凑列表。领域内的目标、知识树和知识图谱沿用同一组颜色、字段与按钮。保留的记忆卡片、图片和复习纸面属于另一组既有功能，不能把其分类树或卡片图谱当作新的知识节点树。

**Key Characteristics:**

- 雾绿纸面、墨绿主动作，低饱和领域标记辅助识别。
- 品牌有宋体特征，内容与操作以中文系统字保持清晰。
- 层级通过间距、细分隔和状态表达；首页以真实点线结构形成辨识度。
- 桌面左导航与并排内容，手机顶端品牌、底部导航和单列内容。
- 空态、计数与计划完成度均来自真实数据。

依据：`src/style.css`、`src/knowledge.css`、`src/workspace.css`、`src/home.css` 与当前 UI 组件，按上述顺序加载。首页局部方向见 `docs/HOME-VISUAL-REFRESH.md`，实际渲染依据为 `.impeccable/review/refresh/` 的桌面与手机八图。方向为 code-led；未形成批准的视觉 comp，不将参考站视为复刻合同。

## Colors

雾绿与墨绿服务阅读和结构；用户可选领域标记色，额外知识关联以绿色及虚线表达。既有图谱仍保留蓝灰父子线等局部颜色。上方 frontmatter 是色值的规范记录。

Sidecar 的合成色阶仅供设计面板浏览，不表示应用已采用完整色阶。

### Primary

- **墨绿**（`ink`）：正文、品牌、主按钮与重要标题的基色。
- **操作绿**（`accent`）：链接、文字操作、选中树节点及主按钮悬停。
- **焦点绿**（`focus`）：键盘焦点轮廓及内容编辑器拖入反馈。

### Secondary

- **关联绿**（`relation`）：知识图谱中选中节点的额外关联边；搭配绿色相邻节点反馈。
- **领域标记**：每个领域可自选颜色，当前提供蓝、绿、赭、紫、玫瑰灰五个预选项。标记色用于领域符号、计划进度和领域视图下划线；它是用户数据，不替代应用主色。
- **危险与错误**（`danger`、`error-text`、`error-surface`）：危险确认按钮与保存失败提示；正文仍明确说明影响范围。

### Neutral

- **雾白纸底**（`page`）：页面背景。
- **白纸**（`paper`）：节点详情、字段、图谱画布与对话框。
- **灰绿文字**（`muted`）：辅助说明、面包屑、计数及页脚，统一引用可读的次级文字变量。
- **浅绿**（`soft`）：进度轨道、标签和定位到的步骤背景。
- **白色侧栏**（`sidebar`）与 **结构纸面**（`tree-surface`）：分离主导航、知识树与白色详情。
- **坐标纸面**（`map-surface`）：首页地图、可创建空态与导航悬停的浅色层。
- **细分隔**（`line`）、**字段描边**（`input-line`）：建立低对比的容器边界和输入边界。
- **按钮悬停纸面**（`button-hover`）与 **占位灰绿**（`placeholder`）：交互反馈和字段提示。

**The Structural Color Rule.** 首页领域所属线和父子线继承领域标记色，所属线为短虚线、父子线为实线；独立知识图谱的父子线仍为蓝灰实线。用户建立的额外知识关联使用绿色虚线，选中状态同时通过描边、文字或可访问状态表达。

## Typography

**Brand Font:** 本机宋体字族，回退到 SimSun 与 serif。

**Body Font:** PingFang SC、Microsoft YaHei、system-ui、sans-serif。

**Code Font:** ui-monospace、monospace，用于原有代码与快捷键内容。

品牌保留宋体特征，功能文字保持直白。首页空态主句使用同一宋体家族（400，clamp(30px, 3vw, 40px)，行高 1.55；手机 31px）。首页页面标题使用中文系统字（500，clamp(28px, 2.6vw, 38px)，字距 -0.02em；手机 28px）。这些是首页局部层级；原有功能页面与今日复习主句保留各自层级。

### Hierarchy

- **品牌**：采用 `brand`；手机品牌缩为（24px）。
- **页面标题**：采用 `headline`；手机为（25px），用于页面名称和领域名称。
- **区域标题**：采用 `title`；知识树与目标等密集区域按上下文使用（16–18px）。
- **子标题**：采用 `subheading`；节点详情分节标题为（15px）。
- **正文**：采用 `body`，手机采用 `body-mobile`；节点笔记使用（1.9）行高并保留换行，目标说明限制至（72ch）。
- **辅助与计数**：采用 `secondary`、`label`；树节点说明、面包屑等为（12px），页脚为（11px），手机页脚为（10px）。数值进度使用等宽数字。
- **地图文字**：桌面领域名（18px、500、行高 1.5），手机（14px）；根节点 SVG 标签仅用于桌面，手机隐藏并改为独立 HTML 文本（11px、行高 1.6），最多显示两个根标题，单行省略。手机节点计数与地图说明也为（11px）。
- **操作**：采用 `control`；工作区行内操作按上下文使用（12–14px），标题和名称可换行。

**The Readable Secondary Copy Rule.** 辅助文字降低视觉权重时保持可读；页脚、说明和计数沿用 `muted`，不要恢复旧版更淡的次级文字颜色。

## Layout

桌面侧栏固定在左侧，宽（224px），主内容最大宽（1440px），左侧让出侧栏，常规内边距为（48px 60px 28px）。大于等于（1600px）时主内容左边距随额外视口宽度平衡。小于等于（1100px）时侧栏缩为（190px），内容内边距为（40px 32px 26px）。

首页地图桌面为三列领域分布，至（820px）为两列；每页最多（6）个领域。其下领域列表为两列，列间距（36px），至（820px）为（24px），至（640px）改为单列；以透明条目和下沿细分隔组织内容。目标列表使用整行分隔与逐层缩进。知识树和节点详情在桌面并排：列宽为 `minmax(230px, 0.9fr)` 和 `minmax(280px, 1.5fr)`，间距（26px）。小于等于（1000px）时堆叠成单列，树列表滚动高度上限从（560px）降为（330px）。

小于等于（640px）时显示顶端品牌，固定底部三项主导航；内容取消左边距，内边距为（28px 18px calc(110px + env(safe-area-inset-bottom)))，保留底部安全区。首页领域列表单列；目标行操作与步骤操作换行，深层目标缩进减小；节点详情出现在树或图之后，表单随内容滚动。移动字段采用（16px）字号。

图谱保持有界滚动画布。桌面节点按深度横向递进，手机改为纵向排列并采用浅缩进；节点间纵向节奏为（84px）。图谱视口桌面高度（470px）、手机高度（420px），最大高度为（55dvh）；额外内容可水平或垂直滚动。新工作区树及图谱初次均最多呈现（100）个节点，提供继续显示按钮。

## Elevation & Depth

深度主要来自纸面色差、细边框和留白。首页领域列表仅保留下沿分隔，地图使用色差；节点详情采用边框。它们不使用卡片阴影。保留的记忆卡片与复习纸面采用微弱阴影；模态对话框有更明显的遮罩与浮层阴影。

### Shadow Vocabulary

- **卡片纸面**（`0 4px 18px #263e350a, 0 1px 3px #263e3505`）：原有记忆卡片、复习纸面等既有容器。
- **导航选中纸面**（`0 2px 3px #1e375505`）：桌面主导航的轻微分层，手机取消。
- **模态浮层**（`0 24px 80px #102d4a33`）：原生对话框；遮罩为 `#1b2d40a3`。

**The Quiet Paper Rule.** 工作区默认以边框和色差组织信息；沿用卡片纸面或模态的既有阴影时遵循其用途，不为每个列表层级增加浮层。

## Shapes

形状轻柔且规则：输入与导航使用 `field`，按钮使用 `control`，图谱节点使用 `graph-node`，树面板、节点详情、图谱画布及对话框使用 `container`；首页地图使用 `map`，手机缩为 `container`。标签用 `pill`，进度条用 `progress`；圆形起点与圆点用于坐标场结构。

字段与详情容器采用细边框；首页地图及空态是连续色面，领域列表仅保留下沿分隔。树叶的圆点用于结构提示，按钮图标为内联 SVG。领域符号允许用户自定义，它不是应用通用图标规范。

## Components

### Buttons

墨绿主按钮承担创建与保存；白色次按钮承担补充动作，透明文字按钮用于行内编辑和关联。常规按钮最小高度（44px），内边距由 frontmatter 记录；小按钮最小高度（42px）。主按钮悬停改为操作绿，普通按钮悬停改变纸面及边框；禁用时不透明度为（0.48）并改变光标。

键盘焦点采用焦点绿轮廓（3px）及外偏移（4px）；字段与链接也提供同样的可见反馈。手机步骤与节点的文字操作扩展到（44px）高度。危险确认使用独立危险色，领域删除对话框同时要求勾选确认与重新输入名称。

### Chips / Tags

原有建议标签使用浅绿背景、药丸圆角和紧凑文字；卡片内静态标签使用（4px）圆角。步骤关联选择器中的已选知识采用可移除按钮，使用常规控制圆角与关闭 SVG；不要将二者混为同一种标签样式。

### Cards / Containers

首页领域条目使用透明背景、无圆角与下沿细分隔。打开区域含名称、真实计划完成度、目标数与知识节点数，编辑、删除与继续入口放在独立操作行；悬停时名称增加细下划线。名称与用户内容允许换行。

原有记忆卡片使用同一容器圆角及卡片纸面阴影。折叠时标题最多三行，展开显示完整内容；答案、历史和评分按既有复习流程渐进呈现。其分类树与卡片图谱保留原有职责，与独立的知识节点树分开。

### Inputs / Fields

字段采用白纸、字段描边和输入圆角，最小高度（44px）。标签显式关联字段；搜索具有可访问名称，空结果说明建议下一步。多行笔记保持换行并允许纵向调整大小；手机表单、搜索和选择框采用（16px）字，避免输入时意外缩放。

工作区使用原生 `dialog` 并通过 `showModal()` 打开，标题以 `aria-labelledby` 关联；宽（520px），受视口宽高限制。保存期间禁用表单，显示保存状态；关闭有未保存修改时提示确认，错误使用可见消息。

领域新建与编辑共用 `SpaceForm`：名称下方使用 `SpaceIconPicker`，其后保留标记颜色和保存操作。图标及颜色按钮的点选也计入未保存修改；关闭按钮或对话框取消事件沿用放弃确认。选择面板在原生对话框内部展开，超出视口时由对话框内部滚动承载。

### SpaceIconPicker

领域身份标记延续雾白、白纸与墨绿，使用彩色预览和点选面板；不需要新图片素材。图标可留空，预览及首页领域卡均通过 `SpaceIcon` 显示默认书本。内置（12）个线条 SVG 与常用（10）个 emoji；自定义输入保留原有 emoji 或符号原值。内置选择以 `icon:<name>` 保存，继续使用原有（16 字符）图标字段。

- **预览与排布：** 预览为（52px）方形、圆角（12px），图形为（28px）；手机预览缩为（48px）。图标网格桌面（6 列）、手机（4 列），间距（8px）；选项最小高度（72px），标签（12px）。emoji 网格（5 列），选项最小高度（46px）。这些值仅属于本组件。
- **图形与状态：** SVG 使用（24 × 24）viewBox、（1.7）线宽与圆端点，继承所选领域颜色。白纸选项使用细边框，悬停为纸灰；选中增加操作绿边框与浅绿纸面，并通过 `aria-pressed` 表达。
- **展开与键盘：** “选择图标”按钮使用 `aria-expanded` 和 `aria-controls`；当前图标名称通过 `aria-live="polite"` 更新。按钮可由 Enter 选中；点选后收起面板并将焦点返回触发按钮。面板展开时 Escape 先收起面板，再次取消对话框才走关闭流程；控件沿用既有可见焦点样式。

依据：`src/ui/SpaceIcon.tsx`、`src/ui/Home.tsx`、`src/ui/workspaceShared.tsx` 与 `src/workspace.css`；局部方向见 `docs/ICON-PICKER-BRIEF.md`。

### Navigation

桌面主导航有三项：学习空间、记忆卡片、设置与备份。选中项是白纸、加重文字与左侧细书签线；手机采用底部三栏、浅绿选中面。当前页面通过 `aria-current="page"` 表达，并保留跳过导航链接。

领域内目标、知识树、知识图谱是同级链接，选中时显示领域标记色下划线。切换视图不改变目标与知识的实体关系；详细页面保留返回学习空间入口。

### Goals & Progress

目标列表使用可折叠标题、细分隔与缩进，最多三层；步骤采用原生复选框，完成状态与关联知识入口并列。计划进度以六像素轨道、明确文字和百分比表达，统计用户已创建的步骤与完成数；没有步骤时显示“尚未建立计划”。步骤完成仅改变任务进度，不推断知识掌握程度。

### Knowledge Tree & Node Details

知识树呈现独立、稳定 ID 的知识实体，最多五层。每层缩进（16px），分支按钮用 `aria-expanded`，名称按钮用 `aria-pressed`；选中节点呈操作绿底与白字，旁侧数字表示后代节点数。搜索匹配名称，搜索时不受折叠状态隐藏，长名称允许换行。

选择节点后显示白纸详情：名称、路径、管理操作、笔记、相关知识、相关学习任务。相关知识可双向查看及移除；相关任务显示完成状态并跳转至对应步骤。步骤的知识选择器通过复选框与路径建立多项关联，已选项可移除；它与知识节点之间的额外关联是两种不同关系。

### Knowledge Graph

图谱呈现同一组知识实体及其稳定选中状态。节点尺寸由 frontmatter 记录，名称最多两行，完整名称通过 `title` 保留；选中节点使用外描边，相邻节点使用绿色边框与浅绿色纸面。蓝灰实线表达父子结构，绿色虚线表达用户建立的关联。

画布是可聚焦且有名称的滚动区域；节点为真实按钮，支持鼠标、触摸及键盘。工具提供总览、缩放与恢复原始比例，多根节点时提供分支选择。布局在数据或断点变化时确定，不使用持续运行的力导向动画。

### Learning Map & Empty Origin

首页知识坐标场使用浅色点阵纸面；点阵间距（22px），地图桌面圆角采用 map，手机采用 container。大点表示领域，小点表示真实知识节点，线只来自领域所属、父子关系与用户建立的知识关联；没有知识时只呈现领域点，不补造节点或连线。

每个领域预览前（48）个节点，超限时显示预览说明；每页最多（6）个领域，超过一页才提供翻页。桌面根节点标签最多（4）个，每个最多（8）个字后省略；手机隐藏 SVG 标签，改为独立 HTML 根标题（11px），最多（2）个，保留真实完整名称文本并在一行内省略。计数始终使用该领域真实节点总数。

整块领域是进入该领域知识图谱的链接；下方领域列表进入目标页。地图和列表均保留新建、编辑及删除入口的既有流程。空账号呈现宋体提示和圆形创建起点，两个创建按钮调用同一领域表单，不预设领域、节点或完成率。坐标图用 SVG 与 CSS 生成，无新增光栅材料。

**The Real Coordinates Rule.** 地图点线来自用户的实际实体和关系；预览限制只改变呈现数量，不改变实际计数或数据。

### Motion

页面切换恢复全页入场：内容从下方（8px）升起并淡入（320ms，`--ease-out`）。详情面板、图谱检查器与答案块的内容显示为（180ms）。标准缓动为 `--ease-out`；按压与悬停位移使用弹簧缓动 `--ease-spring`（cubic-bezier(0.34, 1.56, 0.64, 1)），控件颜色过渡为（150–160ms）。

列表与卡片采用交错弹入（pop-in：scale 0.94 + 淡入，240ms）：首页领域卡片、知识树节点、目标列表与卡片库逐项延迟（30ms）、封顶（8）项，全组在（480ms）内结束；仅新插入的节点播放入场。按钮按压缩放（0.97，180ms，`--ease-spring`）；卡片悬停上移（2px）并加深边框色，不加重阴影；领域视图标签指示条以 scaleX 过渡（300ms）；知识图谱节点悬停放大（1.15 倍）、关联线透明度过渡（180ms）；弹窗入场为（240ms）pop-in，不做退场动画。所有动画有限结束（不超过 600ms），只使用 transform 与 opacity。

首页地图进入或新增领域出现时，中心（300ms）先激活，连接由中心向外裁切展开（520ms），知识点落位（240ms）；领域间延迟为（35ms），节点延迟封顶，全组在（800ms）内结束，名称与操作无需等待。鼠标悬停、键盘聚焦或触屏按下时，结构在（320ms）内向外舒展（1.07 倍），中心点／环与线透明度使用（180ms）反馈。翻页只沿点击方向移动（28px，260ms），不重播展开序列；有分页时保留完整地图行数与翻页按钮位置。

空态坐标轴从中心展开（640ms），创建起点在悬停或键盘聚焦时回应一次扩散圆环（560ms）；按压缩放使用（140ms），继续学习箭头前移（4px，180ms）。所有动画有限结束，无后台循环和新依赖。默认显示动效；用户开启系统减少动态效果时，所有新动效各自以 `prefers-reduced-motion: no-preference` 门控，并由全局规则关闭动画与过渡，同时取消页面入场、交错入场、结构舒展和按压位移，保留完整静态内容、地图、颜色与焦点反馈。

## Do's and Don'ts

### Do:

- **Do** 沿用雾白、白纸、墨绿和可读灰绿文字，让结构与当前操作成为重点。
- **Do** 保留真实空态；以用户创建的领域、步骤和知识实体生成页面与计数。
- **Do** 让目标、知识结构与关联各自表达职责，明确区分任务进度与知识掌握。
- **Do** 保留展开、选中、当前页面、保存状态和可见键盘焦点的语义。
- **Do** 让名称和笔记在手机换行，地图根标题采用独立（11px）HTML 文本，并为底部导航与安全区保留内容空间。
- **Do** 用内联 SVG 表达应用操作；将用户自选领域颜色与符号视为个人内容。

### Don't:

- **Don't** 在初始学习空间预设学科、目标、知识节点或示例完成率。
- **Don't** 将原有卡片分类树与卡片图谱替代新的稳定知识节点树。
- **Don't** 把完成步骤解释为已掌握知识，或用颜色单独表达关系与完成状态。
- **Don't** 引入深色主题、营销首屏、数据大屏或花哨后台来替换既有纸面语言。
- **Don't** 给每个工作区容器添加重阴影、全屏模糊或循环动画。
- **Don't** 将用户填写的领域符号推广为通用按钮图标，或用装饰性短标签增加标题层级。

未纳入通用规范：地图翻页沿用文字字符 ‹／›，仅记录为局部既有实现；通用动作图标仍用内联 SVG，避免将字符图标推广为系统规则。
