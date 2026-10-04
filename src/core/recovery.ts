import { openDB } from 'idb'
import { DB_NAME } from './db'

async function encode(value: unknown): Promise<unknown> {
  if (value instanceof Blob) {
    const bytes = new Uint8Array(await value.arrayBuffer())
    let binary = ''
    for (let i = 0; i < bytes.length; i += 32768)
      binary += String.fromCharCode(...bytes.subarray(i, i + 32768))
    return { recoveryType: 'Blob', mime: value.type, base64: btoa(binary) }
  }
  if (Array.isArray(value)) return Promise.all(value.map(encode))
  if (value && typeof value === 'object')
    return Object.fromEntries(
      await Promise.all(Object.entries(value).map(async ([key, v]) => [key, await encode(v)])),
    )
  return value
}
// Recovery is deliberately independent of current schemas and the version upgrade.
// It captures every store and key from an existing database without modifying it.
export async function exportRecoveryData(): Promise<string> {
  const db = await openDB(DB_NAME)
  try {
    const names = Array.from(db.objectStoreNames),
      tx = db.transaction(names, 'readonly')
    const entries = await Promise.all(
      names.map(async (name) => {
        const store = tx.objectStore(name)
        const [keys, values] = await Promise.all([store.getAllKeys(), store.getAll()])
        return [name, keys.map((key, i) => ({ key, value: values[i] }))]
      }),
    )
    await tx.done
    return JSON.stringify({
      app: 'shixi-study-recovery',
      databaseVersion: db.version,
      exportedAt: new Date().toISOString(),
      description: '原始数据恢复副本。包含原始键值和图片；不直接用于常规备份恢复，需修复数据格式后转换。',
      stores: await encode(Object.fromEntries(entries)),
    })
  } finally {
    db.close()
  }
}
