import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { StoredImage, StudyCard } from './model'
import { DB_NAME } from './db'

export interface EditorDraft {
  card: StudyCard
  tagsText: string
  original: boolean
  images: StoredImage[]
  savedAt: number
}

interface DraftDB extends DBSchema {
  drafts: { key: string; value: EditorDraft }
}

// 草稿独立于主数据库：不进入备份，也不需要随主库迁移版本。
export const DRAFT_DB_NAME = `${DB_NAME}:drafts`
const DRAFT_KEY = 'new-card'
let connection: Promise<IDBPDatabase<DraftDB>> | undefined

function database() {
  if (!connection)
    connection = openDB<DraftDB>(DRAFT_DB_NAME, 1, {
      upgrade(db) {
        db.createObjectStore('drafts')
      },
      terminated() {
        connection = undefined
      },
    }).catch((error) => {
      connection = undefined
      throw error
    })
  return connection
}

export async function saveDraft(draft: EditorDraft) {
  try {
    await (await database()).put('drafts', draft, DRAFT_KEY)
  } catch {
    // 草稿只是防丢保障，写入失败不影响正常编辑
  }
}

export async function loadDraft(): Promise<EditorDraft | undefined> {
  try {
    return await (await database()).get('drafts', DRAFT_KEY)
  } catch {
    return undefined
  }
}

export async function clearDraft() {
  try {
    await (await database()).delete('drafts', DRAFT_KEY)
  } catch {
    // 同上，清除失败不阻断保存流程
  }
}

export async function closeDraftDatabase() {
  if (connection) (await connection).close()
  connection = undefined
}
