import { categoryParent, categoryPaths, type Snapshot, type Subject } from './model'

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
