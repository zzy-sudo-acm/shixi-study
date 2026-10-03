import { useEffect, useMemo, useRef, useState } from 'react'
import { allCategoryPaths } from '../core/graph'
import { categoryParent, FAMILIARITY_NAMES, type Snapshot, type StudyCard } from '../core/model'
import { ContentView, Icon } from './shared'

type Node = {
  id: string
  label: string
  parent: string
  x: number
  y: number
  card?: StudyCard
  path?: string
}
export function KnowledgeGraph({
  data,
  cards,
  category,
  onCategory,
}: {
  data: Snapshot
  cards: StudyCard[]
  category: string
  onCategory: (path: string) => void
}) {
  const [selected, setSelected] = useState(''),
    [answer, setAnswer] = useState(false),
    [scale, setScale] = useState(1)
  const [limit, setLimit] = useState(80)
  const viewport = useRef<HTMLDivElement>(null)
  const [compact, setCompact] = useState(() => window.matchMedia('(max-width: 640px)').matches)
  useEffect(() => {
    const media = window.matchMedia('(max-width: 640px)')
    const update = () => setCompact(media.matches)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  const graph = useMemo(() => {
    const nodes: Node[] = [{ id: 'root', label: '我的数学', parent: '', x: 24, y: 0 }]
    const paths = allCategoryPaths(data, '高数')
    for (const path of paths)
      nodes.push({
        id: `cat:${path}`,
        label: path.split('/').at(-1)!,
        path,
        parent: categoryParent(path) ? `cat:${categoryParent(path)}` : 'root',
        x: 24 + path.split('/').length * 230,
        y: 0,
      })
    if (cards.some((c) => !c.category))
      nodes.push({ id: 'none', label: '未分类', path: '__none__', parent: 'root', x: 254, y: 0 })
    for (const card of cards.slice(0, limit))
      nodes.push({
        id: card.id,
        label: card.question.text || '图片知识卡片',
        card,
        parent: card.category ? `cat:${card.category}` : 'none',
        x: 24 + ((card.category?.split('/').length || 1) + 1) * 230,
        y: 0,
      })
    const children = new Map<string, Node[]>()
    for (const node of nodes) {
      const list = children.get(node.parent) ?? []
      list.push(node)
      children.set(node.parent, list)
    }
    let cursor = 24
    function position(node: Node) {
      const branch = children.get(node.id) ?? []
      if (compact) {
        node.x = 16 + Math.round((node.x - 24) / 230) * 14
        node.y = cursor
        cursor += 100
        branch.forEach(position)
        return
      }
      if (!branch.length) {
        node.y = cursor
        cursor += 100
        return
      }
      branch.forEach(position)
      node.y = (branch[0].y + branch[branch.length - 1].y) / 2
    }
    position(nodes[0])
    const byId = new Map(nodes.map((node) => [node.id, node]))
    const relations: [Node, Node][] = []
    for (const node of nodes)
      for (const id of node.card?.relatedIds ?? []) {
        const other = byId.get(id)
        if (other && node.id < other.id) relations.push([node, other])
      }
    return {
      nodes,
      byId,
      relations,
      width: Math.max(compact ? 270 : 700, ...nodes.map((n) => n.x + (compact ? 208 : 250))),
      height: Math.max(320, cursor + 20),
    }
  }, [data.cards, data.categories, cards, limit, compact])
  useEffect(() => {
    if (viewport.current) setScale(Math.min(1, Math.max(0.6, viewport.current.clientWidth / graph.width)))
  }, [graph.width, compact])
  const active = data.cards.find((card) => card.id === selected && card.subject === '高数')
  const connected = useMemo(() => new Set(active?.relatedIds ?? []), [active])
  function focusCard(card: StudyCard) {
    setSelected(card.id)
    setAnswer(false)
  }
  return (
    <section className="knowledge-graph" aria-label="数学知识图谱">
      <div className="graph-toolbar">
        <div>
          <h2>让知识连成图</h2>
          <p>实线是归属，虚线是关联。点击卡片展开内容。</p>
        </div>
        <div className="graph-zoom" aria-label="图谱缩放">
          <button
            type="button"
            onClick={() => {
              if (viewport.current) {
                setScale(Math.min(1, viewport.current.clientWidth / graph.width))
                viewport.current.scrollTo({ top: 0, left: 0, behavior: 'instant' })
              }
            }}
          >
            总览
          </button>
          <button
            type="button"
            aria-label="缩小图谱"
            disabled={scale <= 0.6}
            onClick={() => setScale((s) => Math.max(0.6, s - 0.2))}
          >
            −
          </button>
          <button type="button" aria-label="重置图谱缩放" onClick={() => setScale(1)}>
            {Math.round(scale * 100)}%
          </button>
          <button
            type="button"
            aria-label="放大图谱"
            disabled={scale >= 1.4}
            onClick={() => setScale((s) => Math.min(1.4, s + 0.2))}
          >
            +
          </button>
        </div>
      </div>
      <div
        ref={viewport}
        className="graph-scroll"
        tabIndex={0}
        role="region"
        aria-label="知识图谱画布，可横向和纵向滚动"
      >
        <div style={{ width: graph.width * scale, height: graph.height * scale }}>
          <div
            className="graph-canvas"
            style={{ width: graph.width, height: graph.height, transform: `scale(${scale})` }}
          >
            <svg width={graph.width} height={graph.height} className="graph-lines" aria-hidden="true">
              {graph.nodes
                .filter((n) => n.parent)
                .map((node) => {
                  const parent = graph.byId.get(node.parent)!
                  return (
                    <path
                      key={node.id}
                      d={
                        compact
                          ? `M${parent.x + 7},${parent.y + 80} V${node.y + 40} H${node.x}`
                          : `M${parent.x + 184},${parent.y + 40} C${parent.x + 210},${parent.y + 40} ${node.x - 28},${node.y + 40} ${node.x},${node.y + 40}`
                      }
                    />
                  )
                })}
              {graph.relations.map(([a, b]) => (
                <path
                  className={`graph-relation ${selected === a.id || selected === b.id ? 'highlighted' : ''}`}
                  key={`${a.id}:${b.id}`}
                  d={`M${a.x + 184},${a.y + 40} C${Math.max(a.x, b.x) + (compact ? 208 : 250)},${a.y + 40} ${Math.max(a.x, b.x) + (compact ? 208 : 250)},${b.y + 40} ${b.x + 184},${b.y + 40}`}
                />
              ))}
            </svg>
            {graph.nodes.map((node) => (
              <button
                type="button"
                key={node.id}
                className={`graph-node ${node.card ? 'graph-card' : 'graph-category'} ${node.id === 'root' ? 'graph-root' : ''} ${node.id === selected || node.path === category ? 'selected' : ''} ${connected.has(node.id) ? 'connected' : ''}`}
                style={{ left: node.x, top: node.y }}
                title={node.label}
                aria-pressed={node.card ? selected === node.id : category === (node.path ?? 'all')}
                onClick={() => (node.card ? focusCard(node.card) : onCategory(node.path ?? 'all'))}
              >
                <span>{node.label}</span>
                <small>
                  {node.card
                    ? FAMILIARITY_NAMES[node.card.familiarity ?? 0]
                    : node.id === 'root'
                      ? '知识族谱'
                      : '知识分支'}
                </small>
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="graph-caption">
        <span>拖动滚动条或滑动画布，查看不同分支。</span>
        <span>{graph.relations.length} 条可见关联</span>
      </div>
      {cards.length > limit && (
        <button type="button" className="text-button" onClick={() => setLimit((n) => n + 80)}>
          再展开 80 张卡片（共 {cards.length} 张，可先筛选分支）
        </button>
      )}
      {active && (
        <div className="graph-inspector" key={active.id}>
          <div className="section-head">
            <h3>知识卡片</h3>
            <button
              type="button"
              className="subtle small"
              aria-label="关闭卡片详情"
              onClick={() => setSelected('')}
            >
              <Icon name="close" />
            </button>
          </div>
          <ContentView content={active.question} label="问题图片" />
          <div className="actions">
            <button type="button" className="secondary" onClick={() => setAnswer((v) => !v)}>
              {answer ? '隐藏答案' : '显示答案'}
            </button>
            <a className="button subtle" href={`#edit/${active.id}`}>
              编辑内容与关联
            </a>
          </div>
          {answer && (
            <div className="answer-block">
              <ContentView content={active.answer} label="答案图片" />
            </div>
          )}
          <div className="related-links">
            {data.cards
              .filter((c) => connected.has(c.id))
              .map((card) => (
                <button
                  type="button"
                  className="text-button"
                  key={card.id}
                  onClick={() => {
                    if (cards.some((c) => c.id === card.id)) focusCard(card)
                    else {
                      onCategory('all')
                      focusCard(card)
                    }
                  }}
                >
                  <Icon name="link" size={16} />
                  {card.question.text || '图片知识卡片'}
                </button>
              ))}
          </div>
        </div>
      )}
      {data.cards.every((card) => card.subject !== '高数') && (
        <p className="graph-empty">先在知识树上创建分支，再添加第一张卡片。关联会随你的积累逐渐生长。</p>
      )}
    </section>
  )
}

export function RelationPicker({
  data,
  card,
  onChange,
}: {
  data: Snapshot
  card: StudyCard
  onChange: (ids: string[]) => void
}) {
  const [search, setSearch] = useState('')
  const ids = card.relatedIds ?? []
  const choices = useMemo(
    () => data.cards.filter((c) => c.subject === '高数' && c.id !== card.id),
    [data.cards, card.id],
  )
  const results = choices.filter(
    (c) =>
      !ids.includes(c.id) &&
      (!search ||
        `${c.question.text} ${c.category}`.toLocaleLowerCase().includes(search.toLocaleLowerCase())),
  )
  return (
    <section className="relation-picker" aria-label="关联数学知识">
      <div className="field-head">
        <h3>
          <Icon name="link" size={18} />
          关联已有知识
        </h3>
        <span className="muted">{ids.length} / 100</span>
      </div>
      <p>把前置概念、相关公式或练习连起来，图谱中会出现连接线。</p>
      {ids.length > 0 && (
        <div className="relation-selected">
          {ids.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => onChange(ids.filter((value) => value !== id))}
              aria-label={`取消关联 ${choices.find((c) => c.id === id)?.question.text || '已失效内容'}`}
            >
              <span>{choices.find((c) => c.id === id)?.question.text || '已失效内容'}</span>
              <Icon name="close" size={15} />
            </button>
          ))}
        </div>
      )}
      <input
        type="search"
        aria-label="搜索可关联的知识"
        placeholder="搜索知识点、公式或所属节点"
        value={search}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.preventDefault()
        }}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="relation-results">
        {results.slice(0, 8).map((other) => (
          <button
            key={other.id}
            type="button"
            disabled={ids.length >= 100}
            onClick={() => {
              onChange([...ids, other.id])
              setSearch('')
            }}
          >
            <Icon name="add" size={16} />
            <span>
              {other.question.text || '图片知识卡片'}
              <small>{other.category?.split('/').join(' › ') || '未分类'}</small>
            </span>
          </button>
        ))}
      </div>
      {!results.length && (
        <p className="muted">
          {choices.length
            ? '没有更多匹配的知识，可以换个关键词。'
            : '保存更多数学内容后，就可以在这里建立关联。'}
        </p>
      )}
      {results.length > 8 && <p className="muted">还有 {results.length - 8} 条，输入关键词缩小范围。</p>}
    </section>
  )
}
