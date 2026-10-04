import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { deleteDB, openDB } from 'idb'
import {
  EMPTY_WORKSPACE,
  DATA_VERSION,
  type Workspace,
  type KnowledgeNode,
  type Goal,
} from '../src/core/model'
import { applyCommand, depthOf, goalProgress, spaceProgress, workspaceSchema } from '../src/core/workspace'
import { changeWorkspace, closeDatabase, database, DB_NAME, readSnapshot, readAllData } from '../src/core/db'
import { exportBackup, validateBackup, restoreBackup, sha256 } from '../src/core/backup'
import { migrateLegacy } from '../src/core/migration'
import { emptySchedule } from '../src/core/scheduler'
import { exportRecoveryData } from '../src/core/recovery'

const time = 1000
const space = { id: 's', name: '任意领域', createdAt: time, updatedAt: time }
const goal = (id = 'g', parentGoalId: string | null = null): Goal => ({
  id,
  spaceId: 's',
  title: id,
  parentGoalId,
  createdAt: time,
  updatedAt: time,
})
const node = (id = 'n', parentId: string | null = null): KnowledgeNode => ({
  id,
  spaceId: 's',
  title: id,
  parentId,
  createdAt: time,
  updatedAt: time,
})
const step = (id = 't', goalId = 'g', completed = false) => ({
  id,
  goalId,
  title: id,
  completed,
  ...(completed ? { completedAt: time } : {}),
  createdAt: time,
  updatedAt: time,
})
function fixture(): Workspace {
  return {
    ...structuredClone(EMPTY_WORKSPACE),
    spaces: [space],
    goals: [goal()],
    knowledgeNodes: [node()],
    steps: [step()],
  }
}
function oldCard() {
  return {
    id: 'c',
    subject: '高数',
    kind: 'knowledge',
    status: 'ready',
    question: { text: '泰勒公式', images: [] },
    answer: { text: '完整原答案', images: [] },
    chapter: '',
    category: '极限/泰勒',
    familiarity: 0,
    relatedIds: [],
    tags: [],
    book: '',
    page: '',
    number: '',
    createdAt: time,
    updatedAt: time,
    schedule: emptySchedule(time),
  }
}
beforeEach(async () => {
  await closeDatabase()
  await deleteDB(DB_NAME)
})
afterEach(async () => {
  vi.restoreAllMocks()
  await closeDatabase()
  await deleteDB(DB_NAME)
})

describe('进度只来自步骤', () => {
  it('无步骤返回空进度，不能伪造 0%', () => {
    const data = fixture()
    data.steps = []
    expect(goalProgress(data, 'g')).toEqual({ total: 0, completed: 0, percent: null })
    expect(spaceProgress(data, 's').percent).toBeNull()
  })
  it('单目标、多个目标和嵌套目标同权重统计，不重复计数', () => {
    const data = fixture()
    data.goals.push(goal('g2'), goal('child', 'g'), goal('leaf', 'child'))
    data.steps = [step('a', 'g', true), step('b', 'child'), step('c', 'leaf', true), step('d', 'g2')]
    expect(goalProgress(data, 'g')).toEqual({ total: 3, completed: 2, percent: 67 })
    expect(goalProgress(data, 'leaf').percent).toBe(100)
    expect(spaceProgress(data, 's')).toEqual({ total: 4, completed: 2, percent: 50 })
  })
  it('完成与取消完成不会影响知识节点', () => {
    const before = fixture()
    const done = applyCommand(before, { type: 'saveStep', value: step('t', 'g', true) })
    expect(spaceProgress(done, 's').percent).toBe(100)
    const undone = applyCommand(done, { type: 'saveStep', value: step() })
    expect(spaceProgress(undone, 's').percent).toBe(0)
    expect(undone.knowledgeNodes).toEqual(before.knowledgeNodes)
  })
})
describe('稳定节点树与层级规则', () => {
  it('根节点、子节点、重命名与移动保持 ID 及后代引用', () => {
    let data = fixture()
    data = applyCommand(data, { type: 'saveNode', value: node('child', 'n') })
    data = applyCommand(data, { type: 'saveNode', value: { ...node(), title: '重命名' } })
    expect(data.knowledgeNodes.find((n) => n.id === 'child')?.parentId).toBe('n')
    data = applyCommand(data, { type: 'saveNode', value: node('child') })
    expect(data.knowledgeNodes.find((n) => n.id === 'child')?.parentId).toBeNull()
  })
  it('知识树五层、目标三层上限，移动检查整个子树', () => {
    let data = fixture()
    for (let i = 2; i <= 5; i++)
      data = applyCommand(data, { type: 'saveNode', value: node('n' + i, i === 2 ? 'n' : 'n' + (i - 1)) })
    expect(() => applyCommand(data, { type: 'saveNode', value: node('n6', 'n5') })).toThrow('5 层')
    expect(() => applyCommand(data, { type: 'saveNode', value: node('n', 'n5') })).toThrow('循环')
    data = applyCommand(data, { type: 'saveNode', value: node('root2') })
    data = applyCommand(data, { type: 'saveNode', value: node('child2', 'root2') })
    expect(() => applyCommand(data, { type: 'saveNode', value: node('root2', 'n4') })).toThrow('5 层')
    data.goals.push(goal('g2', 'g'), goal('g3', 'g2'))
    expect(() => applyCommand(data, { type: 'saveGoal', value: goal('g4', 'g3') })).toThrow('3 层')
    expect(depthOf('g3', new Map(data.goals.map((g) => [g.id, g])), (g) => g.parentGoalId)).toBe(3)
  })
  it('跨领域、缺失父节点和目标循环拒绝', () => {
    const data = fixture()
    data.spaces.push({ ...space, id: 's2' })
    data.knowledgeNodes.push({ ...node('other'), spaceId: 's2' })
    expect(() => applyCommand(data, { type: 'saveNode', value: node('n', 'other') })).toThrow('同一领域')
    expect(() => applyCommand(data, { type: 'saveNode', value: node('n', 'missing') })).toThrow()
    expect(() => applyCommand(data, { type: 'saveGoal', value: goal('g', 'g') })).toThrow('循环')
  })
})
describe('关系、步骤关联与级联删除', () => {
  const relation = { id: 'r', spaceId: 's', sourceNodeId: 'n', targetNodeId: 'child', createdAt: time }
  const link = { id: 'l', stepId: 't', knowledgeNodeId: 'child', createdAt: time }
  function linked() {
    let data = fixture()
    data.knowledgeNodes.push(node('child', 'n'))
    data = applyCommand(data, { type: 'addRelation', value: relation })
    return applyCommand(data, { type: 'addLink', value: link })
  }
  it('拒绝自身关联、双向重复、无效关联与重复步骤关联', () => {
    const data = linked()
    expect(() =>
      applyCommand(data, { type: 'addRelation', value: { ...relation, id: 'r2', targetNodeId: 'n' } }),
    ).toThrow('自己')
    expect(() =>
      applyCommand(data, {
        type: 'addRelation',
        value: { ...relation, id: 'r2', sourceNodeId: 'child', targetNodeId: 'n' },
      }),
    ).toThrow('重复')
    expect(() => applyCommand(data, { type: 'addLink', value: { ...link, id: 'l2' } })).toThrow('重复')
    expect(() =>
      applyCommand(data, { type: 'addLink', value: { ...link, id: 'l2', stepId: 'missing' } }),
    ).toThrow('必须存在')
  })
  it('单独移除关系与步骤关联', () => {
    const data = applyCommand(applyCommand(linked(), { type: 'deleteLink', id: 'l' }), {
      type: 'deleteRelation',
      id: 'r',
    })
    expect(data.stepKnowledgeLinks).toEqual([])
    expect(data.knowledgeRelations).toEqual([])
  })
  it('删除步骤清理关联；删除节点清理关系及步骤关联', () => {
    expect(applyCommand(linked(), { type: 'deleteStep', id: 't' }).stepKnowledgeLinks).toEqual([])
    const data = applyCommand(linked(), { type: 'deleteNode', id: 'child' })
    expect(data.knowledgeRelations).toEqual([])
    expect(data.stepKnowledgeLinks).toEqual([])
  })
  it('有子节点默认阻止删除，明确分支删除后不留孤儿', () => {
    expect(() => applyCommand(linked(), { type: 'deleteNode', id: 'n' })).toThrow('先移动')
    const data = applyCommand(linked(), { type: 'deleteNode', id: 'n', branch: true })
    expect(data.knowledgeNodes).toEqual([])
    expect(data.stepKnowledgeLinks).toEqual([])
  })
  it('目标递归清理步骤与关联，领域删除清理所有新实体', () => {
    const data = linked()
    data.goals.push(goal('sub', 'g'))
    data.steps.push(step('substep', 'sub'))
    const afterGoal = applyCommand(data, { type: 'deleteGoal', id: 'g' })
    expect(afterGoal.goals).toEqual([])
    expect(afterGoal.steps).toEqual([])
    expect(afterGoal.stepKnowledgeLinks).toEqual([])
    expect(applyCommand(data, { type: 'deleteSpace', id: 's' })).toEqual(EMPTY_WORKSPACE)
  })
})
describe('IndexedDB、备份与 migration', () => {
  it('首次打开真正为空，新库明确 v3', async () => {
    const data = await readSnapshot()
    expect(data.spaces).toEqual([])
    expect(data.knowledgeNodes).toEqual([])
    expect(data.version).toBe(DATA_VERSION)
    expect((await database()).version).toBe(3)
  })
  it('实际 v2 数据库升级保留卡片和分类，形成稳定节点', async () => {
    const db = await openDB(DB_NAME, 2, {
      upgrade(db) {
        db.createObjectStore('cards', { keyPath: 'id' })
        db.createObjectStore('images', { keyPath: 'id' })
        db.createObjectStore('reviews', { keyPath: 'id' }).createIndex('by-card', 'cardId')
        db.createObjectStore('meta')
      },
    })
    const existing = oldCard()
    await db.put('cards', existing)
    await db.put('meta', [{ subject: '高数', path: '极限/泰勒' }], 'categories')
    db.close()
    const data = await readSnapshot()
    expect(data.cards).toEqual([existing])
    expect(data.spaces.map((s) => s.name)).toEqual(['高数'])
    expect(data.knowledgeNodes.map((n) => n.title)).toEqual(['极限', '泰勒'])
    expect(data.knowledgeNodes[1].parentId).toBe(data.knowledgeNodes[0].id)
    expect(data.migrationWarnings.length).toBeGreaterThan(0)
    await closeDatabase()
    expect((await readSnapshot()).knowledgeNodes).toEqual(data.knowledgeNodes)
  })
  it('畸形旧数据升级回滚，原库版本与内容保留', async () => {
    const db = await openDB(DB_NAME, 2, {
      upgrade(db) {
        db.createObjectStore('cards', { keyPath: 'id' })
        db.createObjectStore('images', { keyPath: 'id' })
        db.createObjectStore('reviews', { keyPath: 'id' }).createIndex('by-card', 'cardId')
        db.createObjectStore('meta')
      },
    })
    await db.put('cards', { id: 'invalid', unknown: '原数据' })
    db.close()
    await expect(readSnapshot()).rejects.toThrow()
    const old = await openDB(DB_NAME, 2)
    expect(await old.get('cards', 'invalid')).toEqual({ id: 'invalid', unknown: '原数据' })
    old.close()
    const recovery = JSON.parse(await exportRecoveryData())
    expect(recovery.databaseVersion).toBe(2)
    expect(recovery.stores.cards).toEqual([{ key: 'invalid', value: { id: 'invalid', unknown: '原数据' } }])
  })
  it('旧备份 v2 迁移及 v3 往返覆盖恢复', async () => {
    const base = JSON.parse(await exportBackup())
    const payload = {
      cards: [oldCard()],
      images: [],
      reviews: [],
      settings: base.payload.settings,
      algorithm: base.payload.algorithm,
      undoId: null,
      categories: [{ subject: '高数', path: '极限/泰勒' }],
    }
    const migrated = await validateBackup(
      JSON.stringify({ ...base, version: 2, payload, sha256: await sha256(JSON.stringify(payload)) }),
    )
    expect(migrated.spaces).toHaveLength(1)
    expect(migrated.cards).toEqual(payload.cards)
    await restoreBackup(migrated, 0)
    await changeWorkspace({ type: 'saveGoal', value: { ...goal(), spaceId: migrated.spaces[0].id } }, 1)
    await changeWorkspace({ type: 'saveStep', value: step() }, 2)
    const before = await readAllData(),
      backup = await validateBackup(await exportBackup())
    await changeWorkspace({ type: 'deleteStep', id: 't' }, 3)
    await restoreBackup(backup, 4)
    expect(await readAllData()).toEqual(before)
  })
  it('新结构 schema 拒绝重复、循环与孤儿，损坏备份不修改数据库', async () => {
    const data = fixture()
    data.spaces.push(space)
    expect(() => workspaceSchema.parse(data)).toThrow('重复 ID')
    const raw = JSON.parse(await exportBackup())
    raw.payload.steps = [step()]
    raw.sha256 = await sha256(JSON.stringify(raw.payload))
    await expect(validateBackup(JSON.stringify(raw))).rejects.toThrow('目标不存在')
    expect((await readSnapshot()).steps).toEqual([])
  })
  it('新实体并发写入只提交一次，写入失败回滚', async () => {
    const results = await Promise.allSettled([
      changeWorkspace({ type: 'saveSpace', value: space }, 0),
      changeWorkspace({ type: 'saveSpace', value: { ...space, id: 's2' } }, 0),
    ])
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1)
    const before = await readAllData(),
      snap = await readSnapshot()
    const put = IDBObjectStore.prototype.put
    vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(function (
      this: IDBObjectStore,
      ...args: Parameters<IDBObjectStore['put']>
    ) {
      if (this.name === 'knowledgeNodes') throw new DOMException('full', 'QuotaExceededError')
      return put.apply(this, args)
    })
    await expect(
      changeWorkspace({ type: 'saveNode', value: { ...node(), spaceId: snap.spaces[0].id } }, snap.revision),
    ).rejects.toThrow('full')
    expect(await readAllData()).toEqual(before)
    expect((await readSnapshot()).revision).toBe(snap.revision)
  })
  it('超深旧路径明确提示并保留，空旧库不预设科目', () => {
    expect(migrateLegacy([], []).spaces).toEqual([])
    const migrated = migrateLegacy([{ ...oldCard(), category: 'a/b/c/d/e/f' }], [])
    expect(migrated.knowledgeNodes).toHaveLength(5)
    expect(migrated.migrationWarnings.join('')).toContain('原分类路径仍保留')
  })
})
