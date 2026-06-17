import { existsSync } from 'node:fs'
import { readdir, readFile } from 'node:fs/promises'
import { dirname, extname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadEcosystemReleaseContext } from './lib/ecosystem-packages.mjs'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const sourceRoot = resolve(scriptDir, '..')
const { rootPackage, entries } = await loadEcosystemReleaseContext(sourceRoot)
const expectedWorkspaceRange = `workspace:^${rootPackage.version}`
const entryByName = new Map(entries.map(entry => [entry.packageName, entry]))

const webFacadeExports = [
  'DEFAULT_VIEWER_PUBLIC_DIR',
  'DEFAULT_VIEWER_URL',
  'VIEWER_FRAME_CACHE_KEY',
  'buildViewerSrc',
  'createViewerFrame',
  'createViewerFrameControllerHandle',
  'createViewerFrameFilePostController',
  'createViewerMountedFrameHandle',
  'isViewerFrameEvent',
  'mountViewerFrame',
  'mountViewer',
  'postFileToViewer',
  'syncViewerFrame',
  'toMessageBlob'
]

const vue3ScopedTypeAliases = new Map([
  ['AppWrapper', 'CoreFileViewerRenderedInstance'],
  ['Rendered', 'CoreFileViewerRenderedInstance'],
  ['FileRef', 'FileViewerFileRef'],
  ['FileViewerWatermarkOptions', 'CoreFileViewerWatermarkOptions'],
  ['FileViewerToolbarPosition', 'CoreFileViewerToolbarPosition'],
  ['FileViewerToolbarOptions', 'CoreFileViewerToolbarOptions'],
  ['FileViewerArchiveOptions', 'CoreFileViewerArchiveOptions'],
  ['FileViewerPdfOptions', 'CoreFileViewerPdfOptions'],
  ['FileViewerTypstOptions', 'CoreFileViewerTypstOptions'],
  ['FileViewerCadRenderer', 'CoreFileViewerCadRenderer'],
  ['FileViewerCadDwfLineWeightMode', 'CoreFileViewerCadDwfLineWeightMode'],
  ['FileViewerCadOptions', 'CoreFileViewerCadOptions'],
  ['FileViewerDocumentAnchor', 'CoreFileViewerDocumentAnchor'],
  ['FileViewerDocumentChunk', 'CoreFileViewerDocumentChunk'],
  ['FileViewerSearchOptions', 'CoreFileViewerSearchOptions'],
  ['FileViewerSearchMatch', 'CoreFileViewerSearchMatch'],
  ['FileViewerSearchState', 'CoreFileViewerSearchState'],
  ['FileViewerSearchProvider', 'CoreFileViewerSearchProvider'],
  ['FileViewerZoomState', 'CoreFileViewerZoomState'],
  ['FileViewerZoomProvider', 'CoreFileViewerZoomProvider'],
  ['FileViewerAiOptions', 'CoreFileViewerAiOptions'],
  ['FileViewerThemeMode', 'CoreFileViewerThemeMode'],
  ['FileViewerSourceType', 'CoreFileViewerSourceKind'],
  ['FileViewerLifecyclePhase', 'CoreFileViewerLifecyclePhase'],
  ['FileViewerLifecycleContext', 'CoreFileViewerLifecycleContext'],
  ['FileViewerLifecycleHooks', 'CoreFileViewerLifecycleHooks'],
  ['FileViewerOperationType', 'CoreFileViewerOperationType'],
  ['FileViewerOperationAvailability', 'CoreFileViewerOperationAvailability'],
  ['FileViewerOperationContext', 'CoreFileViewerOperationContext'],
  ['FileViewerBeforeOperation', 'CoreFileViewerBeforeOperation'],
  ['FileViewerProps', 'CoreFileViewerComponentProps'],
  ['FileViewerEventMap', 'CoreFileViewerComponentEventMap'],
  ['FileViewerEmits', 'CoreFileViewerComponentEmits'],
  ['FileViewerExpose', 'CoreFileViewerPublicApi'],
  ['FileViewerOptions', 'CoreFileViewerOptions'],
  ['FileViewerDocxOptions', 'CoreFileViewerDocxOptions'],
  ['FileRenderExportMode', 'CoreFileRenderExportMode'],
  ['FileRenderExportOptions', 'CoreFileRenderExportOptions'],
  ['FileRenderExportAdapter', 'CoreFileRenderExportAdapter'],
  ['FileRenderContext', 'CoreFileRenderContext'],
  ['FileHandler', 'FileRenderHandler<Rendered, HTMLDivElement>'],
  ['FileHandlerComposite', 'FileRenderHandlerComposite<Rendered, HTMLDivElement>']
])

const vue3ScopedPublicTypeExports = new Set([
  'FileRef',
  'FileRenderContext',
  'FileRenderExportAdapter',
  'FileRenderExportMode',
  'FileRenderExportOptions',
  'FileViewerAiOptions',
  'FileViewerArchiveOptions',
  'FileViewerBeforeOperation',
  'FileViewerCadDwfLineWeightMode',
  'FileViewerCadOptions',
  'FileViewerCadRenderer',
  'FileViewerDocxOptions',
  'FileViewerDocumentAnchor',
  'FileViewerDocumentChunk',
  'FileViewerEmits',
  'FileViewerEventMap',
  'FileViewerExpose',
  'FileViewerLifecycleContext',
  'FileViewerLifecycleHooks',
  'FileViewerLifecyclePhase',
  'FileViewerOperationAvailability',
  'FileViewerOperationContext',
  'FileViewerOperationType',
  'FileViewerOptions',
  'FileViewerPdfOptions',
  'FileViewerProps',
  'FileViewerSearchMatch',
  'FileViewerSearchOptions',
  'FileViewerSearchProvider',
  'FileViewerSearchState',
  'FileViewerSourceType',
  'FileViewerThemeMode',
  'FileViewerToolbarOptions',
  'FileViewerToolbarPosition',
  'FileViewerTypstOptions',
  'FileViewerWatermarkOptions',
  'FileViewerZoomProvider',
  'FileViewerZoomState'
])

const vue3ScopedRuntimeFacadeNames = [
  'printCapability',
  'printLayout',
  'sourceLoading',
  'util',
  'worker-ref'
]
const removedVue3ScopedRuntimeFacadePaths = vue3ScopedRuntimeFacadeNames.map(
  name => `src/package/common/${name}.ts`
)

const vue3ScopedRuntimeFacadeImportPattern = new RegExp(
  `from\\s+['"][^'"]*common/(${vue3ScopedRuntimeFacadeNames.map(escapeRegExp).join('|')})['"]`
)
const vue3ScopedCommonTypeImportPattern = /from\s+['"][^'"]*common\/type(?:\.ts)?['"]/
const vue3ScopedUseSearchZoomImportPattern = /from\s+['"]@\/package\/use\/(?:documentSearch|viewerZoom)['"]/
const vue3ScopedVendorUseFacadeImportPattern = /from\s+['"]@\/package\/use\/(?:viewerZoom|documentSearch)['"]/
const sourceFileExtensions = new Set(['.ts', '.tsx', '.vue', '.js', '.mjs'])

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

function runtimeDependencies(packageJson) {
  return {
    ...packageJson.dependencies,
    ...packageJson.optionalDependencies
  }
}

function assertTokens(source, tokens, label) {
  for (const token of tokens) {
    assert(source.includes(token), `${label} must include ${token}`)
  }
}

function assertImportsFrom(source, packageName, label) {
  assert(
    source.includes(`from '${packageName}'`) || source.includes(`from "${packageName}"`),
    `${label} must import from ${packageName}`
  )
}

function assertNotImportsFrom(source, packageName, label) {
  assert(
    !source.includes(`from '${packageName}'`) && !source.includes(`from "${packageName}"`),
    `${label} must not import from ${packageName}`
  )
}

function normalizeTypeExpression(expression) {
  return expression.replace(/\s+/g, ' ').trim()
}

function collectExportedTypeAliases(source) {
  const aliases = new Map()
  const aliasPattern = /^export\s+type\s+([A-Za-z_$][\w$]*)\s*=\s*([^;]+);/gm
  let match
  while ((match = aliasPattern.exec(source))) {
    aliases.set(match[1], normalizeTypeExpression(match[2]))
  }
  return aliases
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
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
    if (entry.isFile() && sourceFileExtensions.has(extname(entry.name))) {
      files.push(path)
    }
  }
  return files
}

function collectTypeReExports(source, specifier) {
  const exports = new Set()
  const reExportPattern = new RegExp(
    `export\\s+type\\s*{([\\s\\S]*?)}\\s+from\\s+['"]${escapeRegExp(specifier)}['"]`,
    'g'
  )
  let match
  while ((match = reExportPattern.exec(source))) {
    const block = match[1]
    for (const rawEntry of block.split(',')) {
      const entry = rawEntry.trim()
      if (!entry) {
        continue
      }
      const aliasMatch = /\s+as\s+([A-Za-z_$][\w$]*)$/.exec(entry)
      exports.add(aliasMatch ? aliasMatch[1] : entry)
    }
  }
  return exports
}

async function readSource(entry, relativePath) {
  return readFile(join(entry.absoluteDir, relativePath), 'utf8')
}

function requireEntry(packageName) {
  const entry = entryByName.get(packageName)
  assert(entry, `Missing compatibility package ${packageName}`)
  return entry
}

async function verifyWebCompatibility() {
  const entry = requireEntry('@flyfish-group/file-viewer-web')
  const dependencies = runtimeDependencies(entry.packageJson)
  assert(
    dependencies['@file-viewer/core'] === expectedWorkspaceRange,
    `${entry.packageName} must be the compatibility facade that depends on @file-viewer/core@${expectedWorkspaceRange}`
  )

  const indexSource = await readSource(entry, 'src/index.ts')
  assertImportsFrom(indexSource, '@file-viewer/core', entry.packageName)
  assertTokens(indexSource, webFacadeExports, entry.packageName)

  const globalSource = await readSource(entry, 'src/global.ts')
  assertTokens(globalSource, ['FlyfishFileViewerWeb', ...webFacadeExports], `${entry.packageName} global bundle`)
}

async function verifyReactCompatibility() {
  const entry = requireEntry('@flyfish-group/file-viewer-react')
  const dependencies = runtimeDependencies(entry.packageJson)
  assert(
    !dependencies['@file-viewer/core'],
    `${entry.packageName} must consume @flyfish-group/file-viewer-web instead of depending on @file-viewer/core`
  )
  assert(
    dependencies['@flyfish-group/file-viewer-web'] === expectedWorkspaceRange,
    `${entry.packageName} must depend on @flyfish-group/file-viewer-web@${expectedWorkspaceRange}`
  )

  const source = await readSource(entry, 'src/index.tsx')
  assertImportsFrom(source, '@flyfish-group/file-viewer-web', entry.packageName)
  assertNotImportsFrom(source, '@file-viewer/core', entry.packageName)
  assertTokens(source, [
    'FileViewerHandle',
    'FileViewerProps',
    'forwardRef',
    'useImperativeHandle',
    'buildViewerSrc',
    'createViewerFrameFilePostController',
    'isViewerFrameEvent',
    'ViewerFrameOptions',
    'ViewerFrameComponentProps',
    'ViewerFrameFilePostController',
    'postFile',
    'reload',
    'onViewerEvent'
  ], entry.packageName)
  assert(
    /export\s+type\s*{[\s\S]*ViewerRuntimeOptions[\s\S]*}\s+from\s+['"]@flyfish-group\/file-viewer-web['"]/.test(source),
    `${entry.packageName} must re-export shared option types from @flyfish-group/file-viewer-web`
  )
}

async function verifyVue3ScopedCompatibility() {
  const entry = requireEntry('@flyfish-group/file-viewer3')
  const dependencies = runtimeDependencies(entry.packageJson)
  assert(
    dependencies['@file-viewer/core'] === expectedWorkspaceRange,
    `${entry.packageName} must depend on @file-viewer/core@${expectedWorkspaceRange}`
  )

  const typeFacadeSource = await readSource(entry, 'src/package/common/type.ts')
  assertImportsFrom(typeFacadeSource, '@file-viewer/core', `${entry.packageName} type facade`)
  assertNotImportsFrom(typeFacadeSource, 'vue', `${entry.packageName} type facade`)
  assert(
    /import\s+type\s*{[\s\S]*}\s+from\s+['"]@file-viewer\/core['"]/.test(typeFacadeSource),
    `${entry.packageName} type facade must import core contracts with import type`
  )
  assert(
    !/\bimport\s+(?!type\b)/.test(typeFacadeSource),
    `${entry.packageName} type facade must not contain runtime imports`
  )
  assert(
    !/^export\s+(interface|const|class|function|enum)\b/m.test(typeFacadeSource),
    `${entry.packageName} type facade must only export type aliases`
  )

  const exportedAliases = collectExportedTypeAliases(typeFacadeSource)
  assert(
    exportedAliases.size === vue3ScopedTypeAliases.size,
    `${entry.packageName} type facade exported ${exportedAliases.size} aliases; expected ${vue3ScopedTypeAliases.size}`
  )
  for (const [aliasName, expectedExpression] of vue3ScopedTypeAliases) {
    const actualExpression = exportedAliases.get(aliasName)
    assert(actualExpression, `${entry.packageName} type facade must export ${aliasName}`)
    assert(
      actualExpression === expectedExpression,
      `${entry.packageName} ${aliasName} must alias ${expectedExpression}, got ${actualExpression}`
    )
  }
  for (const aliasName of exportedAliases.keys()) {
    assert(
      vue3ScopedTypeAliases.has(aliasName),
      `${entry.packageName} type facade must not export unexpected alias ${aliasName}`
    )
  }

  const packageEntrySource = await readSource(entry, 'src/package/index.ts')
  assertNotImportsFrom(packageEntrySource, '@file-viewer/core', `${entry.packageName} package entry`)
  assertNotImportsFrom(packageEntrySource, './common/type.ts', `${entry.packageName} package entry`)
  assert(
    !/from\s+['"]@file-viewer\/core['"]/.test(packageEntrySource),
    `${entry.packageName} package entry must not re-export core types directly`
  )
  const publicTypeExports = collectTypeReExports(packageEntrySource, './common/type')
  assert(
    publicTypeExports.size === vue3ScopedPublicTypeExports.size,
    `${entry.packageName} package entry exported ${publicTypeExports.size} public types; expected ${vue3ScopedPublicTypeExports.size}`
  )
  for (const typeName of vue3ScopedPublicTypeExports) {
    assert(
      publicTypeExports.has(typeName),
      `${entry.packageName} package entry must re-export ${typeName} from ./common/type`
    )
    assert(
      vue3ScopedTypeAliases.has(typeName),
      `${entry.packageName} package entry public type ${typeName} must be registered in the type facade alias map`
    )
  }
  for (const typeName of publicTypeExports) {
    assert(
      vue3ScopedPublicTypeExports.has(typeName),
      `${entry.packageName} package entry must not re-export unexpected public type ${typeName}`
    )
  }
  assert(
    !existsSync(join(entry.absoluteDir, 'src/package/use')),
    `${entry.packageName} must keep Vue lifecycle wrappers beside their owning component/renderer instead of reintroducing src/package/use`
  )

  const vueFileViewerSource = await readSource(entry, 'src/package/components/FileViewer/FileViewer.vue')
  const vueFileViewerLabel = `${entry.packageName} src/package/components/FileViewer/FileViewer.vue`
  assertTokens(vueFileViewerSource, [
    'useViewerPreviewLifecycle',
    'useViewerRequestScope'
  ], vueFileViewerLabel)
  for (const forbiddenToken of [
    'watch([() => props.file',
    'onBeforeUnmount(()',
    "props.file ? 'file'",
    "props.url ? 'url'"
  ]) {
    assert(
      !vueFileViewerSource.includes(forbiddenToken),
      `${vueFileViewerLabel} must delegate preview source watch, unmount cleanup and lifecycle source fallback rules to hooks/core instead of using ${forbiddenToken}`
    )
  }
  assert(
    !vueFileViewerSource.includes('createFileViewerRequestController'),
    `${vueFileViewerLabel} must delegate request version scope to useViewerRequestScope instead of creating a core request controller directly`
  )
  assert(
    !/\bimport\s+(?!type\b)(?:{[^}]*}|\*\s+as\s+[A-Za-z_$][\w$]*|[A-Za-z_$][\w$]*)(?:\s*,\s*{[^}]*})?\s+from\s+['"]@file-viewer\/core['"]/.test(vueFileViewerSource),
    `${vueFileViewerLabel} must use type-only core imports and keep runtime core controllers inside component hooks`
  )

  const vueRequestScopeHookSource = await readSource(entry, 'src/package/components/FileViewer/hooks/useViewerRequestScope.ts')
  const vueRequestScopeHookLabel = `${entry.packageName} src/package/components/FileViewer/hooks/useViewerRequestScope.ts`
  assertImportsFrom(vueRequestScopeHookSource, '@file-viewer/core', vueRequestScopeHookLabel)
  assertTokens(vueRequestScopeHookSource, [
    'createFileViewerRequestController',
    'getCurrentVersion',
    'isCurrentRequest'
  ], vueRequestScopeHookLabel)
  assert(
    !existsSync(join(entry.absoluteDir, 'src/package/components/FileViewer/util.ts')),
    `${entry.packageName} must keep FileViewer renderer bridging in rendererBridge.ts instead of reintroducing a catch-all FileViewer util.ts`
  )

  const vueRendererBridgeSource = await readSource(entry, 'src/package/components/FileViewer/rendererBridge.ts')
  const vueRendererBridgeLabel = `${entry.packageName} src/package/components/FileViewer/rendererBridge.ts`
  assertImportsFrom(vueRendererBridgeSource, '@file-viewer/core', vueRendererBridgeLabel)
  assertTokens(vueRendererBridgeSource, [
    'createVueRenderSession',
    'createFileRenderHandlerRendererSession',
    'renderFileViewerHandler',
    'vueRendererRegistry'
  ], vueRendererBridgeLabel)
  for (const forbiddenToken of [
    'export function getExtend',
    'export async function render('
  ]) {
    assert(
      !vueRendererBridgeSource.includes(forbiddenToken),
      `${vueRendererBridgeLabel} must expose only session-based renderer bridging instead of ${forbiddenToken}`
    )
  }

  const vueLoadingHookSource = await readSource(entry, 'src/package/components/FileViewer/hooks/useLoading.ts')
  const vueLoadingHookLabel = `${entry.packageName} src/package/components/FileViewer/hooks/useLoading.ts`
  assertImportsFrom(vueLoadingHookSource, '@file-viewer/core', vueLoadingHookLabel)
  assertTokens(vueLoadingHookSource, [
    'createFileViewerLoadingController',
    'cloneFileViewerLoadingRuntimeState',
    'resolveFileViewerLoadingTheme'
  ], vueLoadingHookLabel)

  const vuePresentationHookSource = await readSource(entry, 'src/package/components/FileViewer/hooks/useViewerPresentation.ts')
  const vuePresentationHookLabel = `${entry.packageName} src/package/components/FileViewer/hooks/useViewerPresentation.ts`
  assertImportsFrom(vuePresentationHookSource, '@file-viewer/core', vuePresentationHookLabel)
  assertTokens(vuePresentationHookSource, [
    'resolveFileViewerSourceFilename',
    'normalizeFileViewerTheme',
    'normalizeFileViewerToolbar'
  ], vuePresentationHookLabel)
  for (const forbiddenToken of [
    'const getSourceFilename',
    "theme === 'light'",
    "theme === 'dark'"
  ]) {
    assert(
      !vuePresentationHookSource.includes(forbiddenToken),
      `${vuePresentationHookLabel} must delegate source filename and theme normalization to @file-viewer/core instead of ${forbiddenToken}`
    )
  }

  const vueSourceLoadingHookSource = await readSource(entry, 'src/package/components/FileViewer/hooks/useViewerSourceLoading.ts')
  const vueSourceLoadingHookLabel = `${entry.packageName} src/package/components/FileViewer/hooks/useViewerSourceLoading.ts`
  assertImportsFrom(vueSourceLoadingHookSource, '@file-viewer/core', vueSourceLoadingHookLabel)
  assertTokens(vueSourceLoadingHookSource, [
    'DEFAULT_FILE_VIEWER_SOURCE_FILENAME',
    'createFileViewerEmptyPreviewState',
    'createFileViewerStreamingPdfPlaceholderFile',
    'normalizeFileViewerSourceUrl',
    'resolveFileViewerPreviewRequestReason',
    'resolveFileViewerRemoteSourcePlan',
    'resolveFileViewerSourceFilename'
  ], vueSourceLoadingHookLabel)
  for (const forbiddenToken of [
    'const canStreamRemotePdf',
    'shouldStreamPdfUrl',
    'getExtension(nextFilename)',
    'normalizeFilename(url)',
    'new File([],',
    'preview.pdf',
    'preview.bin',
    'const hasSource = !!file || !!url',
    "hasSource ? 'replace' : 'reset'",
    'sourceUrl || null',
    "filename.value = ''"
  ]) {
    assert(
      !vueSourceLoadingHookSource.includes(forbiddenToken),
      `${vueSourceLoadingHookLabel} must delegate source planning and reset state rules to @file-viewer/core instead of ${forbiddenToken}`
    )
  }

  const vueDocumentSearchHookSource = await readSource(entry, 'src/package/components/FileViewer/hooks/useDocumentSearch.ts')
  const vueDocumentSearchHookLabel = `${entry.packageName} src/package/components/FileViewer/hooks/useDocumentSearch.ts`
  assertImportsFrom(vueDocumentSearchHookSource, '@file-viewer/core', vueDocumentSearchHookLabel)
  assertTokens(vueDocumentSearchHookSource, [
    'createFileViewerDomSearchController',
    'controller.destroy()'
  ], vueDocumentSearchHookLabel)

  const vueDocumentFeaturesHookSource = await readSource(entry, 'src/package/components/FileViewer/hooks/useViewerDocumentFeatures.ts')
  const vueDocumentFeaturesHookLabel = `${entry.packageName} src/package/components/FileViewer/hooks/useViewerDocumentFeatures.ts`
  assertImportsFrom(vueDocumentFeaturesHookSource, '@file-viewer/core', vueDocumentFeaturesHookLabel)
  assertTokens(vueDocumentFeaturesHookSource, [
    'resolveFileViewerScrollContainer',
    'cloneFileViewerSearchState',
    'postFileViewerSearchChange',
    'postFileViewerLocationChange',
    'buildFileViewerDocumentTextChunks'
  ], vueDocumentFeaturesHookLabel)
  for (const forbiddenToken of [
    'createFileViewerRawPostMessagePayload',
    'postFileViewerMessageToParent',
    'const postViewerPayload',
    'const cloneSearchState',
    'matches.map(match => ({ ...match }))',
    'const getScrollableRange',
    'const isScrollableElement',
    'getComputedStyle(element)',
    "querySelectorAll<HTMLElement>('div, section, article, pre')"
  ]) {
    assert(
      !vueDocumentFeaturesHookSource.includes(forbiddenToken),
      `${vueDocumentFeaturesHookLabel} must delegate scroll container resolution to @file-viewer/core instead of ${forbiddenToken}`
    )
  }

  const vueZoomHookSource = await readSource(entry, 'src/package/components/FileViewer/hooks/useViewerZoom.ts')
  const vueZoomHookLabel = `${entry.packageName} src/package/components/FileViewer/hooks/useViewerZoom.ts`
  assertImportsFrom(vueZoomHookSource, '@file-viewer/core', vueZoomHookLabel)
  assertTokens(vueZoomHookSource, [
    'createFileViewerZoomController',
    'cloneFileViewerZoomState',
    'controller.destroy()'
  ], vueZoomHookLabel)

  const vueToolbarHookSource = await readSource(entry, 'src/package/components/FileViewer/hooks/useViewerToolbar.ts')
  const vueToolbarHookLabel = `${entry.packageName} src/package/components/FileViewer/hooks/useViewerToolbar.ts`
  assertImportsFrom(vueToolbarHookSource, '@file-viewer/core', vueToolbarHookLabel)
  assertTokens(vueToolbarHookSource, [
    'postFileViewerOperationAvailabilityChange',
    'postFileViewerZoomChange',
    'resolveFileViewerOperationAvailability',
    'resolveVisibleFileViewerToolbar',
    'source: {'
  ], vueToolbarHookLabel)
  for (const forbiddenToken of [
    "createFileViewerRawPostMessagePayload('flyfish-viewer:operation'",
    'postFileViewerMessageToParent(',
    'hasOriginalSource: !!currentBuffer.value || !!currentSourceUrl.value',
    '!!currentBuffer.value || !!currentSourceUrl.value'
  ]) {
    assert(
      !vueToolbarHookSource.includes(forbiddenToken),
      `${vueToolbarHookLabel} must delegate operation payloads and source availability to @file-viewer/core instead of ${forbiddenToken}`
    )
  }

  const vuePublicApiHookSource = await readSource(entry, 'src/package/components/FileViewer/hooks/useViewerPublicApi.ts')
  const vuePublicApiHookLabel = `${entry.packageName} src/package/components/FileViewer/hooks/useViewerPublicApi.ts`
  assertImportsFrom(vuePublicApiHookSource, '@file-viewer/core', vuePublicApiHookLabel)
  assertTokens(vuePublicApiHookSource, [
    'cloneFileViewerOperationAvailability'
  ], vuePublicApiHookLabel)
  for (const forbiddenToken of [
    '{ ...operationAvailability.value }'
  ]) {
    assert(
      !vuePublicApiHookSource.includes(forbiddenToken),
      `${vuePublicApiHookLabel} must delegate public operation availability snapshots to @file-viewer/core instead of ${forbiddenToken}`
    )
  }

  const vueExportHookSource = await readSource(entry, 'src/package/components/FileViewer/hooks/useViewerExport.ts')
  const vueExportHookLabel = `${entry.packageName} src/package/components/FileViewer/hooks/useViewerExport.ts`
  assertImportsFrom(vueExportHookSource, '@file-viewer/core', vueExportHookLabel)
  assertTokens(vueExportHookSource, [
    'createFileViewerOriginalSourceState',
    'executeFileViewerDownloadOperation',
    'executeFileViewerExportHtmlOperation',
    'executeFileViewerPrintOperation'
  ], vueExportHookLabel)
  for (const forbiddenToken of [
    'const getFilename',
    'getFilename(',
    'file-viewer-preview',
    'preview.bin'
  ]) {
    assert(
      !vueExportHookSource.includes(forbiddenToken),
      `${vueExportHookLabel} must delegate operation filename fallbacks to @file-viewer/core instead of ${forbiddenToken}`
    )
  }

  const vueRenderSurfaceHookSource = await readSource(entry, 'src/package/components/FileViewer/hooks/useViewerRenderSurface.ts')
  const vueRenderSurfaceHookLabel = `${entry.packageName} src/package/components/FileViewer/hooks/useViewerRenderSurface.ts`
  assertImportsFrom(vueRenderSurfaceHookSource, '@file-viewer/core', vueRenderSurfaceHookLabel)
  assertTokens(vueRenderSurfaceHookSource, [
    'disposeFileViewerRendererSession',
    'waitForFileViewerNextPaint'
  ], vueRenderSurfaceHookLabel)
  for (const forbiddenToken of [
    'const waitForBrowserPaint',
    'requestAnimationFrame !==',
    'setTimeout(resolve',
    'session.destroy?.()',
    "'then' in result",
    'Promise<void>).catch'
  ]) {
    assert(
      !vueRenderSurfaceHookSource.includes(forbiddenToken),
      `${vueRenderSurfaceHookLabel} must delegate paint scheduling and renderer session disposal to @file-viewer/core instead of ${forbiddenToken}`
    )
  }

  const vueWorkerHookSource = await readSource(entry, 'src/package/vendors/xlsx/hooks/useWorker.ts')
  const vueWorkerHookLabel = `${entry.packageName} src/package/vendors/xlsx/hooks/useWorker.ts`
  assertImportsFrom(vueWorkerHookSource, '@file-viewer/core', vueWorkerHookLabel)
  assertTokens(vueWorkerHookSource, [
    'createFileViewerWorkerController',
    'FileViewerWorkerFactory',
    'controller.destroy()'
  ], vueWorkerHookLabel)
  for (const forbiddenToken of [
    "addEventListener('message'",
    "addEventListener('error'",
    'postMessage({',
    'terminate()'
  ]) {
    assert(
      !vueWorkerHookSource.includes(forbiddenToken),
      `${vueWorkerHookLabel} must delegate worker event plumbing to @file-viewer/core instead of using ${forbiddenToken}`
    )
  }

  const vueLifecycleHookSource = await readSource(entry, 'src/package/components/FileViewer/hooks/useViewerLifecycle.ts')
  const vueLifecycleHookLabel = `${entry.packageName} src/package/components/FileViewer/hooks/useViewerLifecycle.ts`
  assertImportsFrom(vueLifecycleHookSource, '@file-viewer/core', vueLifecycleHookLabel)
  assertTokens(vueLifecycleHookSource, [
    'createFileViewerLifecycleStateController',
    'lifecycleState.getLoadStartedAt',
    'lifecycleState.buildActiveUnloadContext',
    'postFileViewerLifecycleEvent',
    'postFileViewerOperationContextEvent',
    'resolveFileViewerLifecycleFallbackSource',
    'runFileViewerBeforeOperation',
    'runFileViewerLifecycleHook'
  ], vueLifecycleHookLabel)
  for (const forbiddenToken of [
    'new Map<number, number>()',
    'let activeDocumentContext',
    'createFileViewerPostMessagePayload',
    'postFileViewerMessageToParent(',
    "'flyfish-viewer:lifecycle'",
    "'flyfish-viewer:operation'",
    "props.file ? 'file'",
    "props.url ? 'url'"
  ]) {
    assert(
      !vueLifecycleHookSource.includes(forbiddenToken),
      `${vueLifecycleHookLabel} must keep lifecycle state, source fallback and postMessage payloads in @file-viewer/core instead of ${forbiddenToken}`
    )
  }

  for (const removedRuntimeFacadePath of removedVue3ScopedRuntimeFacadePaths) {
    assert(
      !existsSync(join(entry.absoluteDir, removedRuntimeFacadePath)),
      `${entry.packageName} must import runtime helpers from @file-viewer/core instead of reintroducing ${removedRuntimeFacadePath}`
    )
  }

  const sourceFiles = await readAllSourceFiles(join(entry.absoluteDir, 'src'))
  for (const file of sourceFiles) {
    const relativePath = relative(entry.absoluteDir, file)
    const source = await readFile(file, 'utf8')
    assert(
      !/from\s+['"]@\/package\/use['"]/.test(source),
      `${entry.packageName} ${relativePath} must import a concrete Vue hook module instead of @/package/use`
    )
    const searchZoomUseImport = vue3ScopedUseSearchZoomImportPattern.exec(source)
    assert(
      !searchZoomUseImport,
      `${entry.packageName} ${relativePath} must keep search/zoom Vue state beside FileViewer hooks and use @file-viewer/core directly instead of ${searchZoomUseImport?.[0]}`
    )
    const runtimeFacadeImport = vue3ScopedRuntimeFacadeImportPattern.exec(source)
    assert(
      !runtimeFacadeImport,
      `${entry.packageName} ${relativePath} must import runtime helpers from @file-viewer/core instead of ${runtimeFacadeImport?.[0]}`
    )
    const internalCommonTypeImport = vue3ScopedCommonTypeImportPattern.exec(source)
    const isPublicTypeEntry = relativePath === 'src/package/index.ts' || relativePath === 'src/package/common/type.ts'
    assert(
      isPublicTypeEntry || !internalCommonTypeImport,
      `${entry.packageName} ${relativePath} must import implementation types from @file-viewer/core; common/type is only a public compatibility facade`
    )
    if (relativePath.startsWith('src/package/vendors/')) {
      const vendorCommonTypeImport = vue3ScopedCommonTypeImportPattern.exec(source)
      assert(
        !vendorCommonTypeImport,
        `${entry.packageName} ${relativePath} must import renderer contracts directly from @file-viewer/core instead of ${vendorCommonTypeImport?.[0]}`
      )
      const vendorUseFacadeImport = vue3ScopedVendorUseFacadeImportPattern.exec(source)
      assert(
        !vendorUseFacadeImport,
        `${entry.packageName} ${relativePath} must import search/zoom provider helpers directly from @file-viewer/core instead of ${vendorUseFacadeImport?.[0]}`
      )
    }
  }
}

async function verifyVue3UnscopedCompatibility() {
  const entry = requireEntry('file-viewer3')
  const dependencies = runtimeDependencies(entry.packageJson)
  assert(
    dependencies['@flyfish-group/file-viewer3'] === expectedWorkspaceRange,
    `${entry.packageName} must depend on @flyfish-group/file-viewer3@${expectedWorkspaceRange}`
  )
  assert(
    !dependencies['@file-viewer/core'],
    `${entry.packageName} must remain a thin alias and must not depend on @file-viewer/core`
  )
  assert(
    !existsSync(join(entry.absoluteDir, 'src')),
    `${entry.packageName} must not carry duplicate Vue3 source; it should generate a thin alias dist`
  )

  const buildScript = await readSource(entry, 'scripts/build.mjs')
  assertTokens(buildScript, [
    "export { default } from '@flyfish-group/file-viewer3';",
    "export * from '@flyfish-group/file-viewer3';",
    "@import '@flyfish-group/file-viewer3/dist/file-viewer3.css';"
  ], `${entry.packageName} build script`)
}

await verifyWebCompatibility()
await verifyReactCompatibility()
await verifyVue3ScopedCompatibility()
await verifyVue3UnscopedCompatibility()

console.log('Verified compatibility package runtime facades and alias boundaries.')
