import { openDB, type DBSchema, type IDBPDatabase, type IDBPTransaction } from 'idb'
import {
  cardSchema,
  categoryEntrySchema,
  categoryUnder,
  normalizeCategoryPath,
  CATEGORY_MAX_DEPTH,
  settingsSchema,
  reviewSchema,
  type CategoryEntry,
  type StudyCard,
  type StoredImage,
  type Review,
  type Settings,
  type Snapshot,
  type Subject,
  DEFAULT_SETTINGS,
  DATA_VERSION,
  type Workspace,
} from './model'
import { z } from 'zod'
import { DEFAULT_ALGORITHM, nextReview, queueFor } from './scheduler'
import type { Grade } from 'ts-fsrs'
import { applyCommand, workspaceSchema, workspaceStores, type WorkspaceCommand } from './workspace'
import { migrateLegacy } from './migration'

interface StudyDB extends DBSchema {
  spaces: { key: string; value: Workspace['spaces'][number] }
  goals: { key: string; value: Workspace['goals'][number] }
  steps: { key: string; value: Workspace['steps'][number] }
  knowledgeNodes: { key: string; value: Workspace['knowledgeNodes'][number] }
  knowledgeRelations: { key: string; value: Workspace['knowledgeRelations'][number] }
  stepKnowledgeLinks: { key: string; value: Workspace['stepKnowledgeLinks'][number] }
  cards: { key: string; value: StudyCard }
  images: { key: string; value: StoredImage }
  reviews: { key: string; value: Review; indexes: { 'by-card': string } }
  meta: { key: string; value: unknown }
}
const stores = ['cards', 'images', 'reviews', 'meta', ...workspaceStores] as const
type WriteTx = IDBPTransaction<StudyDB, typeof stores, 'readwrite'>
// A path-specific database avoids mixing different projects on the same Pages origin.
export const DB_NAME = `shixi:${typeof location === 'undefined' ? 'test' : location.pathname.replace(/\/[^/]*\.html$/, '/').replace(/\/$/, '') || '/'}`
let connection: Promise<IDBPDatabase<StudyDB>> | undefined
export function database() {
  let migrationFailure: unknown
  if (!connection)
    connection = openDB<StudyDB>(DB_NAME, DATA_VERSION, {
      upgrade(db, oldVersion, _newVersion, tx) {
        // idb also rejects tx.done on upgrade abort; the openDB promise reports it.
        void tx.done.catch(() => undefined)
        if (oldVersion < 1) {
          db.createObjectStore('cards', { keyPath: 'id' })
          db.createObjectStore('images', { keyPath: 'id' })
          const reviews = db.createObjectStore('reviews', { keyPath: 'id' })
          reviews.createIndex('by-card', 'cardId')
          db.createObjectStore('meta')
        }
        if (oldVersion < 2) {
          // v1 → v2 only adds reminder preferences, preserving all learning data.
          const request = tx.objectStore('meta').get('settings')
          void request
            .then((value) =>
              tx
                .objectStore('meta')
                .put({ ...DEFAULT_SETTINGS, ...((value as Partial<Settings>) ?? {}) }, 'settings'),
            )
            .catch((error) => {
              migrationFailure = error
              tx.abort()
            })
        }
        if (oldVersion < 3) {
          for (const name of workspaceStores) db.createObjectStore(name, { keyPath: 'id' })
          // All reads and writes are in the versionchange transaction. Failure aborts the
          // upgrade, preserving the old stores and database version for recovery.
          void Promise.all([tx.objectStore('cards').getAll(), tx.objectStore('meta').get('categories')])
            .then(async ([cards, categories]) => {
              const migrated = migrateLegacy(cards, categories)
              for (const name of workspaceStores)
                for (const entity of migrated[name]) await tx.objectStore(name).put(entity)
              await tx.objectStore('meta').put(migrated.migrationWarnings, 'migrationWarnings')
              await tx.objectStore('meta').put(DATA_VERSION, 'dataVersion')
            })
            .catch((error) => {
              migrationFailure = error
              tx.abort()
            })
        }
      },
      blocked() {
        window.dispatchEvent(new CustomEvent('shixi-db-blocked'))
      },
      blocking() {
        void connection?.then((db) => db.close())
        connection = undefined
      },
      terminated() {
        connection = undefined
      },
    }).catch((error) => {
      connection = undefined
      if (migrationFailure)
        throw new Error('旧数据未能安全升级，原数据库未修改。请导出原始数据副本后修复格式。', {
          cause: migrationFailure,
        })
      throw error
    })
  return connection
}
export async function closeDatabase() {
  if (connection) (await connection).close()
  connection = undefined
}
export async function readSnapshot(): Promise<Snapshot> {
  const db = await database()
  const tx = db.transaction(stores, 'readonly')
  const workspace = await readWorkspace(tx)
  const [cards, reviews, settings, algorithm, revision, undoId, categories] = await Promise.all([
    tx.objectStore('cards').getAll(),
    tx.objectStore('reviews').getAll(),
    tx.objectStore('meta').get('settings'),
    tx.objectStore('meta').get('algorithm'),
    tx.objectStore('meta').get('revision'),
    tx.objectStore('meta').get('undoId'),
    tx.objectStore('meta').get('categories'),
  ])
  const migrationWarnings = await tx.objectStore('meta').get('migrationWarnings')
  await tx.done
  return {
    ...workspace,
    version: DATA_VERSION,
    migrationWarnings: z.array(z.string()).parse(migrationWarnings ?? []),
    cards,
    reviews,
    settings: settingsSchema.parse(settings ?? DEFAULT_SETTINGS),
    algorithm: (algorithm ?? DEFAULT_ALGORITHM) as Snapshot['algorithm'],
    revision: (revision ?? 0) as number,
    undoId: (undoId ?? null) as string | null,
    categories: parseCategories(categories),
  }
}
const categoryListSchema = z.array(categoryEntrySchema).max(2000)
function parseCategories(value: unknown): CategoryEntry[] {
  return categoryListSchema.parse(value ?? [])
}
async function readWorkspace(
  tx: IDBPTransaction<StudyDB, typeof stores, 'readonly' | 'readwrite'>,
): Promise<Workspace> {
  const entries = await Promise.all(
    workspaceStores.map(
      async (name) =>
        [
          name,
          (await tx.objectStore(name).getAll()).sort(
            (a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id),
          ),
        ] as const,
    ),
  )
  return workspaceSchema.parse(Object.fromEntries(entries))
}
export async function changeWorkspace(command: WorkspaceCommand, revision: number) {
  return mutate(revision, async (tx) => {
    const previous = await readWorkspace(tx),
      next = applyCommand(previous, command)
    for (const name of workspaceStores) {
      if (next[name] === previous[name]) continue
      const before = new Map(previous[name].map((e) => [e.id, e]))
      for (const value of next[name]) {
        if (before.get(value.id) !== value) await tx.objectStore(name).put(value)
        before.delete(value.id)
      }
      for (const id of before.keys()) await tx.objectStore(name).delete(id)
    }
  })
}
async function guard(tx: WriteTx, revision: number) {
  const current = (await tx.objectStore('meta').get('revision')) ?? 0
  if (current !== revision)
    throw new Error('数据已在另一个页面更新。请刷新本页后重试；编辑中的文字可先复制保存。')
}
function signal() {
  if (typeof BroadcastChannel !== 'undefined') {
    const channel = new BroadcastChannel(DB_NAME)
    channel.postMessage('changed')
    channel.close()
  }
}
async function mutate<T>(revision: number, action: (tx: WriteTx) => Promise<T>): Promise<T> {
  const db = await database()
  const tx = db.transaction(stores, 'readwrite')
  try {
    await guard(tx, revision)
    const result = await action(tx)
    await tx.objectStore('meta').put(revision + 1, 'revision')
    await tx.done
    signal()
    return result
  } catch (error) {
    try {
      tx.abort()
    } catch {
      /* transaction may already be aborted */
    }
    await tx.done.catch(() => undefined)
    throw error
  }
}
export async function saveCard(card: StudyCard, images: StoredImage[], revision: number) {
  const valid = cardSchema.parse(card)
  if (valid.category) valid.category = validCategoryPath(valid.category)
  return mutate(revision, async (tx) => {
    const all = await tx.objectStore('cards').getAll()
    const related = new Set(valid.relatedIds ?? [])
    if (related.has(valid.id)) throw new Error('知识点不能与自己关联。')
    for (const id of related)
      if (!all.some((c) => c.id === id && c.subject === valid.subject))
        throw new Error('关联的内容必须存在且属于同一领域，请重新选择。')
    // A relation is undirected. Update both ends atomically, also when changing subject.
    if (valid.relatedIds || related.size) valid.relatedIds = [...related]
    for (const other of all) {
      if (other.id === valid.id) continue
      const previous = other.relatedIds ?? []
      if (related.has(other.id) === previous.includes(valid.id)) continue
      const next = related.has(other.id) ? [...previous, valid.id] : previous.filter((id) => id !== valid.id)
      if (next.length > 100) throw new Error('关联内容已达到 100 个连接，请先减少连接。')
      await tx.objectStore('cards').put({ ...other, relatedIds: next })
    }
    for (const image of images) await tx.objectStore('images').put(image)
    for (const imageId of [...card.question.images, ...card.answer.images]) {
      if (!(await tx.objectStore('images').getKey(imageId)))
        throw new Error('图片缺失，未保存。请重新添加图片。')
    }
    await tx.objectStore('cards').put(valid)
    const settings = ((await tx.objectStore('meta').get('settings')) ?? DEFAULT_SETTINGS) as Settings
    await tx.objectStore('meta').put({ ...settings, lastSubject: card.subject }, 'settings')
    await tx.objectStore('meta').put(null, 'undoId')
    // The category tree grows as cards are entered, within the same transaction.
    if (valid.category) {
      const categories = parseCategories(await tx.objectStore('meta').get('categories'))
      if (!categories.some((e) => e.subject === valid.subject && e.path === valid.category)) {
        categories.push({ subject: valid.subject, path: valid.category })
        await tx.objectStore('meta').put(categories, 'categories')
      }
    }
    // Release unreferenced images only in this successful content transaction.
    const allCards = await tx.objectStore('cards').getAll()
    const used = new Set(allCards.flatMap((c) => [...c.question.images, ...c.answer.images]))
    for (const key of await tx.objectStore('images').getAllKeys())
      if (!used.has(key)) await tx.objectStore('images').delete(key)
  })
}
export async function deleteCard(cardId: string, revision: number) {
  return mutate(revision, async (tx) => {
    const card = await tx.objectStore('cards').get(cardId)
    if (!card) throw new Error('内容不存在，请返回后刷新。')
    await tx.objectStore('cards').delete(cardId)
    const reviewIds = await tx.objectStore('reviews').index('by-card').getAllKeys(cardId)
    for (const id of reviewIds) await tx.objectStore('reviews').delete(id)
    const undoId = (await tx.objectStore('meta').get('undoId')) as string | null
    if (undoId && reviewIds.includes(undoId)) await tx.objectStore('meta').put(null, 'undoId')
    const allCards = await tx.objectStore('cards').getAll()
    for (const other of allCards)
      if (other.relatedIds?.includes(cardId))
        await tx
          .objectStore('cards')
          .put({ ...other, relatedIds: other.relatedIds.filter((id) => id !== cardId) })
    const used = new Set(allCards.flatMap((c) => [...c.question.images, ...c.answer.images]))
    for (const key of await tx.objectStore('images').getAllKeys())
      if (!used.has(key)) await tx.objectStore('images').delete(key)
  })
}
export async function setFamiliarity(cardId: string, level: number, revision: number) {
  return mutate(revision, async (tx) => {
    const card = await tx.objectStore('cards').get(cardId)
    if (!card) throw new Error('内容不存在，请返回后刷新。')
    await tx.objectStore('cards').put(cardSchema.parse({ ...card, familiarity: level }))
  })
}
function validCategoryPath(path: string): string {
  const normalized = normalizeCategoryPath(path)
  if (!normalized) throw new Error('分类名称不能为空。')
  if (normalized.length > 100) throw new Error('分类最长 100 字。')
  if (normalized.split('/').length > CATEGORY_MAX_DEPTH)
    throw new Error(`分类最多支持 ${CATEGORY_MAX_DEPTH} 层。`)
  return normalized
}
async function readCategories(tx: WriteTx): Promise<CategoryEntry[]> {
  return parseCategories(await tx.objectStore('meta').get('categories'))
}
export async function addCategory(subject: Subject, path: string, revision: number) {
  const valid = validCategoryPath(path)
  return mutate(revision, async (tx) => {
    const categories = await readCategories(tx)
    if (!categories.some((e) => e.subject === subject && e.path === valid)) {
      categories.push({ subject, path: valid })
      await tx.objectStore('meta').put(categories, 'categories')
    }
  })
}
export async function renameCategory(subject: Subject, oldPath: string, newPath: string, revision: number) {
  const from = normalizeCategoryPath(oldPath)
  const to = validCategoryPath(newPath)
  if (!from || to === from) return
  if (categoryUnder(to, from)) throw new Error('不能把节点移动到自己的后代中。')
  return mutate(revision, async (tx) => {
    const renamed = await readCategories(tx)
    const allCards = await tx.objectStore('cards').getAll()
    for (const path of [
      ...renamed.filter((e) => e.subject === subject).map((e) => e.path),
      ...allCards.filter((c) => c.subject === subject).map((c) => c.category),
    ])
      if (categoryUnder(path, from)) validCategoryPath(to + path.slice(from.length))
    for (const [index, entry] of renamed.entries())
      if (entry.subject === subject && categoryUnder(entry.path, from))
        renamed[index] = { subject, path: to + entry.path.slice(from.length) }
    const seen = new Set<string>()
    const deduped = renamed.filter((e) => {
      const key = `${e.subject}${e.path}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    await tx.objectStore('meta').put(deduped, 'categories')
    for (const card of await tx.objectStore('cards').getAll())
      if (card.subject === subject && categoryUnder(card.category, from))
        await tx
          .objectStore('cards')
          .put(cardSchema.parse({ ...card, category: to + card.category.slice(from.length) }))
  })
}
export async function deleteCategory(subject: Subject, path: string, revision: number) {
  const target = normalizeCategoryPath(path)
  if (!target) return
  return mutate(revision, async (tx) => {
    const categories = (await readCategories(tx)).filter(
      (e) => !(e.subject === subject && categoryUnder(e.path, target)),
    )
    await tx.objectStore('meta').put(categories, 'categories')
    for (const card of await tx.objectStore('cards').getAll())
      if (card.subject === subject && categoryUnder(card.category, target))
        await tx.objectStore('cards').put(cardSchema.parse({ ...card, category: '' }))
  })
}
export async function saveSettings(settings: Settings, revision: number) {
  const valid = settingsSchema.parse(settings)
  return mutate(revision, async (tx) => {
    await tx.objectStore('meta').put(valid, 'settings')
  })
}
export async function rateCard(
  cardId: string,
  rating: Grade,
  now: number,
  durationMs: number,
  snapshot: Snapshot,
) {
  return mutate(snapshot.revision, async (tx) => {
    const card = await tx.objectStore('cards').get(cardId)
    if (!card) throw new Error('内容不存在，请返回首页刷新。')
    if (card.schedule.state === 0 && queueFor(snapshot, now).remaining === 0)
      throw new Error('今日新学已达上限，可在设置中调整。')
    if (card.schedule.state !== 0 && card.schedule.due > now)
      throw new Error('这条内容尚未到期，请返回首页。')
    const review = reviewSchema.parse(nextReview(card, rating, now, durationMs, snapshot.algorithm))
    await tx.objectStore('cards').put({ ...card, schedule: review.after, updatedAt: now })
    await tx.objectStore('reviews').put(review)
    await tx.objectStore('meta').put(review.id, 'undoId')
    await tx.objectStore('meta').put(snapshot.algorithm, 'algorithm')
    return review
  })
}
export async function undoReview(snapshot: Snapshot): Promise<string> {
  return mutate(snapshot.revision, async (tx) => {
    const id = (await tx.objectStore('meta').get('undoId')) as string | null
    if (!id) throw new Error('没有可以撤销的评分。')
    const review = await tx.objectStore('reviews').get(id)
    if (!review) throw new Error('撤销记录缺失，未修改数据。')
    const card = await tx.objectStore('cards').get(review.cardId)
    if (!card || JSON.stringify(card.schedule) !== JSON.stringify(review.after))
      throw new Error('这条内容已经发生变化，无法撤销。')
    await tx.objectStore('cards').put({ ...card, schedule: review.before, updatedAt: review.beforeUpdatedAt })
    await tx.objectStore('reviews').delete(id)
    await tx.objectStore('meta').put(null, 'undoId')
    return card.id
  })
}
export async function readImage(id: string) {
  return (await database()).get('images', id)
}
export async function readAllData() {
  const db = await database()
  const tx = db.transaction(stores, 'readonly')
  const workspace = await readWorkspace(tx)
  const [cards, images, reviews, settings, algorithm, undoId, categories] = await Promise.all([
    tx.objectStore('cards').getAll(),
    tx.objectStore('images').getAll(),
    tx.objectStore('reviews').getAll(),
    tx.objectStore('meta').get('settings'),
    tx.objectStore('meta').get('algorithm'),
    tx.objectStore('meta').get('undoId'),
    tx.objectStore('meta').get('categories'),
  ])
  const migrationWarnings = await tx.objectStore('meta').get('migrationWarnings')
  await tx.done
  return {
    ...workspace,
    migrationWarnings: z.array(z.string()).parse(migrationWarnings ?? []),
    cards,
    images,
    reviews,
    settings: (settings ?? DEFAULT_SETTINGS) as Settings,
    algorithm: (algorithm ?? DEFAULT_ALGORITHM) as Snapshot['algorithm'],
    undoId: (undoId ?? null) as string | null,
    categories: parseCategories(categories),
  }
}
export async function replaceAll(data: Awaited<ReturnType<typeof readAllData>>, revision: number) {
  workspaceSchema.parse(Object.fromEntries(workspaceStores.map((name) => [name, data[name]])))
  return mutate(revision, async (tx) => {
    for (const store of stores) await tx.objectStore(store).clear()
    for (const card of data.cards) await tx.objectStore('cards').put(card)
    for (const image of data.images) await tx.objectStore('images').put(image)
    for (const review of data.reviews) await tx.objectStore('reviews').put(review)
    for (const name of workspaceStores)
      for (const entity of data[name]) await tx.objectStore(name).put(entity)
    await tx.objectStore('meta').put(data.settings, 'settings')
    await tx.objectStore('meta').put(data.algorithm, 'algorithm')
    await tx.objectStore('meta').put(data.undoId, 'undoId')
    await tx.objectStore('meta').put(data.categories, 'categories')
    await tx.objectStore('meta').put(data.migrationWarnings, 'migrationWarnings')
    await tx.objectStore('meta').put(DATA_VERSION, 'dataVersion')
  })
}
