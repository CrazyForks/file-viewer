import { copyFile, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { delimiter, resolve, sep } from 'node:path'
import { tmpdir } from 'node:os'
import { pathToFileURL } from 'node:url'

const root = resolve(new URL('..', import.meta.url).pathname)
const samplePptx = resolve(root, 'apps/viewer-demo/public/example/ppt.pptx')
const timeout = Number(process.env.FULL_PACKAGE_PPTX_SMOKE_TIMEOUT || 45000)
const keepTemp = process.env.FULL_PACKAGE_PPTX_SMOKE_KEEP === '1'
const selectedCases = new Set(
  (process.env.FULL_PACKAGE_PPTX_SMOKE_CASES || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
)
const require = createRequire(import.meta.url)

let packagePaths = new Map()

const cases = [
  {
    id: 'react-full-18',
    label: 'React full on React 18',
    fullPackage: '@file-viewer/react-full',
    dependencies: {
      '@vitejs/plugin-react': '^4.7.0',
      react: '^18.3.1',
      'react-dom': '^18.3.1',
      vite: '^6.3.6'
    },
    files: {
      'vite.config.js': `
        import { defineConfig } from 'vite'
        import react from '@vitejs/plugin-react'

        export default defineConfig({
          plugins: [react()],
          optimizeDeps: { exclude: ['@ljheee/xmind-parser'] }
        })
      `,
      'src/main.js': `
        import React from 'react'
        import { createRoot } from 'react-dom/client'
        import FileViewer from '@file-viewer/react-full'
        import './style.css'

        createRoot(document.getElementById('root')).render(
          React.createElement(FileViewer, {
            url: '/sample.pptx',
            style: { height: '720px' },
            options: { theme: 'light', toolbar: { position: 'bottom-right' } }
          })
        )
      `
    }
  },
  {
    id: 'react-full-19',
    label: 'React full on React 19',
    fullPackage: '@file-viewer/react-full',
    dependencies: {
      '@vitejs/plugin-react': '^4.7.0',
      react: '^19.2.7',
      'react-dom': '^19.2.7',
      vite: '^6.3.6'
    },
    files: {
      'vite.config.js': `
        import { defineConfig } from 'vite'
        import react from '@vitejs/plugin-react'

        export default defineConfig({
          plugins: [react()],
          optimizeDeps: { exclude: ['@ljheee/xmind-parser'] }
        })
      `,
      'src/main.js': `
        import React from 'react'
        import { createRoot } from 'react-dom/client'
        import FileViewer from '@file-viewer/react-full'
        import './style.css'

        createRoot(document.getElementById('root')).render(
          React.createElement(FileViewer, {
            url: '/sample.pptx',
            style: { height: '720px' },
            options: { theme: 'light', toolbar: { position: 'bottom-right' } }
          })
        )
      `
    }
  },
  {
    id: 'react-legacy-full-16',
    label: 'React legacy full on React 16',
    fullPackage: '@file-viewer/react-legacy-full',
    dependencies: {
      '@vitejs/plugin-react': '^4.7.0',
      react: '^16.14.0',
      'react-dom': '^16.14.0',
      vite: '^6.3.6'
    },
    files: {
      'vite.config.js': `
        import { defineConfig } from 'vite'
        import react from '@vitejs/plugin-react'

        export default defineConfig({
          plugins: [react()],
          optimizeDeps: { exclude: ['@ljheee/xmind-parser'] }
        })
      `,
      'src/main.js': `
        import React from 'react'
        import ReactDOM from 'react-dom'
        import FileViewer from '@file-viewer/react-legacy-full'
        import './style.css'

        ReactDOM.render(
          React.createElement(FileViewer, {
            url: '/sample.pptx',
            style: { height: '720px' },
            options: { theme: 'light', toolbar: { position: 'bottom-right' } }
          }),
          document.getElementById('root')
        )
      `
    }
  },
  {
    id: 'react-legacy-full-17',
    label: 'React legacy full on React 17',
    fullPackage: '@file-viewer/react-legacy-full',
    dependencies: {
      '@vitejs/plugin-react': '^4.7.0',
      react: '^17.0.2',
      'react-dom': '^17.0.2',
      vite: '^6.3.6'
    },
    files: {
      'vite.config.js': `
        import { defineConfig } from 'vite'
        import react from '@vitejs/plugin-react'

        export default defineConfig({
          plugins: [react()],
          optimizeDeps: { exclude: ['@ljheee/xmind-parser'] }
        })
      `,
      'src/main.js': `
        import React from 'react'
        import ReactDOM from 'react-dom'
        import FileViewer from '@file-viewer/react-legacy-full'
        import './style.css'

        ReactDOM.render(
          React.createElement(FileViewer, {
            url: '/sample.pptx',
            style: { height: '720px' },
            options: { theme: 'light', toolbar: { position: 'bottom-right' } }
          }),
          document.getElementById('root')
        )
      `
    }
  },
  {
    id: 'vue3-full',
    label: 'Vue 3 full',
    fullPackage: '@file-viewer/vue3-full',
    dependencies: {
      '@vitejs/plugin-vue': '^5.2.4',
      vue: '^3.5.35',
      vite: '^6.3.6'
    },
    files: {
      'vite.config.js': `
        import { defineConfig } from 'vite'
        import vue from '@vitejs/plugin-vue'

        export default defineConfig({
          plugins: [vue()],
          optimizeDeps: { exclude: ['@ljheee/xmind-parser'] }
        })
      `,
      'src/main.js': `
        import { createApp, h } from 'vue'
        import { FileViewer } from '@file-viewer/vue3-full'
        import './style.css'

        createApp({
          render: () => h(FileViewer, {
            url: '/sample.pptx',
            style: 'height: 720px',
            options: { theme: 'light', toolbar: { position: 'bottom-right' } }
          })
        }).mount('#root')
      `
    }
  },
  {
    id: 'vue27-full',
    label: 'Vue 2.7 full',
    fullPackage: '@file-viewer/vue2.7-full',
    dependencies: {
      '@vitejs/plugin-vue2': '^2.3.4',
      vue: '2.7.16',
      vite: '^6.3.6'
    },
    files: {
      'vite.config.js': `
        import { defineConfig } from 'vite'
        import vue from '@vitejs/plugin-vue2'

        export default defineConfig({
          plugins: [vue()],
          optimizeDeps: { exclude: ['@ljheee/xmind-parser'] }
        })
      `,
      'src/main.js': `
        import Vue from 'vue'
        import { FileViewer } from '@file-viewer/vue2.7-full'
        import './style.css'

        new Vue({
          render: h => h(FileViewer, {
            props: {
              url: '/sample.pptx',
              options: { theme: 'light', toolbar: { position: 'bottom-right' } }
            },
            style: { height: '720px' }
          })
        }).$mount('#root')
      `
    }
  },
  {
    id: 'vue26-full',
    label: 'Vue 2.6 full',
    fullPackage: '@file-viewer/vue2.6-full',
    dependencies: {
      'vite-plugin-vue2': '^2.0.3',
      vue: '2.6.14',
      'vue-template-compiler': '2.6.14',
      vite: '^4.5.14'
    },
    files: {
      'vite.config.js': `
        import { defineConfig } from 'vite'
        import { createVuePlugin } from 'vite-plugin-vue2'

        export default defineConfig({
          plugins: [createVuePlugin()],
          optimizeDeps: { exclude: ['@ljheee/xmind-parser'] }
        })
      `,
      'src/main.js': `
        import Vue from 'vue'
        import { FileViewer } from '@file-viewer/vue2.6-full'
        import './style.css'

        new Vue({
          render: h => h(FileViewer, {
            props: {
              url: '/sample.pptx',
              options: { theme: 'light', toolbar: { position: 'bottom-right' } }
            },
            style: { height: '720px' }
          })
        }).$mount('#root')
      `
    }
  },
  {
    id: 'svelte-full',
    label: 'Svelte full',
    fullPackage: '@file-viewer/svelte-full',
    dependencies: {
      '@sveltejs/vite-plugin-svelte': '^5.1.1',
      svelte: '^5.46.0',
      vite: '^6.3.6'
    },
    files: {
      'vite.config.js': `
        import { defineConfig } from 'vite'
        import { svelte } from '@sveltejs/vite-plugin-svelte'

        export default defineConfig({
          plugins: [svelte()],
          optimizeDeps: { exclude: ['@ljheee/xmind-parser'] }
        })
      `,
      'src/main.js': `
        import { mount } from 'svelte'
        import App from './App.svelte'
        import './style.css'

        mount(App, { target: document.getElementById('root') })
      `,
      'src/App.svelte': `
        <script>
          import FileViewer from '@file-viewer/svelte-full'

          const options = { theme: 'light', toolbar: { position: 'bottom-right' } }
        </script>

        <FileViewer url="/sample.pptx" {options} containerStyle="height: 720px;" />
      `
    }
  },
  {
    id: 'web-full',
    label: 'Web full',
    fullPackage: '@file-viewer/web-full',
    dependencies: {
      vite: '^6.3.6'
    },
    files: {
      'vite.config.js': `
        import { defineConfig } from 'vite'

        export default defineConfig({
          optimizeDeps: { exclude: ['@ljheee/xmind-parser'] }
        })
      `,
      'src/main.js': `
        import { mountViewer } from '@file-viewer/web-full'
        import './style.css'

        mountViewer(document.getElementById('root'), {
          url: '/sample.pptx',
          filename: 'sample.pptx',
          options: { theme: 'light', toolbar: { position: 'bottom-right' } }
        })
      `
    }
  }
]

const activeCases = cases.filter(testCase => !selectedCases.size || selectedCases.has(testCase.id))

function fail(message) {
  console.error(`[full-package-pptx-smoke] ${message}`)
  process.exit(1)
}

function normalizeSource(source) {
  return source
    .split('\n')
    .map(line => line.replace(/^ {8}/, ''))
    .join('\n')
    .trimStart()
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
        stdout += chunk.toString()
        options.onStdout?.(chunk.toString())
      })
      child.stderr?.on('data', chunk => {
        stderr += chunk.toString()
        options.onStderr?.(chunk.toString())
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
      'Run with: npm exec --yes --package playwright -- node scripts/verify-full-package-pptx-vite-smoke.mjs',
      `Original error: ${error instanceof Error ? error.message : String(error)}`
    ].join('\n'))
  }
}

async function packPackage(packageName, tarballDir) {
  const packagePath = packagePaths.get(packageName)
  if (!packagePath) {
    fail(`Could not locate local package path for ${packageName}.`)
  }
  console.log(`[full-package-pptx-smoke] Packing ${packageName}`)
  await spawnCommand('pnpm', ['--filter', packageName, 'pack', '--pack-destination', tarballDir], {
    pipe: true
  })
  const files = (await readdir(tarballDir))
    .filter(file => file.endsWith('.tgz'))
    .map(file => resolve(tarballDir, file))
  const packageJson = JSON.parse(await readFile(resolve(packagePath, 'package.json'), 'utf8'))
  const expectedPrefix = packageJson.name
    .replace(/^@/, '')
    .replace('/', '-')
    .replace(/\./g, '.')
  const matches = files.filter(file => file.includes(`${expectedPrefix}-${packageJson.version}.tgz`))
  if (!matches.length) {
    fail(`Could not find packed tarball for ${packageName} in ${tarballDir}.`)
  }
  return matches[0]
}

async function writeCaseProject(testCase, appDir, tarballs) {
  await mkdir(resolve(appDir, 'src'), { recursive: true })
  await mkdir(resolve(appDir, 'public'), { recursive: true })
  await copyFile(samplePptx, resolve(appDir, 'public/sample.pptx'))
  await writeFile(resolve(appDir, 'index.html'), normalizeSource(`
        <!doctype html>
        <html>
          <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>${testCase.label}</title>
          </head>
          <body>
            <div id="root"></div>
            <script type="module" src="/src/main.js"></script>
          </body>
        </html>
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
      `))
  for (const [filePath, content] of Object.entries(testCase.files)) {
    await mkdir(resolve(appDir, filePath, '..'), { recursive: true })
    await writeFile(resolve(appDir, filePath), normalizeSource(content))
  }
  const packageJson = {
    name: `file-viewer-${testCase.id}`,
    private: true,
    type: 'module',
    scripts: {
      dev: 'vite --host 127.0.0.1'
    },
    dependencies: {
      [testCase.fullPackage]: `file:${tarballs.get(testCase.fullPackage)}`,
      ...testCase.dependencies
    }
  }
  await writeFile(resolve(appDir, 'package.json'), `${JSON.stringify(packageJson, null, 2)}\n`)
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
    const onData = chunk => {
      output += chunk.toString()
      const match = output.match(/Local:\s+(http:\/\/127\.0\.0\.1:\d+\/)/)
      if (match) {
        resolvePromise({ child, baseUrl: match[1].replace(/\/$/, ''), output })
      }
    }
    child.stdout.on('data', onData)
    child.stderr.on('data', onData)
    child.once('error', rejectPromise)
    child.once('close', code => {
      if (code !== 0 && !output.includes('Local:')) {
        rejectPromise(new Error(`Vite exited before becoming ready (${code}).\n${output}`))
      }
    })
    setTimeout(() => {
      rejectPromise(new Error(`Timed out waiting for Vite dev server.\n${output}`))
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

async function verifyCase(page, testCase, baseUrl) {
  const workerEvents = []
  const pageErrors = []
  const consoleErrors = []
  const failedRequests = []
  const badResponses = []
  const isWorkerLikeUrl = url => /pptx\.worker|\/worker\/|\/node_modules\/\.vite\/deps\/pptx-/i.test(url)
  const listeners = {
    request: request => {
      const url = request.url()
      if (isWorkerLikeUrl(url)) {
        workerEvents.push({ type: 'request', url })
      }
    },
    response: response => {
      const url = response.url()
      const status = response.status()
      if (isWorkerLikeUrl(url)) {
        workerEvents.push({
          type: 'response',
          status,
          url,
          contentType: response.headers()['content-type'] || ''
        })
      }
      if (status >= 400 && !url.endsWith('/favicon.ico')) {
        badResponses.push(`HTTP ${status}: ${url}`)
      }
    },
    requestfailed: request => {
      const url = request.url()
      const failure = request.failure()?.errorText || ''
      if (isWorkerLikeUrl(url)) {
        workerEvents.push({ type: 'failed', url, failure })
      } else if (!url.endsWith('/sample.pptx')) {
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
    await page.addInitScript(() => {
      window.__fileViewerPptxWorkerMessages = []
      const OriginalWorker = window.Worker
      window.Worker = class FileViewerPptxSmokeWorker extends OriginalWorker {
        constructor(url, options) {
          super(url, options)
          const workerUrl = typeof url === 'string' ? url : String(url)
          window.__fileViewerPptxWorkerMessages.push({
            type: 'construct',
            url: workerUrl,
            options
          })
          if (/pptx|worker/i.test(workerUrl)) {
            this.addEventListener('message', event => {
              window.__fileViewerPptxWorkerMessages.push(event.data)
            })
            this.addEventListener('messageerror', event => {
              window.__fileViewerPptxWorkerMessages.push({
                type: 'messageerror',
                data: String(event.data || '')
              })
            })
            this.addEventListener('error', event => {
              window.__fileViewerPptxWorkerMessages.push({
                type: 'worker-error',
                message: event.message || '',
                filename: event.filename || '',
                lineno: event.lineno || 0,
                colno: event.colno || 0
              })
            })
          }
        }
      }
    })
    await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded', timeout })
    try {
      await page.waitForFunction(() => {
        const text = document.body.innerText.replace(/\s+/g, ' ')
        const slides = document.querySelectorAll('.flyfish-pptx-content .slide, .pptx-render-surface .slide').length
        return slides > 0 || text.includes('Implementation Plan') || text.length > 800
      }, undefined, { timeout })
    } catch (error) {
      const snapshot = await page.evaluate(() => ({
        bodyText: document.body.innerText.replace(/\s+/g, ' ').slice(0, 1200),
        html: document.body.innerHTML.slice(0, 1800),
        slides: document.querySelectorAll('.flyfish-pptx-content .slide, .pptx-render-surface .slide').length,
        workerMessages: window.__fileViewerPptxWorkerMessages,
        pptxErrors: Array.from(document.querySelectorAll('.pptx-error'))
          .map(element => (element.textContent || '').replace(/\s+/g, ' ').trim()),
        loadingText: Array.from(document.querySelectorAll('.pptx-loading'))
          .map(element => (element.textContent || '').replace(/\s+/g, ' ').trim())
      }))
      fail([
        `${testCase.label} timed out waiting for rendered PPTX content.`,
        `Worker events: ${JSON.stringify(workerEvents)}`,
        `Page errors: ${JSON.stringify(pageErrors)}`,
        `Console errors: ${JSON.stringify(consoleErrors)}`,
        `Bad responses: ${JSON.stringify(badResponses)}`,
        `Failed requests: ${JSON.stringify(failedRequests)}`,
        `Snapshot: ${JSON.stringify(snapshot, null, 2)}`,
        error instanceof Error ? error.message : String(error)
      ].join('\n'))
    }

    const state = await page.evaluate(() => {
      const isVisible = element => {
        const style = getComputedStyle(element)
        const rect = element.getBoundingClientRect()
        return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0
      }
      return {
        bodyText: document.body.innerText.replace(/\s+/g, ' ').slice(0, 800),
        slides: document.querySelectorAll('.flyfish-pptx-content .slide, .pptx-render-surface .slide').length,
        workerMessages: window.__fileViewerPptxWorkerMessages,
        visibleErrors: Array.from(document.querySelectorAll('.pptx-error'))
          .filter(isVisible)
          .map(element => (element.textContent || '').replace(/\s+/g, ' ').trim())
      }
    })

    const workerResponses = workerEvents.filter(event => event.type === 'response')
    const failures = [
      ...pageErrors.map(error => `pageerror: ${error}`),
      ...consoleErrors.map(error => `console.error: ${error}`),
      ...failedRequests.map(error => `requestfailed: ${error}`),
      ...badResponses,
      ...state.visibleErrors.map(error => `visible PPTX error: ${error}`)
    ]
    const constructedWorkerUrls = state.workerMessages
      .filter(message => message?.type === 'construct')
      .map(message => String(message.url || ''))
    const httpWorkerUrls = constructedWorkerUrls.filter(url => /^https?:\/\//i.test(url))
    if (httpWorkerUrls.length && !workerResponses.some(event => event.status === 200)) {
      failures.push(`PPTX worker did not load with HTTP 200: ${JSON.stringify(workerEvents)}`)
    }
    if (workerEvents.some(event => event.url?.includes('/node_modules/.vite/deps/worker/pptx.worker.js'))) {
      failures.push(`worker still resolves from Vite optimize deps: ${JSON.stringify(workerEvents)}`)
    }
    const htmlWorkerResponses = workerResponses.filter(event =>
      event.status === 200 && /text\/html/i.test(event.contentType || '')
    )
    if (htmlWorkerResponses.length) {
      failures.push(`worker resolved to an HTML fallback response: ${JSON.stringify(htmlWorkerResponses)}`)
    }
    if (workerEvents.some(event => event.type === 'failed') || workerResponses.some(event => event.status >= 400)) {
      failures.push(`worker request failed: ${JSON.stringify(workerEvents)}`)
    }
    if (state.slides < 1 && !/Implementation Plan|Planetary Community/.test(state.bodyText)) {
      failures.push(`PPTX content did not render. State: ${JSON.stringify(state)}`)
    }
    if (failures.length) {
      fail(`${testCase.label} failed:\n${failures.join('\n')}`)
    }
    const workerUrl = workerResponses.find(event =>
      event.status === 200 && /pptx\.worker|\/worker\//i.test(event.url)
    )?.url || constructedWorkerUrls[0] || workerResponses.find(event => event.status === 200)?.url || ''
    console.log(`[full-package-pptx-smoke] ${testCase.id}: ok (${workerUrl})`)
  } finally {
    for (const [event, listener] of Object.entries(listeners)) {
      page.off(event, listener)
    }
  }
}

if (!activeCases.length) {
  fail(`No smoke cases selected. Available cases: ${cases.map(testCase => testCase.id).join(', ')}`)
}

if (!existsSync(samplePptx)) {
  fail(`Missing sample PPTX: ${samplePptx}`)
}

packagePaths = await collectFileViewerPackagePaths()
for (const testCase of activeCases) {
  if (!packagePaths.has(testCase.fullPackage)) {
    fail(`Smoke case ${testCase.id} references unknown local package ${testCase.fullPackage}.`)
  }
}

const tempRoot = await mkdtemp(resolve(tmpdir(), 'file-viewer-full-pptx-smoke-'))
const tarballDir = resolve(tempRoot, 'tarballs')
await mkdir(tarballDir, { recursive: true })

try {
  const packagesToPack = new Set(packagePaths.keys())
  const tarballs = new Map()
  for (const packageName of packagesToPack) {
    tarballs.set(packageName, await packPackage(packageName, tarballDir))
  }

  const playwrightModule = await importPlaywright()
  const { chromium } = playwrightModule.chromium ? playwrightModule : playwrightModule.default
  const browser = await chromium.launch({ headless: true }).catch(() => chromium.launch({ channel: 'chrome', headless: true }))

  try {
    for (const testCase of activeCases) {
      const appDir = resolve(tempRoot, testCase.id)
      console.log(`[full-package-pptx-smoke] Preparing ${testCase.id}`)
      await writeCaseProject(testCase, appDir, tarballs)
      console.log(`[full-package-pptx-smoke] Installing ${testCase.id}`)
      await spawnCommand('pnpm', ['install', '--ignore-scripts'], { cwd: appDir, pipe: true })
      console.log(`[full-package-pptx-smoke] Starting Vite for ${testCase.id}`)
      const { child, baseUrl } = await startVite(appDir)
      const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
      try {
        await verifyCase(page, testCase, baseUrl)
      } finally {
        await page.close().catch(() => undefined)
        await stopVite(child)
      }
    }
  } finally {
    await browser.close()
  }
} finally {
  if (keepTemp) {
    console.log(`[full-package-pptx-smoke] Kept temp root: ${tempRoot}`)
  } else {
    await rm(tempRoot, { recursive: true, force: true })
  }
}

console.log(`[full-package-pptx-smoke] Verified ${activeCases.length} full package Vite PPTX smoke case(s).`)
