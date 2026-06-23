import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { basename, dirname, isAbsolute, join, resolve } from 'node:path'
import { brotliCompressSync, gzipSync } from 'node:zlib'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const outputDir = resolveOutputDir(
  process.env.DEMO_OUTPUT_DIR || process.env.CLOUDFLARE_PAGES_OUTPUT_DIR || 'apps/viewer-demo/dist'
)
const assetsDir = join(outputDir, 'assets')

const htmlEntries = {
  'index.html': {
    label: 'main demo',
    maxScriptRawBytes: 160_000,
    maxScriptGzipBytes: 55_000,
    maxScriptBrotliBytes: 50_000,
    maxStyleRawBytes: 100_000,
    maxStyleGzipBytes: 30_000,
    maxStyleBrotliBytes: 25_000
  },
  'compare.html': {
    label: 'compare demo',
    maxScriptRawBytes: 60_000,
    maxScriptGzipBytes: 25_000,
    maxScriptBrotliBytes: 20_000,
    maxStyleRawBytes: 60_000,
    maxStyleGzipBytes: 20_000,
    maxStyleBrotliBytes: 16_000
  }
}

const heavyRendererGroups = [
  { id: 'pdf', pattern: /^pdf-|pdfjs/i },
  { id: 'word', pattern: /^(?:wordDoc|wordDocx|docx-preview|RTFJS)/i },
  { id: 'spreadsheet', pattern: /^spreadsheet-|xlsx|excel/i },
  { id: 'presentation', pattern: /^pptx(?:\.worker)?-|presentation/i },
  { id: 'ofd', pattern: /^ofd-/i },
  { id: 'typst', pattern: /^(?:typst|compiler|renderer|global-compiler|global-renderer)-/i },
  { id: 'cad', pattern: /^cad-/i },
  { id: 'archive', pattern: /^(?:archive|libarchive)-/i },
  { id: 'drawing', pattern: /^(?:drawing|mermaid-parser|prod)-|excalidraw/i },
  {
    id: 'model',
    pattern:
      /^(?:model|three\.module|GLTFLoader|FBXLoader|OBJLoader|STLLoader|PLYLoader|ColladaLoader|3MFLoader|AMFLoader|KMZLoader|PCDLoader|TDSLoader|USDLoader|VRMLLoader|VTKLoader|XYZLoader)-/i
  },
  { id: 'mindmap', pattern: /^xmind-|mindmap-/i },
  { id: 'geo', pattern: /^(?:geo|togeojson)-|shp/i },
  { id: 'email', pattern: /^(?:email|postal-mime)-/i },
  { id: 'ebook', pattern: /^epub-/i },
  { id: 'text', pattern: /^(?:code|markdown)-|highlight|marked/i },
  { id: 'media', pattern: /^(?:audio|video|hls|Midi)-/i },
  { id: 'image', pattern: /^(?:image|heic2any)-/i },
  { id: 'data', pattern: /^data-/i },
  { id: 'eda', pattern: /^eda-/i },
  { id: 'umd', pattern: /^umd-/i }
]

const presetBundleBudgets = [
  {
    id: 'lite',
    label: 'lite preset async renderer chunks',
    groups: ['text', 'image', 'media'],
    maxRawBytes: 2_500_000,
    maxGzipBytes: 700_000,
    maxBrotliBytes: 560_000
  },
  {
    id: 'office',
    label: 'office preset async renderer chunks',
    groups: ['pdf', 'word', 'spreadsheet', 'presentation', 'ofd'],
    maxRawBytes: 4_700_000,
    maxGzipBytes: 1_650_000,
    maxBrotliBytes: 800_000
  },
  {
    id: 'engineering',
    label: 'engineering preset async renderer chunks',
    groups: ['cad', 'model', 'drawing', 'mindmap', 'geo', 'typst', 'archive', 'data', 'eda'],
    maxRawBytes: 3_000_000,
    maxGzipBytes: 850_000,
    maxBrotliBytes: 750_000
  },
  {
    id: 'all',
    label: 'all preset async renderer chunks',
    groups: heavyRendererGroups.map((group) => group.id),
    maxRawBytes: 10_000_000,
    maxGzipBytes: 3_300_000,
    maxBrotliBytes: 2_100_000
  }
]

const deniedEntryMarkers = [
  'pdfjs-dist',
  '@file-viewer/docx',
  '@flyfish-dev/cad-viewer',
  'libarchive.js',
  '@myriaddreamin/typst',
  'docx-preview',
  'RTFJS',
  'heic2any',
  'hls.js',
  'three',
  'epubjs',
  'postal-mime',
  '@ljheee/xmind-parser',
  'shpjs'
]

function resolveOutputDir(value) {
  return isAbsolute(value) ? value : resolve(root, value)
}

function fail(message) {
  console.error(`[bundle-budget] ${message}`)
  process.exit(1)
}

function assertFile(filePath, label = filePath) {
  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    fail(`Missing ${label}. Run pnpm build-only before verifying bundle budgets.`)
  }
}

function assertDirectory(dirPath, label = dirPath) {
  if (!existsSync(dirPath) || !statSync(dirPath).isDirectory()) {
    fail(`Missing ${label}. Run pnpm build-only before verifying bundle budgets.`)
  }
}

function readAsset(filePath) {
  assertFile(filePath)
  const source = readFileSync(filePath)
  return {
    rawBytes: source.length,
    gzipBytes: gzipSync(source).length,
    brotliBytes: brotliCompressSync(source).length,
    text: source.toString('utf8')
  }
}

function formatBytes(value) {
  if (value < 1024) {
    return `${value} B`
  }
  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KiB`
  }
  return `${(value / 1024 / 1024).toFixed(2)} MiB`
}

function readText(filePath) {
  assertFile(filePath)
  return readFileSync(filePath, 'utf8')
}

function stripQuery(value) {
  return value.split(/[?#]/)[0]
}

function resolveHtmlReference(htmlFile, reference) {
  const normalized = stripQuery(reference)
  if (/^(https?:)?\/\//.test(normalized) || normalized.startsWith('data:')) {
    return null
  }
  const baseDir = dirname(htmlFile)
  return normalized.startsWith('/')
    ? join(outputDir, normalized.slice(1))
    : resolve(baseDir, normalized)
}

function collectTags(html, tagName) {
  return html.match(new RegExp(`<${tagName}\\b[^>]*>`, 'gi')) || []
}

function readAttribute(tag, name) {
  const match = tag.match(new RegExp(`\\b${name}=["']([^"']+)["']`, 'i'))
  return match ? match[1] : null
}

function collectEntryAssets(htmlFile, html) {
  const scripts = collectTags(html, 'script')
    .filter((tag) => readAttribute(tag, 'type') === 'module')
    .map((tag) => readAttribute(tag, 'src'))
    .filter(Boolean)
    .map((reference) => resolveHtmlReference(htmlFile, reference))
    .filter(Boolean)

  const styles = collectTags(html, 'link')
    .filter((tag) => readAttribute(tag, 'rel') === 'stylesheet')
    .map((tag) => readAttribute(tag, 'href'))
    .filter(Boolean)
    .map((reference) => resolveHtmlReference(htmlFile, reference))
    .filter(Boolean)

  return { scripts, styles }
}

function assertBudget(label, metric, value, max) {
  if (value > max) {
    fail(`${label} ${metric} ${formatBytes(value)} exceeds budget ${formatBytes(max)}`)
  }
}

function summarizeAssets(assetPaths) {
  const assets = assetPaths.map((filePath) => ({
    filePath,
    name: basename(filePath),
    ...readAsset(filePath)
  }))

  return {
    assets,
    rawBytes: assets.reduce((sum, asset) => sum + asset.rawBytes, 0),
    gzipBytes: assets.reduce((sum, asset) => sum + asset.gzipBytes, 0),
    brotliBytes: assets.reduce((sum, asset) => sum + asset.brotliBytes, 0)
  }
}

function summarizeJsFiles(files) {
  return summarizeAssets(files.map((file) => join(assetsDir, file)))
}

function verifyEntry(entryName, budget) {
  const htmlFile = join(outputDir, entryName)
  const html = readText(htmlFile)
  const { scripts, styles } = collectEntryAssets(htmlFile, html)

  if (scripts.length !== 1) {
    fail(`${entryName} must reference exactly one module entry script, found ${scripts.length}`)
  }

  const scriptSummary = summarizeAssets(scripts)
  const styleSummary = summarizeAssets(styles)
  const scriptNames = scriptSummary.assets.map((asset) => asset.name).join(', ')

  for (const asset of scriptSummary.assets) {
    for (const marker of deniedEntryMarkers) {
      if (asset.text.includes(marker)) {
        fail(`${budget.label} entry script ${asset.name} contains heavy renderer marker ${marker}`)
      }
    }

    for (const group of heavyRendererGroups) {
      if (group.pattern.test(asset.name)) {
        fail(`${budget.label} directly loads heavy renderer chunk ${asset.name}`)
      }
    }
  }

  assertBudget(budget.label, 'entry JS raw size', scriptSummary.rawBytes, budget.maxScriptRawBytes)
  assertBudget(
    budget.label,
    'entry JS gzip size',
    scriptSummary.gzipBytes,
    budget.maxScriptGzipBytes
  )
  assertBudget(
    budget.label,
    'entry JS brotli size',
    scriptSummary.brotliBytes,
    budget.maxScriptBrotliBytes
  )
  assertBudget(budget.label, 'entry CSS raw size', styleSummary.rawBytes, budget.maxStyleRawBytes)
  assertBudget(
    budget.label,
    'entry CSS gzip size',
    styleSummary.gzipBytes,
    budget.maxStyleGzipBytes
  )
  assertBudget(
    budget.label,
    'entry CSS brotli size',
    styleSummary.brotliBytes,
    budget.maxStyleBrotliBytes
  )

  return {
    label: budget.label,
    scriptNames,
    scriptRawBytes: scriptSummary.rawBytes,
    scriptGzipBytes: scriptSummary.gzipBytes,
    scriptBrotliBytes: scriptSummary.brotliBytes,
    styleRawBytes: styleSummary.rawBytes,
    styleGzipBytes: styleSummary.gzipBytes,
    styleBrotliBytes: styleSummary.brotliBytes
  }
}

function verifyHeavyRendererChunks() {
  assertDirectory(assetsDir, 'demo assets directory')
  const jsFiles = readdirSync(assetsDir).filter((file) => file.endsWith('.js'))
  const missingGroups = heavyRendererGroups
    .filter((group) => !jsFiles.some((file) => group.pattern.test(file)))
    .map((group) => group.id)

  if (missingGroups.length) {
    fail(`Missing expected async renderer chunks: ${missingGroups.join(', ')}`)
  }

  return heavyRendererGroups.map((group) => {
    const files = jsFiles.filter((file) => group.pattern.test(file)).sort()
    return {
      id: group.id,
      files,
      ...summarizeJsFiles(files)
    }
  })
}

function verifyPresetBundleBudgets(groupReports) {
  const groupById = new Map(groupReports.map((group) => [group.id, group]))

  return presetBundleBudgets.map((budget) => {
    const missingGroups = budget.groups.filter((groupId) => !groupById.has(groupId))
    if (missingGroups.length) {
      fail(`${budget.label} references unknown renderer groups: ${missingGroups.join(', ')}`)
    }

    const assets = budget.groups.flatMap((groupId) => groupById.get(groupId).assets)
    const rawBytes = assets.reduce((sum, asset) => sum + asset.rawBytes, 0)
    const gzipBytes = assets.reduce((sum, asset) => sum + asset.gzipBytes, 0)
    const brotliBytes = assets.reduce((sum, asset) => sum + asset.brotliBytes, 0)
    const chunkCount = assets.length

    if (!chunkCount) {
      fail(`${budget.label} did not match any async renderer chunks`)
    }

    assertBudget(budget.label, 'raw size', rawBytes, budget.maxRawBytes)
    assertBudget(budget.label, 'gzip size', gzipBytes, budget.maxGzipBytes)
    assertBudget(budget.label, 'brotli size', brotliBytes, budget.maxBrotliBytes)

    return {
      id: budget.id,
      label: budget.label,
      groups: budget.groups,
      chunkCount,
      rawBytes,
      gzipBytes,
      brotliBytes
    }
  })
}

const entryReports = Object.entries(htmlEntries).map(([entryName, budget]) =>
  verifyEntry(entryName, budget)
)
const rendererReports = verifyHeavyRendererChunks()
const presetReports = verifyPresetBundleBudgets(rendererReports)

console.log('[bundle-budget] Entry budgets')
for (const report of entryReports) {
  console.log(
    `  - ${report.label}: JS ${formatBytes(report.scriptRawBytes)} raw / ${formatBytes(report.scriptGzipBytes)} gzip / ${formatBytes(report.scriptBrotliBytes)} br, CSS ${formatBytes(report.styleRawBytes)} raw / ${formatBytes(report.styleGzipBytes)} gzip / ${formatBytes(report.styleBrotliBytes)} br (${report.scriptNames})`
  )
}

console.log('[bundle-budget] Async renderer chunks')
for (const report of rendererReports) {
  console.log(
    `  - ${report.id}: ${report.files.length} chunks, ${formatBytes(report.rawBytes)} raw / ${formatBytes(report.gzipBytes)} gzip / ${formatBytes(report.brotliBytes)} br`
  )
}

console.log('[bundle-budget] Preset async renderer budgets')
for (const report of presetReports) {
  console.log(
    `  - ${report.id}: ${report.chunkCount} chunks across ${report.groups.join(', ')}, ${formatBytes(report.rawBytes)} raw / ${formatBytes(report.gzipBytes)} gzip / ${formatBytes(report.brotliBytes)} br`
  )
}
