import {
  cardSchema,
  categoryEntrySchema,
  EMPTY_WORKSPACE,
  normalizeCategoryPath,
  type StudyCard,
  type Workspace,
} from './model'
import { workspaceSchema } from './workspace'
import { z } from 'zod'

// Legacy records remain intact. Only real content produces spaces; never seed defaults.
export function migrateLegacy(
  cardsValue: unknown,
  categoriesValue: unknown,
): Workspace & { migrationWarnings: string[] } {
  const cards = z.array(cardSchema).parse(cardsValue)
  const categories = z.array(categoryEntrySchema).parse(categoriesValue ?? [])
  const data: Workspace = structuredClone(EMPTY_WORKSPACE),
    migrationWarnings: string[] = []
  const subjects = [...new Set([...cards.map((c) => c.subject), ...categories.map((c) => c.subject)])]
  const cardNode = new Map<string, string>()
  let serial = 0
  for (const [index, subject] of subjects.entries()) {
    const own = cards.filter((c) => c.subject === subject)
    const createdAt = own.length ? Math.min(...own.map((c) => c.createdAt)) : 0
    const updatedAt = own.length ? Math.max(...own.map((c) => c.updatedAt)) : createdAt
    const spaceId = `legacy-space-${index}`
    data.spaces.push({ id: spaceId, name: subject, createdAt, updatedAt })
    const paths = new Map<string, string>()
    function addPath(raw: string): string | null {
      const path = normalizeCategoryPath(raw)
      if (!path) return null
      const segments = path.split('/')
      if (segments.length > 5) {
        segments.splice(4, segments.length - 4, segments.slice(4).join(' / '))
        migrationWarnings.push(`“${raw}”超过五层，末级合并显示；原分类路径仍保留在卡片兼容数据中。`)
      }
      let parentId: string | null = null,
        prefix = ''
      for (const title of segments) {
        prefix = prefix ? `${prefix}/${title}` : title
        if (!paths.has(prefix)) {
          const id = `legacy-node-${serial++}`
          data.knowledgeNodes.push({ id, spaceId, title, parentId, createdAt, updatedAt })
          paths.set(prefix, id)
        }
        parentId = paths.get(prefix)!
      }
      return parentId
    }
    for (const entry of categories.filter((c) => c.subject === subject)) addPath(entry.path)
    for (const card of own) {
      let id = addPath(card.category)
      if (!id) {
        id = `legacy-node-${serial++}`
        data.knowledgeNodes.push({
          id,
          spaceId,
          title: (card.question.text.trim() || '图片记忆卡片').slice(0, 200),
          parentId: null,
          note: '原内容与图片保留在“记忆卡片”中。',
          createdAt: card.createdAt,
          updatedAt: card.updatedAt,
        })
      }
      cardNode.set(card.id, id)
    }
  }
  const byCard = new Map<string, StudyCard>(cards.map((c) => [c.id, c])),
    seen = new Set<string>()
  for (const card of cards)
    for (const otherId of card.relatedIds ?? []) {
      const sourceNodeId = cardNode.get(card.id)!,
        targetNodeId = cardNode.get(otherId)
      if (!targetNodeId || byCard.get(otherId)?.subject !== card.subject || sourceNodeId === targetNodeId)
        continue
      const pair = JSON.stringify([sourceNodeId, targetNodeId].sort())
      if (seen.has(pair)) continue
      seen.add(pair)
      data.knowledgeRelations.push({
        id: `legacy-relation-${seen.size}`,
        spaceId: data.knowledgeNodes.find((n) => n.id === sourceNodeId)!.spaceId,
        sourceNodeId,
        targetNodeId,
        createdAt: card.createdAt,
      })
    }
  if (cards.length || categories.length)
    migrationWarnings.unshift(
      `旧数据已升级：保留 ${cards.length} 张卡片，建立 ${data.spaces.length} 个领域与 ${data.knowledgeNodes.length} 个知识节点。旧卡片分类和关联仍可在“记忆卡片”中查看。`,
    )
  workspaceSchema.parse(data)
  return { ...data, migrationWarnings }
}
