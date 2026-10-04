import { useMemo, useState } from 'react'
import { addCategory, deleteCategory, renameCategory } from '../core/db'
import { allCategoryPaths, buildCategoryTree, type CategoryNode } from '../core/graph'
import {
  CATEGORY_MAX_DEPTH,
  categoryParent,
  categoryUnder,
  friendlyError,
  type Snapshot,
  type Subject,
} from '../core/model'
import { Icon, Notice } from './shared'

export function LegacyCategoryTree({
  data,
  subject,
  value,
  onSelect,
  onChanged,
  picker = false,
  onBusy,
}: {
  data: Snapshot
  subject: Subject
  value: string
  onSelect: (path: string) => void
  onChanged: () => Promise<void>
  picker?: boolean
  onBusy?: (busy: boolean) => void
}) {
  const paths = useMemo(() => allCategoryPaths(data, subject), [data.cards, data.categories, subject])
  const roots = useMemo(() => buildCategoryTree(paths), [paths])
  const counts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const card of data.cards)
      if (card.subject === subject)
        for (let path = card.category; path; path = categoryParent(path))
          counts.set(path, (counts.get(path) ?? 0) + 1)
    return counts
  }, [data.cards, subject])
  const [collapsed, setCollapsed] = useState(new Set<string>())
  const [edit, setEdit] = useState<'root' | 'child' | 'rename' | 'move' | null>(null)
  const [name, setName] = useState(''),
    [parent, setParent] = useState('')
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('')
  const [visible, setVisible] = useState(!picker || !value)
  const selected = paths.includes(value) ? value : ''
  function start(mode: NonNullable<typeof edit>) {
    setEdit(mode)
    setError('')
    setName(mode === 'rename' ? selected.split('/').at(-1)! : '')
    setParent(
      mode === 'child' ? selected : mode === 'move' || mode === 'rename' ? categoryParent(selected) : '',
    )
  }
  async function submit() {
    if (busy || !edit) return
    if (edit !== 'move' && (!name.trim() || /[/\\／]/.test(name))) {
      setError('请填写一个节点名称；层级通过选择父节点来设置。')
      return
    }
    const segment = edit === 'move' ? selected.split('/').at(-1)! : name.trim()
    const next = parent ? `${parent}/${segment}` : segment
    if (paths.includes(next) && next !== selected) {
      setError('这个位置已有同名节点，请换一个名称。')
      return
    }
    setBusy(true)
    onBusy?.(true)
    setError('')
    try {
      if (edit === 'rename' || edit === 'move') await renameCategory(subject, selected, next, data.revision)
      else await addCategory(subject, next, data.revision)
      await onChanged()
      setCollapsed((previous) => {
        const nextSet = new Set(previous)
        nextSet.delete(parent)
        return nextSet
      })
      onSelect(next)
      setEdit(null)
    } catch (error) {
      setError(friendlyError(error))
    } finally {
      setBusy(false)
      onBusy?.(false)
    }
  }
  async function remove() {
    if (!selected || busy || !window.confirm('删除此节点及子节点？其中的卡片会保留，并变为未分类。')) return
    setBusy(true)
    onBusy?.(true)
    setError('')
    try {
      await deleteCategory(subject, selected, data.revision)
      await onChanged()
      onSelect(picker ? '' : 'all')
      setEdit(null)
    } catch (error) {
      setError(friendlyError(error))
    } finally {
      setBusy(false)
      onBusy?.(false)
    }
  }
  function node(item: CategoryNode) {
    const open = !collapsed.has(item.path)
    return (
      <li key={item.path}>
        <div className="tree-row">
          {item.children.length > 0 ? (
            <button
              type="button"
              className="tree-toggle"
              aria-label={`${open ? '收起' : '展开'} ${item.path}`}
              aria-expanded={open}
              onClick={() =>
                setCollapsed((previous) => {
                  const next = new Set(previous)
                  if (open) next.add(item.path)
                  else next.delete(item.path)
                  return next
                })
              }
            >
              <Icon name="chevron" size={16} />
            </button>
          ) : (
            <span className="tree-leaf" aria-hidden="true" />
          )}
          <button
            type="button"
            className={`tree-name ${value === item.path ? 'selected' : ''}`}
            aria-pressed={value === item.path}
            onClick={() => {
              onSelect(item.path)
              setEdit(null)
              setError('')
            }}
          >
            <span>{item.name}</span>
            <small>{counts.get(item.path) ?? 0}</small>
          </button>
        </div>
        {open && item.children.length > 0 && <ul>{item.children.map(node)}</ul>}
      </li>
    )
  }
  return (
    <section
      className={`knowledge-tree ${picker ? 'tree-picker' : ''}`}
      aria-label={picker ? '选择卡片分类' : '卡片分类树'}
    >
      <div className="tree-heading">
        <Icon name="tree" />
        <h2>卡片分类</h2>
        {picker && (
          <button
            type="button"
            className="text-button"
            aria-expanded={visible}
            onClick={() => setVisible((v) => !v)}
          >
            {visible ? '收起' : '选择节点'}
          </button>
        )}
      </div>
      <p className="tree-description">
        {picker
          ? selected
            ? `所属：${selected.split('/').join(' › ')}`
            : '点选一个节点，让这张卡片找到自己的位置。'
          : '旧卡片分类独立保留；领域知识树在学习空间中。'}
      </p>
      <div hidden={!visible}>
        <fieldset disabled={busy}>
          <div className="tree-scope">
            {!picker && (
              <button
                type="button"
                aria-pressed={value === 'all'}
                onClick={() => {
                  onSelect('all')
                  setEdit(null)
                }}
              >
                全部
              </button>
            )}
            <button
              type="button"
              aria-pressed={value === '' || value === '__none__'}
              onClick={() => {
                onSelect(picker ? '' : '__none__')
                setEdit(null)
              }}
            >
              未分类
            </button>
          </div>
          {roots.length ? (
            <ul className="tree-branches">{roots.map(node)}</ul>
          ) : (
            <p className="tree-empty">还没有节点，从一个章节或概念开始。</p>
          )}
          <div className="tree-tools">
            <button type="button" className="text-button" onClick={() => start('root')}>
              <Icon name="add" size={16} />
              新建根节点
            </button>
            {selected && (
              <button
                type="button"
                className="text-button"
                disabled={selected.split('/').length >= CATEGORY_MAX_DEPTH}
                onClick={() => start('child')}
              >
                <Icon name="branch" size={16} />
                添加子节点
              </button>
            )}
          </div>
          {selected && (
            <div className="tree-selection">
              <span title={selected}>{selected.split('/').join(' › ')}</span>
              <div className="tree-tools">
                <button type="button" className="text-button" onClick={() => start('rename')}>
                  重命名
                </button>
                <button type="button" className="text-button" onClick={() => start('move')}>
                  移动节点
                </button>
                <button type="button" className="text-button" onClick={() => void remove()}>
                  删除节点
                </button>
              </div>
            </div>
          )}
          {edit && (
            <div
              className="tree-edit"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                  e.preventDefault()
                  e.stopPropagation()
                  void submit()
                }
                if (e.key === 'Escape') setEdit(null)
              }}
            >
              {edit !== 'move' && (
                <label>
                  节点名称
                  <input
                    autoFocus
                    value={name}
                    maxLength={100}
                    placeholder="例如：极限与连续"
                    onChange={(e) => setName(e.target.value)}
                  />
                </label>
              )}
              {edit === 'move' && (
                <label>
                  移动到
                  <select value={parent} onChange={(e) => setParent(e.target.value)}>
                    <option value="">根层级</option>
                    {paths
                      .filter((p) => !categoryUnder(p, selected))
                      .map((p) => (
                        <option key={p} value={p}>
                          {p.split('/').join(' › ')}
                        </option>
                      ))}
                  </select>
                </label>
              )}
              <div className="actions">
                <button type="button" className="primary small" onClick={() => void submit()}>
                  确认{edit === 'move' ? '移动' : '保存'}
                </button>
                <button type="button" className="subtle small" onClick={() => setEdit(null)}>
                  取消
                </button>
              </div>
            </div>
          )}
        </fieldset>
        {busy && (
          <p role="status" className="muted">
            正在保存节点…
          </p>
        )}
        {error && <Notice error>{error}</Notice>}
      </div>
    </section>
  )
}
