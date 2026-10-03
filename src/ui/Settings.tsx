import { useEffect, useRef, useState } from 'react'
import {
  exportBackup,
  MAX_BACKUP_BYTES,
  restoreBackup,
  validateBackup,
  type ValidBackup,
} from '../core/backup'
import { saveSettings } from '../core/db'
import { DATA_VERSION, friendlyError, type Settings, type Snapshot } from '../core/model'
import { localDay } from '../core/scheduler'
import { Icon, Notice, PageHead } from './shared'

export function SettingsPage({ data, refresh }: { data: Snapshot; refresh: () => Promise<void> }) {
  const [settings, setSettings] = useState<Settings>(data.settings),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [message, setMessage] = useState('')
  const [backup, setBackup] = useState<ValidBackup | null>(null),
    [confirmed, setConfirmed] = useState(false)
  const importRevision = useRef(data.revision)
  const dialog = useRef<HTMLDialogElement>(null),
    fileInput = useRef<HTMLInputElement>(null)
  const lock = useRef(false)
  useEffect(() => setSettings(data.settings), [data.settings])
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
      setSettings(backup.settings)
      dialog.current?.close()
      setBackup(null)
      setMessage('恢复完成。内容、图片、设置、历史和调度状态已全部写入本机。')
    })
  }
  return (
    <>
      <PageHead title="设置与备份" description="学习节奏由你决定，学习数据由你保管。" />
      <section className="settings-section">
        <h2>复习节奏</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void run(async () => {
              await saveSettings(settings, data.revision)
              await refresh()
              setMessage('设置已保存。')
            })
          }}
        >
          <div className="setting-row">
            <div>
              <label htmlFor="new-limit">每日新学上限</label>
              <p>四科共用，到期内容优先。设为 0 时只复习已学内容。</p>
            </div>
            <input
              id="new-limit"
              type="number"
              inputMode="numeric"
              min="0"
              max="200"
              required
              value={Number.isNaN(settings.dailyNewLimit) ? '' : settings.dailyNewLimit}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  dailyNewLimit: e.target.value === '' ? NaN : Number(e.target.value),
                }))
              }
            />
          </div>
          <div className="setting-row">
            <div>
              <label htmlFor="reminder-time">希望复习的时间</label>
              <p>按设备本地时间，在网页内提示今日到期内容。</p>
            </div>
            <input
              id="reminder-time"
              type="time"
              required
              value={settings.reminderTime}
              onChange={(e) => setSettings((s) => ({ ...s, reminderTime: e.target.value }))}
            />
          </div>
          <label className="check-label">
            <input
              type="checkbox"
              checked={settings.reminderEnabled}
              onChange={(e) => setSettings((s) => ({ ...s, reminderEnabled: e.target.checked }))}
            />
            开启应用内时间提示
          </label>
          <p className="subtle-info">
            网页关闭后不会推送通知，也不会唤醒设备。第一版不申请系统通知权限；需要准时提醒时，可使用手机闹钟。
          </p>
          <button className="secondary" disabled={busy} type="submit">
            {busy ? '处理中…' : '保存设置'}
          </button>
        </form>
      </section>
      <section className="settings-section">
        <h2>备份与恢复</h2>
        <p>完整备份包含所有图片、卡片、设置、复习历史与调度状态。建议每周备份一次，换设备前再备份一次。</p>
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
        <p className="fine-print muted">数据格式 v{DATA_VERSION} · 支持 v1 迁移 · 备份文件上限 200 MB</p>
        <div className="privacy-note">
          <strong>数据只在这个浏览器里</strong>
          <ul>
            <li>清除浏览器数据、浏览器自动回收存储或设备损坏，都可能导致内容丢失。</li>
            <li>手机与电脑不会自动同步。换设备、浏览器或网站地址，请通过备份迁移。</li>
            <li>不上传题目、笔记或备份，不加入统计追踪。备份未加密，请妥善保管。</li>
          </ul>
        </div>
      </section>
      <section className="settings-section algorithm-note">
        <h2>复习如何安排</h2>
        <p>
          使用 ts-fsrs 5.4.2 的默认参数，目标保留率参数为
          90%。这是调度目标，不是你的掌握率，也没有拟合个人遗忘曲线。每次评分都会更新这条内容的实际状态，并保留历史用于未来优化。
        </p>
        <p>
          “困难”表示不用看答案也能想起。看过答案才想起来，请选“忘了”。漏学不会清空进度，到期内容会一直保留。
        </p>
        <p>
          <a href="https://open-spaced-repetition.github.io/ts-fsrs/" target="_blank" rel="noreferrer">
            查看 FSRS 实现文档
          </a>
        </p>
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
              备份校验通过：{backup.cards.length} 条内容、{backup.images.length} 张图片、
              {backup.reviews.length} 次复习。
            </p>
            <p>
              恢复后，当前浏览器的{' '}
              <strong>
                {data.cards.length} 条内容和 {data.reviews.length} 次复习
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
