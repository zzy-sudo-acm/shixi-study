import { useMemo, useState, type CSSProperties } from 'react'
import type { Snapshot } from '../core/model'
import { buildKnowledgeTree, flattenKnowledgeTree } from '../core/graph'
import { Icon } from './shared'

export function KnowledgeTree({
  data,
  spaceId,
  selected,
  onSelect,
  onAdd,
}: {
  data: Snapshot
  spaceId: string
  selected: string
  onSelect: (id: string) => void
  onAdd: () => void
}) {
  const [collapsed, setCollapsed] = useState(new Set<string>()),
    [limit, setLimit] = useState(100),
    [search, setSearch] = useState('')
  const nodes = useMemo(
    () => data.knowledgeNodes.filter((n) => n.spaceId === spaceId),
    [data.knowledgeNodes, spaceId],
  )
  const roots = useMemo(() => buildKnowledgeTree(nodes), [nodes])
  const rows = useMemo(
    () => flattenKnowledgeTree(roots, search ? new Set() : collapsed),
    [roots, collapsed, search],
  )
  const filtered = rows.filter(
    (row) => !search || row.node.title.toLocaleLowerCase().includes(search.toLocaleLowerCase().trim()),
  )
  const counts = useMemo(() => {
    const result = new Map<string, number>()
    const byId = new Map(nodes.map((n) => [n.id, n]))
    for (const node of nodes) {
      let parent = node.parentId
      while (parent) {
        result.set(parent, (result.get(parent) ?? 0) + 1)
        parent = byId.get(parent)?.parentId ?? null
      }
    }
    return result
  }, [nodes])
  return (
    <section className="knowledge-tree stable-tree" aria-label="知识树节点">
      <div className="tree-heading">
        <Icon name="tree" />
        <h2>知识树</h2>
        <span className="muted">{nodes.length} 个节点</span>
      </div>
      <p className="tree-description">从一个概念开始，慢慢长出自己的结构。</p>
      {nodes.length ? (
        <>
          <input
            type="search"
            aria-label="搜索知识树"
            placeholder="查找节点"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setLimit(100)
            }}
          />
          <ul className="stable-tree-list">
            {filtered.slice(0, limit).map((row, index) => (
              <li
                key={row.node.id}
                style={
                  {
                    paddingLeft: (row.depth - 1) * 16,
                    '--stagger': Math.min(index, 8),
                  } as CSSProperties
                }
              >
                <div className="tree-row">
                  {row.children ? (
                    <button
                      className="tree-toggle"
                      aria-expanded={!collapsed.has(row.node.id)}
                      aria-label={`${collapsed.has(row.node.id) ? '展开' : '收起'} ${row.node.title}`}
                      onClick={() =>
                        setCollapsed((prev) => {
                          const next = new Set(prev)
                          if (next.has(row.node.id)) next.delete(row.node.id)
                          else next.add(row.node.id)
                          return next
                        })
                      }
                    >
                      <Icon name="chevron" size={16} />
                    </button>
                  ) : (
                    <span className="tree-leaf" aria-hidden="true" />
                  )}
                  <button
                    className={`tree-name ${selected === row.node.id ? 'selected' : ''}`}
                    aria-pressed={selected === row.node.id}
                    onClick={() => onSelect(row.node.id)}
                  >
                    <span>{row.node.title}</span>
                    <small aria-label={`${counts.get(row.node.id) ?? 0} 个后代节点`}>
                      {counts.get(row.node.id) ?? 0}
                    </small>
                  </button>
                </div>
              </li>
            ))}
          </ul>
          {!filtered.length ? <p className="muted">没有找到节点，试试其他名称。</p> : null}
          {filtered.length > limit ? (
            <button className="text-button" onClick={() => setLimit((n) => n + 100)}>
              再显示 100 个节点
            </button>
          ) : null}
        </>
      ) : (
        <p className="tree-empty">还没有知识节点。建立一个你想整理的概念。</p>
      )}
      <button className="text-button" onClick={onAdd}>
        <Icon name="add" size={16} />
        新建根节点
      </button>
    </section>
  )
}
