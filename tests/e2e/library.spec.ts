import { test, expect, type Page } from '@playwright/test'

async function createSpaceWithTree(page: Page) {
  await page.goto('#home')
  await page.getByRole('button', { name: '新建领域', exact: true }).click()
  await page.getByLabel('领域名称').fill('数学探索')
  await page.getByRole('button', { name: '创建领域', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.getByRole('link', { name: '进入 数学探索', exact: true }).click()
  await page.getByRole('link', { name: '知识树', exact: true }).click()
  await page.getByRole('button', { name: '新建根节点', exact: true }).click()
  await page.getByRole('dialog').getByLabel('节点名称').fill('极限与连续')
  await page.getByRole('dialog').getByLabel('笔记', { exact: true }).fill('极限描述的是变化趋势。')
  await page.getByRole('button', { name: '保存节点', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.getByRole('button', { name: '添加子节点', exact: true }).first().click()
  await page.getByRole('dialog').getByLabel('节点名称').fill('等价无穷小')
  await page.getByRole('button', { name: '保存节点', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
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
