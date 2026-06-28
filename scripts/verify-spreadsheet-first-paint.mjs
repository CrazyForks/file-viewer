import { createReadStream, existsSync, mkdirSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { createRequire } from 'node:module'
import { delimiter, extname, join, normalize, relative, resolve, sep } from 'node:path'
import { pathToFileURL } from 'node:url'

const outputDir = resolve(process.env.DEMO_OUTPUT_DIR || 'apps/viewer-demo/dist')
const timeout = Number(process.env.SPREADSHEET_FIRST_PAINT_TIMEOUT || 45000)
const samplePath = '/example/spreadsheet-first-paint-minimal.xlsx'
const screenshotDir = resolve('output/playwright')
const require = createRequire(import.meta.url)

const mimeTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml; charset=utf-8'],
  ['.wasm', 'application/wasm'],
  ['.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
])

const fail = message => {
  console.error(`[spreadsheet-first-paint] ${message}`)
  process.exit(1)
}

const createMinimalWorkbook = () => {
  const spreadsheetRequire = createRequire(resolve('packages/renderers/spreadsheet/package.json'))
  const xlsx = spreadsheetRequire('styled-exceljs')
  const data = [
    ['部门', '用户名', '密码', '手机号', '邮箱', '启用'],
    ['研发部', 'lxy', '123456', '13212345678', '132@qq.com', '是'],
  ]
  const sheet = xlsx.utils.aoa_to_sheet(data)
  const workbook = xlsx.utils.book_new()
  xlsx.utils.book_append_sheet(workbook, sheet, 'Sheet1')
  return xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' })
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
      'Run with: npm exec --yes --package playwright -- node scripts/verify-spreadsheet-first-paint.mjs',
      `Original error: ${error instanceof Error ? error.message : String(error)}`,
    ].join('\n'))
  }
}

const assertBuildOutput = () => {
  const filePath = join(outputDir, 'index.html')
  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    fail(`Missing demo build output ${filePath}. Run pnpm build-only first.`)
  }
}

const startStaticServer = async () => {
  assertBuildOutput()
  const workbook = createMinimalWorkbook()

  const server = createServer((request, response) => {
    const requestUrl = new URL(request.url || '/', 'http://127.0.0.1')
    if (requestUrl.pathname === samplePath) {
      response.writeHead(200, {
        'Content-Type': mimeTypes.get('.xlsx'),
        'Content-Length': String(workbook.length),
      })
      response.end(workbook)
      return
    }

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
      'Content-Type': mimeTypes.get(extname(filePath).toLowerCase()) || 'application/octet-stream',
    })
    createReadStream(filePath).pipe(response)
  })

  await new Promise((resolveServer, rejectServer) => {
    server.once('error', rejectServer)
    server.listen(0, '127.0.0.1', resolveServer)
  })

  const address = server.address()
  if (!address || typeof address === 'string') {
    fail('Unable to resolve spreadsheet first-paint server address.')
  }

  return {
    server,
    url: `http://127.0.0.1:${address.port}`,
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

const waitForSpreadsheetReady = async page => {
  await page.waitForSelector('.excel-wrapper canvas', { timeout })
  await page.waitForFunction(
    () => !document.querySelector('.excel-wrapper .loading:not(.hidden), .sheet-loading:not(.hidden)'),
    undefined,
    { timeout }
  )
  await page.waitForTimeout(900)
}

const measureSpreadsheetFirstPaint = async page => page.evaluate(() => {
  const canvas = document.querySelector('.excel-wrapper canvas')
  if (!(canvas instanceof HTMLCanvasElement)) {
    return {
      ok: false,
      reason: 'missing spreadsheet canvas',
    }
  }

  const context = canvas.getContext('2d')
  if (!context) {
    return {
      ok: false,
      reason: 'missing 2d canvas context',
    }
  }

  const region = {
    x: 95,
    y: 40,
    width: Math.max(0, Math.min(500, canvas.width - 95)),
    height: Math.max(0, Math.min(120, canvas.height - 40)),
  }
  const pixels = context.getImageData(region.x, region.y, region.width, region.height).data
  let textInkPixels = 0
  for (let index = 0; index < pixels.length; index += 4) {
    const red = pixels[index]
    const green = pixels[index + 1]
    const blue = pixels[index + 2]
    const alpha = pixels[index + 3]
    if (alpha && red < 170 && green < 170 && blue < 170) {
      textInkPixels += 1
    }
  }

  const stage = document.querySelector('.e-virt-table-stage')
  const stageRect = stage instanceof HTMLElement ? stage.getBoundingClientRect() : null
  const summary = document.querySelector('.excel-wrapper .summary')?.textContent || ''

  return {
    ok: canvas.width >= 360 &&
      canvas.height >= 240 &&
      textInkPixels >= 450 &&
      /2 rows,\s*6 columns|2 行，6 列/.test(summary),
    canvas: {
      width: canvas.width,
      height: canvas.height,
    },
    region,
    stage: stageRect
      ? {
          width: Math.round(stageRect.width),
          height: Math.round(stageRect.height),
        }
      : null,
    summary,
    textInkPixels,
  }
})

const verifyMode = async ({ browser, baseUrl, mode }) => {
  const page = await browser.newPage({
    viewport: {
      width: 1020,
      height: 730,
    },
    deviceScaleFactor: 1,
  })
  const failures = []

  page.on('pageerror', error => {
    failures.push(`pageerror: ${error.message}`)
  })
  page.on('console', message => {
    if (message.type() === 'error') {
      failures.push(`console.error: ${message.text()}`)
    }
  })

  if (mode === 'delayed-layout') {
    await page.addInitScript(() => {
      const installHiddenStyle = () => {
        const root = document.documentElement || document.head
        if (!root) {
          window.requestAnimationFrame(installHiddenStyle)
          return
        }

        const style = document.createElement('style')
        style.textContent = '.file-viewer{display:none!important}'
        root.appendChild(style)
        window.setTimeout(() => style.remove(), 800)
      }

      installHiddenStyle()
    })
  }

  const url = new URL(`${baseUrl}/index.html`)
  url.searchParams.set('url', samplePath)
  url.searchParams.set('smoke', `spreadsheet-first-paint-${mode}`)

  try {
    await page.goto(url.href, {
      waitUntil: 'domcontentloaded',
      timeout,
    })
    await waitForSpreadsheetReady(page)
    const result = await measureSpreadsheetFirstPaint(page)
    mkdirSync(screenshotDir, { recursive: true })
    await page.screenshot({
      path: join(screenshotDir, `spreadsheet-first-paint-${mode}.png`),
      fullPage: true,
    })

    if (!result.ok || failures.length) {
      throw new Error(JSON.stringify({ result, failures }, null, 2))
    }

    console.log(
      `[spreadsheet-first-paint] ${mode}: ${result.textInkPixels} text ink pixels, ` +
      `${result.canvas.width}x${result.canvas.height} canvas.`
    )
  } finally {
    await page.close()
  }
}

const run = async () => {
  const playwrightModule = await importPlaywright()
  const { chromium } = playwrightModule.chromium ? playwrightModule : playwrightModule.default
  const serverHandle = await startStaticServer()
  const browser = await launchChromium(chromium)

  try {
    await verifyMode({ browser, baseUrl: serverHandle.url, mode: 'visible' })
    await verifyMode({ browser, baseUrl: serverHandle.url, mode: 'delayed-layout' })
  } finally {
    await browser.close()
    await new Promise(resolveClose => serverHandle.server.close(resolveClose))
  }

  console.log(`[spreadsheet-first-paint] Verified minimal spreadsheet first paint at ${serverHandle.url}`)
}

run().catch(error => {
  fail(error instanceof Error ? error.message : String(error))
})
