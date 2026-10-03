import {
  createEmptyCard,
  fsrs,
  generatorParameters,
  type Card,
  type Grade,
  type FSRSParameters,
} from 'ts-fsrs'
import {
  type Schedule,
  type StudyCard,
  type Review,
  type Algorithm,
  type Snapshot,
  type Subject,
} from './model'

export const DEFAULT_ALGORITHM: Algorithm = {
  library: 'ts-fsrs',
  version: '5.4.2',
  parameters: JSON.parse(JSON.stringify(generatorParameters())),
}
export function serializeCard(card: Card): Schedule {
  const { due, last_review, ...rest } = card
  return { ...rest, due: due.getTime(), ...(last_review ? { last_review: last_review.getTime() } : {}) }
}
export function deserializeCard(card: Schedule): Card {
  return {
    ...card,
    due: new Date(card.due),
    last_review: card.last_review === undefined ? undefined : new Date(card.last_review),
  }
}
export function emptySchedule(now = Date.now()): Schedule {
  return serializeCard(createEmptyCard(new Date(now)))
}
export function localDay(timestamp: number): string {
  const d = new Date(timestamp)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
export function localDayBounds(now: number) {
  const d = new Date(now)
  return {
    start: new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(),
    end: new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime(),
  }
}
export function newStudiedToday(reviews: Review[], now: number): number {
  const { start, end } = localDayBounds(now)
  return new Set(
    reviews
      .filter((r) => r.before.state === 0 && r.reviewedAt >= start && r.reviewedAt < end)
      .map((r) => r.cardId),
  ).size
}
export function queueFor(snapshot: Snapshot, now: number, subject?: Subject) {
  const relevant = snapshot.cards.filter((c) => c.status === 'ready' && (!subject || c.subject === subject))
  const due = relevant
    .filter((c) => c.schedule.state !== 0 && c.schedule.due <= now)
    .sort((a, b) => a.schedule.due - b.schedule.due || a.createdAt - b.createdAt)
  const fresh = relevant
    .filter((c) => c.schedule.state === 0)
    .sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id))
  const remaining = Math.max(0, snapshot.settings.dailyNewLimit - newStudiedToday(snapshot.reviews, now))
  const later = relevant
    .filter((c) => c.schedule.state !== 0 && c.schedule.due > now)
    .sort((a, b) => a.schedule.due - b.schedule.due)
  return { due, fresh, availableNew: fresh.slice(0, remaining), later, remaining }
}
export function nextReview(
  card: StudyCard,
  rating: Grade,
  now: number,
  durationMs: number,
  algorithm: Algorithm,
): Review {
  if (card.status !== 'ready') throw new Error('待整理内容不能评分，请先补全问题和答案。')
  if (card.schedule.last_review !== undefined && now < card.schedule.last_review)
    throw new Error('设备时间早于上次复习。请校准设备时间后再评分。')
  const result = fsrs(algorithm.parameters as FSRSParameters).next(
    deserializeCard(card.schedule),
    new Date(now),
    rating,
  )
  return {
    id: crypto.randomUUID(),
    cardId: card.id,
    reviewedAt: now,
    rating,
    durationMs: Math.max(0, durationMs),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'local',
    offsetMinutes: new Date(now).getTimezoneOffset(),
    before: structuredClone(card.schedule),
    after: serializeCard(result.card),
    beforeUpdatedAt: card.updatedAt,
    log: { ...result.log, due: result.log.due.getTime(), review: result.log.review.getTime() },
    algorithm: structuredClone(algorithm),
  }
}
export function previewDue(card: StudyCard, now: number, algorithm: Algorithm): number[] {
  const result = fsrs(algorithm.parameters as FSRSParameters).repeat(
    deserializeCard(card.schedule),
    new Date(now),
  )
  return ([1, 2, 3, 4] as Grade[]).map((rating) => result[rating].card.due.getTime())
}
export function formatTime(time: number) {
  return new Date(time).toLocaleString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
export function intervalLabel(due: number, now: number) {
  const minutes = Math.max(1, Math.round((due - now) / 60000))
  if (minutes < 60) return `${minutes} 分钟后`
  if (minutes < 1440) return `约 ${Math.round(minutes / 60)} 小时后`
  return `约 ${Math.round(minutes / 1440)} 天后`
}
