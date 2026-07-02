import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { delimiter, resolve, sep } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const timeout = Number(process.env.ISSUE74_DOCX_BLOB_TIMEOUT || 60000)
const keepTemp = process.env.ISSUE74_DOCX_BLOB_KEEP === '1'
const selectedCases = new Set(
  (process.env.ISSUE74_DOCX_BLOB_CASES || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
)
const filename = 'issue74-authenticated-blob.docx'
const sentinel = 'Issue 74 Blob Sentinel Unique Paragraph'
const require = createRequire(import.meta.url)
let packagePaths = new Map()

const fail = message => {
  console.error(`[issue74-docx-blob-matrix] ${message}`)
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
      'Run with: npm exec --yes --package playwright -- node scripts/verify-issue74-docx-blob-component-matrix.mjs',
      `Original error: ${error instanceof Error ? error.message : String(error)}`
    ].join('\n'))
  }
}

const caseGroups = [
  {
    id: 'react',
    dependencies: {
      '@file-viewer/react': null,
      '@file-viewer/react-full': null,
      '@file-viewer/react-legacy': null,
      '@file-viewer/react-legacy-full': null,
      react: '^18.3.1',
      'react-dom': '^18.3.1'
    },
    cases: [
      { id: 'react', label: 'React standard + preset-all' },
      { id: 'react-full', label: 'React full' },
      { id: 'react-legacy', label: 'React legacy standard + preset-all' },
      { id: 'react-legacy-full', label: 'React legacy full' }
    ],
    main: `
      import React from 'react'
      import { createRoot } from 'react-dom/client'
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
      const params = new URLSearchParams(window.location.search)
      const caseId = params.get('case') || cases[0].id
      const Component = components[caseId] || components[cases[0].id]
      window.__fileViewerEvents = []
      window.__fileViewerStates = []
      window.__fileViewerErrors = []
      document.body.dataset.case = caseId

      function serializeError(error) {
        if (!error) return null
        return {
          name: error.name || '',
          message: error.message || String(error),
          stack: error.stack || ''
        }
      }

      function App() {
        const [blob, setBlob] = React.useState(null)
        React.useEffect(() => {
          let disposed = false
          fetch('/${filename}')
            .then(response => response.blob())
            .then(nextBlob => {
              if (!disposed) {
                window.__issue74BlobSize = nextBlob.size
                setBlob(nextBlob)
              }
            })
            .catch(error => window.__fileViewerErrors.push(serializeError(error)))
          return () => {
            disposed = true
          }
        }, [])

        if (!blob) {
          return React.createElement('div', { className: 'viewer-host loading' }, 'loading blob')
        }

        return React.createElement(Component, {
          className: 'viewer-host',
          file: blob,
          name: '${filename}',
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

      createRoot(document.getElementById('root')).render(
        React.createElement(React.StrictMode, null, React.createElement(App))
      )
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
      const params = new URLSearchParams(window.location.search)
      const caseId = params.get('case') || cases[0].id
      const Component = components[caseId] || components[cases[0].id]
      window.__fileViewerEvents = []
      window.__fileViewerStates = []
      window.__fileViewerErrors = []
      document.body.dataset.case = caseId

      createApp({
        data: () => ({ blob: null }),
        mounted() {
          fetch('/${filename}')
            .then(response => response.blob())
            .then(blob => {
              window.__issue74BlobSize = blob.size
              this.blob = blob
            })
            .catch(error => window.__fileViewerErrors.push({ message: error.message || String(error) }))
        },
        render() {
          if (!this.blob) {
            return h('div', { class: 'viewer-host loading' }, 'loading blob')
          }
          return h(Component, {
            class: 'viewer-host',
            file: this.blob,
            filename: '${filename}',
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
      const params = new URLSearchParams(window.location.search)
      const caseId = params.get('case') || cases[0].id
      const Component = components[caseId] || components[cases[0].id]
      window.__fileViewerEvents = []
      window.__fileViewerStates = []
      window.__fileViewerErrors = []
      document.body.dataset.case = caseId

      new Vue({
        data: () => ({ blob: null }),
        mounted() {
          fetch('/${filename}')
            .then(response => response.blob())
            .then(blob => {
              window.__issue74BlobSize = blob.size
              this.blob = blob
            })
            .catch(error => window.__fileViewerErrors.push({ message: error.message || String(error) }))
        },
        render: function(h) {
          if (!this.blob) {
            return h('div', { class: 'viewer-host loading' }, 'loading blob')
          }
          return h(Component, {
            class: 'viewer-host',
            props: {
              file: this.blob,
              name: '${filename}',
              options: { theme: 'light', toolbar: { position: 'bottom-right' } }
            },
            on: {
              'viewer-event': event => window.__fileViewerEvents.push({ type: event.type, payload: event.payload })
            }
          })
        }
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
      const params = new URLSearchParams(window.location.search)
      const caseId = params.get('case') || cases[0].id
      const Component = components[caseId] || components[cases[0].id]
      window.__fileViewerEvents = []
      window.__fileViewerStates = []
      window.__fileViewerErrors = []
      document.body.dataset.case = caseId

      new Vue({
        data: () => ({ blob: null }),
        mounted() {
          fetch('/${filename}')
            .then(response => response.blob())
            .then(blob => {
              window.__issue74BlobSize = blob.size
              this.blob = blob
            })
            .catch(error => window.__fileViewerErrors.push({ message: error.message || String(error) }))
        },
        render: function(h) {
          if (!this.blob) {
            return h('div', { class: 'viewer-host loading' }, 'loading blob')
          }
          return h(Component, {
            class: 'viewer-host',
            props: {
              file: this.blob,
              name: '${filename}',
              options: { theme: 'light', toolbar: { position: 'bottom-right' } }
            },
            on: {
              'viewer-event': event => window.__fileViewerEvents.push({ type: event.type, payload: event.payload })
            }
          })
        }
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
      const params = new URLSearchParams(window.location.search)
      const caseId = params.get('case') || cases[0].id
      const host = document.getElementById('viewer')
      window.__fileViewerEvents = []
      window.__fileViewerStates = []
      window.__fileViewerErrors = []
      document.body.dataset.case = caseId

      const mountOptions = blob => ({
        file: blob,
        name: '${filename}',
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
      })

      fetch('/${filename}')
        .then(response => response.blob())
        .then(blob => {
          window.__issue74BlobSize = blob.size
          const options = mountOptions(blob)
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
        })
        .catch(error => window.__fileViewerErrors.push({ message: error.message || String(error) }))
    `
  }
]

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
  console.log(`[issue74-docx-blob-matrix] Packing ${packageName}`)
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

function dependencyVersion(packageName, tarballs, fallback = '^2.1.16') {
  const tarball = tarballs.get(packageName)
  return tarball ? `file:${tarball}` : fallback
}

function buildDependencies(group, tarballs) {
  const dependencies = {
    '@file-viewer/preset-all': dependencyVersion('@file-viewer/preset-all', tarballs),
    '@file-viewer/vite-plugin': dependencyVersion('@file-viewer/vite-plugin', tarballs),
    vite: '^6.3.6',
    ...group.dependencies
  }
  for (const [packageName, value] of Object.entries(dependencies)) {
    if (value === null) {
      dependencies[packageName] = dependencyVersion(packageName, tarballs)
    }
  }
  return dependencies
}

function activeGroupCases(group) {
  return group.cases.filter(testCase => !selectedCases.size || selectedCases.has(testCase.id))
}

async function writeMinimalDocx(publicDir) {
  const docxRoot = await mkdtemp(resolve(tmpdir(), 'file-viewer-issue74-docx-src-'))
  try {
    await mkdir(resolve(docxRoot, '_rels'), { recursive: true })
    await mkdir(resolve(docxRoot, 'word/_rels'), { recursive: true })
    await writeFile(resolve(docxRoot, '[Content_Types].xml'), normalizeSource(`
        <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
          <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
          <Default Extension="xml" ContentType="application/xml"/>
          <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
          <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
        </Types>
    `))
    await writeFile(resolve(docxRoot, '_rels/.rels'), normalizeSource(`
        <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
          <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
        </Relationships>
    `))
    await writeFile(resolve(docxRoot, 'word/_rels/document.xml.rels'), normalizeSource(`
        <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>
    `))
    await writeFile(resolve(docxRoot, 'word/styles.xml'), normalizeSource(`
        <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
          <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
            <w:name w:val="Normal"/>
            <w:qFormat/>
          </w:style>
        </w:styles>
    `))
    await writeFile(resolve(docxRoot, 'word/document.xml'), normalizeSource(`
        <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
          <w:body>
            <w:p>
              <w:r>
                <w:t>${sentinel}</w:t>
              </w:r>
            </w:p>
            <w:p>
              <w:r>
                <w:t>Authenticated Blob DOCX should render exactly once.</w:t>
              </w:r>
            </w:p>
            <w:sectPr>
              <w:pgSz w:w="11906" w:h="16838"/>
              <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/>
            </w:sectPr>
          </w:body>
        </w:document>
    `))
    await spawnCommand('zip', ['-q', '-r', resolve(publicDir, filename), '.'], {
      cwd: docxRoot,
      pipe: true
    })
  } finally {
    await rm(docxRoot, { recursive: true, force: true })
  }
}

async function writeIssueProject(group, appDir, tarballs) {
  const cases = activeGroupCases(group)
  await mkdir(resolve(appDir, 'src'), { recursive: true })
  await mkdir(resolve(appDir, 'public'), { recursive: true })
  await writeMinimalDocx(resolve(appDir, 'public'))

  await writeFile(resolve(appDir, 'index.html'), normalizeSource(`
      <!doctype html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Issue 74 DOCX Blob Matrix ${group.id}</title>
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

      .loading {
        display: grid;
        place-items: center;
        color: #64748b;
      }
    `))
  await writeFile(
    resolve(appDir, 'src/main.js'),
    normalizeSource(group.main).replace('CASES_PLACEHOLDER', JSON.stringify(cases, null, 8))
  )
  await writeFile(resolve(appDir, 'package.json'), `${JSON.stringify({
    name: `issue74-docx-blob-matrix-${group.id}`,
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
        child.kill('SIGTERM')
        rejectPromise(new Error(`Timed out waiting for Vite.\n${output}`))
      }
    }, timeout)
  })
}

async function stopVite(child) {
  if (!child || child.killed) {
    return
  }
  child.kill('SIGTERM')
  await new Promise(resolveStop => {
    child.once('close', resolveStop)
    setTimeout(resolveStop, 1500)
  })
}

async function verifyCase(page, baseUrl, group, testCase) {
  const pageErrors = []
  const consoleErrors = []
  const failedRequests = []
  const badResponses = []
  const listeners = {
    pageerror: error => pageErrors.push(error.message),
    console: message => {
      if (message.type() === 'error') {
        consoleErrors.push(message.text())
      }
    },
    requestfailed: request => failedRequests.push(`${request.method()} ${request.url()} ${request.failure()?.errorText || ''}`),
    response: response => {
      if (response.status() >= 400) {
        badResponses.push(`${response.status()} ${response.url()}`)
      }
    }
  }
  for (const [event, listener] of Object.entries(listeners)) {
    page.on(event, listener)
  }

  try {
    await page.goto(`${baseUrl}/?case=${encodeURIComponent(testCase.id)}`, {
      waitUntil: 'domcontentloaded',
      timeout
    })
    await page.waitForFunction(({ sentinelText }) => {
      const visibleErrors = Array.from(document.querySelectorAll('.file-viewer-error,.docx-error,.file-viewer-missing-renderer'))
        .filter(element => {
          const style = window.getComputedStyle(element)
          if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
            return false
          }
          const rect = element.getBoundingClientRect()
          return rect.width > 0 && rect.height > 0
        })
      const root = document.querySelector('.docx-wrapper') || document.querySelector('.file-render')
      const text = root?.innerText || ''
      const count = text.split(sentinelText).length - 1
      const sectionCount = document.querySelectorAll('.docx-wrapper section.docx, section.docx').length
      return visibleErrors.length === 0 && sectionCount > 0 && count > 0
    }, { sentinelText: sentinel }, { timeout })

    const state = await page.evaluate(sentinelText => {
      const root = document.querySelector('.docx-wrapper') || document.querySelector('.file-render')
      const text = root?.innerText || ''
      const sentinelCount = text.split(sentinelText).length - 1
      const sections = document.querySelectorAll('.docx-wrapper section.docx, section.docx').length
      const wrappers = document.querySelectorAll('.docx-wrapper').length
      return {
        sentinelCount,
        sections,
        wrappers,
        blobSize: window.__issue74BlobSize || 0,
        bodyText: document.body.innerText.replace(/\s+/g, ' ').slice(0, 1200),
        errors: window.__fileViewerErrors || [],
        states: (window.__fileViewerStates || []).slice(-8),
        events: (window.__fileViewerEvents || []).slice(-12),
        fileRenderCount: document.querySelectorAll('.file-render').length
      }
    }, sentinel)

    const failures = [
      ...pageErrors.map(error => `pageerror: ${error}`),
      ...consoleErrors.map(error => `console.error: ${error}`),
      ...failedRequests.map(error => `requestfailed: ${error}`),
      ...badResponses,
      ...state.errors.map(error => `viewer error: ${error.message || JSON.stringify(error)}`)
    ]
    if (state.blobSize <= 0) {
      failures.push(`Blob was not fetched. State: ${JSON.stringify(state)}`)
    }
    if (state.sentinelCount !== 1) {
      failures.push(`Expected sentinel text exactly once, got ${state.sentinelCount}. State: ${JSON.stringify(state)}`)
    }
    if (state.sections !== 1) {
      failures.push(`Expected one rendered DOCX section, got ${state.sections}. State: ${JSON.stringify(state)}`)
    }
    if (state.fileRenderCount !== 1) {
      failures.push(`Expected one active file-render target, got ${state.fileRenderCount}. State: ${JSON.stringify(state)}`)
    }
    if (failures.length) {
      fail(`${group.id}:${testCase.id} failed:\n${failures.join('\n')}`)
    }
    console.log(`[issue74-docx-blob-matrix] ${group.id}:${testCase.id}: ok (${state.sections} section, sentinel once)`)
  } finally {
    for (const [event, listener] of Object.entries(listeners)) {
      page.off(event, listener)
    }
  }
}

const groups = caseGroups
  .map(group => ({ ...group, cases: activeGroupCases(group) }))
  .filter(group => group.cases.length)
if (!groups.length) {
  fail('No component cases selected.')
}

const tempRoot = await mkdtemp(resolve(tmpdir(), 'file-viewer-issue74-docx-blob-'))
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
      console.log(`[issue74-docx-blob-matrix] Installing ${group.id} app at ${appDir}`)
      await spawnCommand('pnpm', ['install', '--ignore-scripts'], { cwd: appDir, pipe: true })
      console.log(`[issue74-docx-blob-matrix] Starting Vite ${group.id} app`)
      const { child, baseUrl } = await startVite(appDir)
      try {
        for (const testCase of group.cases) {
          const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
          try {
            await verifyCase(page, baseUrl, group, testCase)
          } finally {
            await page.close().catch(() => undefined)
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
    console.log(`[issue74-docx-blob-matrix] Kept temp root: ${tempRoot}`)
  } else {
    await rm(tempRoot, { recursive: true, force: true })
  }
}

const verifiedCaseCount = groups.reduce((total, group) => total + group.cases.length, 0)
console.log(`[issue74-docx-blob-matrix] Verified ${verifiedCaseCount} DOCX Blob component case(s).`)
process.exit(0)
