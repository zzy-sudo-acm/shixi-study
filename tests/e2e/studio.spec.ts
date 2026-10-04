import { test, expect, type Page } from '@playwright/test'

async function addNode(page: Page, title: string, note: string) {
  await page.getByRole('button', { name: '新建根节点', exact: true }).click()
  await page.getByRole('dialog').getByLabel('节点名称').fill(title)
  await page.getByRole('dialog').getByLabel('笔记', { exact: true }).fill(note)
  await page.getByRole('dialog').getByRole('button', { name: '保存节点', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
}
async function setup(page: Page) {
  await page.goto('#home')
  await page.getByRole('button', { name: '新建领域', exact: true }).click()
  await page.getByLabel('领域名称').fill('交互工作台')
  await page.getByRole('button', { name: '创建领域', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.getByRole('link', { name: '进入 交互工作台', exact: true }).click()
  await page.getByRole('link', { name: '知识树', exact: true }).click()
  await addNode(page, '原始名称', '原始笔记')
  await addNode(page, '另一个节点', '另一份笔记')
  await page.locator('.tree-name').filter({ hasText: '原始名称' }).click()
}
async function storedNodes(page: Page) {
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

test('左侧草稿实时呈现于笔记、图谱与手机，保存后 ID 和内容持久化', async ({ page }) => {
  await setup(page)
  const original = (await storedNodes(page)).find((node) => node.title === '原始名称')
  await page.getByLabel('实时编辑知识名称', { exact: true }).fill('新的知识名称')
  await page.getByLabel('实时编辑知识内容', { exact: true }).fill('第一行理解\n第二行总结')
  await expect(page.getByRole('region', { name: '知识详情 新的知识名称', exact: true })).toContainText(
    '第二行总结',
  )
  expect((await storedNodes(page)).find((node) => node.id === original.id).title).toBe('原始名称')
  await page.getByRole('button', { name: '图谱预览', exact: true }).click()
  await expect(page.locator('.stable-graph-node').filter({ hasText: '新的知识名称' })).toBeVisible()
  await page.getByRole('button', { name: '手机预览', exact: true }).click()
  await expect(page.locator('.phone-note h3')).toHaveText('新的知识名称')
  await page.getByRole('button', { name: '阅读笔记', exact: true }).click()
  await expect(page.locator('.phone-note')).toContainText('第二行总结')
  await page.getByRole('button', { name: '收起笔记', exact: true }).click()
  await expect(page.locator('.phone-note')).not.toContainText('第二行总结')
  await page.locator('.inline-save-actions').getByRole('button', { name: '保存修改', exact: true }).click()
  await expect(page.locator('.inline-editor-heading')).toContainText('已保存在本机')
  await page.reload()
  await page.locator('.tree-name').filter({ hasText: '新的知识名称' }).click()
  await expect(page.getByLabel('实时编辑知识内容', { exact: true })).toHaveValue('第一行理解\n第二行总结')
  const saved = (await storedNodes(page)).find((node) => node.id === original.id)
  expect(saved.title).toBe('新的知识名称')
  expect(saved.note).toBe('第一行理解\n第二行总结')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
})

test('未保存的编辑在切换节点和离开页面时保护，确认放弃后不写入数据', async ({ page }) => {
  await setup(page)
  await page.getByLabel('实时编辑知识内容', { exact: true }).fill('未保存的内容')
  page.once('dialog', (dialog) => void dialog.dismiss())
  await page.locator('.tree-name').filter({ hasText: '另一个节点' }).click()
  await expect(page.getByLabel('实时编辑知识内容', { exact: true })).toHaveValue('未保存的内容')
  page.once('dialog', (dialog) => void dialog.dismiss())
  await page.getByRole('link', { name: '学习空间', exact: true }).click()
  await expect(page.getByLabel('实时编辑知识内容', { exact: true })).toHaveValue('未保存的内容')
  page.once('dialog', (dialog) => void dialog.accept())
  await page.locator('.tree-name').filter({ hasText: '另一个节点' }).click()
  await expect(page.getByLabel('实时编辑知识内容', { exact: true })).toHaveValue('另一份笔记')
  expect((await storedNodes(page)).find((node) => node.title === '原始名称').note).toBe('原始笔记')
})

test('保存失败保留左侧草稿和右侧呈现，可恢复后再次保存', async ({ page }) => {
  await setup(page)
  await page.getByLabel('实时编辑知识内容', { exact: true }).fill('保存失败仍需保留的内容')
  await page.evaluate(() => {
    const original = IDBObjectStore.prototype.put
    ;(window as any).restoreStudioPut = () => {
      IDBObjectStore.prototype.put = original
    }
    IDBObjectStore.prototype.put = function (...args) {
      if (this.name === 'knowledgeNodes') throw new DOMException('test storage failure', 'QuotaExceededError')
      return original.apply(this, args as Parameters<typeof original>)
    }
  })
  await page.locator('.inline-save-actions').getByRole('button', { name: '保存修改', exact: true }).click()
  await expect(page.locator('.notice.error')).toBeVisible()
  await expect(page.getByLabel('实时编辑知识内容', { exact: true })).toHaveValue('保存失败仍需保留的内容')
  await expect(page.getByRole('region', { name: '知识详情 原始名称', exact: true })).toContainText(
    '保存失败仍需保留的内容',
  )
  await page.evaluate(() => (window as any).restoreStudioPut())
  await page.locator('.inline-save-actions').getByRole('button', { name: '保存修改', exact: true }).click()
  await expect(page.locator('.inline-editor-heading')).toContainText('已保存在本机')
  expect((await storedNodes(page)).find((node) => node.title === '原始名称').note).toBe(
    '保存失败仍需保留的内容',
  )
})
