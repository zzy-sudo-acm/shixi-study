# 时习 · 个人考研复习本

一个无需登录、无需后端的中文复习网页。固定高数、英语、408、政治四科，用主动回忆与 FSRS 间隔复习记住自己学过的内容。首次打开没有演示资料，不会产生虚构复习记录。

## 本地运行

使用 Node.js 24（最低 22.12）和 pnpm 11.19.0：

```bash
npm install --global pnpm@11.19.0
pnpm install --frozen-lockfile
pnpm dev
```

打开终端显示的本地地址。不要直接双击 `index.html` 或 `dist/index.html`，浏览器数据库和模块需要通过 HTTP/HTTPS 使用。电脑重启后重新执行 `pnpm dev`。

```bash
pnpm check       # TypeScript + 核心测试
pnpm build       # 构建到 dist/
pnpm preview     # 本地预览生产构建
pnpm exec playwright install chromium
pnpm test:e2e    # 桌面与手机尺寸完整流程测试
```

Windows 也可用已安装的 Chrome 跑浏览器测试：

```powershell
$env:PLAYWRIGHT_CHROMIUM_EXECUTABLE='C:\Program Files\Google\Chrome\Application\chrome.exe'
pnpm test:e2e
```

生产构建的子路径检查（不启用服务器路由回退）：先运行 `pnpm build`，在 PowerShell 中执行 `$env:TEST_PRODUCTION='1'; pnpm test:e2e`；Bash 中执行 `TEST_PRODUCTION=1 pnpm test:e2e`。

本项目测试使用隔离浏览器和合成图片，不会打开或操作日常浏览器里的真实资料。

## 怎么用

1. 在「添加内容」选择知识点或练习题。写一个具体问题，补充答案；文字、图片可以混用。
2. 桌面可粘贴截图、拖入图片；手机可选照片或拍照。默认本地压缩，公式较密可开启「保留原图」后再添加。支持 JPG、PNG、WebP，单图最大 16 MB；HEIC 需先转为 JPG。
3. 来不及整理时，先把截图存为「待整理」。它不会进入复习队列。
4. 每天从「今天复习」开始，先处理到期内容，再学习新内容。默认每天新学 20 条，四科共用，可设置为 0。
5. 想过或做过以后显示答案，再选「忘了 / 困难 / 记得 / 轻松」。困难表示不看答案仍能想起；看了答案才想起来选忘了。
6. 可撤销最后一次评分，恢复完整调度状态和历史。刷新后也可撤销；撤销只保留一步，编辑内容会结束当前撤销机会。编辑不会重置进度。

公式支持 `$x^2$`、`$$\int_0^1 x\,dx$$`、`\(...\)` 和 `\[...\]`。普通文字不作为 HTML 执行；公式输入错误时保留原文。图片可以放大或按原尺寸查看。搜索覆盖文字与来源标签，不识别图片中的文字。没有 AI、OCR、PDF 自动拆题或付费接口。

复习时空格显示答案，数字 1–4 评分；也可全程 Tab 和 Enter 操作。答案在展开前不渲染到页面。漏学不会自动完成或重置。短间隔卡片按真实到期时刻重新出现，页面每 15 秒及重新获得焦点时刷新时间。

## 数据、备份与提醒

- 所有卡片、图片 Blob、设置、复习历史、调度状态保存在当前网站和当前浏览器的 IndexedDB 中；不使用 localStorage 存图片。数据库名以 `shixi:` 开头，按网站路径区分。
- 清除浏览器数据、隐私窗口关闭、浏览器自动回收存储或设备故障都可能丢失数据。**定期导出完整备份，保存在浏览器以外。**
- 手机和电脑不自动同步。换设备、浏览器、域名、端口或网站路径时，用备份迁移；本地开发地址的数据不会自动出现在 GitHub Pages。
- 「设置与备份」导出一个 JSON，包含图片、卡片、历史、设置和参数。导出会检查一致性；下载交给浏览器后，请确认文件确实已保存。
- 恢复前校验版本、结构、SHA-256、图片引用和历史连续性，再展示覆盖确认及「先导出现有数据」。恢复是整份替换，不合并。写入事务失败会回滚，旧数据不变。
- 数据库和备份格式为 v2，支持 v1 → v2 补充提醒设置的迁移。未知版本拒绝导入，不清除现有数据。当前单份备份上限 200 MB；备份未加密，应私下保管。
- 第一版只提供应用内到期提示和希望复习的时间。**网页关闭后不推送、不唤醒设备**，没有系统通知权限请求或隐藏后台服务。未加入 Service Worker，不承诺断网后重新打开可用。
- 不上传学习内容，不加入统计追踪。JS、公式库及公式字体随项目打包；外部文档链接只有主动点击时才访问。

请不要把题目照片、笔记或备份放进待提交文件。`.gitignore` 已排除 `backups/`、`uploads/`、`private/`、导出备份、测试截图和构建目录；上传前仍应检查文件清单。

## GitHub Pages 部署

已准备 `.github/workflows/pages.yml`，**本地存在配置不代表已经上线**。创建仓库、推送或修改远程设置前，需要仓库所有者确认目标与发布内容。

确认后，把源码推送到目标仓库的 `main` 分支，在 GitHub 的 Settings → Pages → Source 选择 GitHub Actions。工作流依次安装锁定依赖、类型检查、核心测试、浏览器测试、构建，并只上传 `dist/`。PR 只检查，不部署。

默认 `base: './'` 配合 hash 路由（如 `/shixi-study/#library`），支持项目子路径与刷新，不需要服务器路由回退。需固定前缀时，可用 `VITE_BASE_PATH=/仓库名/` 构建。访问站点时使用以 `/` 结尾的项目地址。

官方参考：[Vite 静态部署](https://vite.dev/guide/static-deploy.html#github-pages)、[GitHub Pages 工作流](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)。

## 实现边界

调度使用 [ts-fsrs](https://open-spaced-repetition.github.io/ts-fsrs/) **5.4.2** 的默认参数，直接调用 `createEmptyCard`、`next` 和 `repeat`。没有自创遗忘公式，没有拟合个人参数，90% 是目标保留率参数而非个人掌握率。库的参数及版本与每条历史一起保存；升级调度库时须显式设计迁移，不可仅替换版本。

核心逻辑在 `src/core/`，页面在 `src/ui/`。评分、撤销、保存及恢复均使用 IndexedDB 事务；版本号检查阻止旧页面覆盖新数据。复习时间以时间戳保存，显示、日界和每日限额按设备本地时区计算，历史另记当时的时区和偏移。

面向支持 IndexedDB、Web Crypto、`createImageBitmap`、原生 dialog 的现代浏览器。已验证 Chromium 桌面和手机视口；手机系统相机及 Safari 真机仍需实际设备验收，模拟手机视口不等于真机相机测试。
