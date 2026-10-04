import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import type { KnowledgeNode, Snapshot } from '../core/model'
import { friendlyError } from '../core/model'
import { saveImage } from '../core/db'
import { prepareImage } from '../core/images'
import { descendants, nodePath } from '../core/workspace'
import { KnowledgeTree } from './KnowledgeTree'
import { NodeRelations } from './NodeDetails'
import { Icon, Notice } from './shared'
import { Markdown } from './Markdown'
import type { Act, Dirty } from './workspaceShared'

const KnowledgeGraph = lazy(() =>
  import('./KnowledgeGraph').then((module) => ({ default: module.KnowledgeGraph })),
)
type Editor = { mode: 'add' | 'edit' | 'move'; id?: string; parentId?: string }
type Draft = { id: string; title: string; note: string }

export function KnowledgeStudio({
  data,
  spaceId,
  selected,
  onSelect,
  onEdit,
  act,
  busy,
  setDirty,
}: {
  data: Snapshot
  spaceId: string
  selected: string
  onSelect: (id: string) => void
  onEdit: (editor: Editor) => void
  act: Act
  busy: boolean
  setDirty: Dirty
}) {
  const [draft, setDraft] = useState<Draft | null>(null)
  const [imageError, setImageError] = useState('')
  const noteArea = useRef<HTMLTextAreaElement>(null)
  const imageInput = useRef<HTMLInputElement>(null)
  const nodes = data.knowledgeNodes.filter((node) => node.spaceId === spaceId)
  const active = nodes.find((node) => node.id === selected)
  const changed = !!(
    active &&
    draft?.id === active.id &&
    (draft.title !== active.title || draft.note !== (active.note ?? ''))
  )
  const shown =
    active && draft?.id === active.id ? { ...active, title: draft.title, note: draft.note } : active
  const preview = useMemo(
    () =>
      draft
        ? {
            ...data,
            knowledgeNodes: data.knowledgeNodes.map((node) =>
              node.id === draft.id ? { ...node, title: draft.title, note: draft.note } : node,
            ),
          }
        : data,
    [data, draft],
  )
  useEffect(() => {
    setDraft(null)
    setImageError('')
    setDirty(false)
  }, [selected, setDirty])
  useEffect(() => () => setDirty(false), [setDirty])

  function discard() {
    if (busy || (changed && !window.confirm('有尚未保存的编辑，确定放弃吗？'))) return false
    setDraft(null)
    setDirty(false)
    return true
  }
  function choose(id: string) {
    if (id === selected) return
    if (discard()) onSelect(id)
  }
  function edit(editor: Editor) {
    if (discard()) onEdit(editor)
  }
  function update(field: 'title' | 'note', value: string) {
    if (!active) return
    const next = { id: active.id, title: shown!.title, note: shown!.note ?? '', [field]: value }
    setDraft(next)
    setDirty(next.title !== active.title || next.note !== (active.note ?? ''))
  }
  async function save() {
    if (!active || !draft || !changed) return
    if (
      await act({
        type: 'saveNode',
        value: { ...active, title: draft.title, note: draft.note, updatedAt: Date.now() },
      })
    ) {
      setDraft(null)
      setDirty(false)
    }
  }
  async function addImage(file: File) {
    setImageError('')
    try {
      const image = await prepareImage(file)
      await saveImage(image)
      const current = shown?.note ?? ''
      const at = noteArea.current?.selectionStart ?? current.length
      const snippet = `\n![${image.name}](img:${image.id})\n`
      update('note', current.slice(0, at) + snippet + current.slice(at))
    } catch (error) {
      setImageError(friendlyError(error))
    }
  }
  async function remove(node: KnowledgeNode) {
    if (!discard()) return
    const branch = descendants(node.id, nodes, (item) => item.parentId)
    const message =
      branch.size > 1
        ? `“${node.title}”包含 ${branch.size - 1} 个子节点。删除整个分支及关联？如需保留子节点，请取消后先移动。`
        : `删除“${node.title}”及其知识、步骤关联？`
    if (window.confirm(message) && (await act({ type: 'deleteNode', id: node.id, branch: true })))
      onSelect('')
  }
  function jump(id: string) {
    document.getElementById(id)?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
      block: 'start',
    })
  }
  return (
    <>
      <div className="studio-mobile-switch">
        <button onClick={() => jump('knowledge-editor')}>前往编辑</button>
        <button onClick={() => jump('knowledge-preview')}>查看呈现</button>
      </div>
      <div className="knowledge-studio">
        <section id="knowledge-editor" className="studio-editor" aria-label="编辑知识">
          <KnowledgeTree
            data={data}
            spaceId={spaceId}
            selected={selected}
            onSelect={choose}
            onAdd={() => edit({ mode: 'add' })}
          />
          {active && shown ? (
            <div className="inline-node-editor">
              <div className="inline-editor-heading">
                <h2>编辑内容</h2>
                <span className={changed ? 'unsaved-state' : ''}>
                  {changed ? '尚未保存' : '已保存在本机'}
                </span>
              </div>
              <div className="node-tools">
                <button
                  className="text-button"
                  disabled={busy || nodePath(active.id, nodes).length >= 5}
                  onClick={() => edit({ mode: 'add', parentId: active.id })}
                >
                  <Icon name="branch" size={16} />
                  添加子节点
                </button>
                <button
                  className="text-button"
                  disabled={busy}
                  onClick={() => edit({ mode: 'edit', id: active.id })}
                >
                  编辑节点
                </button>
                <button
                  className="text-button"
                  disabled={busy}
                  onClick={() => edit({ mode: 'edit', id: active.id })}
                >
                  重命名
                </button>
                <button
                  className="text-button"
                  disabled={busy}
                  onClick={() => edit({ mode: 'move', id: active.id })}
                >
                  移动节点
                </button>
                <button className="text-button" disabled={busy} onClick={() => void remove(active)}>
                  删除节点
                </button>
              </div>
              <form
                onSubmit={(event) => {
                  event.preventDefault()
                  void save()
                }}
              >
                <fieldset disabled={busy}>
                  <label>
                    名称
                    <input
                      aria-label="实时编辑知识名称"
                      required
                      maxLength={200}
                      value={shown.title}
                      onChange={(event) => update('title', event.target.value)}
                    />
                  </label>
                  <label>
                    知识点（支持 Markdown 与图片）
                    <textarea
                      ref={noteArea}
                      aria-label="实时编辑知识内容"
                      rows={8}
                      maxLength={100000}
                      value={shown.note ?? ''}
                      onChange={(event) => update('note', event.target.value)}
                      placeholder={
                        '写下自己的理解，右侧图谱里点节点就能看到。\n支持 **加粗**、列表、$公式$、代码、链接、图片。'
                      }
                    />
                  </label>
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
                  <div className="inline-save-actions">
                    <button className="primary" disabled={!changed || busy} type="submit">
                      {busy ? '正在保存…' : '保存修改'}
                    </button>
                    <button type="button" disabled={!changed || busy} onClick={discard}>
                      放弃修改
                    </button>
                    <button
                      type="button"
                      className="text-button insert-image"
                      disabled={busy}
                      onClick={() => imageInput.current?.click()}
                    >
                      <Icon name="image" size={16} />
                      插入图片
                    </button>
                  </div>
                </fieldset>
              </form>
              {imageError ? <Notice error>{imageError}</Notice> : null}
              <NodeRelations node={active} data={data} act={act} busy={busy} onSelect={choose} />
            </div>
          ) : (
            <p className="studio-editor-hint">选择一个节点，在这里编辑名称与知识点。</p>
          )}
        </section>
        <section id="knowledge-preview" className="studio-preview" aria-label="知识图谱实时呈现">
          <div className="studio-preview-heading">
            <h2>知识图谱</h2>
            <span>{changed ? '预览未保存的修改' : '与你的知识同步'}</span>
          </div>
          <Suspense fallback={<p role="status">正在打开知识图谱…</p>}>
            <KnowledgeGraph
              embedded
              data={preview}
              spaceId={spaceId}
              selected={selected}
              onSelect={choose}
              onAdd={() => edit({ mode: 'add' })}
            />
          </Suspense>
          {shown ? (
            <article className="node-point" aria-label={`知识点 ${shown.title}`}>
              <h3>{shown.title || '未命名知识'}</h3>
              {shown.note ? (
                <Markdown text={shown.note} />
              ) : (
                <p className="muted">这个节点还没有知识点。在左侧写下自己的理解，支持 Markdown 与图片。</p>
              )}
            </article>
          ) : (
            <p className="node-point-hint">点击图谱中的节点，查看里面的知识点。</p>
          )}
        </section>
      </div>
    </>
  )
}
