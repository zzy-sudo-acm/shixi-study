import { useDeferredValue, useState } from 'react'
import { KIND_NAMES, SUBJECTS, type Snapshot, type StudyCard } from '../core/model'
import { formatTime } from '../core/scheduler'
import { ContentView, Empty, Icon, PageHead } from './shared'

const stateNames = ['未开始', '学习中', '复习中', '重新学习']
function Item({ card, data, now }: { card: StudyCard; data: Snapshot; now: number }) {
  const [expanded, setExpanded] = useState(false),
    [answer, setAnswer] = useState(false)
  const reviews = data.reviews
    .filter((r) => r.cardId === card.id)
    .sort((a, b) => b.reviewedAt - a.reviewedAt)
    .slice(0, 8)
  const source = [
    card.book,
    card.chapter,
    card.page && `第 ${card.page} 页`,
    card.number && `题 ${card.number}`,
  ]
    .filter(Boolean)
    .join(' · ')
  const status =
    card.status === 'draft'
      ? '待整理'
      : card.schedule.state === 0
        ? '待新学'
        : card.schedule.due <= now
          ? '已到期'
          : `下次 ${formatTime(card.schedule.due)}`
  return (
    <article className="library-item">
      <button
        className="item-trigger"
        aria-expanded={expanded}
        onClick={() => {
          setExpanded((value) => !value)
          setAnswer(false)
        }}
      >
        <div className="item-meta">
          <span>{card.subject}</span>
          <span>{KIND_NAMES[card.kind]}</span>
          <span className={card.status === 'draft' ? 'draft-label' : ''}>{status}</span>
        </div>
        <h2>
          {card.question.text ||
            (card.question.images.length ? `图片题目（${card.question.images.length} 张）` : '待补充提问')}
        </h2>
        {source && <p>{source}</p>}
        <span className="expand-label">
          {expanded ? '收起' : '查看内容'}
          <span aria-hidden="true">{expanded ? '−' : '+'}</span>
        </span>
      </button>
      {expanded && (
        <div className="item-detail">
          <ContentView content={card.question} label="问题图片" />
          {!!card.tags.length && (
            <div className="tags">
              {card.tags.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
          )}
          <div className="actions">
            <button className="secondary" onClick={() => setAnswer((value) => !value)}>
              {answer ? '隐藏答案' : '显示答案'}
            </button>
            <a className="button subtle" href={`#edit/${card.id}`}>
              编辑内容
            </a>
          </div>
          {answer && (
            <section className="answer-block">
              <h3>答案与解析</h3>
              {card.answer.text || card.answer.images.length ? (
                <ContentView content={card.answer} label="答案图片" />
              ) : (
                <p className="muted">还没有答案。编辑并补充后即可加入复习。</p>
              )}
            </section>
          )}
          <details className="history">
            <summary>复习记录（{card.schedule.reps} 次）</summary>
            <p>
              {stateNames[card.schedule.state]}
              {card.schedule.state !== 0 && `，下次到期 ${formatTime(card.schedule.due)}`}。采用默认 FSRS
              参数。
            </p>
            {reviews.length ? (
              <ol>
                {reviews.map((r) => (
                  <li key={r.id}>
                    <time>{formatTime(r.reviewedAt)}</time>
                    <strong>{['', '忘了', '困难', '记得', '轻松'][r.rating]}</strong>
                    <span>下次 {formatTime(r.after.due)}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p>尚未评分。浏览内容不会影响调度。</p>
            )}
            {card.schedule.reps > 8 && <p>这里显示最近 8 次，完整记录包含在备份中。</p>}
          </details>
        </div>
      )}
    </article>
  )
}
export function Library({
  data,
  now,
  draftOnly = false,
}: {
  data: Snapshot
  now: number
  draftOnly?: boolean
}) {
  const [search, setSearch] = useState(''),
    [subject, setSubject] = useState('全部'),
    [status, setStatus] = useState(draftOnly ? 'draft' : 'all')
  const query = useDeferredValue(search).toLocaleLowerCase().trim()
  const [limit, setLimit] = useState(30)
  const cards = data.cards
    .filter(
      (c) =>
        (subject === '全部' || c.subject === subject) &&
        (status === 'all' ||
          (status === 'draft'
            ? c.status === 'draft'
            : c.status === 'ready' &&
              (status === 'new'
                ? c.schedule.state === 0
                : c.schedule.state !== 0 && c.schedule.due <= now))) &&
        (!query ||
          [c.question.text, c.answer.text, c.book, c.chapter, c.page, c.number, ...c.tags]
            .join(' ')
            .toLocaleLowerCase()
            .includes(query)),
    )
    .sort((a, b) => b.createdAt - a.createdAt)
  return (
    <>
      <PageHead
        title="我的内容"
        description={`${data.cards.length} 条内容，慢慢积累，只留下对你有用的。`}
        action={
          <a className="button primary" href="#add">
            <Icon name="add" />
            添加内容
          </a>
        }
      />
      <div className="library-filters">
        <label className="search-field">
          <span className="sr-only">搜索内容</span>
          <input
            type="search"
            placeholder="搜索问题、答案、章节或标签"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setLimit(30)
            }}
          />
        </label>
        <label>
          <span className="sr-only">筛选科目</span>
          <select
            value={subject}
            onChange={(e) => {
              setSubject(e.target.value)
              setLimit(30)
            }}
          >
            <option>全部</option>
            {SUBJECTS.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="sr-only">筛选状态</span>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value)
              setLimit(30)
            }}
          >
            <option value="all">全部状态</option>
            <option value="due">已到期</option>
            <option value="new">待新学</option>
            <option value="draft">待整理</option>
          </select>
        </label>
      </div>
      <p className="result-count">
        {cards.length} 条结果 <span>图片中的文字不会被自动识别或搜索</span>
      </p>
      {cards.length ? (
        <div className="library-list">
          {cards.slice(0, limit).map((card) => (
            <Item key={`${card.id}-${card.updatedAt}`} card={card} data={data} now={now} />
          ))}
        </div>
      ) : (
        <Empty title={data.cards.length ? '没有找到符合条件的内容' : '这里还没有内容'}>
          <p>
            {data.cards.length
              ? '换一个关键词，或试试其他筛选条件。'
              : '从一道错题或一个知识点开始，也可以先暂存截图。'}
          </p>
          <a className="button secondary" href="#add">
            添加内容
          </a>
        </Empty>
      )}
      {cards.length > limit && (
        <button className="load-more secondary" onClick={() => setLimit((n) => n + 30)}>
          再显示 30 条
        </button>
      )}
    </>
  )
}
