import { categoryParent, categoryPaths, type Snapshot, type Subject } from './model'
import type { KnowledgeNode } from './model'

export interface KnowledgeBranch {
  node: KnowledgeNode
  children: KnowledgeBranch[]
}
export function buildKnowledgeTree(nodes: KnowledgeNode[]): KnowledgeBranch[] {
  const byId = new Map(nodes.map((node) => [node.id, { node, children: [] as KnowledgeBranch[] }]))
  const roots: KnowledgeBranch[] = []
  for (const branch of byId.values()) {
    if (branch.node.parentId && byId.has(branch.node.parentId))
      byId.get(branch.node.parentId)!.children.push(branch)
    else roots.push(branch)
  }
  return roots
}
export function flattenKnowledgeTree(
  roots: KnowledgeBranch[],
  collapsed = new Set<string>(),
): { node: KnowledgeNode; depth: number; children: number }[] {
  const rows: { node: KnowledgeNode; depth: number; children: number }[] = []
  const pending = roots.map((branch) => ({ branch, depth: 1 })).reverse()
  while (pending.length) {
    const { branch, depth } = pending.pop()!
    rows.push({ node: branch.node, depth, children: branch.children.length })
    if (!collapsed.has(branch.node.id))
      for (let i = branch.children.length - 1; i >= 0; i--)
        pending.push({ branch: branch.children[i], depth: depth + 1 })
  }
  return rows
}

// A bounded deterministic layout, no force simulation or third-party graph runtime.
export function layoutKnowledgeGraph(nodes: KnowledgeNode[], compact: boolean, limit = 100) {
  const rows = flattenKnowledgeTree(buildKnowledgeTree(nodes)),
    visible = rows.slice(0, limit)
  const positioned = visible.map((row, i) => ({
    ...row,
    x: compact ? 18 + (row.depth - 1) * 18 : 24 + (row.depth - 1) * 240,
    y: 24 + i * 84,
  }))
  return {
    nodes: positioned,
    byId: new Map(positioned.map((row) => [row.node.id, row])),
    total: rows.length,
    width: Math.max(compact ? 270 : 700, ...positioned.map((row) => row.x + 232)),
    height: Math.max(300, positioned.length * 84 + 48),
  }
}

export interface CategoryNode {
  path: string
  name: string
  children: CategoryNode[]
}
export function buildCategoryTree(paths: string[]): CategoryNode[] {
  const roots: CategoryNode[] = [],
    nodes = new Map<string, CategoryNode>()
  for (const path of paths) {
    let parent = ''
    for (const name of path.split('/')) {
      const full = parent ? `${parent}/${name}` : name
      if (!nodes.has(full)) {
        const node: CategoryNode = { path: full, name, children: [] }
        nodes.set(full, node)
        if (parent) nodes.get(parent)!.children.push(node)
        else roots.push(node)
      }
      parent = full
    }
  }
  function sort(nodes: CategoryNode[]) {
    nodes.sort((a, b) => a.name.localeCompare(b.name, 'zh'))
    nodes.forEach((node) => sort(node.children))
  }
  sort(roots)
  return roots
}
export function allCategoryPaths(data: Pick<Snapshot, 'cards' | 'categories'>, subject: Subject) {
  const paths = new Set<string>()
  for (const path of categoryPaths(data, subject))
    for (let current = path; current; current = categoryParent(current)) paths.add(current)
  return [...paths].sort((a, b) => a.localeCompare(b, 'zh'))
}
