import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react'
import { createPortal } from 'react-dom'
import type { KnowledgeNode, Snapshot } from '../core/model'
import { buildKnowledgeTree, flattenKnowledgeTree } from '../core/graph'
import { KNOWLEDGE_MAX_DEPTH } from '../core/workspace'
import { Icon } from './shared'
import type { Dirty } from './workspaceShared'

type NameEdit = { id?: string; parentId: string | null; title: string; original: string }

export function KnowledgeTree({
  data,
  spaceId,
  selected,
  onOpen,
  onSave,
  onMove,
  onDrop,
  onRemove,
  busy,
  setDirty,
}: {
  data: Snapshot
  spaceId: string
  selected: string
  onOpen: (id: string) => void
  onSave: (node: KnowledgeNode) => Promise<boolean>
  onMove: (id: string) => void
  onDrop: (id: string, parentId: string | null) => Promise<boolean>
  onRemove: (id: string) => void
  busy: boolean
  setDirty: Dirty
}) {
  const [collapsed, setCollapsed] = useState(new Set<string>())
  const [limit, setLimit] = useState(100)
  const [search, setSearch] = useState('')
  const [menu, setMenu] = useState('')
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 })
  const [edit, setEdit] = useState<NameEdit | null>(null)
  const [dragged, setDragged] = useState('')
  const [dropTarget, setDropTarget] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const popupRef = useRef<HTMLDivElement>(null)
  const nodes = useMemo(
    () => data.knowledgeNodes.filter((n) => n.spaceId === spaceId),
    [data.knowledgeNodes, spaceId],
  )
  const roots = useMemo(() => buildKnowledgeTree(nodes), [nodes])
  const rows = useMemo(
    () => flattenKnowledgeTree(roots, search.trim() ? new Set() : collapsed),
    [roots, collapsed, search],
  )
  const query = search.trim().toLocaleLowerCase()
  const filtered = rows.filter((row) => !query || row.node.title.toLocaleLowerCase().includes(query))

  useEffect(() => {
    if (!menu) return
    popupRef.current?.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true })
    function outside(event: PointerEvent) {
      if (
        !menuRef.current?.contains(event.target as Node) &&
        !popupRef.current?.contains(event.target as Node)
      )
        setMenu('')
    }
    function escape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setMenu('')
        document.getElementById(`node-menu-${menu}`)?.focus()
      }
    }
    function closeOnScroll() {
      setMenu('')
    }
    function focusOutside(event: FocusEvent) {
      if (
        !menuRef.current?.contains(event.target as Node) &&
        !popupRef.current?.contains(event.target as Node)
      )
        setMenu('')
    }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', escape)
    document.addEventListener('focusin', focusOutside)
    document.addEventListener('wheel', closeOnScroll, { passive: true })
    document.addEventListener('touchmove', closeOnScroll, { passive: true })
    window.addEventListener('resize', closeOnScroll)
    return () => {
      document.removeEventListener('pointerdown', outside)
      document.removeEventListener('keydown', escape)
      document.removeEventListener('focusin', focusOutside)
      document.removeEventListener('wheel', closeOnScroll)
      document.removeEventListener('touchmove', closeOnScroll)
      window.removeEventListener('resize', closeOnScroll)
    }
  }, [menu])

  function closeEdit() {
    if (busy || (edit?.title !== edit?.original && !window.confirm('有尚未保存的名称，确定放弃吗？')))
      return false
    setEdit(null)
    setDirty(false)
    return true
  }
  function begin(parentId: string | null, node?: KnowledgeNode) {
    if (edit && !closeEdit()) return
    setMenu('')
    setSearch('')
    if (parentId)
      setCollapsed((prev) => {
        const next = new Set(prev)
        next.delete(parentId)
        return next
      })
    setEdit({ id: node?.id, parentId, title: node?.title ?? '', original: node?.title ?? '' })
  }
  function action(callback: () => void) {
    if (edit && !closeEdit()) return
    setMenu('')
    callback()
  }
  async function saveName() {
    if (!edit || busy || !edit.title.trim()) return
    const existing = nodes.find((node) => node.id === edit.id)
    const now = Date.now()
    if (
      await onSave({
        ...existing,
        id: existing?.id ?? crypto.randomUUID(),
        spaceId,
        parentId: edit.parentId,
        title: edit.title.trim(),
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      })
    ) {
      setEdit(null)
      setDirty(false)
      setLimit((value) => Math.max(value, rows.length + 1))
    }
  }
  function nameForm() {
    return edit ? (
      <form
        className="directory-name-form"
        onSubmit={(event) => {
          event.preventDefault()
          void saveName()
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault()
            closeEdit()
          }
        }}
      >
        <Icon name="folder" size={17} />
        <input
          autoFocus
          required
          maxLength={200}
          aria-label="节点名称"
          placeholder="输入名称"
          disabled={busy}
          value={edit.title}
          onChange={(event) => {
            setEdit({ ...edit, title: event.target.value })
            setDirty(event.target.value !== edit.original)
          }}
        />
        <button
          type="submit"
          className="directory-icon-button"
          aria-label="保存名称"
          disabled={busy || !edit.title.trim()}
        >
          <Icon name="check" size={17} />
        </button>
        <button
          type="button"
          className="directory-icon-button"
          aria-label="取消名称编辑"
          disabled={busy}
          onClick={closeEdit}
        >
          <Icon name="close" size={17} />
        </button>
      </form>
    ) : null
  }
  function allowDrop(event: DragEvent, target: string) {
    if (!dragged || busy || dragged === target || edit) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    setDropTarget(target)
  }
  async function drop(event: DragEvent, parentId: string | null) {
    event.preventDefault()
    const id = event.dataTransfer.getData('application/x-knowledge-node')
    setDragged('')
    setDropTarget(null)
    if (!id || busy || edit || id === parentId) return
    if (await onDrop(id, parentId)) {
      if (parentId)
        setCollapsed((prev) => {
          const next = new Set(prev)
          next.delete(parentId)
          return next
        })
    }
  }
  return (
    <section className="knowledge-tree folder-directory" aria-label="知识树目录">
      <div className="directory-heading">
        <h2>
          <Icon name="folder" size={19} />
          目录
        </h2>
        <button
          className="directory-icon-button"
          aria-label="新建根节点"
          title="新建根节点"
          disabled={busy}
          onClick={() => begin(null)}
        >
          <Icon name="add" />
        </button>
      </div>
      {nodes.length ? (
        <input
          type="search"
          aria-label="搜索知识树"
          placeholder="搜索目录"
          value={search}
          disabled={!!edit}
          onChange={(event) => {
            setSearch(event.target.value)
            setLimit(100)
          }}
        />
      ) : null}
      {edit && !edit.id && !edit.parentId ? nameForm() : null}
      {nodes.length ? (
        <ul className="directory-list" aria-label="文件夹与节点">
          {filtered.slice(0, limit).map((row) => (
            <li key={row.node.id} style={{ paddingLeft: (row.depth - 1) * 20 }}>
              {edit?.id === row.node.id ? (
                nameForm()
              ) : (
                <div
                  className={`directory-row ${selected === row.node.id ? 'selected' : ''} ${dropTarget === row.node.id ? 'drop-target' : ''}`}
                  data-node-id={row.node.id}
                  draggable={!busy && !edit}
                  onDragStart={(event) => {
                    event.dataTransfer.setData('application/x-knowledge-node', row.node.id)
                    event.dataTransfer.effectAllowed = 'move'
                    setDragged(row.node.id)
                    setMenu('')
                  }}
                  onDragEnd={() => {
                    setDragged('')
                    setDropTarget(null)
                  }}
                  onDragOver={(event) => allowDrop(event, row.node.id)}
                  onDrop={(event) => void drop(event, row.node.id)}
                >
                  {row.children ? (
                    <button
                      className="directory-toggle"
                      aria-label={`${collapsed.has(row.node.id) ? '展开' : '收起'} ${row.node.title}`}
                      aria-expanded={!collapsed.has(row.node.id)}
                      onClick={() =>
                        setCollapsed((prev) => {
                          const next = new Set(prev)
                          if (next.has(row.node.id)) next.delete(row.node.id)
                          else next.add(row.node.id)
                          return next
                        })
                      }
                    >
                      <Icon name="chevron" size={15} />
                    </button>
                  ) : (
                    <span className="directory-leaf" aria-hidden="true" />
                  )}
                  <button
                    className="tree-name directory-name"
                    aria-label={`打开 ${row.node.title}`}
                    disabled={busy}
                    onClick={() => action(() => onOpen(row.node.id))}
                    title={row.node.title}
                  >
                    <span>{row.node.title}</span>
                  </button>
                  <div className="directory-menu-anchor" ref={menu === row.node.id ? menuRef : undefined}>
                    <button
                      id={`node-menu-${row.node.id}`}
                      className="directory-icon-button directory-more"
                      aria-label={`操作 ${row.node.title}`}
                      aria-expanded={menu === row.node.id}
                      disabled={busy || !!edit}
                      onClick={(event) => {
                        const rect = event.currentTarget.getBoundingClientRect()
                        setMenuPosition({
                          top:
                            rect.bottom + 216 <= innerHeight ? rect.bottom + 4 : Math.max(8, rect.top - 216),
                          left: Math.max(8, Math.min(innerWidth - 168, rect.right - 160)),
                        })
                        setMenu((value) => (value === row.node.id ? '' : row.node.id))
                      }}
                    >
                      <Icon name="more" size={18} />
                    </button>
                    {menu === row.node.id
                      ? createPortal(
                          <div
                            ref={popupRef}
                            className="directory-menu"
                            style={menuPosition}
                            role="group"
                            aria-label={`${row.node.title} 的操作`}
                          >
                            <button onClick={() => action(() => onOpen(row.node.id))}>打开知识点</button>
                            <button
                              disabled={row.depth >= KNOWLEDGE_MAX_DEPTH}
                              onClick={() => begin(row.node.id)}
                            >
                              添加子节点
                            </button>
                            <button onClick={() => begin(row.node.parentId, row.node)}>重命名</button>
                            <button onClick={() => action(() => onMove(row.node.id))}>移动节点</button>
                            <button
                              className="directory-delete"
                              onClick={() => action(() => onRemove(row.node.id))}
                            >
                              删除节点
                            </button>
                          </div>,
                          document.body,
                        )
                      : null}
                  </div>
                </div>
              )}
              {edit && !edit.id && edit.parentId === row.node.id ? (
                <div className="directory-new-child">{nameForm()}</div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : !edit ? (
        <p className="directory-empty">
          目录还是空的。
          <br />
          点击右上角的加号，创建第一个节点。
        </p>
      ) : null}
      {nodes.length && !filtered.length ? (
        <p className="directory-empty">没有找到节点，试试其他名称。</p>
      ) : null}
      {filtered.length > limit ? (
        <button className="text-button" onClick={() => setLimit((n) => n + 100)}>
          再显示 100 个节点
        </button>
      ) : null}
      {nodes.length ? (
        <div
          className={`directory-root-drop ${dropTarget === 'root' ? 'drop-target' : ''}`}
          onDragOver={(event) => allowDrop(event, 'root')}
          onDrop={(event) => void drop(event, null)}
        >
          {dragged ? '拖到这里，移至最外层' : `${nodes.length} 个节点`}
        </div>
      ) : null}
    </section>
  )
}
