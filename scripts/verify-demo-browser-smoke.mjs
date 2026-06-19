import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { createRequire } from 'node:module'
import { delimiter, extname, join, normalize, relative, resolve, sep } from 'node:path'
import { pathToFileURL } from 'node:url'

const outputDir = resolve(
  process.env.DEMO_BROWSER_SMOKE_OUTPUT_DIR ||
  process.env.DEMO_OUTPUT_DIR ||
  'apps/viewer-demo/dist'
)
const externalUrl = process.env.DEMO_BROWSER_SMOKE_URL
const timeout = Number(process.env.DEMO_BROWSER_SMOKE_TIMEOUT || 45000)
const require = createRequire(import.meta.url)

const mimeTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.gif', 'image/gif'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.md', 'text/markdown; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml; charset=utf-8'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.wasm', 'application/wasm'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2']
])

const fail = message => {
  console.error(`[demo-browser-smoke] ${message}`)
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
        // Keep probing package roots injected by npm exec / npx.
      }
    }

    fail([
      'Missing playwright module.',
      'Run with: npm exec --yes --package playwright -- node scripts/verify-demo-browser-smoke.mjs',
      `Original error: ${error instanceof Error ? error.message : String(error)}`
    ].join('\n'))
  }
}

const assertBuildOutput = () => {
  for (const file of ['index.html', 'compare.html']) {
    const filePath = join(outputDir, file)
    if (!existsSync(filePath) || !statSync(filePath).isFile()) {
      fail(`Missing demo build output ${filePath}. Run pnpm build-only first.`)
    }
  }
}

const startStaticServer = async () => {
  assertBuildOutput()

  const server = createServer((request, response) => {
    const requestUrl = new URL(request.url || '/', 'http://127.0.0.1')
    const decodedPath = decodeURIComponent(requestUrl.pathname)
    const normalizedPath = normalize(decodedPath).replace(/^(\.\.(\/|\\|$))+/, '')
    const relativePath = normalizedPath === '/' ? 'index.html' : normalizedPath.replace(/^[/\\]+/, '')
    const filePath = resolve(outputDir, relativePath)

    if (!filePath.startsWith(outputDir) || relative(outputDir, filePath).startsWith('..')) {
      response.writeHead(403)
      response.end('Forbidden')
      return
    }

    if (!existsSync(filePath) || !statSync(filePath).isFile()) {
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
  if (!address || typeof address === 'string') {
    fail('Unable to resolve demo smoke server address.')
  }

  return {
    server,
    url: `http://127.0.0.1:${address.port}`
  }
}

const launchChromium = async chromium => {
  try {
    return await chromium.launch({ headless: true })
  } catch (error) {
    try {
      return await chromium.launch({ channel: 'chrome', headless: true })
    } catch {
      throw error
    }
  }
}

const createFailureRecorder = (page, baseUrl) => {
  const failures = []
  const baseOrigin = new URL(baseUrl).origin

  page.on('pageerror', error => {
    failures.push(`pageerror: ${error.message}`)
  })
  page.on('console', message => {
    if (message.type() === 'error') {
      failures.push(`console.error: ${message.text()}`)
    }
  })
  page.on('response', response => {
    const responseUrl = new URL(response.url())
    if (responseUrl.origin === baseOrigin && response.status() >= 400) {
      failures.push(`HTTP ${response.status()}: ${response.url()}`)
    }
  })

  return failures
}

const assertNoBrowserFailures = (failures, context) => {
  if (failures.length) {
    fail([context, ...failures].join('\n'))
  }
}

const waitForBodyText = async (page, requiredTexts, context) => {
  await page.waitForFunction(
    texts => texts.every(text => document.body.innerText.includes(text)),
    requiredTexts,
    { timeout }
  ).catch(error => {
    throw new Error(`${context} did not render expected text: ${requiredTexts.join(', ')}\n${error.message}`)
  })
}

const verifyMainDemo = async (page, baseUrl, failures) => {
  await page.goto(`${baseUrl}/index.html?url=/example/markdown.md&smoke=demo-browser`, {
    waitUntil: 'domcontentloaded',
    timeout
  })
  await page.waitForSelector('.file-viewer .content:not(.hidden)', { timeout })
  await waitForBodyText(page, [
    'markdown.md',
    'Flyfish File Viewer Markdown Demo',
    'Release Checklist'
  ], 'Main demo')
  assertNoBrowserFailures(failures, 'Main demo emitted browser errors.')
  failures.length = 0
}

const verifyCompareDemo = async (page, baseUrl, failures) => {
  const url = new URL(`${baseUrl}/compare.html`)
  url.searchParams.set('left', '/example/markdown.md')
  url.searchParams.set('right', '/example/text.txt')
  url.searchParams.set('smoke', 'demo-browser')

  await page.goto(url.href, {
    waitUntil: 'domcontentloaded',
    timeout
  })
  await page.waitForSelector('.compare-panel', { timeout })
  await page.waitForFunction(
    () => document.querySelectorAll('.compare-panel').length === 2 &&
      document.querySelectorAll('.compare-viewer .file-viewer').length === 2,
    undefined,
    { timeout }
  )
  await waitForBodyText(page, [
    '文档比对',
    'Flyfish File Viewer Markdown Demo',
    'File Viewer text sample'
  ], 'Compare demo')

  const searchPopoverCount = await page.locator('.compare-search-popover').count()
  if (searchPopoverCount !== 0) {
    fail('Compare search popover should be hidden before the keyboard shortcut is pressed.')
  }
  await page.keyboard.press('Control+F')
  await page.waitForSelector('.compare-search-popover input[type="search"]', { timeout })
  await page.keyboard.press('Escape')
  await page.waitForFunction(
    () => !document.querySelector('.compare-search-popover'),
    undefined,
    { timeout }
  )

  assertNoBrowserFailures(failures, 'Compare demo emitted browser errors.')
  failures.length = 0
}

const run = async () => {
  const playwrightModule = await importPlaywright()
  const { chromium } = playwrightModule.chromium ? playwrightModule : playwrightModule.default
  const serverHandle = externalUrl
    ? { server: null, url: externalUrl.replace(/\/$/, '') }
    : await startStaticServer()
  const browser = await launchChromium(chromium)
  const page = await browser.newPage({
    viewport: {
      width: 1440,
      height: 960
    }
  })
  const failures = createFailureRecorder(page, serverHandle.url)

  try {
    await verifyMainDemo(page, serverHandle.url, failures)
    await verifyCompareDemo(page, serverHandle.url, failures)
  } finally {
    await browser.close()
    await new Promise(resolveClose => serverHandle.server?.close(resolveClose) ?? resolveClose())
  }

  console.log(`[demo-browser-smoke] Verified main demo and compare page at ${serverHandle.url}`)
}

run().catch(error => {
  const hint = String(error?.message || error)
  if (hint.includes('Executable doesn') || hint.includes('browserType.launch')) {
    console.error(
      [
        '[demo-browser-smoke] Playwright browser is not installed.',
        'Run: npm exec --yes --package playwright -- playwright install chromium',
        `Original error: ${hint}`
      ].join('\n')
    )
    process.exit(1)
  }
  fail(error instanceof Error ? error.stack || error.message : String(error))
})
