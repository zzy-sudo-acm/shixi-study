import {
  Component,
  lazy,
  Suspense,
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from 'react'
import { DB_NAME, readSnapshot } from './core/db'
import { friendlyError, type Snapshot } from './core/model'
import { Home } from './ui/Home'
import { SpacePage } from './ui/SpacePage'
import { Icon, Notice, type IconName } from './ui/shared'
const MemoSettings = lazy(() => import('./ui/Settings').then((m) => ({ default: m.SettingsPage })))
const MemoHome = memo(Home)
const MemoLibrary = lazy(() => import('./ui/KnowledgeLibrary').then((m) => ({ default: m.KnowledgeLibrary })))

const brandSymbol = (
  <svg width="25" height="25" viewBox="0 0 25 25" aria-hidden="true">
    <path d="M6 18 12 6 20 16" fill="none" stroke="currentColor" strokeWidth="1.4" />
    <circle cx="6" cy="18" r="2.7" fill="currentColor" />
    <circle cx="12" cy="6" r="3.2" fill="currentColor" />
    <circle cx="20" cy="16" r="2.7" fill="currentColor" />
  </svg>
)

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
    const [path, ...query] = location.hash.slice(1).split('?')
    return (path || 'home') + (query.length ? `?${query.join('?')}` : '')
  } catch {
    return 'home'
  }
}
export default function App() {
  const [data, setData] = useState<Snapshot | null>(null),
    [fatal, setFatal] = useState(''),
    [route, setRoute] = useState(routeValue),
    [external, setExternal] = useState(false)
  const [navRoute, setNavRoute] = useState(route)
  const [recoveryError, setRecoveryError] = useState(''),
    [recovering, setRecovering] = useState(false)
  const [pending, startTransition] = useTransition()
  const dirty = useRef(false),
    previousRoute = useRef(route)
  const setDirty = useCallback((value: boolean) => {
    dirty.current = value
  }, [])
  const navigate = useCallback((next: string, fromHash = false) => {
    if (next === previousRoute.current) return
    if (dirty.current && !window.confirm('有尚未保存的编辑，确定离开吗？')) {
      if (fromHash) history.replaceState(null, '', `#${previousRoute.current}`)
      return
    }
    dirty.current = false
    previousRoute.current = next
    if (!fromHash) history.pushState(null, '', `#${next}`)
    setNavRoute(next)
    startTransition(() => setRoute(next))
  }, [])
  const refresh = useCallback(async () => {
    const next = await readSnapshot()
    setData(next)
    setExternal(false)
  }, [])
  const load = useCallback(() => {
    setFatal('')
    void refresh().catch((error) => setFatal(friendlyError(error)))
  }, [refresh])
  useEffect(load, [load])
  useEffect(() => {
    function hash() {
      navigate(routeValue(), true)
    }
    function beforeUnload(event: BeforeUnloadEvent) {
      if (dirty.current) {
        event.preventDefault()
        event.returnValue = ''
      }
    }
    function blocked() {
      setFatal('数据库升级被其他页面阻塞。请关闭其他时习页面后重新加载。')
    }
    window.addEventListener('hashchange', hash)
    window.addEventListener('beforeunload', beforeUnload)
    window.addEventListener('shixi-db-blocked', blocked)
    const channel = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(DB_NAME)
    if (channel) channel.onmessage = () => setExternal(true)
    return () => {
      window.removeEventListener('hashchange', hash)
      window.removeEventListener('beforeunload', beforeUnload)
      window.removeEventListener('shixi-db-blocked', blocked)
      channel?.close()
    }
  }, [navigate])
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
    document.title = `${route.startsWith('space') ? '学习领域' : route.startsWith('library') ? '知识库' : route.startsWith('settings') ? '设置与备份' : '我的学习空间'} · 时习`
    document.querySelector<HTMLElement>('h1')?.focus()
  }, [route, !!data])
  if (fatal)
    return (
      <main className="fatal">
        <h1>无法读取本地数据</h1>
        <Notice error>{fatal}</Notice>
        <p>请不要清除浏览器数据。可先关闭其他时习页面或检查存储权限。</p>
        <button onClick={load}>重试读取</button>
        <button
          className="secondary"
          disabled={recovering}
          onClick={() => {
            setRecovering(true)
            setRecoveryError('')
            void import('./core/recovery')
              .then((m) => m.exportRecoveryData())
              .then((contents) => {
                const url = URL.createObjectURL(new Blob([contents], { type: 'application/json' })),
                  link = document.createElement('a')
                link.href = url
                link.download = `shixi-recovery-${Date.now()}.json`
                link.click()
                setTimeout(() => URL.revokeObjectURL(url), 60000)
              })
              .catch((err) => setRecoveryError(friendlyError(err)))
              .finally(() => setRecovering(false))
          }}
        >
          {recovering ? '正在导出…' : '导出原始数据副本'}
        </button>
        <p>原始副本用于修复数据格式后恢复，不能直接通过常规备份入口导入。</p>
        {recoveryError ? <Notice error>{recoveryError}</Notice> : null}
      </main>
    )
  if (!data)
    return (
      <main className="fatal" role="status">
        正在打开你的学习空间…
      </main>
    )
  const [routePath, routeQuery = ''] = route.split('?')
  const [page, rawArgument = '', view = 'cards'] = routePath.split('/')
  let argument = rawArgument
  try {
    argument = decodeURIComponent(rawArgument)
  } catch {
    /* invalid route is shown as missing */
  }
  const activeRoute = navRoute.split('/')[0].split('?')[0]
  const activePage = ['space', 'home'].includes(activeRoute) ? 'home' : activeRoute
  const params = new URLSearchParams(routeQuery)
  const nav: { key: string; name: string; icon: IconName }[] = [
    { key: 'home', name: '学习空间', icon: 'book' },
    { key: 'library', name: '知识库', icon: 'branch' },
    { key: 'settings', name: '设置与备份', icon: 'settings' },
  ]
  return (
    <div className="app studio-app">
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
      <aside className="sidebar">
        <a href="#home" className="brand" aria-label="时习首页">
          <span className="brand-mark">{brandSymbol}</span>
          <span>
            时习<small>个人学习空间</small>
          </span>
        </a>
        <nav aria-label="主导航">
          {nav.map((item) => (
            <a
              key={item.key}
              href={`#${item.key}`}
              className={activePage === item.key ? 'active' : ''}
              aria-current={activePage === item.key ? 'page' : undefined}
              onClick={(event) => {
                if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return
                event.preventDefault()
                navigate(item.key)
              }}
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
        <a href="#home">
          {brandSymbol}
          时习
        </a>
        <span>个人学习空间</span>
      </header>
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
        <div className="page-surface" key={page} aria-busy={pending}>
          <Suspense fallback={<p role="status">正在打开页面…</p>}>
            {page === 'space' ? (
              <SpacePage
                key={argument}
                data={data}
                spaceId={argument}
                view={view}
                initialNode={params.get('node') ?? undefined}
                rootId={params.get('root') ?? ''}
                refresh={refresh}
                setDirty={setDirty}
              />
            ) : page === 'library' ? (
              <MemoLibrary key={route} data={data} rootId={argument} />
            ) : page === 'settings' ? (
              <MemoSettings data={data} refresh={refresh} />
            ) : (
              <MemoHome data={data} refresh={refresh} setDirty={setDirty} />
            )}
          </Suspense>
        </div>
        <footer className="page-footer">无需登录 · 内容仅保存在当前浏览器 · 设备之间不自动同步</footer>
      </main>
    </div>
  )
}
