import { chromium } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'
const phase = process.argv[2] || 'before'
await mkdir('test-results/visual', { recursive: true })
const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
})
const page = await browser.newPage({
  baseURL: 'http://127.0.0.1:4173/shixi-study/',
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
})
await page.goto('http://127.0.0.1:4173/shixi-study/')
await page.locator('h1').waitFor()
await page.evaluate(async () => {
  const { database } = await import('/shixi-study/src/core/db.ts')
  const { emptySchedule } = await import('/shixi-study/src/core/scheduler.ts')
  const db = await database()
  const tx = db.transaction(['cards', 'reviews'], 'readwrite')
  const names = [
    '极限的四则运算法则有哪些使用条件？',
    '如何理解导数的几何意义？',
    '连续与可导之间有什么关系？',
    '定积分的几何意义是什么？',
  ]
  for (let i = 0; i < 1000; i++) {
    await tx.objectStore('cards').put({
      id: `fixture-${i}`,
      subject: '高数',
      kind: 'knowledge',
      status: 'ready',
      question: { text: names[i % 4], images: [] },
      answer: { text: '先理解概念，再检查条件。', images: [] },
      category: i % 2 ? '高等数学/导数与微分' : '高等数学/极限与连续',
      familiarity: i % 4,
      tags: [],
      chapter: '',
      book: '',
      page: '',
      number: '',
      createdAt: Date.now() + i,
      updatedAt: Date.now(),
      schedule: emptySchedule(),
      relatedIds: [],
    })
  }
  // Synthetic history only, in a fresh isolated browser profile.
  for (let i = 0; i < 20000; i++)
    await tx.objectStore('reviews').put({
      id: `r-${i}`,
      cardId: `fixture-${i % 1000}`,
      reviewedAt: Date.now() - 86400000,
      rating: 3,
      before: emptySchedule(),
      after: emptySchedule(),
    })
  await tx.done
})
await page.reload()
await page.locator('h1').waitFor()
await page.screenshot({ path: `test-results/visual/${phase}-home-mobile.png`, fullPage: true })
const session = await page.context().newCDPSession(page)
await session.send('Emulation.setCPUThrottlingRate', { rate: 4 })
const timings = []
for (let i = 0; i < 5; i++) {
  await page.goto('#today')
  await page.getByRole('heading', { name: '今天复习', exact: true }).waitFor()
  timings.push(
    await page.evaluate(
      () =>
        new Promise((resolve) => {
          const start = performance.now()
          const observer = new MutationObserver(() => {
            if (document.querySelector('h1')?.textContent === '我的内容') {
              observer.disconnect()
              requestAnimationFrame(() => requestAnimationFrame(() => resolve(performance.now() - start)))
            }
          })
          observer.observe(document.getElementById('main'), { childList: true, subtree: true })
          document.querySelector('nav a[href="#library"]').click()
        }),
    ),
  )
}
await session.send('Emulation.setCPUThrottlingRate', { rate: 1 })
await page.screenshot({ path: `test-results/visual/${phase}-library-mobile.png`, fullPage: true })
await page.setViewportSize({ width: 1440, height: 1000 })
await page.screenshot({ path: `test-results/visual/${phase}-library-desktop.png`, fullPage: true })
const result = {
  phase,
  scenario:
    '1000 cards, 20000 history rows, 4x CPU throttle, mobile viewport; click to second animation frame',
  timings: timings.map((n) => Math.round(n)),
  median: Math.round([...timings].sort((a, b) => a - b)[2]),
}
await writeFile(`test-results/visual/${phase}-performance.json`, JSON.stringify(result, null, 2))
console.log(JSON.stringify(result))
await browser.close()
