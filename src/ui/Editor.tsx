import { useEffect, useRef, useState, type ClipboardEvent, type DragEvent } from 'react'
import {
  cardSchema,
  FACE_NAMES,
  friendlyError,
  KIND_NAMES,
  kindsForSubject,
  SUBJECTS,
  type Content,
  type Kind,
  type Snapshot,
  type StoredImage,
  type StudyCard,
  type Subject,
} from '../core/model'
import { emptySchedule } from '../core/scheduler'
import { saveCard } from '../core/db'
import { clearDraft, loadDraft, saveDraft, type EditorDraft } from '../core/draft'
import { prepareImage } from '../core/images'
import { FormulaText, Icon, ImageView, Notice, PageHead } from './shared'

function ContentEditor({
  label,
  placeholder,
  rows,
  content,
  images,
  original,
  update,
  onProcessing,
  onReuse,
  reuseTargets = [],
  reuseLabel = '',
}: {
  label: string
  placeholder: string
  rows: number
  content: Content
  images: StoredImage[]
  original: boolean
  update: (value: Content, added?: StoredImage[]) => void
  onProcessing: (value: boolean) => void
  onReuse?: (id: string) => void
  reuseTargets?: string[]
  reuseLabel?: string
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
          rows={rows}
          placeholder={placeholder}
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
            {onReuse && (
              <button
                type="button"
                className="reuse-image"
                disabled={busy || reuseTargets.includes(id)}
                onClick={() => onReuse(id)}
              >
                {reuseTargets.includes(id) ? '已在另一面' : reuseLabel}
              </button>
            )}
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
function hasDraftContent(card: StudyCard) {
  return Boolean(
    card.question.text.trim() ||
    card.answer.text.trim() ||
    card.question.images.length ||
    card.answer.images.length ||
    card.tags.length,
  )
}
const EDITOR_KIND_HINTS: Record<Kind, string> = {
  knowledge: '试着只问一件事：定义是什么？成立条件有哪些？这两种方法如何区分？',
  exercise: '留下题目与解析。复习时先在纸上独立做，再查看答案。',
  word: '一词一卡：正面写单词或短语，背面放释义、搭配或例句。',
  sentence: '正面写英文句子，背面放翻译或结构分析。复习时先自己译一遍。',
}
const EDITOR_FACES: Record<
  Kind,
  { question: { placeholder: string; rows: number }; answer: { placeholder: string; rows: number } }
> = {
  knowledge: {
    question: {
      placeholder: '例如：使用洛必达法则前，需要检查哪些条件？\n也可以直接粘贴或拖入题目截图。',
      rows: 4,
    },
    answer: { placeholder: '写下判断依据、关键步骤或贴上解析图片。复习时默认隐藏。', rows: 5 },
  },
  exercise: {
    question: {
      placeholder: '例如：使用洛必达法则前，需要检查哪些条件？\n也可以直接粘贴或拖入题目截图。',
      rows: 4,
    },
    answer: { placeholder: '写下判断依据、关键步骤或贴上解析图片。复习时默认隐藏。', rows: 5 },
  },
  word: {
    question: { placeholder: '例如：abandon\n也可以粘贴或拖入词汇截图。', rows: 2 },
    answer: { placeholder: '词性、释义、常用搭配或例句。复习时默认隐藏。', rows: 4 },
  },
  sentence: {
    question: { placeholder: '例如：The show must go on.\n也可以粘贴或拖入阅读截图。', rows: 3 },
    answer: { placeholder: '翻译、结构分析或生词笔记。复习时默认隐藏。', rows: 4 },
  },
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
        kind: kindsForSubject(subject ?? data.settings.lastSubject)[0],
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
    [tagsText, setTagsText] = useState(card.tags.join('，')),
    [savedCount, setSavedCount] = useState(0),
    [pendingDraft, setPendingDraft] = useState<EditorDraft | null>(null)
  const saving = useRef(false)
  useEffect(() => () => setDirty(false), [setDirty])
  useEffect(() => {
    revision.current = data.revision
  }, [data.revision])
  useEffect(() => {
    if (existing) return
    let cancelled = false
    void loadDraft().then((draft) => {
      if (!cancelled && draft && hasDraftContent(draft.card)) setPendingDraft(draft)
    })
    return () => {
      cancelled = true
    }
  }, [existing])
  useEffect(() => {
    if (existing || pendingDraft) return
    const timer = setTimeout(() => {
      if (hasDraftContent(card)) void saveDraft({ card, tagsText, original, images, savedAt: Date.now() })
      else void clearDraft()
    }, 800)
    return () => clearTimeout(timer)
  }, [existing, pendingDraft, card, tagsText, original, images])
  const books = [...new Set(data.cards.map((c) => c.book).filter(Boolean))].sort()
  const chapters = [...new Set(data.cards.map((c) => c.chapter).filter(Boolean))].sort()
  const currentTags = tagsText.split(/[,，\s]+/).filter(Boolean)
  const knownTags = [...new Set(data.cards.flatMap((c) => c.tags))]
    .filter((tag) => !currentTags.includes(tag))
    .sort()
  function change(patch: Partial<StudyCard>) {
    setCard((c) => ({ ...c, ...patch }))
    setDirty(true)
  }
  function restoreDraft(draft: EditorDraft) {
    setCard(draft.card)
    setTagsText(draft.tagsText)
    setOriginal(draft.original)
    setImages(draft.images)
    setPendingDraft(null)
    setDirty(true)
  }
  function reuseImage(from: 'question' | 'answer', id: string) {
    const to = from === 'question' ? 'answer' : 'question'
    const target = card[to]
    if (target.images.includes(id)) return
    if (target.images.length >= 30) {
      setError('每一面最多添加 30 张图片。')
      return
    }
    change({ [to]: { ...target, images: [...target.images, id] } })
  }
  async function save(status: 'draft' | 'ready', keepAdding = false) {
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
    const questionText = card.question.text.trim()
    if (
      questionText &&
      data.cards.some((c) => c.id !== card.id && c.question.text.trim() === questionText) &&
      !window.confirm('已有一条问题完全相同的内容。确定再保存一条吗？')
    )
      return
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
      revision.current += 1
      setDirty(false)
      void clearDraft()
      await onSaved()
      if (keepAdding && !existing) {
        setImages([])
        setTagsText('')
        setCard({
          id: crypto.randomUUID(),
          subject: card.subject,
          kind: card.kind,
          status: 'ready',
          question: { text: '', images: [] },
          answer: { text: '', images: [] },
          chapter: card.chapter,
          tags: [],
          book: card.book,
          page: '',
          number: '',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          schedule: emptySchedule(),
        })
        setSavedCount((n) => n + 1)
        window.scrollTo(0, 0)
        document.getElementById(`input-${FACE_NAMES[card.kind].question}`)?.focus()
      } else {
        location.hash = '#library'
      }
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
        onKeyDown={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault()
            void save('ready')
          }
        }}
      >
        {pendingDraft && (
          <Notice>
            发现上次没来得及保存的内容。
            <button type="button" className="text-button" onClick={() => restoreDraft(pendingDraft)}>
              恢复
            </button>
            <button
              type="button"
              className="text-button"
              onClick={() => {
                setPendingDraft(null)
                void clearDraft()
              }}
            >
              丢弃
            </button>
          </Notice>
        )}
        {!existing && savedCount > 0 && (
          <Notice>已保存 {savedCount} 条，科目、类型、章节与书名已沿用，可以直接录下一条。</Notice>
        )}
        <fieldset disabled={busy}>
          <legend className="sr-only">内容编辑</legend>
          <div className="editor-top">
            <label>
              科目
              <select
                aria-label="科目"
                value={card.subject}
                onChange={(e) => {
                  const subject = e.target.value as Subject
                  const kinds = kindsForSubject(subject)
                  change(kinds.includes(card.kind) ? { subject } : { subject, kind: kinds[0] })
                }}
              >
                {SUBJECTS.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <fieldset className="type-picker">
              <legend>内容类型</legend>
              {(kindsForSubject(card.subject).includes(card.kind)
                ? kindsForSubject(card.subject)
                : [...kindsForSubject(card.subject), card.kind]
              ).map((kind) => (
                <label key={kind}>
                  <input
                    type="radio"
                    name="kind"
                    value={kind}
                    checked={card.kind === kind}
                    onChange={() => change({ kind })}
                  />
                  {KIND_NAMES[kind]}
                </label>
              ))}
            </fieldset>
          </div>
          <p className="editor-hint">{EDITOR_KIND_HINTS[card.kind]}</p>
          <ContentEditor
            label={FACE_NAMES[card.kind].question}
            placeholder={EDITOR_FACES[card.kind].question.placeholder}
            rows={EDITOR_FACES[card.kind].question.rows}
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
            onReuse={(id) => reuseImage('question', id)}
            reuseTargets={card.answer.images}
            reuseLabel="用到背面"
          />
          <ContentEditor
            label={FACE_NAMES[card.kind].answer}
            placeholder={EDITOR_FACES[card.kind].answer.placeholder}
            rows={EDITOR_FACES[card.kind].answer.rows}
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
            onReuse={(id) => reuseImage('answer', id)}
            reuseTargets={card.question.images}
            reuseLabel="用到正面"
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
                  list="chapter-options"
                  onChange={(e) => change({ chapter: e.target.value })}
                  placeholder="例如：极限与连续"
                />
                <datalist id="chapter-options">
                  {chapters.map((chapter) => (
                    <option key={chapter} value={chapter} />
                  ))}
                </datalist>
              </label>
              <label>
                书名
                <input
                  value={card.book}
                  maxLength={200}
                  list="book-options"
                  onChange={(e) => change({ book: e.target.value })}
                  placeholder="例如：1000题"
                />
                <datalist id="book-options">
                  {books.map((book) => (
                    <option key={book} value={book} />
                  ))}
                </datalist>
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
              {knownTags.length > 0 && (
                <div className="tag-suggestions full-width">
                  <span>常用标签：</span>
                  {knownTags.slice(0, 12).map((tag) => (
                    <button
                      type="button"
                      key={tag}
                      className="tag-chip"
                      onClick={() => {
                        setTagsText(tagsText.trim() ? `${tagsText.replace(/[,，\s]+$/, '')}，${tag}` : tag)
                        setDirty(true)
                      }}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </details>
        </fieldset>
        {error && <Notice error>{error}</Notice>}
        <div className="save-bar">
          <div className="actions">
            <button type="submit" className="primary" disabled={busy || processing > 0}>
              {busy ? '正在保存…' : existing ? '保存并加入复习' : '保存并加入新学'}
            </button>
            {!existing && (
              <button
                type="button"
                className="secondary"
                disabled={busy || processing > 0}
                onClick={() => void save('ready', true)}
              >
                保存并继续下一条
              </button>
            )}
            <button
              type="button"
              className="secondary"
              disabled={busy || processing > 0}
              onClick={() => void save('draft')}
            >
              暂存为待整理
            </button>
          </div>
          <p>待整理内容不进入复习队列。{existing && '编辑不会重置已有进度。'}按 Ctrl+Enter 快速保存。</p>
        </div>
      </form>
    </>
  )
}
