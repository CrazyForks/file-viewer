import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, normalize, resolve } from 'node:path'
import { chromium } from 'playwright'

const distDir = resolve(process.env.FILE_VIEWER_PUBLIC_SMOKE_DIST || 'apps/viewer-demo/dist')
const timeout = Number(process.env.FILE_VIEWER_PUBLIC_SMOKE_TIMEOUT || 45_000)
const entryPath = join(distDir, 'index.html')

if (!existsSync(entryPath)) {
  throw new Error(`Built demo is missing: ${entryPath}. Run pnpm build first.`)
}

const html = readFileSync(entryPath, 'utf8')
for (const expected of [
  '<html lang="en">',
  '<title>Flyfish File Viewer — Browser-native, offline-first file preview</title>',
  '<link rel="canonical" href="https://demo.file-viewer.app/">',
  '<meta property="og:locale" content="en_US">',
  '<meta name="twitter:card" content="summary_large_image">'
]) {
  if (!html.includes(expected)) {
    throw new Error(`Built demo metadata is missing ${expected}`)
  }
}

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.wasm': 'application/wasm'
}

const server = createServer((request, response) => {
  const requestUrl = new URL(request.url || '/', 'http://127.0.0.1')
  const cleanPath = decodeURIComponent(requestUrl.pathname)
  const candidate = cleanPath === '/'
    ? entryPath
    : join(distDir, normalize(cleanPath).replace(/^[/\\]+/, ''))
  const filePath = existsSync(candidate) && statSync(candidate).isFile() ? candidate : entryPath
  response.writeHead(200, {
    'Content-Type': contentTypes[extname(filePath).toLowerCase()] || 'application/octet-stream',
    'Cache-Control': 'no-store'
  })
  createReadStream(filePath).pipe(response)
})

await new Promise((resolveListen, rejectListen) => {
  server.once('error', rejectListen)
  server.listen(0, '127.0.0.1', resolveListen)
})

const address = server.address()
const baseUrl = `http://127.0.0.1:${address.port}`
let browser

try {
  browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 800 }, locale: 'en-US' })
  const errors = []
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text())
  })
  page.on('pageerror', error => errors.push(error.message))

  await page.goto(`${baseUrl}/?lang=en&smoke=public-ci-controls`, {
    waitUntil: 'domcontentloaded',
    timeout
  })
  await page.waitForSelector('.file-viewer .content:not(.hidden)', { timeout })
  await page.locator('.sample-trigger').click()
  await page.waitForSelector('.sample-picker.open .sample-menu', { timeout })

  const desktopLayering = await page.evaluate(() => {
    const picker = document.querySelector('.sample-picker.open')
    const menu = document.querySelector('.sample-menu')
    const blockers = ['.panel-sticky-controls', '.scenario-picker']
      .map(selector => document.querySelector(selector))
      .filter(element => element instanceof HTMLElement)
    if (!(picker instanceof HTMLElement) || !(menu instanceof HTMLElement)) return null
    const pickerLayer = Number.parseInt(getComputedStyle(picker).zIndex, 10) || 0
    return {
      pickerLayer,
      blockerLayers: blockers.map(element => Number.parseInt(getComputedStyle(element).zIndex, 10) || 0),
      visible: menu.getBoundingClientRect().height > 200
    }
  })
  if (!desktopLayering?.visible || desktopLayering.blockerLayers.some(layer => layer >= desktopLayering.pickerLayer)) {
    throw new Error(`Desktop sample picker layering failed: ${JSON.stringify(desktopLayering)}`)
  }

  await page.keyboard.press('Escape')
  await page.setViewportSize({ width: 390, height: 844 })
  await page.locator('.mobile-quick-row .mobile-fab').nth(1).click()
  await page.waitForSelector('.mobile-controls-open .sample-picker.open .sample-menu', { timeout })
  await page.waitForTimeout(400)

  const mobileLayout = await page.evaluate(() => {
    const panel = document.querySelector('.control-panel')
    const menu = document.querySelector('.sample-menu')
    if (!(panel instanceof HTMLElement) || !(menu instanceof HTMLElement)) return null
    const panelRect = panel.getBoundingClientRect()
    const menuRect = menu.getBoundingClientRect()
    return {
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: innerWidth,
      viewportHeight: innerHeight,
      panelRect: { top: panelRect.top, right: panelRect.right, bottom: panelRect.bottom, left: panelRect.left },
      menuRect: { top: menuRect.top, right: menuRect.right, bottom: menuRect.bottom, left: menuRect.left },
      panelInside: panelRect.left >= -1 && panelRect.right <= innerWidth + 1 && panelRect.top >= -1 && panelRect.bottom <= innerHeight + 1,
      menuInside: menuRect.left >= panelRect.left - 1 && menuRect.right <= panelRect.right + 1 && menuRect.top >= panelRect.top - 1 && menuRect.bottom <= panelRect.bottom + 1,
      scrollable: menu.scrollHeight > menu.clientHeight && menu.clientHeight >= 180
    }
  })
  if (!mobileLayout || mobileLayout.documentWidth > mobileLayout.viewportWidth + 2 || !mobileLayout.panelInside || !mobileLayout.menuInside || !mobileLayout.scrollable) {
    throw new Error(`Mobile sample picker layout failed: ${JSON.stringify(mobileLayout)}`)
  }

  await page.setViewportSize({ width: 1440, height: 800 })
  await page.goto(`${baseUrl}/?lang=en&url=/example/en/markdown.md&smoke=public-ci-markdown`, {
    waitUntil: 'domcontentloaded',
    timeout
  })
  await page.waitForSelector('.file-viewer .content:not(.hidden)', { timeout })
  await page.waitForSelector('.markdown-body', { timeout })

  const actionableErrors = errors.filter(message => !/favicon|ResizeObserver loop/i.test(message))
  if (actionableErrors.length) {
    throw new Error(`Browser console errors:\n${actionableErrors.join('\n')}`)
  }

  console.log('[public-browser-smoke] English Markdown, metadata, desktop picker and 390px mobile picker verified.')
} finally {
  await browser?.close()
  await new Promise(resolveClose => server.close(resolveClose))
}
