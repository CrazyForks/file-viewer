import { existsSync } from 'node:fs'
import { readdir, readFile, stat } from 'node:fs/promises'
import { dirname, extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const sourceRoot = resolve(scriptDir, '..')
const coreDir = join(sourceRoot, 'packages', 'core')
const coreSrcDir = join(coreDir, 'src')

const requiredValueExports = [
  'createViewer',
  'createRendererRegistry',
  'createFileViewerRendererDispatcher',
  'createFileRenderHandlerRegistry',
  'normalizeSource',
  'resolveFileViewerSourceFilename',
  'readFileViewerBuffer',
  'readFileViewerDataUrl',
  'readFileViewerText',
  'sanitizeFileViewerOptions',
  'serializeFileViewerOptions',
  'parseFileViewerOptions',
  'normalizeFileViewerTheme',
  'buildFileViewerFrameSrc',
  'toFileViewerFrameOptions',
  'createFileViewerMountedFrameHandle',
  'createFileViewerFrameControllerHandle',
  'mountFileViewerFrame',
  'resolveFileViewerOperationAvailability',
  'resolveVisibleFileViewerToolbar',
  'createFileViewerLifecycleStateController',
  'postFileViewerOperationAvailabilityChange',
  'postFileViewerZoomChange',
  'runFileViewerBeforeOperation',
  'runFileViewerLifecycleHook',
  'executeFileViewerDownloadOperation',
  'executeFileViewerExportHtmlOperation',
  'executeFileViewerPrintOperation',
  'collectFileViewerDocumentAnchors',
  'createFileViewerDomSearchController',
  'createFileViewerZoomChangeEmitter',
  'createFileViewerZoomController',
  'createFileViewerWorkerController',
  'resolveFileViewerRendererAssets',
  'DEFAULT_RENDERER_DEFINITIONS',
  'DEFAULT_SUPPORTED_EXTENSIONS'
]

const requiredTypeExports = [
  'FileViewerOptions',
  'FileViewerReadResult',
  'FileViewerSource',
  'FileViewerInstance',
  'FileViewerLifecycleContext',
  'FileViewerLifecycleHooks',
  'FileViewerOperationContext',
  'FileViewerBeforeOperation',
  'FileViewerLifecycleStateController',
  'FileViewerOperationAvailability',
  'FileViewerSearchState',
  'FileViewerZoomState',
  'FileViewerDocumentAnchor',
  'FileViewerDocumentChunk',
  'RendererPlugin',
  'RendererSession',
  'RendererRegistry',
  'RendererLoadContext',
  'RenderSurface',
  'ViewerCapabilityState',
  'ViewerLifecycleContext',
  'ViewerOperationContext',
  'FileRenderContext',
  'FileRenderExportAdapter',
  'FileViewerFrameController',
  'FileViewerFrameControllerAccessor',
  'FileViewerSerializableOptions',
  'CreateViewerOptions',
  'FileViewerRenderedInstance',
  'FileViewerComponentProps',
  'FileViewerComponentEmits',
  'FileViewerComponentEventMap',
  'FileViewerPublicApi',
  'FileViewerFrameComponentBridgeOptions',
  'FileViewerFrameComponentProps',
  'FileViewerFrameContainerComponentProps',
  'FileViewerFrameHostComponentProps',
  'FileViewerFrameIframeComponentProps',
  'FileViewerDirectFrameHandle',
  'FileViewerMountedFrameHandle',
  'FileViewerFrameControllerHandle',
  'FileViewerWorkerController'
]

const requiredInstanceMethods = [
  'load',
  'destroy',
  'updateOptions',
  'getCapabilities',
  'getRenderer',
  'getSource',
  'download',
  'exportHtml',
  'print',
  'zoomIn',
  'zoomOut',
  'resetZoom',
  'getZoomState',
  'search',
  'nextSearchResult',
  'previousSearchResult',
  'clearSearch',
  'getSearchState',
  'collectDocumentAnchors',
  'getCurrentDocumentAnchor',
  'scrollToDocumentAnchor',
  'scrollToLine',
  'getDocumentTextChunks'
]

const forbiddenCoreSourceExtensions = new Set(['.jsx', '.tsx', '.vue', '.svelte'])
const allowedCoreDevDependencies = new Set(['typescript'])

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'))
}

function hasToken(source, token) {
  return new RegExp(`\\b${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(source)
}

async function readAllSourceFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...await readAllSourceFiles(path))
      continue
    }
    if (entry.isFile()) {
      files.push(path)
    }
  }
  return files
}

function assertCorePackageMetadata(packageJson) {
  assert(packageJson.name === '@file-viewer/core', 'Core package name must be @file-viewer/core')
  assert(packageJson.private !== true, 'Core package must be publishable')
  assert(packageJson.type === 'module', 'Core package must publish as ESM')
  assert(packageJson.main === './dist/index.js', 'Core package main entry drifted')
  assert(packageJson.module === './dist/index.js', 'Core package module entry drifted')
  assert(packageJson.types === './dist/index.d.ts', 'Core package types entry drifted')
  assert(packageJson.exports?.['.']?.import === './dist/index.js', 'Core package exports["."].import drifted')
  assert(packageJson.exports?.['.']?.types === './dist/index.d.ts', 'Core package exports["."].types drifted')
  assert(packageJson.exports?.['./assets']?.import === './dist/assets.js', 'Core package exports["./assets"].import drifted')
  assert(!packageJson.dependencies, 'Core package must not have runtime dependencies')
  assert(!packageJson.peerDependencies, 'Core package must not have peer dependencies')
  assert(!packageJson.optionalDependencies, 'Core package must not have optional dependencies')
  for (const dependencyName of Object.keys(packageJson.devDependencies || {})) {
    assert(
      allowedCoreDevDependencies.has(dependencyName),
      `Core package devDependencies must stay tooling-only; unexpected ${dependencyName}`
    )
  }
}

function assertCoreTsConfig(tsconfig) {
  assert(tsconfig.compilerOptions?.declaration === true, 'Core tsconfig must emit declarations')
  assert(tsconfig.compilerOptions?.strict === true, 'Core tsconfig must stay strict')
  assert(tsconfig.compilerOptions?.rootDir === 'src', 'Core tsconfig rootDir must be src')
  assert(tsconfig.compilerOptions?.outDir === 'dist', 'Core tsconfig outDir must be dist')
  assert(
    (tsconfig.include || []).includes('src/**/*.ts'),
    'Core tsconfig must include src/**/*.ts'
  )
}

function assertCoreEntrypoint(indexSource) {
  for (const exportName of requiredValueExports) {
    assert(hasToken(indexSource, exportName), `Core entrypoint must export ${exportName}`)
  }
  for (const typeName of requiredTypeExports) {
    assert(hasToken(indexSource, typeName), `Core entrypoint must export type ${typeName}`)
  }
}

function assertCoreInstanceContract(typesSource) {
  const match = /export\s+interface\s+FileViewerInstance\s*{([\s\S]*?)\n}/.exec(typesSource)
  assert(match, 'Core types must declare FileViewerInstance')
  const instanceContract = match[1]
  for (const methodName of requiredInstanceMethods) {
    assert(
      new RegExp(`\\b${methodName}\\s*\\(`).test(instanceContract),
      `FileViewerInstance must expose ${methodName}()`
    )
  }
}

function collectBareImportSpecifiers(source) {
  const imports = new Set()
  const patterns = [
    /\bimport\s+(?:type\s+)?(?:[^'"]+\s+from\s+)?['"]([^'"]+)['"]/g,
    /\bexport\s+(?:type\s+)?(?:\*|\{[^}]*})\s+from\s+['"]([^'"]+)['"]/g,
    /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g
  ]
  for (const pattern of patterns) {
    let match
    while ((match = pattern.exec(source))) {
      const specifier = match[1]
      if (
        !specifier.startsWith('.') &&
        !specifier.startsWith('/') &&
        !specifier.startsWith('node:')
      ) {
        imports.add(specifier)
      }
    }
  }
  return [...imports]
}

async function assertCoreSourceBoundary(files) {
  for (const file of files) {
    const extension = extname(file)
    const relativePath = file.slice(coreDir.length + 1)
    assert(
      !forbiddenCoreSourceExtensions.has(extension),
      `Core source must remain pure TypeScript; unexpected ${relativePath}`
    )
    if (extension !== '.ts') {
      continue
    }
    const source = await readFile(file, 'utf8')
    for (const specifier of collectBareImportSpecifiers(source)) {
      throw new Error(`Core source must not import runtime package ${specifier}: ${relativePath}`)
    }
  }
}

assert(existsSync(coreDir), 'Missing packages/core')
assert(existsSync(coreSrcDir), 'Missing packages/core/src')

const packageJson = await readJson(join(coreDir, 'package.json'))
const tsconfig = await readJson(join(coreDir, 'tsconfig.json'))
const indexSource = await readFile(join(coreSrcDir, 'index.ts'), 'utf8')
const typesSource = await readFile(join(coreSrcDir, 'types.ts'), 'utf8')
const sourceFiles = await readAllSourceFiles(coreSrcDir)

await stat(join(coreSrcDir, 'viewer.ts'))

assertCorePackageMetadata(packageJson)
assertCoreTsConfig(tsconfig)
assertCoreEntrypoint(indexSource)
assertCoreInstanceContract(typesSource)
await assertCoreSourceBoundary(sourceFiles)

console.log(
  `[core-api] Verified ${requiredValueExports.length} value exports, ${requiredTypeExports.length} type exports, ${requiredInstanceMethods.length} instance methods, and ${sourceFiles.length} pure TS core files.`
)
