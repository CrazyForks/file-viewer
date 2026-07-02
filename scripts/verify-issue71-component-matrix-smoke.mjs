import { copyFile, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { delimiter, resolve, sep } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const timeout = Number(process.env.ISSUE71_COMPONENT_MATRIX_TIMEOUT || 60000)
const keepTemp = process.env.ISSUE71_COMPONENT_MATRIX_KEEP === '1'
const selectedCases = new Set(
  (process.env.ISSUE71_COMPONENT_MATRIX_CASES || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
)
const selectedFormats = new Set(
  (process.env.ISSUE71_COMPONENT_MATRIX_FORMATS || 'pptx,docx,pdf,zip')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
)
const require = createRequire(import.meta.url)
let packagePaths = new Map()

const samples = [
  {
    id: 'pptx',
    filename: 'sample.pptx',
    source: resolve(root, 'apps/viewer-demo/public/example/ppt.pptx'),
    renderedSelector: '.flyfish-pptx-content .slide, .pptx-render-surface .slide',
    textPattern: /Implementation Plan|Planetary Community/i,
    allowTextFallback: true
  },
  {
    id: 'docx',
    filename: 'sample.docx',
    source: resolve(root, 'apps/viewer-demo/public/example/word.docx'),
    renderedSelector: '.docx-wrapper section.docx, section.docx',
    textPattern: /Lorem|目|测试|文档|This|sample/i,
    allowTextFallback: true
  },
  {
    id: 'pdf',
    filename: 'sample.pdf',
    source: resolve(root, 'apps/viewer-demo/public/example/pdf.pdf'),
    renderedSelector: '.pdfViewer .page[data-loaded="true"], .pdfViewer .page canvas, .pdf-page-list .pdf-page-button',
    textPattern: /PDF|page|文档/i,
    allowTextFallback: false
  },
  {
    id: 'zip',
    filename: 'sample.zip',
    source: resolve(root, 'apps/viewer-demo/public/example/archive.zip'),
    renderedSelector: '.archive-entry',
    textPattern: /ARCHIVE|压缩包|archive|preview/i,
    allowTextFallback: false
  }
].filter(sample => selectedFormats.has(sample.id))

const caseGroups = [
  {
    id: 'react',
    dependencies: {
      '@file-viewer/react': null,
      '@file-viewer/react-full': null,
      '@file-viewer/react-legacy': null,
      '@file-viewer/react-legacy-full': null,
      react: '^17.0.2',
      'react-dom': '^17.0.2'
    },
    cases: [
      { id: 'react', label: 'React standard + preset-all' },
      { id: 'react-full', label: 'React full' },
      { id: 'react-legacy', label: 'React legacy standard + preset-all' },
      { id: 'react-legacy-full', label: 'React legacy full' }
    ],
    main: `
      import React from 'react'
      import ReactDOM from 'react-dom'
      import ReactViewer from '@file-viewer/react'
      import ReactFullViewer from '@file-viewer/react-full'
      import { FileViewerLegacy } from '@file-viewer/react-legacy'
      import { FileViewerLegacy as FileViewerLegacyFull } from '@file-viewer/react-legacy-full'
      import './style.css'

      const components = {
        'react': ReactViewer,
        'react-full': ReactFullViewer,
        'react-legacy': FileViewerLegacy,
        'react-legacy-full': FileViewerLegacyFull
      }
      const cases = CASES_PLACEHOLDER
      const samples = SAMPLES_PLACEHOLDER
      const params = new URLSearchParams(window.location.search)
      const caseId = params.get('case') || cases[0].id
      const format = params.get('format') || Object.keys(samples)[0]
      const sample = samples[format]
      const Component = components[caseId] || components[cases[0].id]
      window.__fileViewerEvents = []
      window.__fileViewerStates = []
      window.__fileViewerErrors = []
      document.body.dataset.case = caseId
      document.body.dataset.format = format

      function serializeError(error) {
        if (!error) return null
        return {
          name: error.name || '',
          message: error.message || String(error),
          stack: error.stack || ''
        }
      }

      function App() {
        return React.createElement(Component, {
          className: 'viewer-host',
          url: sample.url,
          filename: sample.filename,
          options: { theme: 'light', toolbar: { position: 'bottom-right' } },
          onEvent: event => window.__fileViewerEvents.push({ type: event.type, payload: event.payload }),
          onStateChange: state => {
            window.__fileViewerStates.push({
              loading: state.loading,
              ready: state.ready,
              error: serializeError(state.error),
              lastEvent: state.lastEvent?.type || null
            })
            if (state.error) {
              window.__fileViewerErrors.push(serializeError(state.error))
            }
          }
        })
      }

      ReactDOM.render(React.createElement(App), document.getElementById('root'))
    `
  },
  {
    id: 'vue3',
    dependencies: {
      '@file-viewer/vue3': null,
      '@file-viewer/vue3-full': null,
      vue: '^3.5.25'
    },
    cases: [
      { id: 'vue3', label: 'Vue 3 standard + preset-all' },
      { id: 'vue3-full', label: 'Vue 3 full' }
    ],
    main: `
      import { createApp, h } from 'vue'
      import { FileViewer as Vue3Viewer } from '@file-viewer/vue3'
      import { FileViewer as Vue3FullViewer } from '@file-viewer/vue3-full'
      import './style.css'

      const components = {
        'vue3': Vue3Viewer,
        'vue3-full': Vue3FullViewer
      }
      const cases = CASES_PLACEHOLDER
      const samples = SAMPLES_PLACEHOLDER
      const params = new URLSearchParams(window.location.search)
      const caseId = params.get('case') || cases[0].id
      const format = params.get('format') || Object.keys(samples)[0]
      const sample = samples[format]
      const Component = components[caseId] || components[cases[0].id]
      window.__fileViewerEvents = []
      window.__fileViewerStates = []
      window.__fileViewerErrors = []
      document.body.dataset.case = caseId
      document.body.dataset.format = format

      createApp({
        render() {
          return h(Component, {
            class: 'viewer-host',
            url: sample.url,
            filename: sample.filename,
            options: { theme: 'light', toolbar: { position: 'bottom-right' } },
            onViewerEvent: event => window.__fileViewerEvents.push({ type: event.type, payload: event.payload })
          })
        }
      }).mount('#root')
    `
  },
  {
    id: 'vue2.7',
    dependencies: {
      '@file-viewer/vue2.7': null,
      '@file-viewer/vue2.7-full': null,
      vue: '^2.7.16'
    },
    cases: [
      { id: 'vue2.7', label: 'Vue 2.7 standard + preset-all' },
      { id: 'vue2.7-full', label: 'Vue 2.7 full' }
    ],
    main: `
      import Vue from 'vue'
      import { FileViewer as Vue27Viewer } from '@file-viewer/vue2.7'
      import { FileViewer as Vue27FullViewer } from '@file-viewer/vue2.7-full'
      import './style.css'

      const components = {
        'vue2.7': Vue27Viewer,
        'vue2.7-full': Vue27FullViewer
      }
      const cases = CASES_PLACEHOLDER
      const samples = SAMPLES_PLACEHOLDER
      const params = new URLSearchParams(window.location.search)
      const caseId = params.get('case') || cases[0].id
      const format = params.get('format') || Object.keys(samples)[0]
      const sample = samples[format]
      const Component = components[caseId] || components[cases[0].id]
      window.__fileViewerEvents = []
      window.__fileViewerStates = []
      window.__fileViewerErrors = []
      document.body.dataset.case = caseId
      document.body.dataset.format = format

      new Vue({
        render: h => h(Component, {
          class: 'viewer-host',
          props: {
            url: sample.url,
            filename: sample.filename,
            options: { theme: 'light', toolbar: { position: 'bottom-right' } }
          },
          on: {
            'viewer-event': event => window.__fileViewerEvents.push({ type: event.type, payload: event.payload })
          }
        })
      }).$mount('#root')
    `
  },
  {
    id: 'vue2.6',
    dependencies: {
      '@file-viewer/vue2.6': null,
      '@file-viewer/vue2.6-full': null,
      vue: '2.6.14'
    },
    cases: [
      { id: 'vue2.6', label: 'Vue 2.6 standard + preset-all' },
      { id: 'vue2.6-full', label: 'Vue 2.6 full' }
    ],
    main: `
      import Vue from 'vue'
      import { FileViewer as Vue26Viewer } from '@file-viewer/vue2.6'
      import { FileViewer as Vue26FullViewer } from '@file-viewer/vue2.6-full'
      import './style.css'

      const components = {
        'vue2.6': Vue26Viewer,
        'vue2.6-full': Vue26FullViewer
      }
      const cases = CASES_PLACEHOLDER
      const samples = SAMPLES_PLACEHOLDER
      const params = new URLSearchParams(window.location.search)
      const caseId = params.get('case') || cases[0].id
      const format = params.get('format') || Object.keys(samples)[0]
      const sample = samples[format]
      const Component = components[caseId] || components[cases[0].id]
      window.__fileViewerEvents = []
      window.__fileViewerStates = []
      window.__fileViewerErrors = []
      document.body.dataset.case = caseId
      document.body.dataset.format = format

      new Vue({
        render: h => h(Component, {
          class: 'viewer-host',
          props: {
            url: sample.url,
            filename: sample.filename,
            options: { theme: 'light', toolbar: { position: 'bottom-right' } }
          },
          on: {
            'viewer-event': event => window.__fileViewerEvents.push({ type: event.type, payload: event.payload })
          }
        })
      }).$mount('#root')
    `
  },
  {
    id: 'vanilla',
    dependencies: {
      '@file-viewer/web': null,
      '@file-viewer/web-full': null,
      '@file-viewer/jquery': null,
      '@file-viewer/jquery-full': null,
      '@file-viewer/svelte': null,
      '@file-viewer/svelte-full': null,
      jquery: '^3.7.1',
      svelte: '^5.46.0'
    },
    cases: [
      { id: 'web', label: 'Vanilla Web standard + preset-all' },
      { id: 'web-full', label: 'Vanilla Web full' },
      { id: 'jquery', label: 'jQuery standard + preset-all' },
      { id: 'jquery-full', label: 'jQuery full' },
      { id: 'svelte-action', label: 'Svelte action standard + preset-all' },
      { id: 'svelte-full-action', label: 'Svelte action full' }
    ],
    main: `
      import { mountViewer as mountWebViewer } from '@file-viewer/web'
      import { mountViewer as mountWebFullViewer } from '@file-viewer/web-full'
      import { mountViewer as mountJQueryViewer } from '@file-viewer/jquery'
      import { mountViewer as mountJQueryFullViewer } from '@file-viewer/jquery-full'
      import { fileViewer as svelteAction } from '@file-viewer/svelte/action'
      import { fileViewer as svelteFullAction } from '@file-viewer/svelte-full/action'
      import './style.css'

      const cases = CASES_PLACEHOLDER
      const samples = SAMPLES_PLACEHOLDER
      const params = new URLSearchParams(window.location.search)
      const caseId = params.get('case') || cases[0].id
      const format = params.get('format') || Object.keys(samples)[0]
      const sample = samples[format]
      const host = document.getElementById('viewer')
      const options = {
        url: sample.url,
        filename: sample.filename,
        options: { theme: 'light', toolbar: { position: 'bottom-right' } },
        onEvent: event => window.__fileViewerEvents.push({ type: event.type, payload: event.payload }),
        onStateChange: state => {
          window.__fileViewerStates.push({
            loading: state.loading,
            ready: state.ready,
            error: state.error ? { message: state.error.message || String(state.error) } : null,
            lastEvent: state.lastEvent?.type || null
          })
          if (state.error) {
            window.__fileViewerErrors.push({ message: state.error.message || String(state.error) })
          }
        }
      }
      window.__fileViewerEvents = []
      window.__fileViewerStates = []
      window.__fileViewerErrors = []
      document.body.dataset.case = caseId
      document.body.dataset.format = format

      if (caseId === 'web') {
        mountWebViewer(host, options)
      } else if (caseId === 'web-full') {
        mountWebFullViewer(host, options)
      } else if (caseId === 'jquery') {
        mountJQueryViewer(host, options)
      } else if (caseId === 'jquery-full') {
        mountJQueryFullViewer(host, options)
      } else if (caseId === 'svelte-action') {
        svelteAction(host, options)
      } else if (caseId === 'svelte-full-action') {
        svelteFullAction(host, options)
      }
    `
  }
]

function fail(message) {
  console.error(`[issue71-component-matrix] ${message}`)
  process.exit(1)
}

function normalizeSource(source) {
  return source
    .split('\n')
    .map(line => line.replace(/^ {6}/, ''))
    .join('\n')
    .trimStart()
}

function spawnCommand(command, args, options = {}) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {
      cwd: options.cwd || root,
      env: { ...process.env, ...options.env },
      stdio: options.pipe ? ['ignore', 'pipe', 'pipe'] : 'inherit'
    })
    let stdout = ''
    let stderr = ''
    if (options.pipe) {
      child.stdout?.on('data', chunk => {
        const text = chunk.toString()
        stdout += text
        options.onStdout?.(text)
      })
      child.stderr?.on('data', chunk => {
        const text = chunk.toString()
        stderr += text
        options.onStderr?.(text)
      })
    }
    child.once('error', rejectPromise)
    child.once('close', code => {
      if (code === 0) {
        resolvePromise({ stdout, stderr })
        return
      }
      const detail = options.pipe ? `\n${stdout}\n${stderr}` : ''
      rejectPromise(new Error(`${command} ${args.join(' ')} exited with ${code}${detail}`))
    })
  })
}

async function importPlaywright() {
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
      'Run with: npm exec --yes --package playwright -- node scripts/verify-issue71-component-matrix-smoke.mjs',
      `Original error: ${error instanceof Error ? error.message : String(error)}`
    ].join('\n'))
  }
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

async function packPackage(packageName, tarballDir) {
  const packagePath = packagePaths.get(packageName)
  if (!packagePath) {
    fail(`Could not locate local package path for ${packageName}.`)
  }
  console.log(`[issue71-component-matrix] Packing ${packageName}`)
  await spawnCommand('pnpm', ['--filter', packageName, 'pack', '--pack-destination', tarballDir], {
    pipe: true
  })
  const packageJson = JSON.parse(await readFile(resolve(packagePath, 'package.json'), 'utf8'))
  const expectedPrefix = packageJson.name.replace(/^@/, '').replace('/', '-')
  const files = (await readdir(tarballDir))
    .filter(file => file.endsWith('.tgz'))
    .map(file => resolve(tarballDir, file))
  const matches = files.filter(file => file.includes(`${expectedPrefix}-${packageJson.version}.tgz`))
  if (!matches.length) {
    fail(`Could not find packed tarball for ${packageName} in ${tarballDir}.`)
  }
  return matches[0]
}

async function createTarballOverrides(tarballDir) {
  packagePaths = await collectFileViewerPackagePaths()
  const tarballs = new Map()
  for (const packageName of packagePaths.keys()) {
    tarballs.set(packageName, await packPackage(packageName, tarballDir))
  }
  return tarballs
}

function dependencyVersion(packageName, tarballs, fallback) {
  const tarball = tarballs.get(packageName)
  return tarball ? `file:${tarball}` : fallback
}

function buildDependencies(group, tarballs) {
  const dependencies = {
    '@file-viewer/preset-all': dependencyVersion('@file-viewer/preset-all', tarballs, '^2.1.16'),
    '@file-viewer/vite-plugin': dependencyVersion('@file-viewer/vite-plugin', tarballs, '^2.1.16'),
    vite: '^6.3.6',
    ...group.dependencies
  }
  for (const [packageName, value] of Object.entries(dependencies)) {
    if (value === null) {
      dependencies[packageName] = dependencyVersion(packageName, tarballs, '^2.1.16')
    }
  }
  return dependencies
}

function activeGroupCases(group) {
  return group.cases.filter(testCase => !selectedCases.size || selectedCases.has(testCase.id))
}

async function writeIssueProject(group, appDir, tarballs) {
  const cases = activeGroupCases(group)
  await mkdir(resolve(appDir, 'src'), { recursive: true })
  await mkdir(resolve(appDir, 'public'), { recursive: true })
  for (const sample of samples) {
    await copyFile(sample.source, resolve(appDir, 'public', sample.filename))
  }

  await writeFile(resolve(appDir, 'index.html'), normalizeSource(`
      <!doctype html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Issue 71 component matrix ${group.id}</title>
        </head>
        <body>
          <div id="root"><div id="viewer" class="viewer-host"></div></div>
          <script type="module" src="/src/main.js"></script>
        </body>
      </html>
    `))
  await writeFile(resolve(appDir, 'vite.config.js'), normalizeSource(`
      import { defineConfig } from 'vite'
      import { fileViewerRenderers } from '@file-viewer/vite-plugin'

      export default defineConfig({
        plugins: [
          fileViewerRenderers({ copyAssets: true })
        ],
        optimizeDeps: {
          exclude: ['@ljheee/xmind-parser']
        }
      })
    `))
  await writeFile(resolve(appDir, 'src/style.css'), normalizeSource(`
      html,
      body,
      #root {
        height: 100%;
        margin: 0;
      }

      body {
        font-family: Arial, sans-serif;
      }

      .viewer-host {
        height: 720px;
        min-height: 0;
      }
    `))

  const sampleMap = Object.fromEntries(samples.map(sample => [
    sample.id,
    { url: `/${sample.filename}`, filename: sample.filename }
  ]))
  await writeFile(
    resolve(appDir, 'src/main.js'),
    normalizeSource(group.main)
      .replace('CASES_PLACEHOLDER', JSON.stringify(cases, null, 8))
      .replace('SAMPLES_PLACEHOLDER', JSON.stringify(sampleMap, null, 8))
  )

  await writeFile(resolve(appDir, 'package.json'), `${JSON.stringify({
    name: `issue71-component-matrix-${group.id}`,
    private: true,
    type: 'module',
    scripts: { dev: 'vite --host 127.0.0.1' },
    dependencies: buildDependencies(group, tarballs)
  }, null, 2)}\n`)

  const overrideLines = Array.from(tarballs.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([packageName, tarballPath]) => `  ${JSON.stringify(packageName)}: ${JSON.stringify(`file:${tarballPath}`)}`)
  await writeFile(resolve(appDir, 'pnpm-workspace.yaml'), [
    'packages:',
    '  - .',
    'overrides:',
    ...overrideLines,
    ''
  ].join('\n'))
}

async function startVite(appDir) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn('pnpm', ['exec', 'vite', '--host', '127.0.0.1', '--force'], {
      cwd: appDir,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe']
    })
    let output = ''
    let settled = false
    const onData = chunk => {
      output += chunk.toString()
      const match = output.match(/Local:\s+(http:\/\/127\.0\.0\.1:\d+\/)/)
      if (match && !settled) {
        settled = true
        resolvePromise({ child, baseUrl: match[1].replace(/\/$/, ''), output })
      }
    }
    child.stdout.on('data', onData)
    child.stderr.on('data', onData)
    child.once('error', rejectPromise)
    child.once('close', code => {
      if (code !== 0 && !settled) {
        rejectPromise(new Error(`Vite exited before becoming ready (${code}).\n${output}`))
      }
    })
    setTimeout(() => {
      if (!settled) {
        rejectPromise(new Error(`Timed out waiting for Vite dev server.\n${output}`))
      }
    }, timeout)
  })
}

async function stopVite(child) {
  if (!child || child.killed) {
    return
  }
  child.kill('SIGINT')
  await new Promise(resolveStop => {
    const timer = setTimeout(() => {
      child.kill('SIGKILL')
      resolveStop()
    }, 5000)
    child.once('close', () => {
      clearTimeout(timer)
      resolveStop()
    })
  })
}

function isRelevantBadResponse(url) {
  return !/favicon\.ico|\/@vite\/client|\/src\/main\.js|\/src\/style\.css/.test(url)
}

async function verifyCase(page, baseUrl, group, testCase, sample) {
  const pageErrors = []
  const consoleErrors = []
  const failedRequests = []
  const badResponses = []
  const assetEvents = []
  const isAssetUrl = url => /vendor\/(docx|pdf|libarchive|pptx)|\.worker|\.wasm|node_modules\/\.vite\/deps/i.test(url)
  const listeners = {
    request: request => {
      const url = request.url()
      if (isAssetUrl(url)) {
        assetEvents.push({ type: 'request', url })
      }
    },
    response: response => {
      const url = response.url()
      const status = response.status()
      if (isAssetUrl(url)) {
        assetEvents.push({
          type: 'response',
          status,
          url,
          contentType: response.headers()['content-type'] || ''
        })
      }
      if (status >= 400 && isRelevantBadResponse(url)) {
        badResponses.push(`HTTP ${status}: ${url}`)
      }
    },
    requestfailed: request => {
      const url = request.url()
      const failure = request.failure()?.errorText || ''
      if (failure === 'net::ERR_ABORTED' && (/\/sample\.[^/?#]+/.test(url) || isAssetUrl(url))) {
        return
      }
      if (isRelevantBadResponse(url)) {
        failedRequests.push(`${url}: ${failure}`)
      }
    },
    pageerror: error => {
      pageErrors.push(error.message)
    },
    console: message => {
      if (message.type() !== 'error') {
        return
      }
      const location = message.location()
      if (location.url.endsWith('/favicon.ico')) {
        return
      }
      consoleErrors.push(`${message.text()} (${location.url}:${location.lineNumber})`)
    }
  }
  for (const [event, listener] of Object.entries(listeners)) {
    page.on(event, listener)
  }

  try {
    await page.goto(`${baseUrl}/?case=${encodeURIComponent(testCase.id)}&format=${sample.id}`, {
      waitUntil: 'domcontentloaded',
      timeout
    })
    try {
      await page.waitForFunction(
        ({ selector, patternSource, allowTextFallback }) => {
          const isVisible = element => {
            const style = window.getComputedStyle(element)
            if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
              return false
            }
            const rect = element.getBoundingClientRect()
            return rect.width > 0 && rect.height > 0
          }
          const text = document.body.innerText.replace(/\s+/g, ' ')
          const visibleErrors = Array.from(document.querySelectorAll('.file-viewer-error,.pptx-error,.archive-error,.pdf-state--error,.file-viewer-missing-renderer'))
            .filter(isVisible)
            .map(element => (element.textContent || '').replace(/\s+/g, ' ').trim())
            .filter(Boolean)
          const hasFatalError = visibleErrors.some(text => !/压缩包预览提示|Archive preview/i.test(text))
          const rendered = document.querySelectorAll(selector).length
          const textPattern = new RegExp(patternSource, 'i')
          return !hasFatalError && (rendered > 0 || (allowTextFallback && textPattern.test(text)))
        },
        {
          selector: sample.renderedSelector,
          patternSource: sample.textPattern.source,
          allowTextFallback: sample.allowTextFallback
        },
        { timeout }
      )
    } catch (error) {
      const snapshot = await page.evaluate(selector => ({
        bodyText: document.body.innerText.replace(/\s+/g, ' ').slice(0, 1800),
        html: document.body.innerHTML.slice(0, 2400),
        renderedCount: document.querySelectorAll(selector).length,
        errors: window.__fileViewerErrors || [],
        states: (window.__fileViewerStates || []).slice(-8),
        events: (window.__fileViewerEvents || []).slice(-12),
        visibleErrors: Array.from(document.querySelectorAll('.file-viewer-error,.pptx-error,.archive-error,.pdf-state--error,.file-viewer-missing-renderer'))
          .filter(element => {
            const style = window.getComputedStyle(element)
            if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
              return false
            }
            const rect = element.getBoundingClientRect()
            return rect.width > 0 && rect.height > 0
          })
          .map(element => (element.textContent || '').replace(/\s+/g, ' ').trim())
          .filter(Boolean)
      }), sample.renderedSelector)
      fail([
        `${group.id}:${testCase.id}:${sample.id} timed out waiting for rendered content.`,
        `Asset events: ${JSON.stringify(assetEvents)}`,
        `Page errors: ${JSON.stringify(pageErrors)}`,
        `Console errors: ${JSON.stringify(consoleErrors)}`,
        `Bad responses: ${JSON.stringify(badResponses)}`,
        `Failed requests: ${JSON.stringify(failedRequests)}`,
        `Snapshot: ${JSON.stringify(snapshot, null, 2)}`,
        error instanceof Error ? error.message : String(error)
      ].join('\n'))
    }

    const state = await page.evaluate(selector => ({
      bodyText: document.body.innerText.replace(/\s+/g, ' ').slice(0, 1000),
      renderedCount: document.querySelectorAll(selector).length,
      errors: window.__fileViewerErrors || [],
      states: (window.__fileViewerStates || []).slice(-5),
      visibleErrors: Array.from(document.querySelectorAll('.file-viewer-error,.pptx-error,.archive-error,.pdf-state--error,.file-viewer-missing-renderer'))
        .filter(element => {
          const style = window.getComputedStyle(element)
          if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
            return false
          }
          const rect = element.getBoundingClientRect()
          return rect.width > 0 && rect.height > 0
        })
        .map(element => (element.textContent || '').replace(/\s+/g, ' ').trim())
        .filter(Boolean)
    }), sample.renderedSelector)
    const failures = [
      ...pageErrors.map(error => `pageerror: ${error}`),
      ...consoleErrors.map(error => `console.error: ${error}`),
      ...failedRequests.map(error => `requestfailed: ${error}`),
      ...badResponses,
      ...state.errors.map(error => `viewer error: ${error.message || JSON.stringify(error)}`)
    ]
    if (state.renderedCount < 1 && !(sample.allowTextFallback && sample.textPattern.test(state.bodyText))) {
      failures.push(`No rendered marker found. State: ${JSON.stringify(state)}`)
    }
    if (failures.length) {
      fail(`${group.id}:${testCase.id}:${sample.id} failed:\n${failures.join('\n')}\nAsset events: ${JSON.stringify(assetEvents)}\nState: ${JSON.stringify(state)}`)
    }
    console.log(`[issue71-component-matrix] ${group.id}:${testCase.id}:${sample.id}: ok (${state.renderedCount} rendered marker(s))`)
  } finally {
    for (const [event, listener] of Object.entries(listeners)) {
      page.off(event, listener)
    }
  }
}

if (!samples.length) {
  fail('No formats selected.')
}
for (const sample of samples) {
  if (!existsSync(sample.source)) {
    fail(`Missing sample ${sample.id}: ${sample.source}`)
  }
}

const groups = caseGroups
  .map(group => ({ ...group, cases: activeGroupCases(group) }))
  .filter(group => group.cases.length)
if (!groups.length) {
  fail('No component cases selected.')
}

const tempRoot = await mkdtemp(resolve(tmpdir(), 'file-viewer-issue71-component-matrix-'))
const tarballDir = resolve(tempRoot, 'tarballs')
await mkdir(tarballDir, { recursive: true })

try {
  const tarballs = await createTarballOverrides(tarballDir)
  const playwrightModule = await importPlaywright()
  const { chromium } = playwrightModule.chromium ? playwrightModule : playwrightModule.default
  const browser = await chromium.launch({ headless: true }).catch(() => chromium.launch({ channel: 'chrome', headless: true }))
  try {
    for (const group of groups) {
      const appDir = resolve(tempRoot, `app-${group.id}`)
      await writeIssueProject(group, appDir, tarballs)
      console.log(`[issue71-component-matrix] Installing ${group.id} app at ${appDir}`)
      await spawnCommand('pnpm', ['install', '--ignore-scripts'], { cwd: appDir, pipe: true })
      console.log(`[issue71-component-matrix] Starting Vite ${group.id} app`)
      const { child, baseUrl } = await startVite(appDir)
      try {
        for (const testCase of group.cases) {
          for (const sample of samples) {
            const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
            try {
              await verifyCase(page, baseUrl, group, testCase, sample)
            } finally {
              await page.close().catch(() => undefined)
            }
          }
        }
      } finally {
        await stopVite(child)
      }
    }
  } finally {
    await browser.close()
  }
} finally {
  if (keepTemp) {
    console.log(`[issue71-component-matrix] Kept temp root: ${tempRoot}`)
  } else {
    await rm(tempRoot, { recursive: true, force: true })
  }
}

const verifiedCaseCount = groups.reduce((total, group) => total + group.cases.length, 0)
console.log(`[issue71-component-matrix] Verified ${verifiedCaseCount} component case(s) across ${samples.length} format(s).`)
process.exit(0)
