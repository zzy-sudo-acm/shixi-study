import { readFile } from 'node:fs/promises'
import { test, expect, type Page } from '@playwright/test'
import { addNode as directoryAddNode, nodeAction, editSpace, seedLegacyPlan } from './helpers'

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
async function addNode(page: Page, title: string, note = '', child = false) {
  const parent = child
    ? (await page.locator('.directory-row.selected .directory-name').textContent())?.trim()
    : undefined
  await directoryAddNode(page, title, note, parent)
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
  await expect(page.getByRole('heading', { name: '知识卡片', exact: true })).toBeVisible()
  await expect(page.locator('progress')).toHaveCount(0)
  await page.getByRole('button', { name: '编辑领域', exact: true }).click()
  await page.getByLabel('领域名称').fill('自己的领域')
  await page.getByRole('button', { name: '选择图标', exact: true }).click()
  await page.getByRole('button', { name: '自定义 emoji', exact: true }).click()
  await page.getByLabel('其他 emoji 或符号').fill('⌘')
  await page.getByRole('button', { name: '保存修改' }).click()
  await expect(page.getByRole('heading', { name: '自己的领域', exact: true })).toBeVisible()
  await page.goto('#home')
  await page.getByRole('link', { name: '进入 自己的领域', exact: true }).click()
  await page.getByRole('button', { name: '删除领域', exact: true }).click()
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
  await editSpace(page, '图标体验')
  await expect(preview.locator('[data-icon="code"] svg')).toBeVisible()
  await page.getByRole('button', { name: '关闭对话框', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)

  await editSpace(page, '图标体验')
  await page.getByRole('button', { name: '选择图标', exact: true }).click()
  await page.getByRole('button', { name: '自定义 emoji', exact: true }).click()
  await page.getByRole('button', { name: '选择 emoji 🐱', exact: true }).click()
  await expect(preview).toHaveText('🐱')
  await page.getByRole('button', { name: '保存修改', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.reload()
  await editSpace(page, '图标体验')
  await expect(preview).toHaveText('🐱')
  await page.getByRole('button', { name: '关闭对话框', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)

  await editSpace(page, '图标体验')
  await page.getByRole('button', { name: '选择图标', exact: true }).click()
  await expect(page.getByLabel('其他 emoji 或符号')).toHaveValue('🐱')
  await page.getByLabel('其他 emoji 或符号').fill('⌘')
  await expect(preview).toHaveText('⌘')
  await noOverflow(page)
  await page.getByRole('button', { name: '保存修改', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.reload()
  await editSpace(page, '图标体验')
  await expect(preview).toHaveText('⌘')
  await page.getByRole('button', { name: '关闭对话框', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  expect((await readWorkspace(page)).spaces[0].icon).toBe('⌘')
})

test('领域直接进入知识卡片，首页节点直接阅读，编辑为等宽双框和命名树根', async ({ page }) => {
  const spaceId = await createSpace(page, '算法知识')
  await expect(page.getByRole('heading', { name: '知识卡片', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: '目标', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: '新建目标', exact: true })).toHaveCount(0)
  await page.getByRole('link', { name: '编辑知识树', exact: true }).click()
  await addNode(page, '排序', '排序的知识点')
  await addNode(page, '快速排序', '选择基准并分区', true)
  await expect(page.locator('.graph-tree-root')).toHaveText('算法知识')
  expect((await readWorkspace(page)).knowledgeNodes).toHaveLength(2)
  if (page.viewportSize()!.width > 850) {
    const left = (await page.locator('.studio-editor').boundingBox())!
    const right = (await page.locator('.studio-preview').boundingBox())!
    expect(Math.abs(left.width - right.width)).toBeLessThan(1)
    expect(Math.abs(left.height - right.height)).toBeLessThan(1)
    expect(right.x - left.x - left.width).toBeGreaterThan(15)
  }
  await page.locator('.stable-graph-node').filter({ hasText: '快速排序' }).click()
  await expect(page.getByLabel('实时编辑知识内容')).toHaveValue('选择基准并分区')
  await page.goto('#home')
  const card = page.locator('.space-card')
  expect((await card.boundingBox())!.height).toBeGreaterThanOrEqual(310)
  await page.getByRole('link', { name: '阅读知识点 快速排序', exact: true }).click()
  await expect(page.locator('.node-point')).toContainText('选择基准并分区')
  await page.goto('#home')
  await page.getByRole('link', { name: '进入 算法知识', exact: true }).click()
  await page.getByRole('link', { name: '查看知识树 排序', exact: true }).click()
  await page.locator('.stable-graph-node').filter({ hasText: '快速排序' }).click()
  await expect(page.locator('.node-point')).toContainText('选择基准并分区')
  await page.goto('#space/' + spaceId + '/goals')
  await expect(page.getByRole('heading', { name: '知识卡片', exact: true })).toBeVisible()
  await noOverflow(page)
})

test('目录行内新增、重命名、折叠、移动及五层上限', async ({ page }) => {
  const spaceId = await createSpace(page, '网络工程')
  await page.getByRole('link', { name: '编辑知识树', exact: true }).click()
  await addNode(page, '网络协议', '自己的笔记\n<script>只是文字</script>')
  await addNode(page, '传输层', '', true)
  await addNode(page, 'TCP', '', true)
  await addNode(page, '拥塞控制', '', true)
  await addNode(page, '慢启动', '', true)
  await page.getByRole('button', { name: '操作 慢启动', exact: true }).click()
  await expect(
    page
      .getByRole('group', { name: '慢启动 的操作', exact: true })
      .getByRole('button', { name: '添加子节点', exact: true }),
  ).toBeDisabled()
  await page.keyboard.press('Escape')
  const before = await readWorkspace(page)
  const rootId = before.knowledgeNodes.find((n: any) => n.title === '网络协议').id
  await nodeAction(page, '网络协议', '重命名')
  await page.getByLabel('节点名称', { exact: true }).fill('协议体系')
  await page.getByRole('button', { name: '保存名称', exact: true }).click()
  await expect(page.getByLabel('节点名称', { exact: true })).toHaveCount(0)
  expect((await readWorkspace(page)).knowledgeNodes.find((n: any) => n.id === rootId).title).toBe('协议体系')
  await page.getByRole('button', { name: '收起 协议体系', exact: true }).click()
  await expect(page.getByRole('button', { name: '打开 慢启动', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: '展开 协议体系', exact: true }).click()
  await nodeAction(page, '传输层', '移动节点')
  await expect(page.getByLabel('目标文件夹').locator('option')).toHaveCount(2)
  await page.getByLabel('目标文件夹').selectOption('')
  await page.getByRole('button', { name: '确认移动', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  expect(
    (await readWorkspace(page)).knowledgeNodes.find((n: any) => n.title === '传输层').parentId,
  ).toBeNull()
  await page.reload()
  await page.goto(`#space/${spaceId}/tree?node=${rootId}`)
  await expect(page.locator('.document-preview h3')).toHaveText('协议体系')
  await expect(page.locator('.document-preview')).toContainText('<script>只是文字</script>')
  await expect(page.locator('.stable-graph-node')).toHaveCount(0)
  await noOverflow(page)
})

test('目录菜单支持键盘和浮层定位，未保存名称受保护', async ({ page }) => {
  await createSpace(page, '目录键盘')
  await page.getByRole('link', { name: '编辑知识树', exact: true }).click()
  await addNode(page, '初始名称')
  const trigger = page.getByRole('button', { name: '操作 初始名称', exact: true })
  await trigger.focus()
  await page.keyboard.press('Enter')
  const menu = page.getByRole('group', { name: '初始名称 的操作', exact: true })
  await expect(menu.getByRole('button', { name: '打开知识点', exact: true })).toBeFocused()
  const box = (await menu.boundingBox())!
  expect(box.y).toBeGreaterThanOrEqual(0)
  expect(box.y + box.height).toBeLessThanOrEqual(page.viewportSize()!.height)
  await page.keyboard.press('Escape')
  await expect(trigger).toBeFocused()
  await expect(menu).toHaveCount(0)
  await nodeAction(page, '初始名称', '重命名')
  await page.getByLabel('节点名称', { exact: true }).fill('尚未保存的名称')
  await expect(page.locator('.stable-graph-node').first()).toBeDisabled()
  page.once('dialog', (dialog) => void dialog.dismiss())
  await page.getByRole('link', { name: '学习空间', exact: true }).click()
  await expect(page.getByLabel('节点名称', { exact: true })).toHaveValue('尚未保存的名称')
  page.once('dialog', (dialog) => void dialog.accept())
  await page.getByLabel('节点名称', { exact: true }).press('Escape')
  await expect(page.getByRole('button', { name: '打开 初始名称', exact: true })).toBeVisible()
})

test('目录拖动移动保留分支与 ID，循环移动失败不修改数据', async ({ page }, info) => {
  await createSpace(page, '目录操作')
  await page.getByRole('link', { name: '编辑知识树', exact: true }).click()
  await addNode(page, '文件夹甲')
  await addNode(page, '子节点', '子节点正文', true)
  await addNode(page, '文件夹乙')
  const before = await readWorkspace(page)
  const a = before.knowledgeNodes.find((n: any) => n.title === '文件夹甲').id
  const b = before.knowledgeNodes.find((n: any) => n.title === '文件夹乙').id
  const child = before.knowledgeNodes.find((n: any) => n.title === '子节点').id
  const transfer = await page.evaluateHandle(() => new DataTransfer())
  const from = page.locator(`[data-node-id="${a}"]`)
  const to = page.locator(`[data-node-id="${b}"]`)
  await from.dispatchEvent('dragstart', { dataTransfer: transfer })
  await to.dispatchEvent('dragover', { dataTransfer: transfer })
  await to.dispatchEvent('drop', { dataTransfer: transfer })
  await expect(page.getByRole('button', { name: '收起 文件夹乙', exact: true })).toBeVisible()
  const moved = await readWorkspace(page)
  expect(moved.knowledgeNodes.find((n: any) => n.id === a).parentId).toBe(b)
  expect(moved.knowledgeNodes.find((n: any) => n.id === child).parentId).toBe(a)
  expect(moved.knowledgeNodes.find((n: any) => n.id === child).note).toBe('子节点正文')
  const illegal = await page.evaluateHandle(() => new DataTransfer())
  await page.locator(`[data-node-id="${b}"]`).dispatchEvent('dragstart', { dataTransfer: illegal })
  await page.locator(`[data-node-id="${child}"]`).dispatchEvent('dragover', { dataTransfer: illegal })
  await page.locator(`[data-node-id="${child}"]`).dispatchEvent('drop', { dataTransfer: illegal })
  await expect(page.locator('.notice.error')).toBeVisible()
  expect((await readWorkspace(page)).knowledgeNodes).toEqual(moved.knowledgeNodes)
  await page.getByLabel('搜索知识树').fill('子节点')
  await expect(page.locator('.directory-row')).toHaveCount(1)
  await page.getByLabel('搜索知识树').fill('')
  await page.screenshot({ path: info.outputPath('folder-directory.png'), fullPage: true })
  await noOverflow(page)
})
test('删除知识分支清理旧步骤关联，旧计划数据仍保留', async ({ page }) => {
  const spaceId = await createSpace(page, '数学探索')
  await page.getByRole('link', { name: '编辑知识树', exact: true }).click()
  await addNode(page, '微分')
  await addNode(page, '偏导数', '先理解定义', true)
  const child = (await readWorkspace(page)).knowledgeNodes.find((n: any) => n.title === '偏导数')
  await seedLegacyPlan(page, spaceId, child.id)
  page.once('dialog', (dialog) => void dialog.dismiss())
  await nodeAction(page, '微分', '删除节点')
  await expect(page.getByRole('button', { name: '打开 偏导数', exact: true })).toBeVisible()
  page.once('dialog', (dialog) => void dialog.accept())
  await nodeAction(page, '微分', '删除节点')
  await expect(page.getByRole('button', { name: '打开 偏导数', exact: true })).toHaveCount(0)
  const after = await readWorkspace(page)
  expect(after.stepKnowledgeLinks).toEqual([])
  expect(after.steps).toHaveLength(1)
  expect(after.goals).toHaveLength(1)
})

test('新版完整备份恢复所有实体，确认前不覆盖', async ({ page }, info) => {
  const spaceId = await createSpace(page)
  await seedLegacyPlan(page, spaceId)
  await page.getByRole('link', { name: '编辑知识树', exact: true }).click()
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
  await expect(page.getByRole('heading', { name: '知识卡片', exact: true })).toBeVisible()
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
  await page.goto('#space/' + spaceId + '/tree')
  await expect(page.locator('.directory-list .directory-name')).toHaveCount(100)
  await page.getByLabel('搜索知识树').fill('合成节点 2999')
  await expect(page.locator('.directory-list .directory-name')).toHaveCount(1)
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
  await expect(page.locator('.space-node-count')).toContainText('2 个知识节点')
  await page.getByRole('link', { name: '编辑知识树', exact: true }).click()
  await expect(page.locator('.tree-name')).toHaveCount(2)
  await page.goto('#settings')
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '导出完整备份', exact: true }).click()
  const backup = JSON.parse(await readFile((await (await downloadPromise).path())!, 'utf8')).payload
  expect(backup.cards.some((card: { id: string }) => card.id === 'old-card')).toBe(true)
})
