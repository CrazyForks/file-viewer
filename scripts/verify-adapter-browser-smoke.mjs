import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { createRequire } from 'node:module'
import { delimiter, extname, join, normalize, relative, resolve, sep } from 'node:path'
import { pathToFileURL } from 'node:url'

const outputDir = resolve(process.env.ADAPTER_DEMO_OUTPUT_DIR || 'packages/demo/dist')
const externalUrl = process.env.ADAPTER_DEMO_URL
const timeout = Number(process.env.ADAPTER_BROWSER_SMOKE_TIMEOUT || 30000)

const mimeTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.wasm', 'application/wasm']
])
const require = createRequire(import.meta.url)

const fail = message => {
  console.error(`[adapter-browser-smoke] ${message}`)
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
        const runtimeEntry = require.resolve('playwright', { paths: [candidatePath] })
        return await import(pathToFileURL(runtimeEntry).href)
      } catch {
        // Continue probing npm exec / npx injected package roots.
      }
    }

    fail([
      'Missing playwright runtime.',
      'Run with: npm exec --yes --package playwright -- node scripts/verify-adapter-browser-smoke.mjs',
      `Original error: ${error instanceof Error ? error.message : String(error)}`
    ].join('\n'))
  }
}

const startStaticServer = async () => {
  if (!existsSync(join(outputDir, 'manual-iife.html'))) {
    fail(`Missing adapter demo build output: ${join(outputDir, 'manual-iife.html')}`)
  }

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
    fail('Unable to resolve adapter demo smoke server address.')
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

const assertNoBrowserFailures = (failures, context) => {
  if (failures.length) {
    fail([context, ...failures].join('\n'))
  }
}

const assertViewerFrameSrc = async (page, selector, expected) => {
  const frameHandle = await page.waitForSelector(selector, { timeout })
  const src = await frameHandle.getAttribute('src')
  if (!src) {
    fail(`${selector} did not render a viewer iframe src.`)
  }

  const frameUrl = new URL(src, page.url())
  if (frameUrl.pathname !== expected.viewerPath) {
    fail(`${selector} should load ${expected.viewerPath}, got ${frameUrl.pathname}`)
  }
  if (frameUrl.searchParams.get('url') !== expected.fileUrl) {
    fail(`${selector} should preview ${expected.fileUrl}, got ${frameUrl.searchParams.get('url')}`)
  }
}

const verifyAdapterIndexDemo = async (page, baseUrl, failures) => {
  await page.goto(`${baseUrl}/index.html`, {
    waitUntil: 'domcontentloaded',
    timeout
  })
  await page.waitForFunction(
    () => document.body.innerText.includes('React') && document.body.innerText.includes('Web'),
    { timeout }
  )

  const expected = {
    viewerPath: '/vendor/file-viewer/index.html',
    fileUrl: '/example/word.docx'
  }
  await assertViewerFrameSrc(page, '[data-testid="react-viewer"]', expected)
  await assertViewerFrameSrc(page, '[data-testid="web-viewer-host"] iframe', expected)
  assertNoBrowserFailures(failures, 'Adapter index demo emitted browser errors.')
  failures.length = 0
}

const verifySingleAdapterDemo = async (page, baseUrl, config, failures) => {
  await page.goto(`${baseUrl}/${config.path}`, {
    waitUntil: 'domcontentloaded',
    timeout
  })
  await page.waitForFunction(
    adapter => document.body.getAttribute('data-adapter') === adapter,
    config.adapter,
    { timeout }
  )
  await assertViewerFrameSrc(page, config.frameSelector, {
    viewerPath: '/vendor/file-viewer/index.html',
    fileUrl: '/example/preview.md'
  })
  assertNoBrowserFailures(failures, `${config.label} demo emitted browser errors.`)
  failures.length = 0
}

const verifyIifeDemo = async (page, baseUrl, failures) => {
  await page.goto(`${baseUrl}/manual-iife.html`, {
    waitUntil: 'domcontentloaded',
    timeout
  })
  await page.waitForFunction(
    () => {
      const api = window.FlyfishFileViewerWeb
      const frame = document.querySelector('#viewer iframe')
      return Boolean(
        api &&
        typeof api.mountViewer === 'function' &&
        typeof api.mountViewerFrame === 'function' &&
        frame &&
        frame.getAttribute('src')?.includes('/file-viewer/index.html')
      )
    },
    { timeout }
  )

  const frame = page.frames().find(item => item.url().includes('/file-viewer/index.html'))
  if (!frame) {
    fail('IIFE demo did not create a viewer iframe.')
  }

  await frame.waitForSelector('body', { timeout })
  await frame.waitForFunction(
    () => document.body.innerText.includes('preview.md') || document.body.innerText.includes('Flyfish Viewer 私有化预览'),
    { timeout }
  )

  const status = await page.getAttribute('body', 'data-viewer-status')
  if (status === 'missing-global') {
    fail('IIFE global API was not available on window.')
  }
  assertNoBrowserFailures(failures, 'IIFE script tag demo emitted browser errors.')
  failures.length = 0
}

const run = async () => {
  const playwrightRuntime = await importPlaywright()
  const { chromium } = playwrightRuntime.chromium ? playwrightRuntime : playwrightRuntime.default
  const serverHandle = externalUrl
    ? { server: null, url: externalUrl.replace(/\/$/, '') }
    : await startStaticServer()
  const browser = await launchChromium(chromium)
  const page = await browser.newPage()
  const failures = []

  page.on('pageerror', error => {
    failures.push(`pageerror: ${error.message}`)
  })
  page.on('console', message => {
    if (message.type() === 'error') {
      failures.push(`console.error: ${message.text()}`)
    }
  })

  try {
    await verifyAdapterIndexDemo(page, serverHandle.url, failures)
    await verifySingleAdapterDemo(page, serverHandle.url, {
      adapter: 'jquery',
      frameSelector: '[data-testid="jquery-viewer-host"] iframe',
      label: 'jQuery adapter',
      path: 'jquery.html'
    }, failures)
    await verifySingleAdapterDemo(page, serverHandle.url, {
      adapter: 'svelte-action',
      frameSelector: '[data-testid="svelte-viewer-host"] iframe',
      label: 'Svelte action adapter',
      path: 'svelte-action.html'
    }, failures)
    await verifyIifeDemo(page, serverHandle.url, failures)
  } finally {
    await browser.close()
    await new Promise(resolveClose => serverHandle.server?.close(resolveClose) ?? resolveClose())
  }

  console.log(`[adapter-browser-smoke] Verified React, Web, jQuery, Svelte action, and script tag IIFE demos at ${serverHandle.url}`)
}

run().catch(error => {
  const hint = String(error?.message || error)
  if (hint.includes('Executable doesn') || hint.includes('browserType.launch')) {
    console.error(
      [
        '[adapter-browser-smoke] Playwright browser is not installed.',
        'Run: npm exec --yes --package playwright -- playwright install chromium',
        `Original error: ${hint}`
      ].join('\n')
    )
    process.exit(1)
  }
  fail(error instanceof Error ? error.stack || error.message : String(error))
})
