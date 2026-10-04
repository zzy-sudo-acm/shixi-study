import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import type { Goal, Snapshot, Step } from '../core/model'
import { depthOf, descendants, goalProgress } from '../core/workspace'
import { Empty, Icon } from './shared'
import { KnowledgeLinkPicker } from './KnowledgeLinkPicker'
import { FormActions, Modal, ProgressView, type Act, type Dirty } from './workspaceShared'

function GoalForm({
  data,
  spaceId,
  existing,
  parentId = null,
  act,
  busy,
  error,
  onClose,
  setDirty,
}: {
  data: Snapshot
  spaceId: string
  existing?: Goal
  parentId?: string | null
  act: Act
  busy: boolean
  error: string
  onClose: () => void
  setDirty: Dirty
}) {
  const [title, setTitle] = useState(existing?.title ?? ''),
    [description, setDescription] = useState(existing?.description ?? ''),
    [parent, setParent] = useState(existing?.parentGoalId ?? parentId)
  const goals = data.goals.filter((g) => g.spaceId === spaceId),
    byId = new Map(goals.map((g) => [g.id, g]))
  const excluded = existing ? descendants(existing.id, goals, (g) => g.parentGoalId) : new Set()
  return (
    <Modal
      title={existing ? '编辑目标' : parentId ? '新建子目标' : '新建目标'}
      busy={busy}
      error={error}
      onClose={onClose}
      setDirty={setDirty}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault()
          const now = Date.now()
          void act({
            type: 'saveGoal',
            value: {
              id: existing?.id ?? crypto.randomUUID(),
              spaceId,
              title,
              description,
              parentGoalId: parent,
              createdAt: existing?.createdAt ?? now,
              updatedAt: now,
            },
          }).then((ok) => {
            if (ok) {
              setDirty(false)
              onClose()
            }
          })
        }}
      >
        <fieldset disabled={busy}>
          <label>
            目标名称
            <input
              autoFocus
              required
              maxLength={200}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <label>
            目标说明（可选）
            <textarea
              value={description}
              maxLength={100000}
              rows={3}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          <label>
            父目标
            <select value={parent ?? ''} onChange={(e) => setParent(e.target.value || null)}>
              <option value="">顶层目标</option>
              {goals
                .filter((g) => !excluded.has(g.id) && depthOf(g.id, byId, (x) => x.parentGoalId) < 3)
                .map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.title}
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
            save={existing ? '保存修改' : '创建目标'}
          />
        </fieldset>
      </form>
    </Modal>
  )
}
function StepForm({
  existing,
  goalId,
  act,
  busy,
  error,
  onClose,
  setDirty,
}: {
  existing?: Step
  goalId: string
  act: Act
  busy: boolean
  error: string
  onClose: () => void
  setDirty: Dirty
}) {
  const [title, setTitle] = useState(existing?.title ?? '')
  return (
    <Modal
      title={existing ? '编辑步骤' : '添加步骤'}
      busy={busy}
      error={error}
      onClose={onClose}
      setDirty={setDirty}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault()
          const now = Date.now()
          void act({
            type: 'saveStep',
            value: {
              ...(existing ?? { id: crypto.randomUUID(), goalId, completed: false, createdAt: now }),
              title,
              updatedAt: now,
            },
          }).then((ok) => {
            if (ok) {
              setDirty(false)
              onClose()
            }
          })
        }}
      >
        <fieldset disabled={busy}>
          <label>
            步骤名称
            <input
              autoFocus
              required
              maxLength={200}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="一个可以完成的具体行动"
            />
          </label>
          <FormActions
            busy={busy}
            onClose={() => {
              setDirty(false)
              onClose()
            }}
            save={existing ? '保存修改' : '添加步骤'}
          />
        </fieldset>
      </form>
    </Modal>
  )
}
type Editor =
  { kind: 'goal'; existing?: Goal; parentId?: string } | { kind: 'step'; existing?: Step; goalId: string }
export function Goals({
  data,
  spaceId,
  act,
  busy,
  error,
  setDirty,
  focusStep,
}: {
  data: Snapshot
  spaceId: string
  act: Act
  busy: boolean
  error: string
  setDirty: Dirty
  focusStep?: string
}) {
  const [editor, setEditor] = useState<Editor | null>(null),
    [linking, setLinking] = useState<Step | null>(null)
  const [collapsed, setCollapsed] = useState(new Set<string>()),
    [limit, setLimit] = useState(40)
  const [pendingCompletion, setPendingCompletion] = useState<Record<string, boolean>>({})
  const goals = useMemo(() => data.goals.filter((g) => g.spaceId === spaceId), [data.goals, spaceId])
  const children = useMemo(() => {
    const map = new Map<string | null, Goal[]>()
    for (const g of goals) {
      const list = map.get(g.parentGoalId) ?? []
      list.push(g)
      map.set(g.parentGoalId, list)
    }
    return map
  }, [goals])
  const stepsByGoal = useMemo(() => {
    const map = new Map<string, Step[]>()
    for (const s of data.steps) {
      const list = map.get(s.goalId) ?? []
      list.push(s)
      map.set(s.goalId, list)
    }
    return map
  }, [data.steps])
  useEffect(() => {
    if (focusStep) {
      setCollapsed(new Set())
      setLimit(Math.max(40, goals.length, data.steps.length))
      const timer = setTimeout(
        () => document.getElementById(`step-${focusStep}`)?.scrollIntoView({ block: 'center' }),
        80,
      )
      return () => clearTimeout(timer)
    }
  }, [focusStep, goals.length, data.steps.length])
  function renderGoal(goal: Goal, depth: number, stagger?: number) {
    const ownSteps = stepsByGoal.get(goal.id) ?? [],
      nested = children.get(goal.id) ?? [],
      open = !collapsed.has(goal.id)
    return (
      <section
        className={`goal-branch goal-depth-${depth}`}
        key={goal.id}
        aria-label={`目标 ${goal.title}`}
        style={stagger === undefined ? undefined : ({ '--stagger': Math.min(stagger, 8) } as CSSProperties)}
      >
        <div className="goal-heading">
          <button
            className="goal-toggle"
            aria-label={`${open ? '收起' : '展开'}目标 ${goal.title}`}
            aria-expanded={open}
            onClick={() =>
              setCollapsed((prev) => {
                const next = new Set(prev)
                if (open) next.add(goal.id)
                else next.delete(goal.id)
                return next
              })
            }
          >
            <Icon name="chevron" size={18} />
          </button>
          <h3>{goal.title}</h3>
          <div className="goal-row-actions">
            <button
              disabled={busy}
              className="text-button"
              aria-label={`编辑目标 ${goal.title}`}
              onClick={() => setEditor({ kind: 'goal', existing: goal })}
            >
              编辑
            </button>
            <button
              disabled={busy}
              className="text-button"
              aria-label={`删除目标 ${goal.title}`}
              onClick={() => {
                if (window.confirm(`删除“${goal.title}”及其所有子目标、步骤和步骤关联？无法撤销。`))
                  void act({ type: 'deleteGoal', id: goal.id })
              }}
            >
              删除
            </button>
          </div>
        </div>
        <ProgressView label="目标进度" progress={goalProgress(data, goal.id)} small />
        {open ? (
          <div className="goal-body">
            {goal.description ? <p className="goal-description">{goal.description}</p> : null}
            <ul className="step-list">
              {ownSteps.slice(0, limit).map((step) => (
                <li
                  className={`${step.completed ? 'completed' : ''} ${focusStep === step.id ? 'focused-step' : ''}`}
                  key={step.id}
                  id={`step-${step.id}`}
                >
                  <label className="step-check">
                    <input
                      type="checkbox"
                      aria-label={`完成 ${step.title}`}
                      checked={pendingCompletion[step.id] ?? step.completed}
                      disabled={busy}
                      onChange={() => {
                        setPendingCompletion((previous) => ({ ...previous, [step.id]: !step.completed }))
                        const { completedAt: _completedAt, ...rest } = step
                        void act({
                          type: 'saveStep',
                          value: {
                            ...rest,
                            completed: !step.completed,
                            ...(!step.completed ? { completedAt: Date.now() } : {}),
                            updatedAt: Date.now(),
                          },
                        }).then(() =>
                          setPendingCompletion((previous) => {
                            const next = { ...previous }
                            delete next[step.id]
                            return next
                          }),
                        )
                      }}
                    />
                    <span>{step.title}</span>
                  </label>
                  <div className="step-tools">
                    <button
                      className="text-button"
                      disabled={busy}
                      aria-label={`关联知识 ${step.title}`}
                      onClick={() => setLinking(step)}
                    >
                      <Icon name="link" size={16} />
                      <span>
                        知识
                        {data.stepKnowledgeLinks.filter((l) => l.stepId === step.id).length
                          ? ` (${data.stepKnowledgeLinks.filter((l) => l.stepId === step.id).length})`
                          : ''}
                      </span>
                    </button>
                    <button
                      className="text-button"
                      disabled={busy}
                      aria-label={`编辑步骤 ${step.title}`}
                      onClick={() => setEditor({ kind: 'step', existing: step, goalId: goal.id })}
                    >
                      编辑
                    </button>
                    <button
                      className="text-button"
                      disabled={busy}
                      aria-label={`删除步骤 ${step.title}`}
                      onClick={() => {
                        if (window.confirm(`删除步骤“${step.title}”及其知识关联？`))
                          void act({ type: 'deleteStep', id: step.id })
                      }}
                    >
                      删除
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            {ownSteps.length > limit || nested.length > limit ? (
              <button className="text-button" onClick={() => setLimit((n) => n + 40)}>
                再显示 40 项
              </button>
            ) : null}
            <div className="goal-add-tools">
              <button
                className="text-button"
                disabled={busy}
                onClick={() => setEditor({ kind: 'step', goalId: goal.id })}
              >
                <Icon name="add" size={16} />
                添加步骤
              </button>
              {depth < 3 ? (
                <button
                  className="text-button"
                  disabled={busy}
                  onClick={() => setEditor({ kind: 'goal', parentId: goal.id })}
                >
                  <Icon name="branch" size={16} />
                  添加子目标
                </button>
              ) : null}
            </div>
            {nested.slice(0, limit).map((g) => renderGoal(g, depth + 1))}
          </div>
        ) : null}
      </section>
    )
  }
  const roots = children.get(null) ?? []
  return (
    <section aria-label="目标与步骤">
      <div className="section-head">
        <h2>我的目标</h2>
        <button className="secondary" disabled={busy} onClick={() => setEditor({ kind: 'goal' })}>
          <Icon name="add" size={18} />
          新建目标
        </button>
      </div>
      {!goals.length ? (
        <Empty title="准备怎么学？">
          <p>创建一个目标，再拆成可以完成的步骤。</p>
          <button className="primary" onClick={() => setEditor({ kind: 'goal' })}>
            创建第一个目标
          </button>
        </Empty>
      ) : (
        <div className="goal-outline">{roots.slice(0, limit).map((g, i) => renderGoal(g, 1, i))}</div>
      )}
      {roots.length > limit ? (
        <button className="text-button" onClick={() => setLimit((n) => n + 40)}>
          再显示 40 个目标
        </button>
      ) : null}
      {editor?.kind === 'goal' ? (
        <GoalForm
          key={editor.existing?.id ?? editor.parentId ?? 'new'}
          data={data}
          spaceId={spaceId}
          existing={editor.existing}
          parentId={editor.parentId}
          act={act}
          busy={busy}
          error={error}
          setDirty={setDirty}
          onClose={() => setEditor(null)}
        />
      ) : null}
      {editor?.kind === 'step' ? (
        <StepForm
          key={editor.existing?.id ?? editor.goalId}
          existing={editor.existing}
          goalId={editor.goalId}
          act={act}
          busy={busy}
          error={error}
          setDirty={setDirty}
          onClose={() => setEditor(null)}
        />
      ) : null}
      {linking ? (
        <Modal
          title={`关联知识：${linking.title}`}
          busy={busy}
          error={error}
          setDirty={setDirty}
          trackChanges={false}
          onClose={() => {
            setDirty(false)
            setLinking(null)
          }}
        >
          <KnowledgeLinkPicker data={data} spaceId={spaceId} stepId={linking.id} act={act} busy={busy} />
          <button
            className="secondary"
            disabled={busy}
            onClick={() => {
              setDirty(false)
              setLinking(null)
            }}
          >
            完成关联
          </button>
        </Modal>
      ) : null}
    </section>
  )
}
