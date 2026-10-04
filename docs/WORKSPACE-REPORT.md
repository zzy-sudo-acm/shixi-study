# 个人学习空间 2.0.0 交付报告

日期：2026-10-04。用户要求的 Phase 1–7 已实现，随后明确授权上传 GitHub 并部署 Pages；本次发布使用已有仓库的 `main` 和 Pages 工作流。

## 已实现

- 首次进入是真正空白；任意领域的创建、名称/图标/颜色编辑与两阶段删除确认。
- 独立 Goal/Step：目标最多三层，步骤新增、编辑、删除、完成/取消，目标和领域的递归实际进度。
- 独立 KnowledgeNode：稳定 id、parentId，最多五层，新增、重命名、移动分支、折叠、计数、搜索、纯文字笔记、分支删除。
- KnowledgeRelation：同领域的无向额外关系，防自关联与重复，节点删除同步清理。
- StepKnowledgeLink：步骤选择多个节点；节点反向显示相关任务和状态，可直接跳转步骤。完成任务不修改知识节点。
- 知识图谱：父子实线、额外关系虚线、选中与邻接高亮、缩放、总览、分支过滤，桌面横向与手机纵向静态布局。树/图先显示 100 节点，避免初始渲染全部内容。

## 数据模型与迁移

应用版本 2.0.0，`DATA_VERSION = 3`。Snapshot 添加 spaces、goals、steps、knowledgeNodes、knowledgeRelations、stepKnowledgeLinks 六个集合，使用严格 Zod 实体及引用校验，新增六个 IndexedDB store。名称用于展示，实体身份使用稳定 id。

Goal 递归统计自身和子目标的 Step；Space 汇总所属 Step，全部等权。无 Step 时 percent 为 null，显示“尚未建立计划”。两个树独立，只有关联连接它们。

v1/v2 IndexedDB 在真实升级事务中转换；旧科目只在有实际卡片或分类时建立 Space，旧路径转换为节点链；超过五层的尾段合并并记录提示。原卡片、分类路径和历史完整保留。结构非法时整次事务回滚，提供只读原始 store 导出，不静默跳过坏记录。v1/v2 备份使用相同转换规则；v3 备份完整保存新旧实体及图片，验证 hash、schema、层级和全部引用后，经用户确认再整份事务恢复。详见 [迁移说明](MIGRATION.md)。

## 保留能力

保留 IndexedDB 原子写入、revision 防并发覆盖、BroadcastChannel 刷新、图片 Blob/压缩/复用/放大、公式、草稿、待整理、录入快捷键、批量录入、卡片搜索、熟悉程度、FSRS 5.4.2、复习队列、评分历史、一阶段撤销、备份/恢复及相对 base/hash 路由。

记忆卡片从首页中心移到独立入口，科目候选按已有领域与旧卡片动态生成，所有卡片类型均可使用；旧路径树/卡片图保留为兼容组件。删除新 Space 不删除独立旧卡片和历史，确认界面明确说明。目前新知识节点尚未直接挂载记忆卡片，与用户指定的第一阶段边界一致。

## 文件清单

| 范围                 | 新增或修改文件                                                                                                                                                                                                                                              |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 数据模型、命令与迁移 | `src/core/model.ts`、`workspace.ts`（新增）、`migration.ts`（新增）、`recovery.ts`（新增）、`db.ts`、`backup.ts`、`graph.ts`                                                                                                                                |
| 新工作台             | `src/ui/Home.tsx`、`SpacePage.tsx`（新增）、`Goals.tsx`（新增）、`KnowledgeTree.tsx`、`KnowledgeGraph.tsx`、`NodeDetails.tsx`（新增）、`KnowledgeLinkPicker.tsx`（新增）、`workspaceShared.tsx`（新增）                                                     |
| 兼容模块             | `src/ui/CardsHome.tsx`、`LegacyCategoryTree.tsx`、`LegacyCardGraph.tsx`（保留原组件为新文件），`Editor.tsx`、`Library.tsx`、`Review.tsx`、`Settings.tsx`                                                                                                    |
| 应用与样式           | `src/App.tsx`、`src/main.tsx`、`src/workspace.css`（新增）、`src/style.css`、`src/knowledge.css`、`index.html`                                                                                                                                              |
| 测试                 | `tests/workspace.test.ts`（新增）、`tests/core.test.ts`、`tests/e2e/workspace.spec.ts`（新增）、`tests/e2e/app.spec.ts`、`scripts/capture-workspace.mjs`（新增）                                                                                            |
| 文档与交付           | `README.md`、`PRODUCT.md`（新增）、`docs/MIGRATION.md`、`docs/WORKSPACE-BRIEF.md`、本报告（新增），`docs/DESIGN.md` 及 sidecar、`docs/VERIFICATION.md`、`docs/RELEASE.md`；历史 README 与验证记录保留为 `docs/LEGACY-README.md`、`docs/VERIFICATION-1.0.md` |
| 版本与排除规则       | `package.json` 版本 2.0.0，`.gitignore` 排除原始救援副本与界面截图                                                                                                                                                                                          |

设计元数据写入 `.impeccable/design.json`，包含十个真实组件示例。`docs/UI-REFINEMENT.md` 已标记为旧版历史记录。依赖、FSRS 版本、Pages 工作流未改动。不是整体推翻旧项目。

## 验证结果

TypeScript 通过；全部 53 项核心测试通过；Vite 生产构建通过；开发环境 32 项 E2E 通过；直接服务生产构建 `/shixi-study/` 子路径的 32 项 E2E 全部通过。检查了十张桌面/手机主要页面截图，并按独立审查修复次级文字对比度。详见 [验证记录](VERIFICATION.md)。

## 未完成与下一步

用户要求的首阶段核心功能没有待实现项。尚未进行 Safari/微信内置浏览器、真实触摸及系统相机验收。本次远程发布以对应 GitHub Actions 检查与部署结果为准。

建议用真实旧备份在隔离浏览器中验收迁移，并完成真机测试。后续可在不重置原调度的前提下引入卡片的 knowledgeNodeId 关联，将 FSRS 作为节点下的可选能力；这不属于当前阶段。
