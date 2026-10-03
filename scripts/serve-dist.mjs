// Test-only static file server: no SPA fallback, no data API, no writes.
import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { extname, resolve, sep } from 'node:path'

const root = resolve('dist')
const prefix = '/shixi-study/'
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
}
const server = createServer(async (request, response) => {
  try {
    const path = decodeURIComponent(new URL(request.url, 'http://localhost').pathname)
    if (!path.startsWith(prefix)) {
      response.writeHead(404)
      response.end('Not found')
      return
    }
    const file = resolve(root, path.slice(prefix.length) || 'index.html')
    if (file !== root && !file.startsWith(root + sep)) {
      response.writeHead(403)
      response.end('Forbidden')
      return
    }
    if (!(await stat(file)).isFile()) {
      response.writeHead(404)
      response.end('Not found')
      return
    }
    response.writeHead(200, {
      'Content-Type': types[extname(file)] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    })
    response.end(await readFile(file))
  } catch {
    response.writeHead(404)
    response.end('Not found')
  }
})
server.listen(4174, '127.0.0.1', () => console.log('Production test: http://127.0.0.1:4174/shixi-study/'))
process.on('SIGTERM', () => server.close(() => process.exit(0)))
process.on('SIGINT', () => server.close(() => process.exit(0)))
