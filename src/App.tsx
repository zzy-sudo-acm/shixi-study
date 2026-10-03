import { Component, useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { DB_NAME, readSnapshot } from './core/db'
import { friendlyError, SUBJECTS, type Snapshot, type Subject } from './core/model'
import { Home } from './ui/Home'
import { Editor } from './ui/Editor'
import { Library } from './ui/Library'
import { ReviewPage } from './ui/Review'
import { SettingsPage } from './ui/Settings'
import { Icon, Notice, type IconName } from './ui/shared'

export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? (
      <main className="fatal">
        <h1>页面暂时无法显示</h1>
        <p>已有本地数据不会因此被清除。请重新加载页面；如果仍有问题，请保留浏览器数据。</p>
        <button onClick={() => location.reload()}>重新加载</button>
      </main>
    ) : (
      this.props.children
    )
  }
}
function routeValue() {
  try {
    return decodeURIComponent(location.hash.slice(1)) || 'today'
  } catch {
    return 'today'
  }
}
export default function App() {
  const [data, setData] = useState<Snapshot | null>(null),
    [fatal, setFatal] = useState(''),
    [route, setRoute] = useState(routeValue),
    [now, setNow] = useState(Date.now()),
    [external, setExternal] = useState(false)
  const dirty = useRef(false),
    previousRoute = useRef(route)
  const setDirty = useCallback((value: boolean) => {
    dirty.current = value
  }, [])
  const refresh = useCallback(async () => {
    const next = await readSnapshot()
    setData(next)
    setExternal(false)
    setNow(Date.now())
  }, [])
  const load = useCallback(() => {
    setFatal('')
    void refresh().catch((error) => setFatal(friendlyError(error)))
  }, [refresh])
  useEffect(load, [load])
  useEffect(() => {
    function hash() {
      const next = routeValue()
      if (next === previousRoute.current) return
      if (dirty.current && !window.confirm('有尚未保存的编辑，确定离开吗？')) {
        history.replaceState(null, '', `#${previousRoute.current}`)
        return
      }
      dirty.current = false
      previousRoute.current = next
      setRoute(next)
      window.scrollTo(0, 0)
    }
    function beforeUnload(event: BeforeUnloadEvent) {
      if (dirty.current) {
        event.preventDefault()
        event.returnValue = ''
      }
    }
    function tick() {
      setNow(Date.now())
    }
    function blocked() {
      setFatal('数据库升级被其他页面阻塞。请关闭其他时习页面后重新加载。')
    }
    const timer = window.setInterval(tick, 15000)
    window.addEventListener('hashchange', hash)
    window.addEventListener('beforeunload', beforeUnload)
    window.addEventListener('focus', tick)
    document.addEventListener('visibilitychange', tick)
    window.addEventListener('shixi-db-blocked', blocked)
    const channel = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(DB_NAME)
    if (channel) channel.onmessage = () => setExternal(true)
    return () => {
      clearInterval(timer)
      window.removeEventListener('hashchange', hash)
      window.removeEventListener('beforeunload', beforeUnload)
      window.removeEventListener('focus', tick)
      document.removeEventListener('visibilitychange', tick)
      window.removeEventListener('shixi-db-blocked', blocked)
      channel?.close()
    }
  }, [])
  useEffect(() => {
    document.title = `${route.startsWith('review') ? '专注复习' : route.startsWith('library') ? '我的内容' : route.startsWith('settings') ? '设置与备份' : route.startsWith('add') || route.startsWith('edit') ? '添加与编辑' : '今天复习'} · 时习`
    if (!route.startsWith('review')) document.querySelector<HTMLElement>('h1')?.focus()
  }, [route, !!data])
  if (fatal)
    return (
      <main className="fatal">
        <h1>无法读取本地数据</h1>
        <Notice error>{fatal}</Notice>
        <p>请不要清除浏览器数据。可先关闭其他时习页面或检查存储权限。</p>
        <button onClick={load}>重试读取</button>
      </main>
    )
  if (!data)
    return (
      <main className="fatal" role="status">
        正在打开你的复习本…
      </main>
    )
  const [page, argument] = route.split('/')
  const subject = SUBJECTS.includes(argument as Subject) ? (argument as Subject) : undefined
  const reviewing = page === 'review'
  const nav: { key: string; name: string; icon: IconName }[] = [
    { key: 'today', name: '今天复习', icon: 'today' },
    { key: 'library', name: '我的内容', icon: 'library' },
    { key: 'add', name: '添加内容', icon: 'add' },
    { key: 'settings', name: '设置与备份', icon: 'settings' },
  ]
  const editing = data.cards.find((c) => c.id === argument)
  return (
    <div className={reviewing ? 'app review-app' : 'app'}>
      <a
        className="skip-link"
        href="#main"
        onClick={(e) => {
          e.preventDefault()
          document.getElementById('main')?.focus()
        }}
      >
        跳至内容
      </a>
      {!reviewing && (
        <>
          <aside className="sidebar">
            <a href="#today" className="brand" aria-label="时习首页">
              <span className="brand-mark">
                <Icon name="book" size={24} />
              </span>
              <span>
                时习<small>个人考研复习本</small>
              </span>
            </a>
            <nav aria-label="主导航">
              {nav.map((item) => (
                <a
                  key={item.key}
                  href={`#${item.key}`}
                  className={page === item.key || (page === 'edit' && item.key === 'add') ? 'active' : ''}
                  aria-current={page === item.key ? 'page' : undefined}
                >
                  <Icon name={item.icon} />
                  <span>{item.name}</span>
                </a>
              ))}
            </nav>
            <div className="sidebar-foot">
              <span className="local-dot" />
              保存在本机<p>记得定期导出备份</p>
            </div>
          </aside>
          <header className="mobile-brand">
            <a href="#today">
              <Icon name="book" />
              时习
            </a>
            <span>个人考研复习本</span>
          </header>
        </>
      )}
      <main id="main" tabIndex={-1} className="main-content">
        {external && (
          <Notice>
            另一个页面更新了数据。
            {dirty.current ? (
              '请先复制保留未保存的文字，再刷新页面。'
            ) : (
              <button
                className="text-button"
                onClick={() => void refresh().catch((err) => setFatal(friendlyError(err)))}
              >
                加载最新数据
              </button>
            )}
          </Notice>
        )}
        {page === 'add' || page === 'edit' ? (
          page === 'edit' && !editing ? (
            <Notice error>没有找到这条内容，请返回“我的内容”。</Notice>
          ) : (
            <Editor
              key={route}
              data={data}
              existing={page === 'edit' ? editing : undefined}
              subject={subject}
              setDirty={setDirty}
              onSaved={refresh}
            />
          )
        ) : page === 'library' ? (
          <Library key={route} data={data} now={now} draftOnly={argument === 'draft'} />
        ) : page === 'settings' ? (
          <SettingsPage data={data} refresh={refresh} />
        ) : reviewing ? (
          <ReviewPage key={route} data={data} now={now} subject={subject} refresh={refresh} />
        ) : (
          <Home data={data} now={now} />
        )}
        {!reviewing && (
          <footer className="page-footer">无需登录 · 内容仅保存在当前浏览器 · 设备之间不自动同步</footer>
        )}
      </main>
    </div>
  )
}
