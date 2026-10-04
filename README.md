# 时习 · 个人学习空间

从空白开始，由自己建立学习领域、目标、步骤与知识结构。React + TypeScript + Vite + IndexedDB，无需登录、后端或云服务，手机与电脑均可使用。应用版本 2.0.1，数据格式 v3。

## 怎么用

1. 首次打开没有预设内容。在“我的学习空间”新建任意领域，可编辑名称、图标和颜色。图标可预览并点选 12 个线条图标或常用 emoji，也可输入自己的符号；不选择时默认使用书本。首页球体会轮播展示你真实建立的知识树。
2. 进入领域，在“目标”创建计划。目标最多三层，每个目标可添加步骤；勾选或取消后自动更新目标与领域的计划完成度。没有步骤时显示“尚未建立计划”。
3. 在“知识树”独立建立自己的知识结构，最多五层；可新增、重命名、移动、折叠、删除分支，并为节点写知识点（Markdown 子集：标题、列表、粗斜体、代码、引用、链接、`$公式$` 与图片）。身份使用稳定 id，修改名字不会影响关系。
4. 工作台右侧始终是知识图谱：实线父子关系、虚线额外关系，缩放、总览、筛选分支；点任意节点查看它的知识点。知识库页按根节点列出所有知识树，点卡片看单树图谱，可随时进入编辑。
5. 在步骤上选择“关联知识”。编辑器左侧显示“相关学习任务”与完成状态，可跳转到该步骤。完成步骤仅改变任务进度，不推断知识掌握程度。
6. 删除领域需两次确认；删除目标或知识分支会明确提醒后代与关联的清理范围。定期在“设置与备份”导出完整备份。

知识树和图谱先显示 100 个节点，可继续展开；关联选择器支持搜索和分批显示。移动端工作台上下排布，图谱支持滚动与缩放。

## 复习功能的去向

错题、单词、句子等记忆卡片与 FSRS 复习界面已于 2026-10 移除。已有卡片、图片与复习历史不会被删除：它们仍在本机 IndexedDB 中，并继续包含在完整备份里。公式渲染（KaTeX）保留在知识点的 Markdown 中。历史使用说明见 [旧版文档](docs/LEGACY-README.md)。

## 本地运行

需要 Node.js ≥22.12.0 和 pnpm 11.19.0。

```bash
pnpm install --frozen-lockfile
pnpm dev
pnpm check       # TypeScript + 全部核心测试
pnpm build       # 生产构建
pnpm preview
pnpm exec playwright install chromium
pnpm test:e2e    # 桌面与手机视口流程
```

Windows 可使用现有 Chrome 验证生产构建：

```powershell
$env:PLAYWRIGHT_CHROMIUM_EXECUTABLE='C:\Program Files\Google\Chrome\Application\chrome.exe'
pnpm build
$env:TEST_PRODUCTION='1'
pnpm test:e2e
```

生产测试直接服务 `dist/` 的 `/shixi-study/` 子路径，不提供 SPA 路由回退。测试使用隔离浏览器和合成资料，不操作日常浏览器里的真实数据。

## 数据与备份

所有学习数据保存在当前网站地址、路径和浏览器的 IndexedDB 中。手机与电脑不自动同步；换设备、浏览器或站点地址时使用备份迁移。未保存的录入草稿单独保存在本机，不进入备份。

v3 完整备份包含领域、目标、步骤、知识节点、节点关系、步骤关联，以及全部旧卡片、图片、历史、设置和调度参数。恢复前验证 schema、SHA-256 与全部引用，展示数量和覆盖确认；恢复是整份替换，事务失败会回滚。

旧 IndexedDB 与 v1/v2 备份自动迁移。有实际内容的旧科目生成领域，分类路径转为节点，原卡片与路径完整保留。无法安全迁移时保留旧数据库，提供原始数据副本导出；该副本用于修复，不能直接作为普通备份导入。详见 [数据迁移说明](docs/MIGRATION.md)。

清除浏览器数据、存储回收和设备故障可能丢失本地数据，请将完整备份保存在浏览器之外。备份未加密，单份上限 200 MB；不应提交真实笔记、题目照片或备份。没有 Service Worker，不承诺断网后重新打开。

## GitHub Pages

继续使用现有 `.github/workflows/pages.yml`、Vite 相对 base 和 hash 路由，兼容项目子路径与刷新，无需服务器路由回退。例如 `#space/<id>/tree`、`#library/<节点 id>`。

发布到 [zzy-sudo-acm/shixi-study](https://github.com/zzy-sudo-acm/shixi-study) 的 `main` 后，现有工作流自动检查、构建和部署。[打开 GitHub Pages](https://zzy-sudo-acm.github.io/shixi-study/)；发布结果以对应 GitHub Actions 运行记录为准。

实现与验收详见 [新版交付报告](docs/WORKSPACE-REPORT.md)、[验证记录](docs/VERIFICATION.md)、[界面约定](docs/DESIGN.md)。手机 Safari、微信内置浏览器和真机相机仍需实际设备验收。
