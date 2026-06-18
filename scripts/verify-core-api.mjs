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
  'resolveFileViewerRemoteSourcePlan',
  'resolveFileViewerSourceFilename',
  'postFileViewerSearchChange',
  'postFileViewerLocationChange',
  'readFileViewerBuffer',
  'readFileViewerDataUrl',
  'readFileViewerText',
  'sanitizeFileViewerOptions',
  'serializeFileViewerOptions',
  'parseFileViewerOptions',
  'normalizeFileViewerTheme',
  'buildFileViewerFrameSrc',
  'toFileViewerFrameOptions',
  'createFileViewerDirectFrameController',
  'createFileViewerDirectFrameHandle',
  'createFileViewerMountedFrameHandle',
  'createFileViewerFrameControllerHandle',
  'mountFileViewerFrame',
  'resolveFileViewerPresentationState',
  'cancelFileViewerPreviewRequest',
  'DEFAULT_FILE_VIEWER_SOURCE_FILENAME',
  'DEFAULT_FILE_VIEWER_STREAMING_PDF_FILENAME',
  'createFileViewerEmptyPreviewState',
  'createFileViewerPreviewRequestResetState',
  'createFileViewerPreviewStateTarget',
  'applyFileViewerPreviewRequestResetState',
  'applyFileViewerEmptyPreviewState',
  'resolveFileViewerFileRefSourcePlan',
  'applyFileViewerPreviewFilenameState',
  'createFileViewerReadPreviewState',
  'applyFileViewerReadPreviewState',
  'applyFileViewerPreviewSourceUrlState',
  'applyFileViewerRenderReadinessState',
  'createFileViewerRenderCompleteState',
  'commitFileViewerEmptyPreviewResetState',
  'commitFileViewerLoadStartState',
  'commitFileViewerPreviewRequestStartState',
  'commitFileViewerRenderCompleteState',
  'commitFileViewerRemoteDownloadState',
  'createFileViewerLoadStartState',
  'createFileViewerRequestScope',
  'createFileViewerSourceLoadingActionHandlers',
  'createFileViewerStreamingPdfPlaceholderFile',
  'finalizeFileViewerPreviewLoadState',
  'hasFileViewerPreviewSource',
  'normalizeFileViewerSourceUrl',
  'resolveFileViewerLoadStartMessage',
  'DEFAULT_FILE_VIEWER_PREVIEW_LOAD_ERROR_LOGGER',
  'FILE_VIEWER_PREVIEW_LOAD_ERROR_PREFIXES',
  'FILE_VIEWER_REMOTE_MISSING_DATA_ERROR_MESSAGE',
  'resolveFileViewerMissingRemoteDataErrorMessage',
  'resolveFileViewerPreviewLoadErrorMessage',
  'resolveFileViewerRuntimePageHref',
  'resolveFileViewerPreviewRequestReason',
  'reportFileViewerMissingRemoteData',
  'reportFileViewerPreviewLoadError',
  'runFileViewerLocalFilePreview',
  'runFileViewerPreviewComponentUnmount',
  'runFileViewerPreviewRequest',
  'runFileViewerPreviewSourceChange',
  'runFileViewerRemoteFilePreview',
  'runFileViewerReadAndRenderFile',
  'runFileViewerStreamingPdfPreview',
  'DEFAULT_FILE_VIEWER_DOWNLOAD_FILENAME',
  'DEFAULT_FILE_VIEWER_EXPORT_FILENAME',
  'DEFAULT_FILE_VIEWER_PREVIEW_TITLE',
  'createFileViewerOriginalSourceState',
  'createFileViewerOriginalSourceStateFromNormalizedSource',
  'resolveFileViewerDisplayFilename',
  'resolveFileViewerOperationFilename',
  'resolveFileViewerOperationAvailability',
  'cloneFileViewerOperationAvailability',
  'resolveVisibleFileViewerToolbar',
  'hasVisibleFileViewerToolbarActions',
  'isFileViewerZoomButtonDisabled',
  'resolveFileViewerToolbarState',
  'createFileViewerPublicApi',
  'buildFileViewerLifecycleContextFromNormalizedSource',
  'buildFileViewerOperationContextFromLifecycleState',
  'createFileViewerLifecycleActions',
  'createFileViewerLifecycleStateController',
  'createFileViewerToolbarActions',
  'createFileViewerToolbarControllerActionHandlers',
  'createFileViewerToolbarZoomSyncSnapshot',
  'postFileViewerLifecycleEvent',
  'postFileViewerOperationContextEvent',
  'dispatchFileViewerLifecycleEvent',
  'dispatchFileViewerOperationContextEvent',
  'postFileViewerOperationAvailabilityChange',
  'postFileViewerZoomChange',
  'dispatchFileViewerOperationAvailabilityChange',
  'dispatchFileViewerZoomChange',
  'emitFileViewerComponentLifecycleEvent',
  'FILE_VIEWER_BEFORE_OPERATION_ERROR_PREFIX',
  'FILE_VIEWER_LIFECYCLE_HOOK_ERROR_MESSAGE_PREFIX',
  'DEFAULT_FILE_VIEWER_LIFECYCLE_HOOK_ERROR_LOGGER',
  'DEFAULT_FILE_VIEWER_OPERATION_ERROR_LOGGER',
  'resolveFileViewerBeforeOperationErrorMessage',
  'resolveFileViewerLifecycleHookErrorMessage',
  'reportFileViewerLifecycleHookError',
  'reportFileViewerOperationError',
  'runFileViewerActiveUnloadComplete',
  'runFileViewerActiveUnloadStart',
  'runFileViewerBeforeOperation',
  'runFileViewerLifecycleHook',
  'createFileViewerLifecycleFacade',
  'runFileViewerToolbarAvailabilitySync',
  'runFileViewerToolbarZoomSync',
  'resolveFileViewerLifecycleFallbackSource',
  'applyFileViewerLoadingRuntimeState',
  'syncFileViewerLoadingControllerState',
  'runFileViewerLoadingControllerAction',
  'runFileViewerLoadingExtensionSync',
  'createFileViewerLoadingControllerActionHandlers',
  'executeFileViewerDownloadOperation',
  'executeFileViewerExportHtmlOperation',
  'executeFileViewerPrintOperation',
  'FILE_VIEWER_OPERATION_ACTION_ERROR_PREFIXES',
  'createFileViewerOperationActionHandlers',
  'createFileViewerPublicOperationActionHandlers',
  'resolveFileViewerOperationActionErrorMessage',
  'DEFAULT_FILE_VIEWER_RENDER_TARGET_CLASS',
  'applyFileViewerRenderSurfaceState',
  'clearFileViewerRenderSurface',
  'createFileViewerRenderReadinessTarget',
  'createFileViewerRenderSurfaceActionHandlers',
  'createFileViewerRenderSurfaceState',
  'createFileViewerRenderSurfaceStateTarget',
  'createFileViewerRenderTarget',
  'disposeActiveFileViewerRendererSession',
  'disposeFileViewerRendererSession',
  'DEFAULT_FILE_VIEWER_RENDER_SESSION_DISPOSE_ERROR_LOGGER',
  'FILE_VIEWER_RENDER_SESSION_DISPOSE_ERROR_MESSAGE',
  'reportFileViewerRenderSessionDisposeError',
  'resolveFileViewerRenderSessionDisposeErrorMessage',
  'resetFileViewerRenderSurface',
  'runFileViewerRenderSurfaceClear',
  'runFileViewerRenderSurfaceMount',
  'removeFileViewerRenderTarget',
  'waitForFileViewerNextPaint',
  'collectFileViewerDocumentAnchors',
  'applyFileViewerSearchState',
  'cloneFileViewerSearchState',
  'createFileViewerSearchChangeState',
  'createFileViewerDocumentFeatureActions',
  'createFileViewerDocumentFeatureControllerActionHandlers',
  'resolveFileViewerLocationChangeAnchor',
  'createFileViewerDocumentChangeSnapshot',
  'dispatchFileViewerSearchChange',
  'dispatchFileViewerLocationChange',
  'resolveFileViewerScrollContainer',
  'createFileViewerDomSearchController',
  'createFileViewerDomSearchControllerActionHandlers',
  'syncFileViewerDomSearchControllerState',
  'observeFileViewerDomSearchController',
  'runFileViewerDomSearchControllerAction',
  'destroyFileViewerDomSearchController',
  'applyFileViewerZoomState',
  'createFileViewerZoomChangeState',
  'syncFileViewerZoomControllerState',
  'refreshFileViewerZoomControllerProvider',
  'observeFileViewerZoomController',
  'clearFileViewerZoomControllerProvider',
  'destroyFileViewerZoomController',
  'runFileViewerZoomControllerAction',
  'createFileViewerZoomChangeEmitter',
  'createFileViewerZoomController',
  'createFileViewerZoomControllerActionHandlers',
  'buildFileViewerWatermarkStyle',
  'resolveFileViewerWatermarkPresentationState',
  'createFileViewerWorkerController',
  'resolveFileViewerRendererAssets',
  'DEFAULT_RENDERER_DEFINITIONS',
  'DEFAULT_SUPPORTED_EXTENSIONS'
]

const requiredTypeExports = [
  'CancelFileViewerPreviewRequestInput',
  'FileViewerOptions',
  'FileViewerReadResult',
  'FileViewerSource',
  'FileViewerLocationLike',
  'FileViewerDocumentFeatureActions',
  'FileViewerDocumentFeatureSearchController',
  'FileViewerDomSearchControllerActionHandlers',
  'FileViewerFileRefSourcePlan',
  'FileViewerFileOperationType',
  'FileViewerOperationActionErrorContext',
  'FileViewerOperationActionErrorFormatter',
  'FileViewerOperationActionErrorPrefixes',
  'FileViewerOperationActionHandlers',
  'FileViewerPublicOperationActionHandlers',
  'FileViewerZoomControllerActionHandlers',
  'FileViewerLoadingControllerActionHandlers',
  'FileViewerLifecycleFacade',
  'FileViewerLocalFilePreviewState',
  'ResolveFileViewerFileRefSourcePlanInput',
  'CreateFileViewerOperationActionHandlersInput',
  'FileViewerOriginalSourceState',
  'FileViewerInstance',
  'FileViewerLifecycleContext',
  'FileViewerLifecycleHooks',
  'FileViewerLifecycleActions',
  'FileViewerLifecycleComponentEmit',
  'FileViewerLifecycleHookErrorLogger',
  'FileViewerOperationErrorLogger',
  'FileViewerErrorMessageFormatter',
  'FileViewerToolbarActions',
  'FileViewerToolbarControllerActionHandlers',
  'FileViewerToolbarZoomSyncSnapshot',
  'FileViewerZoomButtonAction',
  'FileViewerOperationContext',
  'FileViewerActiveUnloadState',
  'FileViewerBeforeOperation',
  'FileViewerPreviewLoadErrorKind',
  'FileViewerPreviewLoadErrorPrefixes',
  'FileViewerPreviewLoadErrorLogger',
  'FileViewerPreviewRequestResetState',
  'FileViewerPreviewRequestRunState',
  'FileViewerRequestController',
  'FileViewerRequestScope',
  'FileViewerSourceLoadingActionHandlers',
  'FileViewerReadAndRenderFileState',
  'FileViewerReadPreviewState',
  'FileViewerRenderReadinessState',
  'FileViewerRenderCompleteState',
  'FileViewerRemoteDownloadState',
  'FileViewerRemoteFileDownloadInput',
  'FileViewerRemoteFilePreviewErrorKind',
  'FileViewerRemoteFilePreviewState',
  'FileViewerStreamingPdfPreviewState',
  'FileViewerLoadStartState',
  'CreateFileViewerLifecycleActionsInput',
  'CreateFileViewerPublicApiInput',
  'CreateFileViewerToolbarActionsInput',
  'CreateFileViewerToolbarControllerActionHandlersInput',
  'ResolveFileViewerBeforeOperationErrorMessageInput',
  'ResolveFileViewerLifecycleHookErrorMessageInput',
  'ReportFileViewerLifecycleHookErrorInput',
  'ReportFileViewerOperationErrorInput',
  'ResolveFileViewerMissingRemoteDataErrorMessageInput',
  'ResolveFileViewerPreviewLoadErrorMessageInput',
  'ReportFileViewerMissingRemoteDataInput',
  'ReportFileViewerPreviewLoadErrorInput',
  'CreateFileViewerDocumentFeatureActionsInput',
  'CreateFileViewerDocumentFeatureControllerActionHandlersInput',
  'FileViewerDocumentFeatureControllerActionHandlers',
  'FileViewerPreviewComponentUnmountState',
  'FileViewerRenderSurfaceActionHandlers',
  'FileViewerRenderSurfaceState',
  'FileViewerRenderSurfaceMountContext',
  'FileViewerRenderSurfaceClearState',
  'CreateFileViewerRenderSurfaceActionHandlersInput',
  'CreateFileViewerRenderReadinessTargetInput',
  'CreateFileViewerRenderSurfaceStateTargetInput',
  'FinalizeFileViewerPreviewLoadStateInput',
  'RunFileViewerActiveUnloadCompleteInput',
  'RunFileViewerActiveUnloadStartInput',
  'RunFileViewerToolbarAvailabilitySyncInput',
  'RunFileViewerToolbarZoomSyncInput',
  'RunFileViewerRenderSurfaceClearInput',
  'RunFileViewerRenderSurfaceMountInput',
  'RunFileViewerLocalFilePreviewInput',
  'RunFileViewerPreviewComponentUnmountInput',
  'RunFileViewerPreviewRequestInput',
  'RunFileViewerPreviewSourceChangeInput',
  'RunFileViewerRemoteFilePreviewInput',
  'RunFileViewerReadAndRenderFileInput',
  'RunFileViewerStreamingPdfPreviewInput',
  'CreateFileViewerSourceLoadingActionHandlersInput',
  'CreateFileViewerReadPreviewStateInput',
  'CreateFileViewerRenderCompleteStateInput',
  'CommitFileViewerEmptyPreviewResetStateInput',
  'CommitFileViewerLoadStartStateInput',
  'CommitFileViewerPreviewRequestStartStateInput',
  'CommitFileViewerRenderCompleteStateInput',
  'CommitFileViewerRemoteDownloadStateInput',
  'CreateFileViewerLoadStartStateInput',
  'CreateFileViewerPreviewStateTargetInput',
  'FileViewerMutableAccessor',
  'MutableFileViewerPreviewRequestState',
  'MutableFileViewerPreviewState',
  'MutableFileViewerPreviewFilenameState',
  'MutableFileViewerRenderReadinessState',
  'MutableFileViewerRenderSurfaceState',
  'ResetFileViewerRenderSurfaceInput',
  'ReportFileViewerRenderSessionDisposeErrorInput',
  'FileViewerRenderSessionDisposeErrorLogger',
  'ResolveFileViewerRenderSessionDisposeErrorMessageInput',
  'MutableFileViewerReadPreviewState',
  'MutableFileViewerPreviewSourceUrlState',
  'FileViewerLifecycleStateController',
  'FileViewerOperationAvailability',
  'FileViewerToolbarState',
  'ResolveFileViewerToolbarStateInput',
  'FileViewerSearchState',
  'FileViewerZoomState',
  'FileViewerDocumentAnchor',
  'FileViewerDocumentChunk',
  'ResolveFileViewerOperationFilenameInput',
  'ResolveFileViewerOperationActionErrorMessageInput',
  'DisposeFileViewerRendererSessionOptions',
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
  'FileViewerDirectFrameController',
  'FileViewerDirectFrameControllerAccessor',
  'FileViewerDirectFrameControllerOptions',
  'FileViewerFrameComponentBridgeOptions',
  'FileViewerFrameComponentProps',
  'FileViewerFrameContainerComponentProps',
  'FileViewerFrameHostComponentProps',
  'FileViewerFrameIframeComponentProps',
  'FileViewerDirectFrameHandle',
  'FileViewerMountedFrameHandle',
  'FileViewerFrameControllerHandle',
  'BuildFileViewerLifecycleContextFromNormalizedSourceInput',
  'BuildFileViewerOperationContextFromLifecycleStateInput',
  'BuildFileViewerLifecycleFacadeLoadStartStateInput',
  'BuildFileViewerLifecycleFacadeRenderCompleteStateInput',
  'CreateFileViewerLifecycleFacadeInput',
  'DispatchFileViewerLifecycleEventInput',
  'DispatchFileViewerOperationContextEventInput',
  'DispatchFileViewerOperationAvailabilityChangeInput',
  'DispatchFileViewerZoomChangeInput',
  'DispatchFileViewerSearchChangeInput',
  'DispatchFileViewerLocationChangeInput',
  'FileViewerPresentationState',
  'ResolveFileViewerPresentationStateInput',
  'FileViewerWorkerController',
  'FileViewerLoadingRuntimeState',
  'MutableFileViewerLoadingRuntimeState',
  'RunFileViewerLoadingExtensionSyncInput',
  'MutableFileViewerSearchState',
  'MutableFileViewerZoomState',
  'FileViewerWatermarkPresentationState',
  'FileViewerWatermarkStyle'
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

function assertCoreViewerSurfaceState(viewerSource) {
  for (const token of [
    'createFileViewerRenderSurfaceState',
    'applyFileViewerRenderSurfaceState',
    'renderSurfaceState.session',
    'renderSurfaceState.exportAdapter'
  ]) {
    assert(
      viewerSource.includes(token),
      `createViewer must reuse core render surface state via ${token}`
    )
  }

  for (const forbiddenToken of [
    'let currentSession',
    'let activeExportAdapter',
    'currentSession =',
    'activeExportAdapter ='
  ]) {
    assert(
      !viewerSource.includes(forbiddenToken),
      `createViewer must not keep duplicate render surface state: ${forbiddenToken}`
    )
  }
}

function assertCoreViewerOperationSourceState(viewerSource) {
  for (const token of [
    'createFileViewerOriginalSourceStateFromNormalizedSource',
    'resolveFileViewerDisplayFilename'
  ]) {
    assert(
      viewerSource.includes(token),
      `createViewer must reuse core operation source helpers via ${token}`
    )
  }

  for (const forbiddenToken of [
    'const getDisplayFilename',
    "currentSource?.filename || 'preview'",
    'createFileViewerOriginalSourceState({'
  ]) {
    assert(
      !viewerSource.includes(forbiddenToken),
      `createViewer must not keep duplicate operation source state: ${forbiddenToken}`
    )
  }
}

function assertCoreViewerLifecycleSourceState(viewerSource) {
  assert(
    viewerSource.includes('buildFileViewerLifecycleContextFromNormalizedSource'),
    'createViewer must build lifecycle contexts from normalized source through core helper'
  )

  for (const forbiddenToken of [
    'buildFileViewerLifecycleContext({',
    "typeof File !== 'undefined' && source.file instanceof File",
    "phase.endsWith('complete')",
    'filename: source.filename',
    'source: source.kind'
  ]) {
    assert(
      !viewerSource.includes(forbiddenToken),
      `createViewer must not keep duplicate lifecycle source state: ${forbiddenToken}`
    )
  }
}

function assertCoreViewerRequestScope(viewerSource) {
  for (const token of [
    'createFileViewerRequestScope',
    'requestScope.getCurrentVersion()',
    'requestScope.requestController.createVersion()'
  ]) {
    assert(
      viewerSource.includes(token),
      `createViewer must reuse core request scope via ${token}`
    )
  }

  for (const forbiddenToken of [
    'let version = 0',
    'version += 1',
    'requestController.version',
    'createFileViewerRequestController()'
  ]) {
    assert(
      !viewerSource.includes(forbiddenToken),
      `createViewer must not keep duplicate request version state: ${forbiddenToken}`
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
const viewerSource = await readFile(join(coreSrcDir, 'viewer.ts'), 'utf8')
const sourceFiles = await readAllSourceFiles(coreSrcDir)

await stat(join(coreSrcDir, 'viewer.ts'))

assertCorePackageMetadata(packageJson)
assertCoreTsConfig(tsconfig)
assertCoreEntrypoint(indexSource)
assertCoreInstanceContract(typesSource)
assertCoreViewerSurfaceState(viewerSource)
assertCoreViewerOperationSourceState(viewerSource)
assertCoreViewerLifecycleSourceState(viewerSource)
assertCoreViewerRequestScope(viewerSource)
await assertCoreSourceBoundary(sourceFiles)

console.log(
  `[core-api] Verified ${requiredValueExports.length} value exports, ${requiredTypeExports.length} type exports, ${requiredInstanceMethods.length} instance methods, and ${sourceFiles.length} pure TS core files.`
)
