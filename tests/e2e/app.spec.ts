import { test, expect, type Page } from '@playwright/test'

// Explicit synthetic fixtures for the compatibility module; the product seeds nothing.
test.beforeEach(async ({ page }) => {
  await page.goto('#home')
  for (const name of ['高数', '英语', '408']) {
    await page.getByRole('button', { name: '新建领域', exact: true }).click()
    await page.getByLabel('领域名称').fill(name)
    await page.getByRole('button', { name: '创建领域', exact: true }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
  }
})

async function snapshot(page: Page) {
  return page.evaluate(async () => {
    const databases = await indexedDB.databases()
    const name = databases.find((d) => d.name?.startsWith('shixi:'))!.name!
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(name)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    const tx = db.transaction(['cards', 'reviews', 'images', 'meta'], 'readonly')
    const read = (store: string) =>
      new Promise<any[]>((resolve, reject) => {
        const request = tx.objectStore(store).getAll()
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })
    const [cards, reviews, images, meta] = await Promise.all([
      read('cards'),
      read('reviews'),
      read('images'),
      read('meta'),
    ])
    const imageBytes = await Promise.all(
      images.map(async (image) => ({
        ...image,
        blob: Array.from(new Uint8Array(await image.blob.arrayBuffer())),
      })),
    )
    db.close()
    return { cards, reviews, images: imageBytes, meta }
  })
}
async function addText(
  page: Page,
  question: string,
  answer = '测试答案：先检查使用条件。',
  draft = false,
  category = '',
) {
  await page.goto('#add')
  if (category) {
    const tree = page.getByRole('region', { name: '选择卡片分类' })
    await expect(tree.locator('.tree-branches, .tree-empty')).toBeVisible()
    const segments = category.split('/')
    for (let i = 0; i < segments.length; i++) {
      const existing = tree.locator('.tree-name').filter({ hasText: segments[i] }).first()
      if (await existing.count()) await existing.click()
      else {
        await tree.getByRole('button', { name: i === 0 ? '新建根节点' : '添加子节点', exact: true }).click()
        await tree.getByLabel('节点名称', { exact: true }).fill(segments[i])
        await tree.getByRole('button', { name: '确认保存', exact: true }).click()
        await expect(tree.getByRole('button', { name: '确认保存', exact: true })).toHaveCount(0)
      }
    }
  }
  await page.getByLabel('问题', { exact: true }).fill(question)
  if (answer) await page.getByLabel('答案与解析', { exact: true }).fill(answer)
  await page.getByRole('button', { name: draft ? '暂存为待整理' : '保存并加入新学', exact: true }).click()
  await expect(page.getByRole('heading', { name: '记忆卡片', exact: true })).toBeVisible()
}
async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true)
}
async function fixtureImage(page: Page) {
  const base64 = await page.evaluate(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 1200
    canvas.height = 430
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, 1200, 430)
    ctx.fillStyle = '#263e58'
    ctx.font = '32px serif'
    ctx.fillText('TEST ONLY - temporary image', 50, 80)
    ctx.font = '48px serif'
    ctx.fillText('f(x) = x²     lim (sin x)/x = ?', 50, 180)
    ctx.font = '28px serif'
    ctx.fillText('Synthetic fixture; no personal study data.', 50, 280)
    return canvas.toDataURL('image/png').split(',')[1]
  })
  return { name: 'synthetic-test.png', mimeType: 'image/png', buffer: Buffer.from(base64, 'base64') }
}

test('完整流程：文字图片、刷新、复习、撤销、导出与覆盖恢复', async ({ page }, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  const externalRequests: string[] = []
  const origin = new URL(testInfo.project.use.baseURL!).origin
  page.on('request', (request) => {
    if (/^https?:/.test(request.url()) && new URL(request.url()).origin !== origin)
      externalRequests.push(request.url())
  })
  await page.goto('#today')
  await expect(page.getByRole('heading', { name: '今天复习', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: '添加第一条' })).toBeVisible()
  await noOverflow(page)
  await page.screenshot({ path: testInfo.outputPath('01-home-empty.png'), fullPage: true })
  await page.getByRole('link', { name: '添加第一条' }).click()
  await page
    .getByLabel('问题', { exact: true })
    .fill('测试题：求这个极限，并说明所用条件。\n$$\\lim_{x\\to0}\\frac{\\sin x}{x}$$')
  await page
    .getByLabel('答案与解析', { exact: true })
    .fill('测试解析：极限等于 1。\n先辨认未定式，再检查使用条件。')
  await page.getByLabel('练习题', { exact: true }).check()
  const image = await fixtureImage(page)
  await page.getByLabel('问题图片文件', { exact: true }).setInputFiles(image)
  await expect(page.getByRole('button', { name: '放大问题图片 1' })).toBeVisible()
  await page.getByLabel('答案与解析图片文件', { exact: true }).setInputFiles(image)
  await expect(page.getByRole('button', { name: '放大答案与解析图片 1' })).toBeVisible()
  await page.getByText('补充来源与标签', { exact: false }).click()
  await page.getByLabel('章节', { exact: true }).fill('极限与连续')
  await page.getByLabel('书名', { exact: true }).fill('测试用书')
  await page.getByLabel('页码', { exact: true }).fill('42')
  await page.getByLabel('标签', { exact: true }).fill('条件，易忘')
  await noOverflow(page)
  await page.screenshot({ path: testInfo.outputPath('02-editor.png'), fullPage: true })
  await page.getByRole('button', { name: '保存并加入新学', exact: true }).click()
  await expect(page.getByRole('heading', { name: '记忆卡片', exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: /测试题/ })).toBeVisible()
  const before = await snapshot(page)
  expect(before.cards).toHaveLength(1)
  expect(before.images).toHaveLength(2)
  expect(before.reviews).toHaveLength(0)
  await page.getByLabel('搜索内容').fill('测试用书')
  await expect(page.getByRole('heading', { name: /测试题/ })).toBeVisible()
  await page.getByLabel('搜索内容').fill('不存在的内容')
  await expect(page.getByRole('heading', { name: '没有找到符合条件的内容' })).toBeVisible()
  await page.goto('#today')
  await page.screenshot({ path: testInfo.outputPath('03-home-content.png'), fullPage: true })
  await page.getByRole('link', { name: '开始全部复习' }).click()
  await expect(page.getByText('先在纸上独立做，再查看解析。')).toBeVisible()
  await expect(page.getByText('测试解析：极限等于 1。', { exact: false })).toHaveCount(0)
  await expect(page.locator('.katex').first()).toBeVisible()
  await page.getByRole('button', { name: '放大问题图片', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByRole('button', { name: '原尺寸查看' }).click()
  await page.getByRole('button', { name: '关闭图片' }).click()
  await noOverflow(page)
  await page.screenshot({ path: testInfo.outputPath('04-review-question.png'), fullPage: true })
  await page.getByRole('button', { name: '显示答案', exact: true }).click()
  await expect(page.getByText('测试解析：极限等于 1。', { exact: false })).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('05-review-answer.png'), fullPage: true })
  await noOverflow(page)
  await page.getByRole('button', { name: /记得/ }).click()
  await expect(page.getByRole('heading', { name: '这一轮先到这里' })).toBeVisible()
  expect((await snapshot(page)).reviews).toHaveLength(1)
  await page.reload()
  await page.getByRole('button', { name: '撤销上次评分' }).click()
  await expect(page.getByRole('button', { name: '显示答案', exact: true })).toBeVisible()
  const undone = await snapshot(page)
  expect(undone.cards).toEqual(before.cards)
  expect(undone.reviews).toEqual(before.reviews)
  expect(undone.images).toEqual(before.images)
  await page.getByRole('button', { name: '显示答案', exact: true }).click()
  await page.getByRole('button', { name: /轻松/ }).click()
  await expect(page.getByRole('heading', { name: '这一轮先到这里' })).toBeVisible()
  const rated = await snapshot(page)
  await page.goto('#settings')
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '导出完整备份', exact: true }).click()
  const download = await downloadPromise,
    backupPath = testInfo.outputPath('synthetic.backup.json')
  await download.saveAs(backupPath)
  await addText(page, '仅暂存的内容', '', true)
  expect((await snapshot(page)).cards).toHaveLength(2)
  await page.goto('#settings')
  await page.getByLabel('选择备份文件').setInputFiles(backupPath)
  await expect(page.getByRole('heading', { name: '覆盖恢复本机数据？' })).toBeVisible()
  await expect(page.getByRole('button', { name: '确认覆盖恢复' })).toBeDisabled()
  const existingDownload = page.waitForEvent('download')
  await page.getByRole('button', { name: '先导出现有数据' }).click()
  await existingDownload
  await page.getByLabel('我已保存需要的备份，确认覆盖当前数据').check()
  await page.getByRole('button', { name: '确认覆盖恢复' }).click()
  await expect(page.getByText('恢复完成。', { exact: false })).toBeVisible()
  const restored = await snapshot(page)
  expect(restored.cards).toEqual(rated.cards)
  expect(restored.reviews).toEqual(rated.reviews)
  expect(restored.images).toEqual(rated.images)
  await page.reload()
  await page.getByRole('link', { name: '记忆卡片', exact: true }).click()
  await page.getByRole('button', { name: /测试题/ }).click()
  await expect(page.getByText('测试解析：极限等于 1。', { exact: false })).toHaveCount(0)
  await page.getByRole('link', { name: '编辑内容', exact: true }).click()
  await page.getByLabel('问题', { exact: true }).fill('已编辑的测试问题')
  await page.getByRole('button', { name: '保存并加入复习', exact: true }).click()
  await expect(page.getByRole('heading', { name: '已编辑的测试问题' })).toBeVisible()
  expect((await snapshot(page)).cards[0].schedule).toEqual(rated.cards[0].schedule)
  expect(errors).toEqual([])
  expect(externalRequests).toEqual([])
})

test('粘贴、拖放、待整理排除、沿用科目与非法备份', async ({ page }) => {
  await page.goto('#add/英语')
  await page.getByLabel('单词', { exact: true }).check()
  const file = await fixtureImage(page)
  const base64 = file.buffer.toString('base64')
  await page.getByLabel('单词或短语', { exact: true }).evaluate((element, b64) => {
    const data = new DataTransfer()
    data.items.add(
      new File([Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))], 'paste.png', { type: 'image/png' }),
    )
    element.dispatchEvent(
      new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }),
    )
  }, base64)
  await expect(page.getByRole('button', { name: '放大单词或短语图片 1' })).toBeVisible()
  await page
    .locator('.content-editor')
    .nth(1)
    .evaluate((element, b64) => {
      const data = new DataTransfer()
      data.items.add(
        new File([Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))], 'drop.png', { type: 'image/png' }),
      )
      element.dispatchEvent(new DragEvent('drop', { dataTransfer: data, bubbles: true, cancelable: true }))
    }, base64)
  await expect(page.getByRole('button', { name: '放大释义与用法图片 1' })).toBeVisible()
  await page.getByRole('button', { name: '暂存为待整理' }).click()
  await expect(page.getByRole('heading', { name: '记忆卡片' })).toBeVisible()
  await page.goto('#today')
  await expect(page.getByRole('link', { name: '开始全部复习' })).toHaveCount(0)
  await expect(page.getByRole('link', { name: '整理 1 条暂存内容' })).toBeVisible()
  await page.goto('#add')
  await expect(page.getByLabel('科目', { exact: true })).toHaveValue('英语')
  await page.goto('#settings')
  await page
    .getByLabel('选择备份文件')
    .setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{bad') })
  await expect(page.getByRole('alert')).toContainText('不是有效的 JSON')
  expect((await snapshot(page)).cards).toHaveLength(1)
  await page.getByLabel('每日新学上限').fill('0')
  await page.getByLabel('希望复习的时间').fill('21:10')
  await page.getByRole('button', { name: '保存设置' }).click()
  await expect(page.getByText('设置已保存。')).toBeVisible()
  await page.reload()
  await expect(page.getByLabel('每日新学上限')).toHaveValue('0')
  await expect(page.getByLabel('希望复习的时间')).toHaveValue('21:10')
  await noOverflow(page)
})

test('保存失败保留表单并清楚报错，键盘可完成复习', async ({ page }) => {
  await page.goto('#add')
  await page.getByLabel('问题', { exact: true }).fill('配额失败时必须保留这句话')
  await page.getByLabel('答案与解析', { exact: true }).fill('测试答案')
  await page.evaluate(() => {
    const original = IDBObjectStore.prototype.put
    ;(window as any).__restorePut = () => {
      IDBObjectStore.prototype.put = original
    }
    IDBObjectStore.prototype.put = function (...args: Parameters<IDBObjectStore['put']>) {
      if (this.name === 'cards') throw new DOMException('test quota', 'QuotaExceededError')
      return original.apply(this, args)
    }
  })
  await page.getByRole('button', { name: '保存并加入新学' }).click()
  await expect(page.getByRole('alert')).toContainText('存储空间不足，未保存')
  await expect(page.getByLabel('问题', { exact: true })).toHaveValue('配额失败时必须保留这句话')
  expect((await snapshot(page)).cards).toHaveLength(0)
  await page.evaluate(() => (window as any).__restorePut())
  await page.getByRole('button', { name: '保存并加入新学' }).click()
  await expect(page.getByRole('heading', { name: '记忆卡片' })).toBeVisible()
  await page.goto('#review/all')
  await expect(page.getByRole('button', { name: '显示答案', exact: true })).toBeVisible()
  await page.keyboard.press('Space')
  await expect(page.getByRole('heading', { name: '答案与解析' })).toBeFocused()
  await page.keyboard.press('3')
  await expect(page.getByRole('heading', { name: '这一轮先到这里' })).toBeVisible()
  expect((await snapshot(page)).reviews).toHaveLength(1)
})

test('午夜重开网页恢复新学额度，逾期内容仍然在队列', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-03T23:50:00+08:00'))
  await page.goto('#settings')
  await page.getByLabel('每日新学上限').fill('1')
  await page.getByRole('button', { name: '保存设置' }).click()
  await expect(page.getByText('设置已保存。')).toBeVisible()
  await addText(page, '跨天第一题')
  await addText(page, '跨天第二题')
  await page.goto('#review/all')
  await page.getByRole('button', { name: '显示答案' }).click()
  await page.getByRole('button', { name: /忘了/ }).click()
  await expect(page.getByText('今日新学额度已用完', { exact: false })).toBeVisible()
  const before = await snapshot(page)
  await page.clock.setFixedTime(new Date('2026-10-04T00:01:00+08:00'))
  await page.reload()
  await expect(page.getByText('剩余到期 1 条 · 本次可新学 1 条')).toBeVisible()
  expect((await snapshot(page)).cards).toEqual(before.cards)
  expect((await snapshot(page)).reviews).toEqual(before.reviews)
})

test('窄屏长公式不撑破页面，公式与原文不触发外部请求', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 })
  await page.goto('')
  await noOverflow(page)
  await addText(
    page,
    '窄屏测试\n' + '很长的问题'.repeat(40) + '\n$$' + 'x_1+'.repeat(50) + 'x_{51}$$',
    '<img src="https://example.com/tracker.png"> 只是文字',
  )
  await page.goto('#review/all')
  await expect(page.locator('.katex').first()).toBeVisible()
  await noOverflow(page)
  await page.getByRole('button', { name: '显示答案' }).click()
  await expect(
    page.getByText('<img src="https://example.com/tracker.png"> 只是文字', { exact: true }),
  ).toBeVisible()
  await expect(page.locator('img[src^="https:"]')).toHaveCount(0)
  await noOverflow(page)
})

test('批量录入：继续下一条沿用来源、图片复用、重复提醒与草稿恢复', async ({ page }) => {
  await page.goto('#add/408')
  await page.getByLabel('练习题', { exact: true }).check()
  await page.getByText('补充来源与标签', { exact: false }).click()
  await page.getByLabel('章节', { exact: true }).fill('数据结构')
  await page.getByLabel('书名', { exact: true }).fill('王道测试书')
  await page.getByLabel('问题', { exact: true }).fill('第一题：顺序表插入的时间复杂度？')
  await page.getByLabel('答案与解析', { exact: true }).fill('O(n)')
  const image = await fixtureImage(page)
  await page.getByLabel('问题图片文件', { exact: true }).setInputFiles(image)
  await expect(page.getByRole('button', { name: '放大问题图片 1' })).toBeVisible()
  await page.getByRole('button', { name: '用到背面' }).click()
  await expect(page.getByRole('button', { name: '放大答案与解析图片 1' })).toBeVisible()
  await page.getByRole('button', { name: '保存并继续下一条', exact: true }).click()
  await expect(page.getByText('已保存 1 条', { exact: false })).toBeVisible()
  await expect(page.getByLabel('科目', { exact: true })).toHaveValue('408')
  await expect(page.getByLabel('章节', { exact: true })).toHaveValue('数据结构')
  await expect(page.getByLabel('问题', { exact: true })).toHaveValue('')
  const first = await snapshot(page)
  expect(first.cards).toHaveLength(1)
  expect(first.images).toHaveLength(1)
  expect(first.cards[0].question.images).toEqual(first.cards[0].answer.images)
  await page.getByLabel('问题', { exact: true }).fill('第二题：栈的典型应用？')
  await page.getByLabel('答案与解析', { exact: true }).fill('括号匹配、表达式求值')
  await page.keyboard.press('Control+Enter')
  await expect(page.getByRole('heading', { name: '记忆卡片', exact: true })).toBeVisible()
  expect((await snapshot(page)).cards).toHaveLength(2)
  await page.goto('#add')
  await page.getByLabel('问题', { exact: true }).fill('第二题：栈的典型应用？')
  await page.getByLabel('答案与解析', { exact: true }).fill('另一个答案')
  let dialogMessage = ''
  page.on('dialog', (dialog) => {
    if (dialog.type() === 'beforeunload') return void dialog.accept()
    dialogMessage = dialog.message()
    void dialog.dismiss()
  })
  await page.getByRole('button', { name: '保存并加入新学', exact: true }).click()
  await expect.poll(() => dialogMessage).toContain('完全相同')
  expect((await snapshot(page)).cards).toHaveLength(2)
  await page.getByLabel('问题', { exact: true }).fill('没来得及保存的草稿')
  await page.waitForTimeout(1200)
  await page.reload()
  await expect(page.getByText('发现上次没来得及保存的内容', { exact: false })).toBeVisible()
  await page.getByRole('button', { name: '恢复', exact: true }).click()
  await expect(page.getByLabel('问题', { exact: true })).toHaveValue('没来得及保存的草稿')
  await noOverflow(page)
})

test('英语科目：单词速录回车连录，录入框随类型变化', async ({ page }) => {
  await page.goto('#add/英语')
  await page.getByLabel('单词', { exact: true }).check()
  await expect(page.getByLabel('单词', { exact: true })).toBeChecked()
  await expect(page.getByLabel('句子', { exact: true })).toBeVisible()
  await expect(page.getByLabel('知识点', { exact: true })).toBeVisible()
  await expect(page.locator('.editor-hint')).toContainText('一词一卡')
  await expect(page.getByLabel('单词或短语', { exact: true })).toBeVisible()
  await expect(page.getByLabel('释义与用法', { exact: true })).toBeVisible()
  await expect(page.getByLabel('问题', { exact: true })).toHaveCount(0)
  await page.getByLabel('单词或短语', { exact: true }).fill('abandon')
  await page.keyboard.press('Enter')
  await expect(page.getByLabel('释义与用法', { exact: true })).toBeFocused()
  await page.getByLabel('释义与用法', { exact: true }).fill('v. 放弃，抛弃')
  await page.keyboard.press('Enter')
  await expect(page.getByText('已保存 1 条', { exact: false })).toBeVisible()
  await expect(page.getByLabel('单词或短语', { exact: true })).toHaveValue('')
  expect((await snapshot(page)).cards).toHaveLength(1)
  await page.getByLabel('句子', { exact: true }).check()
  await expect(page.locator('.editor-hint')).toContainText('先自己译一遍')
  await expect(page.getByLabel('英文句子', { exact: true })).toBeVisible()
  await expect(page.getByLabel('翻译与解析', { exact: true })).toBeVisible()
  await page.getByLabel('英文句子', { exact: true }).fill('The show must go on.')
  await page.getByLabel('翻译与解析', { exact: true }).fill('演出必须继续。go on 表示继续。')
  await page.getByRole('button', { name: '保存并加入新学', exact: true }).click()
  await expect(page.getByRole('heading', { name: '记忆卡片', exact: true })).toBeVisible()
  await page.goto('#review/all')
  await expect(page.locator('.review-meta')).toContainText('单词')
  await page.getByRole('button', { name: '显示释义' }).click()
  await expect(page.getByRole('heading', { name: '释义与用法', exact: true })).toBeVisible()
  await page.getByRole('button', { name: /记得/ }).click()
  await expect(page.locator('.review-meta')).toContainText('句子')
  await expect(page.getByText('先自己翻译，再展开对照。', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: '显示翻译' }).click()
  await expect(page.getByRole('heading', { name: '翻译与解析', exact: true })).toBeVisible()
  await expect(page.getByText('演出必须继续。', { exact: false })).toBeVisible()
  await page.getByRole('button', { name: /记得/ }).click()
  await expect(page.getByRole('heading', { name: '这一轮先到这里' })).toBeVisible()
  await page.goto('#add/高数')
  await expect(page.getByLabel('知识点', { exact: true })).toBeChecked()
  await expect(page.getByLabel('问题', { exact: true })).toBeVisible()
  await page.getByLabel('科目', { exact: true }).selectOption('英语')
  await page.getByLabel('单词', { exact: true }).check()
  await expect(page.getByLabel('单词', { exact: true })).toBeChecked()
  await expect(page.getByLabel('单词或短语', { exact: true })).toBeVisible()
  await expect(page.locator('.editor-hint')).toContainText('一词一卡')
})

test('删除内容会同时清除复习历史', async ({ page }) => {
  await addText(page, '准备删除的内容')
  await page.goto('#review/all')
  await page.getByRole('button', { name: '显示答案' }).click()
  await page.getByRole('button', { name: /记得/ }).click()
  await expect(page.getByRole('heading', { name: '这一轮先到这里' })).toBeVisible()
  expect((await snapshot(page)).reviews).toHaveLength(1)
  await page.goto('#library')
  await page.getByRole('button', { name: /准备删除的内容/ }).click()
  page.once('dialog', (dialog) => void dialog.accept())
  await page.getByRole('button', { name: '删除', exact: true }).click()
  await expect(page.getByText('这里还没有内容', { exact: false })).toBeVisible()
  const snap = await snapshot(page)
  expect(snap.cards).toHaveLength(0)
  expect(snap.reviews).toHaveLength(0)
})

test('知识族谱点选录入、跨分支关联、移动节点与英语简化', async ({ page }, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await addText(
    page,
    '连续与可导之间有什么关系？',
    '可导必连续，连续未必可导。',
    false,
    '高等数学/极限与连续',
  )
  await addText(
    page,
    '如何理解导数的几何意义？',
    '导数是函数图像在该点的切线斜率。',
    false,
    '高等数学/导数与微分',
  )
  await page.goto('#add/高数')
  await expect(page.getByLabel('分类', { exact: true })).toHaveCount(0)
  await page.locator('.tree-name').filter({ hasText: '导数与微分' }).click()
  await page.getByLabel('问题', { exact: true }).fill('函数在一点可导，需要哪些条件？')
  await page
    .getByLabel('答案与解析', { exact: true })
    .fill('左右导数存在且相等。先检查连续性，再用定义判断。')
  await page.getByLabel('搜索可关联的知识').fill('连续与可导')
  await page.locator('.relation-results').getByRole('button').click()
  await page.getByLabel('搜索可关联的知识').fill('几何意义')
  await page.locator('.relation-results').getByRole('button').click()
  await page.getByRole('button', { name: '保存并加入新学', exact: true }).click()
  await expect(page.getByRole('heading', { name: '记忆卡片', exact: true })).toBeVisible()
  const data = await snapshot(page)
  expect(data.cards.find((c: any) => c.question.text.startsWith('函数在')).relatedIds).toHaveLength(2)
  expect(data.cards.find((c: any) => c.question.text.startsWith('连续')).relatedIds).toHaveLength(1)
  await noOverflow(page)
  await page.screenshot({ path: `test-results/visual/cards-${testInfo.project.name}.png`, fullPage: false })
  await page.getByRole('button', { name: '卡片关联图', exact: true }).click()
  await expect(page.getByRole('region', { name: '卡片分类树' })).toBeVisible()
  await expect(page.locator('.graph-relation')).toHaveCount(2)
  await page.locator('.graph-card').filter({ hasText: '函数在一点' }).click()
  await expect(page.locator('.graph-inspector')).toContainText('函数在一点可导')
  await expect(page.locator('.graph-inspector')).not.toContainText('左右导数存在且相等')
  await page.locator('.graph-inspector').getByRole('button', { name: '显示答案', exact: true }).click()
  await expect(page.locator('.graph-inspector')).toContainText('左右导数存在且相等')
  await page.getByRole('button', { name: '重置图谱缩放' }).click()
  await page.getByRole('button', { name: '缩小图谱' }).click()
  await expect(page.getByRole('button', { name: '重置图谱缩放' })).toHaveText('80%')
  await page.getByRole('button', { name: '重置图谱缩放' }).click()
  await page.getByRole('button', { name: '总览', exact: true }).click()
  await noOverflow(page)
  await page.screenshot({ path: `test-results/visual/graph-${testInfo.project.name}.png`, fullPage: false })
  const tree = page.getByRole('region', { name: '卡片分类树' })
  await tree.locator('.tree-name').filter({ hasText: '导数与微分' }).click()
  await tree.getByRole('button', { name: '重命名', exact: true }).click()
  await tree.getByLabel('节点名称').fill('导数 & 微分')
  await tree.getByRole('button', { name: '确认保存' }).click()
  await expect(tree.getByRole('button', { name: '确认保存' })).toHaveCount(0)
  await tree.getByRole('button', { name: '移动节点' }).click()
  await tree.getByLabel('移动到').selectOption('高等数学/极限与连续')
  await tree.getByRole('button', { name: '确认移动' }).click()
  await expect(tree.getByRole('button', { name: '确认移动' })).toHaveCount(0)
  expect(
    (await snapshot(page)).cards.filter((c: any) => c.category === '高等数学/极限与连续/导数 & 微分'),
  ).toHaveLength(2)
  await page.getByRole('link', { name: '在此节点添加' }).click()
  await expect(page.locator('.tree-name.selected')).toContainText('导数 & 微分')
  await page.screenshot({ path: `test-results/visual/editor-${testInfo.project.name}.png`, fullPage: false })
  await page.goto('#add/英语')
  await page.getByLabel('单词', { exact: true }).check()
  await expect(page.getByRole('region', { name: '选择卡片分类' })).toBeVisible()
  await expect(page.getByLabel('知识点', { exact: true })).toBeVisible()
  await page.getByLabel('单词或短语', { exact: true }).fill('derive')
  await page.getByLabel('释义与用法', { exact: true }).fill('v. 获得；推导')
  await page.getByRole('button', { name: '保存并加入新学', exact: true }).click()
  await expect(page.getByRole('heading', { name: '记忆卡片', exact: true })).toBeVisible()
  await page.getByLabel('筛选科目').selectOption('英语')
  await expect(page.getByRole('region', { name: '卡片分类树' })).toBeVisible()
  await page.getByRole('button', { name: '单词', exact: true }).click()
  await expect(page.getByText('1 条结果', { exact: false })).toBeVisible()
  await page.getByRole('button', { name: '句子', exact: true }).click()
  await expect(page.getByText('没有找到符合条件的内容')).toBeVisible()
  await page.setViewportSize({ width: 320, height: 740 })
  await page.goto('#library/高数?view=graph')
  await expect(page.locator('.graph-relation')).toHaveCount(2)
  await noOverflow(page)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  expect(await page.locator('.page-surface').evaluate((el) => getComputedStyle(el).animationName)).toBe(
    'none',
  )
  expect(errors).toEqual([])
})
