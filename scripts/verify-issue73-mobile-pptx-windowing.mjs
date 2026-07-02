import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { delimiter, resolve, sep } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const timeout = Number(process.env.ISSUE73_PPTX_WINDOWING_TIMEOUT || 60000)
const keepTemp = process.env.ISSUE73_PPTX_WINDOWING_KEEP === '1'
const slideCount = Number(process.env.ISSUE73_PPTX_WINDOWING_SLIDES || 80)
const maxLiveSlides = Number(process.env.ISSUE73_PPTX_WINDOWING_MAX_LIVE || 19)
const require = createRequire(import.meta.url)

const fail = message => {
  console.error(`[issue73-mobile-pptx-windowing] ${message}`)
  process.exit(1)
}

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
      'Run with: npm exec --yes --package playwright -- node scripts/verify-issue73-mobile-pptx-windowing.mjs',
      `Original error: ${error instanceof Error ? error.message : String(error)}`
    ].join('\n'))
  }
}

async function packPptxPackage(packDir) {
  await mkdir(packDir, { recursive: true })
  await spawnCommand('pnpm', ['--filter', '@file-viewer/pptx', 'pack', '--pack-destination', packDir], {
    pipe: true
  })
  const tarball = (await readdir(packDir))
    .filter(file => file.endsWith('.tgz') && file.includes('file-viewer-pptx-'))
    .sort()
    .at(-1)
  if (!tarball) {
    fail(`Could not find packed @file-viewer/pptx tarball in ${packDir}.`)
  }
  return resolve(packDir, tarball)
}

const normalizeSource = source => source
  .split('\n')
  .map(line => line.replace(/^ {8}/, ''))
  .join('\n')
  .trimStart()

function createMainSource() {
  return normalizeSource(`
        import { PptxViewer } from '@file-viewer/pptx'

        const totalSlides = ${JSON.stringify(slideCount)}
        const target = document.getElementById('viewer')
        const status = document.getElementById('status')
        window.__issue73Stats = []
        window.__issue73Errors = []

        const updateStatus = text => {
          status.textContent = text
        }

        const createSlideHtml = index => {
          const hue = (index * 37) % 360
          const repeatedText = Array.from({ length: 48 }, (_, item) => \`block-\${index}-\${item}\`).join(' ')
          const svg = encodeURIComponent(\`
            <svg xmlns="http://www.w3.org/2000/svg" width="480" height="260">
              <defs>
                <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
                  <stop stop-color="hsl(\${hue},75%,62%)"/>
                  <stop offset="1" stop-color="hsl(\${(hue + 80) % 360},80%,54%)"/>
                </linearGradient>
              </defs>
              <rect width="480" height="260" fill="url(#g)"/>
              <text x="32" y="145" font-family="Arial" font-size="56" fill="white">Slide \${index}</text>
            </svg>
          \`)
          return \`
            <div class="slide" data-slide="\${index}" style="width:960px;height:540px;background:#fff;">
              <img alt="" src="data:image/svg+xml;charset=utf-8,\${svg}" style="position:absolute;left:420px;top:120px;width:420px;height:228px;">
              <div class="block content" style="left:72px;top:70px;width:420px;height:330px;font-family:Arial,sans-serif;color:#172033;">
                <div class="text-block" style="font-size:42px;font-weight:700;line-height:1.12;">Mobile memory slide \${index}</div>
                <div class="slide-prgrph" style="margin-top:24px;font-size:20px;line-height:1.38;">\${repeatedText}</div>
              </div>
            </div>
          \`
        }

        class FakePptxWorker extends EventTarget {
          #terminated = false

          postMessage(message) {
            if (message?.type !== 'processPPTX') {
              return
            }
            requestAnimationFrame(() => this.#emitSlides())
          }

          terminate() {
            this.#terminated = true
          }

          #emit(data) {
            if (this.#terminated) {
              return
            }
            this.dispatchEvent(new MessageEvent('message', { data }))
          }

          #emitSlides() {
            this.#emit({ type: 'slideSize', data: { width: 960, height: 540 } })
            let index = 1
            const pump = () => {
              if (this.#terminated) {
                return
              }
              const end = Math.min(totalSlides, index + 5)
              for (; index <= end; index += 1) {
                this.#emit({
                  type: 'slide',
                  slide_num: index,
                  data: createSlideHtml(index)
                })
                this.#emit({
                  type: 'progress-update',
                  slide_num: totalSlides + index,
                  data: (index * 100) / totalSlides
                })
              }
              if (index <= totalSlides) {
                requestAnimationFrame(pump)
                return
              }
              this.#emit({ type: 'globalCSS', data: '' })
              this.#emit({ type: 'ExecutionTime', charts: { MsgQueue: [] } })
            }
            pump()
          }
        }

        const recordStats = label => {
          const slots = Array.from(document.querySelectorAll('.flyfish-pptx-slide-slot'))
          const liveSlides = Array.from(document.querySelectorAll('.flyfish-pptx-slide-slot > .slide'))
          const stats = {
            label,
            slots: slots.length,
            liveSlides: liveSlides.length,
            slideNumbers: liveSlides.map(slide => Number(slide.dataset.slide || 0)).filter(Boolean),
            renderState: document.querySelector('.flyfish-pptx-content')?.dataset.renderState || '',
            scrollHeight: document.getElementById('scroll').scrollHeight
          }
          window.__issue73Stats.push(stats)
          return stats
        }

        window.__issue73RecordStats = recordStats

        PptxViewer.open(new ArrayBuffer(9 * 1024 * 1024), target, {
          fitMode: 'contain',
          lazySlides: true,
          lazyMedia: true,
          listOptions: {
            windowed: true,
            initialSlides: 3,
            batchSize: 4,
            overscanViewport: 1.5
          },
          workerFactory: () => new FakePptxWorker(),
          onSlideRendered: slideNumber => updateStatus(\`rendered \${slideNumber}\`),
          onRenderComplete: () => {
            updateStatus('ready')
            window.__issue73Done = true
            recordStats('complete')
          },
          onError: error => {
            window.__issue73Errors.push(error?.message || String(error))
            updateStatus(error?.message || String(error))
          }
        }).catch(error => {
          window.__issue73Errors.push(error?.message || String(error))
          updateStatus(error?.message || String(error))
        })
  `)
}

async function writeTempApp(appDir, pptxTarball) {
  await mkdir(resolve(appDir, 'src'), { recursive: true })
  await writeFile(resolve(appDir, 'package.json'), `${JSON.stringify({
    name: 'issue73-mobile-pptx-windowing',
    private: true,
    type: 'module',
    dependencies: {
      '@file-viewer/pptx': `file:${pptxTarball}`
    },
    devDependencies: {
      vite: '^7.3.0'
    }
  }, null, 2)}\n`)
  await writeFile(resolve(appDir, 'index.html'), normalizeSource(`
        <!doctype html>
        <html lang="zh-CN">
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>Issue 73 Mobile PPTX Windowing</title>
            <style>
              html,
              body,
              #app {
                width: 100%;
                height: 100%;
                margin: 0;
              }

              body {
                background: #eef2f6;
                font-family: Arial, sans-serif;
              }

              #status {
                position: fixed;
                top: 8px;
                left: 8px;
                z-index: 10;
                padding: 4px 8px;
                border-radius: 6px;
                background: rgba(17, 24, 39, .78);
                color: white;
                font-size: 12px;
              }

              #scroll {
                width: 100%;
                height: 100%;
                overflow: auto;
                box-sizing: border-box;
                padding: 28px 0;
              }

              #viewer {
                width: 100%;
                min-height: 100%;
              }
            </style>
          </head>
          <body>
            <div id="app">
              <div id="status">loading</div>
              <div id="scroll">
                <div id="viewer"></div>
              </div>
            </div>
            <script type="module" src="/src/main.js"></script>
          </body>
        </html>
  `))
  await writeFile(resolve(appDir, 'src/main.js'), createMainSource())
}

function startVite(appDir) {
  return new Promise((resolveServer, rejectServer) => {
    const child = spawn('pnpm', ['vite', '--host', '127.0.0.1', '--port', '0'], {
      cwd: appDir,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe']
    })
    let settled = false
    let output = ''
    const timer = setTimeout(() => {
      if (!settled) {
        child.kill('SIGTERM')
        rejectServer(new Error(`Timed out waiting for Vite dev server.\n${output}`))
      }
    }, timeout)

    const handleOutput = chunk => {
      output += chunk.toString()
      const match = output.match(/http:\/\/127\.0\.0\.1:(\d+)\//)
      if (match && !settled) {
        settled = true
        clearTimeout(timer)
        resolveServer({ child, url: `http://127.0.0.1:${match[1]}/` })
      }
    }

    child.stdout?.on('data', handleOutput)
    child.stderr?.on('data', handleOutput)
    child.once('error', error => {
      if (!settled) {
        settled = true
        clearTimeout(timer)
        rejectServer(error)
      }
    })
    child.once('close', code => {
      if (!settled) {
        settled = true
        clearTimeout(timer)
        rejectServer(new Error(`Vite exited with ${code} before becoming ready.\n${output}`))
      }
    })
  })
}

async function assertWindowedStats(page, label, expectedPredicate) {
  const stats = await page.evaluate(labelToRecord => window.__issue73RecordStats(labelToRecord), label)
  if (stats.slots !== slideCount) {
    fail(`${label}: expected ${slideCount} slide slots, got ${stats.slots}. Stats: ${JSON.stringify(stats)}`)
  }
  if (stats.liveSlides > maxLiveSlides) {
    fail(`${label}: expected at most ${maxLiveSlides} live slides, got ${stats.liveSlides}. Stats: ${JSON.stringify(stats)}`)
  }
  if (stats.renderState !== 'ready') {
    fail(`${label}: expected ready render state, got ${stats.renderState}. Stats: ${JSON.stringify(stats)}`)
  }
  if (!expectedPredicate(stats)) {
    fail(`${label}: unexpected live slide window. Stats: ${JSON.stringify(stats)}`)
  }
  console.log(`[issue73-mobile-pptx-windowing] ${label}: ${JSON.stringify(stats)}`)
}

async function main() {
  const tempRoot = await mkdtemp(resolve(tmpdir(), 'file-viewer-issue73-'))
  const packDir = resolve(tempRoot, 'pack')
  const appDir = resolve(tempRoot, 'app')
  let server
  let browser

  try {
    const pptxTarball = await packPptxPackage(packDir)
    await writeTempApp(appDir, pptxTarball)
    console.log('[issue73-mobile-pptx-windowing] Installing fresh temp Vite app')
    await spawnCommand('pnpm', ['install', '--ignore-scripts'], { cwd: appDir, pipe: true })
    server = await startVite(appDir)

    const playwright = await importPlaywright()
    const { chromium, devices } = playwright.default || playwright
    browser = await chromium.launch()
    const context = await browser.newContext({
      ...devices['iPhone 13'],
      viewport: { width: 390, height: 844 }
    })
    const page = await context.newPage()
    const pageErrors = []
    page.on('pageerror', error => pageErrors.push(error.message))
    page.on('console', message => {
      if (message.type() === 'error') {
        pageErrors.push(message.text())
      }
    })

    await page.goto(server.url, { waitUntil: 'domcontentloaded', timeout })
    await page.waitForFunction(() => window.__issue73Done === true, null, { timeout })

    const runtimeErrors = await page.evaluate(() => window.__issue73Errors || [])
    if (runtimeErrors.length || pageErrors.length) {
      fail(`Browser reported errors: ${JSON.stringify({ runtimeErrors, pageErrors })}`)
    }

    await assertWindowedStats(page, 'top', stats =>
      stats.slideNumbers.includes(1) && stats.slideNumbers.some(number => number >= 4)
    )

    await page.locator('#scroll').evaluate(element => {
      element.scrollTop = element.scrollHeight / 2
    })
    await page.waitForTimeout(350)
    await assertWindowedStats(page, 'middle', stats =>
      stats.slideNumbers.includes(1) && stats.slideNumbers.some(number => number >= 30 && number <= 55)
    )

    await page.locator('#scroll').evaluate(element => {
      element.scrollTop = element.scrollHeight
    })
    await page.waitForTimeout(350)
    await assertWindowedStats(page, 'bottom', stats =>
      stats.slideNumbers.includes(1) && stats.slideNumbers.some(number => number >= slideCount - 6)
    )

    console.log('[issue73-mobile-pptx-windowing] Passed')
  } finally {
    await browser?.close().catch(() => {})
    server?.child?.kill('SIGTERM')
    if (!keepTemp) {
      await rm(tempRoot, { recursive: true, force: true })
    } else {
      console.log(`[issue73-mobile-pptx-windowing] Keeping temp directory: ${tempRoot}`)
    }
  }
}

main().catch(error => {
  fail(error instanceof Error ? error.stack || error.message : String(error))
})
