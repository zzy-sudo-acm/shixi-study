import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import type { KnowledgeNode, Snapshot } from '../core/model'
import { descendants, nodePath } from '../core/workspace'
import { KnowledgeTree } from './KnowledgeTree'
import { NodeDetails } from './NodeDetails'
import { Icon } from './shared'
import type { Act, Dirty } from './workspaceShared'

const KnowledgeGraph = lazy(() =>
  import('./KnowledgeGraph').then((module) => ({ default: module.KnowledgeGraph })),
)
type Editor = { mode: 'add' | 'edit' | 'move'; id?: string; parentId?: string }
type Draft = { id: string; title: string; note: string }

export function KnowledgeStudio({
  data,
  spaceId,
  view,
  selected,
  onSelect,
  onEdit,
  act,
  busy,
  setDirty,
}: {
  data: Snapshot
  spaceId: string
  view: string
  selected: string
  onSelect: (id: string) => void
  onEdit: (editor: Editor) => void
  act: Act
  busy: boolean
  setDirty: Dirty
}) {
  const [draft, setDraft] = useState<Draft | null>(null)
  const [mode, setMode] = useState(view === 'graph' ? 'graph' : 'note')
  const [reading, setReading] = useState(false)
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
    setMode(view === 'graph' ? 'graph' : 'note')
  }, [view])
  useEffect(() => {
    setDraft(null)
    setReading(false)
    setDirty(false)
  }, [selected, view, setDirty])
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
                    笔记
                    <textarea
                      aria-label="实时编辑知识内容"
                      rows={5}
                      maxLength={100000}
                      value={shown.note ?? ''}
                      onChange={(event) => update('note', event.target.value)}
                      placeholder="写下自己的理解，右侧会同步呈现。"
                    />
                  </label>
                  <div className="inline-save-actions">
                    <button className="primary" disabled={!changed || busy} type="submit">
                      {busy ? '正在保存…' : '保存修改'}
                    </button>
                    <button type="button" disabled={!changed || busy} onClick={discard}>
                      放弃修改
                    </button>
                  </div>
                </fieldset>
              </form>
            </div>
          ) : (
            <p className="studio-editor-hint">选择一个节点，在这里编辑名称与笔记。</p>
          )}
        </section>
        <section id="knowledge-preview" className="studio-preview" aria-label="知识实时呈现">
          <div className="studio-preview-heading">
            <h2>实时呈现</h2>
            <span>{changed ? '预览未保存的修改' : '与你的知识同步'}</span>
          </div>
          <div className="preview-mode-control" aria-label="呈现方式">
            {[
              ['note', '笔记预览'],
              ['graph', '图谱预览'],
              ['phone', '手机预览'],
            ].map(([key, label]) => (
              <button key={key} aria-pressed={mode === key} onClick={() => setMode(key)}>
                {label}
              </button>
            ))}
          </div>
          {mode === 'graph' ? (
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
          ) : null}
          {mode === 'phone' ? (
            <div className="phone-preview">
              <div className="phone-status">
                <span>时习</span>
                <svg width="18" height="10" viewBox="0 0 18 10" aria-hidden="true">
                  <rect x="1" y="1" width="13" height="8" rx="2" fill="none" stroke="currentColor" />
                  <rect x="3" y="3" width="9" height="4" rx="1" fill="currentColor" />
                  <path d="M16 3v4" stroke="currentColor" strokeWidth="2" />
                </svg>
              </div>
              <div className="phone-island" aria-hidden="true" />
              <div className="phone-screen">
                <p className="phone-space-name">{data.spaces.find((space) => space.id === spaceId)?.name}</p>
                {shown ? (
                  <article className="phone-note">
                    <h3>{shown.title || '未命名知识'}</h3>
                    {reading ? (
                      <p>{shown.note || '还没有笔记。可以在左侧写下自己的理解。'}</p>
                    ) : (
                      <p className="muted">点击下方按钮，阅读这个知识节点的笔记。</p>
                    )}
                    <button onClick={() => setReading((value) => !value)}>
                      {reading ? '收起笔记' : '阅读笔记'}
                      <Icon name="chevron" size={16} />
                    </button>
                  </article>
                ) : (
                  <p className="phone-empty">
                    选择左侧节点，
                    <br />
                    看看知识在手机里的样子。
                  </p>
                )}
                <div className="phone-bottom-note">
                  <Icon name="book" size={16} />
                  <span>内容随左侧编辑同步</span>
                </div>
              </div>
              <span className="phone-home-indicator" aria-hidden="true" />
            </div>
          ) : shown ? (
            <NodeDetails
              key={shown.id}
              showTools={false}
              node={shown}
              data={preview}
              act={act}
              busy={busy}
              onSelect={choose}
              onClose={() => choose('')}
              onEdit={() => edit({ mode: 'edit', id: shown.id })}
              onMove={() => edit({ mode: 'move', id: shown.id })}
              onChild={() => edit({ mode: 'add', parentId: shown.id })}
            />
          ) : mode === 'note' ? (
            <div className="studio-preview-empty">
              <svg viewBox="0 0 240 180" aria-hidden="true">
                <path d="M65 125 120 48 185 115" />
                <circle cx="65" cy="125" r="10" />
                <circle cx="120" cy="48" r="15" />
                <circle cx="185" cy="115" r="10" />
              </svg>
              <h3>{nodes.length ? '选一个节点，看看它的内容' : '你的知识，会在这里成形'}</h3>
              <p>
                左侧编辑，右侧呈现。
                <br />
                笔记、连接和手机阅读，都可以切换查看。
              </p>
            </div>
          ) : null}
        </section>
      </div>
    </>
  )
}
