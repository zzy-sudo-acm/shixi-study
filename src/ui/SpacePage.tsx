import { useEffect, useState, type CSSProperties } from 'react'
import type { Snapshot } from '../core/model'
import { activeGoals, spaceProgress } from '../core/workspace'
import { Goals } from './Goals'
import { KnowledgeStudio } from './KnowledgeStudio'
import { NodeForm } from './NodeDetails'
import { SpaceForm } from './Home'
import { Icon, Notice, PageHead } from './shared'
import { ProgressView, useWorkspaceActions, type Dirty } from './workspaceShared'

export function SpacePage({
  data,
  spaceId,
  view,
  initialNode,
  focusStep,
  refresh,
  setDirty,
}: {
  data: Snapshot
  spaceId: string
  view: string
  initialNode?: string
  focusStep?: string
  refresh: () => Promise<void>
  setDirty: Dirty
}) {
  const [selected, setSelected] = useState(initialNode ?? ''),
    [editSpace, setEditSpace] = useState(false)
  const [editor, setEditor] = useState<{
    mode: 'add' | 'edit' | 'move'
    id?: string
    parentId?: string
  } | null>(null)
  const { act, busy, error } = useWorkspaceActions(data, refresh)
  useEffect(() => {
    if (initialNode) setSelected(initialNode)
  }, [initialNode])
  const space = data.spaces.find((s) => s.id === spaceId)
  if (!space)
    return (
      <>
        <PageHead title="没有找到这个领域" />
        <p>它可能已被删除或在恢复备份时被替换。</p>
        <a className="button secondary" href="#home">
          返回学习空间
        </a>
      </>
    )
  const progress = spaceProgress(data, spaceId)
  const nodes = data.knowledgeNodes.filter((n) => n.spaceId === spaceId)
  const tab = view === 'tree' || view === 'graph' ? 'tree' : 'goals'
  return (
    <div className="space-page" style={{ '--space-color': space.color ?? '#456785' } as CSSProperties}>
      <a className="space-back" href="#home">
        ‹ 我的学习空间
      </a>
      <PageHead
        title={space.name}
        action={
          <button className="text-button" onClick={() => setEditSpace(true)}>
            编辑领域
          </button>
        }
      />
      <div className="space-summary">
        <ProgressView progress={progress} />
        <p>
          {activeGoals(data, spaceId)} 个进行中目标{' '}
          <span>
            {progress.completed} / {progress.total} 步骤完成
          </span>
          <span>{nodes.length} 个知识节点</span>
        </p>
      </div>
      <nav className="space-tabs" aria-label="领域视图">
        {[
          ['goals', '目标', 'check'],
          ['tree', '知识树', 'branch'],
        ].map(([key, label, icon]) => (
          <a
            key={key}
            href={`#space/${spaceId}/${key}`}
            className={tab === key ? 'active' : ''}
            aria-current={tab === key ? 'page' : undefined}
          >
            <Icon name={icon as 'check' | 'branch'} size={18} />
            {label}
          </a>
        ))}
      </nav>
      {error ? <Notice error>{error}</Notice> : null}
      {busy ? (
        <p className="muted" role="status">
          正在保存…
        </p>
      ) : null}
      {tab === 'goals' ? (
        <Goals
          data={data}
          spaceId={spaceId}
          act={act}
          busy={busy}
          error={error}
          setDirty={setDirty}
          focusStep={focusStep}
        />
      ) : (
        <KnowledgeStudio
          data={data}
          spaceId={spaceId}
          selected={selected}
          onSelect={setSelected}
          onEdit={setEditor}
          act={act}
          busy={busy}
          setDirty={setDirty}
        />
      )}
      {editor ? (
        <NodeForm
          key={`${editor.mode}-${editor.id ?? editor.parentId ?? 'new'}`}
          existing={nodes.find((n) => n.id === editor.id)}
          parentId={editor.parentId}
          mode={editor.mode}
          data={data}
          spaceId={spaceId}
          act={act}
          busy={busy}
          error={error}
          setDirty={setDirty}
          onClose={() => setEditor(null)}
          onSaved={setSelected}
        />
      ) : null}
      {editSpace ? (
        <SpaceForm
          existing={space}
          data={data}
          refresh={refresh}
          setDirty={setDirty}
          onClose={() => setEditSpace(false)}
        />
      ) : null}
    </div>
  )
}
