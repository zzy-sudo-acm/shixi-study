# 发布记录

## 2.0.0 · 个人学习空间（2026-10-04）

已完成个人学习空间版本：自定义领域、三层目标与步骤、五层稳定知识节点、无向关系、步骤与知识双向关联、IndexedDB/备份 v3、安全迁移和原始数据救援导出。保留记忆卡片、图片、FSRS、复习、草稿与撤销。

用户已明确授权上传 GitHub 并部署 Pages。本次发布推送到已有仓库 `zzy-sudo-acm/shixi-study` 的 `main`，沿用现有工作流与 Pages 设置；工作流通过类型检查、核心测试、构建和生产浏览器测试后再部署，线上地址为 <https://zzy-sudo-acm.github.io/shixi-study/>。

本地验证结果见 `docs/VERIFICATION.md`，远程发布结果以对应 Actions 运行记录为准。迁移前可先导出完整备份并关闭其他旧页面；Safari 和相机仍需真机验收。

## 1.0.0 · 历史发布记录

已发布：源码公开在 `zzy-sudo-acm/shixi-study`，GitHub Pages 由 Actions 工作流发布，线上地址 <https://zzy-sudo-acm.github.io/shixi-study/>。推送 `main` 即自动检查、构建并重新部署。

以下为首次发布时的范围确认，留作记录。

准备上传：

- `src/`：四科首页、录入、内容库、复习、备份设置，以及独立的数据/FSRS 模块。
- `public/`：自制站点图标与 `.nojekyll`。
- `tests/`：合成测试题目和代码内生成的测试图片；不含个人题目或真实学习记录。
- `package.json`、`pnpm-lock.yaml`、TypeScript / Vite / Playwright 配置。
- `.github/workflows/pages.yml`：检查、构建、Pages 发布。
- README 与设计、验证、发布说明。

不上传：`node_modules/`、`dist/`、本地工具、运行日志、浏览器存储、真实截图、备份、测试输出和预览截图。网站首次打开为空库。

确认范围应包括：目标仓库名、公开或私有、创建仓库、推送 `main`、启用 GitHub Actions Pages 发布。获得确认前只做本地开发与检查。
