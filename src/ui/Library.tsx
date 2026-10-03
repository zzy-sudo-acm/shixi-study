import { useDeferredValue, useState, type ReactNode } from 'react'
import { addCategory, deleteCard, deleteCategory, renameCategory, setFamiliarity } from '../core/db'
import {
  categoryParent,
  categoryPaths,
  categoryUnder,
  FACE_NAMES,
  FAMILIARITY_NAMES,
  friendlyError,
  KIND_NAMES,
  normalizeCategoryPath,
  SUBJECTS,
  type Snapshot,
  type StudyCard,
  type Subject,
} from '../core/model'
import { formatTime } from '../core/scheduler'
import { ContentView, Empty, Icon, Notice, PageHead } from './shared'

const stateNames = ['未开始', '学习中', '复习中', '重新学习']
function Item({
  card,
  data,
  now,
  onChanged,
}: {
  card: StudyCard
  data: Snapshot
  now: number
  onChanged: () => Promise<void>
}) {
  const [expanded, setExpanded] = useState(false),
    [answer, setAnswer] = useState(false)
  const reviews = data.reviews
    .filter((r) => r.cardId === card.id)
    .sort((a, b) => b.reviewedAt - a.reviewedAt)
    .slice(0, 8)
  const familiarity = card.familiarity ?? 0
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
          {!!card.category && <span>{card.category}</span>}
          <span className={card.status === 'draft' ? 'draft-label' : ''}>{status}</span>
          {familiarity > 0 && (
            <span className={`fam-badge fam-${familiarity}`}>{FAMILIARITY_NAMES[familiarity]}</span>
          )}
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
          <div className="familiarity-row">
            <span>熟悉程度</span>
            {FAMILIARITY_NAMES.map((name, level) => (
              <button
                key={name}
                type="button"
                className={`fam-option fam-${level} ${familiarity === level ? 'active' : ''}`}
                aria-pressed={familiarity === level}
                onClick={() => void setFamiliarity(card.id, level, data.revision).then(onChanged)}
              >
                {name}
              </button>
            ))}
          </div>
          <div className="actions">
            <button className="secondary" onClick={() => setAnswer((value) => !value)}>
              {answer ? '隐藏答案' : '显示答案'}
            </button>
            <a className="button subtle" href={`#edit/${card.id}`}>
              编辑内容
            </a>
            <button
              className="danger"
              onClick={() => {
                if (!window.confirm('确定删除这条内容吗？它的复习历史会一并删除，不可恢复。')) return
                void deleteCard(card.id, data.revision).then(onChanged)
              }}
            >
              删除
            </button>
          </div>
          {answer && (
            <section className="answer-block">
              <h3>{FACE_NAMES[card.kind].answer}</h3>
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
interface CategoryNode {
  path: string
  name: string
  children: CategoryNode[]
}
function buildCategoryTree(paths: string[]): CategoryNode[] {
  const roots: CategoryNode[] = []
  const byPath = new Map<string, CategoryNode>()
  for (const path of paths) {
    let parent = ''
    for (const segment of path.split('/')) {
      const full = parent ? `${parent}/${segment}` : segment
      let node = byPath.get(full)
      if (!node) {
        node = { path: full, name: segment, children: [] }
        byPath.set(full, node)
        if (parent) byPath.get(parent)!.children.push(node)
        else roots.push(node)
      }
      parent = full
    }
  }
  const sortNodes = (nodes: CategoryNode[]) => {
    nodes.sort((a, b) => a.name.localeCompare(b.name, 'zh'))
    for (const node of nodes) sortNodes(node.children)
  }
  sortNodes(roots)
  return roots
}
function CategoryTree({
  data,
  subject,
  category,
  onFilter,
  onChanged,
}: {
  data: Snapshot
  subject: Subject
  category: string
  onFilter: (value: string) => void
  onChanged: () => Promise<void>
}) {
  const [collapsed, setCollapsed] = useState<string[]>([]),
    [managing, setManaging] = useState(false),
    [editing, setEditing] = useState<{ type: 'add' | 'rename' | 'root'; path: string } | null>(null),
    [editText, setEditText] = useState(''),
    [error, setError] = useState('')
  const roots = buildCategoryTree(categoryPaths(data, subject))
  const counts = new Map<string, number>()
  for (const card of data.cards)
    if (card.subject === subject && card.category)
      for (let path = card.category; path; path = categoryParent(path))
        counts.set(path, (counts.get(path) ?? 0) + 1)
  async function submitEdit() {
    if (!editing) return
    setError('')
    try {
      if (editing.type === 'rename') {
        const from = editing.path
        await renameCategory(subject, from, editText, data.revision)
        const to = normalizeCategoryPath(editText)
        if (category !== 'all' && category !== '__none__' && categoryUnder(category, from))
          onFilter(to ? to + category.slice(from.length) : 'all')
      } else {
        await addCategory(
          subject,
          editing.type === 'add' ? `${editing.path}/${editText}` : editText,
          data.revision,
        )
      }
      setEditing(null)
      await onChanged()
    } catch (err) {
      setError(friendlyError(err))
    }
  }
  async function removeNode(path: string) {
    if (!window.confirm('删除后该分类及其子分类下的内容将变为未分类，确定删除？')) return
    setError('')
    try {
      await deleteCategory(subject, path, data.revision)
      if (category !== 'all' && category !== '__none__' && categoryUnder(category, path)) onFilter('all')
      await onChanged()
    } catch (err) {
      setError(friendlyError(err))
    }
  }
  function editRow(depth: number, rename: boolean) {
    return (
      <div className="cat-edit" style={{ paddingInlineStart: `${depth * 20 + 24}px` }}>
        <input
          aria-label={rename ? '新分类路径' : editing?.type === 'root' ? '新建顶级分类' : '新子类名称'}
          value={editText}
          maxLength={100}
          autoFocus
          placeholder={rename ? '输入新路径，可改变层级' : '分类名称'}
          onChange={(e) => setEditText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
              e.preventDefault()
              void submitEdit()
            }
            if (e.key === 'Escape') setEditing(null)
          }}
        />
        <button type="button" className="text-button" onClick={() => void submitEdit()}>
          确定
        </button>
      </div>
    )
  }
  function renderNode(node: CategoryNode, depth: number): ReactNode {
    const isCollapsed = collapsed.includes(node.path)
    return (
      <div key={node.path}>
        <div className="cat-node" style={{ paddingInlineStart: `${depth * 20}px` }}>
          {node.children.length ? (
            <button
              type="button"
              className="cat-toggle"
              aria-label={`${isCollapsed ? '展开' : '收起'} ${node.path}`}
              aria-expanded={!isCollapsed}
              onClick={() =>
                setCollapsed((list) =>
                  isCollapsed ? list.filter((p) => p !== node.path) : [...list, node.path],
                )
              }
            >
              {isCollapsed ? '▸' : '▾'}
            </button>
          ) : (
            <span className="cat-toggle" aria-hidden="true" />
          )}
          <button
            type="button"
            className={`cat-name${category === node.path ? ' cat-active' : ''}`}
            onClick={() => onFilter(category === node.path ? 'all' : node.path)}
          >
            {node.name}
          </button>
          <span className="cat-count">{counts.get(node.path) ?? 0}</span>
          {managing && (
            <span className="cat-manage">
              <button
                type="button"
                aria-label={`在 ${node.path} 下新增子类`}
                onClick={() => {
                  setEditing({ type: 'add', path: node.path })
                  setEditText('')
                }}
              >
                ＋
              </button>
              <button
                type="button"
                aria-label={`重命名 ${node.path}`}
                onClick={() => {
                  setEditing({ type: 'rename', path: node.path })
                  setEditText(node.path)
                }}
              >
                ✎
              </button>
              <button
                type="button"
                aria-label={`删除 ${node.path}`}
                onClick={() => void removeNode(node.path)}
              >
                ✕
              </button>
            </span>
          )}
        </div>
        {editing &&
          ((editing.type === 'add' && editing.path === node.path) ||
            (editing.type === 'rename' && editing.path === node.path)) &&
          editRow(depth + 1, editing.type === 'rename')}
        {!isCollapsed && node.children.map((child) => renderNode(child, depth + 1))}
      </div>
    )
  }
  return (
    <div className="cat-tree">
      <div className="cat-head">
        <button
          type="button"
          className={`cat-all${category === 'all' ? ' cat-active' : ''}`}
          onClick={() => onFilter('all')}
        >
          全部
        </button>
        <button
          type="button"
          className={`cat-none${category === '__none__' ? ' cat-active' : ''}`}
          onClick={() => onFilter('__none__')}
        >
          未分类
        </button>
        <button
          type="button"
          className="text-button cat-manage-toggle"
          aria-pressed={managing}
          onClick={() => {
            setManaging((value) => !value)
            setEditing(null)
          }}
        >
          {managing ? '完成' : '管理'}
        </button>
      </div>
      {roots.length === 0 && !managing && (
        <p className="cat-empty muted">还没有分类。录入时填写分类，或点「管理」搭建自己的知识树。</p>
      )}
      {roots.map((node) => renderNode(node, 0))}
      {managing &&
        (editing?.type === 'root' ? (
          editRow(0, false)
        ) : (
          <button
            type="button"
            className="text-button cat-add-root"
            onClick={() => {
              setEditing({ type: 'root', path: '' })
              setEditText('')
            }}
          >
            ＋ 新建顶级分类
          </button>
        ))}
      {error && <Notice error>{error}</Notice>}
    </div>
  )
}
export function Library({
  data,
  now,
  refresh,
  draftOnly = false,
}: {
  data: Snapshot
  now: number
  refresh: () => Promise<void>
  draftOnly?: boolean
}) {
  const [search, setSearch] = useState(''),
    [subject, setSubject] = useState('全部'),
    [category, setCategory] = useState('all'),
    [status, setStatus] = useState(draftOnly ? 'draft' : 'all')
  const query = useDeferredValue(search).toLocaleLowerCase().trim()
  const [limit, setLimit] = useState(30)
  const cards = data.cards
    .filter(
      (c) =>
        (subject === '全部' || c.subject === subject) &&
        (category === 'all' ||
          (category === '__none__' ? !(c.category ?? '') : categoryUnder(c.category ?? '', category))) &&
        (status === 'all' ||
          (status === 'draft'
            ? c.status === 'draft'
            : c.status === 'ready' &&
              (status === 'new'
                ? c.schedule.state === 0
                : c.schedule.state !== 0 && c.schedule.due <= now))) &&
        (!query ||
          [c.question.text, c.answer.text, c.book, c.chapter, c.category, c.page, c.number, ...c.tags]
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
              setCategory('all')
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
      {subject !== '全部' && (
        <CategoryTree
          data={data}
          subject={subject as Subject}
          category={category}
          onFilter={(value) => {
            setCategory(value)
            setLimit(30)
          }}
          onChanged={refresh}
        />
      )}
      <p className="result-count">
        {cards.length} 条结果 <span>图片中的文字不会被自动识别或搜索</span>
      </p>
      {cards.length ? (
        <div className="library-list">
          {cards.slice(0, limit).map((card) => (
            <Item
              key={`${card.id}-${card.updatedAt}`}
              card={card}
              data={data}
              now={now}
              onChanged={refresh}
            />
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
