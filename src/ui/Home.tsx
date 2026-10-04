import { useState, type CSSProperties } from 'react'
import type { Snapshot, Space } from '../core/model'
import { spaceProgress } from '../core/workspace'
import { Icon } from './shared'
import { SpaceIcon, SpaceIconPicker } from './SpaceIcon'
import { KnowledgeDrawing } from './LearningMap'
import { KnowledgeOrb } from './KnowledgeOrb'
import { FormActions, Modal, ProgressView, useWorkspaceActions, type Dirty } from './workspaceShared'

const colors = ['#456785', '#527668', '#826541', '#75668c', '#8b606a']
export function SpaceForm({
  existing,
  data,
  refresh,
  onClose,
  setDirty,
}: {
  existing?: Space
  data: Snapshot
  refresh: () => Promise<void>
  onClose: () => void
  setDirty: Dirty
}) {
  const [name, setName] = useState(existing?.name ?? ''),
    [icon, setIcon] = useState(existing?.icon ?? ''),
    [color, setColor] = useState(existing?.color ?? colors[0]),
    [customizationChanged, setCustomizationChanged] = useState(false)
  const { act, busy, error } = useWorkspaceActions(data, refresh)
  return (
    <Modal
      title={existing ? '编辑领域' : '新建领域'}
      onClose={onClose}
      busy={busy}
      error={error}
      setDirty={setDirty}
      hasChanges={customizationChanged}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault()
          const now = Date.now()
          void act({
            type: 'saveSpace',
            value: {
              id: existing?.id ?? crypto.randomUUID(),
              name,
              icon: icon || undefined,
              color,
              createdAt: existing?.createdAt ?? now,
              updatedAt: now,
            },
          }).then((saved) => {
            if (saved) {
              setDirty(false)
              onClose()
            }
          })
        }}
      >
        <fieldset disabled={busy}>
          <label>
            领域名称
            <input
              autoFocus
              required
              maxLength={200}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="你正在学习什么？"
            />
          </label>
          <SpaceIconPicker
            value={icon}
            color={color}
            onChange={(next) => {
              setIcon(next)
              setCustomizationChanged(true)
              setDirty(true)
            }}
          />
          <fieldset className="color-picker">
            <legend>标记颜色</legend>
            {colors.map((c) => (
              <button
                type="button"
                key={c}
                aria-label={`选择颜色 ${c}`}
                aria-pressed={c === color}
                style={{ background: c }}
                onClick={() => {
                  setColor(c)
                  setCustomizationChanged(true)
                  setDirty(true)
                }}
              />
            ))}
            <label className="custom-color">
              自选
              <input
                type="color"
                aria-label="自选颜色"
                value={color}
                onChange={(e) => setColor(e.target.value)}
              />
            </label>
          </fieldset>
          <FormActions
            busy={busy}
            onClose={() => {
              setDirty(false)
              onClose()
            }}
            save={existing ? '保存修改' : '创建领域'}
          />
        </fieldset>
      </form>
    </Modal>
  )
}
export function DeleteSpace({
  space,
  data,
  refresh,
  onClose,
  setDirty,
}: {
  space: Space
  data: Snapshot
  refresh: () => Promise<void>
  onClose: () => void
  setDirty: Dirty
}) {
  const [confirmed, setConfirmed] = useState(false),
    [name, setName] = useState('')
  const { act, busy, error } = useWorkspaceActions(data, refresh)
  const goals = data.goals.filter((g) => g.spaceId === space.id),
    goalIds = new Set(goals.map((g) => g.id))
  return (
    <Modal title={`删除“${space.name}”？`} onClose={onClose} busy={busy} error={error} setDirty={setDirty}>
      <p>
        将删除该领域的 {goals.length} 个目标、{data.steps.filter((s) => goalIds.has(s.goalId)).length}{' '}
        个步骤、{data.knowledgeNodes.filter((n) => n.spaceId === space.id).length}{' '}
        个知识节点，以及它们的关联。无法撤销。
      </p>
      <p className="muted">记忆卡片与复习历史独立保留。可先到设置中导出完整备份。</p>
      <label className="check-label">
        <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
        我确认删除该领域及其内容
      </label>
      <label>
        再次输入领域名称
        <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" />
      </label>
      <div className="actions form-actions">
        <button
          className="danger"
          disabled={busy || !confirmed || name !== space.name}
          onClick={() =>
            void act({ type: 'deleteSpace', id: space.id }).then((saved) => {
              if (saved) {
                setDirty(false)
                onClose()
              }
            })
          }
        >
          {busy ? '正在删除…' : '确认删除领域'}
        </button>
        <button
          disabled={busy}
          onClick={() => {
            setDirty(false)
            onClose()
          }}
        >
          取消
        </button>
      </div>
    </Modal>
  )
}
export function Home({
  data,
  refresh,
  setDirty,
}: {
  data: Snapshot
  refresh: () => Promise<void>
  setDirty: Dirty
}) {
  const [form, setForm] = useState<Space | 'new' | null>(null),
    [deleting, setDeleting] = useState<Space | null>(null)
  return (
    <div className="learning-home">
      <section className="home-intro">
        <div className="home-lead">
          <h1 tabIndex={-1}>我的学习空间</h1>
          <p className="home-statement">把所学，连成自己的世界。</p>
          <p className="home-description">
            从一个问题开始。建立目标，整理知识，
            <br />
            让每一次学习都有迹可循。
          </p>
          {!data.spaces.length ? <p className="home-empty-note">还没有任何领域。</p> : null}
          <button className="primary" onClick={() => setForm('new')}>
            <Icon name="add" />
            新建领域
          </button>
        </div>
        <KnowledgeOrb empty={!data.spaces.length} onCreate={() => setForm('new')} />
      </section>
      {data.migrationWarnings.length ? (
        <details className="migration-note">
          <summary>旧数据已安全升级 · 查看说明</summary>
          {data.migrationWarnings.map((message, i) => (
            <p key={i}>{message}</p>
          ))}
          <a href="#library">查看保留的记忆卡片</a>
        </details>
      ) : null}
      {data.spaces.length ? (
        <>
          <div className="space-list-heading">
            <h2>学习领域</h2>
            <span>{data.spaces.length} 个领域</span>
          </div>
          <div className="space-grid">
            {data.spaces.map((space, index) => {
              const goals = data.goals.filter((g) => g.spaceId === space.id && !g.parentGoalId).length
              const count = data.knowledgeNodes.filter((n) => n.spaceId === space.id).length
              return (
                <article
                  className="space-card"
                  key={space.id}
                  style={
                    {
                      '--space-color': space.color ?? colors[0],
                      '--stagger': Math.min(index, 8),
                      '--space-delay': `${Math.min(index, 5) * 35}ms`,
                    } as CSSProperties
                  }
                >
                  <a
                    className="space-open"
                    href={`#space/${space.id}/goals`}
                    aria-label={`进入 ${space.name}`}
                  >
                    <div className="space-card-body">
                      <div className="space-card-copy">
                        <div className="space-title">
                          <span className="space-symbol" aria-hidden="true">
                            <SpaceIcon value={space.icon} size={22} />
                          </span>
                          <h2>{space.name}</h2>
                        </div>
                        <ProgressView progress={spaceProgress(data, space.id)} />
                        <p className="space-meta">
                          {goals} 个目标 · {count} 个知识节点
                        </p>
                        <p className="space-root-preview">
                          {data.knowledgeNodes
                            .filter((node) => node.spaceId === space.id && !node.parentId)
                            .slice(0, 2)
                            .map((node) => node.title)
                            .join(' / ') || '从一个概念，长出自己的结构。'}
                        </p>
                      </div>
                      <div className="space-card-visual">
                        <KnowledgeDrawing
                          nodes={data.knowledgeNodes.filter((node) => node.spaceId === space.id).slice(0, 18)}
                          relations={data.knowledgeRelations.filter(
                            (relation) => relation.spaceId === space.id,
                          )}
                        />
                      </div>
                    </div>
                  </a>
                  <div className="space-actions">
                    <button
                      className="text-button"
                      aria-label={`编辑 ${space.name}`}
                      onClick={() => setForm(space)}
                    >
                      编辑
                    </button>
                    <button
                      className="text-button"
                      aria-label={`删除 ${space.name}`}
                      onClick={() => setDeleting(space)}
                    >
                      删除
                    </button>
                    <a
                      className="space-continue"
                      href={`#space/${space.id}/goals`}
                      aria-label={`继续学习 ${space.name}`}
                    >
                      <Icon name="arrow" size={18} />
                    </a>
                  </div>
                </article>
              )
            })}
          </div>
        </>
      ) : null}
      {form ? (
        <SpaceForm
          key={typeof form === 'string' ? form : form.id}
          existing={typeof form === 'string' ? undefined : form}
          data={data}
          refresh={refresh}
          onClose={() => setForm(null)}
          setDirty={setDirty}
        />
      ) : null}
      {deleting ? (
        <DeleteSpace
          space={deleting}
          data={data}
          refresh={refresh}
          onClose={() => setDeleting(null)}
          setDirty={setDirty}
        />
      ) : null}
    </div>
  )
}
