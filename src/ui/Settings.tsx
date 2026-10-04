import { useRef, useState } from 'react'
import {
  exportBackup,
  MAX_BACKUP_BYTES,
  restoreBackup,
  validateBackup,
  type ValidBackup,
} from '../core/backup'
import { DATA_VERSION, friendlyError, type Snapshot } from '../core/model'
import { localDay } from '../core/scheduler'
import { Icon, Notice, PageHead } from './shared'

export function SettingsPage({ data, refresh }: { data: Snapshot; refresh: () => Promise<void> }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [message, setMessage] = useState('')
  const [backup, setBackup] = useState<ValidBackup | null>(null),
    [confirmed, setConfirmed] = useState(false)
  const importRevision = useRef(data.revision)
  const dialog = useRef<HTMLDialogElement>(null),
    fileInput = useRef<HTMLInputElement>(null)
  const lock = useRef(false)
  async function run(action: () => Promise<void>) {
    if (lock.current) return
    lock.current = true
    setBusy(true)
    setError('')
    setMessage('')
    try {
      await action()
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      lock.current = false
      setBusy(false)
    }
  }
  async function download() {
    const contents = await exportBackup()
    const url = URL.createObjectURL(new Blob([contents], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `shixi-backup-${localDay(Date.now())}-${Date.now()}.json`
    document.body.append(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 60000)
    setMessage('备份文件已生成并交给浏览器下载。请检查下载文件是否已保存；浏览器无法确认磁盘写入结果。')
  }
  async function inspect(file: File) {
    await run(async () => {
      if (file.size > MAX_BACKUP_BYTES) throw new Error('文件超过 200 MB，无法导入。原有数据未修改。')
      const result = await validateBackup(await file.text())
      setBackup(result)
      setConfirmed(false)
      importRevision.current = data.revision
      dialog.current?.showModal()
    })
  }
  async function restore() {
    if (!backup || !confirmed) return
    await run(async () => {
      await restoreBackup(backup, importRevision.current)
      await refresh()
      dialog.current?.close()
      setBackup(null)
      setMessage('恢复完成。内容、图片、设置、历史和调度状态已全部写入本机。')
    })
  }
  return (
    <>
      <PageHead title="设置与备份" description="学习数据由你保管。" />
      <section className="settings-section">
        <h2>备份与恢复</h2>
        <p>
          完整备份包含领域、目标、步骤、知识节点和关联，以及图片、卡片、设置、复习历史与调度状态。换设备前记得备份。
        </p>
        <div className="backup-actions">
          <button className="primary" disabled={busy} onClick={() => void run(download)}>
            <Icon name="download" />
            {busy ? '处理中…' : '导出完整备份'}
          </button>
          <button className="secondary" disabled={busy} onClick={() => fileInput.current?.click()}>
            从备份恢复
          </button>
        </div>
        <input
          type="file"
          className="sr-only"
          aria-label="选择备份文件"
          ref={fileInput}
          accept=".json,application/json"
          tabIndex={-1}
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void inspect(file)
            e.target.value = ''
          }}
        />
        <p className="fine-print muted">数据格式 v{DATA_VERSION} · 支持 v1 / v2 迁移 · 备份文件上限 200 MB</p>
        <div className="privacy-note">
          <strong>数据只在这个浏览器里</strong>
          <ul>
            <li>清除浏览器数据、浏览器自动回收存储或设备损坏，都可能导致内容丢失。</li>
            <li>手机与电脑不会自动同步。换设备、浏览器或网站地址，请通过备份迁移。</li>
            <li>不上传题目、笔记或备份，不加入统计追踪。备份未加密，请妥善保管。</li>
          </ul>
        </div>
      </section>
      {message && !backup && <Notice>{message}</Notice>}
      {error && !backup && <Notice error>{error}</Notice>}
      <dialog
        className="confirm-modal"
        ref={dialog}
        aria-labelledby="restore-title"
        onCancel={(e) => {
          if (busy) e.preventDefault()
        }}
      >
        <h2 id="restore-title">覆盖恢复本机数据？</h2>
        {backup && (
          <>
            <p>
              备份校验通过：{backup.spaces.length} 个领域、{backup.goals.length} 个目标、{backup.steps.length}{' '}
              个步骤、{backup.knowledgeNodes.length} 个知识节点，{backup.knowledgeRelations.length}{' '}
              条知识关系、{backup.stepKnowledgeLinks.length} 条步骤关联，以及 {backup.cards.length} 条内容、
              {backup.images.length} 张图片、{backup.reviews.length} 次复习。
            </p>
            <p>
              恢复后，当前浏览器的{' '}
              <strong>
                {data.spaces.length} 个领域及其全部目标、步骤、知识节点和关联，以及 {data.cards.length}{' '}
                条内容和 {data.reviews.length} 次复习
              </strong>
              将被替换。此操作不会合并两份数据。
            </p>
          </>
        )}
        <button className="secondary" disabled={busy} onClick={() => void run(download)}>
          <Icon name="download" />
          先导出现有数据
        </button>
        <label className="check-label restore-check">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            disabled={busy}
          />
          我已保存需要的备份，确认覆盖当前数据
        </label>
        {backup && error && <Notice error>{error}</Notice>}
        {backup && message && <Notice>{message}</Notice>}
        <div className="actions">
          <button className="danger" disabled={!confirmed || busy} onClick={() => void restore()}>
            {busy ? '正在恢复…' : '确认覆盖恢复'}
          </button>
          <button
            disabled={busy}
            onClick={() => {
              dialog.current?.close()
              setBackup(null)
              setError('')
            }}
          >
            取消
          </button>
        </div>
      </dialog>
    </>
  )
}
