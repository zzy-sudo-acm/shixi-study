import { lazy, useCallback, useEffect, useState, type CSSProperties } from 'react'
import type { Snapshot } from '../core/model'
import { KnowledgeStudio } from './KnowledgeStudio'
import { DeleteSpace, SpaceForm } from './Home'
import { Notice, PageHead } from './shared'
import { useWorkspaceActions, type Dirty } from './workspaceShared'

const KnowledgeLibrary = lazy(() =>
  import('./KnowledgeLibrary').then((module) => ({ default: module.KnowledgeLibrary })),
)

export function SpacePage({
  data,
  spaceId,
  view,
  initialNode,
  rootId,
  refresh,
  setDirty,
}: {
  data: Snapshot
  spaceId: string
  view: string
  initialNode?: string
  rootId: string
  refresh: () => Promise<void>
  setDirty: Dirty
}) {
  const [selected, setSelected] = useState(initialNode ?? ''),
    [editSpace, setEditSpace] = useState(false),
    [deletingSpace, setDeletingSpace] = useState(false)
  const { act, busy, error } = useWorkspaceActions(data, refresh)
  const [hasEdits, setHasEdits] = useState(false)
  const trackDirty = useCallback(
    (value: boolean) => {
      setHasEdits(value)
      setDirty(value)
    },
    [setDirty],
  )
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
  const nodes = data.knowledgeNodes.filter((n) => n.spaceId === spaceId)
  const editing = view === 'tree' || view === 'graph'
  return (
    <div className="space-page" style={{ '--space-color': space.color ?? '#456785' } as CSSProperties}>
      <a className="space-back" href="#home">
        ‹ 我的学习空间
      </a>
      <PageHead
        title={space.name}
        action={
          <div className="actions">
            <a className="button secondary" href={`#space/${spaceId}/${editing ? 'cards' : 'tree'}`}>
              {editing ? '知识卡片' : '编辑知识树'}
            </a>
            <button className="text-button" disabled={hasEdits || busy} onClick={() => setEditSpace(true)}>
              编辑领域
            </button>
            <button
              className="text-button"
              disabled={hasEdits || busy}
              onClick={() => setDeletingSpace(true)}
            >
              删除领域
            </button>
          </div>
        }
      />
      <p className="space-node-count">{nodes.length} 个知识节点</p>
      {error ? <Notice error>{error}</Notice> : null}
      {busy ? (
        <p className="muted" role="status">
          正在保存…
        </p>
      ) : null}
      {editing ? (
        <KnowledgeStudio
          data={data}
          spaceId={spaceId}
          selected={selected}
          onSelect={setSelected}
          initialNode={initialNode}
          act={act}
          busy={busy}
          error={error}
          setDirty={trackDirty}
        />
      ) : (
        <KnowledgeLibrary
          key={`${rootId}/${initialNode ?? ''}`}
          data={data}
          spaceId={spaceId}
          rootId={rootId}
          initialNode={initialNode}
          embedded
        />
      )}
      {deletingSpace ? (
        <DeleteSpace
          space={space}
          data={data}
          refresh={refresh}
          setDirty={setDirty}
          onDeleted={() => {
            location.hash = 'home'
          }}
          onClose={() => {
            setDeletingSpace(false)
          }}
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
