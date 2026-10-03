import { z } from 'zod'

export const SUBJECTS = ['高数', '英语', '408', '政治'] as const
export type Subject = (typeof SUBJECTS)[number]
export const KINDS = ['knowledge', 'exercise', 'word', 'sentence'] as const
export type Kind = (typeof KINDS)[number]
export const KIND_NAMES: Record<Kind, string> = {
  knowledge: '知识点',
  exercise: '练习题',
  word: '单词',
  sentence: '句子',
}
export function kindsForSubject(subject: Subject): readonly Kind[] {
  return subject === '英语' ? ['word', 'sentence'] : ['knowledge', 'exercise']
}
export const FACE_NAMES: Record<Kind, { question: string; answer: string }> = {
  knowledge: { question: '问题', answer: '答案与解析' },
  exercise: { question: '问题', answer: '答案与解析' },
  word: { question: '单词或短语', answer: '释义与用法' },
  sentence: { question: '英文句子', answer: '翻译与解析' },
}
export const CATEGORY_GROUPS: Partial<Record<Subject, { group: string; topics: string[] }[]>> = {
  高数: [
    {
      group: '高等数学',
      topics: [
        '函数与极限',
        '导数与微分',
        '微分中值定理与导数应用',
        '不定积分',
        '定积分及其应用',
        '常微分方程',
        '多元函数微分学',
        '重积分',
        '无穷级数',
        '向量代数与空间解析几何',
      ],
    },
    {
      group: '线性代数',
      topics: ['行列式', '矩阵', '向量', '线性方程组', '特征值与特征向量', '二次型'],
    },
    {
      group: '概率论与数理统计',
      topics: [
        '随机事件与概率',
        '随机变量及其分布',
        '多维随机变量',
        '数字特征',
        '大数定律与中心极限定理',
        '数理统计',
      ],
    },
  ],
  '408': [{ group: '408', topics: ['数据结构', '计算机组成原理', '操作系统', '计算机网络'] }],
  政治: [{ group: '政治', topics: ['马原', '毛中特', '史纲', '思修与法基', '时政'] }],
}
export function categoriesFor(subject: Subject): string[] {
  return (CATEGORY_GROUPS[subject] ?? []).flatMap((g) => g.topics)
}
export const FAMILIARITY_NAMES = ['未标记', '陌生', '眼熟', '熟练'] as const
export const DATA_VERSION = 2
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
    subject: z.enum(SUBJECTS),
    kind: z.enum(KINDS),
    status: z.enum(['draft', 'ready']),
    question: contentSchema,
    answer: contentSchema,
    chapter: z.string().max(200),
    category: z.string().max(100).default(''),
    familiarity: z.number().int().min(0).max(3).default(0),
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
    lastSubject: z.enum(SUBJECTS),
    reminderTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    reminderEnabled: z.boolean(),
  })
  .strict()
export type Settings = z.infer<typeof settingsSchema>
export const DEFAULT_SETTINGS: Settings = {
  dailyNewLimit: 20,
  lastSubject: '高数',
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
export interface Snapshot {
  cards: StudyCard[]
  reviews: Review[]
  settings: Settings
  algorithm: Algorithm
  revision: number
  undoId: string | null
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
