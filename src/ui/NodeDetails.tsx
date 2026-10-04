import { useMemo, useState } from 'react'
import type { KnowledgeNode, Snapshot } from '../core/model'
import { depthOf, descendants, nodePath } from '../core/workspace'
import { Icon } from './shared'
import { FormActions, Modal, type Act, type Dirty } from './workspaceShared'

export function NodeForm({
  existing,
  parentId = null,
  spaceId,
  data,
  mode,
  act,
  busy,
  error,
  setDirty,
  onClose,
  onSaved,
}: {
  existing?: KnowledgeNode
  parentId?: string | null
  spaceId: string
  data: Snapshot
  mode: 'add' | 'edit' | 'move'
  act: Act
  busy: boolean
  error: string
  setDirty: Dirty
  onClose: () => void
  onSaved: (id: string) => void
}) {
  const [title, setTitle] = useState(existing?.title ?? ''),
    [note, setNote] = useState(existing?.note ?? ''),
    [parent, setParent] = useState(existing?.parentId ?? parentId)
  const nodes = data.knowledgeNodes.filter((n) => n.spaceId === spaceId),
    byId = new Map(nodes.map((n) => [n.id, n]))
  const excluded = existing ? descendants(existing.id, nodes, (n) => n.parentId) : new Set()
  return (
    <Modal
      title={mode === 'move' ? '移动节点' : existing ? '编辑节点' : parentId ? '添加子节点' : '新建根节点'}
      busy={busy}
      error={error}
      onClose={onClose}
      setDirty={setDirty}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault()
          const now = Date.now(),
            id = existing?.id ?? crypto.randomUUID()
          void act({
            type: 'saveNode',
            value: {
              id,
              spaceId,
              title,
              note,
              parentId: parent,
              createdAt: existing?.createdAt ?? now,
              updatedAt: now,
            },
          }).then((ok) => {
            if (ok) {
              setDirty(false)
              onSaved(id)
              onClose()
            }
          })
        }}
      >
        <fieldset disabled={busy}>
          {mode !== 'move' ? (
            <>
              <label>
                节点名称
                <input
                  autoFocus
                  required
                  maxLength={200}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </label>
              <label>
                笔记
                <textarea
                  rows={6}
                  maxLength={100000}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="写下你自己的理解。"
                />
              </label>
            </>
          ) : (
            <p>将“{title}”及其子节点移动到新的位置。</p>
          )}
          <label>
            父节点
            <select
              autoFocus={mode === 'move'}
              value={parent ?? ''}
              onChange={(e) => setParent(e.target.value || null)}
            >
              <option value="">根层级</option>
              {nodes
                .filter((n) => !excluded.has(n.id) && depthOf(n.id, byId, (x) => x.parentId) < 5)
                .map((n) => (
                  <option key={n.id} value={n.id}>
                    {nodePath(n.id, nodes).join(' › ')}
                  </option>
                ))}
            </select>
          </label>
          <FormActions
            busy={busy}
            onClose={() => {
              setDirty(false)
              onClose()
            }}
            save={mode === 'move' ? '确认移动' : '保存节点'}
          />
        </fieldset>
      </form>
    </Modal>
  )
}
export function NodeRelations({
  node,
  data,
  act,
  busy,
  onSelect,
}: {
  node: KnowledgeNode
  data: Snapshot
  act: Act
  busy: boolean
  onSelect: (id: string) => void
}) {
  const [relating, setRelating] = useState(false),
    [search, setSearch] = useState('')
  const nodes = useMemo(
    () => data.knowledgeNodes.filter((n) => n.spaceId === node.spaceId),
    [data.knowledgeNodes, node.spaceId],
  )
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const relations = data.knowledgeRelations.filter(
    (r) => r.sourceNodeId === node.id || r.targetNodeId === node.id,
  )
  const connected = new Set(
    relations.map((r) => (r.sourceNodeId === node.id ? r.targetNodeId : r.sourceNodeId)),
  )
  const choices = nodes.filter(
    (n) =>
      n.id !== node.id &&
      !connected.has(n.id) &&
      (!search || n.title.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())),
  )
  const links = data.stepKnowledgeLinks.filter((l) => l.knowledgeNodeId === node.id)
  const steps = new Map(data.steps.map((s) => [s.id, s])),
    goals = new Map(data.goals.map((g) => [g.id, g]))
  return (
    <div className="node-relations">
      <div className="node-detail-section">
        <div className="section-head">
          <h3>相关知识</h3>
          <button className="text-button" disabled={busy} onClick={() => setRelating((v) => !v)}>
            <Icon name="link" size={16} />
            {relating ? '收起选择' : '建立关联'}
          </button>
        </div>
        {relations.length ? (
          <ul className="detail-links">
            {relations.map((r) => {
              const otherId = r.sourceNodeId === node.id ? r.targetNodeId : r.sourceNodeId
              return (
                <li key={r.id}>
                  <button className="text-button" onClick={() => onSelect(otherId)}>
                    {byId.get(otherId)?.title}
                  </button>
                  <button
                    className="text-button"
                    disabled={busy}
                    aria-label={`移除知识关联 ${byId.get(otherId)?.title}`}
                    onClick={() => void act({ type: 'deleteRelation', id: r.id })}
                  >
                    <Icon name="close" size={15} />
                  </button>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="muted">还没有额外关联。</p>
        )}
        {relating ? (
          <div className="relation-choices">
            <input
              type="search"
              aria-label="搜索相关知识"
              placeholder="查找要关联的节点"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="picker-list">
              {choices.slice(0, 50).map((n) => (
                <button
                  className="text-button"
                  disabled={busy}
                  key={n.id}
                  onClick={() =>
                    void act({
                      type: 'addRelation',
                      value: {
                        id: crypto.randomUUID(),
                        spaceId: node.spaceId,
                        sourceNodeId: node.id,
                        targetNodeId: n.id,
                        createdAt: Date.now(),
                      },
                    })
                  }
                >
                  <Icon name="add" size={15} />
                  {n.title}
                </button>
              ))}
            </div>
            {!choices.length ? (
              <p className="muted">没有可关联的节点，可以先添加一个节点。</p>
            ) : choices.length > 50 ? (
              <p className="muted">输入关键词查找其余 {choices.length - 50} 个节点。</p>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className="node-detail-section">
        <h3>相关学习任务</h3>
        {links.length ? (
          <ul className="task-links">
            {links.map((l) => {
              const step = steps.get(l.stepId)!,
                goal = goals.get(step.goalId)!
              return (
                <li key={l.id}>
                  <a href={`#space/${node.spaceId}/goals?step=${encodeURIComponent(step.id)}`}>
                    <span aria-label={step.completed ? '已完成' : '未完成'}>
                      {step.completed ? <Icon name="check" size={17} /> : <span className="task-square" />}
                    </span>
                    <span>
                      {goal.title} · {step.title}
                    </span>
                  </a>
                  <button
                    className="text-button"
                    disabled={busy}
                    aria-label={`移除任务关联 ${step.title}`}
                    onClick={() => void act({ type: 'deleteLink', id: l.id })}
                  >
                    <Icon name="close" size={15} />
                  </button>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="muted">还没有相关任务。到目标中为步骤关联这个知识节点。</p>
        )}
      </div>
    </div>
  )
}
