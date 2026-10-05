import { expect, type Page } from '@playwright/test'

export async function nodeAction(page: Page, title: string, action: string) {
  await page.getByRole('button', { name: `操作 ${title}`, exact: true }).click()
  await page
    .getByRole('group', { name: `${title} 的操作`, exact: true })
    .getByRole('button', { name: action, exact: true })
    .click()
}
export async function addNode(page: Page, title: string, note = '', parent?: string) {
  if (parent) await nodeAction(page, parent, '添加子节点')
  else await page.getByRole('button', { name: '新建根节点', exact: true }).click()
  await page.getByLabel('节点名称', { exact: true }).fill(title)
  await page.getByRole('button', { name: '保存名称', exact: true }).click()
  await expect(page.getByLabel('节点名称', { exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: `打开 ${title}`, exact: true })).toBeVisible()
  if (note) {
    await page.getByRole('button', { name: `打开 ${title}`, exact: true }).click()
    await page.getByLabel('实时编辑知识内容', { exact: true }).fill(note)
    await page.getByRole('button', { name: '保存修改', exact: true }).click()
    await expect(page.locator('.document-toolbar')).toContainText('已保存在本机')
    await page.getByRole('button', { name: '返回目录', exact: true }).click()
  }
}
export async function editSpace(page: Page, name: string) {
  await page.goto('#home')
  await page.getByRole('link', { name: `进入 ${name}`, exact: true }).click()
  await page.getByRole('button', { name: '编辑领域', exact: true }).click()
}
export async function storedNodes(page: Page) {
  return page.evaluate(async () => {
    const name = (await indexedDB.databases()).find(
      (item) => item.name?.startsWith('shixi:') && !item.name.endsWith(':drafts'),
    )!.name!
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(name)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    const nodes = await new Promise<any[]>((resolve) => {
      const request = db.transaction('knowledgeNodes').objectStore('knowledgeNodes').getAll()
      request.onsuccess = () => resolve(request.result)
    })
    db.close()
    return nodes
  })
}
export async function seedLegacyPlan(page: Page, spaceId: string, nodeId?: string) {
  await page.evaluate(
    async ({ spaceId, nodeId }) => {
      const name = (await indexedDB.databases()).find(
        (item) => item.name?.startsWith('shixi:') && !item.name.endsWith(':drafts'),
      )!.name!
      const db = await new Promise<IDBDatabase>((resolve) => {
        const request = indexedDB.open(name)
        request.onsuccess = () => resolve(request.result)
      })
      const tx = db.transaction(['goals', 'steps', 'stepKnowledgeLinks'], 'readwrite')
      tx.objectStore('goals').put({
        id: 'legacy-goal',
        spaceId,
        title: '旧学习计划',
        parentGoalId: null,
        createdAt: 1000,
        updatedAt: 1000,
      })
      tx.objectStore('steps').put({
        id: 'legacy-step',
        goalId: 'legacy-goal',
        title: '旧步骤',
        completed: false,
        createdAt: 1000,
        updatedAt: 1000,
      })
      if (nodeId)
        tx.objectStore('stepKnowledgeLinks').put({
          id: 'legacy-link',
          stepId: 'legacy-step',
          knowledgeNodeId: nodeId,
          createdAt: 1000,
        })
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      })
      db.close()
    },
    { spaceId, nodeId },
  )
  await page.reload()
}
