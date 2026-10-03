import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { deleteDB, openDB } from 'idb'
import { fsrs, type Grade } from 'ts-fsrs'
import {
  closeDatabase,
  database,
  DB_NAME,
  rateCard,
  readAllData,
  readSnapshot,
  saveCard,
  saveSettings,
  undoReview,
} from '../src/core/db'
import { blobToBase64, exportBackup, restoreBackup, sha256, validateBackup } from '../src/core/backup'
import { clearDraft, closeDraftDatabase, DRAFT_DB_NAME, loadDraft, saveDraft } from '../src/core/draft'
import { cardSchema, DEFAULT_SETTINGS, type StudyCard } from '../src/core/model'
import {
  DEFAULT_ALGORITHM,
  deserializeCard,
  emptySchedule,
  localDay,
  localDayBounds,
  newStudiedToday,
  nextReview,
  queueFor,
  serializeCard,
} from '../src/core/scheduler'

const now = new Date(2026, 9, 3, 12).getTime()
const png = Uint8Array.from(
  atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jN1cAAAAASUVORK5CYII='),
  (c) => c.charCodeAt(0),
)
function card(patch: Partial<StudyCard> = {}): StudyCard {
  return cardSchema.parse({
    id: crypto.randomUUID(),
    subject: '高数',
    kind: 'knowledge',
    status: 'ready',
    question: { text: '洛必达法则的适用条件？', images: [] },
    answer: { text: '先确认未定式，再检查可导性等条件。', images: [] },
    chapter: '',
    tags: [],
    book: '',
    page: '',
    number: '',
    createdAt: now,
    updatedAt: now,
    schedule: emptySchedule(now),
    ...patch,
  })
}
async function add(c = card()) {
  await saveCard(c, [], (await readSnapshot()).revision)
  return c
}
async function reseal(envelope: any) {
  envelope.sha256 = await sha256(JSON.stringify(envelope.payload))
  return JSON.stringify(envelope)
}
beforeEach(async () => {
  await closeDatabase()
  await deleteDB(DB_NAME)
  await closeDraftDatabase()
  await deleteDB(DRAFT_DB_NAME)
})
afterEach(async () => {
  vi.restoreAllMocks()
  await closeDatabase()
  await deleteDB(DB_NAME)
  await closeDraftDatabase()
  await deleteDB(DRAFT_DB_NAME)
})

describe('FSRS 调度与队列', () => {
  it('四档评分与官方库完全一致，并保存实际日志和参数', () => {
    const c = card()
    for (const rating of [1, 2, 3, 4] as Grade[]) {
      const expected = fsrs().next(deserializeCard(c.schedule), new Date(now), rating)
      const result = nextReview(c, rating, now, 18000, DEFAULT_ALGORITHM)
      expect(result.after).toEqual(serializeCard(expected.card))
      expect(result.log).toEqual({ ...expected.log, due: expected.log.due.getTime(), review: now })
      expect(result.before).toEqual(c.schedule)
      expect(result.algorithm).toEqual(DEFAULT_ALGORITHM)
      expect(result.durationMs).toBe(18000)
    }
  })
  it('到期优先，待整理不入队，四科共用新学额度，短间隔等到实际时间', async () => {
    const first = await add(),
      second = await add(card({ subject: '英语' }))
    await add(card({ status: 'draft' }))
    let snapshot = await readSnapshot()
    await saveSettings({ ...DEFAULT_SETTINGS, dailyNewLimit: 1 }, snapshot.revision)
    snapshot = await readSnapshot()
    expect(queueFor(snapshot, now).availableNew).toHaveLength(1)
    const review = await rateCard(first.id, 1, now, 500, snapshot)
    snapshot = await readSnapshot()
    expect(queueFor(snapshot, now).due).toHaveLength(0)
    expect(queueFor(snapshot, now).availableNew).toHaveLength(0)
    expect(queueFor(snapshot, now).fresh.map((c) => c.id)).toEqual([second.id])
    expect(queueFor(snapshot, review.after.due - 1).due).toHaveLength(0)
    expect(queueFor(snapshot, review.after.due).due[0].id).toBe(first.id)
    await expect(rateCard(second.id, 3, now, 0, snapshot)).rejects.toThrow('上限')
    await expect(rateCard(first.id, 3, now, 0, snapshot)).rejects.toThrow('尚未到期')
  })
  it('逾期不自动完成或重置，跨天后新学限额自然恢复', async () => {
    const c = await add()
    let snapshot = await readSnapshot()
    await rateCard(c.id, 1, now, 10, snapshot)
    snapshot = await readSnapshot()
    const future = now + 14 * 86400000
    expect(queueFor(snapshot, future).due[0].schedule).toEqual(snapshot.cards[0].schedule)
    expect(newStudiedToday(snapshot.reviews, future)).toBe(0)
    expect(snapshot.cards[0].schedule.reps).toBe(1)
  })
  it('不能给待整理评分，也不能在时钟倒退后追加历史', () => {
    expect(() => nextReview(card({ status: 'draft' }), 3, now, 1, DEFAULT_ALGORITHM)).toThrow('待整理')
    const c = card()
    c.schedule = nextReview(c, 3, now, 1, DEFAULT_ALGORITHM).after
    expect(() => nextReview(c, 3, now - 1, 1, DEFAULT_ALGORITHM)).toThrow('设备时间')
  })
})

describe('本地日期边界', () => {
  it.each(['Asia/Shanghai', 'America/Los_Angeles', 'Pacific/Auckland'])(
    '%s 按本地午夜分日，不按 UTC 截断',
    (timezone) => {
      const prior = process.env.TZ
      process.env.TZ = timezone
      try {
        const before = new Date(2026, 9, 3, 23, 59, 59, 999).getTime(),
          after = before + 1
        const r = nextReview(card(), 3, before, 0, DEFAULT_ALGORITHM)
        expect(localDay(before)).toBe('2026-10-03')
        expect(localDay(after)).toBe('2026-10-04')
        expect(newStudiedToday([r], before)).toBe(1)
        expect(newStudiedToday([r], after)).toBe(0)
        expect(localDayBounds(before).end).toBe(after)
      } finally {
        if (prior === undefined) delete process.env.TZ
        else process.env.TZ = prior
      }
    },
  )
  it('夏令时切换日可以是 23 或 25 小时，不能固定加 24 小时', () => {
    const prior = process.env.TZ
    process.env.TZ = 'America/New_York'
    try {
      const spring = localDayBounds(new Date(2026, 2, 8, 12).getTime())
      const autumn = localDayBounds(new Date(2026, 10, 1, 12).getTime())
      expect((spring.end - spring.start) / 3600000).toBe(23)
      expect((autumn.end - autumn.start) / 3600000).toBe(25)
    } finally {
      if (prior === undefined) delete process.env.TZ
      else process.env.TZ = prior
    }
  })
})

describe('事务、撤销与跨页冲突', () => {
  it('刷新后保留，撤销完整恢复卡片和历史，且只撤销一步', async () => {
    const c = await add()
    const before = await readSnapshot()
    await rateCard(c.id, 3, now, 3200, before)
    await closeDatabase()
    const after = await readSnapshot()
    expect(after.reviews).toHaveLength(1)
    expect(after.cards[0].schedule.reps).toBe(1)
    await undoReview(after)
    const restored = await readSnapshot()
    expect(restored.cards).toEqual(before.cards)
    expect(restored.reviews).toEqual(before.reviews)
    expect(newStudiedToday(restored.reviews, now)).toBe(0)
    expect(restored.undoId).toBeNull()
    await expect(undoReview(restored)).rejects.toThrow('没有可以撤销')
  })
  it('撤销第二次评分保留第一次历史', async () => {
    const c = await add()
    const first = await rateCard(c.id, 1, now, 10, await readSnapshot())
    const before = await readSnapshot()
    await rateCard(c.id, 3, first.after.due, 15, before)
    await undoReview(await readSnapshot())
    const after = await readSnapshot()
    expect(after.cards).toEqual(before.cards)
    expect(after.reviews).toEqual(before.reviews)
  })
  it('同时评分仅一笔提交，旧页面无法覆盖新数据', async () => {
    const c = await add(),
      snapshot = await readSnapshot()
    const results = await Promise.allSettled([
      rateCard(c.id, 3, now, 1, snapshot),
      rateCard(c.id, 4, now, 1, snapshot),
    ])
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1)
    expect((await readSnapshot()).reviews).toHaveLength(1)
    await expect(saveSettings(DEFAULT_SETTINGS, snapshot.revision)).rejects.toThrow('另一个页面')
  })
  it('写入中途配额不足会回滚卡片、图片和版本', async () => {
    const before = await readAllData(),
      snapshot = await readSnapshot()
    const originalPut = IDBObjectStore.prototype.put
    vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(function (
      this: IDBObjectStore,
      ...args: Parameters<IDBObjectStore['put']>
    ) {
      if (this.name === 'cards') throw new DOMException('full', 'QuotaExceededError')
      return originalPut.apply(this, args)
    })
    await expect(
      saveCard(
        card({ question: { text: '', images: ['image-test'] } }),
        [
          {
            id: 'image-test',
            blob: new Blob([png], { type: 'image/png' }),
            width: 1,
            height: 1,
            name: 'test.png',
          },
        ],
        snapshot.revision,
      ),
    ).rejects.toThrow('full')
    expect(await readAllData()).toEqual(before)
    expect((await readSnapshot()).revision).toBe(snapshot.revision)
  })
})

describe('备份恢复与迁移', () => {
  it('图片字节、历史、设置、调度和撤销状态完整往返', async () => {
    const c = card({ question: { text: '有图片', images: ['pic'] }, subject: '408' })
    await saveCard(
      c,
      [{ id: 'pic', blob: new Blob([png], { type: 'image/png' }), width: 1, height: 1, name: 'fixture.png' }],
      0,
    )
    await rateCard(c.id, 3, now, 123, await readSnapshot())
    await saveSettings(
      { ...DEFAULT_SETTINGS, dailyNewLimit: 8, lastSubject: '408', reminderTime: '19:35' },
      (await readSnapshot()).revision,
    )
    const before = await readAllData(),
      backup = await validateBackup(await exportBackup())
    await add(card({ question: { text: '不应保留', images: [] } }))
    await restoreBackup(backup, (await readSnapshot()).revision)
    const restored = await readAllData()
    expect(restored).toEqual(before)
    expect(await blobToBase64(restored.images[0].blob)).toBe(await blobToBase64(before.images[0].blob))
    await undoReview(await readSnapshot())
    expect((await readSnapshot()).reviews).toHaveLength(0)
  })
  it('损坏、未知版本、重复 ID、图片缺失、断裂历史全部拒绝', async () => {
    const c = await add()
    await rateCard(c.id, 3, now, 1, await readSnapshot())
    const before = await readAllData(),
      raw = JSON.parse(await exportBackup())
    const damaged = structuredClone(raw)
    damaged.payload.cards[0].question.text = '改动'
    await expect(validateBackup(JSON.stringify(damaged))).rejects.toThrow('完整性')
    await expect(validateBackup(JSON.stringify({ ...raw, version: 999 }))).rejects.toThrow('不支持')
    const missing = structuredClone(raw)
    missing.payload.cards[0].question.images = ['missing']
    await expect(validateBackup(await reseal(missing))).rejects.toThrow('图片')
    const duplicate = structuredClone(raw)
    duplicate.payload.cards.push(duplicate.payload.cards[0])
    await expect(validateBackup(await reseal(duplicate))).rejects.toThrow('重复')
    const partial = structuredClone(raw)
    partial.payload.reviews = []
    partial.payload.undoId = null
    await expect(validateBackup(await reseal(partial))).rejects.toThrow('历史长度')
    await expect(validateBackup('invalid')).rejects.toThrow('JSON')
    expect(await readAllData()).toEqual(before)
  })
  it('v1 备份补充提醒设置，不改变已有学习数据', async () => {
    await add()
    const raw = JSON.parse(await exportBackup())
    raw.version = 1
    delete raw.payload.settings.reminderTime
    delete raw.payload.settings.reminderEnabled
    const migrated = await validateBackup(await reseal(raw))
    expect(migrated.settings.reminderTime).toBe('20:00')
    expect(migrated.cards).toEqual((await readSnapshot()).cards)
  })
  it('恢复失败时连清空操作一起回滚，保留原数据', async () => {
    await add()
    const backup = await validateBackup(await exportBackup())
    await add(card({ subject: '政治' }))
    const before = await readAllData()
    const originalPut = IDBObjectStore.prototype.put
    vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(function (
      this: IDBObjectStore,
      ...args: Parameters<IDBObjectStore['put']>
    ) {
      if (this.name === 'cards') throw new DOMException('restore full', 'QuotaExceededError')
      return originalPut.apply(this, args)
    })
    await expect(restoreBackup(backup, (await readSnapshot()).revision)).rejects.toThrow('restore full')
    expect(await readAllData()).toEqual(before)
  })
  it('数据库能正确初始化到版本 2', async () => {
    expect((await database()).version).toBe(2)
  })
  it('实际 IndexedDB v1 数据升级到 v2，保留内容与原设置', async () => {
    const old = await openDB(DB_NAME, 1, {
      upgrade(db) {
        db.createObjectStore('cards', { keyPath: 'id' })
        db.createObjectStore('images', { keyPath: 'id' })
        db.createObjectStore('reviews', { keyPath: 'id' }).createIndex('by-card', 'cardId')
        db.createObjectStore('meta')
      },
    })
    const existing = card()
    await old.put('cards', existing)
    await old.put('meta', { dailyNewLimit: 7, lastSubject: '英语' }, 'settings')
    old.close()
    const migrated = await readSnapshot()
    expect(migrated.cards).toEqual([existing])
    expect(migrated.settings).toEqual({
      dailyNewLimit: 7,
      lastSubject: '英语',
      reminderTime: '20:00',
      reminderEnabled: true,
    })
  })
  it('导出读取失败时抛出错误，不生成伪备份', async () => {
    await add()
    const original = IDBObjectStore.prototype.getAll
    vi.spyOn(IDBObjectStore.prototype, 'getAll').mockImplementation(function (
      this: IDBObjectStore,
      ...args: Parameters<IDBObjectStore['getAll']>
    ) {
      if (this.name === 'images') throw new DOMException('read failure', 'UnknownError')
      return original.apply(this, args)
    })
    await expect(exportBackup()).rejects.toThrow('read failure')
  })
})

describe('录入草稿', () => {
  it('草稿含文字与图片可保存、读取与清除', async () => {
    const c = card()
    const image = {
      id: 'draft-image',
      blob: new Blob([png], { type: 'image/png' }),
      width: 1,
      height: 1,
      name: 'draft.png',
    }
    await saveDraft({ card: c, tagsText: '重点，错题', original: true, images: [image], savedAt: now })
    const loaded = await loadDraft()
    expect(loaded?.card).toEqual(c)
    expect(loaded?.tagsText).toBe('重点，错题')
    expect(loaded?.original).toBe(true)
    expect(loaded?.images).toHaveLength(1)
    expect(new Uint8Array(await loaded!.images[0].blob.arrayBuffer())).toEqual(png)
    await clearDraft()
    expect(await loadDraft()).toBeUndefined()
  })
})

describe('内容类型', () => {
  it('英语单词与句子类型可保存，与既有类型共存', async () => {
    await add(card({ subject: '英语', kind: 'word' }))
    await add(card({ subject: '英语', kind: 'sentence' }))
    await add(card({ subject: '高数', kind: 'exercise' }))
    const snapshot = await readSnapshot()
    expect(new Set(snapshot.cards.map((c) => c.kind))).toEqual(new Set(['word', 'sentence', 'exercise']))
  })
})
