import { useState } from 'react'
import type { KnowledgeNode } from '../core/model'
import { depthOf, descendants, KNOWLEDGE_MAX_DEPTH, nodePath } from '../core/workspace'
import { FormActions, Modal, type Dirty } from './workspaceShared'

export function NodeMoveForm({
  node,
  nodes,
  onMove,
  busy,
  error,
  setDirty,
  onClose,
}: {
  node: KnowledgeNode
  nodes: KnowledgeNode[]
  onMove: (id: string, parentId: string | null) => Promise<boolean>
  busy: boolean
  error: string
  setDirty: Dirty
  onClose: () => void
}) {
  const [parent, setParent] = useState(node.parentId)
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const excluded = descendants(node.id, nodes, (n) => n.parentId)
  const originalDepth = depthOf(node.id, byId, (n) => n.parentId)
  const height = Math.max(
    ...nodes
      .filter((n) => excluded.has(n.id))
      .map((n) => depthOf(n.id, byId, (item) => item.parentId) - originalDepth + 1),
  )
  return (
    <Modal title="移动节点" busy={busy} error={error} setDirty={setDirty} onClose={onClose}>
      <p>将「{node.title}」及其子节点移动到：</p>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          void onMove(node.id, parent).then((saved) => {
            if (saved) {
              setDirty(false)
              onClose()
            }
          })
        }}
      >
        <fieldset disabled={busy}>
          <label>
            目标文件夹
            <select
              autoFocus
              value={parent ?? ''}
              onChange={(event) => setParent(event.target.value || null)}
            >
              <option value="">最外层</option>
              {nodes
                .filter(
                  (n) =>
                    !excluded.has(n.id) &&
                    depthOf(n.id, byId, (item) => item.parentId) + height <= KNOWLEDGE_MAX_DEPTH,
                )
                .map((n) => (
                  <option key={n.id} value={n.id}>
                    {nodePath(n.id, nodes).join(' / ')}
                  </option>
                ))}
            </select>
          </label>
          <FormActions busy={busy} onClose={onClose} save="确认移动" />
        </fieldset>
      </form>
    </Modal>
  )
}
