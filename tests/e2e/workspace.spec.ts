import { readFile } from 'node:fs/promises'
import { test, expect, type Page } from '@playwright/test'

async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true)
}
async function createSpace(page: Page, name = '机器学习') {
  await page.goto('#home')
  await page.getByRole('button', { name: '新建领域', exact: true }).click()
  await page.getByLabel('领域名称').fill(name)
  await page.getByRole('button', { name: '创建领域', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.getByRole('link', { name: `进入 ${name}`, exact: true }).click()
  await expect(page.getByRole('heading', { name, exact: true })).toBeVisible()
  return page.url().split('#space/')[1].split('/')[0]
}
async function addGoal(page: Page, title: string, parentTitle?: string) {
  if (parentTitle)
    await page
      .getByRole('region', { name: `目标 ${parentTitle}`, exact: true })
      .getByRole('button', { name: '添加子目标', exact: true })
      .first()
      .click()
  else await page.getByRole('button', { name: '新建目标', exact: true }).click()
  await page.getByLabel('目标名称').fill(title)
  await page.getByRole('button', { name: '创建目标', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
}
async function addStep(page: Page, goalTitle: string, title: string) {
  await page
    .getByRole('region', { name: `目标 ${goalTitle}`, exact: true })
    .getByRole('button', { name: '添加步骤', exact: true })
    .first()
    .click()
  await page.getByLabel('步骤名称').fill(title)
  await page.getByRole('dialog').getByRole('button', { name: '添加步骤', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
}
async function addNode(page: Page, title: string, note = '', child = false) {
  await page.getByRole('button', { name: child ? '添加子节点' : '新建根节点', exact: true }).click()
  await page.getByLabel('节点名称').fill(title)
  if (note) await page.getByLabel('笔记', { exact: true }).fill(note)
  await page.getByRole('button', { name: '保存节点', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.locator('.node-point')).toContainText(title)
}
async function readWorkspace(page: Page) {
  return page.evaluate(async () => {
    const name = (await indexedDB.databases()).find(
      (d) => d.name?.startsWith('shixi:') && !d.name.endsWith(':drafts'),
    )!.name!
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open(name)
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
    const names = ['spaces', 'goals', 'steps', 'knowledgeNodes', 'knowledgeRelations', 'stepKnowledgeLinks']
    const tx = db.transaction(names)
    const entries = await Promise.all(
      names.map(
        (name) =>
          new Promise<[string, any[]]>((resolve, reject) => {
            const req = tx.objectStore(name).getAll()
            req.onsuccess = () => resolve([name, req.result])
            req.onerror = () => reject(req.error)
          }),
      ),
    )
    db.close()
    return Object.fromEntries(entries)
  })
}

test('真实白板、自定义领域、编辑与两次删除确认', async ({ page }, info) => {
  await page.goto('')
  await expect(page.getByRole('heading', { name: '我的学习空间', exact: true })).toBeVisible()
  await expect(page.getByText('还没有任何领域。', { exact: true })).toBeVisible()
  expect((await readWorkspace(page)).spaces).toEqual([])
  await page.screenshot({ path: info.outputPath('workspace-empty.png'), fullPage: true })
  await noOverflow(page)
  await createSpace(page, 'C++ / 现代编程')
  await expect(page.getByText('尚未建立计划', { exact: true })).toBeVisible()
  await expect(page.locator('progress')).toHaveCount(0)
  await page.getByRole('button', { name: '编辑领域', exact: true }).click()
  await page.getByLabel('领域名称').fill('自己的领域')
  await page.getByRole('button', { name: '选择图标', exact: true }).click()
  await page.getByRole('button', { name: '自定义 emoji', exact: true }).click()
  await page.getByLabel('其他 emoji 或符号').fill('⌘')
  await page.getByRole('button', { name: '保存修改' }).click()
  await expect(page.getByRole('heading', { name: '自己的领域', exact: true })).toBeVisible()
  await page.goto('#home')
  await page.getByRole('button', { name: '删除 自己的领域', exact: true }).click()
  await expect(page.getByRole('button', { name: '确认删除领域' })).toBeDisabled()
  await page.getByLabel('我确认删除该领域及其内容').check()
  await expect(page.getByRole('button', { name: '确认删除领域' })).toBeDisabled()
  await page.getByLabel('再次输入领域名称').fill('自己的领域')
  await page.getByRole('button', { name: '确认删除领域' }).click()
  await expect(page.getByText('还没有任何领域。', { exact: true })).toBeVisible()
})

test('图标点选预览、颜色跟随、键盘与旧符号持久化', async ({ page }) => {
  await page.goto('#home')
  await page.getByRole('button', { name: '新建领域', exact: true }).click()
  await page.getByLabel('领域名称').fill('图标体验')
  const preview = page.locator('.icon-preview')
  await expect(preview.locator('[data-icon="book"] svg')).toBeVisible()
  await page.getByRole('button', { name: '选择图标', exact: true }).click()
  await expect(page.getByRole('group', { name: '线条图标' }).getByRole('button')).toHaveCount(12)
  await page.getByRole('button', { name: '选择图标 代码', exact: true }).focus()
  await page.keyboard.press('Enter')
  await expect(preview.locator('[data-icon="code"] svg')).toBeVisible()
  await expect(page.getByRole('button', { name: '选择图标', exact: true })).toBeFocused()
  await page.getByRole('button', { name: '选择颜色 #527668', exact: true }).click()
  await expect(preview).toHaveCSS('color', 'rgb(82, 118, 104)')
  await page.getByRole('button', { name: '选择图标', exact: true }).click()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByRole('group', { name: '线条图标' })).toHaveCount(0)
  page.once('dialog', (dialog) => void dialog.dismiss())
  await page.getByRole('button', { name: '关闭对话框', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByRole('button', { name: '创建领域', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  expect((await readWorkspace(page)).spaces[0].icon).toBe('icon:code')
  await page.reload()
  await page.getByRole('button', { name: '编辑 图标体验', exact: true }).click()
  await expect(preview.locator('[data-icon="code"] svg')).toBeVisible()
  await page.getByRole('button', { name: '关闭对话框', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)

  await page.getByRole('button', { name: '编辑 图标体验', exact: true }).click()
  await page.getByRole('button', { name: '选择图标', exact: true }).click()
  await page.getByRole('button', { name: '自定义 emoji', exact: true }).click()
  await page.getByRole('button', { name: '选择 emoji 🐱', exact: true }).click()
  await expect(preview).toHaveText('🐱')
  await page.getByRole('button', { name: '保存修改', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.reload()
  await page.getByRole('button', { name: '编辑 图标体验', exact: true }).click()
  await expect(preview).toHaveText('🐱')
  await page.getByRole('button', { name: '关闭对话框', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)

  await page.getByRole('button', { name: '编辑 图标体验', exact: true }).click()
  await page.getByRole('button', { name: '选择图标', exact: true }).click()
  await expect(page.getByLabel('其他 emoji 或符号')).toHaveValue('🐱')
  await page.getByLabel('其他 emoji 或符号').fill('⌘')
  await expect(preview).toHaveText('⌘')
  await noOverflow(page)
  await page.getByRole('button', { name: '保存修改', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.reload()
  await page.getByRole('button', { name: '编辑 图标体验', exact: true }).click()
  await expect(preview).toHaveText('⌘')
  await page.getByRole('button', { name: '关闭对话框', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  expect((await readWorkspace(page)).spaces[0].icon).toBe('⌘')
})

test('目标最多三层、步骤完成取消、实际进度与递归删除', async ({ page }) => {
  await createSpace(page)
  await addGoal(page, '基础阶段')
  await addGoal(page, '课程学习', '基础阶段')
  await addGoal(page, '第一章', '课程学习')
  const third = page.getByRole('region', { name: '目标 第一章', exact: true })
  await expect(third.getByRole('button', { name: '添加子目标', exact: true })).toHaveCount(0)
  await addStep(page, '课程学习', '读完课程')
  await addStep(page, '第一章', '完成练习')
  await page.getByLabel('完成 读完课程', { exact: true }).check()
  await expect(page.locator('.space-summary')).toContainText('50%')
  await expect(page.locator('.space-summary')).toContainText('1 / 2 步骤完成')
  await page.getByLabel('完成 读完课程', { exact: true }).uncheck()
  await expect(page.locator('.space-summary')).toContainText('0%')
  await page.getByRole('button', { name: '编辑步骤 完成练习', exact: true }).click()
  await page.getByLabel('步骤名称').fill('独立完成练习')
  await page.getByRole('button', { name: '保存修改' }).click()
  await expect(page.getByLabel('完成 独立完成练习', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: '编辑目标 基础阶段', exact: true }).click()
  await page.getByLabel('目标名称').fill('基础阶段改名')
  await page.getByRole('button', { name: '保存修改' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByRole('heading', { name: '基础阶段改名', exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: '基础阶段改名', exact: true })).toBeVisible()
  await noOverflow(page)
  page.once('dialog', (d) => void d.accept())
  await page.getByRole('button', { name: '删除目标 基础阶段改名', exact: true }).click()
  await expect(page.getByText('准备怎么学？', { exact: true })).toBeVisible()
  const data = await readWorkspace(page)
  expect(data.goals).toEqual([])
  expect(data.steps).toEqual([])
  await expect(page.locator('.space-summary')).toContainText('尚未建立计划')
})

test('知识树 ID 稳定、移动、折叠、笔记与五层上限', async ({ page }) => {
  const spaceId = await createSpace(page, '网络工程')
  await page.getByRole('link', { name: '知识树', exact: true }).click()
  await addNode(page, '网络协议', '自己的笔记\n<script>只是文字</script>')
  await addNode(page, '传输层', '', true)
  await addNode(page, 'TCP', '', true)
  await addNode(page, '拥塞控制', '', true)
  await addNode(page, '慢启动', '', true)
  await expect(page.getByRole('button', { name: '添加子节点', exact: true })).toBeDisabled()
  const before = await readWorkspace(page),
    rootId = before.knowledgeNodes.find((n: any) => n.title === '网络协议').id
  await page.locator('.tree-name').filter({ hasText: '网络协议' }).click()
  await page.getByRole('button', { name: '重命名', exact: true }).click()
  await page.getByLabel('节点名称').fill('协议体系')
  await page.getByRole('button', { name: '保存节点' }).click()
  await expect(page.locator('.node-point')).toContainText('<script>只是文字</script>')
  await expect(page.locator('.node-point h3')).toHaveText('协议体系')
  expect((await readWorkspace(page)).knowledgeNodes.find((n: any) => n.id === rootId).title).toBe('协议体系')
  await page.getByRole('button', { name: '收起 协议体系', exact: true }).click()
  await expect(page.locator('.tree-name').filter({ hasText: '慢启动' })).toHaveCount(0)
  await page.getByRole('button', { name: '展开 协议体系', exact: true }).click()
  await page.locator('.tree-name').filter({ hasText: '传输层' }).click()
  await page.getByRole('button', { name: '移动节点', exact: true }).click()
  await expect(page.getByLabel('父节点').locator('option')).toHaveCount(2)
  await page.getByLabel('父节点').selectOption('')
  await page.getByRole('button', { name: '确认移动' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  const after = await readWorkspace(page)
  expect(after.knowledgeNodes.find((n: any) => n.title === '传输层').parentId).toBeNull()
  await page.reload()
  await page.goto(`#space/${spaceId}/tree?node=${rootId}`)
  await expect(page.getByRole('heading', { name: '协议体系', exact: true })).toBeVisible()
  await noOverflow(page)
})

test('知识关系、图谱高亮、步骤双向关联、完成不改变知识', async ({ page }, info) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  const spaceId = await createSpace(page, '数学探索')
  await addGoal(page, '强化课程')
  await addStep(page, '强化课程', '多元微分')
  await page.getByRole('link', { name: '知识树', exact: true }).click()
  await addNode(page, '微分')
  await addNode(page, '偏导数', '先理解定义', true)
  await addNode(page, '极限')
  await page.locator('.tree-name').filter({ hasText: '偏导数' }).click()
  await page.getByRole('button', { name: '建立关联', exact: true }).click()
  await page.getByLabel('搜索相关知识').fill('极限')
  await page.locator('.relation-choices').getByRole('button', { name: '极限', exact: true }).click()
  await expect(page.locator('.detail-links')).toContainText('极限')
  await expect(
    page.locator('.relation-choices').getByRole('button', { name: '极限', exact: true }),
  ).toHaveCount(0)
  await expect(page.locator('.graph-relation')).toHaveCount(1)
  await page.locator('.stable-graph-node').filter({ hasText: '偏导数' }).click()
  await expect(page.locator('.stable-graph-node.connected')).toHaveCount(2)
  await page.getByRole('button', { name: '重置图谱缩放' }).click()
  await page.getByRole('button', { name: '缩小图谱' }).click()
  await expect(page.getByRole('button', { name: '重置图谱缩放' })).toHaveText('85%')
  await page.getByRole('button', { name: '总览', exact: true }).click()
  await noOverflow(page)
  await page.getByRole('link', { name: '目标', exact: true }).click()
  await page.getByRole('button', { name: '关联知识 多元微分', exact: true }).click()
  await page
    .getByRole('dialog')
    .getByRole('checkbox', { name: /偏导数/ })
    .check()
  await expect(page.locator('.selected-links')).toContainText('偏导数')
  await page.getByRole('button', { name: '完成关联', exact: true }).click()
  const nodesBefore = (await readWorkspace(page)).knowledgeNodes
  await page.getByLabel('完成 多元微分', { exact: true }).check()
  await expect(page.locator('.space-summary')).toContainText('100%')
  expect((await readWorkspace(page)).knowledgeNodes).toEqual(nodesBefore)
  await page.getByRole('link', { name: '知识树', exact: true }).click()
  await expect(page.locator('.task-links')).toContainText('强化课程 · 多元微分')
  await expect(page.locator('.task-links').getByLabel('已完成')).toBeVisible()
  await page.screenshot({ path: info.outputPath('workspace-linked-tree.png'), fullPage: true })
  await page.locator('.task-links').getByRole('link').click()
  await expect(page.locator('.focused-step')).toContainText('多元微分')
  await page.getByLabel('完成 多元微分', { exact: true }).uncheck()
  await page.goto(`#space/${spaceId}/tree`)
  await expect(page.locator('.task-links').getByLabel('未完成')).toBeVisible()
  page.once('dialog', (d) => void d.accept())
  await page.getByRole('button', { name: '删除节点', exact: true }).click()
  await expect(page.locator('.node-point')).toHaveCount(0)
  const after = await readWorkspace(page)
  expect(after.knowledgeRelations).toEqual([])
  expect(after.stepKnowledgeLinks).toEqual([])
  expect(after.steps).toHaveLength(1)
  expect(errors).toEqual([])
})

test('新版完整备份恢复所有实体，确认前不覆盖', async ({ page }, info) => {
  const spaceId = await createSpace(page)
  await addGoal(page, '看完课程')
  await addStep(page, '看完课程', '第一节')
  await page.getByRole('link', { name: '知识树', exact: true }).click()
  await addNode(page, '梯度')
  const before = await readWorkspace(page)
  await page.goto('#settings')
  const downloaded = page.waitForEvent('download')
  await page.getByRole('button', { name: '导出完整备份', exact: true }).click()
  const path = info.outputPath('workspace.backup.json')
  await (await downloaded).saveAs(path)
  await createSpace(page, '临时领域')
  await page.goto('#settings')
  await page.getByLabel('选择备份文件').setInputFiles(path)
  await expect(page.getByRole('dialog')).toContainText('1 个领域、1 个目标、1 个步骤、1 个知识节点')
  await expect(page.getByRole('button', { name: '确认覆盖恢复' })).toBeDisabled()
  expect((await readWorkspace(page)).spaces).toHaveLength(2)
  await page.getByLabel('我已保存需要的备份，确认覆盖当前数据').check()
  await page.getByRole('button', { name: '确认覆盖恢复' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  expect(await readWorkspace(page)).toEqual(before)
  await page.goto(`#space/${spaceId}/goals`)
  await page.reload()
  await expect(page.getByRole('heading', { name: '看完课程', exact: true })).toBeVisible()
})

test('大量知识节点按批次显示，窄屏不溢出', async ({ page }) => {
  const spaceId = await createSpace(page)
  await page.evaluate(async (spaceId) => {
    const name = (await indexedDB.databases()).find((d) => d.name?.startsWith('shixi:'))!.name!
    const db = await new Promise<IDBDatabase>((resolve) => {
      const req = indexedDB.open(name)
      req.onsuccess = () => resolve(req.result)
    })
    const tx = db.transaction('knowledgeNodes', 'readwrite')
    for (let i = 0; i < 3000; i++)
      tx.objectStore('knowledgeNodes').put({
        id: `n${i}`,
        spaceId,
        title: `合成节点 ${i}`,
        parentId: i ? 'n0' : null,
        createdAt: 1000,
        updatedAt: 1000,
      })
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
    db.close()
  }, spaceId)
  await page.goto(`#space/${spaceId}/graph`)
  await page.reload()
  await expect(page.locator('.stable-graph-node')).toHaveCount(100)
  await page.getByRole('button', { name: '再展开 100 个节点' }).click()
  await expect(page.locator('.stable-graph-node')).toHaveCount(200)
  await page.setViewportSize({ width: 320, height: 740 })
  await noOverflow(page)
  await page.getByRole('link', { name: '知识树', exact: true }).click()
  await expect(page.locator('.stable-tree-list .tree-name')).toHaveCount(100)
  await page.getByLabel('搜索知识树').fill('合成节点 2999')
  await expect(page.locator('.stable-tree-list .tree-name')).toHaveCount(1)
  await noOverflow(page)
})

test('真实浏览器 v2 升级保留旧卡片，不创建空科目', async ({ page }) => {
  await page.goto('favicon.svg')
  await page.evaluate(async () => {
    const name = `shixi:${location.pathname.replace(/\/[^/]*$/, '') || '/'}`
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open(name, 2)
      req.onupgradeneeded = () => {
        const d = req.result
        d.createObjectStore('cards', { keyPath: 'id' })
        d.createObjectStore('images', { keyPath: 'id' })
        d.createObjectStore('reviews', { keyPath: 'id' }).createIndex('by-card', 'cardId')
        d.createObjectStore('meta')
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
    const tx = db.transaction(['cards', 'meta'], 'readwrite')
    tx.objectStore('cards').put({
      id: 'old-card',
      subject: '日语',
      kind: 'word',
      status: 'ready',
      question: { text: 'ありがとう', images: [] },
      answer: { text: '谢谢', images: [] },
      chapter: '',
      category: '词汇/常用语',
      familiarity: 0,
      tags: [],
      book: '',
      page: '',
      number: '',
      createdAt: 1000,
      updatedAt: 1000,
      schedule: {
        due: 1000,
        stability: 0,
        difficulty: 0,
        elapsed_days: 0,
        scheduled_days: 0,
        learning_steps: 0,
        reps: 0,
        lapses: 0,
        state: 0,
      },
    })
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
    db.close()
  })
  await page.goto('./#home')
  await expect(page.getByRole('link', { name: '进入 日语', exact: true })).toBeVisible()
  await expect(page.locator('.space-card')).toHaveCount(1)
  await expect(page.getByText('旧数据已安全升级 · 查看说明')).toBeVisible()
  await page.getByRole('link', { name: '进入 日语', exact: true }).click()
  await expect(page.locator('.space-summary')).toContainText('尚未建立计划')
  await page.getByRole('link', { name: '知识树', exact: true }).click()
  await expect(page.locator('.tree-name')).toHaveCount(2)
  await page.goto('#settings')
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '导出完整备份', exact: true }).click()
  const backup = JSON.parse(await readFile((await (await downloadPromise).path())!, 'utf8')).payload
  expect(backup.cards.some((card: { id: string }) => card.id === 'old-card')).toBe(true)
})
