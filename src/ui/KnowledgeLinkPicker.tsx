import { useDeferredValue, useMemo, useState } from 'react'
import type { Snapshot } from '../core/model'
import { nodePath } from '../core/workspace'
import { Icon } from './shared'
import type { Act } from './workspaceShared'

export function KnowledgeLinkPicker({
  data,
  spaceId,
  stepId,
  act,
  busy,
}: {
  data: Snapshot
  spaceId: string
  stepId: string
  act: Act
  busy: boolean
}) {
  const [search, setSearch] = useState(''),
    [limit, setLimit] = useState(50)
  const query = useDeferredValue(search).trim().toLocaleLowerCase()
  const [pendingSelection, setPendingSelection] = useState<Record<string, boolean>>({})
  const links = data.stepKnowledgeLinks.filter((l) => l.stepId === stepId)
  const selected = new Map(links.map((l) => [l.knowledgeNodeId, l.id]))
  const nodes = useMemo(
    () => data.knowledgeNodes.filter((n) => n.spaceId === spaceId),
    [data.knowledgeNodes, spaceId],
  )
  const filtered = nodes.filter((n) => !query || n.title.toLocaleLowerCase().includes(query))
  return (
    <section className="link-picker" aria-label="步骤关联知识">
      <p className="muted">关联这一步涉及的知识，完成步骤只更新任务进度。</p>
      <input
        type="search"
        aria-label="搜索知识节点"
        placeholder="搜索知识节点"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value)
          setLimit(50)
        }}
      />
      {links.length ? (
        <div className="selected-links">
          {links.map((l) => (
            <button
              type="button"
              disabled={busy}
              key={l.id}
              aria-label={`移除关联 ${nodes.find((n) => n.id === l.knowledgeNodeId)?.title}`}
              onClick={() => void act({ type: 'deleteLink', id: l.id })}
            >
              {nodes.find((n) => n.id === l.knowledgeNodeId)?.title}
              <Icon name="close" size={14} />
            </button>
          ))}
        </div>
      ) : null}
      <div className="picker-list">
        {filtered.slice(0, limit).map((n) => (
          <label className="check-label" key={n.id}>
            <input
              type="checkbox"
              disabled={busy}
              checked={pendingSelection[n.id] ?? selected.has(n.id)}
              onChange={() => {
                setPendingSelection((previous) => ({ ...previous, [n.id]: !selected.has(n.id) }))
                void act(
                  selected.has(n.id)
                    ? { type: 'deleteLink', id: selected.get(n.id)! }
                    : {
                        type: 'addLink',
                        value: {
                          id: crypto.randomUUID(),
                          stepId,
                          knowledgeNodeId: n.id,
                          createdAt: Date.now(),
                        },
                      },
                ).then(() =>
                  setPendingSelection((previous) => {
                    const next = { ...previous }
                    delete next[n.id]
                    return next
                  }),
                )
              }}
            />
            <span>
              {n.title}
              <small>{nodePath(n.id, nodes).join(' › ')}</small>
            </span>
          </label>
        ))}
      </div>
      {!nodes.length ? (
        <p>还没有知识节点。先到知识树建立一个节点。</p>
      ) : !filtered.length ? (
        <p>没有匹配节点，试试其他关键词。</p>
      ) : null}
      {filtered.length > limit ? (
        <button className="text-button" onClick={() => setLimit((n) => n + 50)}>
          再显示 50 个节点
        </button>
      ) : null}
    </section>
  )
}
