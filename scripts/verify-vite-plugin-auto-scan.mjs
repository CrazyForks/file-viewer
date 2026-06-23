import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const pluginDist = resolve(root, 'packages/presets/vite-plugin/dist/index.js')

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

assert(
  existsSync(pluginDist),
  'packages/presets/vite-plugin/dist/index.js is missing; run pnpm --filter @file-viewer/vite-plugin build first.'
)

const plugin = await import(`${pathToFileURL(pluginDist).href}?t=${Date.now()}`)
const {
  collectFileViewerRendererScanTokens,
  extractFileViewerRendererHintTokens,
  fileViewerRenderers,
  resolveFileViewerRendererSelection
} = plugin

const inlineTokens = extractFileViewerRendererHintTokens(`
  export const fileViewerFormats = ['pdf', 'docx', 'dwg']
  const upload = '<input accept=".xlsx,image/*,application/vnd.ms-powerpoint">'
  // file-viewer-formats: typst zip xmind
  <div data-file-viewer-renderers="geo,eda"></div>
`)

for (const token of ['pdf', 'docx', 'dwg', 'xlsx', 'image', 'ppt', 'typst', 'zip', 'xmind', 'geo', 'eda']) {
  assert(inlineTokens.includes(token), `inline hint extraction missed ${token}`)
}

const tempRoot = await mkdtemp(join(tmpdir(), 'file-viewer-vite-scan-'))
try {
  await mkdir(join(tempRoot, 'src'), { recursive: true })
  await writeFile(
    join(tempRoot, 'src/App.vue'),
    [
      '<template>',
      '  <input data-file-viewer-formats="pdf,docx,dwf,step" accept=".xlsx,.xmind,.brep" />',
      '</template>',
      '<script setup lang="ts">',
      "const fileViewerRenderers = ['cad', 'typst']",
      '</script>',
      ''
    ].join('\n')
  )
  await writeFile(
    join(tempRoot, 'src/upload.ts'),
    [
      "export const fileViewerFormats = ['eml', 'epub', 'geojson']",
      '// file-viewer-formats: gds oas parquet',
      ''
    ].join('\n')
  )

  const scanTokens = collectFileViewerRendererScanTokens(tempRoot, true)
  for (const token of ['pdf', 'docx', 'dwf', 'step', 'xlsx', 'xmind', 'brep', 'cad', 'typst', 'eml', 'epub', 'geojson', 'gds', 'oas', 'parquet']) {
    assert(scanTokens.includes(token), `source scan missed ${token}`)
  }

  const selection = resolveFileViewerRendererSelection({ scan: true }, tempRoot)
  const packages = new Set(selection.renderers.map(renderer => renderer.packageName))
  for (const packageName of [
    '@file-viewer/renderer-pdf',
    '@file-viewer/renderer-word',
    '@file-viewer/renderer-spreadsheet',
    '@file-viewer/renderer-cad',
    '@file-viewer/renderer-3d',
    '@file-viewer/renderer-typst',
    '@file-viewer/renderer-mindmap',
    '@file-viewer/renderer-email',
    '@file-viewer/renderer-ebook',
    '@file-viewer/renderer-geo',
    '@file-viewer/renderer-eda',
    '@file-viewer/renderer-data'
  ]) {
    assert(packages.has(packageName), `auto scan did not select ${packageName}`)
  }

  const officePresetSelection = resolveFileViewerRendererSelection(
    { preset: 'office', formats: ['dwg'] },
    tempRoot
  )
  assert(
    officePresetSelection.presetPackage === '@file-viewer/preset-office',
    'office preset did not resolve to @file-viewer/preset-office'
  )
  assert(
    officePresetSelection.packages.includes('@file-viewer/preset-office'),
    'office preset package is missing from the renderer plan'
  )
  assert(
    officePresetSelection.packages.includes('@file-viewer/renderer-cad'),
    'office preset should allow additional explicit renderer packages'
  )
  for (const rendererId of ['pdf', 'office-word-openxml', 'spreadsheet-openxml', 'cad']) {
    assert(
      officePresetSelection.rendererIds.includes(rendererId),
      `office preset selection missed renderer id ${rendererId}`
    )
  }

  const officePlugin = fileViewerRenderers({ preset: 'office', formats: ['dwg'] })
  await officePlugin.buildStart?.()
  const officeModuleId = officePlugin.resolveId?.('virtual:file-viewer-renderers')
  assert(typeof officeModuleId === 'string', 'office preset virtual module did not resolve')
  const officeVirtualCode = await officePlugin.load?.(officeModuleId)
  assert(
    officeVirtualCode.includes("@file-viewer/preset-office"),
    'office preset virtual module must import @file-viewer/preset-office'
  )
  assert(
    officeVirtualCode.includes("@file-viewer/renderer-cad"),
    'office preset virtual module must import explicitly added CAD renderer'
  )
  assert(
    !officeVirtualCode.includes("import { pdfRenderer"),
    'office preset virtual module must not re-import renderer packages covered by the preset'
  )
} finally {
  await rm(tempRoot, { recursive: true, force: true })
}

console.log('[vite-plugin-auto-scan] Verified source hint scanning and renderer selection.')
