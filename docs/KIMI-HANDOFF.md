# 时习前端改版交接给 Kimi

交接时间：2026-10-04。用户要求停止继续消耗额度，由 Kimi 接手。主体实现完成，本轮没有 Git 提交、push 或部署。

## 可以直接给 Kimi 的提示词

你接手的是 D:\知识树 的「时习」前端改版，请先阅读本文件、PRODUCT.md、docs/WHITE-STUDIO-REFRESH.md，再查看当前 git diff 和本地页面。沿着现有成果收尾，不要从头重写。

用户不满意之前的绿色侧栏界面，认为朴素、没有特点。参考 dot.com 现在的 Grok Bot 页面，希望纯白背景上直接排字、巨大的黑色球形视觉、简约高级，卡片内部丰富且有动态交互。三个入口「学习空间 / 记忆卡片 / 设置与备份」居中，再逐层进入领域。知识树与知识图谱应采用两个同级卡片，左侧编辑，右侧立即看效果。参考网站的手机屏幕是互动方式的启发，不代表要求新增 AI 聊天后台。用户明确喜欢增加动效，不能把个人审美解释成要求减少动效；同时尊重系统 prefers-reduced-motion。

当前实现已经落实了白色大球首页、居中导航、领域卡片真实知识缩略图、左侧名称/笔记编辑、右侧笔记/图谱/手机三种实时预览，以及显式保存、未保存离开保护、保存失败保留草稿。请先实际操作，检查用户要求是否满足，只修具体问题。保持 IndexedDB 数据结构、用户近期新增的弹簧/页面切换动效、全部原有功能，不回退到旧绿色视觉，不制造初始学习领域和进度。预览未保存内容不等于已经写入本机。

剩余工作：完成独立视觉审核，按发现做必要修复；更新实际设计文档；确认生产构建和受影响测试；按用户授权提交并发布 GitHub Pages，部署完成后检查在线新版。别重复无意义的全量检测或无限截图润色。详细现状、文件和验证结果如下。

## 项目与 Git 状态

- React 19、TypeScript、Vite，pnpm 项目；个人本机学习工具，无后端、无自动跨设备同步。
- 当前分支 main，当前 HEAD：`8c684fb feat: add spring motion, page transitions and staggered entrances`，这是用户近期已有改动，须保留。
- 本次改版都在工作区，未提交。不要 reset、覆盖或清理未提交成果。
- 远程：`https://github.com/zzy-sudo-acm/shixi-study.git`。
- Pages：`https://zzy-sudo-acm.github.io/shixi-study/`。在线页面还没有本次白色改版，不可宣称已上线。
- `.github/workflows/pages.yml` 已具备 main push 自动检查、生产浏览器测试、Pages 部署，无需重建工作流。
- 用户此前明确要求上传 GitHub、部署 Pages；用户全局偏好要求推送/修改远程前确认授权，接手时据当前授权执行，避免强推。

## 本轮文件

新增：

- `src/studio.css`：白色主题与水平居中导航，首页大球布局、领域卡片、等宽等高双工作卡片、手机框架、移动适配和动效。
- `src/ui/KnowledgeOrb.tsx`：原生 SVG 黑色球体，白色品牌三节点；指针跟随、轨道反馈、按压反馈、点击新建领域。无后台循环和额外依赖。
- `src/ui/KnowledgeStudio.tsx`：双卡片核心。真实草稿编辑、显式保存和保护；右侧切换笔记/图谱/手机；手机可展开收起真实笔记；手机端有「前往编辑 / 查看呈现」快捷滚动。
- `tests/e2e/studio.spec.ts`：3 类有意义的功能测试，每类桌面/手机各一次。
- `docs/WHITE-STUDIO-REFRESH.md`：本次方向合同。

修改：`src/App.tsx`、`src/main.tsx`、`src/ui/Home.tsx`、`src/ui/SpacePage.tsx`、`src/ui/KnowledgeGraph.tsx`、`src/ui/NodeDetails.tsx`、`.impeccable/surfaces/src-ui-home-tsx.md`。

`NodeDetails` 新增可选 `showTools`，右侧不重复左侧编辑工具，关联知识与学习任务仍保留。图谱嵌入右侧，默认 100% 保证文字可读，保留总览/缩放/分支过滤。手机下双卡片上下排列。旧基础样式仍在，`studio.css` 最后导入覆盖，不要删除旧功能样式。

## 已验证

- 本轮 53 项单元测试通过。
- 本轮全部 40 项桌面/手机 E2E 通过。
- 最后布局调整后，新增 6 项 E2E 再次通过：实时草稿不提前写 IndexedDB，保存/刷新保持 ID；切换节点/导航保护未保存内容；模拟 QuotaExceededError 保留草稿并能恢复重试。
- 最后版本 Prettier、TypeScript、Vite 生产构建、`git diff --check` 均通过。
- 桌面 1440×1000、手机 390×844、宽屏 1920×1080 共 12 张最终全页截图均已查看，页面无横向溢出、无 pageerror。
- 独立浏览器实际验证了球体鼠标跟随、系统动效偏好、笔记/图谱/手机同步、保存后刷新；桌面/手机都通过。
- 测试与截图的领域/节点只写入隔离测试浏览器，未修改用户的真实浏览器数据。

## 审核与文档尚未结束

使用了 frontend-design、impeccable 技能，选择 code-led 实现，没有批准的像素级设计稿。

独立 reviewer 已查看全部 12 张截图，确认截图有效，但正式 disposition 尚未返回；用户要求交接时已停止审核。不能把现状说成终审通过。审核停在要求补充 QUALITY BAR card 和 seed 的证据，属于技能流程资料，尚未形成界面问题清单。

`docs/DESIGN.md` 和 `.impeccable/design.json` 仍描述上一版绿色视觉，需要按实际白色界面更新，不能拿旧文档约束这次已指定的白色方向。

设计检测只运行过一次，结果为 82 项旧设计系统 advisory（32 颜色、41 字号、9 圆角），没有 primary finding。不要重新跑检测器循环。正式结束前应完成截图/源码审核及设计文档记录。

## 预览与证据

本地 Vite 已运行：`http://127.0.0.1:4173/shixi-study/`。

截图目录：`.impeccable/review/white-studio/`（Git 忽略）。

- 桌面：`empty-desktop.png`、`home-desktop.png`、`editor-desktop.png`、`graph-desktop.png`、`phone-desktop.png`。
- 手机：同上文件名把 desktop 换成 mobile。
- 宽屏：`home-wide.png`、`editor-wide.png`。
- `detector.json`：一次检测的原始结果。
- `local-verification.json`：球体/实时预览/保存的实际验证结果。

忽略的辅助脚本：`artifacts/capture-white-studio.mjs`（隔离浏览器生成截图）、`artifacts/verify-white-pages.mjs`（本地或在线功能验证）。这些不是发布资源，不需提交。

## 必要命令（PowerShell）

```powershell
Set-Location 'D:\知识树'
git -c safe.directory=D:/知识树 status --short
git -c safe.directory=D:/知识树 diff
node node_modules/typescript/bin/tsc -b
node node_modules/vite/bin/vite.js build
$env:PLAYWRIGHT_CHROMIUM_EXECUTABLE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
node node_modules/@playwright/test/cli.js test tests/e2e/studio.spec.ts
```

如已有预览服务停止：

```powershell
node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4173 --strictPort --base /shixi-study/
```

本地验证：

```powershell
$env:VERIFY_SITE = 'http://127.0.0.1:4173/shixi-study/'
node artifacts/verify-white-pages.mjs
```

部署成功后在线验证：

```powershell
$env:VERIFY_SITE = 'https://zzy-sudo-acm.github.io/shixi-study/'
node artifacts/verify-white-pages.mjs
```

只暂存明确属于本轮的源码/测试/文档，普通提交、普通 push；不要强推，不修改全局 Git safe.directory。`gh` 已登录 zzy-sudo-acm，位于 `C:/Program Files/GitHub CLI/gh.exe`。等待 Pages 工作流成功，再实际验证线上新界面后交付。
