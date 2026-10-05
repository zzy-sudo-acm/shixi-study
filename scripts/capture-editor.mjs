import { chromium } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'
const output = '.impeccable/review/knowledge-cards'
await mkdir(output, { recursive: true })
const browser = await chromium.launch({
  executablePath:
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
})
const metrics = []
for (const [device, width, height] of [
  ['desktop', 1440, 1000],
  ['mobile', 390, 844],
]) {
  const context = await browser.newContext({
    viewport: { width, height },
    reducedMotion: 'reduce',
    timezoneId: 'Asia/Shanghai',
  })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  await page.goto('http://127.0.0.1:4174/shixi-study/#home')
  await page.getByRole('button', { name: '新建领域', exact: true }).click()
  await page.getByLabel('领域名称').fill('算法与数据结构')
  await page.getByRole('button', { name: '创建领域', exact: true }).click()
  await page.getByRole('dialog').waitFor({ state: 'detached' })
  await page.evaluate(async () => {
    const name = (await indexedDB.databases()).find(
      (item) => item.name?.startsWith('shixi:') && !item.name.endsWith(':drafts'),
    ).name
    const db = await new Promise((resolve) => {
      const req = indexedDB.open(name)
      req.onsuccess = () => resolve(req.result)
    })
    const spaces = await new Promise((resolve) => {
      const req = db.transaction('spaces').objectStore('spaces').getAll()
      req.onsuccess = () => resolve(req.result)
    })
    const spaceId = spaces[0].id
    const tx = db.transaction('knowledgeNodes', 'readwrite')
    const entries = [
      ['functions', '有用的函数和数据结构', null],
      ['strings', '字符串', 'functions'],
      ['read', '读取一行字符串', 'strings'],
      ['convert', '判断与转换函数', 'strings'],
      ['sieve', '欧拉筛（找质数）', 'functions'],
      ['power', '快速幂', 'functions'],
      ['pointers', '指针', 'functions'],
      ['stl', 'STL', 'functions'],
      ['sort', '排序和去重', 'functions'],
      ['basics', '基础算法', null],
      ['structures', '数据结构', 'basics'],
      ['graphs', '搜索与图论', 'basics'],
    ]
    for (const [id, title, parentId] of entries)
      tx.objectStore('knowledgeNodes').put({
        id,
        title,
        parentId,
        spaceId,
        createdAt: 1000,
        updatedAt: 1000,
        note:
          id === 'power'
            ? '# 快速幂\n\n把指数拆成二进制，让乘法次数从线性降为对数。\n\n## 核心思路\n\n- 指数为奇数时，将当前底数乘入答案。\n- 每一步将底数平方，再将指数减半。\n- 重复以上过程，直到指数为零。\n\n> 每次循环都在解决剩余的指数问题。\n\n## 实现\n\n```cpp\nlong long power(long long a, int n) {\n  long long result = 1;\n  while (n > 0) {\n    if (n & 1) result *= a;\n    a *= a;\n    n >>= 1;\n  }\n  return result;\n}\n```\n\n时间复杂度：$O(\\log n)$。'
            : '',
      })
    await new Promise((resolve) => {
      tx.oncomplete = resolve
    })
    db.close()
  })
  await page.reload()
  await page.getByRole('link', { name: '进入 算法与数据结构', exact: true }).waitFor()
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: output + '/home-' + device + '.png', fullPage: true })
  metrics.push({
    device,
    state: 'home',
    ...(await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > innerWidth + 1,
      cardHeight: document.querySelector('.space-card').getBoundingClientRect().height,
      labelSize:
        parseFloat(getComputedStyle(document.querySelector('.tree-figure-label')).fontSize) *
        document.querySelector('.tree-figure-label').getScreenCTM().a,
    }))),
  })
  await page.getByRole('link', { name: '进入 算法与数据结构', exact: true }).click()
  await page.getByRole('link', { name: '查看知识树 基础算法', exact: true }).waitFor()
  await page.screenshot({ path: output + '/cards-' + device + '.png', fullPage: true })
  await page.getByRole('link', { name: '编辑知识树', exact: true }).click()
  await page.locator('.stable-graph-node').last().waitFor()
  await page.getByRole('button', { name: '收起 基础算法', exact: true }).click()
  await page.evaluate(() => scrollTo(0, 0))
  await page.screenshot({ path: output + '/directory-' + device + '.png', fullPage: true })
  metrics.push({
    device,
    state: 'directory',
    ...(await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > innerWidth + 1,
      columns: getComputedStyle(document.querySelector('.knowledge-studio')).gridTemplateColumns,
      rootTitle: document.querySelector('.graph-tree-root').textContent,
      mobileSwitch: getComputedStyle(document.querySelector('.studio-mobile-switch')).display,
    }))),
  })
  await page.getByRole('button', { name: '打开 快速幂', exact: true }).click()
  await page.locator('.document-preview .katex').waitFor()
  await page.evaluate(() => scrollTo(0, 0))
  await page.screenshot({ path: output + '/editor-' + device + '.png', fullPage: true })
  metrics.push({
    device,
    state: 'editor',
    errors,
    ...(await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > innerWidth + 1,
      columns: getComputedStyle(document.querySelector('.knowledge-studio')).gridTemplateColumns,
      graphNodes: document.querySelectorAll('.stable-graph-node').length,
      directoryHidden: document.querySelector('.folder-directory').closest('[hidden]') !== null,
    }))),
  })
  await context.close()
}
await browser.close()
await writeFile(output + '/metrics.json', JSON.stringify(metrics, null, 2))
console.log(JSON.stringify(metrics))
