import type { CSSProperties } from 'react'
import type { KnowledgeNode, KnowledgeRelation } from '../core/model'
import { namedTreeNodes } from '../core/graph'

const DEPTH_GAP = 220
const LEAF_GAP = 64
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
  rootTitle,
  rootHref,
  hrefForNode,
}: {
  nodes: KnowledgeNode[]
  relations: KnowledgeRelation[]
  color: string
  labeled?: boolean
  rootTitle?: string
  rootHref?: string
  hrefForNode?: (id: string) => string
}) {
  const named = rootTitle ? namedTreeNodes(nodes, rootTitle, nodes[0]?.spaceId ?? '') : null
  const result = layout(named?.nodes ?? nodes, labeled)
  const width = Math.max(900, result.width),
    height = Math.max(300, result.height)
  const placed = result.placed.map((point) => ({
    ...point,
    x: point.x + (width - result.width) / 2,
    y: point.y + (height - result.height) / 2,
  }))
  const points = new Map(placed.map((item) => [item.node.id, item]))
  return (
    <svg
      className="tree-figure-svg"
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      role={hrefForNode ? 'group' : 'img'}
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
      {placed.map(({ node, x, y, depth }) => {
        const point = (
          <g>
            <circle cx={x} cy={y} r={24} className="tree-figure-hit" />
            <circle
              className={depth === 0 ? 'tree-figure-root' : 'tree-figure-node'}
              cx={x}
              cy={y}
              r={depth === 0 ? 9 : 6}
              style={{ '--figure-color': color } as CSSProperties}
            />
            {labeled ? (
              <text className="tree-figure-label" x={x + 13} y={y + 4}>
                {node.title.length > 10 ? `${node.title.slice(0, 10)}…` : node.title}
              </text>
            ) : null}
          </g>
        )
        const href = node.id === named?.rootId ? rootHref : hrefForNode?.(node.id)
        return href ? (
          <a
            key={node.id}
            href={href}
            aria-label={node.id === named?.rootId ? `查看领域 ${node.title}` : `阅读知识点 ${node.title}`}
          >
            {point}
          </a>
        ) : (
          <g key={node.id}>{point}</g>
        )
      })}
    </svg>
  )
}
