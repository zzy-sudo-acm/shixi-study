import { useEffect, useRef, useState } from 'react'
import type { Grade } from 'ts-fsrs'
import { rateCard, undoReview } from '../core/db'
import {
  FACE_NAMES,
  friendlyError,
  KIND_NAMES,
  type Kind,
  type Snapshot,
  type StudyCard,
  type Subject,
} from '../core/model'
import { formatTime, intervalLabel, previewDue, queueFor } from '../core/scheduler'
import { ContentView, Empty, Icon, Notice } from './shared'

const ratingNames = ['忘了', '困难', '记得', '轻松']
const REVIEW_INSTRUCTIONS: Record<Kind, string> = {
  knowledge: '先在脑海中完整地回答。',
  exercise: '先在纸上独立做，再查看解析。',
  word: '先回忆释义与用法，再展开。',
  sentence: '先自己翻译，再展开对照。',
}
const REVEAL_NAMES: Record<Kind, string> = {
  knowledge: '显示答案',
  exercise: '显示答案',
  word: '显示释义',
  sentence: '显示翻译',
}
function ReviewFace({
  card,
  data,
  busy,
  rate,
}: {
  card: StudyCard
  data: Snapshot
  busy: boolean
  rate: (grade: Grade, duration: number) => Promise<void>
}) {
  const [revealed, setRevealed] = useState(false)
  const [previewTime, setPreviewTime] = useState(Date.now())
  const start = useRef(Date.now())
  const questionHeading = useRef<HTMLHeadingElement>(null)
  const answerHeading = useRef<HTMLHeadingElement>(null)
  const preview = revealed ? previewDue(card, previewTime, data.algorithm) : []
  function reveal() {
    setPreviewTime(Date.now())
    setRevealed(true)
  }
  useEffect(() => {
    if (revealed) {
      const heading = answerHeading.current
      heading?.focus({ preventScroll: true })
      if (
        heading &&
        (heading.getBoundingClientRect().top < 0 ||
          heading.getBoundingClientRect().top > window.innerHeight - 120)
      )
        heading.scrollIntoView({ block: 'start' })
    } else {
      questionHeading.current?.focus({ preventScroll: true })
      window.scrollTo(0, 0)
    }
  }, [revealed])
  useEffect(() => {
    function key(event: KeyboardEvent) {
      if (
        busy ||
        event.repeat ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        document.querySelector('dialog[open]') ||
        (event.target instanceof HTMLElement &&
          ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName))
      )
        return
      if (event.code === 'Space' && !revealed) {
        event.preventDefault()
        reveal()
      }
      if (revealed && /^[1-4]$/.test(event.key)) {
        event.preventDefault()
        void rate(Number(event.key) as Grade, Date.now() - start.current)
      }
    }
    document.addEventListener('keydown', key)
    return () => document.removeEventListener('keydown', key)
  })
  return (
    <>
      <article className="review-paper">
        <div className="review-meta">
          <span>{card.subject}</span>
          <span>{KIND_NAMES[card.kind]}</span>
          {!!card.category && <span>{card.category}</span>}
          <span>{card.schedule.state === 0 ? '新内容' : '到期复习'}</span>
        </div>
        <p className="review-instruction">{REVIEW_INSTRUCTIONS[card.kind]}</p>
        <h1 className="sr-only" ref={questionHeading} tabIndex={-1}>
          当前问题
        </h1>
        <ContentView content={card.question} label="问题图片" />
        {[card.book, card.chapter, card.page, card.number].some(Boolean) && (
          <p className="source-note">
            {[card.book, card.chapter, card.page && `第 ${card.page} 页`, card.number && `题 ${card.number}`]
              .filter(Boolean)
              .join(' · ')}
          </p>
        )}
        {revealed && (
          <section className="answer-block" aria-label={FACE_NAMES[card.kind].answer}>
            <h2 ref={answerHeading} tabIndex={-1}>
              {FACE_NAMES[card.kind].answer}
            </h2>
            <ContentView content={card.answer} label="答案图片" />
          </section>
        )}
      </article>
      {!revealed ? (
        <div className="reveal-area">
          <button className="primary reveal-button" onClick={reveal} disabled={busy}>
            {REVEAL_NAMES[card.kind]}
          </button>
          <p>
            想过以后，再展开。<span className="keyboard-hint">也可以按空格</span>
          </p>
        </div>
      ) : (
        <div className="rating-area">
          <p className="rating-help">
            <strong>根据看答案之前的回忆评分。</strong>
            “困难”表示不看答案仍能想起，只是费劲；看了答案才想起来，应选“忘了”。
          </p>
          <div className="rating-buttons">
            {ratingNames.map((name, index) => (
              <button
                key={name}
                className={`rating rating-${index}`}
                disabled={busy}
                onClick={() => void rate((index + 1) as Grade, Date.now() - start.current)}
              >
                <span>
                  <kbd>{index + 1}</kbd>
                  {name}
                </span>
                <small>{intervalLabel(preview[index], previewTime)}</small>
              </button>
            ))}
          </div>
          <p className="muted fine-print">
            {busy ? '正在保存评分…' : '间隔为当前预览，以点击评分时的计算结果为准。'}
          </p>
        </div>
      )}
    </>
  )
}
export function ReviewPage({
  data,
  now,
  subject,
  refresh,
}: {
  data: Snapshot
  now: number
  subject?: Subject
  refresh: () => Promise<void>
}) {
  const [chosen, setChosen] = useState<string | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [completed, setCompleted] = useState(0),
    [message, setMessage] = useState('')
  const lock = useRef(false)
  const queue = queueFor(data, now, subject)
  const candidates = [...queue.due, ...queue.availableNew]
  const card = (chosen && candidates.find((c) => c.id === chosen)) || candidates[0]
  // Keep a visible question stable while time-based queues refresh.
  useEffect(() => {
    if (card && chosen !== card.id) setChosen(card.id)
  }, [card?.id, chosen])
  async function rate(grade: Grade, duration: number) {
    if (!card || lock.current) return
    lock.current = true
    setBusy(true)
    setError('')
    try {
      const review = await rateCard(card.id, grade, Date.now(), duration, data)
      await refresh()
      setChosen(null)
      setCompleted((n) => n + 1)
      setMessage(`已记录“${ratingNames[grade - 1]}”，下次 ${formatTime(review.after.due)}。`)
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      lock.current = false
      setBusy(false)
    }
  }
  async function undo() {
    if (lock.current) return
    lock.current = true
    setBusy(true)
    setError('')
    try {
      const id = await undoReview(data)
      await refresh()
      setChosen(id)
      setCompleted((n) => Math.max(0, n - 1))
      setMessage('已撤销上次评分，调度状态和历史均已恢复。')
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      lock.current = false
      setBusy(false)
    }
  }
  return (
    <div className="review-page">
      <header className="review-top">
        <a className="button subtle" href="#today">
          退出复习
        </a>
        <span>
          {subject || '全部科目'} <span className="muted">/ 本次已回忆 {completed} 次</span>
        </span>
        <button className="subtle" disabled={!data.undoId || busy} onClick={() => void undo()}>
          <Icon name="undo" size={17} />
          撤销上次评分
        </button>
      </header>
      <div className="review-status" role="status">
        {message || '已完成的评分会立即保存在本机，可以随时退出。'}
      </div>
      {error && <Notice error>{error}</Notice>}
      {card ? (
        <>
          <div className="queue-caption">
            剩余到期 {queue.due.length} 条 · 本次可新学 {queue.availableNew.length} 条
          </div>
          <ReviewFace
            key={`${card.id}-${card.schedule.reps}`}
            card={card}
            data={data}
            busy={busy}
            rate={rate}
          />
        </>
      ) : (
        <div className="review-finish">
          <Empty title="这一轮先到这里">
            <p>当前没有可复习的内容。已完成的评分都已保存。</p>
            {queue.later.length > 0 && (
              <p>
                下一条将在 {formatTime(queue.later[0].schedule.due)} 到期。
                <br />
                页面会随时间更新，也可以稍后回来。
              </p>
            )}
            {queue.fresh.length > 0 && queue.remaining === 0 && (
              <p>今日新学额度已用完，还有 {queue.fresh.length} 条新内容等待以后学习。</p>
            )}
            <a className="button primary" href="#today">
              回到今天
            </a>
          </Empty>
        </div>
      )}
    </div>
  )
}
