import { z } from 'zod'
import {
  algorithmSchema,
  cardSchema,
  categoryEntrySchema,
  DATA_VERSION,
  DEFAULT_SETTINGS,
  reviewSchema,
  settingsSchema,
  type StoredImage,
} from './model'
import { readAllData, replaceAll } from './db'

export const MAX_BACKUP_BYTES = 200 * 1024 * 1024
const imageSchema = z
  .object({
    id: z.string().min(1).max(100),
    width: z.number().int().min(1).max(30000),
    height: z.number().int().min(1).max(30000),
    name: z.string().max(500),
    mime: z.enum(['image/png', 'image/jpeg', 'image/webp']),
    base64: z
      .string()
      .max(24 * 1024 * 1024)
      .regex(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/),
  })
  .strict()
const payloadSchema = z
  .object({
    cards: z.array(cardSchema).max(100000),
    images: z.array(imageSchema).max(100000),
    reviews: z.array(reviewSchema).max(1000000),
    settings: settingsSchema,
    algorithm: algorithmSchema,
    undoId: z.string().max(100).nullable(),
    categories: z.array(categoryEntrySchema).max(2000).default([]),
  })
  .strict()
const envelopeSchema = z
  .object({
    app: z.literal('shixi-study'),
    version: z.number().int(),
    exportedAt: z.string().datetime(),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
    payload: z.unknown(),
  })
  .strict()
export type ValidBackup = z.infer<typeof payloadSchema>
export async function sha256(text: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}
export async function blobToBase64(blob: Blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  let binary = ''
  for (let start = 0; start < bytes.length; start += 32768)
    binary += String.fromCharCode(...bytes.subarray(start, start + 32768))
  return btoa(binary)
}
export function decodeImage(image: ValidBackup['images'][number]): StoredImage {
  const binary = atob(image.base64)
  if (!binary.length) throw new Error('备份含有空图片，未导入。')
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
  const valid =
    image.mime === 'image/png'
      ? bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71
      : image.mime === 'image/jpeg'
        ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
        : binary.startsWith('RIFF') && binary.slice(8, 12) === 'WEBP'
  if (!valid) throw new Error('备份中的图片类型与内容不符，未导入。')
  return {
    id: image.id,
    name: image.name,
    width: image.width,
    height: image.height,
    blob: new Blob([bytes], { type: image.mime }),
  }
}
function uniqueIds(items: { id: string }[], label: string) {
  const ids = new Set(items.map((item) => item.id))
  if (ids.size !== items.length) throw new Error(`备份中存在重复的${label}编号，未导入。`)
  return ids
}
function validateReferences(data: ValidBackup) {
  const cards = uniqueIds(data.cards, '内容')
  const images = uniqueIds(data.images, '图片')
  const reviews = uniqueIds(data.reviews, '复习记录')
  const byId = new Map(data.cards.map((card) => [card.id, card]))
  for (const card of data.cards) {
    const related = card.relatedIds ?? []
    if (new Set(related).size !== related.length) throw new Error('备份中存在重复的知识关联，未导入。')
    for (const id of related)
      if (
        id === card.id ||
        card.subject !== '高数' ||
        byId.get(id)?.subject !== '高数' ||
        !byId.get(id)?.relatedIds?.includes(card.id)
      )
        throw new Error('备份中的知识关联不完整，未导入。')
  }
  for (const card of data.cards)
    for (const imageId of [...card.question.images, ...card.answer.images]) {
      if (!images.has(imageId)) throw new Error('备份缺少引用的图片，未导入。')
    }
  for (const review of data.reviews)
    if (!cards.has(review.cardId)) throw new Error('备份复习记录指向不存在的内容，未导入。')
  // Every successful rating is retained. Do not accept partially exported histories.
  const byCard = new Map<string, typeof data.reviews>()
  for (const review of data.reviews) {
    const list = byCard.get(review.cardId) ?? []
    list.push(review)
    byCard.set(review.cardId, list)
  }
  for (const card of data.cards) {
    const history = (byCard.get(card.id) ?? []).sort((a, b) => a.after.reps - b.after.reps)
    if (card.schedule.reps !== history.length) throw new Error('备份复习次数与历史长度不一致，未导入。')
    history.forEach((review, index) => {
      if (
        review.before.reps !== index ||
        (index > 0 &&
          (JSON.stringify(review.before) !== JSON.stringify(history[index - 1].after) ||
            review.reviewedAt < history[index - 1].reviewedAt))
      )
        throw new Error('备份复习历史不连续，未导入。')
    })
    if (history.length && JSON.stringify(history[history.length - 1].after) !== JSON.stringify(card.schedule))
      throw new Error('备份最新调度状态与历史不一致，未导入。')
  }
  if (data.undoId) {
    if (!reviews.has(data.undoId)) throw new Error('备份撤销记录缺失，未导入。')
    const review = data.reviews.find((r) => r.id === data.undoId)!
    const card = data.cards.find((c) => c.id === review.cardId)!
    if (JSON.stringify(card.schedule) !== JSON.stringify(review.after))
      throw new Error('备份撤销状态不一致，未导入。')
  }
}
export function migratePayload(version: number, payload: unknown): unknown {
  if (version === 2) return payload
  if (version === 1 && typeof payload === 'object' && payload !== null && 'settings' in payload) {
    const old = payload as Record<string, unknown>
    if (typeof old.settings !== 'object' || old.settings === null) throw new Error('旧版备份设置无效。')
    return {
      ...old,
      settings: {
        reminderTime: DEFAULT_SETTINGS.reminderTime,
        reminderEnabled: DEFAULT_SETTINGS.reminderEnabled,
        ...old.settings,
      },
    }
  }
  throw new Error(
    `不支持备份版本 ${version}，请使用与备份匹配或更新版本的时习。当前支持版本 1–${DATA_VERSION}。`,
  )
}
export async function validateBackup(text: string): Promise<ValidBackup> {
  if (new TextEncoder().encode(text).length > MAX_BACKUP_BYTES)
    throw new Error('备份超过 200 MB，当前版本无法安全处理。原有数据未修改。')
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new Error('不是有效的 JSON 备份文件，原有数据未修改。')
  }
  const envelope = envelopeSchema.parse(raw)
  if ((await sha256(JSON.stringify(envelope.payload))) !== envelope.sha256)
    throw new Error('备份完整性校验失败，文件可能损坏或被改动。原有数据未修改。')
  const data = payloadSchema.parse(migratePayload(envelope.version, envelope.payload))
  validateReferences(data)
  for (const image of data.images) decodeImage(image)
  return data
}
export async function exportBackup(): Promise<string> {
  const data = await readAllData()
  const images: ValidBackup['images'] = []
  let estimated = 0
  for (const image of data.images) {
    estimated += Math.ceil((image.blob.size * 4) / 3)
    if (estimated > MAX_BACKUP_BYTES * 0.95)
      throw new Error('图片数据过大，完整备份将超过本版 200 MB 上限。导出未完成；请保留本浏览器数据。')
    images.push({
      id: image.id,
      name: image.name,
      width: image.width,
      height: image.height,
      mime: image.blob.type as ValidBackup['images'][number]['mime'],
      base64: await blobToBase64(image.blob),
    })
  }
  const payload = payloadSchema.parse({ ...data, images })
  validateReferences(payload)
  const result = JSON.stringify({
    app: 'shixi-study',
    version: DATA_VERSION,
    exportedAt: new Date().toISOString(),
    sha256: await sha256(JSON.stringify(payload)),
    payload,
  })
  if (new Blob([result]).size > MAX_BACKUP_BYTES)
    throw new Error('备份超过 200 MB，导出未完成。请保留本浏览器数据。')
  return result
}
export async function restoreBackup(data: ValidBackup, revision: number) {
  const valid = payloadSchema.parse(data)
  validateReferences(valid)
  const images = valid.images.map(decodeImage)
  await replaceAll({ ...valid, images }, revision)
}
