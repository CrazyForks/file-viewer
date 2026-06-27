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
      includes: 'STEP / ISO 10303'
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
    const dispatchPointer = (target, type, clientX, clientY, buttons, pointerId, pointerType = 'mouse') => {
      target.dispatchEvent(new PointerEvent(type, {
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
    const pointerDrag = async (pointerId, moveButtons = 1, startTarget = stage) => {
      await resetView()
      const before = readTransform()
      const beforeNodeRect = readFirstNodeRect()

      stage.focus({ preventScroll: true })
      dispatchPointer(startTarget, 'pointerdown', startX, startY, 1, pointerId)
      dispatchPointer(stage, 'pointermove', startX + 180, startY + 96, moveButtons, pointerId)
      await waitFrame()
      dispatchPointer(stage, 'pointermove', startX + 220, startY + 118, moveButtons, pointerId)
      await waitFrame()
      dispatchPointer(stage, 'pointerup', startX + 220, startY + 118, 0, pointerId)
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
    const nodeStartDrag = await pointerDrag(2323, 1, document.querySelector('.xmind-node') || stage)
    const wheelFallbackPan = await wheelPan()
    return {
      ok: nodeCount > 0 &&
        normalDrag.before !== normalDrag.after &&
        normalDrag.nodeMoved &&
        zeroButtonsDrag.before !== zeroButtonsDrag.after &&
        zeroButtonsDrag.nodeMoved &&
        nodeStartDrag.before !== nodeStartDrag.after &&
        nodeStartDrag.nodeMoved &&
        wheelFallbackPan.before !== wheelFallbackPan.after &&
        wheelFallbackPan.nodeMoved,
      before: normalDrag.before,
      after: wheelFallbackPan.after,
      normalDrag,
      zeroButtonsDrag,
      nodeStartDrag,
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
          : nodeStartDrag.before === nodeStartDrag.after
            ? 'XMind transform did not change after node-start pointer drag'
          : !nodeStartDrag.nodeMoved
            ? 'XMind node position did not change after node-start pointer drag'
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

  const dragTarget = await page.evaluate(async () => {
    const stage = document.querySelector('.xmind-stage')
    const zoomBox = document.querySelector('.xmind-zoom-box')
    if (!(stage instanceof HTMLElement) || !(zoomBox instanceof HTMLElement)) {
      return null
    }
    const waitFrame = () => new Promise(resolve => requestAnimationFrame(resolve))
    const rect = stage.getBoundingClientRect()
    const startX = rect.left + rect.width * 0.52
    const startY = rect.top + rect.height * 0.48
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
    return {
      before: window.getComputedStyle(zoomBox).transform || zoomBox.style.transform,
      startX,
      startY
    }
  })

  if (!dragTarget) {
    throw new Error(`Sample ${samplePath} failed XMind real mouse smoke: missing drag target`)
  }

  await page.mouse.move(dragTarget.startX, dragTarget.startY)
  await page.mouse.down()
  await page.mouse.move(dragTarget.startX + 160, dragTarget.startY + 86, { steps: 8 })
  await page.mouse.up()
  await page.waitForTimeout(80)

  const realMouse = await page.evaluate(before => {
    const zoomBox = document.querySelector('.xmind-zoom-box')
    const after = zoomBox instanceof HTMLElement
      ? window.getComputedStyle(zoomBox).transform || zoomBox.style.transform
      : ''
    return {
      ok: Boolean(after) && before !== after,
      before,
      after
    }
  }, dragTarget.before)

  if (!realMouse.ok) {
    throw new Error(`Sample ${samplePath} failed XMind real mouse smoke: ${JSON.stringify(realMouse, null, 2)}`)
  }
}

const verifyTypstRenderInteraction = async (page, samplePath) => {
  const result = await page.evaluate(() => {
    const pageShells = [...document.querySelectorAll('.typst-page-shell')]
    const svgs = [...document.querySelectorAll('.typst-page-shell svg')]
    const firstPage = pageShells[0]
    const firstSvg = svgs[0]
    const pageRect = firstPage?.getBoundingClientRect()
    const svgRect = firstSvg?.getBoundingClientRect()
    const statusText = document.querySelector('.typst-toolbar em')?.textContent || ''
    const hasVectorContent = svgs.some(svg => svg.querySelector('path,text,use,g,rect,circle,ellipse,line,polyline,polygon'))

    return {
      ok: pageShells.length > 0 &&
        svgs.length > 0 &&
        Boolean(pageRect && pageRect.width > 80 && pageRect.height > 80) &&
        Boolean(svgRect && svgRect.width > 80 && svgRect.height > 80) &&
        (/已渲染|Rendered/i).test(statusText) &&
        hasVectorContent,
      pageCount: pageShells.length,
      svgCount: svgs.length,
      pageRect: pageRect ? {
        width: Number(pageRect.width.toFixed(2)),
        height: Number(pageRect.height.toFixed(2))
      } : null,
      svgRect: svgRect ? {
        width: Number(svgRect.width.toFixed(2)),
        height: Number(svgRect.height.toFixed(2))
      } : null,
      statusText,
      hasVectorContent
    }
  })

  if (!result.ok) {
    throw new Error(`Sample ${samplePath} failed Typst WASM render smoke: ${JSON.stringify(result, null, 2)}`)
  }
}

const verifyDrawingRenderInteraction = async (page, samplePath) => {
  const result = await page.evaluate(async () => {
    const canvas = document.querySelector('.drawing-canvas')
    if (!(canvas instanceof HTMLElement)) {
      return { ok: false, reason: 'missing drawing canvas' }
    }

    const waitFrame = () => new Promise(resolve => requestAnimationFrame(resolve))
    await waitFrame()
    await waitFrame()

    const renderedMode = canvas.dataset.drawingRendered || ''
    const svg = canvas.querySelector('svg')
    const mxgraph = canvas.querySelector('.drawing-mxgraph')
    const svgRect = svg?.getBoundingClientRect()
    const mxRect = mxgraph?.getBoundingClientRect()
    const visibleSvg = Boolean(svgRect && svgRect.width > 80 && svgRect.height > 80)
    const visibleMxGraph = Boolean(mxRect && mxRect.width > 80 && mxRect.height > 80)
    const hasShapes = Boolean(svg?.querySelector('path,text,rect,circle,ellipse,line,polyline,polygon,use,g')) ||
      Boolean(mxgraph && mxgraph.children.length > 0)
    const zoomLabel = document.querySelector('.drawing-actions span')?.textContent || ''

    return {
      ok: Boolean(renderedMode) &&
        (visibleSvg || visibleMxGraph) &&
        hasShapes &&
        /%$/.test(zoomLabel.trim()),
      renderedMode,
      visibleSvg,
      visibleMxGraph,
      hasShapes,
      zoomLabel,
      svgRect: svgRect ? {
        width: Number(svgRect.width.toFixed(2)),
        height: Number(svgRect.height.toFixed(2))
      } : null,
      mxRect: mxRect ? {
        width: Number(mxRect.width.toFixed(2)),
        height: Number(mxRect.height.toFixed(2))
      } : null
    }
  })

  if (!result.ok) {
    throw new Error(`Sample ${samplePath} failed drawing render smoke: ${JSON.stringify(result, null, 2)}`)
  }
}

const verifyCadRenderInteraction = async (page, samplePath) => {
  const result = await page.evaluate(async () => {
    const stage = document.querySelector('.cad-stage')
    const zoomText = document.querySelector('.cad-zoom')
    const zoomInButton = [...document.querySelectorAll('.cad-tools button')]
      .find(button => {
        const label = `${button.getAttribute('title') || ''} ${button.textContent || ''}`.trim().toLowerCase()
        return label.includes('放大') || label.includes('zoom in') || label.endsWith('+')
      })
    if (!(stage instanceof HTMLElement) || !(zoomText instanceof HTMLElement) || !(zoomInButton instanceof HTMLButtonElement)) {
      return {
        ok: false,
        reason: 'missing CAD stage, zoom label, or zoom button',
        hasStage: stage instanceof HTMLElement,
        hasZoomText: zoomText instanceof HTMLElement,
        hasZoomInButton: zoomInButton instanceof HTMLButtonElement
      }
    }

    const waitFrame = () => new Promise(resolve => requestAnimationFrame(resolve))
    const readCanvases = () => [...stage.querySelectorAll('canvas')]
      .map(canvas => {
        const rect = canvas.getBoundingClientRect()
        return {
          width: Number(rect.width.toFixed(2)),
          height: Number(rect.height.toFixed(2)),
          backingWidth: canvas.width,
          backingHeight: canvas.height
        }
      })
      .filter(rect => rect.width > 80 && rect.height > 80)
    const beforeZoom = zoomText.textContent || ''
    const beforeCanvases = readCanvases()
    zoomInButton.click()
    await waitFrame()
    await waitFrame()
    const afterZoom = zoomText.textContent || ''
    const afterCanvases = readCanvases()
    const nativeStageActive = Boolean(document.querySelector('.cad-native-stage.is-active,.cad-viewer-native-host.is-active,.dwfv-root'))
    const hasVisibleCanvas = beforeCanvases.length > 0 || afterCanvases.length > 0
    const zoomChanged = beforeZoom !== afterZoom
    const wrapperZoomRequired = !nativeStageActive

    return {
      ok: hasVisibleCanvas &&
        beforeZoom.trim() !== '' &&
        afterZoom.trim() !== '' &&
        (!wrapperZoomRequired || zoomChanged),
      beforeZoom,
      afterZoom,
      beforeCanvases,
      afterCanvases,
      nativeStageActive,
      wrapperZoomRequired,
      zoomChanged
    }
  })

  if (!result.ok) {
    throw new Error(`Sample ${samplePath} failed CAD render/zoom smoke: ${JSON.stringify(result, null, 2)}`)
  }
}

const verifyGdsLayoutRenderInteraction = async (page, samplePath) => {
  const expectedLabel = samplePath.toLowerCase().endsWith('.gds') ? 'GDSII' : 'OASIS'
  const result = await page.evaluate(() => {
    const layoutSvg = document.querySelector('.eda-layout-svg')
    const tree = document.querySelector('.eda-tree')
    if (!(layoutSvg instanceof SVGSVGElement) || !(tree instanceof HTMLElement)) {
      return {
        ok: false,
        reason: 'missing GDSII layout SVG or EDA tree',
        hasLayoutSvg: layoutSvg instanceof SVGSVGElement,
        hasTree: tree instanceof HTMLElement
      }
    }

    const rect = layoutSvg.getBoundingClientRect()
    const geometryCount = layoutSvg.querySelectorAll('polygon,polyline,circle,text').length
    const treeRowCount = tree.querySelectorAll('button').length
    const ariaLabel = layoutSvg.getAttribute('aria-label') || ''

    return {
      ok: rect.width > 100 &&
        rect.height > 100 &&
        geometryCount > 0 &&
        treeRowCount > 0 &&
        ariaLabel.includes(window.__fileViewerExpectedEdaLayoutLabel || 'GDSII'),
      rect: {
        width: Number(rect.width.toFixed(2)),
        height: Number(rect.height.toFixed(2))
      },
      geometryCount,
      treeRowCount,
      ariaLabel
    }
  })

  if (!result.ok) {
    throw new Error(`Sample ${samplePath} failed ${expectedLabel} layout render smoke: ${JSON.stringify(result, null, 2)}`)
  }
}

const verifyArchiveNestedPreviewInteraction = async (page, samplePath) => {
  await page.locator('.archive-sidebar .archive-sidebar-toggle').click()
  await page.waitForFunction(
    () => document.querySelector('.archive-shell.archive-sidebar-collapsed, .archive-viewer.archive-sidebar-collapsed'),
    undefined,
    { timeout }
  )

  const collapsedLayout = await page.evaluate(() => {
    const readRect = selector => {
      const element = document.querySelector(selector)
      if (!(element instanceof HTMLElement)) {
        return null
      }
      const rect = element.getBoundingClientRect()
      return {
        left: rect.left,
        width: rect.width,
        height: rect.height
      }
    }
    const shell = readRect('.archive-shell, .archive-viewer')
    const preview = readRect('.archive-preview')
    const toolbar = readRect('.archive-preview-toolbar')
    const nestedTarget = readRect('.archive-nested-target')
    const titleLabel = readRect('.archive-preview-toolbar span')
    const expectedWidth = Math.max(320, (shell?.width || 0) * 0.9)

    return {
      ok: Boolean(shell && preview && toolbar && nestedTarget) &&
        preview.width >= expectedWidth &&
        toolbar.width >= expectedWidth &&
        nestedTarget.width >= expectedWidth &&
        Math.abs(preview.left - shell.left) <= 2 &&
        (!titleLabel || titleLabel.height < 40),
      shell,
      preview,
      toolbar,
      nestedTarget,
      titleLabel
    }
  })

  if (!collapsedLayout.ok) {
    throw new Error(`Sample ${samplePath} archive sidebar collapse collapsed the preview layout: ${JSON.stringify(collapsedLayout, null, 2)}`)
  }

  await page.locator('.archive-preview-toolbar .archive-sidebar-toggle').click()
  await page.waitForFunction(
    () => !document.querySelector('.archive-shell.archive-sidebar-collapsed, .archive-viewer.archive-sidebar-collapsed'),
    undefined,
    { timeout }
  )

  const nestedChecks = [
    {
      labels: ['code.ts'],
      selector: '.archive-nested-target .code-viewer pre code.hljs'
    },
    {
      labels: ['sample.pdf', 'prince-sample.pdf'],
      selector: '.archive-nested-target .pdfViewer .page, .archive-nested-target .pdf-page, .archive-nested-target canvas'
    },
    {
      labels: ['sample.docx', 'calibre-demo.docx'],
      selector: '.archive-nested-target .docx-wrapper, .archive-nested-target .docx-document, .archive-nested-target [data-docx-root]'
    }
  ]

  for (const check of nestedChecks) {
    const clicked = await page.evaluate(labels => {
      const entries = [...document.querySelectorAll('.archive-entry')]
      const labelSet = new Set(labels)
      const target = entries.find(entry => labelSet.has(entry.querySelector('.entry-copy strong')?.textContent?.trim() || ''))
      if (!(target instanceof HTMLButtonElement)) {
        return null
      }
      target.click()
      return target.querySelector('.entry-copy strong')?.textContent?.trim() || null
    }, check.labels)

    if (!clicked) {
      throw new Error(`Sample ${samplePath} archive smoke is missing nested entry ${check.labels.join(' or ')}.`)
    }

    await page.waitForSelector(check.selector, { timeout: sampleTimeout })
    await page.waitForFunction(
      () => {
        const state = document.querySelector('.archive-state:not(.archive-hidden)')
        if (!(state instanceof HTMLElement)) {
          return true
        }
        const style = window.getComputedStyle(state)
        const rect = state.getBoundingClientRect()
        return state.hidden ||
          style.display === 'none' ||
          style.visibility === 'hidden' ||
          Number(style.opacity) === 0 ||
          rect.width === 0 ||
          rect.height === 0
      },
      undefined,
      { timeout: sampleTimeout }
    ).catch(error => {
      throw new Error(`Sample ${samplePath} archive nested preview did not finish loading for ${clicked}.\n${error.message}`)
    })
    if (check.expectedText) {
      await page.waitForFunction(
        ({ expectedText }) => {
          const target = document.querySelector('.archive-nested-target')
          return Boolean(target?.textContent?.includes(expectedText))
        },
        check,
        { timeout: sampleTimeout }
      )
    }

    const result = await page.evaluate(({ selector, expectedText }) => {
      const nestedTarget = document.querySelector('.archive-nested-target')
      const text = (nestedTarget?.textContent || '').replace(/\s+/g, ' ').trim()
      const visibleError = document.querySelector('.archive-error:not(.archive-hidden)')
      const selected = document.querySelector('.archive-entry.active')
      return {
        ok: Boolean(document.querySelector(selector)) &&
          !visibleError &&
          !text.includes('不支持.') &&
          (!expectedText || text.includes(expectedText)),
        selected: selected?.textContent?.replace(/\s+/g, ' ').trim().slice(0, 160),
        text: text.slice(0, 360),
        visibleError: visibleError?.textContent?.replace(/\s+/g, ' ').trim()
      }
    }, check)

    if (!result.ok) {
      throw new Error(`Sample ${samplePath} failed archive nested preview smoke for ${clicked}: ${JSON.stringify(result, null, 2)}`)
    }
  }
}

const verifyFormatSpecificInteraction = async (page, samplePath) => {
  const normalized = samplePath.toLowerCase()
  if (normalized.endsWith('.xmind')) {
    await verifyXMindPanInteraction(page, samplePath)
  }
  if (normalized.endsWith('.typ') || normalized.endsWith('.typst')) {
    await verifyTypstRenderInteraction(page, samplePath)
  }
  if (normalized.endsWith('.drawio') || normalized.endsWith('.dio')) {
    await verifyDrawingRenderInteraction(page, samplePath)
  }
  if (/\.(?:dwg|dxf|dwf|dwfx|xps)$/.test(normalized)) {
    await verifyCadRenderInteraction(page, samplePath)
  }
  if (/\.(?:gds|oas|oasis)$/.test(normalized)) {
    await page.evaluate(label => {
      window.__fileViewerExpectedEdaLayoutLabel = label
    }, normalized.endsWith('.gds') ? 'GDSII' : 'OASIS')
    await verifyGdsLayoutRenderInteraction(page, samplePath)
  }
  if (/archive\.(?:zip|tar\.gz)$/.test(normalized)) {
    await verifyArchiveNestedPreviewInteraction(page, samplePath)
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

const waitForAnyBodyText = async (page, acceptedTexts, context) => {
  await page.waitForFunction(
    texts => texts.some(text => document.body.innerText.includes(text)),
    acceptedTexts,
    { timeout }
  ).catch(error => {
    throw new Error(`${context} did not render any expected text: ${acceptedTexts.join(', ')}\n${error.message}`)
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

const unlockKnownPasswordSample = async (page, samplePath) => {
  if (!samplePath.endsWith('encrypted.zip')) {
    return
  }

  const dialogSelector = '.archive-password-dialog:not(.archive-hidden)'
  await page.waitForSelector(`${dialogSelector} input[type="password"]`, { timeout: sampleTimeout })
  await page.fill(`${dialogSelector} input[type="password"]`, 'flyfish')
  await page.click(`${dialogSelector} .archive-password-submit`)
  await page.waitForFunction(
    selector => !document.querySelector(selector),
    dialogSelector,
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
  await waitForAnyBodyText(page, [
    '文档比对',
    'Document Compare'
  ], 'Compare demo title')
  await waitForBodyText(page, [
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

  await unlockKnownPasswordSample(page, samplePath)

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
  await verifyFormatSpecificInteraction(page, samplePath)
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
