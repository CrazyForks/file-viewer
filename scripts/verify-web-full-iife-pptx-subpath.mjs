import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { createRequire } from 'node:module'
import { delimiter, extname, normalize, relative, resolve, sep } from 'node:path'
import { pathToFileURL } from 'node:url'

const timeout = Number(process.env.WEB_FULL_IIFE_PPTX_TIMEOUT || 30000)
const webFullDist = resolve('packages/components/web-full/dist')
const pptxSample = resolve('apps/viewer-demo/public/example/ppt.pptx')
const require = createRequire(import.meta.url)

const fail = message => {
  console.error(`[web-full-iife-pptx] ${message}`)
  process.exit(1)
}

const importPlaywright = async () => {
  try {
    return await import('playwright')
  } catch (error) {
    const candidatePaths = process.env.PATH
      ?.split(delimiter)
      .filter(pathEntry => pathEntry.endsWith(`${sep}node_modules${sep}.bin`))
      .map(binDir => resolve(binDir, '..'))
      .filter(pathEntry => existsSync(pathEntry)) || []

    for (const candidatePath of candidatePaths) {
      try {
        const playwrightEntry = require.resolve('playwright', { paths: [candidatePath] })
        return await import(pathToFileURL(playwrightEntry).href)
      } catch {
        // Continue probing npm exec injected package roots.
      }
    }

    fail([
      'Missing playwright module.',
      'Run with: npm exec --yes --package playwright -- node scripts/verify-web-full-iife-pptx-subpath.mjs',
      `Original error: ${error instanceof Error ? error.message : String(error)}`
    ].join('\n'))
  }
}

const mimeTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.pptx', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'],
  ['.wasm', 'application/wasm']
])

const html = `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8">
    <title>Web Full IIFE PPTX Subpath Smoke</title>
    <style>
      html, body { height: 100%; margin: 0; }
      #viewer { height: 760px; }
    </style>
  </head>
  <body>
    <div id="viewer"></div>
    <script src="/viewer/flyfish-file-viewer-web-full.iife.js"></script>
    <script>
      FlyfishFileViewerWebFull.mountViewer(document.getElementById('viewer'), {
        url: '/files/ppt.pptx',
        name: 'ppt.pptx',
        options: { theme: 'light', toolbar: true }
      });
    </script>
  </body>
</html>`

const resolveViewerFile = pathname => {
  const relativePath = normalize(decodeURIComponent(pathname.slice('/viewer/'.length))).replace(/^(\.\.(\/|\\|$))+/, '')
  const candidate = resolve(webFullDist, relativePath)
  if (!candidate.startsWith(webFullDist) || relative(webFullDist, candidate).startsWith('..')) {
    return null
  }
  return candidate
}

const server = createServer((request, response) => {
  const url = new URL(request.url || '/', 'http://127.0.0.1')
  if (url.pathname === '/' || url.pathname === '/index.html') {
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    response.end(html)
    return
  }

  const filePath = url.pathname === '/files/ppt.pptx'
    ? pptxSample
    : url.pathname.startsWith('/viewer/')
      ? resolveViewerFile(url.pathname)
      : null

  if (!filePath || !existsSync(filePath) || !statSync(filePath).isFile()) {
    response.writeHead(404)
    response.end('Not Found')
    return
  }

  response.writeHead(200, {
    'Content-Type': mimeTypes.get(extname(filePath).toLowerCase()) || 'application/octet-stream'
  })
  createReadStream(filePath).pipe(response)
})

await new Promise((resolveServer, rejectServer) => {
  server.once('error', rejectServer)
  server.listen(0, '127.0.0.1', resolveServer)
})

const address = server.address()
const baseUrl = `http://127.0.0.1:${address.port}`
const failures = []
const requestedUrls = []
const playwrightModule = await importPlaywright()
const { chromium } = playwrightModule.chromium ? playwrightModule : playwrightModule.default
const browser = await chromium.launch({ headless: true }).catch(() => chromium.launch({ channel: 'chrome', headless: true }))
const page = await browser.newPage({ viewport: { width: 1360, height: 900 } })

page.on('pageerror', error => failures.push(`pageerror: ${error.message}`))
page.on('console', message => {
  if (message.type() === 'error') {
    failures.push(`console.error: ${message.text()}`)
  }
})
page.on('request', request => {
  requestedUrls.push(request.url())
})
page.on('response', response => {
  const responseUrl = new URL(response.url())
  if (responseUrl.origin === baseUrl && response.status() >= 400) {
    failures.push(`HTTP ${response.status()}: ${response.url()}`)
  }
})

try {
  await page.goto(`${baseUrl}/index.html`, { waitUntil: 'domcontentloaded', timeout })
  await page.waitForFunction(
    () => document.querySelectorAll('.flyfish-pptx-content .slide, .pptx-render-surface .slide').length > 0,
    undefined,
    { timeout }
  )

  const state = await page.evaluate(() => {
    const isVisible = element => {
      const style = window.getComputedStyle(element)
      const rect = element.getBoundingClientRect()
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0
    }
    return {
      slides: document.querySelectorAll('.flyfish-pptx-content .slide, .pptx-render-surface .slide').length,
      visibleErrors: Array.from(document.querySelectorAll('.pptx-error'))
        .filter(isVisible)
        .map(node => (node.textContent || '').replace(/\s+/g, ' ').trim())
    }
  })

  const rootAssetWorkerRequests = requestedUrls.filter(url => {
    const parsed = new URL(url)
    return parsed.origin === baseUrl && /^\/assets\/pptx\.worker-.*\.js$/.test(parsed.pathname)
  })

  if (rootAssetWorkerRequests.length) {
    failures.push(`PPTX worker was requested from the site root instead of the web-full subpath: ${rootAssetWorkerRequests.join(', ')}`)
  }
  if (state.visibleErrors.length) {
    failures.push(`Visible PPTX errors: ${state.visibleErrors.join(' | ')}`)
  }
  if (state.slides < 1) {
    failures.push(`Expected at least one rendered PPTX slide, got ${state.slides}.`)
  }
  if (failures.length) {
    fail(failures.join('\n'))
  }
} finally {
  await browser.close()
  await new Promise(resolveClose => server.close(resolveClose))
}

console.log(`[web-full-iife-pptx] Verified PPTX worker and slide rendering from ${baseUrl}/viewer/`)
