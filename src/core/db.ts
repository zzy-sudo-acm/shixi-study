import { openDB, type DBSchema, type IDBPDatabase, type IDBPTransaction } from 'idb'
import {
  cardSchema,
  settingsSchema,
  reviewSchema,
  type StudyCard,
  type StoredImage,
  type Review,
  type Settings,
  type Snapshot,
  DEFAULT_SETTINGS,
} from './model'
import { DEFAULT_ALGORITHM, nextReview, queueFor } from './scheduler'
import type { Grade } from 'ts-fsrs'

interface StudyDB extends DBSchema {
  cards: { key: string; value: StudyCard }
  images: { key: string; value: StoredImage }
  reviews: { key: string; value: Review; indexes: { 'by-card': string } }
  meta: { key: string; value: unknown }
}
const stores = ['cards', 'images', 'reviews', 'meta'] as const
type WriteTx = IDBPTransaction<StudyDB, typeof stores, 'readwrite'>
// A path-specific database avoids mixing different projects on the same Pages origin.
export const DB_NAME = `shixi:${typeof location === 'undefined' ? 'test' : location.pathname.replace(/\/[^/]*\.html$/, '/').replace(/\/$/, '') || '/'}`
let connection: Promise<IDBPDatabase<StudyDB>> | undefined
export function database() {
  if (!connection)
    connection = openDB<StudyDB>(DB_NAME, 2, {
      upgrade(db, oldVersion, _newVersion, tx) {
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
            .catch(() => undefined)
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
  const tx = db.transaction(['cards', 'reviews', 'meta'], 'readonly')
  const [cards, reviews, settings, algorithm, revision, undoId] = await Promise.all([
    tx.objectStore('cards').getAll(),
    tx.objectStore('reviews').getAll(),
    tx.objectStore('meta').get('settings'),
    tx.objectStore('meta').get('algorithm'),
    tx.objectStore('meta').get('revision'),
    tx.objectStore('meta').get('undoId'),
  ])
  await tx.done
  return {
    cards,
    reviews,
    settings: settingsSchema.parse(settings ?? DEFAULT_SETTINGS),
    algorithm: (algorithm ?? DEFAULT_ALGORITHM) as Snapshot['algorithm'],
    revision: (revision ?? 0) as number,
    undoId: (undoId ?? null) as string | null,
  }
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
  return mutate(revision, async (tx) => {
    for (const image of images) await tx.objectStore('images').put(image)
    for (const imageId of [...card.question.images, ...card.answer.images]) {
      if (!(await tx.objectStore('images').getKey(imageId)))
        throw new Error('图片缺失，未保存。请重新添加图片。')
    }
    await tx.objectStore('cards').put(valid)
    const settings = ((await tx.objectStore('meta').get('settings')) ?? DEFAULT_SETTINGS) as Settings
    await tx.objectStore('meta').put({ ...settings, lastSubject: card.subject }, 'settings')
    await tx.objectStore('meta').put(null, 'undoId')
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
    const used = new Set(allCards.flatMap((c) => [...c.question.images, ...c.answer.images]))
    for (const key of await tx.objectStore('images').getAllKeys())
      if (!used.has(key)) await tx.objectStore('images').delete(key)
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
  const [cards, images, reviews, settings, algorithm, undoId] = await Promise.all([
    tx.objectStore('cards').getAll(),
    tx.objectStore('images').getAll(),
    tx.objectStore('reviews').getAll(),
    tx.objectStore('meta').get('settings'),
    tx.objectStore('meta').get('algorithm'),
    tx.objectStore('meta').get('undoId'),
  ])
  await tx.done
  return {
    cards,
    images,
    reviews,
    settings: (settings ?? DEFAULT_SETTINGS) as Settings,
    algorithm: (algorithm ?? DEFAULT_ALGORITHM) as Snapshot['algorithm'],
    undoId: (undoId ?? null) as string | null,
  }
}
export async function replaceAll(data: Awaited<ReturnType<typeof readAllData>>, revision: number) {
  return mutate(revision, async (tx) => {
    for (const store of stores) await tx.objectStore(store).clear()
    for (const card of data.cards) await tx.objectStore('cards').put(card)
    for (const image of data.images) await tx.objectStore('images').put(image)
    for (const review of data.reviews) await tx.objectStore('reviews').put(review)
    await tx.objectStore('meta').put(data.settings, 'settings')
    await tx.objectStore('meta').put(data.algorithm, 'algorithm')
    await tx.objectStore('meta').put(data.undoId, 'undoId')
  })
}
