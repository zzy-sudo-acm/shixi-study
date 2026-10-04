# 数据格式与迁移

应用版本为 2.0.0，`DATA_VERSION`、IndexedDB 和完整备份的数据格式为 **3**。应用版本与数据版本独立。

## 新模型

`Snapshot` 包含六个独立实体集合，以及兼容模块的 cards、reviews、categories、settings、algorithm、revision、undoId、migrationWarnings。图片仍是独立 IndexedDB Blob 存储。

| 实体 / store                           | 引用与规则                                                          |
| -------------------------------------- | ------------------------------------------------------------------- |
| Space / spaces                         | 稳定 id，自定义 name、icon、color                                   |
| Goal / goals                           | spaceId、parentGoalId；最多三层                                     |
| Step / steps                           | goalId；completed 与 completedAt 一致                               |
| KnowledgeNode / knowledgeNodes         | spaceId、parentId；最多五层，note 为普通文字                        |
| KnowledgeRelation / knowledgeRelations | spaceId、sourceNodeId、targetNodeId；同领域，无向，不重复、不自关联 |
| StepKnowledgeLink / stepKnowledgeLinks | stepId、knowledgeNodeId；同领域，不重复                             |

重命名和移动只更新属性或 parent 引用，不改变实体 id。模型校验拒绝循环、缺失父节点、跨领域引用、重复 id 和超过最大深度的分支。目标进度统计自身及后代的全部步骤，领域进度统计领域内的全部步骤，各步骤等权；没有步骤时 percent 为 null，界面显示“尚未建立计划”。

## 旧 IndexedDB 升级

在同一个 versionchange 事务中完成 v1 → v2 的原有提醒设置补充，再执行 v2 → v3 迁移，并建立六个 store。

- 仅有实际卡片或分类目录的旧科目才生成 Space。空旧库仍为空，不生成固定科目。
- 分类字符串逐段建立 KnowledgeNode 的 parentId。旧卡片及原分类路径完整保留在兼容模块中，不用名称充当新节点身份。
- 超过五层的路径将余下段落合并在第五层标题中，并记录明确迁移提示；原路径仍保留。
- 未分类卡片生成标题节点，笔记说明对应的原记忆卡片。旧卡片之间的关系尽可能投影为同领域的节点关系，合并重复或同节点关系；原卡片关系保留。
- 不制造 Goal、Step 或完成记录。迁移后未规划的领域仍显示“尚未建立计划”。迁移提示保存在 meta 并显示在首页。
- 结构不合法时中止整次升级，旧数据库版本与原记录回滚。错误页面提供“导出原始数据副本”，直接按现有版本只读导出全部 store、主键和记录，Blob 转为带 mime 的 base64。该副本用于修复原始数据，**不是普通备份，不能直接从设置页导入**。

迁移实现见 `src/core/migration.ts`，实际升级事务见 `src/core/db.ts`，原始导出见 `src/core/recovery.ts`。草稿数据库不参与这次改动。

## 完整备份

v3 导出包含六类新实体、迁移提示和原有卡片、图片、历史、调度参数、设置、分类、撤销引用。v1/v2 备份先经过旧结构校验，再采用相同迁移规则转换。

恢复前校验版本、严格 Zod schema、SHA-256、完整引用、层级/环、图片引用以及原有复习历史连续性。未知版本和无效数据拒绝导入。恢复界面显示各实体数量及整份替换范围，允许先导出现有数据；确认后所有数据在同一事务中替换，失败回滚。

## 删除与并发

- Space：两阶段确认，第二阶段重新输入名称；删除所属目标、步骤、知识节点、节点关系与步骤关联。兼容模块的旧卡片、图片、复习历史独立保留，界面明确说明。
- Goal：确认后递归删除后代 Goal、Step 和相应 StepKnowledgeLink。
- Step：确认后删除其关联。
- KnowledgeNode：有子节点时底层默认阻止直接删除；界面明确选择删除整个分支，或取消后先移动子节点。删除分支时清除涉及节点的 Relation 与 StepKnowledgeLink。
- 全部命令复用 revision 事务检查及 BroadcastChannel 刷新机制，避免旧页面覆盖新数据。事务写入失败不产生部分引用清理。
