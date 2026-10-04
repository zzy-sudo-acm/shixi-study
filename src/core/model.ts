import { z } from 'zod'

// Compatibility cards retain their old subject labels; the workspace has no fixed subjects.
export type Subject = string
export function subjectsFor(data: Pick<Snapshot, 'cards' | 'spaces'>): string[] {
  return [...new Set([...data.spaces.map((s) => s.name), ...data.cards.map((c) => c.subject)])]
}
export const KINDS = ['knowledge', 'exercise', 'word', 'sentence'] as const
export type Kind = (typeof KINDS)[number]
export const KIND_NAMES: Record<Kind, string> = {
  knowledge: '知识点',
  exercise: '练习题',
  word: '单词',
  sentence: '句子',
}
export function kindsForSubject(_subject: Subject): readonly Kind[] {
  return KINDS
}
export const FACE_NAMES: Record<Kind, { question: string; answer: string }> = {
  knowledge: { question: '问题', answer: '答案与解析' },
  exercise: { question: '问题', answer: '答案与解析' },
  word: { question: '单词或短语', answer: '释义与用法' },
  sentence: { question: '英文句子', answer: '翻译与解析' },
}
export const CATEGORY_MAX_DEPTH = 5
// 分类是用户自建的路径，段间以 / 分隔，如 高等数学/极限/泰勒公式。
export function normalizeCategoryPath(input: string): string {
  return input
    .replace(/[／\\]/g, '/')
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean)
    .join('/')
}
export function categoryParent(path: string): string {
  const index = path.lastIndexOf('/')
  return index === -1 ? '' : path.slice(0, index)
}
export function categoryUnder(path: string, ancestor: string): boolean {
  return path === ancestor || path.startsWith(`${ancestor}/`)
}
// 某科目已有的分类路径：目录树条目与卡片分类的并集，按深度再按字典序排列。
export function categoryPaths(data: Pick<Snapshot, 'cards' | 'categories'>, subject: Subject): string[] {
  const paths = new Set(data.categories.filter((e) => e.subject === subject).map((e) => e.path))
  for (const card of data.cards) if (card.subject === subject && card.category) paths.add(card.category)
  return [...paths].sort((a, b) => a.split('/').length - b.split('/').length || a.localeCompare(b, 'zh'))
}
export const categoryEntrySchema = z
  .object({ subject: z.string().min(1).max(200), path: z.string().min(1).max(100) })
  .strict()
export type CategoryEntry = z.infer<typeof categoryEntrySchema>
export const FAMILIARITY_NAMES = ['未标记', '陌生', '眼熟', '熟练'] as const
export const DATA_VERSION = 3
const time = z.number().finite().min(0).max(8640000000000000)
const count = z.number().int().nonnegative().max(10000000)
const text = z.string().max(100000)
const id = z.string().min(1).max(100)
export const scheduleSchema = z
  .object({
    due: time,
    stability: z.number().finite().nonnegative(),
    difficulty: z.number().finite().min(0).max(10),
    elapsed_days: z.number().finite().nonnegative(),
    scheduled_days: z.number().finite().nonnegative(),
    learning_steps: count,
    reps: count,
    lapses: count,
    state: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
    last_review: time.optional(),
  })
  .strict()
  .refine(
    (s) =>
      s.state === 0 ? s.reps === 0 && s.last_review === undefined : s.reps > 0 && s.last_review !== undefined,
    '调度状态与复习次数不一致',
  )
export type Schedule = z.infer<typeof scheduleSchema>
export const contentSchema = z.object({ text, images: z.array(id).max(30) }).strict()
export type Content = z.infer<typeof contentSchema>
export const cardSchema = z
  .object({
    id,
    subject: z.string().min(1).max(200),
    kind: z.enum(KINDS),
    status: z.enum(['draft', 'ready']),
    question: contentSchema,
    answer: contentSchema,
    chapter: z.string().max(200),
    category: z.string().max(100).default(''),
    familiarity: z.number().int().min(0).max(3).default(0),
    // Optional for backwards compatibility with existing cards and v1/v2 backups.
    relatedIds: z.array(id).max(100).optional(),
    tags: z.array(z.string().max(100)).max(30),
    book: z.string().max(200),
    page: z.string().max(100),
    number: z.string().max(100),
    createdAt: time,
    updatedAt: time,
    schedule: scheduleSchema,
  })
  .strict()
  .refine(
    (c) =>
      c.status === 'draft' ||
      ((c.question.text.trim().length > 0 || c.question.images.length > 0) &&
        (c.answer.text.trim().length > 0 || c.answer.images.length > 0)),
    '进入复习前请补全问题和答案',
  )
export type StudyCard = z.infer<typeof cardSchema>
export const parameterSchema = z
  .object({
    request_retention: z.number().min(0.7).max(0.99),
    maximum_interval: z.number().int().min(1).max(36500),
    w: z.array(z.number().finite()).length(21),
    enable_fuzz: z.boolean(),
    enable_short_term: z.boolean(),
    learning_steps: z.array(z.string().regex(/^\d+(\.\d+)?[mhd]$/)).max(20),
    relearning_steps: z.array(z.string().regex(/^\d+(\.\d+)?[mhd]$/)).max(20),
  })
  .strict()
export const algorithmSchema = z
  .object({
    library: z.literal('ts-fsrs'),
    version: z.literal('5.4.2'),
    parameters: parameterSchema,
  })
  .strict()
export type Algorithm = z.infer<typeof algorithmSchema>
export const settingsSchema = z
  .object({
    dailyNewLimit: z.number().int().min(0).max(200),
    lastSubject: z.string().max(200),
    reminderTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    reminderEnabled: z.boolean(),
  })
  .strict()
export type Settings = z.infer<typeof settingsSchema>
export const DEFAULT_SETTINGS: Settings = {
  dailyNewLimit: 20,
  lastSubject: '',
  reminderTime: '20:00',
  reminderEnabled: true,
}
export const logSchema = z
  .object({
    rating: z.number().int().min(1).max(4),
    state: z.number().int().min(0).max(3),
    due: time,
    review: time,
    stability: z.number().finite().nonnegative(),
    difficulty: z.number().finite().min(0).max(10),
    elapsed_days: z.number().finite().nonnegative(),
    last_elapsed_days: z.number().finite().nonnegative(),
    scheduled_days: z.number().finite().nonnegative(),
    learning_steps: count,
  })
  .strict()
export const reviewSchema = z
  .object({
    id,
    cardId: id,
    reviewedAt: time,
    rating: z.number().int().min(1).max(4),
    durationMs: z.number().finite().nonnegative(),
    timezone: z.string().max(100),
    offsetMinutes: z.number().int().min(-900).max(900),
    before: scheduleSchema,
    after: scheduleSchema,
    beforeUpdatedAt: time,
    log: logSchema,
    algorithm: algorithmSchema,
  })
  .strict()
  .refine(
    (r) =>
      r.log.rating === r.rating &&
      r.log.review === r.reviewedAt &&
      r.after.reps === r.before.reps + 1 &&
      r.after.last_review === r.reviewedAt,
    '复习历史与调度状态不一致',
  )
export type Review = z.infer<typeof reviewSchema>
export interface StoredImage {
  id: string
  blob: Blob
  width: number
  height: number
  name: string
}
const title = z.string().trim().min(1).max(200)
export const spaceSchema = z
  .object({
    id,
    name: title,
    icon: z.string().max(16).optional(),
    color: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/)
      .optional(),
    createdAt: time,
    updatedAt: time,
  })
  .strict()
export const goalSchema = z
  .object({
    id,
    spaceId: id,
    title,
    parentGoalId: id.nullable(),
    description: text.optional(),
    createdAt: time,
    updatedAt: time,
  })
  .strict()
export const stepSchema = z
  .object({
    id,
    goalId: id,
    title,
    completed: z.boolean(),
    createdAt: time,
    completedAt: time.optional(),
    updatedAt: time,
  })
  .strict()
  .refine((s) => s.completed === (s.completedAt !== undefined), '步骤完成状态与完成时间不一致')
export const knowledgeNodeSchema = z
  .object({
    id,
    spaceId: id,
    title,
    parentId: id.nullable(),
    note: text.optional(),
    createdAt: time,
    updatedAt: time,
  })
  .strict()
export const knowledgeRelationSchema = z
  .object({
    id,
    spaceId: id,
    sourceNodeId: id,
    targetNodeId: id,
    createdAt: time,
  })
  .strict()
export const stepKnowledgeLinkSchema = z
  .object({
    id,
    stepId: id,
    knowledgeNodeId: id,
    createdAt: time,
  })
  .strict()
export type Space = z.infer<typeof spaceSchema>
export type Goal = z.infer<typeof goalSchema>
export type Step = z.infer<typeof stepSchema>
export type KnowledgeNode = z.infer<typeof knowledgeNodeSchema>
export type KnowledgeRelation = z.infer<typeof knowledgeRelationSchema>
export type StepKnowledgeLink = z.infer<typeof stepKnowledgeLinkSchema>
export interface Workspace {
  spaces: Space[]
  goals: Goal[]
  steps: Step[]
  knowledgeNodes: KnowledgeNode[]
  knowledgeRelations: KnowledgeRelation[]
  stepKnowledgeLinks: StepKnowledgeLink[]
}
export const EMPTY_WORKSPACE: Workspace = {
  spaces: [],
  goals: [],
  steps: [],
  knowledgeNodes: [],
  knowledgeRelations: [],
  stepKnowledgeLinks: [],
}
export interface Snapshot extends Workspace {
  version: typeof DATA_VERSION
  migrationWarnings: string[]
  cards: StudyCard[]
  reviews: Review[]
  settings: Settings
  algorithm: Algorithm
  revision: number
  undoId: string | null
  categories: CategoryEntry[]
}
export function friendlyError(error: unknown): string {
  if (error instanceof DOMException && error.name === 'QuotaExceededError')
    return '浏览器存储空间不足，未保存。请先导出备份，再释放设备空间或减少图片大小。'
  if (
    error instanceof DOMException &&
    ['SecurityError', 'InvalidStateError', 'UnknownError'].includes(error.name)
  )
    return '无法访问本地存储，未保存。请检查浏览器的隐私设置或磁盘空间，并保留当前页面。'
  if (error instanceof z.ZodError) return `数据格式不正确：${error.issues[0]?.message ?? '请检查文件内容'}。`
  return error instanceof Error ? error.message : '操作失败，数据未确认保存，请重试。'
}
