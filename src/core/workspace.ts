import { z } from 'zod'
import {
  spaceSchema,
  goalSchema,
  stepSchema,
  knowledgeNodeSchema,
  knowledgeRelationSchema,
  stepKnowledgeLinkSchema,
  type Workspace,
  type Goal,
  type KnowledgeNode,
} from './model'

export const GOAL_MAX_DEPTH = 3
export const KNOWLEDGE_MAX_DEPTH = 5
export const workspaceStores = [
  'spaces',
  'goals',
  'steps',
  'knowledgeNodes',
  'knowledgeRelations',
  'stepKnowledgeLinks',
] as const

export function depthOf<T>(itemId: string, byId: Map<string, T>, parent: (item: T) => string | null): number {
  let current: string | null = itemId,
    depth = 0
  const seen = new Set<string>()
  while (current) {
    if (seen.has(current)) throw new Error('不能形成循环父子关系。')
    seen.add(current)
    const item = byId.get(current)
    if (!item) throw new Error('父节点不存在。')
    depth++
    current = parent(item)
  }
  return depth
}
export function descendants<T extends { id: string }>(
  rootId: string,
  items: T[],
  parent: (item: T) => string | null,
): Set<string> {
  const children = new Map<string, string[]>()
  for (const item of items) {
    const p = parent(item)
    if (p) {
      const list = children.get(p) ?? []
      list.push(item.id)
      children.set(p, list)
    }
  }
  const ids = new Set<string>(),
    pending = [rootId]
  while (pending.length) {
    const next = pending.pop()!
    if (ids.has(next)) continue
    ids.add(next)
    pending.push(...(children.get(next) ?? []))
  }
  return ids
}
export const workspaceSchema = z
  .object({
    spaces: z.array(spaceSchema).max(10000),
    goals: z.array(goalSchema).max(100000),
    steps: z.array(stepSchema).max(100000),
    knowledgeNodes: z.array(knowledgeNodeSchema).max(100000),
    knowledgeRelations: z.array(knowledgeRelationSchema).max(200000),
    stepKnowledgeLinks: z.array(stepKnowledgeLinkSchema).max(200000),
  })
  .strict()
  .superRefine((data, ctx) => {
    const fail = (message: string) => ctx.addIssue({ code: 'custom', message })
    for (const key of workspaceStores)
      if (new Set(data[key].map((e) => e.id)).size !== data[key].length) fail(`${key} 存在重复 ID。`)
    const spaces = new Set(data.spaces.map((s) => s.id))
    const goals = new Map(data.goals.map((g) => [g.id, g]))
    const nodes = new Map(data.knowledgeNodes.map((n) => [n.id, n]))
    const steps = new Map(data.steps.map((s) => [s.id, s]))
    for (const goal of data.goals) {
      if (!spaces.has(goal.spaceId)) fail('目标的领域不存在。')
      if (goal.parentGoalId && goals.get(goal.parentGoalId)?.spaceId !== goal.spaceId)
        fail('父目标必须在同一领域。')
      try {
        if (depthOf(goal.id, goals, (g) => g.parentGoalId) > GOAL_MAX_DEPTH) fail('目标最多支持 3 层。')
      } catch (e) {
        fail((e as Error).message)
      }
    }
    for (const step of data.steps) if (!goals.has(step.goalId)) fail('步骤的目标不存在。')
    for (const node of data.knowledgeNodes) {
      if (!spaces.has(node.spaceId)) fail('知识节点的领域不存在。')
      if (node.parentId && nodes.get(node.parentId)?.spaceId !== node.spaceId) fail('父节点必须在同一领域。')
      try {
        if (depthOf(node.id, nodes, (n) => n.parentId) > KNOWLEDGE_MAX_DEPTH) fail('知识树最多支持 5 层。')
      } catch (e) {
        fail((e as Error).message)
      }
    }
    const pairs = new Set<string>()
    for (const relation of data.knowledgeRelations) {
      if (
        !spaces.has(relation.spaceId) ||
        nodes.get(relation.sourceNodeId)?.spaceId !== relation.spaceId ||
        nodes.get(relation.targetNodeId)?.spaceId !== relation.spaceId
      )
        fail('关联节点必须存在且在同一领域。')
      if (relation.sourceNodeId === relation.targetNodeId) fail('不能关联自己。')
      const pair = JSON.stringify([relation.sourceNodeId, relation.targetNodeId].sort())
      if (pairs.has(pair)) fail('不能重复建立关系。')
      pairs.add(pair)
    }
    const links = new Set<string>()
    for (const link of data.stepKnowledgeLinks) {
      const step = steps.get(link.stepId),
        node = nodes.get(link.knowledgeNodeId)
      if (!step || !node || goals.get(step.goalId)?.spaceId !== node.spaceId)
        fail('步骤与知识节点必须存在且在同一领域。')
      const pair = JSON.stringify([link.stepId, link.knowledgeNodeId])
      if (links.has(pair)) fail('不能重复关联步骤与知识。')
      links.add(pair)
    }
  })

export interface Progress {
  completed: number
  total: number
  percent: number | null
}
function countProgress(steps: Workspace['steps']): Progress {
  const total = steps.length,
    completed = steps.filter((s) => s.completed).length
  return { completed, total, percent: total ? Math.round((completed / total) * 100) : null }
}
export function goalProgress(data: Workspace, goalId: string): Progress {
  const ids = descendants(goalId, data.goals, (g) => g.parentGoalId)
  return countProgress(data.steps.filter((s) => ids.has(s.goalId)))
}
export function spaceProgress(data: Workspace, spaceId: string): Progress {
  const ids = new Set(data.goals.filter((g) => g.spaceId === spaceId).map((g) => g.id))
  return countProgress(data.steps.filter((s) => ids.has(s.goalId)))
}
export function activeGoals(data: Workspace, spaceId: string): number {
  return data.goals.filter(
    (g) => g.spaceId === spaceId && !g.parentGoalId && goalProgress(data, g.id).percent !== 100,
  ).length
}
export function nodePath(nodeId: string, nodes: KnowledgeNode[]): string[] {
  const byId = new Map(nodes.map((n) => [n.id, n])),
    parts: string[] = []
  let current = byId.get(nodeId)
  const seen = new Set<string>()
  while (current && !seen.has(current.id)) {
    seen.add(current.id)
    parts.unshift(current.title)
    current = current.parentId ? byId.get(current.parentId) : undefined
  }
  return parts
}
export type WorkspaceCommand =
  | { type: 'saveSpace'; value: Workspace['spaces'][number] }
  | { type: 'saveGoal'; value: Goal }
  | { type: 'saveStep'; value: Workspace['steps'][number] }
  | { type: 'saveNode'; value: KnowledgeNode }
  | { type: 'addRelation'; value: Workspace['knowledgeRelations'][number] }
  | { type: 'addLink'; value: Workspace['stepKnowledgeLinks'][number] }
  | { type: 'deleteSpace' | 'deleteGoal' | 'deleteStep' | 'deleteRelation' | 'deleteLink'; id: string }
  | { type: 'deleteNode'; id: string; branch?: boolean }

export function applyCommand(data: Workspace, command: WorkspaceCommand): Workspace {
  let next = { ...data }
  const upsert = <T extends { id: string }>(list: T[], item: T): T[] =>
    list.some((e) => e.id === item.id) ? list.map((e) => (e.id === item.id ? item : e)) : [...list, item]
  if (command.type === 'saveSpace') next.spaces = upsert(data.spaces, command.value)
  else if (command.type === 'saveGoal') next.goals = upsert(data.goals, command.value)
  else if (command.type === 'saveStep') next.steps = upsert(data.steps, command.value)
  else if (command.type === 'saveNode') next.knowledgeNodes = upsert(data.knowledgeNodes, command.value)
  else if (command.type === 'addRelation')
    next.knowledgeRelations = [...data.knowledgeRelations, command.value]
  else if (command.type === 'addLink') next.stepKnowledgeLinks = [...data.stepKnowledgeLinks, command.value]
  else if (command.type === 'deleteRelation')
    next.knowledgeRelations = data.knowledgeRelations.filter((r) => r.id !== command.id)
  else if (command.type === 'deleteLink')
    next.stepKnowledgeLinks = data.stepKnowledgeLinks.filter((l) => l.id !== command.id)
  else {
    const goalIds = new Set<string>(),
      nodeIds = new Set<string>(),
      stepIds = new Set<string>()
    if (command.type === 'deleteSpace') {
      next.spaces = data.spaces.filter((s) => s.id !== command.id)
      data.goals.filter((g) => g.spaceId === command.id).forEach((g) => goalIds.add(g.id))
      data.knowledgeNodes.filter((n) => n.spaceId === command.id).forEach((n) => nodeIds.add(n.id))
    } else if (command.type === 'deleteGoal') {
      descendants(command.id, data.goals, (g) => g.parentGoalId).forEach((id) => goalIds.add(id))
    } else if (command.type === 'deleteStep') stepIds.add(command.id)
    else if (command.type === 'deleteNode') {
      const branch = descendants(command.id, data.knowledgeNodes, (n) => n.parentId)
      if (branch.size > 1 && !command.branch)
        throw new Error('该节点还有子节点。请删除整个分支，或先移动子节点。')
      branch.forEach((id) => nodeIds.add(id))
    }
    next.goals = data.goals.filter((g) => !goalIds.has(g.id))
    data.steps.filter((s) => goalIds.has(s.goalId)).forEach((s) => stepIds.add(s.id))
    next.steps = data.steps.filter((s) => !stepIds.has(s.id))
    next.knowledgeNodes = data.knowledgeNodes.filter((n) => !nodeIds.has(n.id))
    next.knowledgeRelations = data.knowledgeRelations.filter(
      (r) => !nodeIds.has(r.sourceNodeId) && !nodeIds.has(r.targetNodeId),
    )
    next.stepKnowledgeLinks = data.stepKnowledgeLinks.filter(
      (l) => !stepIds.has(l.stepId) && !nodeIds.has(l.knowledgeNodeId),
    )
  }
  // Identity, ownership and creation time cannot be changed by an edit.
  for (const key of workspaceStores) {
    const old = new Map(data[key].map((e) => [e.id, e]))
    for (const value of next[key]) {
      const previous = old.get(value.id)
      if (
        previous &&
        (('spaceId' in value && 'spaceId' in previous && value.spaceId !== previous.spaceId) ||
          ('goalId' in value && 'goalId' in previous && value.goalId !== previous.goalId) ||
          value.createdAt !== previous.createdAt)
      )
        throw new Error('不能修改实体所属领域、目标或创建时间。')
    }
  }
  workspaceSchema.parse(next)
  return next
}
