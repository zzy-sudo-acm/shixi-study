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
  studio-surface:
    backgroundColor: '{colors.paper}'
    textColor: '{colors.ink}'
    rounded: '12px'
  directory-row:
    textColor: '{colors.ink}'
    rounded: '6px'
    height: '46px'
  directory-row-selected:
    backgroundColor: '#efefed'
  directory-menu:
    backgroundColor: '{colors.paper}'
    textColor: '{colors.ink}'
    rounded: '8px'
    padding: '6px'
    width: '160px'
  markdown-editor:
    backgroundColor: '{colors.paper}'
    textColor: '{colors.ink}'
    rounded: '0'
    padding: '26px'
  markdown-preview:
    backgroundColor: '{colors.paper}'
    textColor: '{colors.ink}'
    rounded: '0'
    padding: '28px 32px 40px'
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

纯白底、墨色文字与浅灰展台组成安静而有辨识度的个人学习界面。首页在文字旁放置一颗珍珠白球体：球面轮播用户真实的知识树点线，缓慢自转，悬停时知识树展开成环绕轨道。学习领域以整行浅灰卡片陈列，卡片只承载该领域完整的点线树图（每个节点带名字）。知识库页把每棵知识树的根节点陈列成卡片，点进去看单树图谱。知识工作台有两个状态：整理时左侧为可折叠目录、右侧为节点图；打开目录项后切换为左侧 Markdown 文本、右侧实时预览，返回后恢复目录。复习卡片与 FSRS 界面已于 2026-10 移除；旧卡片、图片与复习历史保留在本机与完整备份中。

**Key Characteristics:**

- 纯白页面、珍珠球体、黑色主动作，中性灰承载层级；领域标记色只用于个人内容。
- 品牌保留宋体特征，内容与操作以中文系统黑体保持清晰。
- 桌面顶部居中三入口导航（学习空间 / 知识库 / 设置与备份），手机品牌与导航纵向居中排列。
- 编辑与呈现成对出现；预览使用真实知识与当前草稿，保存状态显式可见。
- 空态、计数与计划完成度均来自真实数据；球体只展出真实知识树，空账号为线框球。

依据：`src/style.css`、`src/knowledge.css`、`src/workspace.css`、`src/home.css` 与 `src/studio.css`，按上述顺序加载，白色主题由最后导入的 `src/studio.css` 建立。原白色方向见 `docs/WHITE-STUDIO-REFRESH.md`；本次目录与编辑状态见 `.impeccable/surfaces/src-ui-knowledgestudio-tsx.md`，截图与量测保存在 `.impeccable/review/knowledge-cards/`。方向为 code-led；未形成批准的视觉 comp，不将参考站视为复刻合同。

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
- **展台灰**（`card-surface`）：首页领域卡片与目录行悬停的浅灰层；知识工作台以白纸和分隔线划分区域。
- **控件灰**（`control-surface`）：沿用既有控件层；领域视图标签使用浅灰底层。
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
- **区域标题**：采用 `title`（22px、500）；学习领域列表与知识点标题沿用此层级。目录标题（17px）、节点图标题（18px）。
- **子标题**：沿用 `subheading`；Markdown 与预览窗格标题为（14px、500）。
- **正文**：采用 `body`，手机采用 `body-mobile`；节点笔记使用（1.9）行高并保留换行。
- **辅助与计数**：采用 `secondary`、`label`；树节点说明、面包屑等为（12px），状态与页脚为（11px），手机页脚为（10px）。数值进度使用等宽数字。
- **领域卡文字**：领域名（21px、500），手机（19px）；根节点预览与计数为（12px）。
- **操作**：采用 `control`；工作台行内操作与分段控件按上下文使用（11–14px），标题和名称可换行。

**The Readable Secondary Copy Rule.** 辅助文字降低视觉权重时保持可读；页脚、说明和计数沿用 `muted`，不要恢复更淡的次级文字颜色。

## Layout

桌面导航是顶端吸附的通栏（88px），三列网格把品牌、居中三入口与本机状态分开；主内容居中，最大宽（1280px），内边距（44px 56px 32px）。小于等于（1050px）时侧栏内边距收缩，本机状态隐藏。

首页首屏为两列：左侧标题、陈述、说明与新建按钮，右侧珍珠白球体（440px）；下方领域卡片整行单列排布，间距（26px）。知识工作台由两个独立的白色方框组成，各自有细边框和（16px）圆角，间距（24px），窗格最小高度（650px）。目录与编辑状态均使用 repeat(2, minmax(0, 1fr))；桌面量测为（572 / 572px），手机单列为（350px）。这些是本次视口结果，不是固定宽度。

小于等于（850px）时工作台上下排列，窗格不再设最小高度，上方出现「目录 / 节点图」或「编辑 / 预览」滚动定位入口。小于等于（640px）时导航改为品牌在上、三项入口等分在下；首页变为单列居中，球体缩为（310px）；领域卡片单列。手机目录搜索、名称输入和 Markdown 文本区采用（16px）字号。

目录列表滚动高度最多为 `min(560px, 65dvh)`，手机为（380px）；节点图画布在目录状态高度（480px）、最大（60dvh），手机为（360px）。默认 100% 保证文字可读，保留总览、缩放与分支过滤。布局在数据或断点变化时确定，不使用持续运行的力导向动画。

## Elevation & Depth

深度主要来自色面差、细边框和留白。领域卡片使用展台灰色面，知识工作台使用白纸与分隔线，均不使用卡片阴影；球体保留轻微投影以支撑物体感。

### Shadow Vocabulary

- **球体投影**（`drop-shadow(10px 18px 22px #00000015)`）：首页珍珠球体。
- **图谱节点**（`0 3px 8px #00000004`）：预览图谱中的节点按钮。
- **目录菜单**（`0 6px 24px rgb(0 0 0 / 0.14)`）：三点菜单的白色浮层。
- **模态浮层**（`0 24px 80px #102d4a33`）：原生对话框；遮罩为 `#1b2d40a3`。

**The Quiet Surface Rule.** 工作台以白纸与边界组织信息；沿用卡片纸面、目录菜单或模态的阴影时遵循其用途，不为每个列表层级增加浮层。

## Shapes

形状以圆形和圆角为主：导航、主按钮和标签使用 `pill`；领域卡片使用 `card`，手机缩为 `card-mobile`；知识工作台为两个（16px）圆角边框方框，目录行与手机定位入口为（6px），目录菜单为（8px）；Markdown 文本区及预览为直角白纸。既有页面字段沿用 `field`；品牌球体是正圆。

## Components

### Buttons

黑色药丸主按钮承担创建与保存；白色次按钮承担补充动作，透明文字按钮用于行内编辑和关联。常规按钮最小高度（44px）；主按钮悬停提亮为 `#363636`，禁用时不透明度（0.45）。文字按钮为深灰（`#505050`），悬停转黑。

键盘焦点采用焦点灰轮廓（3px）及外偏移（4px）。危险确认使用独立危险色，领域删除对话框同时要求勾选确认与重新输入名称。

### Chips / Tags

原有建议标签使用浅灰背景、药丸圆角和紧凑文字；卡片内静态标签使用（4px）圆角。步骤关联选择器中的已选知识采用可移除按钮；不要将二者混为同一种标签样式。

### Cards / Containers

首页领域卡片是浅灰圆角块，上方显示领域名与真实节点数，下方是大树图；领域入口进入知识卡片，图中的节点链接直接阅读。无知识时显示含领域名称的空态提示。编辑与删除放在领域页标题旁。

工作台由目录/节点图与 Markdown/预览两个布局状态组成。编辑状态顶部工具栏放置返回目录、节点路径及保存状态，底部操作行放置保存、放弃与插入图片；未保存状态以琥珀色文字标记。

### Inputs / Fields

字段采用白纸、字段描边，既有页面沿用（7px）圆角。目录搜索圆角（6px），名称输入（5px）；Markdown 文本区无外描边与圆角，桌面内边距（26px）、最小高度（530px）、（14px）等宽字与（1.9）行高，手机内边距（22px 18px）、最小高度（410px）、（16px）字。文本区允许纵向调整，焦点使用内嵌（2px）灰色轮廓。

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

进入领域默认显示该领域的知识卡片；“编辑知识树”进入目录工作台，“知识卡片”返回阅读视图。首页图中的知识节点直接进入同一知识点阅读页。旧 graph 路由仍进入工作台，旧 goals 路由兼容到知识卡片；详细页面保留返回学习空间入口。

### Historical Plan Data

目标、步骤、进度与步骤关联选择界面已移除，相关组件和专用样式清理。已有目标、步骤和关联保留在数据模型及完整备份中；删除领域或知识分支继续正确清理对应关联，不静默删除升级用户的历史数据。

### Knowledge Directory

知识目录呈现独立、稳定 ID 的知识实体，最多五层；所有节点都可以有子节点和 Markdown 正文，没有独立 folder/document 类型。行内缩进每层（20px），有子节点时显示可折叠箭头与 `aria-expanded`；选中行为浅灰底，长名称单行省略并保留完整标题提示。搜索匹配名称，搜索时展开全部分支以显示匹配项。

目录标题右侧加号建立根节点；每行三点菜单提供打开知识点、添加子节点、重命名、移动与删除。新增和重命名使用行内名称表单；第五层禁止新增子节点。拖到节点上成为其子节点，拖到底部区域回到最外层；“移动节点”对话框提供相同能力，目标排除自身、后代及超出五层的位置。删除确认说明分支、正文与关联的影响范围。

桌面三点按钮在悬停、行内焦点或展开状态下显示，手机常显。菜单为固定定位浮层，打开后聚焦首项；Escape 关闭并返回触发按钮，点击外部、焦点离开、滚轮、触摸滚动和窗口缩放均收起。返回目录时保留折叠、搜索和显示数量。

### Knowledge Graph

目录状态的右侧节点图呈现同一组知识实体及选中状态，默认 100% 比例保证文字可读，保留总览、缩放与分支过滤。选中节点为黑底白字，相邻节点使用灰边框与浅灰纸面；父子线为灰色实线，已有额外关系使用领域标记色虚线。图谱以领域名称为总根节点，连接各个知识根节点；这个显示根不持久化、不占五层深度。点击图谱节点直接打开正文；知识库单树图谱保留其知识点阅读入口。关系数据继续兼容备份，旧节点详情与关联编辑界面已移除。

### Knowledge Orb & Home

首页球体是品牌对象与真实数据展台，以 `role="img"` 表达；珍珠白径向渐变球面（`#ffffff` → `#d9d9d3`）、墨色经纬网格。球面按领域轮播用户真实知识树（每领域最多 26 个节点，约 26 秒一圈、7 秒切换），根节点更大并带领域标记色，根名称在正面浮现；悬停时节点从球面展开为环绕轨道（半径 150→245，飞出球面的节点转为墨色），继续旋转，移开收回。球体无加号与创建动作；创建入口为左侧“新建领域”。空账号或尚无知识树时呈现线框球与「从一个想法开始」。下方领域卡片显示领域名与真实节点数，以及该领域点线树图：总根显示领域名、使用领域色大点，知识节点为墨色小点，全部节点带名字，关联为领域色虚线。画布高度桌面（360px）、手机（260px），SVG 最小宽度（900px），保留字号并在内部滚动，不把多节点图压缩成缩略图。桌面示例卡片高约（484px），手机约（367px）；节点字实际约（20px / 16px）。点击领域进入知识卡片，点节点直接阅读，底部无编辑、删除或箭头。

**The Real Data Rule.** 球体展出、领域卡树图与编辑器图谱都来自用户的实际实体和关系；空态不补造节点或连线。

### Knowledge Studio & Knowledge Point

打开任何目录项后，目录隐藏但保持挂载，右侧节点图替换为 Markdown 预览，左右窗格等宽。正文使用 Markdown 子集（标题、段落、粗斜体、行内代码、代码块、列表、引用、链接、`$公式$`）；预览直接读取当前正文草稿，显式保存后才写入 IndexedDB。顶部显示节点路径、返回目录和保存状态；“保存修改”与文本区 Ctrl/Cmd+S 保存，“放弃修改”恢复原文。返回、放弃或离开页面前保护未保存修改，保存失败保留草稿。

“插入图片”、粘贴及文件拖入使用同一插入流程：压缩图片存入 IndexedDB，在光标或选区处写入 `![名称](img:id)` 并立即预览，本地图片可放大并纳入备份。远程 `http(s)` Markdown 图片保留 URL 并按需加载，约束至窗格宽度；原始 HTML 不渲染。图片插入期间显示状态并禁用编辑、保存和返回，失败显示错误且保留原文。手机两窗格上下排列，定位入口按当前状态显示。

**The Paired Editing Rule.** Markdown 编辑与预览成对出现；实时预览不等于已经写入本机，工具栏明确显示保存与图片插入状态。

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
- **Do** 区分知识卡片阅读与知识目录编辑，让图中节点直接进入对应内容。
- **Do** 保留展开、选中、当前页面、保存状态和可见键盘焦点的语义。
- **Do** 用内联 SVG 表达应用操作与品牌球体；将用户自选领域颜色与符号视为个人内容。

### Don't:

- **Don't** 在初始学习空间预设学科、目标、知识节点或示例完成率。
- **Don't** 以任何形式恢复复习卡片界面替代知识树结构；旧复习数据只通过备份保留与导出。
- **Don't** 让 Markdown 渲染原始 HTML；公式走 KaTeX，图片仅接受 IndexedDB 引用或 `http(s)` Markdown 图片地址。
- **Don't** 把完成步骤解释为已掌握知识，或用颜色单独表达关系与完成状态。
- **Don't** 引入深色主题、营销首屏、数据大屏或花哨后台来替换白色展台语言；也不要回到旧版绿色侧栏视觉。
- **Don't** 给每个工作台容器添加重阴影、全屏模糊或循环动画。
- **Don't** 把预览中的未保存草稿当作已持久化数据，或静默丢弃用户输入。

未纳入通用规范：图谱缩放与分页沿用既有局部实现；通用动作图标仍用内联 SVG，避免将字符图标推广为系统规则。
