// Synthetic data in an isolated browser profile; never touches the user's browser.
import { chromium } from '@playwright/test'
import { mkdir } from 'node:fs/promises'

const origin = process.env.CAPTURE_URL || 'http://127.0.0.1:4173/shixi-study/'
const output = '.impeccable/review'
await mkdir(output, { recursive: true })
const browser = await chromium.launch({
  executablePath:
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
})
try {
  for (const [device, viewport] of [
    ['desktop', { width: 1440, height: 1000 }],
    ['mobile', { width: 390, height: 844 }],
  ]) {
    const context = await browser.newContext({
      viewport,
      reducedMotion: 'reduce',
      isMobile: device === 'mobile',
      hasTouch: device === 'mobile',
    })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.goto(origin)
    await page.getByRole('heading', { name: '我的学习空间', exact: true }).waitFor()
    await page.screenshot({ path: `${output}/empty-${device}.png`, fullPage: true })
    await page.evaluate(async () => {
      const name = (await indexedDB.databases()).find((d) => d.name?.startsWith('shixi:'))?.name
      const db = await new Promise((resolve) => {
        const req = indexedDB.open(name)
        req.onsuccess = () => resolve(req.result)
      })
      const stores = [
        'spaces',
        'goals',
        'steps',
        'knowledgeNodes',
        'knowledgeRelations',
        'stepKnowledgeLinks',
      ]
      const tx = db.transaction(stores, 'readwrite'),
        time = Date.now()
      const put = (name, value) => tx.objectStore(name).put({ createdAt: time, updatedAt: time, ...value })
      put('spaces', { id: 'demo', name: '数学探索', icon: '∫', color: '#456785' })
      put('spaces', { id: 'japanese', name: '日语', icon: 'あ', color: '#527668' })
      put('spaces', { id: 'cpp', name: 'C++', color: '#75668c' })
      put('goals', {
        id: 'g1',
        spaceId: 'demo',
        title: '强化课程',
        parentGoalId: null,
        description: '每天完成一讲，再独立做对应练习。',
      })
      put('goals', { id: 'g2', spaceId: 'demo', title: '核心计算', parentGoalId: 'g1' })
      put('goals', { id: 'g3', spaceId: 'demo', title: '真题阶段', parentGoalId: null })
      for (const [i, title] of ['极限与连续', '一元微分', '一元积分', '多元微分', '重积分'].entries())
        put('steps', {
          id: `t${i}`,
          goalId: 'g1',
          title: `第${i + 1}讲 ${title}`,
          completed: i < 3,
          ...(i < 3 ? { completedAt: time } : {}),
        })
      put('steps', { id: 't5', goalId: 'g2', title: '整理导数计算题', completed: true, completedAt: time })
      put('steps', { id: 't6', goalId: 'g3', title: '第一套真题', completed: false })
      for (const [id, title, parentId] of [
        ['n1', '极限与连续', null],
        ['n2', '等价无穷小', 'n1'],
        ['n3', '洛必达法则', 'n1'],
        ['n4', '泰勒展开', 'n1'],
        ['n5', '一元微分', null],
        ['n6', '中值定理', 'n5'],
        ['n7', '导数应用', 'n5'],
        ['n8', '积分', null],
        ['n9', '定积分', 'n8'],
      ])
        put('knowledgeNodes', {
          id,
          spaceId: 'demo',
          title,
          parentId,
          ...(id === 'n4'
            ? {
                note: '用多项式近似函数。先检查展开点和适用条件，再选择需要保留的阶数。\n\n复习时，用一个具体的极限题验证自己的推导。',
              }
            : {}),
        })
      tx.objectStore('knowledgeRelations').put({
        id: 'r1',
        spaceId: 'demo',
        sourceNodeId: 'n4',
        targetNodeId: 'n2',
        createdAt: time,
      })
      tx.objectStore('knowledgeRelations').put({
        id: 'r2',
        spaceId: 'demo',
        sourceNodeId: 'n4',
        targetNodeId: 'n3',
        createdAt: time,
      })
      tx.objectStore('stepKnowledgeLinks').put({
        id: 'l1',
        stepId: 't0',
        knowledgeNodeId: 'n4',
        createdAt: time,
      })
      tx.objectStore('stepKnowledgeLinks').put({
        id: 'l2',
        stepId: 't3',
        knowledgeNodeId: 'n4',
        createdAt: time,
      })
      await new Promise((resolve, reject) => {
        tx.oncomplete = resolve
        tx.onerror = () => reject(tx.error)
      })
      db.close()
    })
    await page.reload()
    await page.getByRole('link', { name: '进入 数学探索', exact: true }).waitFor()
    await page.screenshot({ path: `${output}/home-${device}.png`, fullPage: true })
    await page.goto(origin + '#space/demo/goals')
    await page.getByRole('heading', { name: '强化课程', exact: true }).waitFor()
    await page.screenshot({ path: `${output}/goals-${device}.png`, fullPage: true })
    await page.goto(origin + '#space/demo/tree?node=n4')
    await page.getByRole('region', { name: '知识详情 泰勒展开', exact: true }).waitFor()
    await page.screenshot({ path: `${output}/${device}.png`, fullPage: true })
    await page.goto(origin + '#space/demo/graph?node=n4')
    await page.locator('.stable-graph-node').first().waitFor()
    await page.screenshot({ path: `${output}/graph-${device}.png`, fullPage: true })
    if (errors.length) throw new Error(errors.join('\n'))
    await context.close()
  }
} finally {
  await browser.close()
}
console.log(`Workspace screenshots saved to ${output}`)
