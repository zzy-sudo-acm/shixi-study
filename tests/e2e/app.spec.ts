import { readFile } from 'node:fs/promises'
import { test, expect, type Page } from '@playwright/test'

async function createSpaceWithNode(page: Page, space: string, node: string, note: string) {
  await page.goto('#home')
  await page.getByRole('button', { name: '新建领域', exact: true }).click()
  await page.getByLabel('领域名称').fill(space)
  await page.getByRole('button', { name: '创建领域', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.getByRole('link', { name: `进入 ${space}`, exact: true }).click()
  await page.getByRole('link', { name: '知识树', exact: true }).click()
  await page.getByRole('button', { name: '新建根节点', exact: true }).click()
  await page.getByRole('dialog').getByLabel('节点名称').fill(node)
  await page.getByRole('dialog').getByLabel('笔记', { exact: true }).fill(note)
  await page.getByRole('button', { name: '保存节点', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
}

test('完整备份导出与覆盖恢复', async ({ page }) => {
  await createSpaceWithNode(page, '数学探索', '极限与连续', '极限描述的是变化趋势。')
  await page.goto('#settings')
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '导出完整备份', exact: true }).click()
  const download = await downloadPromise
  const file = JSON.parse(await readFile((await download.path())!, 'utf8'))
  const backup = file.payload
  expect(backup.spaces.map((item: { name: string }) => item.name)).toContain('数学探索')
  expect(backup.knowledgeNodes.map((item: { title: string }) => item.title)).toContain('极限与连续')

  await page.goto('#home')
  await page.getByRole('button', { name: '新建领域', exact: true }).click()
  await page.getByLabel('领域名称').fill('临时领域')
  await page.getByRole('button', { name: '创建领域', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByRole('link', { name: '进入 临时领域', exact: true })).toBeVisible()

  await page.goto('#settings')
  await page.getByLabel('选择备份文件').setInputFiles({
    name: 'backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(file)),
  })
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByRole('checkbox', { name: '我已保存需要的备份，确认覆盖当前数据' }).check()
  await page.getByRole('button', { name: '确认覆盖恢复', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.goto('#home')
  await expect(page.getByRole('link', { name: '进入 数学探索', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: '进入 临时领域', exact: true })).toHaveCount(0)
})

test('三个入口导航与页面标题', async ({ page }) => {
  await page.goto('#home')
  await expect(page).toHaveTitle(/我的学习空间 · 时习/)
  await page.getByRole('link', { name: '知识库', exact: true }).click()
  await expect(page).toHaveTitle(/知识库 · 时习/)
  await page.getByRole('link', { name: '设置与备份', exact: true }).click()
  await expect(page).toHaveTitle(/设置与备份 · 时习/)
  await expect(page.getByRole('heading', { name: '备份与恢复', exact: true })).toBeVisible()
})
