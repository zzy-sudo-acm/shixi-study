import type { CSSProperties } from 'react'
import type { KnowledgeNode, KnowledgeRelation } from '../core/model'

const DEPTH_GAP = 156
const LEAF_GAP = 42
const PAD_X = 26
const PAD_Y = 30
const LABEL_ROOM = 190

type Placed = { node: KnowledgeNode; x: number; y: number; depth: number }

function layout(nodes: KnowledgeNode[], labeled: boolean) {
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
  const placed: Placed[] = []
  let leaf = 0,
    maxDepth = 0
  function place(node: KnowledgeNode, depth: number): number {
    maxDepth = Math.max(maxDepth, depth)
    const kids = children.get(node.id) ?? []
    const y = kids.length
      ? kids.reduce((sum, kid) => sum + place(kid, depth + 1), 0) / kids.length
      : PAD_Y + leaf++ * LEAF_GAP
    placed.push({ node, x: PAD_X + depth * DEPTH_GAP, y, depth })
    return y
  }
  roots.forEach((root) => place(root, 0))
  return {
    placed,
    width: PAD_X * 2 + maxDepth * DEPTH_GAP + (labeled ? LABEL_ROOM : 24),
    height: Math.max(placed.length ? PAD_Y + (leaf - 1) * LEAF_GAP + PAD_Y : 90, 90),
  }
}

export function KnowledgeTreeFigure({
  nodes,
  relations,
  color,
  labeled = false,
}: {
  nodes: KnowledgeNode[]
  relations: KnowledgeRelation[]
  color: string
  labeled?: boolean
}) {
  const { placed, width, height } = layout(nodes, labeled)
  const points = new Map(placed.map((item) => [item.node.id, item]))
  return (
    <svg
      className="tree-figure-svg"
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      role="img"
      aria-label={`知识树，共 ${nodes.length} 个节点`}
    >
      {placed.map(({ node, x, y }) => {
        const parent = node.parentId ? points.get(node.parentId) : undefined
        return parent ? (
          <path
            key={`branch-${node.id}`}
            className="tree-figure-branch"
            d={`M ${parent.x} ${parent.y} C ${parent.x + 62} ${parent.y}, ${x - 62} ${y}, ${x} ${y}`}
          />
        ) : null
      })}
      {relations.map((relation) => {
        const from = points.get(relation.sourceNodeId)
        const to = points.get(relation.targetNodeId)
        return from && to ? (
          <path
            key={relation.id}
            className="tree-figure-relation"
            style={{ '--figure-color': color } as CSSProperties}
            d={`M ${from.x} ${from.y} Q ${(from.x + to.x) / 2} ${Math.min(from.y, to.y) - 34}, ${to.x} ${to.y}`}
          />
        ) : null
      })}
      {placed.map(({ node, x, y, depth }) => (
        <g key={node.id}>
          <circle
            className={depth === 0 ? 'tree-figure-root' : 'tree-figure-node'}
            cx={x}
            cy={y}
            r={depth === 0 ? 5.5 : 3.5}
            style={{ '--figure-color': color } as CSSProperties}
          />
          {labeled ? (
            <text className="tree-figure-label" x={x + 13} y={y + 4}>
              {node.title.length > 10 ? `${node.title.slice(0, 10)}…` : node.title}
            </text>
          ) : null}
        </g>
      ))}
    </svg>
  )
}
