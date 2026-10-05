import { test, expect, type Page } from '@playwright/test'
import { addNode, nodeAction, storedNodes } from './helpers'

async function setup(page: Page) {
  await page.goto('#home')
  await page.getByRole('button', { name: '新建领域', exact: true }).click()
  await page.getByLabel('领域名称').fill('交互工作台')
  await page.getByRole('button', { name: '创建领域', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.getByRole('link', { name: '进入 交互工作台', exact: true }).click()
  await page.getByRole('link', { name: '编辑知识树', exact: true }).click()
  await addNode(page, '原始名称', '原始笔记')
  await addNode(page, '另一个节点', '另一份笔记')
  await page.getByRole('button', { name: '打开 原始名称', exact: true }).click()
}

test('目录和节点图切换为纯正文编辑和实时预览，保存与重命名保持 ID', async ({ page }, info) => {
  await setup(page)
  const original = (await storedNodes(page)).find((node) => node.title === '原始名称')
  await expect(page.getByRole('region', { name: '知识树目录', exact: true })).toBeHidden()
  await expect(page.locator('.stable-graph-node')).toHaveCount(0)
  const content =
    '# 极限\n\n**重点**：极限描述的是变化趋势，如 $\\lim_{x \\to 0} e^x = 1$。\n\n- 第一条\n- 第二条\n\n<script>只是文字</script>'
  await page.getByLabel('实时编辑知识内容', { exact: true }).fill(content)
  const point = page.locator('.document-preview')
  await expect(point.locator('strong')).toHaveText('重点')
  await expect(point.locator('li')).toHaveCount(2)
  await expect(point.locator('.math-inline .katex')).toBeVisible()
  await expect(point).toContainText('<script>只是文字</script>')
  await expect(point.locator('script')).toHaveCount(0)
  expect((await storedNodes(page)).find((node) => node.id === original.id).note).toBe('原始笔记')
  await page.getByRole('button', { name: '保存修改', exact: true }).click()
  await expect(page.locator('.document-toolbar')).toContainText('已保存在本机')
  await page.screenshot({ path: info.outputPath('markdown-editor.png'), fullPage: true })
  await page.getByRole('button', { name: '返回目录', exact: true }).click()
  await expect(page.locator('.stable-graph-node')).toHaveCount(2)
  await nodeAction(page, '原始名称', '重命名')
  await page.getByLabel('节点名称', { exact: true }).fill('新的知识名称')
  await page.getByRole('button', { name: '保存名称', exact: true }).click()
  await expect(page.getByLabel('节点名称', { exact: true })).toHaveCount(0)
  await page.reload()
  await page.getByRole('button', { name: '打开 新的知识名称', exact: true }).click()
  await expect(page.getByLabel('实时编辑知识内容', { exact: true })).toHaveValue(content)
  const saved = (await storedNodes(page)).find((node) => node.id === original.id)
  expect(saved.title).toBe('新的知识名称')
  expect(saved.note).toBe(content)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
})

const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
)
test('插入图片在右侧渲染并随正文持久化', async ({ page }) => {
  await setup(page)
  await page
    .locator('input[type=file]')
    .setInputFiles({ name: 'pixel.png', mimeType: 'image/png', buffer: png })
  await expect(page.getByLabel('实时编辑知识内容', { exact: true })).toHaveValue(/!\[pixel\.png\]\(img:/)
  await expect(page.locator('.document-preview .image-thumb img')).toBeVisible()
  await page.getByRole('button', { name: '保存修改', exact: true }).click()
  await expect(page.locator('.document-toolbar')).toContainText('已保存在本机')
  await page.reload()
  await page.getByRole('button', { name: '打开 原始名称', exact: true }).click()
  await expect(page.locator('.document-preview .image-thumb img')).toBeVisible()
})

test('图片粘贴和 Markdown 图片链接可预览', async ({ page }) => {
  await setup(page)
  await page.getByLabel('实时编辑知识内容', { exact: true }).evaluate((element, base64) => {
    const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0))
    const clipboard = new DataTransfer()
    clipboard.items.add(new File([bytes], 'pasted.png', { type: 'image/png' }))
    element.dispatchEvent(
      new ClipboardEvent('paste', { clipboardData: clipboard, bubbles: true, cancelable: true }),
    )
  }, png.toString('base64'))
  await expect(page.locator('.document-preview .image-thumb img')).toBeVisible()
  await page.route('https://example.test/image.png', (route) =>
    route.fulfill({ body: png, contentType: 'image/png' }),
  )
  await page
    .getByLabel('实时编辑知识内容', { exact: true })
    .fill('![图片说明](https://example.test/image.png)')
  await expect(page.locator('.document-preview .markdown-image')).toBeVisible()
  await expect(page.locator('.document-preview .markdown-image')).toHaveAttribute('alt', '图片说明')
})

test('返回目录和离开页面都保护未保存正文，确认放弃不会写入数据', async ({ page }) => {
  await setup(page)
  await page.getByLabel('实时编辑知识内容', { exact: true }).fill('未保存的内容')
  page.once('dialog', (dialog) => void dialog.dismiss())
  await page.getByRole('button', { name: '返回目录', exact: true }).click()
  await expect(page.getByLabel('实时编辑知识内容', { exact: true })).toHaveValue('未保存的内容')
  page.once('dialog', (dialog) => void dialog.dismiss())
  await page.getByRole('link', { name: '学习空间', exact: true }).click()
  await expect(page.getByLabel('实时编辑知识内容', { exact: true })).toHaveValue('未保存的内容')
  page.once('dialog', (dialog) => void dialog.accept())
  await page.getByRole('button', { name: '返回目录', exact: true }).click()
  await page.getByRole('button', { name: '打开 另一个节点', exact: true }).click()
  await expect(page.getByLabel('实时编辑知识内容', { exact: true })).toHaveValue('另一份笔记')
  expect((await storedNodes(page)).find((node) => node.title === '原始名称').note).toBe('原始笔记')
})

test('保存失败保留正文和预览，恢复后可再次保存', async ({ page }) => {
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
  await page.getByRole('button', { name: '保存修改', exact: true }).click()
  await expect(page.locator('.notice.error')).toBeVisible()
  await expect(page.getByLabel('实时编辑知识内容', { exact: true })).toHaveValue('保存失败仍需保留的内容')
  await expect(page.locator('.document-preview')).toContainText('保存失败仍需保留的内容')
  await page.evaluate(() => (window as any).restoreStudioPut())
  await page.getByRole('button', { name: '保存修改', exact: true }).click()
  await expect(page.locator('.document-toolbar')).toContainText('已保存在本机')
  expect((await storedNodes(page)).find((node) => node.title === '原始名称').note).toBe(
    '保存失败仍需保留的内容',
  )
})

test('首页不再提供球体创建按钮或领域快捷操作', async ({ page }) => {
  await setup(page)
  await page.getByRole('link', { name: '学习空间', exact: true }).click()
  await expect(page.locator('.knowledge-orb')).toHaveJSProperty('tagName', 'DIV')
  await expect(page.locator('.orb-create-mark, .space-actions, .space-continue')).toHaveCount(0)
  await expect(page.getByRole('button', { name: '新建领域', exact: true })).toHaveCount(1)
  await expect(page.getByRole('link', { name: '进入 交互工作台', exact: true })).toBeVisible()
})
