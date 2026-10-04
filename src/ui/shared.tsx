import { lazy, Suspense, useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { readImage } from '../core/db'
import type { Content, StoredImage } from '../core/model'
const MathText = lazy(() => import('./MathText'))

export type IconName =
  | 'today'
  | 'library'
  | 'add'
  | 'settings'
  | 'arrow'
  | 'book'
  | 'check'
  | 'image'
  | 'close'
  | 'undo'
  | 'download'
  | 'tree'
  | 'branch'
  | 'chevron'
  | 'link'
  | 'cards'
  | 'code'
  | 'calculator'
  | 'globe'
  | 'leaf'
  | 'languages'
  | 'lightbulb'
  | 'flask'
  | 'music'
  | 'palette'
  | 'target'
  | 'folder'
const paths: Record<IconName, ReactNode> = {
  code: <path d="m8 6-6 6 6 6m8-12 6 6-6 6m-3-15-2 18" />,
  calculator: (
    <>
      <rect x="5" y="2" width="14" height="20" rx="2" />
      <path d="M8 6h8M8 11h1m6 0h1m-8 4h1m6 0h1m-8 4h1m6 0h1" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="10" />
      <ellipse cx="12" cy="12" rx="4" ry="10" />
      <path d="M2 12h20" />
    </>
  ),
  leaf: <path d="M20 3C10 2 3 6 3 13a7 7 0 0 0 7 7c7 0 11-7 10-17ZM4 20 15 9" />,
  languages: (
    <>
      <path d="M3 5h11M8 2v3m3 0c0 5-3 8-7 10m1-7c1 3 4 6 7 7m1 6 4-10 4 10m-7-3h6" />
    </>
  ),
  lightbulb: (
    <>
      <path d="M8 16a7 7 0 1 1 8 0l-1 2H9l-1-2Zm1 5h6" />
    </>
  ),
  flask: <path d="M9 2h6m-5 0v7L4 19a2 2 0 0 0 2 3h12a2 2 0 0 0 2-3L14 9V2M7 15h10" />,
  music: (
    <>
      <path d="M9 18V5l11-2v13M9 8l11-2" />
      <ellipse cx="6" cy="18" rx="3" ry="2" />
      <ellipse cx="17" cy="16" rx="3" ry="2" />
    </>
  ),
  palette: (
    <>
      <path d="M12 2a10 10 0 1 0 0 20h2a2 2 0 0 0 0-4h-1a2 2 0 0 1 0-4h5a4 4 0 0 0 4-4c0-4-5-8-10-8Z" />
      <circle cx="7" cy="10" r=".6" />
      <circle cx="10" cy="6" r=".6" />
      <circle cx="15" cy="6" r=".6" />
      <circle cx="18" cy="10" r=".6" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </>
  ),
  folder: <path d="M3 7V4h6l2 3h10v13H3V7Z" />,
  tree: (
    <>
      <circle cx="5" cy="12" r="3" />
      <circle cx="19" cy="5" r="3" />
      <circle cx="19" cy="19" r="3" />
      <path d="M8 12h4V5h4m-4 7v7h4" />
    </>
  ),
  branch: (
    <>
      <circle cx="6" cy="4" r="2" />
      <circle cx="6" cy="20" r="2" />
      <circle cx="18" cy="6" r="2" />
      <path d="M6 6v12m0-5h6a6 6 0 0 0 6-5" />
    </>
  ),
  chevron: <path d="m9 5 7 7-7 7" />,
  link: (
    <>
      <path d="m10 13 4-4m-6 6-2 2a3 3 0 0 1-4-4l4-4a3 3 0 0 1 4 0m4 0 2-2a3 3 0 0 1 4 4l-4 4a3 3 0 0 1-4 0" />
    </>
  ),
  cards: (
    <>
      <rect x="7" y="5" width="13" height="16" rx="2" />
      <path d="M4 17V3a1 1 0 0 1 1-1h11M11 10h5m-5 4h3" />
    </>
  ),
  today: (
    <>
      <rect x="4" y="5" width="16" height="16" rx="3" />
      <path d="M8 3v4m8-4v4M4 11h16m-12 5h3" />
    </>
  ),
  library: (
    <>
      <path d="M4 4h5v16H4zM9 4h5v16H9zM16 4l4-1 4 16-4 1z" />
    </>
  ),
  add: <path d="M12 5v14M5 12h14" />,
  settings: (
    <>
      <path d="M4 7h16M4 17h16" />
      <circle cx="8" cy="7" r="3" />
      <circle cx="16" cy="17" r="3" />
    </>
  ),
  arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
  book: (
    <>
      <path d="M4 4h12a4 4 0 0 1 4 4v13H8a4 4 0 0 1-4-4V4zM8 9h8M8 13h6" />
    </>
  ),
  check: <path d="m5 12 4 4L19 6" />,
  image: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <circle cx="8" cy="8" r="1" />
      <path d="m3 17 5-5 4 4 4-6 5 6" />
    </>
  ),
  close: <path d="m6 6 12 12M18 6 6 18" />,
  undo: <path d="M8 5 3 10l5 5M3 10h10a6 6 0 0 1 0 12" />,
  download: (
    <>
      <path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5" />
    </>
  ),
}
export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  )
}
export function PageHead({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <header className="page-head">
      <div>
        <h1 tabIndex={-1}>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action}
    </header>
  )
}
export function Notice({ children, error = false }: { children: ReactNode; error?: boolean }) {
  return (
    <div className={`notice ${error ? 'error' : ''}`} role={error ? 'alert' : 'status'}>
      {children}
    </div>
  )
}
export function FormulaText({ text }: { text: string }) {
  const plain = <div className="formula-text">{text}</div>
  return /\$|\\\[|\\\(/.test(text) ? (
    <Suspense fallback={plain}>
      <MathText text={text} />
    </Suspense>
  ) : (
    plain
  )
}
export function ImageView({
  id,
  provided,
  label = '题目图片',
}: {
  id: string
  provided?: StoredImage
  label?: string
}) {
  const [url, setUrl] = useState(''),
    [error, setError] = useState(false),
    [zoom, setZoom] = useState(false)
  const modal = useRef<HTMLDialogElement>(null)
  const headingId = useId()
  useEffect(() => {
    let disposed = false,
      objectUrl = ''
    setError(false)
    void (provided ? Promise.resolve(provided) : readImage(id))
      .then((image) => {
        if (!image) throw new Error('图片不存在')
        if (!disposed) {
          objectUrl = URL.createObjectURL(image.blob)
          setUrl(objectUrl)
        }
      })
      .catch(() => {
        if (!disposed) setError(true)
      })
    return () => {
      disposed = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [id, provided])
  if (error)
    return (
      <p role="alert" className="error-text">
        图片读取失败，请检查备份或重新添加这张图片。
      </p>
    )
  return (
    <>
      <button
        type="button"
        className="image-thumb"
        onClick={() => {
          setZoom(false)
          modal.current?.showModal()
        }}
        disabled={!url}
        aria-label={`放大${label}`}
      >
        {url ? <img src={url} alt={label} loading="lazy" /> : <span>读取图片…</span>}
        <span className="image-caption">点击放大</span>
      </button>
      <dialog ref={modal} className="image-modal" aria-labelledby={headingId}>
        <div className="modal-head">
          <strong id={headingId}>{label}</strong>
          <div className="actions">
            <button type="button" onClick={() => setZoom((v) => !v)}>
              {zoom ? '适应屏幕' : '原尺寸查看'}
            </button>
            <button type="button" aria-label="关闭图片" onClick={() => modal.current?.close()}>
              <Icon name="close" />
            </button>
          </div>
        </div>
        <div className={`zoom-area ${zoom ? 'original' : ''}`}>{url && <img src={url} alt={label} />}</div>
      </dialog>
    </>
  )
}
export function ContentView({ content, label }: { content: Content; label: string }) {
  return (
    <div className="content-view">
      {content.text && <FormulaText text={content.text} />}
      <div className="image-list">
        {content.images.map((id) => (
          <ImageView key={id} id={id} label={label} />
        ))}
      </div>
    </div>
  )
}
export function Empty({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <Icon name="book" size={28} />
      </div>
      <h2>{title}</h2>
      {children}
    </div>
  )
}
