import { createReadStream, existsSync, readdirSync, statSync } from 'node:fs'
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
const sampleTimeout = Number(process.env.DEMO_BROWSER_SMOKE_SAMPLE_TIMEOUT || Math.max(timeout, 60000))
const sourceExamplesRoot = resolve('apps/viewer-demo/public/example')
const examplesRoot = resolve(
  process.env.DEMO_BROWSER_SMOKE_EXAMPLE_DIR ||
  (externalUrl && existsSync(sourceExamplesRoot)
    ? sourceExamplesRoot
    : existsSync(join(outputDir, 'example'))
      ? join(outputDir, 'example')
      : sourceExamplesRoot)
)
const require = createRequire(import.meta.url)

const sampleSmokeConfig = {
  hiddenStateSelectors: [
    '.cad-state[hidden]',
    '.drawing-state[hidden]',
    '.epub-state[hidden]',
    '.model-state[hidden]',
    '.ofd-state[hidden]',
    '.pdf-nav-pane[hidden]',
    '.pdf-state[hidden]',
    '.pptx-error[hidden]',
    '.pptx-loading[hidden]',
    '.umd-state[hidden]',
    '.xmind-state[hidden]'
  ],
  loadingSelectors: [
    '.archive-state:not(.archive-hidden)',
    '.cad-state:not(.error):not([hidden])',
    '.drawing-state:not(.error):not([hidden])',
    '.eda-state',
    '.email-state',
    '.epub-state:not(.error):not([hidden])',
    '.excel-wrapper .loading:not(.hidden)',
    '.model-state:not(.error):not([hidden])',
    '.ofd-state:not(.error):not([hidden])',
    '.pdf-state:not(.pdf-state--error):not([hidden])',
    '.pptx-loading:not([hidden])',
    '.sheet-loading:not(.hidden)',
    '.state-panel.loading-panel:not(.hidden)',
    '.typst-loading',
    '.umd-state:not(.error):not([hidden])',
    '.xmind-state:not(.error):not([hidden])'
  ],
  errorSelectors: [
    '.archive-error:not(.archive-hidden)',
    '.cad-state.error:not([hidden])',
    '.drawing-state.error:not([hidden])',
    '.epub-state.error:not([hidden])',
    '.model-state.error:not([hidden])',
    '.ofd-state.error:not([hidden])',
    '.pdf-state.pdf-state--error:not([hidden])',
    '.pptx-error:not([hidden])',
    '.state-panel.error-panel:not(.hidden)',
    '.typst-error',
    '.umd-state.error:not([hidden])',
    '.xmind-state.error:not([hidden])'
  ],
  meaningfulSelectors: [
    '.archive-entry',
    '.archive-nested-target > *',
    '.cad-shell',
    '.docx-wrapper',
    '.drawing-viewer svg',
    '.email-viewer',
    '.epub-viewer iframe',
    '.excel-wrapper',
    '.file-viewer .content:not(.hidden)',
    '.geo-viewer',
    '.markdown-body',
    '.model-viewer canvas',
    '.ofd-viewer canvas',
    '.pdfViewer .page',
    '.pptx-slide',
    '.typst-page-shell',
    '.umd-viewer',
    '.xmind-node',
    'audio',
    'canvas',
    'code',
    'iframe',
    'img',
    'pre',
    'svg',
    'table',
    'video'
  ],
  allowedNotices: [
    {
      sample: 'model.step',
      includes: 'STEP 属于 CAD B-Rep'
    }
  ]
}

const verifyXMindPanInteraction = async (page, samplePath) => {
  const result = await page.evaluate(async () => {
    const stage = document.querySelector('.xmind-stage')
    const zoomBox = document.querySelector('.xmind-zoom-box')
    const nodeCount = document.querySelectorAll('.xmind-node').length
    if (!(stage instanceof HTMLElement) || !(zoomBox instanceof HTMLElement)) {
      return {
        ok: false,
        reason: 'missing XMind stage or zoom box',
        nodeCount
      }
    }

    const readTransform = () => window.getComputedStyle(zoomBox).transform || zoomBox.style.transform
    const readFirstNodeRect = () => {
      const node = document.querySelector('.xmind-node')
      if (!(node instanceof HTMLElement)) {
        return null
      }
      const rect = node.getBoundingClientRect()
      return {
        left: Number(rect.left.toFixed(2)),
        top: Number(rect.top.toFixed(2))
      }
    }
    const rectChanged = (beforeRect, afterRect) => Boolean(
      beforeRect &&
      afterRect &&
      (Math.abs(beforeRect.left - afterRect.left) > 8 || Math.abs(beforeRect.top - afterRect.top) > 8)
    )
    const rect = stage.getBoundingClientRect()
    const startX = rect.left + rect.width * 0.52
    const startY = rect.top + rect.height * 0.48
    const waitFrame = () => new Promise(resolve => requestAnimationFrame(resolve))
    const resetView = async () => {
      stage.dispatchEvent(new MouseEvent('dblclick', {
        bubbles: true,
        button: 0,
        buttons: 0,
        cancelable: true,
        clientX: startX,
        clientY: startY
      }))
      await waitFrame()
      await waitFrame()
    }
    const dispatchPointer = (type, clientX, clientY, buttons, pointerId, pointerType = 'mouse') => {
      stage.dispatchEvent(new PointerEvent(type, {
        bubbles: true,
        button: 0,
        buttons,
        cancelable: true,
        clientX,
        clientY,
        pointerId,
        pointerType
      }))
    }
    const pointerDrag = async (pointerId, moveButtons = 1) => {
      await resetView()
      const before = readTransform()
      const beforeNodeRect = readFirstNodeRect()

      stage.focus({ preventScroll: true })
      dispatchPointer('pointerdown', startX, startY, 1, pointerId)
      dispatchPointer('pointermove', startX + 180, startY + 96, moveButtons, pointerId)
      await waitFrame()
      dispatchPointer('pointermove', startX + 220, startY + 118, moveButtons, pointerId)
      await waitFrame()
      dispatchPointer('pointerup', startX + 220, startY + 118, 0, pointerId)
      await waitFrame()
      const afterNodeRect = readFirstNodeRect()

      return {
        before,
        after: readTransform(),
        beforeNodeRect,
        afterNodeRect,
        nodeMoved: rectChanged(beforeNodeRect, afterNodeRect)
      }
    }

    const dispatchMouse = (type, clientX, clientY, buttons) => {
      stage.dispatchEvent(new MouseEvent(type, {
        bubbles: true,
        button: 0,
        buttons,
        cancelable: true,
        clientX,
        clientY
      }))
    }
    const mouseDrag = async () => {
      await resetView()
      const before = readTransform()
      stage.focus({ preventScroll: true })
      dispatchMouse('mousedown', startX + 8, startY + 8, 1)
      dispatchMouse('mousemove', startX + 118, startY + 74, 1)
      await waitFrame()
      dispatchMouse('mousemove', startX + 148, startY + 96, 1)
      await waitFrame()
      dispatchMouse('mouseup', startX + 148, startY + 96, 0)
      await waitFrame()
      return { before, after: readTransform() }
    }

    const pointerMouseHybridDrag = async () => {
      await resetView()
      const before = readTransform()
      stage.focus({ preventScroll: true })
      dispatchPointer('pointerdown', startX + 10, startY + 10, 1, 2321, 'mouse')
      dispatchMouse('mousemove', startX + 116, startY + 78, 1)
      await waitFrame()
      dispatchMouse('mousemove', startX + 148, startY + 102, 1)
      await waitFrame()
      dispatchMouse('mouseup', startX + 148, startY + 102, 0)
      await waitFrame()
      return { before, after: readTransform() }
    }

    const touchDrag = async () => {
      if (typeof Touch !== 'function' || typeof TouchEvent !== 'function') {
        return { skipped: true, before: readTransform(), after: readTransform() }
      }
      const makeTouch = (clientX, clientY) => new Touch({
        identifier: 917,
        target: stage,
        clientX,
        clientY,
        screenX: clientX,
        screenY: clientY,
        pageX: clientX,
        pageY: clientY
      })
      const dispatchTouch = (type, clientX, clientY, active) => {
        const touch = makeTouch(clientX, clientY)
        stage.dispatchEvent(new TouchEvent(type, {
          bubbles: true,
          cancelable: true,
          touches: active ? [touch] : [],
          targetTouches: active ? [touch] : [],
          changedTouches: [touch]
        }))
      }
      await resetView()
      const before = readTransform()
      stage.focus({ preventScroll: true })
      dispatchTouch('touchstart', startX + 14, startY + 14, true)
      dispatchTouch('touchmove', startX + 96, startY + 62, true)
      await waitFrame()
      dispatchTouch('touchmove', startX + 128, startY + 88, true)
      await waitFrame()
      dispatchTouch('touchend', startX + 128, startY + 88, false)
      await waitFrame()
      return { skipped: false, before, after: readTransform() }
    }

    const pointerTouchHybridDrag = async () => {
      if (typeof Touch !== 'function' || typeof TouchEvent !== 'function') {
        return { skipped: true, before: readTransform(), after: readTransform() }
      }
      const makeTouch = (clientX, clientY) => new Touch({
        identifier: 918,
        target: stage,
        clientX,
        clientY,
        screenX: clientX,
        screenY: clientY,
        pageX: clientX,
        pageY: clientY
      })
      const dispatchTouch = (type, clientX, clientY, active) => {
        const touch = makeTouch(clientX, clientY)
        stage.dispatchEvent(new TouchEvent(type, {
          bubbles: true,
          cancelable: true,
          touches: active ? [touch] : [],
          targetTouches: active ? [touch] : [],
          changedTouches: [touch]
        }))
      }
      await resetView()
      const before = readTransform()
      stage.focus({ preventScroll: true })
      dispatchPointer('pointerdown', startX + 16, startY + 16, 1, 2322, 'touch')
      dispatchTouch('touchmove', startX + 108, startY + 76, true)
      await waitFrame()
      dispatchTouch('touchmove', startX + 142, startY + 104, true)
      await waitFrame()
      dispatchTouch('touchend', startX + 142, startY + 104, false)
      await waitFrame()
      return { skipped: false, before, after: readTransform() }
    }

    const wheelPan = async () => {
      await resetView()
      const before = readTransform()
      const beforeNodeRect = readFirstNodeRect()
      stage.dispatchEvent(new WheelEvent('wheel', {
        bubbles: true,
        cancelable: true,
        deltaX: 96,
        deltaY: 48,
        clientX: startX,
        clientY: startY
      }))
      await waitFrame()
      const afterNodeRect = readFirstNodeRect()
      return {
        before,
        after: readTransform(),
        beforeNodeRect,
        afterNodeRect,
        nodeMoved: rectChanged(beforeNodeRect, afterNodeRect)
      }
    }

    const normalDrag = await pointerDrag(2319, 1)
    const zeroButtonsDrag = await pointerDrag(2320, 0)
    const mouseFallbackDrag = await mouseDrag()
    const pointerMouseHybridFallbackDrag = await pointerMouseHybridDrag()
    const touchFallbackDrag = await touchDrag()
    const pointerTouchHybridFallbackDrag = await pointerTouchHybridDrag()
    const wheelFallbackPan = await wheelPan()
    const touchOk = touchFallbackDrag.skipped || touchFallbackDrag.before !== touchFallbackDrag.after
    const pointerTouchOk = pointerTouchHybridFallbackDrag.skipped ||
      pointerTouchHybridFallbackDrag.before !== pointerTouchHybridFallbackDrag.after
    return {
      ok: nodeCount > 0 &&
        normalDrag.before !== normalDrag.after &&
        normalDrag.nodeMoved &&
        zeroButtonsDrag.before !== zeroButtonsDrag.after &&
        zeroButtonsDrag.nodeMoved &&
        mouseFallbackDrag.before !== mouseFallbackDrag.after &&
        pointerMouseHybridFallbackDrag.before !== pointerMouseHybridFallbackDrag.after &&
        touchOk &&
        pointerTouchOk &&
        wheelFallbackPan.before !== wheelFallbackPan.after &&
        wheelFallbackPan.nodeMoved,
      before: normalDrag.before,
      after: wheelFallbackPan.after,
      normalDrag,
      zeroButtonsDrag,
      mouseFallbackDrag,
      pointerMouseHybridFallbackDrag,
      touchFallbackDrag,
      pointerTouchHybridFallbackDrag,
      wheelFallbackPan,
      nodeCount,
      reason: normalDrag.before === normalDrag.after
        ? 'XMind transform did not change after normal pointer drag'
        : !normalDrag.nodeMoved
          ? 'XMind node position did not change after normal pointer drag'
        : zeroButtonsDrag.before === zeroButtonsDrag.after
          ? 'XMind transform did not change after WebView-style zero-buttons pointer drag'
          : !zeroButtonsDrag.nodeMoved
            ? 'XMind node position did not change after WebView-style zero-buttons pointer drag'
            : mouseFallbackDrag.before === mouseFallbackDrag.after
              ? 'XMind transform did not change after mouse fallback drag'
              : pointerMouseHybridFallbackDrag.before === pointerMouseHybridFallbackDrag.after
                ? 'XMind transform did not change after pointerdown + mousemove hybrid drag'
                : !touchOk
                  ? 'XMind transform did not change after touch fallback drag'
                  : !pointerTouchOk
                    ? 'XMind transform did not change after pointerdown + touchmove hybrid drag'
                    : wheelFallbackPan.before === wheelFallbackPan.after
                      ? 'XMind transform did not change after wheel pan'
                      : !wheelFallbackPan.nodeMoved
                        ? 'XMind node position did not change after wheel pan'
                        : ''
    }
  })

  if (!result.ok) {
    throw new Error(`Sample ${samplePath} failed XMind pan smoke: ${JSON.stringify(result, null, 2)}`)
  }
}

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
  ['.mjs', 'text/javascript; charset=utf-8'],
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

const collectSampleFiles = directory => {
  if (!existsSync(directory) || !statSync(directory).isDirectory()) {
    fail(`Missing demo sample directory ${directory}.`)
  }

  const files = []
  const walk = currentDirectory => {
    for (const entry of readdirSync(currentDirectory, { withFileTypes: true })) {
      if (entry.name.startsWith('.')) {
        continue
      }
      const entryPath = join(currentDirectory, entry.name)
      if (entry.isDirectory()) {
        walk(entryPath)
      } else if (entry.isFile()) {
        files.push(relative(directory, entryPath).split(sep).join('/'))
      }
    }
  }

  walk(directory)
  return files.sort((left, right) => left.localeCompare(right, 'en'))
}

const evaluateSampleSmokeState = async (page, samplePath) => page.evaluate(
  ({ config, sample }) => {
    const readElement = element => {
      const text = (element.textContent || '').replace(/\s+/g, ' ').trim()
      return {
        selector: element.dataset.smokeSelector || element.className || element.tagName.toLowerCase(),
        text: text.slice(0, 180)
      }
    }
    const isVisible = element => {
      if (!(element instanceof HTMLElement || element instanceof SVGElement) || element.hidden) {
        return false
      }
      const style = window.getComputedStyle(element)
      if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) {
        return false
      }
      const rect = element.getBoundingClientRect()
      return rect.width > 0 && rect.height > 0
    }
    const collectVisible = selectors => selectors.flatMap(selector =>
      [...document.querySelectorAll(selector)].filter(isVisible).map(element => ({
        ...readElement(element),
        selector
      }))
    )
    const hiddenLeaks = config.hiddenStateSelectors.flatMap(selector =>
      [...document.querySelectorAll(selector)]
        .filter(element => window.getComputedStyle(element).display !== 'none')
        .map(element => ({
          ...readElement(element),
          selector
        }))
    )
    const visibleLoading = collectVisible(config.loadingSelectors)
    const visibleErrors = collectVisible(config.errorSelectors)
    const hasContent = Boolean(document.querySelector('.file-viewer .content:not(.hidden)'))
    const hasMeaningful = config.meaningfulSelectors.some(selector =>
      [...document.querySelectorAll(selector)].some(isVisible)
    )
    const allowedNotice = config.allowedNotices.some(notice =>
      sample.endsWith(notice.sample) &&
      visibleErrors.some(error => error.text.includes(notice.includes))
    )

    return {
      allowedNotice,
      bodyText: (document.body.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 360),
      hasContent,
      hasMeaningful,
      hiddenLeaks,
      ready: hasContent &&
        hasMeaningful &&
        hiddenLeaks.length === 0 &&
        visibleLoading.length === 0 &&
        (visibleErrors.length === 0 || allowedNotice),
      visibleErrors,
      visibleLoading
    }
  },
  {
    config: sampleSmokeConfig,
    sample: samplePath
  }
)

const waitForSampleReady = async (page, samplePath) => {
  await page.waitForSelector('.file-viewer .content:not(.hidden)', { timeout: sampleTimeout })
  await page.waitForFunction(
    ({ config, sample }) => {
      const isVisible = element => {
        if (!(element instanceof HTMLElement || element instanceof SVGElement) || element.hidden) {
          return false
        }
        const style = window.getComputedStyle(element)
        if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) {
          return false
        }
        const rect = element.getBoundingClientRect()
        return rect.width > 0 && rect.height > 0
      }
      const hiddenLeaks = config.hiddenStateSelectors.some(selector =>
        [...document.querySelectorAll(selector)]
          .some(element => window.getComputedStyle(element).display !== 'none')
      )
      const visibleLoading = config.loadingSelectors.some(selector =>
        [...document.querySelectorAll(selector)].some(isVisible)
      )
      const visibleErrors = config.errorSelectors.flatMap(selector =>
        [...document.querySelectorAll(selector)].filter(isVisible)
      )
      const allowedNotice = config.allowedNotices.some(notice =>
        sample.endsWith(notice.sample) &&
        visibleErrors.some(error => (error.textContent || '').includes(notice.includes))
      )
      const hasContent = Boolean(document.querySelector('.file-viewer .content:not(.hidden)'))
      const hasMeaningful = config.meaningfulSelectors.some(selector =>
        [...document.querySelectorAll(selector)].some(isVisible)
      )

      return hasContent &&
        hasMeaningful &&
        !hiddenLeaks &&
        !visibleLoading &&
        (visibleErrors.length === 0 || allowedNotice)
    },
    {
      config: sampleSmokeConfig,
      sample: samplePath
    },
    { timeout: sampleTimeout }
  )
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

const verifySampleFile = async (page, baseUrl, samplePath, failures) => {
  const url = new URL(`${baseUrl}/index.html`)
  url.searchParams.set('url', `/example/${samplePath}`)
  url.searchParams.set('smoke', `demo-browser-sample-${samplePath.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`)

  await page.goto(url.href, {
    waitUntil: 'domcontentloaded',
    timeout: sampleTimeout
  })

  try {
    await waitForSampleReady(page, samplePath)
  } catch (error) {
    const state = await evaluateSampleSmokeState(page, samplePath).catch(() => null)
    throw new Error([
      `Sample ${samplePath} did not become ready.`,
      error instanceof Error ? error.message : String(error),
      state ? `State: ${JSON.stringify(state, null, 2)}` : ''
    ].filter(Boolean).join('\n'))
  }

  const state = await evaluateSampleSmokeState(page, samplePath)
  if (!state.ready) {
    throw new Error(`Sample ${samplePath} has visible renderer issues: ${JSON.stringify(state, null, 2)}`)
  }

  assertNoBrowserFailures(failures, `Sample ${samplePath} emitted browser errors.`)
  failures.length = 0
  if (samplePath.toLowerCase().endsWith('.xmind')) {
    await verifyXMindPanInteraction(page, samplePath)
  }
  return state
}

const verifySampleMatrix = async (page, baseUrl, failures) => {
  const samples = collectSampleFiles(examplesRoot)
  let allowedNotices = 0

  for (const sample of samples) {
    const state = await verifySampleFile(page, baseUrl, sample, failures)
    if (state.allowedNotice) {
      allowedNotices += 1
    }
  }

  console.log(
    `[demo-browser-smoke] Verified ${samples.length} demo sample files from ${examplesRoot}` +
      (allowedNotices ? ` (${allowedNotices} documented notices).` : '.')
  )
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
    await verifySampleMatrix(page, serverHandle.url, failures)
  } finally {
    await browser.close()
    await new Promise(resolveClose => serverHandle.server?.close(resolveClose) ?? resolveClose())
  }

  console.log(`[demo-browser-smoke] Verified main demo, compare page, and sample matrix at ${serverHandle.url}`)
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
