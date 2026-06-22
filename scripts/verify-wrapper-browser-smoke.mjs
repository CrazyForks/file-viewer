import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { createRequire } from 'node:module'
import { delimiter, extname, join, normalize, relative, resolve, sep } from 'node:path'
import { pathToFileURL } from 'node:url'

const outputDir = resolve(process.env.WRAPPER_DEMO_OUTPUT_DIR || 'apps/component-demo/dist')
const externalUrl = process.env.WRAPPER_DEMO_URL
const timeout = Number(process.env.WRAPPER_BROWSER_SMOKE_TIMEOUT || 30000)

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
  console.error(`[wrapper-browser-smoke] ${message}`)
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
        // Continue probing npm exec / npx injected package roots.
      }
    }

    fail([
      'Missing playwright module.',
      'Run with: npm exec --yes --package playwright -- node scripts/verify-wrapper-browser-smoke.mjs',
      `Original error: ${error instanceof Error ? error.message : String(error)}`
    ].join('\n'))
  }
}

const startStaticServer = async () => {
  if (!existsSync(join(outputDir, 'manual-iife.html'))) {
    fail(`Missing wrapper demo build output: ${join(outputDir, 'manual-iife.html')}`)
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
    fail('Unable to resolve wrapper demo smoke server address.')
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

const assertNativeViewerMounted = async (page, selector, label) => {
  await page.waitForSelector(selector, { timeout })
  let mounted
  try {
    mounted = await page.waitForFunction(
      targetSelector => {
        const host = document.querySelector(targetSelector)
        const viewerSelector = [
          '.file-viewer',
          '.file-render',
          '.docx-fit-viewer',
          '[class*="file-viewer"]',
          '[class*="file-render"]',
          '[data-viewer-zoom-provider]',
          '[data-rendered-document]'
        ].join(',')
        return Boolean(
          host &&
          (host.matches(viewerSelector) || host.querySelector(viewerSelector))
        )
      },
      selector,
      { timeout }
    )
  } catch (error) {
    const snapshot = await page.evaluate(targetSelector => {
      const host = document.querySelector(targetSelector)
      return {
        selector: targetSelector,
        title: document.title,
        bodyStatus: document.body.getAttribute('data-viewer-status') || '',
        hostExists: Boolean(host),
        hostClass: host?.getAttribute('class') || '',
        hostHtml: host?.outerHTML.slice(0, 800) || '',
        bodyText: document.body.innerText.slice(0, 800)
      }
    }, selector)
    fail([
      `${label} did not render a native viewer before timeout.`,
      JSON.stringify(snapshot, null, 2),
      error instanceof Error ? error.message : String(error)
    ].join('\n'))
  }
  if (!mounted) {
    fail(`${label} did not render a native viewer.`)
  }
}

const verifyWrapperIndexDemo = async (page, baseUrl, failures) => {
  await page.goto(`${baseUrl}/index.html`, {
    waitUntil: 'domcontentloaded',
    timeout
  })
  await page.waitForFunction(
    () => document.body.innerText.includes('React') && document.body.innerText.includes('Web'),
    { timeout }
  )

  await assertNativeViewerMounted(page, '[data-testid="react-viewer"]', 'React wrapper')
  await assertNativeViewerMounted(page, '[data-testid="web-viewer-host"]', 'Pure Web wrapper')
  assertNoBrowserFailures(failures, 'Wrapper index demo emitted browser errors.')
  failures.length = 0
}

const verifySingleWrapperDemo = async (page, baseUrl, config, failures) => {
  await page.goto(`${baseUrl}/${config.path}`, {
    waitUntil: 'domcontentloaded',
    timeout
  })
  await page.waitForFunction(
    wrapper => (
      document.body.getAttribute('data-component') ||
      document.body.getAttribute('data-wrapper')
    ) === wrapper,
    config.wrapper,
    { timeout }
  )
  await assertNativeViewerMounted(page, config.hostSelector, config.label)
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
      return Boolean(
        api &&
        typeof api.mountViewer === 'function' &&
        typeof api.createViewerControllerHandle === 'function' &&
        typeof api.defineFileViewerElement === 'function' &&
        customElements.get('flyfish-file-viewer')
      )
    },
    { timeout }
  )
  await assertNativeViewerMounted(page, '#viewer', 'IIFE script tag demo')

  const status = await page.getAttribute('body', 'data-viewer-status')
  if (status === 'missing-global') {
    fail('IIFE global API was not available on window.')
  }
  assertNoBrowserFailures(failures, 'IIFE script tag demo emitted browser errors.')
  failures.length = 0
}

const verifyManualJsDemo = async (page, baseUrl, failures) => {
  await page.goto(`${baseUrl}/manual-js.html`, {
    waitUntil: 'domcontentloaded',
    timeout
  })
  await assertNativeViewerMounted(page, '#viewer', 'Manual JS demo')

  try {
    await page.waitForFunction(
      () => {
        const status = document.querySelector('#status')?.textContent?.trim()
        return Boolean(status && status !== 'loading')
      },
      { timeout }
    )
  } catch (error) {
    const snapshot = await page.evaluate(() => ({
      statusText: document.querySelector('#status')?.textContent?.trim() || '',
      bodyStatus: document.body.getAttribute('data-viewer-status') || '',
      hasGlobalApi: Boolean(window.FlyfishFileViewerWeb?.mountViewer),
      hostHtml: document.querySelector('#viewer')?.innerHTML.slice(0, 240) || ''
    }))
    fail([
      'Manual JS native demo did not report a mounted status.',
      JSON.stringify(snapshot, null, 2),
      ...failures,
      error instanceof Error ? error.message : String(error)
    ].join('\n'))
  }

  assertNoBrowserFailures(failures, 'Manual JS native demo emitted browser errors.')
  failures.length = 0
}

const run = async () => {
  const playwrightModule = await importPlaywright()
  const { chromium } = playwrightModule.chromium ? playwrightModule : playwrightModule.default
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
  page.on('response', response => {
    const responseUrl = new URL(response.url())
    if (responseUrl.origin === serverHandle.url && response.status() >= 400) {
      failures.push(`HTTP ${response.status()}: ${response.url()}`)
    }
  })

  try {
    await verifyWrapperIndexDemo(page, serverHandle.url, failures)
    await verifySingleWrapperDemo(page, serverHandle.url, {
      wrapper: 'jquery',
      hostSelector: '[data-testid="jquery-viewer-host"]',
      label: 'jQuery wrapper',
      path: 'jquery.html'
    }, failures)
    await verifySingleWrapperDemo(page, serverHandle.url, {
      wrapper: 'custom-element',
      hostSelector: '[data-testid="custom-element-viewer-host"]',
      label: 'Vanilla JS custom element wrapper',
      path: 'custom-element.html'
    }, failures)
    await verifySingleWrapperDemo(page, serverHandle.url, {
      wrapper: 'vue3',
      hostSelector: '[data-testid="vue3-viewer-host"]',
      label: 'Vue 3 wrapper',
      path: 'vue3.html'
    }, failures)
    await verifySingleWrapperDemo(page, serverHandle.url, {
      wrapper: 'svelte-action',
      hostSelector: '[data-testid="svelte-viewer-host"]',
      label: 'Svelte action wrapper',
      path: 'svelte-action.html'
    }, failures)
    await verifyManualJsDemo(page, serverHandle.url, failures)
    await verifyIifeDemo(page, serverHandle.url, failures)
  } finally {
    await browser.close()
    await new Promise(resolveClose => serverHandle.server?.close(resolveClose) ?? resolveClose())
  }

  console.log(`[wrapper-browser-smoke] Verified React, Web, Vanilla JS custom element, Vue 3, jQuery, Svelte action, manual JS, and script tag IIFE native demos at ${serverHandle.url}`)
}

run().catch(error => {
  const hint = String(error?.message || error)
  if (hint.includes('Executable doesn') || hint.includes('browserType.launch')) {
    console.error(
      [
        '[wrapper-browser-smoke] Playwright browser is not installed.',
        'Run: npm exec --yes --package playwright -- playwright install chromium',
        `Original error: ${hint}`
      ].join('\n')
    )
    process.exit(1)
  }
  fail(error instanceof Error ? error.stack || error.message : String(error))
})
