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
  'createViewerDirectFrameController',
  'createViewerDirectFrameHandle',
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
    'createViewerDirectFrameController',
    'createViewerDirectFrameHandle',
    'resetForSrcChange',
    'syncOptions',
    'handleLoad',
    'handleMessage',
    'ViewerFrameOptions',
    'ViewerFrameComponentProps',
    'ViewerDirectFrameController',
    'onViewerEvent'
  ], entry.packageName)
  for (const forbiddenToken of [
    'createViewerFrameFilePostController',
    'isViewerFrameEvent',
    'setFrameReady',
    'frameReady'
  ]) {
    assert(
      !source.includes(forbiddenToken),
      `${entry.packageName} must delegate direct iframe lifecycle to @flyfish-group/file-viewer-web instead of ${forbiddenToken}`
    )
  }
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
    'resolveFileViewerLoadingTheme',
    'runFileViewerLoadingControllerAction',
    'syncFileViewerLoadingControllerState'
  ], vueLoadingHookLabel)
  for (const forbiddenToken of [
    'applyFileViewerLoadingRuntimeState',
    'const syncFromController',
    'const applyLoadingState',
    'target.loading = source.loading',
    'target.styleVars = source.styleVars'
  ]) {
    assert(
      !vueLoadingHookSource.includes(forbiddenToken),
      `${vueLoadingHookLabel} must delegate loading state application to @file-viewer/core instead of ${forbiddenToken}`
    )
  }

  const vuePresentationHookSource = await readSource(entry, 'src/package/components/FileViewer/hooks/useViewerPresentation.ts')
  const vuePresentationHookLabel = `${entry.packageName} src/package/components/FileViewer/hooks/useViewerPresentation.ts`
  assertImportsFrom(vuePresentationHookSource, '@file-viewer/core', vuePresentationHookLabel)
  assertTokens(vuePresentationHookSource, [
    'resolveFileViewerPresentationState'
  ], vuePresentationHookLabel)
  for (const forbiddenToken of [
    'const getSourceFilename',
    'resolveFileViewerSourceFilename',
    'normalizeFileViewerTheme',
    'normalizeFileViewerToolbar',
    'getExtension(displayFilename.value)',
    "theme === 'light'",
    "theme === 'dark'"
  ]) {
    assert(
      !vuePresentationHookSource.includes(forbiddenToken),
      `${vuePresentationHookLabel} must delegate presentation state derivation to @file-viewer/core instead of ${forbiddenToken}`
    )
  }

  const vueWatermarkHookSource = await readSource(entry, 'src/package/components/FileViewer/hooks/useViewerWatermark.ts')
  const vueWatermarkHookLabel = `${entry.packageName} src/package/components/FileViewer/hooks/useViewerWatermark.ts`
  assertImportsFrom(vueWatermarkHookSource, '@file-viewer/core', vueWatermarkHookLabel)
  assertTokens(vueWatermarkHookSource, [
    'normalizeFileViewerWatermark',
    'buildFileViewerWatermarkStyle',
    'buildFileViewerWatermarkInlineStyle'
  ], vueWatermarkHookLabel)
  for (const forbiddenToken of [
    'buildFileViewerWatermarkBackgroundImage',
    'const backgroundImage =',
    'return {\n      backgroundImage\n    }'
  ]) {
    assert(
      !vueWatermarkHookSource.includes(forbiddenToken),
      `${vueWatermarkHookLabel} must delegate watermark style object construction to @file-viewer/core instead of ${forbiddenToken}`
    )
  }

  const vueSourceLoadingHookSource = await readSource(entry, 'src/package/components/FileViewer/hooks/useViewerSourceLoading.ts')
  const vueSourceLoadingHookLabel = `${entry.packageName} src/package/components/FileViewer/hooks/useViewerSourceLoading.ts`
  assertImportsFrom(vueSourceLoadingHookSource, '@file-viewer/core', vueSourceLoadingHookLabel)
  assertTokens(vueSourceLoadingHookSource, [
    'buildLoadStartState',
    'buildRenderCompleteState',
    'cancelFileViewerPreviewRequest',
    'commitFileViewerEmptyPreviewResetState',
    'createFileViewerPreviewStateTarget',
    'runFileViewerLocalFilePreview',
    'runFileViewerPreviewRequest',
    'runFileViewerRemoteFilePreview'
  ], vueSourceLoadingHookLabel)
  for (const forbiddenToken of [
    'DEFAULT_FILE_VIEWER_SOURCE_FILENAME',
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
    'applyFileViewerEmptyPreviewState',
    'applyFileViewerPreviewRequestResetState',
    'resolveFileViewerFileRefSourcePlan',
    'resolveFileViewerRemoteSourcePlan',
    'resolveFileViewerRuntimePageHref',
    'runFileViewerReadAndRenderFile',
    'runFileViewerStreamingPdfPreview',
    'commitFileViewerLoadStartState',
    'commitFileViewerRemoteDownloadState',
    'finalizeFileViewerPreviewLoadState',
    'isFileViewerAbortError',
    'commitFileViewerPreviewRequestStartState',
    'resolveFileViewerPreviewRequestReason',
    'requestController.createVersion()',
    'requestController.createAbortController()',
    'requestController.clearAbortController',
    "filename.value = ''",
    'filename.value = nextFilename',
    'filename.value = resolveFileViewerSourceFilename',
    'wrapFileViewerFileRef',
    'resolveFileViewerSourceFilename',
    'typeof window',
    'window.location.href',
    'currentFile.value = null',
    'currentBuffer.value = null',
    'currentSourceUrl.value = null',
    'renderedReady.value = false',
    'progressiveReady.value = false',
    'createFileViewerEmptyPreviewState',
    'normalizeFileViewerSourceUrl',
    'currentFile.value = file',
    'currentBuffer.value = arrayBuffer',
    'currentSourceUrl.value = normalizeFileViewerSourceUrl',
    'currentSourceUrl.value = url',
    'applyFileViewerReadPreviewState',
    'applyFileViewerPreviewSourceUrlState',
    'createFileViewerReadPreviewState',
    'createFileViewerStreamingPdfPlaceholderFile',
    'commitFileViewerRenderCompleteState',
    'FILE_VIEWER_PREVIEW_MESSAGES',
    'readFileViewerBuffer',
    'const arrayBuffer =',
    'new ArrayBuffer(0)',
    'streamingPdf',
    'renderedReady.value = true',
    'get filename(): string',
    'set filename(value: string)',
    'get file(): File | null',
    'set file(value: File | null)',
    'get buffer(): ArrayBuffer | null',
    'set buffer(value: ArrayBuffer | null)',
    'get sourceUrl(): string | null',
    'set sourceUrl(value: string | null)',
    'get renderedReady(): boolean',
    'set renderedReady(value: boolean)',
    'get progressiveReady(): boolean',
    'set progressiveReady(value: boolean)',
    'applyFileViewerPreviewFilenameState',
    'applyFileViewerRenderReadinessState',
    'const loadStartState = buildLoadStartState',
    'notifyLifecycle(loadStartState.lifecycleContext)',
    'startLoading(loadStartState.loadingMessage)',
    'setLoadingMessage(FILE_VIEWER_PREVIEW_MESSAGES.reading)',
    'if (!data) {',
    'source: data',
    'clearLoadStarted(version)',
    'finishLoading(version)',
    'const finishLoading',
    "phase: 'load-start'",
    "phase: 'load-complete'",
    'renderedReady: true'
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
    'observeFileViewerDomSearchController',
    'runFileViewerDomSearchControllerAction',
    'destroyFileViewerDomSearchController'
  ], vueDocumentSearchHookLabel)
  for (const forbiddenToken of [
    'applyFileViewerSearchState',
    'const syncFromController',
    'anchors.value = controller.anchors',
    'controller.destroy()',
    'const applySearchState',
    'target.query = nextState.query',
    'target.matches = nextState.matches'
  ]) {
    assert(
      !vueDocumentSearchHookSource.includes(forbiddenToken),
      `${vueDocumentSearchHookLabel} must delegate search state application to @file-viewer/core instead of ${forbiddenToken}`
    )
  }

  const vueDocumentFeaturesHookSource = await readSource(entry, 'src/package/components/FileViewer/hooks/useViewerDocumentFeatures.ts')
  const vueDocumentFeaturesHookLabel = `${entry.packageName} src/package/components/FileViewer/hooks/useViewerDocumentFeatures.ts`
  assertImportsFrom(vueDocumentFeaturesHookSource, '@file-viewer/core', vueDocumentFeaturesHookLabel)
  assertTokens(vueDocumentFeaturesHookSource, [
    'createFileViewerDocumentFeatureActions',
    'FileViewerDocumentFeatureActions'
  ], vueDocumentFeaturesHookLabel)
  for (const forbiddenToken of [
    'resolveFileViewerScrollContainer',
    'createFileViewerSearchChangeState',
    'resolveFileViewerLocationChangeAnchor',
    'dispatchFileViewerSearchChange',
    'dispatchFileViewerLocationChange',
    'buildFileViewerDocumentTextChunks',
    'scrollToFileViewerDocumentAnchor',
    'createFileViewerRawPostMessagePayload',
    'postFileViewerMessageToParent',
    'postFileViewerSearchChange',
    'postFileViewerLocationChange',
    'emitSearchChange(state)',
    'emitLocationChange(anchor)',
    'const postViewerPayload',
    'const cloneSearchState',
    'cloneFileViewerSearchState',
    'getCurrentFileViewerDocumentAnchor',
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
    'createFileViewerZoomChangeState',
    'refreshFileViewerZoomControllerProvider',
    'observeFileViewerZoomController',
    'clearFileViewerZoomControllerProvider',
    'destroyFileViewerZoomController',
    'runFileViewerZoomControllerAction'
  ], vueZoomHookLabel)
  for (const forbiddenToken of [
    'applyFileViewerZoomState',
    'cloneFileViewerZoomState',
    'controller.destroy()',
    'controller.clearProvider()',
    'const applyState',
    'state.scale = normalized.scale',
    'state.maxScale = normalized.maxScale'
  ]) {
    assert(
      !vueZoomHookSource.includes(forbiddenToken),
      `${vueZoomHookLabel} must delegate zoom state application to @file-viewer/core instead of ${forbiddenToken}`
    )
  }

  const vueToolbarHookSource = await readSource(entry, 'src/package/components/FileViewer/hooks/useViewerToolbar.ts')
  const vueToolbarHookLabel = `${entry.packageName} src/package/components/FileViewer/hooks/useViewerToolbar.ts`
  assertImportsFrom(vueToolbarHookSource, '@file-viewer/core', vueToolbarHookLabel)
  assertTokens(vueToolbarHookSource, [
    'createFileViewerOriginalSourceState',
    'dispatchFileViewerOperationAvailabilityChange',
    'dispatchFileViewerZoomChange',
    'resolveFileViewerToolbarState',
    'isFileViewerZoomButtonDisabled'
  ], vueToolbarHookLabel)
  for (const forbiddenToken of [
    "createFileViewerRawPostMessagePayload('flyfish-viewer:operation'",
    'postFileViewerMessageToParent(',
    'resolveFileViewerOperationAvailability',
    'resolveVisibleFileViewerToolbar',
    'resolveFileViewerToolbarPosition',
    'hasVisibleFileViewerToolbarActions',
    'loading.value || !!error.value',
    'const payload = { ...availability }',
    'hasOriginalSource: !!currentBuffer.value || !!currentSourceUrl.value',
    '!!currentBuffer.value || !!currentSourceUrl.value',
    'source: {',
    'toolbar.download || toolbar.print || toolbar.exportHtml || toolbar.zoom',
    'toolbarDisabled.value || !operationAvailability.value.zoom || !zoomState[action]',
    'cloneFileViewerOperationAvailability',
    'postFileViewerOperationAvailabilityChange',
    'postFileViewerZoomChange',
    'emitOperationAvailabilityChange(payload)',
    'postFileViewerOperationAvailabilityChange(payload)',
    'postFileViewerZoomChange(state)'
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
    'createFileViewerOperationActionHandlers',
    'FileViewerOperationActionErrorContext'
  ], vueExportHookLabel)
  for (const forbiddenToken of [
    'createFileViewerOriginalSourceState',
    'executeFileViewerDownloadOperation',
    'executeFileViewerExportHtmlOperation',
    'executeFileViewerPrintOperation',
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
    'applyFileViewerRenderSurfaceState',
    'createFileViewerRenderReadinessTarget',
    'createFileViewerRenderSurfaceStateTarget',
    'disposeFileViewerRendererSession',
    'runFileViewerRenderSurfaceClear',
    'runFileViewerRenderSurfaceMount'
  ], vueRenderSurfaceHookLabel)
  for (const forbiddenToken of [
    'applyFileViewerRenderReadinessState',
    'createFileViewerRenderTarget',
    'removeFileViewerRenderTarget',
    'resetFileViewerRenderSurface',
    'get renderedReady(): boolean',
    'set renderedReady(value: boolean)',
    'get progressiveReady(): boolean',
    'set progressiveReady(value: boolean)',
    'get session(): FileViewerVueRenderSession | null',
    'set session(value: FileViewerVueRenderSession | null)',
    'get exportAdapter(): FileRenderExportAdapter | null',
    'set exportAdapter(value: FileRenderExportAdapter | null)',
    'waitForFileViewerNextPaint',
    'const context = notifyActiveUnloadStart',
    'notifyActiveUnloadComplete(context, reason)',
    'const waitForBrowserPaint',
    'requestAnimationFrame !==',
    'setTimeout(resolve',
    'session.destroy?.()',
    "'then' in result",
    'Promise<void>).catch',
    'while (out.firstChild)',
    'out.removeChild',
    'clearFileViewerRenderSurface',
    'disposeActiveFileViewerRendererSession',
    "document.createElement('div')",
    "child.className = 'file-render'",
    'activeRenderSession = session',
    'activeRenderSession = null',
    'activeExportAdapter.value = null',
    'activeExportAdapter.value = adapter',
    'renderedReady.value = false',
    'progressiveReady.value = false',
    'progressiveReady.value = true',
    'refreshZoomProvider()',
    'void refreshDocumentIndex()'
  ]) {
    assert(
      !vueRenderSurfaceHookSource.includes(forbiddenToken),
      `${vueRenderSurfaceHookLabel} must delegate paint scheduling, DOM surface handling and renderer session disposal to @file-viewer/core instead of ${forbiddenToken}`
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
    'buildFileViewerOperationContextFromLifecycleState',
    'createFileViewerLoadStartState',
    'createFileViewerRenderCompleteState',
    'createFileViewerLifecycleStateController',
    'dispatchFileViewerLifecycleEvent',
    'dispatchFileViewerOperationContextEvent',
    'runFileViewerActiveUnloadComplete',
    'runFileViewerActiveUnloadStart',
    'runFileViewerBeforeOperation',
  ], vueLifecycleHookLabel)
  for (const forbiddenToken of [
    'new Map<number, number>()',
    'let activeDocumentContext',
    'lifecycleState.buildActiveUnloadContext',
    'createFileViewerPostMessagePayload',
    'postFileViewerMessageToParent(',
    'postFileViewerLifecycleEvent',
    'postFileViewerOperationContextEvent',
    'runFileViewerLifecycleHook',
    'emitLifecycle(context.phase, context)',
    'emitOperationBefore(nextContext)',
    'emitOperationCancel(nextContext)',
    'buildFileViewerLifecycleContext',
    'resolveFileViewerLifecycleFallbackSource',
    'buildFileViewerOperationContext(',
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
