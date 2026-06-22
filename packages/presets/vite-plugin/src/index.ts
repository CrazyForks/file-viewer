import { existsSync } from 'node:fs'
import { copyFile, cp, mkdir, rm, stat, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, isAbsolute, join, resolve } from 'node:path'
import type { Plugin, ResolvedConfig, UserConfig } from 'vite'

export type FileViewerVitePreset = 'all' | 'lite' | 'engineering'
export type FileViewerMissingRendererMode = 'error' | 'warn' | 'ignore'
export type FileViewerChunkStrategy = 'renderer' | 'none'

export interface FileViewerCopyAssetsOptions {
  /**
   * Directory used by Vite dev. Defaults to config.publicDir.
   */
  publicDir?: string
  /**
   * Directory used after production build. Defaults to build.outDir.
   */
  outDir?: string
  /**
   * Copy during dev server startup, build closeBundle, or both.
   */
  mode?: 'dev' | 'build' | 'both'
}

export interface FileViewerRenderersPluginOptions {
  /**
   * File extensions or renderer ids. Examples: pdf, .dwg, typst, zip, xmind.
   */
  formats?: readonly string[]
  /**
   * Explicit renderer ids. Useful when several extensions share one renderer.
   */
  renderers?: readonly string[]
  /**
   * `all` imports @file-viewer/preset-all. `lite` and `engineering` expand to
   * already extracted renderer packages and remain tree-shakeable.
   */
  preset?: FileViewerVitePreset
  /**
   * Virtual module id consumed by application code.
   */
  moduleId?: string
  /**
   * Controls how planned-but-not-yet-extracted renderer lines are reported.
   */
  missingRenderer?: FileViewerMissingRendererMode
  /**
   * Adds renderer-oriented manualChunks when the user did not define one.
   */
  chunkStrategy?: FileViewerChunkStrategy
  /**
   * Copies known worker/WASM/vendor assets for selected renderer lines.
   */
  copyAssets?: boolean | FileViewerCopyAssetsOptions
}

interface RendererModuleDescriptor {
  id: string
  packageName: string
  exportName: string
  formats: readonly string[]
  rendererIds: readonly string[]
  chunkName: string
}

interface PlannedRendererDescriptor {
  id: string
  targetPackage: string
  formats: readonly string[]
  note: string
}

interface MissingRendererNotice {
  format: string
  targetPackage?: string
  note: string
}

interface RendererSelection {
  preset: FileViewerVitePreset | null
  descriptors: RendererModuleDescriptor[]
  missing: MissingRendererNotice[]
}

interface AssetCopyResult {
  rendererId: string
  id: string
  to: string
  copied: boolean
  reason?: string
}

const virtualModuleId = 'virtual:file-viewer-renderers'
const resolvedVirtualModuleId = `\0${virtualModuleId}`
const pluginRequire = createRequire(import.meta.url)

const rendererModules: readonly RendererModuleDescriptor[] = [
  {
    id: 'pdf',
    packageName: '@file-viewer/renderer-pdf',
    exportName: 'pdfRenderer',
    formats: ['pdf'],
    rendererIds: ['pdf'],
    chunkName: 'file-viewer-pdf'
  },
  {
    id: 'ofd',
    packageName: '@file-viewer/renderer-ofd',
    exportName: 'ofdRenderer',
    formats: ['ofd'],
    rendererIds: ['ofd'],
    chunkName: 'file-viewer-ofd'
  },
  {
    id: 'cad',
    packageName: '@file-viewer/renderer-cad',
    exportName: 'cadRenderer',
    formats: ['cad', 'dwg', 'dxf', 'dwf', 'dwfx', 'xps'],
    rendererIds: ['cad'],
    chunkName: 'file-viewer-cad'
  },
  {
    id: 'typst',
    packageName: '@file-viewer/renderer-typst',
    exportName: 'typstRenderer',
    formats: ['typ', 'typst'],
    rendererIds: ['typst'],
    chunkName: 'file-viewer-typst'
  },
  {
    id: 'presentation',
    packageName: '@file-viewer/renderer-presentation',
    exportName: 'presentationRenderer',
    formats: ['presentation', 'pptx', 'pptm', 'potx', 'potm', 'ppsx', 'ppsm'],
    rendererIds: ['office-presentation'],
    chunkName: 'file-viewer-presentation'
  },
  {
    id: 'word',
    packageName: '@file-viewer/renderer-word',
    exportName: 'wordRenderer',
    formats: ['word', 'doc', 'docx', 'docm', 'dot', 'dotx', 'dotm', 'odt', 'odp', 'rtf'],
    rendererIds: ['office-word-openxml', 'office-word-binary', 'open-document'],
    chunkName: 'file-viewer-word'
  },
  {
    id: 'drawing',
    packageName: '@file-viewer/renderer-drawing',
    exportName: 'drawingRenderer',
    formats: ['drawing', 'drawio', 'dio', 'excalidraw'],
    rendererIds: ['drawing'],
    chunkName: 'file-viewer-drawing'
  },
  {
    id: 'model',
    packageName: '@file-viewer/renderer-3d',
    exportName: 'modelRenderer',
    formats: [
      '3d',
      'model',
      'stl',
      'obj',
      'gltf',
      'glb',
      'fbx',
      'dae',
      '3ds',
      '3mf',
      'amf',
      'ply',
      'pcd',
      'vrml',
      'wrl',
      'vtk',
      'vtp',
      'xyz',
      'usd',
      'usda',
      'usdc',
      'usdz',
      'kmz'
    ],
    rendererIds: ['model'],
    chunkName: 'file-viewer-3d'
  },
  {
    id: 'archive',
    packageName: '@file-viewer/renderer-archive',
    exportName: 'archiveRenderer',
    formats: ['archive', 'zip', 'rar', '7z', 'tar', 'gz', 'tgz', 'bz2', 'xz'],
    rendererIds: ['archive'],
    chunkName: 'file-viewer-archive'
  },
  {
    id: 'email',
    packageName: '@file-viewer/renderer-email',
    exportName: 'emailRenderer',
    formats: ['email', 'eml', 'msg', 'mbox'],
    rendererIds: ['email'],
    chunkName: 'file-viewer-email'
  },
  {
    id: 'ebook',
    packageName: '@file-viewer/renderer-ebook',
    exportName: 'ebookRenderer',
    formats: ['ebook', 'epub'],
    rendererIds: ['epub'],
    chunkName: 'file-viewer-ebook'
  },
  {
    id: 'text',
    packageName: '@file-viewer/renderer-text',
    exportName: 'textRenderer',
    formats: [
      'text',
      'txt',
      'log',
      'code',
      'md',
      'markdown',
      'js',
      'jsx',
      'ts',
      'tsx',
      'json',
      'jsonc',
      'json5',
      'xml',
      'yaml',
      'yml',
      'toml',
      'ini',
      'html',
      'css',
      'vue',
      'py',
      'java',
      'go',
      'rs',
      'c',
      'cpp',
      'h',
      'hpp',
      'cs',
      'php',
      'rb',
      'swift',
      'kt',
      'sh',
      'bash',
      'sql',
      'proto',
      'tex',
      'graphviz',
      'http',
      'ipynb'
    ],
    rendererIds: ['code', 'markdown'],
    chunkName: 'file-viewer-text'
  },
  {
    id: 'image',
    packageName: '@file-viewer/renderer-image',
    exportName: 'imageRenderer',
    formats: [
      'image',
      'jpg',
      'jpeg',
      'png',
      'gif',
      'webp',
      'svg',
      'bmp',
      'avif',
      'ico',
      'heic',
      'heif',
      'jxl'
    ],
    rendererIds: ['image'],
    chunkName: 'file-viewer-image'
  },
  {
    id: 'media',
    packageName: '@file-viewer/renderer-media',
    exportName: 'mediaRenderer',
    formats: [
      'media',
      'audio',
      'video',
      'mp3',
      'wav',
      'ogg',
      'flac',
      'aac',
      'm4a',
      'mp4',
      'webm',
      'mov',
      'm3u8',
      'midi',
      'mid'
    ],
    rendererIds: ['audio', 'video'],
    chunkName: 'file-viewer-media'
  },
  {
    id: 'mindmap',
    packageName: '@file-viewer/renderer-mindmap',
    exportName: 'mindmapRenderer',
    formats: ['mindmap', 'xmind'],
    rendererIds: ['mindmap'],
    chunkName: 'file-viewer-mindmap'
  },
  {
    id: 'geo',
    packageName: '@file-viewer/renderer-geo',
    exportName: 'geoRenderer',
    formats: ['geo', 'geojson', 'kml', 'gpx', 'shp'],
    rendererIds: ['geo'],
    chunkName: 'file-viewer-geo'
  },
  {
    id: 'data',
    packageName: '@file-viewer/renderer-data',
    exportName: 'dataRenderer',
    formats: [
      'data',
      'data-asset',
      'sqlite',
      'db',
      'sqlite3',
      'parquet',
      'avro',
      'psd',
      'ai',
      'eps',
      'webarchive',
      'wasm',
      'ttf',
      'otf',
      'woff',
      'woff2'
    ],
    rendererIds: ['data-asset'],
    chunkName: 'file-viewer-data'
  },
  {
    id: 'eda',
    packageName: '@file-viewer/renderer-eda',
    exportName: 'edaRenderer',
    formats: ['eda', 'gds', 'oas', 'oasis', 'olb', 'dra', 'dsn'],
    rendererIds: ['eda'],
    chunkName: 'file-viewer-eda'
  }
]

const plannedRenderers: readonly PlannedRendererDescriptor[] = [
  {
    id: 'spreadsheet',
    targetPackage: '@file-viewer/renderer-spreadsheet',
    formats: ['xls', 'xlsx', 'xlsm', 'csv', 'tsv', 'ods'],
    note: 'Spreadsheet renderer is still provided by @file-viewer/core compatibility and will be split into @file-viewer/renderer-spreadsheet.'
  },
]

const descriptorsById = new Map(rendererModules.map((descriptor) => [descriptor.id, descriptor]))
const descriptorsByFormat = new Map<string, RendererModuleDescriptor>()
rendererModules.forEach((descriptor) => {
  descriptor.formats.forEach((format) => descriptorsByFormat.set(format, descriptor))
})
const plannedByFormat = new Map<string, PlannedRendererDescriptor>()
plannedRenderers.forEach((descriptor) => {
  descriptor.formats.forEach((format) => plannedByFormat.set(format, descriptor))
  plannedByFormat.set(descriptor.id, descriptor)
})

function normalizeToken(value: string) {
  return value.trim().toLowerCase().replace(/^\./, '')
}

function unique<T>(items: readonly T[]) {
  return [...new Set(items)]
}

function selectRenderers(options: FileViewerRenderersPluginOptions): RendererSelection {
  const preset = options.preset ?? null
  const selected = new Map<string, RendererModuleDescriptor>()
  const missing: MissingRendererNotice[] = []

  if (preset === 'all') {
    return { preset, descriptors: [], missing }
  }

  const presetRendererIds: Record<Exclude<FileViewerVitePreset, 'all'>, readonly string[]> = {
    lite: ['text', 'image', 'media'],
    engineering: ['cad', 'mindmap', 'geo']
  }

  ;(preset ? presetRendererIds[preset] : []).forEach((id) => {
    const descriptor = descriptorsById.get(id)
    if (descriptor) {
      selected.set(descriptor.id, descriptor)
    }
  })

  const requestedTokens = [...(options.renderers || []), ...(options.formats || [])]
    .map(normalizeToken)
    .filter(Boolean)

  requestedTokens.forEach((token) => {
    const descriptor = descriptorsById.get(token) || descriptorsByFormat.get(token)
    if (descriptor) {
      selected.set(descriptor.id, descriptor)
      return
    }

    const planned = plannedByFormat.get(token)
    if (planned) {
      missing.push({
        format: token,
        targetPackage: planned.targetPackage,
        note: planned.note
      })
      return
    }

    missing.push({
      format: token,
      note: 'No renderer mapping is registered for this format yet.'
    })
  })

  return { preset, descriptors: [...selected.values()], missing }
}

function formatMissingRendererMessage(missing: readonly MissingRendererNotice[]) {
  return [
    'Some requested File Viewer formats do not have standalone renderer packages in this workspace yet:',
    ...missing.map(
      (item) =>
        `  - ${item.format}${item.targetPackage ? ` -> ${item.targetPackage}` : ''}: ${item.note}`
    ),
    'Use @file-viewer/preset-all for full compatibility while the remaining renderer lines are extracted, or remove those formats from @file-viewer/vite-plugin.'
  ].join('\n')
}

function assertMissingRendererPolicy(
  selection: RendererSelection,
  mode: FileViewerMissingRendererMode
) {
  if (!selection.missing.length || mode === 'ignore') {
    return
  }
  const message = formatMissingRendererMessage(selection.missing)
  if (mode === 'warn') {
    console.warn(`[file-viewer:vite-plugin]\n${message}`)
    return
  }
  throw new Error(`[file-viewer:vite-plugin]\n${message}`)
}

function renderVirtualModule(selection: RendererSelection, formats: readonly string[]) {
  if (selection.preset === 'all') {
    return [
      "import { allRenderers } from '@file-viewer/preset-all';",
      '',
      'export const configuredFileViewerRenderers = allRenderers;',
      `export const fileViewerRendererPlan = ${JSON.stringify(
        {
          preset: 'all',
          formats,
          rendererIds: ['preset-all'],
          packages: ['@file-viewer/preset-all'],
          generatedBy: '@file-viewer/vite-plugin'
        },
        null,
        2
      )};`,
      'export default configuredFileViewerRenderers;',
      ''
    ].join('\n')
  }

  const imports = selection.descriptors.map(
    (descriptor, index) =>
      `import { ${descriptor.exportName} as renderer${index} } from '${descriptor.packageName}';`
  )
  const rendererNames = selection.descriptors.map((_descriptor, index) => `renderer${index}`)
  const plan = {
    preset: selection.preset,
    formats,
    rendererIds: unique(selection.descriptors.flatMap((descriptor) => descriptor.rendererIds)),
    packages: selection.descriptors.map((descriptor) => descriptor.packageName),
    generatedBy: '@file-viewer/vite-plugin'
  }

  return [
    ...imports,
    '',
    `export const configuredFileViewerRenderers = [${rendererNames.join(', ')}];`,
    `export const fileViewerRendererPlan = ${JSON.stringify(plan, null, 2)};`,
    'export default configuredFileViewerRenderers;',
    ''
  ].join('\n')
}

function hasManualChunks(config: UserConfig) {
  const output = config.build?.rollupOptions?.output
  if (Array.isArray(output)) {
    return output.some((item) => Boolean(item.manualChunks))
  }
  return Boolean(output?.manualChunks)
}

function createManualChunks(selection: RendererSelection) {
  const descriptors = selection.preset === 'all' ? rendererModules : selection.descriptors
  const packageToChunk = new Map<string, string>()
  descriptors.forEach((descriptor) => {
    packageToChunk.set(descriptor.packageName, descriptor.chunkName)
  })
  packageToChunk.set('@file-viewer/preset-all', 'file-viewer-preset-all')

  return (id: string) => {
    const normalized = id.replace(/\\/g, '/')
    for (const [packageName, chunkName] of packageToChunk) {
      if (
        normalized.includes(`/node_modules/${packageName}/`) ||
        normalized.includes(`/node_modules/.pnpm/${packageName.replace('/', '+')}@`)
      ) {
        return chunkName
      }
    }
    return undefined
  }
}

function projectRequire() {
  return createRequire(resolve(process.cwd(), 'package.json'))
}

function findPackageJsonFromEntry(entry: string) {
  let current = dirname(entry)
  while (current && current !== dirname(current)) {
    const candidate = join(current, 'package.json')
    if (existsSync(candidate)) {
      return candidate
    }
    current = dirname(current)
  }
  return null
}

function tryResolvePackageJson(packageName: string, requireFn: NodeJS.Require) {
  try {
    return requireFn.resolve(`${packageName}/package.json`)
  } catch {
    try {
      const entry = requireFn.resolve(packageName)
      return findPackageJsonFromEntry(entry)
    } catch {
      return null
    }
  }
}

function resolvePackageJson(packageName: string, anchorPackages: readonly string[] = []) {
  const requireFns = [projectRequire(), pluginRequire]

  anchorPackages.forEach((anchorPackage) => {
    const anchorPackageJson = requireFns
      .map((requireFn) => tryResolvePackageJson(anchorPackage, requireFn))
      .find(Boolean)
    if (anchorPackageJson) {
      requireFns.push(createRequire(anchorPackageJson))
    }
  })

  for (const requireFn of requireFns) {
    const packageJson = tryResolvePackageJson(packageName, requireFn)
    if (packageJson) {
      return packageJson
    }
  }
  return null
}

function resolvePackageRoot(packageName: string, anchorPackages: readonly string[] = []) {
  const packageJson = resolvePackageJson(packageName, anchorPackages)
  return packageJson ? dirname(packageJson) : null
}

async function copyFileIfPresent(
  from: string | null,
  to: string
): Promise<AssetCopyResult['copied']> {
  if (!from || !existsSync(from)) {
    return false
  }
  const info = await stat(from)
  if (!info.isFile()) {
    return false
  }
  await mkdir(dirname(to), { recursive: true })
  await copyFile(from, to)
  return true
}

async function copyDirectoryIfPresent(
  from: string | null,
  to: string
): Promise<AssetCopyResult['copied']> {
  if (!from || !existsSync(from)) {
    return false
  }
  const info = await stat(from)
  if (!info.isDirectory()) {
    return false
  }
  await rm(to, { recursive: true, force: true })
  await mkdir(dirname(to), { recursive: true })
  await cp(from, to, { recursive: true, force: true })
  return true
}

async function copyKnownRendererAssets(targetRoot: string, rendererIds: readonly string[]) {
  const selected = new Set(rendererIds)
  const results: AssetCopyResult[] = []
  const push = async (
    rendererId: string,
    id: string,
    to: string,
    copyAction: () => Promise<boolean>,
    reason?: string
  ) => {
    if (!selected.has(rendererId)) {
      return
    }
    const copied = await copyAction()
    results.push({
      rendererId,
      id,
      to,
      copied,
      reason: copied ? undefined : reason || 'source asset not found'
    })
  }

  const pdfRoot = resolvePackageRoot('pdfjs-dist', ['@file-viewer/renderer-pdf'])
  await push('pdf', 'pdf-worker', join(targetRoot, 'vendor/pdf/pdf.worker.mjs'), () =>
    copyFileIfPresent(
      pdfRoot ? join(pdfRoot, 'legacy/build/pdf.worker.mjs') : null,
      join(targetRoot, 'vendor/pdf/pdf.worker.mjs')
    )
  )
  await push('pdf', 'pdf-cmaps', join(targetRoot, 'vendor/pdf/cmaps'), () =>
    copyDirectoryIfPresent(
      pdfRoot ? join(pdfRoot, 'cmaps') : null,
      join(targetRoot, 'vendor/pdf/cmaps')
    )
  )
  await push('pdf', 'pdf-wasm', join(targetRoot, 'vendor/pdf/wasm'), () =>
    copyDirectoryIfPresent(
      pdfRoot ? join(pdfRoot, 'wasm') : null,
      join(targetRoot, 'vendor/pdf/wasm')
    )
  )
  await push('pdf', 'pdf-standard-fonts', join(targetRoot, 'vendor/pdf/standard_fonts'), () =>
    copyDirectoryIfPresent(
      pdfRoot ? join(pdfRoot, 'standard_fonts') : null,
      join(targetRoot, 'vendor/pdf/standard_fonts')
    )
  )

  const cadRoot = resolvePackageRoot('@flyfish-dev/cad-viewer', ['@file-viewer/renderer-cad'])
  await push('cad', 'cad-wasm-directory', join(targetRoot, 'wasm/cad'), () =>
    copyDirectoryIfPresent(
      cadRoot ? join(cadRoot, 'dist/wasm') : null,
      join(targetRoot, 'wasm/cad')
    )
  )

  const typstCompilerRoot = resolvePackageRoot('@myriaddreamin/typst-ts-web-compiler', [
    '@file-viewer/renderer-typst'
  ])
  const typstRendererRoot = resolvePackageRoot('@myriaddreamin/typst-ts-renderer', [
    '@file-viewer/renderer-typst'
  ])
  await push(
    'typst',
    'typst-compiler-wasm',
    join(targetRoot, 'wasm/typst/typst_ts_web_compiler_bg.wasm'),
    () =>
      copyFileIfPresent(
        typstCompilerRoot ? join(typstCompilerRoot, 'pkg/typst_ts_web_compiler_bg.wasm') : null,
        join(targetRoot, 'wasm/typst/typst_ts_web_compiler_bg.wasm')
      )
  )
  await push(
    'typst',
    'typst-renderer-wasm',
    join(targetRoot, 'wasm/typst/typst_ts_renderer_bg.wasm'),
    () =>
      copyFileIfPresent(
        typstRendererRoot ? join(typstRendererRoot, 'pkg/typst_ts_renderer_bg.wasm') : null,
        join(targetRoot, 'wasm/typst/typst_ts_renderer_bg.wasm')
      )
  )

  const archiveRoot = resolvePackageRoot('libarchive.js', ['@file-viewer/renderer-archive'])
  await push(
    'archive',
    'libarchive-worker',
    join(targetRoot, 'vendor/libarchive/worker-bundle.js'),
    () =>
      copyFileIfPresent(
        archiveRoot ? join(archiveRoot, 'dist/worker-bundle.js') : null,
        join(targetRoot, 'vendor/libarchive/worker-bundle.js')
      )
  )
  await push(
    'archive',
    'libarchive-wasm',
    join(targetRoot, 'vendor/libarchive/libarchive.wasm'),
    () =>
      copyFileIfPresent(
        archiveRoot ? join(archiveRoot, 'dist/libarchive.wasm') : null,
        join(targetRoot, 'vendor/libarchive/libarchive.wasm')
      )
  )

  const sqlJsRoot = resolvePackageRoot('sql.js', ['@file-viewer/renderer-data'])
  await push(
    'data-asset',
    'data-sql-wasm',
    join(targetRoot, 'wasm/data/sql-wasm.wasm'),
    () =>
      copyFileIfPresent(
        sqlJsRoot ? join(sqlJsRoot, 'dist/sql-wasm.wasm') : null,
        join(targetRoot, 'wasm/data/sql-wasm.wasm')
      )
  )

  await mkdir(targetRoot, { recursive: true })
  await writeFile(
    join(targetRoot, 'flyfish-viewer-assets.json'),
    `${JSON.stringify(
      {
        schemaVersion: 1,
        generatedBy: '@file-viewer/vite-plugin',
        rendererIds,
        copiedAt: new Date().toISOString(),
        assets: results
      },
      null,
      2
    )}\n`
  )

  return results
}

function resolveTargetDir(value: string | undefined, fallback: string) {
  const target = value || fallback
  return isAbsolute(target) ? target : resolve(process.cwd(), target)
}

function copyOptions(
  value: FileViewerRenderersPluginOptions['copyAssets']
): FileViewerCopyAssetsOptions {
  return typeof value === 'object' ? value : {}
}

function collectAssetRendererIds(selection: RendererSelection) {
  if (selection.preset === 'all') {
    return ['pdf', 'cad', 'typst', 'archive', 'data-asset', 'eda']
  }
  return unique(selection.descriptors.flatMap((descriptor) => descriptor.rendererIds))
}

function reportAssetCopy(
  results: readonly AssetCopyResult[],
  targetRoot: string,
  mode: FileViewerMissingRendererMode
) {
  const failedRequired = results.filter(
    (result) => !result.copied && ['pdf', 'cad', 'typst'].includes(result.rendererId)
  )
  if (!results.length) {
    return
  }
  const summary = `[file-viewer:vite-plugin] Copied ${results.filter((result) => result.copied).length}/${results.length} renderer assets to ${targetRoot}`
  if (!failedRequired.length || mode === 'ignore') {
    console.log(summary)
    return
  }
  const details = failedRequired
    .map((result) => `  - ${result.rendererId}:${result.id} -> ${result.to} (${result.reason})`)
    .join('\n')
  if (mode === 'warn') {
    console.warn(`${summary}\nMissing required assets:\n${details}`)
    return
  }
  throw new Error(`${summary}\nMissing required assets:\n${details}`)
}

export function fileViewerRenderers(options: FileViewerRenderersPluginOptions = {}): Plugin {
  const moduleId = options.moduleId || virtualModuleId
  const resolvedModuleId = `\0${moduleId}`
  const missingMode = options.missingRenderer || 'error'
  const selection = selectRenderers(options)
  const requestedFormats = unique(
    [...(options.formats || []), ...(options.renderers || [])].map(normalizeToken).filter(Boolean)
  )
  let resolvedConfig: ResolvedConfig | null = null

  return {
    name: 'file-viewer-renderers',
    enforce: 'pre',
    config(userConfig) {
      if ((options.chunkStrategy || 'renderer') === 'none' || hasManualChunks(userConfig)) {
        return undefined
      }
      return {
        build: {
          rollupOptions: {
            output: {
              manualChunks: createManualChunks(selection)
            }
          }
        }
      }
    },
    configResolved(config) {
      resolvedConfig = config
    },
    buildStart() {
      assertMissingRendererPolicy(selection, missingMode)
      const packages =
        selection.preset === 'all'
          ? ['@file-viewer/preset-all']
          : selection.descriptors.map((descriptor) => descriptor.packageName)
      const missingPackages = packages.filter((packageName) => !resolvePackageJson(packageName))
      if (missingPackages.length && missingMode !== 'ignore') {
        const message = `Missing File Viewer renderer package(s): ${missingPackages.join(', ')}. Install them or remove the matching formats from @file-viewer/vite-plugin.`
        if (missingMode === 'warn') {
          console.warn(`[file-viewer:vite-plugin] ${message}`)
        } else {
          throw new Error(`[file-viewer:vite-plugin] ${message}`)
        }
      }
    },
    async configureServer() {
      if (!options.copyAssets || copyOptions(options.copyAssets).mode === 'build') {
        return
      }
      const targetRoot = resolveTargetDir(
        copyOptions(options.copyAssets).publicDir,
        resolvedConfig?.publicDir || 'public'
      )
      const results = await copyKnownRendererAssets(targetRoot, collectAssetRendererIds(selection))
      reportAssetCopy(results, targetRoot, missingMode)
    },
    async closeBundle() {
      if (!options.copyAssets || copyOptions(options.copyAssets).mode === 'dev') {
        return
      }
      const outDir = resolvedConfig?.build.outDir || 'dist'
      const targetRoot = resolveTargetDir(copyOptions(options.copyAssets).outDir, outDir)
      const results = await copyKnownRendererAssets(targetRoot, collectAssetRendererIds(selection))
      reportAssetCopy(results, targetRoot, missingMode)
    },
    resolveId(id) {
      if (id === moduleId || id === virtualModuleId) {
        return id === virtualModuleId ? resolvedVirtualModuleId : resolvedModuleId
      }
      return undefined
    },
    load(id) {
      if (id === resolvedModuleId || id === resolvedVirtualModuleId) {
        return renderVirtualModule(selection, requestedFormats)
      }
      return undefined
    }
  }
}

export function createFileViewerManualChunks(options: FileViewerRenderersPluginOptions = {}) {
  return createManualChunks(selectRenderers(options))
}

export function resolveFileViewerRendererSelection(options: FileViewerRenderersPluginOptions = {}) {
  const selection = selectRenderers(options)
  return {
    preset: selection.preset,
    renderers: selection.descriptors.map((descriptor) => ({
      id: descriptor.id,
      packageName: descriptor.packageName,
      formats: [...descriptor.formats],
      rendererIds: [...descriptor.rendererIds],
      chunkName: descriptor.chunkName
    })),
    missing: selection.missing
  }
}

export default fileViewerRenderers
