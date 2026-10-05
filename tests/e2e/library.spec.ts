import { test, expect, type Page } from '@playwright/test'
import { addNode, storedNodes } from './helpers'

async function createSpaceWithTree(page: Page) {
  await page.goto('#home')
  await page.getByRole('button', { name: '新建领域', exact: true }).click()
  await page.getByLabel('领域名称').fill('数学探索')
  await page.getByRole('button', { name: '创建领域', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.getByRole('link', { name: '进入 数学探索', exact: true }).click()
  await page.getByRole('link', { name: '编辑知识树', exact: true }).click()
  await addNode(page, '极限与连续', '极限描述的是变化趋势。')
  await addNode(page, '等价无穷小', '', '极限与连续')
}

test('知识库根节点卡片进入单树图谱，点节点看知识点，编辑按钮进入编辑器', async ({ page }) => {
  await createSpaceWithTree(page)
  await page.goto('#library')
  await expect(page.getByRole('heading', { name: '知识库', exact: true })).toBeVisible()
  await page.getByRole('link', { name: '查看知识树 极限与连续', exact: true }).click()
  await expect(page.getByRole('heading', { name: '极限与连续', exact: true })).toBeVisible()
  await expect(page.locator('.stable-graph-node')).toHaveCount(2)
  await expect(page.locator('.library-graph-hint')).toBeVisible()
  await page.locator('.stable-graph-node').filter({ hasText: '极限与连续' }).click()
  await expect(page.locator('.node-point')).toContainText('极限描述的是变化趋势')
  await page.getByRole('link', { name: '编辑这棵知识树', exact: true }).click()
  await expect(page.locator('.knowledge-studio')).toBeVisible()
  expect(page.url()).toContain('/tree')
})

test('没有知识树时知识库显示空态入口', async ({ page }) => {
  await page.goto('#library')
  await expect(page.getByRole('heading', { name: '还没有知识树', exact: true })).toBeVisible()
  await page.getByRole('link', { name: '去学习空间建立', exact: true }).click()
  await expect(page.getByRole('heading', { name: '我的学习空间', exact: true })).toBeVisible()
})
test('领域知识卡片仅显示本领域，知识库仍汇总所有领域', async ({ page }) => {
  await createSpaceWithTree(page)
  const firstSpace = (await storedNodes(page))[0].spaceId
  await page.goto('#home')
  await page.getByRole('button', { name: '新建领域', exact: true }).click()
  await page.getByLabel('领域名称').fill('计算机网络')
  await page.getByRole('button', { name: '创建领域', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.getByRole('link', { name: '进入 计算机网络', exact: true }).click()
  await page.getByRole('link', { name: '编辑知识树', exact: true }).click()
  await addNode(page, '网络协议')
  await page.goto(`#space/${firstSpace}/cards`)
  await expect(page.locator('.library-root-card')).toHaveCount(1)
  await expect(page.getByRole('link', { name: '查看知识树 极限与连续', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: '查看知识树 网络协议', exact: true })).toHaveCount(0)
  await page.goto('#library')
  await expect(page.locator('.library-root-card')).toHaveCount(2)
})
