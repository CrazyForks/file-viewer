import { createReadStream, existsSync, statSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { delimiter, extname, normalize, relative, resolve, sep } from 'node:path'
import { tmpdir } from 'node:os'
import { pathToFileURL } from 'node:url'

const root = resolve(new URL('..', import.meta.url).pathname)
const timeout = Number(process.env.ISSUE72_WEB_FULL_TIMEOUT || 45000)
const keepTemp = process.env.ISSUE72_WEB_FULL_KEEP === '1'
const sourceMode = process.env.ISSUE72_WEB_FULL_SOURCE || 'local'
const packageVersion = process.env.ISSUE72_WEB_FULL_VERSION || '2.1.16'
const localWebFullDist = resolve(root, 'packages/components/web-full/dist')
const tarballPath = resolve(root, process.env.ISSUE72_WEB_FULL_TARBALL || `.release/file-viewer-v2-${packageVersion}/ecosystem/file-viewer-web-full-${packageVersion}.tgz`)
const pptxSample = resolve(root, 'apps/viewer-demo/public/example/ppt.pptx')
const sqlSample = resolve(root, 'apps/viewer-demo/public/example/query.sql')
const require = createRequire(import.meta.url)

const fail = message => {
  console.error(`[issue72-web-full-iife] ${message}`)
  process.exit(1)
}

const normalizeSource = source => source
  .split('\n')
  .map(line => line.replace(/^ {8}/, ''))
  .join('\n')
  .trimStart()

function spawnCommand(command, args, options = {}) {
  return new Promise((resolveCommand, rejectCommand) => {
    const child = spawn(command, args, {
      cwd: options.cwd || root,
      env: { ...process.env, ...options.env },
      stdio: options.pipe ? ['ignore', 'pipe', 'pipe'] : 'inherit'
    })
    let stdout = ''
    let stderr = ''
    if (options.pipe) {
      child.stdout?.on('data', chunk => {
        stdout += chunk.toString()
      })
      child.stderr?.on('data', chunk => {
        stderr += chunk.toString()
      })
    }
    child.once('error', rejectCommand)
    child.once('close', code => {
      if (code === 0) {
        resolveCommand({ stdout, stderr })
        return
      }
      rejectCommand(new Error(`${command} ${args.join(' ')} exited with ${code}\n${stdout}\n${stderr}`))
    })
  })
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
      'Run with: npm exec --yes --package playwright -- node scripts/verify-issue72-web-full-iife-custom-element.mjs',
      `Original error: ${error instanceof Error ? error.message : String(error)}`
    ].join('\n'))
  }
}

const mimeTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.pptx', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'],
  ['.sql', 'text/plain; charset=utf-8'],
  ['.wasm', 'application/wasm']
])

async function resolveWebFullDist(tempRoot) {
  if (sourceMode === 'local') {
    return localWebFullDist
  }
  if (sourceMode === 'local-pack') {
    const packDir = resolve(tempRoot, 'local-pack')
    const appDir = resolve(tempRoot, 'local-pack-app')
    await mkdir(packDir, { recursive: true })
    await mkdir(appDir, { recursive: true })
    const localPackagePaths = await collectFileViewerPackagePaths()
    const tarballs = new Map()
    for (const packageName of localPackagePaths.keys()) {
      tarballs.set(packageName, await packLocalPackage(packageName, localPackagePaths, packDir))
    }
    const packedWebFull = tarballs.get('@file-viewer/web-full')
    if (!packedWebFull) {
      fail(`Could not pack local @file-viewer/web-full into ${packDir}`)
    }
    await writeFile(resolve(appDir, 'package.json'), `${JSON.stringify({
      name: 'issue72-web-full-local-pack',
      private: true,
      type: 'module',
      dependencies: {
        '@file-viewer/web-full': `file:${packedWebFull}`
      }
    }, null, 2)}\n`)
    const overrideLines = Array.from(tarballs.entries())
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([packageName, tarball]) => `  ${JSON.stringify(packageName)}: ${JSON.stringify(`file:${tarball}`)}`)
    await writeFile(resolve(appDir, 'pnpm-workspace.yaml'), [
      'packages:',
      '  - .',
      'overrides:',
      ...overrideLines,
      ''
    ].join('\n'))
    console.log('[issue72-web-full-iife] Installing packed local @file-viewer/web-full tarball')
    await spawnCommand('pnpm', ['install', '--ignore-scripts'], { cwd: appDir, pipe: true })
    return resolve(appDir, 'node_modules/@file-viewer/web-full/dist')
  }
  if (sourceMode === 'tarball') {
    if (!existsSync(tarballPath)) {
      fail(`Missing web-full tarball: ${tarballPath}`)
    }
    const extractDir = resolve(tempRoot, 'tarball')
    await mkdir(extractDir, { recursive: true })
    console.log(`[issue72-web-full-iife] Extracting @file-viewer/web-full tarball ${tarballPath}`)
    await spawnCommand('tar', ['-xzf', tarballPath, '-C', extractDir], { pipe: true })
    return resolve(extractDir, 'package/dist')
  }
  if (sourceMode !== 'registry' && sourceMode !== 'tarball') {
    fail('ISSUE72_WEB_FULL_SOURCE must be "local", "local-pack", "registry", or "tarball".')
  }

  const appDir = resolve(tempRoot, 'registry-app')
  await mkdir(appDir, { recursive: true })
  await writeFile(resolve(appDir, 'package.json'), `${JSON.stringify({
    name: 'issue72-web-full-registry',
    private: true,
    type: 'module',
    dependencies: {
      '@file-viewer/web-full': packageVersion
    }
  }, null, 2)}\n`)
  console.log(`[issue72-web-full-iife] Installing @file-viewer/web-full@${packageVersion}`)
  await spawnCommand('pnpm', ['install', '--ignore-scripts'], { cwd: appDir, pipe: true })
  return resolve(appDir, 'node_modules/@file-viewer/web-full/dist')
}

async function collectFileViewerPackagePaths() {
  const collected = new Map()
  const visit = async dir => {
    const packageJsonPath = resolve(dir, 'package.json')
    if (existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'))
      if (packageJson.name?.startsWith('@file-viewer/') && packageJson.private !== true) {
        collected.set(packageJson.name, dir)
        return
      }
    }
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      if (!entry.isDirectory() || ['dist', 'node_modules'].includes(entry.name)) {
        continue
      }
      await visit(resolve(dir, entry.name))
    }
  }
  await visit(resolve(root, 'packages'))
  return collected
}

async function packLocalPackage(packageName, packagePaths, packDir) {
  const packagePath = packagePaths.get(packageName)
  if (!packagePath) {
    fail(`Could not locate local package path for ${packageName}.`)
  }
  console.log(`[issue72-web-full-iife] Packing ${packageName}`)
  await spawnCommand('pnpm', ['--filter', packageName, 'pack', '--pack-destination', packDir], {
    pipe: true
  })
  const packageJson = JSON.parse(await readFile(resolve(packagePath, 'package.json'), 'utf8'))
  const expectedPrefix = packageJson.name.replace(/^@/, '').replace('/', '-')
  const files = (await readdir(packDir))
    .filter(file => file.endsWith('.tgz'))
    .map(file => resolve(packDir, file))
  const matches = files.filter(file => file.includes(`${expectedPrefix}-${packageJson.version}.tgz`))
  if (!matches.length) {
    fail(`Could not find packed tarball for ${packageName} in ${packDir}.`)
  }
  return matches[0]
}

function createHtml({ sourceUrl, fileName, appHeight = '100%' }) {
  return normalizeSource(`
        <!doctype html>
        <html lang="zh-CN">
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>Issue 72 Web Full IIFE Custom Element</title>
            <style>
              html,
              body {
                height: 100%;
                margin: 0;
              }

              body {
                font-family: Arial, sans-serif;
              }

              #app {
                height: ${appHeight};
              }

              #container {
                width: 100%;
                height: 100%;
                min-height: 0;
                overflow: hidden;
              }
            </style>
          </head>
          <body>
            <div id="app">
              <div id="container"></div>
            </div>
            <script src="/static/file-viewer/flyfish-file-viewer-web-full.iife.js"></script>
            <script>
              window.__issue72Events = [];
              window.__issue72States = [];
              window.__issue72Errors = [];
              var sourceUrl = '${sourceUrl}';
              var fileName = '${fileName}';
              var viewer = document.createElement('flyfish-file-viewer');
              viewer.setAttribute('src', '/' + sourceUrl);
              viewer.setAttribute('filename', fileName);
              viewer.setAttribute('theme', 'light');
              viewer.setAttribute('toolbar-position', 'bottom-right');
              viewer.style.display = 'block';
              viewer.style.width = '100%';
              viewer.style.height = '100%';
              viewer.addEventListener('viewer-event', function(event) {
                window.__issue72Events.push(event.detail);
              });
              viewer.addEventListener('viewer-state-change', function(event) {
                window.__issue72States.push(event.detail);
              });
              viewer.addEventListener('viewer-error', function(event) {
                window.__issue72Errors.push(event.detail);
              });
              document.getElementById('container').append(viewer);
            </script>
          </body>
        </html>
      `)
}

function resolveStaticFile(webFullDist, pathname) {
  const relativePath = normalize(decodeURIComponent(pathname.slice('/static/file-viewer/'.length))).replace(/^(\.\.(\/|\\|$))+/, '')
  const candidate = resolve(webFullDist, relativePath)
  if (!candidate.startsWith(webFullDist) || relative(webFullDist, candidate).startsWith('..')) {
    return null
  }
  return candidate
}

async function startStaticServer(webFullDist) {
  const pptxHtml = createHtml({
    sourceUrl: 'files/ppt.pptx',
    fileName: 'ppt.pptx'
  })
  const sqlHtml = createHtml({
    sourceUrl: 'files/query.sql',
    fileName: 'query.sql',
    appHeight: '320px'
  })
  const server = createServer((request, response) => {
    const url = new URL(request.url || '/', 'http://127.0.0.1')
    if (url.pathname === '/' || url.pathname === '/index.html') {
      response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      response.end(pptxHtml)
      return
    }
    if (url.pathname === '/sql.html') {
      response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      response.end(sqlHtml)
      return
    }

    const filePath = url.pathname === '/files/ppt.pptx'
      ? pptxSample
      : url.pathname === '/files/query.sql'
        ? sqlSample
      : url.pathname.startsWith('/static/file-viewer/')
        ? resolveStaticFile(webFullDist, url.pathname)
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
  return {
    server,
    baseUrl: `http://127.0.0.1:${address.port}`
  }
}

function isIgnoredRequestFailure(url, failure) {
  return failure === 'net::ERR_ABORTED' && (
    /\/files\/ppt\.pptx(?:[?#].*)?$/.test(url) ||
    /\/static\/file-viewer\/vendor\/pptx\/pptx\.worker\.js(?:[?#].*)?$/.test(url)
  )
}

async function verifyPage(page, baseUrl) {
  const failures = []
  const requestedUrls = []
  const assetEvents = []
  const isAssetUrl = url => /\/static\/file-viewer\/(?:renderers\/presentation\.iife\.js|vendor\/pptx\/pptx\.worker\.js|assets\/pptx\.worker-|renderers\/worker\/pptx\.worker)/.test(url)

  page.on('pageerror', error => failures.push(`pageerror: ${error.message}`))
  page.on('console', message => {
    if (message.type() === 'error') {
      failures.push(`console.error: ${message.text()}`)
    }
  })
  page.on('request', request => {
    const url = request.url()
    requestedUrls.push(url)
    if (isAssetUrl(url)) {
      assetEvents.push({ type: 'request', url })
    }
  })
  page.on('requestfailed', request => {
    const url = request.url()
    const failure = request.failure()?.errorText || ''
    if (!isIgnoredRequestFailure(url, failure)) {
      failures.push(`requestfailed: ${url}: ${failure}`)
    }
  })
  page.on('response', response => {
    const url = response.url()
    if (isAssetUrl(url)) {
      assetEvents.push({
        type: 'response',
        status: response.status(),
        url,
        contentType: response.headers()['content-type'] || ''
      })
    }
    const parsed = new URL(url)
    if (parsed.origin === baseUrl && response.status() >= 400) {
      failures.push(`HTTP ${response.status()}: ${url}`)
    }
  })

  await page.goto(`${baseUrl}/index.html`, { waitUntil: 'domcontentloaded', timeout })
  try {
    await page.waitForFunction(
      () => document.querySelectorAll('.flyfish-pptx-content .slide, .pptx-render-surface .slide').length > 0,
      undefined,
      { timeout }
    )
  } catch (error) {
    const snapshot = await page.evaluate(() => ({
      bodyText: document.body.innerText.replace(/\s+/g, ' ').slice(0, 1800),
      html: document.body.innerHTML.slice(0, 3000),
      slides: document.querySelectorAll('.flyfish-pptx-content .slide, .pptx-render-surface .slide').length,
      events: window.__issue72Events || [],
      states: window.__issue72States || [],
      errors: window.__issue72Errors || [],
      visibleErrors: Array.from(document.querySelectorAll('.pptx-error,.file-viewer-error'))
        .filter(element => {
          const style = window.getComputedStyle(element)
          const rect = element.getBoundingClientRect()
          return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0
        })
        .map(element => (element.textContent || '').replace(/\s+/g, ' ').trim())
    }))
    fail([
      `PPTX did not render in ${sourceMode} mode.`,
      `Failures: ${JSON.stringify(failures)}`,
      `Asset events: ${JSON.stringify(assetEvents)}`,
      `Snapshot: ${JSON.stringify(snapshot, null, 2)}`,
      error instanceof Error ? error.message : String(error)
    ].join('\n'))
  }

  const state = await page.evaluate(() => {
    const visibleText = selector => Array.from(document.querySelectorAll(selector))
      .filter(element => {
        const style = window.getComputedStyle(element)
        const rect = element.getBoundingClientRect()
        return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0
      })
      .map(element => (element.textContent || '').replace(/\s+/g, ' ').trim())
    const viewer = document.querySelector('flyfish-file-viewer')
    const content = document.querySelector('.file-viewer-web-content')
    const toolbar = document.querySelector('.file-viewer-web-toolbar[data-toolbar-position="bottom-right"]')
    const slides = Array.from(document.querySelectorAll('.flyfish-pptx-content .slide, .pptx-render-surface .slide'))
    const surface = document.querySelector('.pptx-render-surface')
    const viewerRect = viewer?.getBoundingClientRect()
    const toolbarRect = toolbar?.getBoundingClientRect()
    const surfaceRect = surface?.getBoundingClientRect()
    const lastSlideRect = slides.at(-1)?.getBoundingClientRect()
    return {
      slides: slides.length,
      visibleErrors: visibleText('.pptx-error,.file-viewer-error'),
      toolbar: toolbar && viewerRect && toolbarRect ? {
        position: window.getComputedStyle(toolbar).position,
        rightGap: Math.round(viewerRect.right - toolbarRect.right),
        bottomGap: Math.round(viewerRect.bottom - toolbarRect.bottom),
        withinViewer: toolbarRect.left >= viewerRect.left &&
          toolbarRect.right <= viewerRect.right + 1 &&
          toolbarRect.top >= viewerRect.top &&
          toolbarRect.bottom <= viewerRect.bottom + 1
      } : null,
      scroll: content ? {
        scrollHeight: content.scrollHeight,
        clientHeight: content.clientHeight,
        scrollTop: content.scrollTop
      } : null,
      pptxTail: surfaceRect && lastSlideRect
        ? Math.round(surfaceRect.bottom - lastSlideRect.bottom)
        : null,
      events: (window.__issue72Events || []).slice(-10),
      states: (window.__issue72States || []).slice(-6),
      errors: window.__issue72Errors || []
    }
  })

  const presentationRequests = requestedUrls.filter(url => url.includes('/static/file-viewer/renderers/presentation.iife.js'))
  const pptxWorkerRequests = requestedUrls.filter(url => url.includes('/static/file-viewer/vendor/pptx/pptx.worker.js'))
  const wrongWorkerRequests = requestedUrls.filter(url =>
    /\/(?:assets\/pptx\.worker-|renderers\/worker\/pptx\.worker|node_modules\/@file-viewer\/pptx\/dist\/worker\/pptx\.worker)/.test(new URL(url).pathname)
  )

  if (!presentationRequests.length) {
    failures.push('presentation.iife.js was not requested.')
  }
  if (!pptxWorkerRequests.length) {
    failures.push('vendor/pptx/pptx.worker.js was not requested.')
  }
  if (wrongWorkerRequests.length) {
    failures.push(`PPTX worker requested from an unstable path: ${wrongWorkerRequests.join(', ')}`)
  }
  if (state.visibleErrors.length) {
    failures.push(`Visible errors: ${state.visibleErrors.join(' | ')}`)
  }
  if (state.errors.length) {
    failures.push(`viewer-error events: ${JSON.stringify(state.errors)}`)
  }
  if (state.slides < 1) {
    failures.push(`Expected at least one rendered slide, got ${state.slides}.`)
  }
  if (!state.toolbar) {
    failures.push('bottom-right toolbar was not rendered.')
  } else {
    if (state.toolbar.position !== 'absolute') {
      failures.push(`bottom-right toolbar must be absolutely positioned, got ${state.toolbar.position}.`)
    }
    if (!state.toolbar.withinViewer || state.toolbar.rightGap < 0 || state.toolbar.bottomGap < 0 || state.toolbar.rightGap > 40 || state.toolbar.bottomGap > 40) {
      failures.push(`bottom-right toolbar is not anchored inside the viewer: ${JSON.stringify(state.toolbar)}`)
    }
  }
  if (typeof state.pptxTail === 'number' && state.pptxTail > 300) {
    failures.push(`PPTX surface has a large blank tail: ${state.pptxTail}px.`)
  }
  if (failures.length) {
    fail(`${sourceMode} mode failed:\n${failures.join('\n')}\nAsset events: ${JSON.stringify(assetEvents)}\nState: ${JSON.stringify(state, null, 2)}`)
  }

  console.log(`[issue72-web-full-iife] ${sourceMode}: ok (${state.slides} slide marker(s), ${pptxWorkerRequests.length} pptx worker request(s))`)
}

async function verifySqlToolbar(page, baseUrl) {
  const failures = []

  page.on('pageerror', error => failures.push(`sql pageerror: ${error.message}`))
  page.on('console', message => {
    if (message.type() === 'error') {
      failures.push(`sql console.error: ${message.text()}`)
    }
  })
  page.on('requestfailed', request => {
    failures.push(`sql requestfailed: ${request.url()}: ${request.failure()?.errorText || ''}`)
  })
  page.on('response', response => {
    const parsed = new URL(response.url())
    if (parsed.origin === baseUrl && response.status() >= 400) {
      failures.push(`sql HTTP ${response.status()}: ${response.url()}`)
    }
  })

  await page.goto(`${baseUrl}/sql.html`, { waitUntil: 'domcontentloaded', timeout })
  await page.waitForFunction(
    () => (window.__issue72States || []).some(entry => entry?.state?.ready === true) &&
      !!document.querySelector('.code-viewer,.code-area'),
    undefined,
    { timeout }
  )

  const state = await page.evaluate(async () => {
    const rectOf = element => {
      const rect = element.getBoundingClientRect()
      return {
        left: Math.round(rect.left),
        top: Math.round(rect.top),
        right: Math.round(rect.right),
        bottom: Math.round(rect.bottom),
        width: Math.round(rect.width),
        height: Math.round(rect.height)
      }
    }
    const viewer = document.querySelector('flyfish-file-viewer')
    const content = document.querySelector('.file-viewer-web-content')
    const toolbar = document.querySelector('.file-viewer-web-toolbar[data-toolbar-position="bottom-right"]')
    const code = document.querySelector('.code-viewer,.code-area')
    const viewerRect = viewer ? rectOf(viewer) : null
    const before = toolbar ? rectOf(toolbar) : null
    const scrollable = content ? content.scrollHeight > content.clientHeight + 20 : false
    if (content) {
      content.style.overflow = 'auto'
      await new Promise(resolve => requestAnimationFrame(resolve))
      content.scrollTop = Math.max(0, content.scrollHeight - content.clientHeight)
    }
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    const after = toolbar ? rectOf(toolbar) : null
    const toolbarStyle = toolbar ? window.getComputedStyle(toolbar) : null
    return {
      rendered: !!code,
      errors: window.__issue72Errors || [],
      readyStates: (window.__issue72States || []).filter(entry => entry?.state?.ready).length,
      scroll: content ? {
        scrollTop: Math.round(content.scrollTop),
        scrollHeight: content.scrollHeight,
        clientHeight: content.clientHeight,
        scrollable
      } : null,
      toolbar: viewerRect && before && after ? {
        position: toolbarStyle?.position,
        before,
        after,
        deltaLeft: Math.abs(after.left - before.left),
        deltaTop: Math.abs(after.top - before.top),
        rightGap: viewerRect.right - after.right,
        bottomGap: viewerRect.bottom - after.bottom,
        withinViewer: after.left >= viewerRect.left &&
          after.right <= viewerRect.right + 1 &&
          after.top >= viewerRect.top &&
          after.bottom <= viewerRect.bottom + 1
      } : null
    }
  })

  if (!state.rendered) {
    failures.push('SQL code renderer did not render.')
  }
  if (state.errors.length) {
    failures.push(`SQL viewer-error events: ${JSON.stringify(state.errors)}`)
  }
  if (!state.scroll?.scrollable || state.scroll.scrollTop < 1) {
    failures.push(`SQL content did not scroll in the harness: ${JSON.stringify(state.scroll)}`)
  }
  if (!state.toolbar) {
    failures.push('SQL bottom-right toolbar was not rendered.')
  } else {
    if (state.toolbar.position !== 'absolute') {
      failures.push(`SQL bottom-right toolbar must be absolutely positioned, got ${state.toolbar.position}.`)
    }
    if (state.toolbar.deltaLeft > 1 || state.toolbar.deltaTop > 1) {
      failures.push(`SQL bottom-right toolbar moved while content scrolled: ${JSON.stringify(state.toolbar)}`)
    }
    if (!state.toolbar.withinViewer || state.toolbar.rightGap < 0 || state.toolbar.bottomGap < 0 || state.toolbar.rightGap > 40 || state.toolbar.bottomGap > 40) {
      failures.push(`SQL bottom-right toolbar is not anchored inside the viewer: ${JSON.stringify(state.toolbar)}`)
    }
  }
  if (failures.length) {
    fail(`${sourceMode} SQL toolbar check failed:\n${failures.join('\n')}\nState: ${JSON.stringify(state, null, 2)}`)
  }

  console.log(`[issue72-web-full-iife] ${sourceMode}: sql toolbar ok (scrollTop ${state.scroll.scrollTop})`)
}

if (!existsSync(pptxSample)) {
  fail(`Missing sample PPTX: ${pptxSample}`)
}
if (!existsSync(sqlSample)) {
  fail(`Missing sample SQL: ${sqlSample}`)
}

const tempRoot = await mkdtemp(resolve(tmpdir(), 'file-viewer-issue72-web-full-'))
try {
  const webFullDist = await resolveWebFullDist(tempRoot)
  if (!existsSync(resolve(webFullDist, 'flyfish-file-viewer-web-full.iife.js'))) {
    fail(`Missing web-full IIFE dist at ${webFullDist}. Run pnpm --filter @file-viewer/web-full build first.`)
  }
  const { server, baseUrl } = await startStaticServer(webFullDist)
  const playwrightModule = await importPlaywright()
  const { chromium } = playwrightModule.chromium ? playwrightModule : playwrightModule.default
  const browser = await chromium.launch({ headless: true }).catch(() => chromium.launch({ channel: 'chrome', headless: true }))
  const page = await browser.newPage({ viewport: { width: 1280, height: 860 } })
  const sqlPage = await browser.newPage({ viewport: { width: 1280, height: 860 } })
  try {
    await verifyPage(page, baseUrl)
    await verifySqlToolbar(sqlPage, baseUrl)
  } finally {
    await page.close().catch(() => undefined)
    await sqlPage.close().catch(() => undefined)
    await browser.close()
    await new Promise(resolveClose => server.close(resolveClose))
  }
} finally {
  if (keepTemp) {
    console.log(`[issue72-web-full-iife] Kept temp root: ${tempRoot}`)
  } else {
    await rm(tempRoot, { recursive: true, force: true })
  }
}
