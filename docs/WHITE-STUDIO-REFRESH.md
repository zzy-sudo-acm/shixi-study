# 白色交互工作台

Mode: Operate. 用户要求按所附截图重做：白底直接排字、巨大球形视觉、居中三入口、卡片内部有交互，领域中左侧编辑右侧实时呈现。保留自建数据、旧卡片与备份流程。沿用本轮 code-led 工作方式。

## Direction contract

THESIS: 把时习做成可以操作的白色知识展台，编辑与呈现始终成对。

OWN-WORLD: 纯白底、黑色文字和主动作、浅灰展台；圆球承载时习的点线符号，领域自选色只用于个人内容。

STORY: 从居中导航进入学习空间，创建领域，在左侧整理内容，在右侧观察图谱、笔记与手机阅读效果。

FIRST VIEWPORT: 顶部品牌与居中三入口，白底文字和约 400px 球形对象并列；领域页两张同级浅灰卡片，一张编辑，一张实时呈现。

FORM: 交互科学展台，候选第三项，seed 8d0f1545；球体回应指针与按压，知识修改即时传播到右侧，保存状态清楚。

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## 方向依据

七种结构：白色产品陈列、设计草稿台、交互科学展台、双窗编辑器、阅读与批注、领域目录、可展开的纸模型。用户截图固定白色、球形与并列卡片，因此第三项直接在这些约束内实现。

词典、时间表、角色目录、航班看板、暖色消费应用和黑白数据场都不替代用户指定的构图。分别采用其阅读秩序、固定状态位、对象辨识度、变化连续性、可点击性和黑白视觉承诺作为质量要求，不搬用字体、装饰或假数据。

动效有限执行或由用户操作触发；无后台循环。手机上卡片上下衔接，编辑与预览入口保持可达。预览使用真实知识与当前未保存草稿，未保存内容离开前确认，保存失败保留草稿。

## Finish review（2026-10-04 接手完成）

VERDICT: pass。白底、巨大黑色球体、居中三入口、领域卡片真实知识缩略图、工作台左编辑右实时呈现均已实现，与方向合同一致。

证据：`.impeccable/review/white-studio/` 内桌面 1440×1000、手机 390×844、宽屏 1920×1080 共 12 张全页截图（empty/home/editor/graph/phone/wide），外加补审的 library、settings、modal 桌面与手机 6 张（`artifacts/audit-white-pages.mjs` 生成）；全部无横向溢出、无 pageerror。`local-verification.json` 记录球体指针跟随、系统减少动效偏好、笔记/图谱/手机同步与保存后刷新的实测结果。QUALITY BAR card 与 seed 8d0f1545 见本文件 FORM 与 `.impeccable/surfaces/src-ui-home-tsx.md`。

审核覆盖全局 `.studio-app` 主题影响面：记忆卡片、设置与备份、领域表单对话框在白色主题下渲染一致。未发现需要修复的界面问题。设计文档已按实际白色界面重写：`docs/DESIGN.md` 与 `.impeccable/design.json`。

验证：TypeScript、Prettier、`git diff --check`、Vite 生产构建通过；53 项单元测试通过；`tests/e2e/studio.spec.ts` 桌面/手机 6 项通过（草稿实时呈现与持久化、未保存离开保护、保存失败保留草稿并恢复）。
