import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { changeWorkspace } from '../core/db'
import { friendlyError, type Snapshot } from '../core/model'
import type { WorkspaceCommand } from '../core/workspace'
import { Icon, Notice } from './shared'

export type Act = (command: WorkspaceCommand) => Promise<boolean>
export type Dirty = (value: boolean) => void
export function useWorkspaceActions(data: Snapshot, refresh: () => Promise<void>) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('')
  const lock = useRef(false)
  const act: Act = async (command) => {
    if (lock.current) return false
    lock.current = true
    setBusy(true)
    setError('')
    try {
      await changeWorkspace(command, data.revision)
      await refresh()
      return true
    } catch (err) {
      setError(friendlyError(err))
      return false
    } finally {
      lock.current = false
      setBusy(false)
    }
  }
  return { act, busy, error }
}
export function Modal({
  title,
  children,
  onClose,
  busy,
  setDirty,
  error,
  trackChanges = true,
  hasChanges = false,
}: {
  title: string
  children: ReactNode
  onClose: () => void
  busy: boolean
  setDirty: Dirty
  error?: string
  trackChanges?: boolean
  hasChanges?: boolean
}) {
  const ref = useRef<HTMLDialogElement>(null),
    id = useId(),
    changed = useRef(false)
  useEffect(() => {
    ref.current?.showModal()
    return () => setDirty(false)
  }, [setDirty])
  function close() {
    if (busy || ((changed.current || hasChanges) && !window.confirm('有尚未保存的编辑，确定放弃吗？'))) return
    setDirty(false)
    onClose()
  }
  return (
    <dialog
      ref={ref}
      className="workspace-modal"
      aria-labelledby={id}
      onCancel={(e) => {
        e.preventDefault()
        close()
      }}
      onChangeCapture={() => {
        if (trackChanges) {
          changed.current = true
          setDirty(true)
        }
      }}
    >
      <div className="modal-head">
        <h2 id={id}>{title}</h2>
        <button type="button" aria-label="关闭对话框" disabled={busy} onClick={close}>
          <Icon name="close" />
        </button>
      </div>
      {children}
      {error ? <Notice error>{error}</Notice> : null}
    </dialog>
  )
}
export function FormActions({
  busy,
  onClose,
  save = '保存',
}: {
  busy: boolean
  onClose: () => void
  save?: string
}) {
  return (
    <div className="actions form-actions">
      <button className="primary" type="submit" disabled={busy}>
        {busy ? '正在保存…' : save}
      </button>
      <button type="button" disabled={busy} onClick={onClose}>
        取消
      </button>
    </div>
  )
}
