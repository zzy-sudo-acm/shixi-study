import { useEffect, useMemo, useRef, useState } from 'react'
import type { Snapshot } from '../core/model'
import { layoutKnowledgeGraph } from '../core/graph'
import { Empty } from './shared'

export function KnowledgeGraph({
  data,
  spaceId,
  selected,
  onSelect,
  onAdd,
  embedded = false,
}: {
  data: Snapshot
  spaceId: string
  selected: string
  onSelect: (id: string) => void
  onAdd: () => void
  embedded?: boolean
}) {
  const viewport = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1),
    [limit, setLimit] = useState(100),
    [compact, setCompact] = useState(() => window.matchMedia('(max-width: 640px)').matches)
  const [branch, setBranch] = useState('')
  useEffect(() => {
    const media = window.matchMedia('(max-width: 640px)')
    const update = () => setCompact(media.matches)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  const nodes = useMemo(
    () => data.knowledgeNodes.filter((n) => n.spaceId === spaceId),
    [data.knowledgeNodes, spaceId],
  )
  const roots = nodes.filter((n) => !n.parentId)
  const filtered = useMemo(() => {
    if (!branch) return nodes
    const byId = new Map(nodes.map((n) => [n.id, n]))
    return nodes.filter((n) => {
      let current: typeof n | undefined = n
      while (current) {
        if (current.id === branch) return true
        current = current.parentId ? byId.get(current.parentId) : undefined
      }
      return false
    })
  }, [nodes, branch])
  const graph = useMemo(() => layoutKnowledgeGraph(filtered, compact, limit), [filtered, compact, limit])
  const relations = data.knowledgeRelations.filter(
    (r) => r.spaceId === spaceId && graph.byId.has(r.sourceNodeId) && graph.byId.has(r.targetNodeId),
  )
  const connected = new Set<string>()
  for (const relation of data.knowledgeRelations) {
    if (relation.sourceNodeId === selected) connected.add(relation.targetNodeId)
    if (relation.targetNodeId === selected) connected.add(relation.sourceNodeId)
  }
  const active = nodes.find((n) => n.id === selected)
  if (active?.parentId) connected.add(active.parentId)
  for (const node of nodes) if (node.parentId === selected) connected.add(node.id)
  function overview() {
    if (!viewport.current) return
    setScale(
      Math.max(
        0.08,
        Math.min(1, viewport.current.clientWidth / graph.width, viewport.current.clientHeight / graph.height),
      ),
    )
    viewport.current.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }
  if (!nodes.length)
    return (
      <Empty title="知识图谱从一个节点开始">
        <p>建立知识树，再把相关的概念连起来。</p>
        {embedded ? (
          <p>在左侧新建根节点，图谱会同步出现。</p>
        ) : (
          <button className="primary" onClick={onAdd}>
            新建根节点
          </button>
        )}
      </Empty>
    )
  return (
    <section className="knowledge-graph stable-graph" aria-label="知识图谱">
      <div className="graph-toolbar">
        <div>
          <h2>知识之间的关系</h2>
          <p>实线是父子关系，虚线是你建立的关联。</p>
        </div>
        <div className="graph-zoom" aria-label="图谱缩放">
          <button onClick={overview}>总览</button>
          <button
            aria-label="缩小图谱"
            disabled={scale <= 0.08}
            onClick={() => setScale((s) => Math.max(0.08, s - 0.15))}
          >
            −
          </button>
          <button aria-label="重置图谱缩放" onClick={() => setScale(1)}>
            {Math.round(scale * 100)}%
          </button>
          <button
            aria-label="放大图谱"
            disabled={scale >= 1.6}
            onClick={() => setScale((s) => Math.min(1.6, s + 0.15))}
          >
            +
          </button>
        </div>
      </div>
      {roots.length > 1 ? (
        <label className="graph-branch-filter">
          查看分支
          <select
            value={branch}
            onChange={(e) => {
              setBranch(e.target.value)
              setLimit(100)
              setScale(1)
            }}
          >
            <option value="">全部分支</option>
            {roots.map((n) => (
              <option key={n.id} value={n.id}>
                {n.title}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <div
        ref={viewport}
        className="graph-scroll"
        role="region"
        aria-label="知识图谱画布，可横向和纵向滚动"
        tabIndex={0}
      >
        <div style={{ width: graph.width * scale, height: graph.height * scale }}>
          <div
            className="graph-canvas"
            style={{ width: graph.width, height: graph.height, transform: `scale(${scale})` }}
          >
            <svg width={graph.width} height={graph.height} className="graph-lines" aria-hidden="true">
              {graph.nodes.map((row) => {
                const parent = row.node.parentId ? graph.byId.get(row.node.parentId) : undefined
                return parent ? (
                  <path
                    key={row.node.id}
                    className={selected === row.node.id || selected === parent.node.id ? 'highlighted' : ''}
                    d={
                      compact
                        ? `M${parent.x + 8},${parent.y + 64} V${row.y + 32} H${row.x}`
                        : `M${parent.x + 208},${parent.y + 32} C${parent.x + 224},${parent.y + 32} ${row.x - 16},${row.y + 32} ${row.x},${row.y + 32}`
                    }
                  />
                ) : null
              })}
              {relations.map((r) => {
                const a = graph.byId.get(r.sourceNodeId)!,
                  b = graph.byId.get(r.targetNodeId)!
                const control = Math.max(a.x, b.x) + 250
                return (
                  <path
                    key={r.id}
                    className={`graph-relation ${selected === a.node.id || selected === b.node.id ? 'highlighted' : ''}`}
                    d={`M${a.x + 208},${a.y + 32} C${control},${a.y + 32} ${control},${b.y + 32} ${b.x + 208},${b.y + 32}`}
                  />
                )
              })}
            </svg>
            {graph.nodes.map((row) => (
              <button
                key={row.node.id}
                className={`graph-node stable-graph-node ${selected === row.node.id ? 'selected' : ''} ${connected.has(row.node.id) ? 'connected' : ''}`}
                style={{ left: row.x, top: row.y }}
                aria-pressed={selected === row.node.id}
                title={row.node.title}
                onClick={() => onSelect(row.node.id)}
              >
                <span>{row.node.title}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="graph-caption">
        <span>滑动画布浏览，点击节点查看详情。</span>
        <span>
          {graph.nodes.length} / {graph.total} 个节点 · {relations.length} 条可见关联
        </span>
      </div>
      {graph.total > limit ? (
        <button className="text-button" onClick={() => setLimit((n) => n + 100)}>
          再展开 100 个节点
        </button>
      ) : null}
    </section>
  )
}
