import { existsSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

const outputDir = resolve(process.env.ADAPTER_DEMO_OUTPUT_DIR || 'packages/demo/dist')
const requiredFiles = [
  'index.html',
  'jquery.html',
  'manual-js.html',
  'manual-iife.html',
  'svelte-action.html',
  'example/preview.md',
  'example/word.docx',
  'file-viewer/index.html',
  'vendor/file-viewer/index.html',
  'vendor/file-viewer-web/index.js',
  'vendor/file-viewer-web/flyfish-file-viewer-web.iife.js'
]

const fail = message => {
  console.error(`[adapter-demo-output] ${message}`)
  process.exit(1)
}

const assertFile = relativePath => {
  const filePath = join(outputDir, relativePath)
  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    fail(`Missing required file: ${filePath}`)
  }
  return filePath
}

const assertNotHtmlFallback = relativePath => {
  const filePath = assertFile(relativePath)
  const head = readFileSync(filePath, 'utf8').slice(0, 120).trimStart().toLowerCase()
  if (head.startsWith('<!doctype html') || head.startsWith('<html')) {
    fail(`${relativePath} resolved to HTML; static asset serving would fail in browsers.`)
  }
}

for (const requiredFile of requiredFiles) {
  assertFile(requiredFile)
}

const manualIifeHtml = readFileSync(join(outputDir, 'manual-iife.html'), 'utf8')
if (!manualIifeHtml.includes('/vendor/file-viewer-web/flyfish-file-viewer-web.iife.js')) {
  fail('manual-iife.html does not reference the browser global helper bundle.')
}
if (!manualIifeHtml.includes('window.FlyfishFileViewerWeb')) {
  fail('manual-iife.html does not use the browser global API.')
}
if (!manualIifeHtml.includes('/example/preview.md')) {
  fail('manual-iife.html does not use the lightweight markdown smoke sample.')
}

const iifeBundle = readFileSync(join(outputDir, 'vendor/file-viewer-web/flyfish-file-viewer-web.iife.js'), 'utf8')
for (const requiredExport of ['FlyfishFileViewerWeb', 'mountViewer', 'mountViewerFrame']) {
  if (!iifeBundle.includes(requiredExport)) {
    fail(`IIFE helper bundle is missing ${requiredExport}.`)
  }
}

assertNotHtmlFallback('vendor/file-viewer-web/index.js')
assertNotHtmlFallback('vendor/file-viewer-web/flyfish-file-viewer-web.iife.js')

console.log(`[adapter-demo-output] Verified adapter demo output in ${outputDir}`)
