import { SUBJECTS, type Snapshot } from '../core/model'
import { formatTime, localDayBounds, newStudiedToday, queueFor } from '../core/scheduler'
import { Icon, PageHead } from './shared'

const subjectDescriptions = [
  '从一个容易忘记的条件、一种解题方法开始。',
  '补充难记词义或阅读中的具体问题，继续用墨墨背词。',
  '开始学习后，再留下需要回忆的问题。',
  '跟随学习进度，逐步积累需要回忆的内容。',
]
const subjectSymbols = ['∫', 'Aa', '01', '政']
export function Home({ data, now }: { data: Snapshot; now: number }) {
  const q = queueFor(data, now)
  const drafts = data.cards.filter((c) => c.status === 'draft').length
  const { start, end } = localDayBounds(now)
  const reviewed = data.reviews.filter((r) => r.reviewedAt >= start && r.reviewedAt < end).length
  const learned = newStudiedToday(data.reviews, now)
  const date = new Date(now)
  const reminder =
    data.settings.reminderEnabled &&
    date.getHours() * 60 + date.getMinutes() >=
      Number(data.settings.reminderTime.slice(0, 2)) * 60 + Number(data.settings.reminderTime.slice(3))
  return (
    <>
      <PageHead
        title="今天复习"
        description={date.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })}
        action={
          <a className="button secondary desktop-add" href="#add">
            <Icon name="add" />
            添加内容
          </a>
        }
      />
      <section className="today-panel" aria-labelledby="today-title">
        <div className="today-copy">
          <span className="quiet-label">{q.due.length ? '先回忆，再看答案' : '把学过的，再想一遍'}</span>
          <h2 id="today-title">
            {q.due.length ? (
              <>
                有 <em>{q.due.length}</em> 条内容，到复习的时候了。
              </>
            ) : q.availableNew.length ? (
              <>
                从今天的 <em>{q.availableNew.length}</em> 条新内容开始。
              </>
            ) : data.cards.length ? (
              '此刻没有到期的内容。'
            ) : (
              '从一个想记住的问题开始。'
            )}
          </h2>
          <p>
            {q.due.length
              ? '到期内容优先，完成后再学习新内容。随时可以停下。'
              : data.cards.length
                ? '已学内容会按实际评分安排下次复习。'
                : '把书上容易忘的条件、公式或一道错题，留给未来的自己。'}
          </p>
          <div className="actions">
            <a
              className="button primary"
              href={q.due.length + q.availableNew.length ? '#review/all' : '#add'}
            >
              {q.due.length + q.availableNew.length
                ? '开始全部复习'
                : data.cards.length
                  ? '添加内容'
                  : '添加第一条'}
              <Icon name="arrow" />
            </a>
            {!!q.availableNew.length && (
              <span className="secondary-copy">今日还可新学 {q.availableNew.length} 条</span>
            )}
          </div>
        </div>
        <div className="today-note">
          <Icon name="book" size={25} />
          <p>
            知识点，先回忆。
            <br />
            练习题，先动笔。
          </p>
          <span>答案由你主动展开</span>
        </div>
      </section>
      {reminder && q.due.length > 0 && (
        <p className="reminder" role="status">
          已到你设定的 {data.settings.reminderTime}，现在有 {q.due.length} 条内容待复习。
        </p>
      )}
      <section className="subjects" aria-labelledby="subjects-title">
        <div className="section-head">
          <h2 id="subjects-title">按科目复习</h2>
          <span>到期 / 待新学</span>
        </div>
        {SUBJECTS.map((subject, index) => {
          const queue = queueFor(data, now, subject),
            all = data.cards.filter((c) => c.subject === subject)
          return (
            <div className="subject-row" key={subject}>
              <span className={`subject-symbol subject-${index}`} aria-hidden="true">
                {subjectSymbols[index]}
              </span>
              <div className="subject-info">
                <h3>{subject}</h3>
                <p>
                  {all.length === 0
                    ? subjectDescriptions[index]
                    : `${all.length} 条内容${all.some((c) => c.status === 'draft') ? `，其中 ${all.filter((c) => c.status === 'draft').length} 条待整理` : ''}${queue.later.length ? ` · 下次 ${formatTime(queue.later[0].schedule.due)}` : ''}`}
                </p>
              </div>
              <div className="subject-count">
                <strong>{queue.due.length}</strong>
                <span>/ {queue.fresh.length}</span>
              </div>
              {queue.due.length + queue.availableNew.length > 0 ? (
                <a
                  className="button small secondary"
                  href={`#review/${subject}`}
                  aria-label={`复习${subject}`}
                >
                  复习
                  <Icon name="arrow" size={17} />
                </a>
              ) : (
                <a className="button small subtle" href={`#add/${subject}`} aria-label={`添加${subject}内容`}>
                  添加
                  <Icon name="add" size={17} />
                </a>
              )}
            </div>
          )
        })}
      </section>
      <div className="home-foot">
        <p>
          {reviewed
            ? `今天已完成 ${reviewed} 次回忆，其中新学 ${learned} 条。`
            : '每天一点回忆，让学过的内容留得久一些。'}
          <span>每日新学上限 {data.settings.dailyNewLimit} 条。</span>
        </p>
        {drafts > 0 && <a href="#library/draft">整理 {drafts} 条暂存内容</a>}
      </div>
      {q.later.length > 0 && (
        <p className="subtle-info">
          下次到期：{formatTime(q.later[0].schedule.due)}。短间隔内容会在到期后重新出现。
        </p>
      )}
    </>
  )
}
