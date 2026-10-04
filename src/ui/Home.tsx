import { useState, type CSSProperties } from 'react'
import type { Snapshot, Space } from '../core/model'
import { spaceProgress } from '../core/workspace'
import { Icon, PageHead } from './shared'
import { SpaceIcon, SpaceIconPicker } from './SpaceIcon'
import { LearningMap } from './LearningMap'
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
      <PageHead
        title="我的学习空间"
        description="从一个问题开始，把所学慢慢连起来。"
        action={
          data.spaces.length ? (
            <button className="primary" onClick={() => setForm('new')}>
              <Icon name="add" />
              新建领域
            </button>
          ) : undefined
        }
      />
      {data.migrationWarnings.length ? (
        <details className="migration-note">
          <summary>旧数据已安全升级 · 查看说明</summary>
          {data.migrationWarnings.map((message, i) => (
            <p key={i}>{message}</p>
          ))}
          <a href="#library">查看保留的记忆卡片</a>
        </details>
      ) : null}
      {!data.spaces.length ? (
        <section className="blank-workbench map-blank">
          <div className="map-blank-copy">
            <h2>
              你的知识地图，
              <br />
              从这里开始。
            </h2>
            <p>还没有任何领域。</p>
            <p className="map-blank-description">
              建立一个你正在学习的东西。
              <br />
              目标、知识和它们之间的连接，会慢慢在这里成形。
            </p>
            <button className="primary" onClick={() => setForm('new')}>
              <Icon name="add" />
              新建领域
            </button>
          </div>
          <div className="map-origin">
            <span className="origin-guide origin-guide-x" aria-hidden="true" />
            <span className="origin-guide origin-guide-y" aria-hidden="true" />
            <button onClick={() => setForm('new')} aria-label="创建第一个学习领域" className="origin-button">
              <Icon name="add" size={28} />
            </button>
            <span className="origin-caption">点击，建立第一个领域</span>
          </div>
        </section>
      ) : (
        <>
          <LearningMap data={data} onCreate={() => setForm('new')} />
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
                    } as CSSProperties
                  }
                >
                  <a
                    className="space-open"
                    href={`#space/${space.id}/goals`}
                    aria-label={`进入 ${space.name}`}
                  >
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
      )}
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
