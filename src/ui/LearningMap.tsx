import { useId, useMemo, useState, type CSSProperties } from 'react'
import type { KnowledgeNode, KnowledgeRelation, Snapshot } from '../core/model'
import { Icon } from './shared'
import { SpaceIcon } from './SpaceIcon'

const PAGE_SIZE = 6
const NODE_LIMIT = 48

function coordinates(nodes: KnowledgeNode[]) {
  const byId = new Map(nodes.map((node) => [node.id, node]))
  const children = new Map<string, KnowledgeNode[]>()
  const roots: KnowledgeNode[] = []
  for (const node of nodes) {
    if (node.parentId && byId.has(node.parentId)) {
      const siblings = children.get(node.parentId) ?? []
      siblings.push(node)
      children.set(node.parentId, siblings)
    } else roots.push(node)
  }
  const points = new Map<string, { x: number; y: number }>()
  function place(branch: KnowledgeNode[], depth: number, start: number, end: number) {
    branch.forEach((node, index) => {
      if (points.has(node.id)) return
      const span = (end - start) / branch.length
      const angle = start + span * (index + 0.5)
      const radius = 64 + Math.min(depth, 4) * 16
      points.set(node.id, {
        x: 150 + Math.cos(angle) * radius,
        y: 137 + Math.sin(angle) * radius * 0.83,
      })
      place(children.get(node.id) ?? [], depth + 1, start + span * index, start + span * (index + 1))
    })
  }
  place(roots, 0, -Math.PI * 0.9, Math.PI * 1.1)
  return points
}

export function KnowledgeDrawing({
  nodes,
  relations,
}: {
  nodes: KnowledgeNode[]
  relations: KnowledgeRelation[]
}) {
  const revealId = `map-reveal-${useId()}`
  const shown = nodes.slice(0, NODE_LIMIT)
  const points = coordinates(shown)
  return (
    <svg viewBox="0 0 300 274" className="knowledge-drawing" aria-hidden="true">
      <defs>
        <clipPath id={revealId}>
          <circle cx="150" cy="137" r="180" className="map-reveal-clip" />
        </clipPath>
      </defs>
      <g className="map-constellation">
        <g clipPath={`url(#${revealId})`}>
          <g className="map-membership">
            {shown.map((node) => {
              const point = points.get(node.id)
              if (!point) return null
              const parent = node.parentId ? points.get(node.parentId) : undefined
              return (
                <line
                  key={node.id}
                  x1={parent?.x ?? 150}
                  y1={parent?.y ?? 137}
                  x2={point.x}
                  y2={point.y}
                  className={parent ? 'map-parent-line' : 'map-root-line'}
                />
              )
            })}
          </g>
          <g className="map-associations">
            {relations.map((relation) => {
              const from = points.get(relation.sourceNodeId)
              const to = points.get(relation.targetNodeId)
              return from && to ? (
                <line key={relation.id} x1={from.x} y1={from.y} x2={to.x} y2={to.y} />
              ) : null
            })}
          </g>
        </g>
        {shown.map((node, index) => {
          const point = points.get(node.id)
          return point ? (
            <g
              key={node.id}
              className="map-node-arrival"
              style={{ '--node-delay': `${170 + Math.min(index, 8) * 24}ms` } as CSSProperties}
            >
              <circle cx={point.x} cy={point.y} r={node.parentId ? 3.3 : 5} className="map-knowledge-dot" />
            </g>
          ) : null
        })}
        <g className="map-node-labels">
          {shown
            .filter((node) => !node.parentId)
            .slice(0, 4)
            .map((node) => {
              const point = points.get(node.id)
              return point ? (
                <text key={node.id} x={point.x} y={point.y - 13} textAnchor="middle">
                  {node.title.length > 8 ? `${node.title.slice(0, 8)}…` : node.title}
                </text>
              ) : null
            })}
        </g>
      </g>
      <circle cx="150" cy="137" r="24" className="map-domain-halo" />
      <g className="map-center-arrival">
        <circle cx="150" cy="137" r="21" className="map-domain-ring" />
        <circle cx="150" cy="137" r="11" className="map-domain-dot" />
      </g>
    </svg>
  )
}

export function LearningMap({ data, onCreate }: { data: Snapshot; onCreate: () => void }) {
  const [view, setView] = useState({ page: 0, direction: 0 })
  const grouped = useMemo(() => {
    const nodes = new Map<string, KnowledgeNode[]>()
    const relations = new Map<string, KnowledgeRelation[]>()
    for (const node of data.knowledgeNodes) {
      const group = nodes.get(node.spaceId) ?? []
      group.push(node)
      nodes.set(node.spaceId, group)
    }
    for (const relation of data.knowledgeRelations) {
      const group = relations.get(relation.spaceId) ?? []
      group.push(relation)
      relations.set(relation.spaceId, group)
    }
    return { nodes, relations }
  }, [data.knowledgeNodes, data.knowledgeRelations])
  const pageCount = Math.ceil(data.spaces.length / PAGE_SIZE)
  const currentPage = Math.min(view.page, Math.max(0, pageCount - 1))
  const visible = data.spaces.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE)
  const limited = visible.some((space) => (grouped.nodes.get(space.id)?.length ?? 0) > NODE_LIMIT)

  return (
    <section className="learning-map" aria-label="学习领域知识地图">
      <div className="map-surface">
        <div
          key={currentPage}
          className="map-spaces"
          data-motion={view.direction ? 'page' : 'arrival'}
          data-paged={pageCount > 1}
          style={{ '--page-offset': `${view.direction * 28}px` } as CSSProperties}
        >
          {visible.map((space, index) => (
            <a
              key={space.id}
              className="map-space"
              href={`#space/${space.id}/graph`}
              aria-label={`查看 ${space.name} 的知识图谱`}
              style={
                {
                  '--space-color': space.color ?? '#456785',
                  '--space-delay': `${index * 35}ms`,
                  '--map-column-wide': (index % 3) + 1,
                  '--map-row-wide': Math.floor(index / 3) + 1,
                  '--map-column-compact': (index % 2) + 1,
                  '--map-row-compact': Math.floor(index / 2) + 1,
                } as CSSProperties
              }
            >
              <KnowledgeDrawing
                nodes={grouped.nodes.get(space.id) ?? []}
                relations={grouped.relations.get(space.id) ?? []}
              />
              <span className="map-space-label">
                <span className="map-space-icon">
                  <SpaceIcon value={space.icon} size={18} />
                </span>
                <span>{space.name}</span>
              </span>
              <span className="map-root-titles">
                {(grouped.nodes.get(space.id) ?? [])
                  .filter((node) => !node.parentId)
                  .slice(0, 2)
                  .map((node) => node.title)
                  .join('、')}
              </span>
              <span className="map-space-count">{grouped.nodes.get(space.id)?.length ?? 0} 个知识节点</span>
            </a>
          ))}
        </div>
        <button className="map-create" onClick={onCreate} aria-label="在知识地图中新建领域">
          <Icon name="add" size={18} />
          <span>新建领域</span>
        </button>
      </div>
      <div className="map-caption">
        <p>大点是领域，小点是知识。点击领域，探索其中的连接。{limited ? '每个领域预览前 48 个节点。' : ''}</p>
        {pageCount > 1 ? (
          <div className="map-pagination" aria-label="知识地图翻页">
            <button
              className="small"
              disabled={currentPage === 0}
              onClick={() => setView({ page: currentPage - 1, direction: -1 })}
              aria-label="上一组领域"
            >
              ‹
            </button>
            <span>
              {currentPage + 1} / {pageCount}
            </span>
            <button
              className="small"
              disabled={currentPage === pageCount - 1}
              onClick={() => setView({ page: currentPage + 1, direction: 1 })}
              aria-label="下一组领域"
            >
              ›
            </button>
          </div>
        ) : null}
      </div>
    </section>
  )
}
