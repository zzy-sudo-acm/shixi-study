# 待发布清单

建议目标仓库：`zzy-sudo-acm/shixi-study`，建议公开源码仓库，以便使用 GitHub Pages。尚未创建远程仓库、推送或修改 Pages 设置。

准备上传：

- `src/`：四科首页、录入、内容库、复习、备份设置，以及独立的数据/FSRS 模块。
- `public/`：自制站点图标与 `.nojekyll`。
- `tests/`：合成测试题目和代码内生成的测试图片；不含个人题目或真实学习记录。
- `package.json`、`pnpm-lock.yaml`、TypeScript / Vite / Playwright 配置。
- `.github/workflows/pages.yml`：检查、构建、Pages 发布。
- README 与设计、验证、发布说明。

不上传：`node_modules/`、`dist/`、本地工具、运行日志、浏览器存储、真实截图、备份、测试输出和预览截图。网站首次打开为空库。

确认范围应包括：目标仓库名、公开或私有、创建仓库、推送 `main`、启用 GitHub Actions Pages 发布。获得确认前只做本地开发与检查。
