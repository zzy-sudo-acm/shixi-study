import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import type { KnowledgeNode, Snapshot } from '../core/model'
import { friendlyError } from '../core/model'
import { saveImage } from '../core/db'
import { prepareImage } from '../core/images'
import { descendants, nodePath } from '../core/workspace'
import { KnowledgeTree } from './KnowledgeTree'
import { NodeMoveForm } from './NodeDetails'
import { Icon, Notice } from './shared'
import { Markdown } from './Markdown'
import type { Act, Dirty } from './workspaceShared'

const KnowledgeGraph = lazy(() =>
  import('./KnowledgeGraph').then((module) => ({ default: module.KnowledgeGraph })),
)
type Draft = { id: string; note: string }

export function KnowledgeStudio({
  data,
  spaceId,
  selected,
  onSelect,
  initialNode,
  act,
  busy,
  error,
  setDirty,
}: {
  data: Snapshot
  spaceId: string
  selected: string
  onSelect: (id: string) => void
  initialNode?: string
  act: Act
  busy: boolean
  error: string
  setDirty: Dirty
}) {
  const [writing, setWriting] = useState(!!initialNode)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [moving, setMoving] = useState('')
  const [imageError, setImageError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [directoryChanged, setDirectoryChanged] = useState(false)
  const trackDirectory = useCallback(
    (value: boolean) => {
      setDirectoryChanged(value)
      setDirty(value)
    },
    [setDirty],
  )
  const noteArea = useRef<HTMLTextAreaElement>(null)
  const imageInput = useRef<HTMLInputElement>(null)
  const draftRef = useRef(draft)
  const imageLock = useRef(false)
  const mounted = useRef(true)
  const nodes = data.knowledgeNodes.filter((node) => node.spaceId === spaceId)
  const active = nodes.find((node) => node.id === selected)
  const editing = writing && !!active
  const note = active && draft?.id === active.id ? draft.note : (active?.note ?? '')
  const changed = !!(active && draft?.id === active.id && draft.note !== (active.note ?? ''))
  const moveNode = nodes.find((node) => node.id === moving)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      setDirty(false)
    }
  }, [setDirty])
  useEffect(() => {
    setWriting(!!initialNode)
    setDraft(null)
    draftRef.current = null
    setImageError('')
    setDirty(false)
  }, [initialNode, setDirty])

  function resetDraft() {
    setDraft(null)
    draftRef.current = null
    setImageError('')
    setDirty(false)
  }
  function open(id: string) {
    if (busy || imageLock.current) return
    resetDraft()
    onSelect(id)
    setWriting(true)
  }
  function back() {
    if (busy || imageLock.current || (changed && !window.confirm('有尚未保存的编辑，确定放弃并返回目录吗？')))
      return
    resetDraft()
    setWriting(false)
  }
  function update(value: string) {
    if (!active) return
    const next = { id: active.id, note: value }
    draftRef.current = next
    setDraft(next)
    setDirty(value !== (active.note ?? ''))
  }
  async function save() {
    if (!active || !draft || !changed || imageLock.current) return
    if (await act({ type: 'saveNode', value: { ...active, note: draft.note, updatedAt: Date.now() } }))
      resetDraft()
  }
  function discard() {
    if (busy || imageLock.current || (changed && !window.confirm('有尚未保存的编辑，确定放弃吗？'))) return
    resetDraft()
  }
  async function saveNode(node: KnowledgeNode) {
    const saved = await act({ type: 'saveNode', value: node })
    if (saved) onSelect(node.id)
    return saved
  }
  async function move(id: string, parentId: string | null) {
    const node = nodes.find((item) => item.id === id)
    if (!node) return false
    if (node.parentId === parentId) return true
    return act({ type: 'saveNode', value: { ...node, parentId, updatedAt: Date.now() } })
  }
  async function remove(id: string) {
    const node = nodes.find((item) => item.id === id)
    if (!node || busy) return
    const branch = descendants(id, nodes, (item) => item.parentId)
    const message =
      branch.size > 1
        ? `删除「${node.title}」及其 ${branch.size - 1} 个子节点？其中的知识点和关联也会删除。此操作无法撤销。`
        : `删除「${node.title}」及其中的知识点？此操作无法撤销。`
    if (window.confirm(message) && (await act({ type: 'deleteNode', id, branch: true }))) {
      if (branch.has(selected)) onSelect('')
    }
  }
  async function addImage(file: File) {
    if (!active || imageLock.current || busy) return
    imageLock.current = true
    setUploading(true)
    setDirty(true)
    setImageError('')
    const current = draftRef.current?.id === active.id ? draftRef.current.note : (active.note ?? '')
    const start = noteArea.current?.selectionStart ?? current.length
    const end = noteArea.current?.selectionEnd ?? start
    try {
      const image = await prepareImage(file)
      await saveImage(image)
      if (!mounted.current) return
      const name = image.name.replace(/[\[\]\\\r\n]/g, '_')
      const snippet = `\n![${name}](img:${image.id})\n`
      update(current.slice(0, start) + snippet + current.slice(end))
      requestAnimationFrame(() => {
        noteArea.current?.focus()
        noteArea.current?.setSelectionRange(start + snippet.length, start + snippet.length)
      })
    } catch (cause) {
      if (mounted.current) {
        setImageError(friendlyError(cause))
        setDirty(changed)
      }
    } finally {
      imageLock.current = false
      if (mounted.current) setUploading(false)
    }
  }

  return (
    <>
      <div className="studio-mobile-switch" aria-label="工作区视图">
        <a
          className="button"
          href="#knowledge-editor"
          onClick={(event) => {
            event.preventDefault()
            document.getElementById('knowledge-editor')?.scrollIntoView({ block: 'start' })
          }}
        >
          {editing ? '编辑' : '目录'}
        </a>
        <a
          className="button"
          href="#knowledge-preview"
          onClick={(event) => {
            event.preventDefault()
            document.getElementById('knowledge-preview')?.scrollIntoView({ block: 'start' })
          }}
        >
          {editing ? '预览' : '节点图'}
        </a>
      </div>
      {editing ? (
        <div className="document-toolbar">
          <button className="text-button" onClick={back} disabled={busy || uploading}>
            <Icon name="chevron" size={16} />
            返回目录
          </button>
          <span className="document-path" title={nodePath(active.id, nodes).join(' / ')}>
            {nodePath(active.id, nodes).join(' / ')}
          </span>
          <span className={changed ? 'unsaved-state' : ''} role="status">
            {uploading ? '正在插入图片…' : changed ? '尚未保存' : '已保存在本机'}
          </span>
        </div>
      ) : null}
      <div className={`knowledge-studio ${editing ? 'writing-mode' : 'directory-mode'}`}>
        <section
          id="knowledge-editor"
          className="studio-editor"
          aria-label={editing ? '编辑知识' : '知识树目录工作区'}
        >
          <div hidden={editing}>
            <KnowledgeTree
              data={data}
              spaceId={spaceId}
              selected={selected}
              onOpen={open}
              onSave={saveNode}
              onMove={setMoving}
              onDrop={move}
              onRemove={(id) => void remove(id)}
              busy={busy}
              setDirty={trackDirectory}
            />
          </div>
          {editing ? (
            <form
              className="document-editor"
              onSubmit={(event) => {
                event.preventDefault()
                void save()
              }}
            >
              <div className="document-pane-heading">
                <h2>Markdown</h2>
                <span>支持 Markdown 与图片</span>
              </div>
              <fieldset disabled={busy || uploading}>
                <textarea
                  autoFocus
                  ref={noteArea}
                  aria-label="实时编辑知识内容"
                  maxLength={100000}
                  value={note}
                  onChange={(event) => update(event.target.value)}
                  onPaste={(event) => {
                    const file = Array.from(event.clipboardData.files).find((item) =>
                      item.type.startsWith('image/'),
                    )
                    if (file) {
                      event.preventDefault()
                      void addImage(file)
                    }
                  }}
                  onDragOver={(event) => {
                    if (event.dataTransfer.types.includes('Files')) event.preventDefault()
                  }}
                  onDrop={(event) => {
                    const file = event.dataTransfer.files[0]
                    if (file) {
                      event.preventDefault()
                      void addImage(file)
                    }
                  }}
                  onKeyDown={(event) => {
                    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
                      event.preventDefault()
                      void save()
                    }
                  }}
                  placeholder="从这里写下你的知识点…"
                />
                <input
                  ref={imageInput}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  hidden
                  aria-hidden="true"
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (file) void addImage(file)
                    event.target.value = ''
                  }}
                />
                <div className="document-actions">
                  <button className="primary" disabled={!changed || busy || uploading} type="submit">
                    {busy ? '正在保存…' : '保存修改'}
                  </button>
                  <button type="button" disabled={!changed || busy || uploading} onClick={discard}>
                    放弃修改
                  </button>
                  <button
                    type="button"
                    className="text-button insert-image"
                    disabled={busy || uploading}
                    onClick={() => imageInput.current?.click()}
                  >
                    <Icon name="image" size={17} />
                    插入图片
                  </button>
                </div>
              </fieldset>
              {imageError ? <Notice error>{imageError}</Notice> : null}
            </form>
          ) : null}
        </section>
        <section
          id="knowledge-preview"
          className="studio-preview"
          aria-label={editing ? 'Markdown 实时预览' : '知识节点图'}
        >
          {editing ? (
            <>
              <div className="document-pane-heading">
                <h2>预览</h2>
                <span>实时更新</span>
              </div>
              <article className="document-preview node-point" aria-label={`知识点 ${active.title}`}>
                <h3>{active.title}</h3>
                {note ? (
                  <Markdown text={note} />
                ) : (
                  <p className="document-preview-empty">写下第一段知识，预览会显示在这里。</p>
                )}
              </article>
            </>
          ) : (
            <>
              <div className="studio-preview-heading">
                <h2>节点图</h2>
                <span>与目录同步</span>
              </div>
              <Suspense fallback={<p role="status">正在打开节点图…</p>}>
                <KnowledgeGraph
                  caption="点击节点，打开知识点。"
                  rootTitle={data.spaces.find((space) => space.id === spaceId)?.name}
                  disabled={busy || directoryChanged}
                  data={data}
                  spaceId={spaceId}
                  selected={selected}
                  onSelect={open}
                />
              </Suspense>
            </>
          )}
        </section>
      </div>
      {moveNode ? (
        <NodeMoveForm
          key={moveNode.id}
          node={moveNode}
          nodes={nodes}
          onMove={move}
          busy={busy}
          error={error}
          setDirty={setDirty}
          onClose={() => {
            setMoving('')
            setDirty(false)
          }}
        />
      ) : null}
    </>
  )
}
