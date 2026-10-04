---
name: 时习
description: 纯白展台、珍珠球体与成对编辑呈现构成的个人学习空间
colors:
  ink: '#171717'
  accent: '#171717'
  muted: '#686868'
  page: '#fff'
  paper: '#fff'
  soft: '#f1f1ef'
  line: '#e7e7e7'
  card-surface: '#f6f6f4'
  control-surface: '#eaeae7'
  selection: '#d8e0e8'
  unsaved: '#806218'
  focus: '#767676'
  input-line: '#dcdcdc'
  placeholder: '#737373'
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
  hero:
    fontFamily: "'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif"
    fontSize: 'clamp(36px, 4vw, 54px)'
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: '-0.035em'
  headline:
    fontFamily: "'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif"
    fontSize: '38px'
    fontWeight: 500
    lineHeight: 1.35
    letterSpacing: '-0.025em'
  title:
    fontFamily: "'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif"
    fontSize: '22px'
    fontWeight: 500
    lineHeight: 1.65
  subheading:
    fontFamily: "'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif"
    fontSize: '16px'
    fontWeight: 500
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
  studio-field: '12px'
  control: '8px'
  panel: '16px'
  card: '24px'
  card-mobile: '20px'
  phone: '46px'
  pill: '999px'
  progress: '3px'
spacing:
  compact: '8px'
  control-gap: '9px'
  action-gap: '12px'
  regular: '16px'
  inset: '18px'
  grid-gap: '24px'
  card-padding: '28px'
  section: '26px'
components:
  button-primary:
    backgroundColor: '{colors.ink}'
    textColor: '{colors.paper}'
    typography: '{typography.control}'
    rounded: '{rounded.pill}'
    padding: '10px 20px'
  button-primary-hover:
    backgroundColor: '#363636'
  button-secondary:
    backgroundColor: '{colors.paper}'
    textColor: '{colors.ink}'
    typography: '{typography.control}'
    rounded: '{rounded.pill}'
    padding: '10px 19px'
  button-text:
    backgroundColor: 'transparent'
    textColor: '#505050'
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
    textColor: '{colors.muted}'
    rounded: '{rounded.pill}'
    padding: '10px 18px'
  navigation-item-active:
    backgroundColor: '{colors.ink}'
    textColor: '{colors.paper}'
  knowledge-orb:
    size: 'min(100%, 440px)'
    surface: 'radial-gradient(#ffffff, #f1f1ee 55%, #d9d9d3)'
    symbol: '#171717'
  space-card:
    backgroundColor: '{colors.card-surface}'
    textColor: '{colors.ink}'
    rounded: '{rounded.card}'
    padding: '28px 28px 8px'
    content: '仅含完整知识树点线图与操作行'
  studio-card:
    backgroundColor: '{colors.card-surface}'
    textColor: '{colors.ink}'
    rounded: '{rounded.card}'
    padding: '28px'
    minHeight: '620px'
  preview-mode-control:
    backgroundColor: '{colors.control-surface}'
    rounded: '13px'
    padding: '4px'
  node-details:
    backgroundColor: '{colors.paper}'
    textColor: '{colors.ink}'
    rounded: '{rounded.panel}'
    padding: '24px'
  tree-item-selected:
    backgroundColor: '{colors.ink}'
    textColor: '{colors.paper}'
    rounded: '10px'
    padding: '9px 10px'
  graph-node:
    backgroundColor: '{colors.paper}'
    textColor: '{colors.ink}'
    rounded: '{rounded.control}'
    padding: '10px 14px'
  graph-node-selected:
    backgroundColor: '{colors.ink}'
    textColor: '{colors.paper}'
  node-point:
    backgroundColor: '{colors.paper}'
    textColor: '{colors.ink}'
    rounded: '{rounded.panel}'
    padding: '22px 24px'
  progress-track:
    backgroundColor: '{colors.soft}'
    rounded: '{rounded.progress}'
    height: '6px'
---

# Design System: 时习

## Overview

**Creative North Star: "时习白色知识展台"**

纯白底、墨色文字与浅灰展台组成安静而有辨识度的个人学习界面。首页在文字旁放置一颗珍珠白球体：球面轮播用户真实的知识树点线，缓慢自转，悬停时知识树展开成环绕轨道。学习领域以整行浅灰卡片陈列，卡片只承载该领域完整的点线树图（每个节点带名字）。知识库页把每棵知识树的根节点陈列成卡片，点进去看单树图谱。编辑器始终成对：左侧文件夹式知识树与 Markdown 知识点编辑，右侧知识图谱，点节点看知识点。复习卡片与 FSRS 界面已于 2026-10 移除；旧卡片、图片与复习历史保留在本机与完整备份中。

**Key Characteristics:**

- 纯白页面、珍珠球体、黑色主动作，中性灰承载层级；领域标记色只用于个人内容。
- 品牌保留宋体特征，内容与操作以中文系统黑体保持清晰。
- 桌面顶部居中三入口导航（学习空间 / 知识库 / 设置与备份），手机品牌与导航纵向居中排列。
- 编辑与呈现成对出现；预览使用真实知识与当前草稿，保存状态显式可见。
- 空态、计数与计划完成度均来自真实数据；球体只展出真实知识树，空账号为线框球。

依据：`src/style.css`、`src/knowledge.css`、`src/workspace.css`、`src/home.css` 与 `src/studio.css`，按上述顺序加载，白色主题由最后导入的 `src/studio.css` 建立。本轮方向合同见 `docs/WHITE-STUDIO-REFRESH.md`，实际渲染依据为 `.impeccable/review/white-studio/` 的桌面、手机与宽屏截图。方向为 code-led；未形成批准的视觉 comp，不将参考站视为复刻合同。

## Colors

黑与白服务阅读和结构；用户可选领域标记色，只用于个人内容（领域符号、计划进度、图谱关联线）。上方 frontmatter 是色值的规范记录。

Sidecar 的合成色阶仅供设计面板浏览，不表示应用已采用完整色阶。

### Primary

- **墨黑**（`ink` / `accent`）：正文、品牌、主按钮、选中导航与选中树节点的基色；主按钮悬停为 `#363636`。
- **焦点灰**（`focus`）：键盘焦点轮廓及可见焦点反馈。

### Secondary

- **领域标记**：每个领域可自选颜色，当前提供蓝、绿、赭、紫、玫瑰灰五个预选项。标记色用于领域符号、计划进度和图谱关联线；它是用户数据，不替代应用主色。
- **未保存琥珀**（`unsaved`）：工作台「尚未保存」状态文字，与「已保存在本机」形成对照。
- **危险与错误**（`danger`、`error-text`、`error-surface`）：危险确认按钮与保存失败提示；正文仍明确说明影响范围。

### Neutral

- **纯白**（`page` / `paper`）：页面背景、字段、对话框与预览内的详情面板。
- **展台灰**（`card-surface`）：首页领域卡片与知识工作台双卡片的浅灰层。
- **控件灰**（`control-surface`）：呈现方式分段控件与领域视图标签的底层。
- **辅助灰**（`muted`）：辅助说明、面包屑、计数及页脚。
- **浅灰**（`soft`）：进度轨道、标签和导航悬停。
- **细分隔**（`line`）、**字段描边**（`input-line`）、**占位灰**（`placeholder`）：低对比边界与输入提示。
- **选区蓝灰**（`selection`）：文本选区。

**The Structural Color Rule.** 彩色只来自用户数据：领域标记色出现在领域符号、进度与关联线上；界面本身的动作与状态保持黑白灰，选中同时通过描边、文字或可访问状态表达。

## Typography

**Brand Font:** 本机宋体字族，回退到 SimSun 与 serif。

**Body Font:** PingFang SC、Microsoft YaHei、system-ui、sans-serif。

**Code Font:** ui-monospace、monospace，用于原有代码与快捷键内容。

品牌保留宋体特征，功能文字保持直白。首页主标题使用 `hero`（中文系统字，500，负字距）；首页陈述句为（25px、行高 1.6），手机（21px）。领域页标题使用 `headline`（38px），手机（30px）。

### Hierarchy

- **品牌**：采用 `brand`；手机为（25px）。
- **首页主标题**：采用 `hero`。
- **页面标题**：采用 `headline`，用于领域名称；知识库与设置页面保留各自标题层级。
- **区域标题**：采用 `title`（22px、500）；知识树、实时呈现与学习领域列表共用。
- **子标题**：采用 `subheading`；工作台「编辑内容」为（16px），节点详情分节标题为（14px）。
- **正文**：采用 `body`，手机采用 `body-mobile`；节点笔记使用（1.9）行高并保留换行，目标说明限制至（72ch）。
- **辅助与计数**：采用 `secondary`、`label`；树节点说明、面包屑等为（12px），状态与页脚为（11px），手机页脚为（10px）。数值进度使用等宽数字。
- **领域卡文字**：领域名（21px、500），手机（19px）；根节点预览与计数为（12px）。
- **操作**：采用 `control`；工作台行内操作与分段控件按上下文使用（11–14px），标题和名称可换行。

**The Readable Secondary Copy Rule.** 辅助文字降低视觉权重时保持可读；页脚、说明和计数沿用 `muted`，不要恢复更淡的次级文字颜色。

## Layout

桌面导航是顶端吸附的通栏（88px），三列网格把品牌、居中三入口与本机状态分开；主内容居中，最大宽（1280px），内边距（44px 56px 32px）。小于等于（1050px）时侧栏内边距收缩，本机状态隐藏。

首页首屏为两列：左侧标题、陈述、说明与新建按钮，右侧珍珠白球体（440px）；下方领域卡片整行单列排布，间距（26px）。领域工作台为两张等宽等高卡片：左侧知识树与内联编辑，右侧实时呈现，间距（24px），卡片最小高度（620px）。

小于等于（850px）时工作台卡片上下排列，卡片上方出现「前往编辑 / 查看呈现」快捷入口。小于等于（640px）时导航改为品牌在上、三项入口等分在下；首页变为单列居中，球体缩为（310px）；领域卡片单列；内联编辑字段采用（16px）字号，避免输入时意外缩放。

图谱在预览卡片内保持有界滚动画布，高度（330px）、最大（45dvh），默认 100% 保证文字可读；保留总览、缩放与分支过滤。布局在数据或断点变化时确定，不使用持续运行的力导向动画。

## Elevation & Depth

深度主要来自色面差、细边框和留白。领域卡片与工作台卡片使用展台灰色面，不使用卡片阴影；球体保留轻微投影以支撑物体感。

### Shadow Vocabulary

- **球体投影**（`drop-shadow(10px 18px 22px #00000015)`）：首页珍珠球体。
- **图谱节点**（`0 3px 8px #00000004`）：预览图谱中的节点按钮。
- **模态浮层**（`0 24px 80px #102d4a33`）：原生对话框；遮罩为 `#1b2d40a3`。

**The Quiet Surface Rule.** 工作台以灰面与边界组织信息；沿用卡片纸面或模态的既有阴影时遵循其用途，不为每个列表层级增加浮层。

## Shapes

形状以圆形和大圆角为主：导航、主按钮、标签与快捷入口使用 `pill`；领域卡片、工作台卡片使用 `card`，手机缩为 `card-mobile`；预览内的详情与图谱面板使用 `panel`；工作台输入使用 `studio-field`，既有页面字段沿用 `field`；球体、创建标记与继续入口是正圆。

## Components

### Buttons

黑色药丸主按钮承担创建与保存；白色次按钮承担补充动作，透明文字按钮用于行内编辑和关联。常规按钮最小高度（44px）；主按钮悬停提亮为 `#363636`，禁用时不透明度（0.45）。文字按钮为深灰（`#505050`），悬停转黑。

键盘焦点采用焦点灰轮廓（3px）及外偏移（4px）。危险确认使用独立危险色，领域删除对话框同时要求勾选确认与重新输入名称。

### Chips / Tags

原有建议标签使用浅灰背景、药丸圆角和紧凑文字；卡片内静态标签使用（4px）圆角。步骤关联选择器中的已选知识采用可移除按钮；不要将二者混为同一种标签样式。

### Cards / Containers

首页领域卡片是浅灰圆角块：左侧名称、真实计划完成度、目标与知识计数、根节点预览，右侧该领域真实知识结构的缩略图；编辑、删除放在独立操作行，圆形继续入口指向领域。悬停或聚焦时缩略结构舒展（1.07 倍）。

工作台双卡片等宽同级：左卡片承载知识树与内联编辑表单，右卡片承载实时呈现。内联编辑区域以上沿细分隔与树分开，显式保存按钮与放弃按钮并列；未保存状态以琥珀色文字标记。

### Inputs / Fields

字段采用白纸、字段描边，工作台字段圆角为（12px），既有页面沿用（7px）；最小高度（44px）。标签显式关联字段；多行笔记保持换行并允许纵向调整大小；手机表单、搜索和选择框采用（16px）字。

工作区使用原生 `dialog` 并通过 `showModal()` 打开，标题以 `aria-labelledby` 关联；宽（520px），受视口宽高限制。保存期间禁用表单，显示保存状态；关闭有未保存修改时提示确认，错误使用可见消息。

领域新建与编辑共用 `SpaceForm`：名称下方使用 `SpaceIconPicker`，其后保留标记颜色和保存操作。图标及颜色按钮的点选也计入未保存修改；关闭按钮或对话框取消事件沿用放弃确认。

### SpaceIconPicker

领域身份标记延续白纸与墨黑文字，使用彩色预览和点选面板；不需要新图片素材。图标可留空，预览及首页领域卡均通过 `SpaceIcon` 显示默认书本。内置（12）个线条 SVG 与常用（10）个 emoji；自定义输入保留原有 emoji 或符号原值。内置选择以 `icon:<name>` 保存，继续使用原有（16 字符）图标字段。

- **预览与排布：** 预览为（52px）方形、圆角（12px），图形为（28px）；手机预览缩为（48px）。图标网格桌面（6 列）、手机（4 列），间距（8px）；选项最小高度（72px），标签（12px）。emoji 网格（5 列），选项最小高度（46px）。这些值仅属于本组件。
- **图形与状态：** SVG 使用（24 × 24）viewBox、（1.7）线宽与圆端点，继承所选领域颜色。白纸选项使用细边框，选中增加黑色边框与浅灰纸面，并通过 `aria-pressed` 表达。
- **展开与键盘：** “选择图标”按钮使用 `aria-expanded` 和 `aria-controls`；当前图标名称通过 `aria-live="polite"` 更新。按钮可由 Enter 选中；点选后收起面板并将焦点返回触发按钮。面板展开时 Escape 先收起面板，再次取消对话框才走关闭流程；控件沿用既有可见焦点样式。

依据：`src/ui/SpaceIcon.tsx`、`src/ui/Home.tsx`、`src/ui/workspaceShared.tsx` 与 `src/workspace.css`；局部方向见 `docs/ICON-PICKER-BRIEF.md`。

### Navigation

主导航居中于顶栏：学习空间、知识库、设置与备份。选中项是黑色药丸白字，未选项为灰色文字、悬停浅灰底；当前页面通过 `aria-current="page"` 表达，并保留跳过导航链接。手机下品牌居中在上，三项入口等分在下。

领域内目标、知识树、知识图谱是同级链接，分段控件选中为白纸黑字。切换视图不改变目标与知识的实体关系；详细页面保留返回学习空间入口。

### Goals & Progress

目标列表使用可折叠标题、细分隔与缩进，最多三层；步骤采用原生复选框，完成状态与关联知识入口并列。计划进度以六像素轨道、明确文字和百分比表达，统计用户已创建的步骤与完成数；没有步骤时显示“尚未建立计划”。步骤完成仅改变任务进度，不推断知识掌握程度。

### Knowledge Tree & Node Details

知识树呈现独立、稳定 ID 的知识实体，最多五层，内嵌于工作台左卡片。分支按钮用 `aria-expanded`，名称按钮用 `aria-pressed`；选中节点呈黑底白字，旁侧数字表示后代节点数。搜索匹配名称，搜索时不受折叠状态隐藏，长名称允许换行。

左卡片的内联编辑下方保留相关知识与相关学习任务：关联可双向查看、建立及移除；相关任务显示完成状态并跳转至对应步骤。右卡片不再重复这些管理操作。

### Knowledge Graph

图谱嵌入工作台右卡片，呈现同一组知识实体及其稳定选中状态，默认 100% 比例保证文字可读，保留总览、缩放与分支过滤。选中节点为黑底白字，相邻节点使用灰边框与浅灰纸面；父子线为灰色实线，用户建立的关联使用领域标记色虚线。空知识时提示在左侧新建根节点，不重复提供创建按钮。点击节点时，图谱下方呈现该节点的知识点面板；知识库中的图谱同样如此。

### Knowledge Orb & Home

首页球体是品牌对象、真实数据展台与创建入口：珍珠白径向渐变球面（`#ffffff` → `#d9d9d3`）、墨色经纬网格。球面按领域轮播用户真实知识树（每领域最多 26 个节点，约 26 秒一圈、7 秒切换），根节点更大并带领域标记色，根名称在正面浮现；悬停时节点从球面展开为环绕轨道（半径 150→245，飞出球面的节点转为墨色），继续旋转，移开收回。点击球体打开领域表单；空账号或尚无知识树时呈现线框球与「从一个想法开始」。下方领域卡片只含该领域完整点线树图：根节点为领域色大点，子节点墨色小点，全部节点带名字，关联为领域色虚线；树超高时卡片内部滚动。卡片底部保留编辑、删除与继续入口。

**The Real Data Rule.** 球体展出、领域卡树图与编辑器图谱都来自用户的实际实体和关系；空态不补造节点或连线。

### Knowledge Studio & Knowledge Point

工作台左右始终成对。左卡片：文件夹式知识树（逐层展开）、名称与知识点内联编辑；知识点使用 Markdown 子集（标题、段落、粗斜体、行内代码、代码块、列表、引用、链接、`$公式$`）与图片（`![名称](img:id)`，图片压缩后存入 IndexedDB 并纳入备份）；下方保留相关知识与相关学习任务管理。右卡片只呈现知识图谱：草稿实时合并进图谱，显式保存后才写入 IndexedDB；点击任意节点，图谱下方出现该节点的知识点面板（Markdown 渲染、图片可放大）。切换节点、切换视图或离开页面前有未保存确认；保存失败保留草稿，可恢复后重试。手机断点下双卡片上下衔接，「前往编辑 / 查看呈现」按钮在两端滚动定位。

**The Paired Editing Rule.** 编辑与呈现成对出现；预览未保存内容不等于已经写入本机，保存状态始终在编辑区与呈现区同时可见。

### Knowledge Library

知识库页把每棵知识树的根节点陈列成浅灰卡片（领域色点、领域名、节点数、是否有知识点），点击进入单棵树的完整图谱，点节点看知识点；「编辑这棵知识树」进入同一个双栏编辑器。空知识库显示前往学习空间的入口。

### Motion

页面切换保留全页入场与交错弹入（pop-in：scale 0.94 + 淡入，240ms，逐项 30ms、封顶 8 项）；按钮按压缩放（0.97，180ms，`--ease-spring`）；卡片悬停与翻页反馈沿用既有规则。

球体持续自转（约 26 秒一圈）并按领域轮播（7 秒），悬停时知识树展开为环绕轨道、移开收回（平滑趋近约 170ms）；轮播切换以淡入过渡（480ms）。图谱画布缩放过渡（240ms）。除球体自转外动画均有限结束，只使用 transform 与 opacity，无新依赖；球体帧循环在页面隐藏时暂停。

默认显示动效；用户开启系统减少动态效果时，所有新动效各自以 `prefers-reduced-motion: no-preference` 门控，并由全局规则关闭动画与过渡，同时取消页面入场、交错入场、球体自转轮播与悬停展开，保留完整静态内容、颜色与焦点反馈。

## Do's and Don'ts

### Do:

- **Do** 沿用纯白、墨黑和可读灰色文字，让结构、球体与当前操作成为重点。
- **Do** 保留真实空态；以用户创建的领域、步骤和知识实体生成页面与计数。
- **Do** 让编辑与呈现成对出现，显式保存并明确未保存状态。
- **Do** 让目标、知识结构与关联各自表达职责，明确区分任务进度与知识掌握。
- **Do** 保留展开、选中、当前页面、保存状态和可见键盘焦点的语义。
- **Do** 用内联 SVG 表达应用操作与品牌球体；将用户自选领域颜色与符号视为个人内容。

### Don't:

- **Don't** 在初始学习空间预设学科、目标、知识节点或示例完成率。
- **Don't** 以任何形式恢复复习卡片界面替代知识树结构；旧复习数据只通过备份保留与导出。
- **Don't** 让 Markdown 渲染原始 HTML；公式与图片只走受控通道（KaTeX 与 IndexedDB 图片）。
- **Don't** 把完成步骤解释为已掌握知识，或用颜色单独表达关系与完成状态。
- **Don't** 引入深色主题、营销首屏、数据大屏或花哨后台来替换白色展台语言；也不要回到旧版绿色侧栏视觉。
- **Don't** 给每个工作台容器添加重阴影、全屏模糊或循环动画。
- **Don't** 把预览中的未保存草稿当作已持久化数据，或静默丢弃用户输入。

未纳入通用规范：图谱缩放与分页沿用既有局部实现；通用动作图标仍用内联 SVG，避免将字符图标推广为系统规则。
