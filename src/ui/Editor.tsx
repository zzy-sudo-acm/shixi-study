import { useEffect, useRef, useState, type ClipboardEvent, type DragEvent } from 'react'
import {
  cardSchema,
  friendlyError,
  SUBJECTS,
  type Content,
  type Snapshot,
  type StoredImage,
  type StudyCard,
  type Subject,
} from '../core/model'
import { emptySchedule } from '../core/scheduler'
import { saveCard } from '../core/db'
import { prepareImage } from '../core/images'
import { FormulaText, Icon, ImageView, Notice, PageHead } from './shared'

function ContentEditor({
  label,
  content,
  images,
  original,
  update,
  onProcessing,
}: {
  label: string
  content: Content
  images: StoredImage[]
  original: boolean
  update: (value: Content, added?: StoredImage[]) => void
  onProcessing: (value: boolean) => void
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [preview, setPreview] = useState(false),
    [drag, setDrag] = useState(false)
  const busyRef = useRef(false)
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  const valueRef = useRef(content)
  valueRef.current = content
  const fileInput = useRef<HTMLInputElement>(null),
    camera = useRef<HTMLInputElement>(null)
  async function add(files: File[]) {
    if (busyRef.current || !files.length) return
    if (content.images.length + files.length > 30) {
      setError('每一面最多添加 30 张图片，请先缩小范围。')
      return
    }
    busyRef.current = true
    setBusy(true)
    onProcessing(true)
    setError('')
    try {
      const added: StoredImage[] = []
      for (const file of files) added.push(await prepareImage(file, original))
      if (mounted.current)
        update(
          { ...valueRef.current, images: [...valueRef.current.images, ...added.map((image) => image.id)] },
          added,
        )
    } catch (err) {
      if (mounted.current) setError(friendlyError(err))
    } finally {
      busyRef.current = false
      if (mounted.current) {
        setBusy(false)
        onProcessing(false)
      }
    }
  }
  function paste(event: ClipboardEvent) {
    const files = Array.from(event.clipboardData.files).filter((file) => file.type.startsWith('image/'))
    if (files.length) {
      event.preventDefault()
      void add(files)
    }
  }
  function drop(event: DragEvent) {
    event.preventDefault()
    setDrag(false)
    void add(Array.from(event.dataTransfer.files))
  }
  return (
    <section
      className={`content-editor ${drag ? 'dragging' : ''}`}
      onDragOver={(e) => {
        e.preventDefault()
        setDrag(true)
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={drop}
    >
      <div className="field-head">
        <label htmlFor={`input-${label}`}>{label}</label>
        <button type="button" className="text-button" onClick={() => setPreview((value) => !value)}>
          {preview ? '继续编辑' : '预览公式'}
        </button>
      </div>
      {preview ? (
        <div className="editor-preview">
          {content.text ? (
            <FormulaText text={content.text} />
          ) : (
            <p className="muted">还没有文字，返回编辑后输入。</p>
          )}
        </div>
      ) : (
        <textarea
          id={`input-${label}`}
          value={content.text}
          maxLength={100000}
          onChange={(e) => update({ ...content, text: e.target.value })}
          onPaste={paste}
          rows={label === '问题' ? 4 : 5}
          placeholder={
            label === '问题'
              ? '例如：使用洛必达法则前，需要检查哪些条件？\n也可以直接粘贴或拖入题目截图。'
              : '写下判断依据、关键步骤或贴上解析图片。复习时默认隐藏。'
          }
        />
      )}
      <div className="image-list editor-images">
        {content.images.map((id, index) => (
          <div className="editor-image" key={id}>
            <ImageView
              id={id}
              provided={images.find((image) => image.id === id)}
              label={`${label}图片 ${index + 1}`}
            />
            <button
              type="button"
              className="remove-image"
              aria-label={`移除${label}图片 ${index + 1}`}
              disabled={busy}
              onClick={() => update({ ...content, images: content.images.filter((value) => value !== id) })}
            >
              <Icon name="close" size={16} />
            </button>
          </div>
        ))}
      </div>
      <div className="attachment-bar">
        <button
          type="button"
          className="text-button"
          disabled={busy}
          onClick={() => fileInput.current?.click()}
        >
          <Icon name="image" size={18} />
          选择图片
        </button>
        <button type="button" className="text-button" disabled={busy} onClick={() => camera.current?.click()}>
          拍照
        </button>
        <span>{busy ? '正在本地处理图片…' : '支持粘贴、拖入图片'}</span>
      </div>
      <input
        className="sr-only"
        type="file"
        ref={fileInput}
        aria-label={`${label}图片文件`}
        accept="image/png,image/jpeg,image/webp"
        multiple
        tabIndex={-1}
        onChange={(e) => {
          void add(Array.from(e.target.files ?? []))
          e.target.value = ''
        }}
      />
      <input
        className="sr-only"
        type="file"
        ref={camera}
        aria-label={`拍摄${label}`}
        accept="image/*"
        capture="environment"
        tabIndex={-1}
        onChange={(e) => {
          void add(Array.from(e.target.files ?? []))
          e.target.value = ''
        }}
      />
      {error && <Notice error>{error}</Notice>}
    </section>
  )
}
export function Editor({
  data,
  existing,
  subject,
  onSaved,
  setDirty,
}: {
  data: Snapshot
  existing?: StudyCard
  subject?: Subject
  onSaved: () => Promise<void>
  setDirty: (value: boolean) => void
}) {
  const [card, setCard] = useState<StudyCard>(
    () =>
      existing ?? {
        id: crypto.randomUUID(),
        subject: subject ?? data.settings.lastSubject,
        kind: 'knowledge',
        status: 'ready',
        question: { text: '', images: [] },
        answer: { text: '', images: [] },
        chapter: '',
        tags: [],
        book: '',
        page: '',
        number: '',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        schedule: emptySchedule(),
      },
  )
  const revision = useRef(data.revision)
  const [images, setImages] = useState<StoredImage[]>([]),
    [original, setOriginal] = useState(false),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false)
  const [processing, setProcessing] = useState(0),
    [tagsText, setTagsText] = useState(card.tags.join('，'))
  const saving = useRef(false)
  useEffect(() => () => setDirty(false), [setDirty])
  function change(patch: Partial<StudyCard>) {
    setCard((c) => ({ ...c, ...patch }))
    setDirty(true)
  }
  async function save(status: 'draft' | 'ready') {
    if (saving.current || processing > 0) return
    if (
      ![
        card.question.text.trim(),
        card.answer.text.trim(),
        card.question.images.length,
        card.answer.images.length,
      ].some(Boolean)
    ) {
      setError('先写下一点内容，或添加一张截图。')
      return
    }
    saving.current = true
    setBusy(true)
    setError('')
    try {
      const candidate = cardSchema.parse({
        ...card,
        tags: [...new Set(tagsText.split(/[,，\s]+/).filter(Boolean))],
        status,
        updatedAt: Date.now(),
      })
      await saveCard(candidate, images, revision.current)
      setDirty(false)
      await onSaved()
      location.hash = '#library'
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      saving.current = false
      setBusy(false)
    }
  }
  return (
    <>
      <PageHead
        title={existing ? '编辑内容' : '留一个问题'}
        description="不必整理成笔记。一个具体的问题，就能开始一次回忆。"
      />
      <form
        className="editor-form"
        onSubmit={(e) => {
          e.preventDefault()
          void save('ready')
        }}
      >
        <fieldset disabled={busy}>
          <legend className="sr-only">内容编辑</legend>
          <div className="editor-top">
            <label>
              科目
              <select
                aria-label="科目"
                value={card.subject}
                onChange={(e) => change({ subject: e.target.value as Subject })}
              >
                {SUBJECTS.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <fieldset className="type-picker">
              <legend>内容类型</legend>
              {(['knowledge', 'exercise'] as const).map((kind) => (
                <label key={kind}>
                  <input
                    type="radio"
                    name="kind"
                    value={kind}
                    checked={card.kind === kind}
                    onChange={() => change({ kind })}
                  />
                  {kind === 'knowledge' ? '知识点' : '练习题'}
                </label>
              ))}
            </fieldset>
          </div>
          <p className="editor-hint">
            {card.kind === 'knowledge'
              ? '试着只问一件事：定义是什么？成立条件有哪些？这两种方法如何区分？'
              : '留下题目与解析。复习时先在纸上独立做，再查看答案。'}
          </p>
          <ContentEditor
            label="问题"
            content={card.question}
            images={images}
            original={original}
            update={(question, added) => {
              change({ question })
              if (added) setImages((items) => [...items, ...added])
            }}
            onProcessing={(value) => {
              if (value) setDirty(true)
              setProcessing((n) => n + (value ? 1 : -1))
            }}
          />
          <ContentEditor
            label="答案与解析"
            content={card.answer}
            images={images}
            original={original}
            update={(answer, added) => {
              change({ answer })
              if (added) setImages((items) => [...items, ...added])
            }}
            onProcessing={(value) => {
              if (value) setDirty(true)
              setProcessing((n) => n + (value ? 1 : -1))
            }}
          />
          <div className="editor-options">
            <span>
              公式写法：<code>{'$x^2$'}</code> 行内，<code>{'$$\\int_0^1 x\\,dx$$'}</code> 独立一行。
            </span>
            <label className="check-label">
              <input type="checkbox" checked={original} onChange={(e) => setOriginal(e.target.checked)} />
              新添加图片保留原图（更占空间）
            </label>
            <span>默认在本机压缩图片。公式较密时，可开启保留原图后重新添加。</span>
          </div>
          <details
            className="optional-fields"
            open={existing && !!(card.chapter || card.book || card.tags.length)}
          >
            <summary>
              补充来源与标签 <span>可选</span>
            </summary>
            <div className="metadata-grid">
              <label>
                章节
                <input
                  value={card.chapter}
                  maxLength={200}
                  onChange={(e) => change({ chapter: e.target.value })}
                  placeholder="例如：极限与连续"
                />
              </label>
              <label>
                书名
                <input
                  value={card.book}
                  maxLength={200}
                  onChange={(e) => change({ book: e.target.value })}
                  placeholder="例如：1000题"
                />
              </label>
              <label>
                页码
                <input
                  value={card.page}
                  maxLength={100}
                  onChange={(e) => change({ page: e.target.value })}
                  placeholder="例如：42"
                />
              </label>
              <label>
                题号
                <input
                  value={card.number}
                  maxLength={100}
                  onChange={(e) => change({ number: e.target.value })}
                  placeholder="例如：B组 08"
                />
              </label>
              <label className="full-width">
                标签
                <input
                  value={tagsText}
                  maxLength={3000}
                  onChange={(e) => {
                    setTagsText(e.target.value)
                    setDirty(true)
                  }}
                  placeholder="用逗号或空格分隔，例如：易忘条件，错题"
                />
              </label>
            </div>
          </details>
        </fieldset>
        {error && <Notice error>{error}</Notice>}
        <div className="save-bar">
          <div className="actions">
            <button type="submit" className="primary" disabled={busy || processing > 0}>
              {busy ? '正在保存…' : existing ? '保存并加入复习' : '保存并加入新学'}
            </button>
            <button
              type="button"
              className="secondary"
              disabled={busy || processing > 0}
              onClick={() => void save('draft')}
            >
              暂存为待整理
            </button>
          </div>
          <p>待整理内容不进入复习队列。{existing && '编辑不会重置已有进度。'}</p>
        </div>
      </form>
    </>
  )
}
