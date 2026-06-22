import { existsSync } from 'node:fs'
import { readdir, readFile } from 'node:fs/promises'
import { dirname, extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const sourceRoot = resolve(scriptDir, '..')
const coreDir = join(sourceRoot, 'packages', 'core')
const coreSrcDir = join(coreDir, 'src')

const requiredValueExports = [
  'createRendererRegistry',
  'coreBrowserRendererHandlers',
  'createFileViewerCoreRendererRegistry',
  'fileViewerCoreRendererDispatcher',
  'fileViewerCoreRendererRegistry',
  'fileViewerCoreRendererRegistryBridge',
  'missingFileViewerCoreRendererHandlers',
  'renderFileViewerArchive',
  'renderFileViewerAudio',
  'renderFileViewerCad',
  'renderFileViewerCode',
  'renderFileViewerDataAsset',
  'renderFileViewerDrawing',
  'renderFileViewerEda',
  'renderFileViewerEmail',
  'renderFileViewerEpub',
  'renderFileViewerGeo',
  'renderFileViewerImage',
  'renderFileViewerMarkdown',
  'renderFileViewerModel',
  'renderFileViewerOfd',
  'renderFileViewerOpenDocument',
  'renderFileViewerPdf',
  'parseEdaFile',
  'renderFileViewerPptx',
  'renderFileViewerSpreadsheet',
  'renderFileViewerTypst',
  'renderFileViewerUmd',
  'renderFileViewerVideo',
  'renderFileViewerWordDoc',
  'renderFileViewerWordDocx',
  'createFileViewerRendererDispatcher',
  'createFileRenderHandlerRegistry',
  'normalizeSource',
  'resolveFileViewerRemoteSourcePlan',
  'resolveFileViewerSourceFilename',
  'readFileViewerBuffer',
  'readFileViewerDataUrl',
  'readFileViewerText',
  'sanitizeFileViewerOptions',
  'serializeFileViewerOptions',
  'parseFileViewerOptions',
  'normalizeFileViewerTheme',
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
  'resolveFileViewerPageHref',
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
  'DEFAULT_FILE_VIEWER_DATA_SQL_WASM_URL',
  'DEFAULT_FILE_VIEWER_DOCX_WORKER_JSZIP_PATH',
  'DEFAULT_FILE_VIEWER_DOCX_WORKER_PATH',
  'DEFAULT_FILE_VIEWER_SPREADSHEET_WORKER_PATH',
  'resolveFileViewerDataSqlWasmUrl',
  'resolveFileViewerDocxWorkerJsZipUrl',
  'resolveFileViewerDocxWorkerUrl',
  'resolveFileViewerSpreadsheetWorkerUrl',
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
  'dispatchFileViewerLifecycleEvent',
  'dispatchFileViewerOperationContextEvent',
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
  'applyFileViewerLoadingState',
  'syncFileViewerLoadingControllerState',
  'runFileViewerLoadingControllerAction',
  'runFileViewerLoadingExtensionSync',
  'createFileViewerLoadingControllerActionHandlers',
  'FILE_VIEWER_OPERATION_ACTION_ERROR_PREFIXES',
  'resolveFileViewerOperationActionErrorMessage',
  'createFileViewerRenderReadinessTarget',
  'createFileViewerRenderSurfaceState',
  'createFileViewerRenderSurfaceStateTarget',
  'disposeActiveFileViewerRendererSession',
  'disposeFileViewerRendererSession',
  'DEFAULT_FILE_VIEWER_RENDER_SESSION_DISPOSE_ERROR_LOGGER',
  'FILE_VIEWER_RENDER_SESSION_DISPOSE_ERROR_MESSAGE',
  'reportFileViewerRenderSessionDisposeError',
  'resolveFileViewerRenderSessionDisposeErrorMessage',
  'applyFileViewerSearchState',
  'cloneFileViewerSearchState',
  'createFileViewerSearchChangeState',
  'dispatchFileViewerSearchChange',
  'dispatchFileViewerLocationChange',
  'applyFileViewerZoomState',
  'createFileViewerZoomChangeState',
  'createFileViewerZoomChangeEmitter',
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
  'FileViewerFileRefSourcePlan',
  'FileViewerFileOperationType',
  'FileViewerOperationActionErrorContext',
  'FileViewerOperationActionErrorFormatter',
  'FileViewerOperationActionErrorPrefixes',
  'FileViewerLoadingControllerActionHandlers',
  'FileViewerLifecycleFacade',
  'FileViewerLocalFilePreviewState',
  'ResolveFileViewerFileRefSourcePlanInput',
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
  'FileViewerDocumentFeatureActionOptions',
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
  'ViewerCapabilityState',
  'ViewerLifecycleContext',
  'ViewerOperationContext',
  'FileRenderContext',
  'FileRenderExportAdapter',
  'FileViewerSerializableOptions',
  'FileViewerRenderedInstance',
  'FileViewerComponentProps',
  'FileViewerComponentEmits',
  'FileViewerComponentEventMap',
  'FileViewerPublicApi',
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
  'FileViewerLoadingState',
  'MutableFileViewerLoadingState',
  'RunFileViewerLoadingExtensionSyncInput',
  'MutableFileViewerSearchState',
  'MutableFileViewerZoomState',
  'FileViewerWatermarkPresentationState',
  'FileViewerWatermarkStyle',
  'EdaDiagnostic',
  'EdaDiagnosticLevel',
  'EdaDomainRole',
  'EdaEntity',
  'EdaFileType',
  'EdaParseResult',
  'EdaParserMode',
  'EdaProperty',
  'EdaStats',
  'EdaStreamKind',
  'EdaStreamView',
  'EdaTreeNode'
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

const requiredHeadlessValueExports = [
  'DEFAULT_RENDERER_DEFINITIONS',
  'DEFAULT_SUPPORTED_EXTENSIONS',
  'normalizeSource',
  'readFileViewerBuffer',
  'sanitizeFileViewerOptions',
  'serializeFileViewerOptions',
  'parseFileViewerOptions',
  'resolveFileViewerOperationAvailability',
  'buildFileViewerDocumentTextChunks',
  'createRendererRegistry',
  'createFileViewerRendererDispatcher',
  'createFileRenderHandlerRegistry'
]

const requiredHeadlessTypeExports = [
  'FileViewerOptions',
  'FileViewerSource',
  'RendererDefinition',
  'RendererRegistry',
  'RendererSession',
  'FileViewerOperationAvailability',
  'FileViewerLifecycleContext',
  'FileViewerSearchState',
  'FileViewerZoomState'
]

const forbiddenHeadlessApiTokens = [
  'createViewer',
  'coreBrowserRendererHandlers',
  'fileViewerCoreRendererDispatcher',
  'renderFileViewer',
  'createFileViewerDomSearchController',
  'createFileViewerZoomController',
  'collectFileViewerDocumentAnchors',
  'buildFileViewerRenderedHtmlDocument',
  'triggerFileViewerBlobDownload',
  'waitForFileViewerPrintWindowReady'
]

const requiredBrowserApiTokens = [
  'createViewer',
  'coreBrowserRendererHandlers',
  'renderFileViewerPdf',
  'renderFileViewerWordDocx',
  'renderFileViewerSpreadsheet',
  'createFileViewerDomSearchController',
  'createFileViewerZoomController',
  'buildFileViewerRenderedHtmlDocument'
]

const forbiddenCoreSourceExtensions = new Set(['.jsx', '.tsx', '.vue', '.svelte'])
const allowedCoreDevDependencies = new Set([
  'typescript',
  '@types/three',
  '@types/tinycolor2',
  '@types/pako'
])
const allowedCoreRendererDependencies = new Set([
  '@file-viewer/docx',
  '@file-viewer/pptx'
])
const forbiddenCoreDependencyPrefixes = [
  'vue',
  '@vue/',
  '@vitejs/plugin-vue',
  'vue-tsc',
  '@lucide/vue',
  'react',
  'react-dom',
  'svelte',
  '@file-viewer/',
  '@flyfish-group/',
  'file-viewer3'
]
const forbiddenCoreApiTokens = [
  'mountViewer',
  'ViewerMountOptions',
  'ViewerController',
  'ViewerControllerHandle',
  'createViewerControllerHandle',
  'createFileViewerNativeController',
  'resolveFileViewerNativeLoadSource',
  'FileViewerNativeController',
  'FileViewerNativeFetchFile',
  'FileViewerNativeFetchInput',
  'FileViewerNativeSource'
]

function isForbiddenCoreDependency(name) {
  if (allowedCoreRendererDependencies.has(name)) {
    return false
  }
  return forbiddenCoreDependencyPrefixes.some(prefix =>
    prefix.endsWith('/')
      ? name.startsWith(prefix)
      : name === prefix
  )
}
const forbiddenCoreFilenames = new Set([
  'nativeController.ts',
  'frame.ts'
])
const forbiddenCoreBrowserGlobalPatterns = [
  /document\.baseURI/,
  /location\.href/,
  /typeof\s+location/,
  /typeof\s+document/,
]

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
  assert(packageJson.exports?.['./headless']?.import === './dist/headless.js', 'Core package exports["./headless"].import drifted')
  assert(packageJson.exports?.['./headless']?.types === './dist/headless.d.ts', 'Core package exports["./headless"].types drifted')
  assert(packageJson.exports?.['./browser']?.import === './dist/browser.js', 'Core package exports["./browser"].import drifted')
  assert(packageJson.exports?.['./browser']?.types === './dist/browser.d.ts', 'Core package exports["./browser"].types drifted')
  assert(!packageJson.peerDependencies, 'Core package must not have peer dependencies')
  assert(!packageJson.optionalDependencies, 'Core package must not have optional dependencies')
  for (const dependencyName of Object.keys(packageJson.dependencies || {})) {
    assert(
      !isForbiddenCoreDependency(dependencyName),
      `Core package dependencies must stay framework-neutral; unexpected ${dependencyName}`
    )
  }
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
  assert(
    (tsconfig.include || []).includes('src/**/*.d.ts'),
    'Core tsconfig must include src/**/*.d.ts for renderer ambient module declarations'
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

function assertCoreHeadlessEntrypoint(headlessSource) {
  for (const exportName of requiredHeadlessValueExports) {
    assert(hasToken(headlessSource, exportName), `Core headless entrypoint must export ${exportName}`)
  }
  for (const typeName of requiredHeadlessTypeExports) {
    assert(hasToken(headlessSource, typeName), `Core headless entrypoint must export type ${typeName}`)
  }
  for (const token of forbiddenHeadlessApiTokens) {
    assert(
      !hasToken(headlessSource, token),
      `Core headless entrypoint must not expose browser renderer token ${token}`
    )
  }
}

function assertCoreBrowserEntrypoint(browserSource, indexSource) {
  assert(
    /export\s+\*\s+from\s+['"]\.\/index['"]/.test(browserSource),
    'Core browser entrypoint must explicitly re-export the browser-capable root API'
  )
  for (const token of requiredBrowserApiTokens) {
    assert(hasToken(indexSource, token), `Core browser entrypoint must expose ${token} through the root API`)
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

function packageNameFromSpecifier(specifier) {
  if (specifier.startsWith('@')) {
    return specifier.split('/').slice(0, 2).join('/')
  }
  return specifier.split('/')[0]
}

async function assertCoreSourceBoundary(files) {
  for (const file of files) {
    const extension = extname(file)
    const relativePath = file.slice(coreDir.length + 1)
    assert(
      !forbiddenCoreFilenames.has(relativePath),
      `Core source must not include wrapper or iframe orchestration file ${relativePath}`
    )
    assert(
      !forbiddenCoreSourceExtensions.has(extension),
      `Core source must remain pure TypeScript; unexpected ${relativePath}`
    )
    if (extension !== '.ts') {
      continue
    }
    const source = await readFile(file, 'utf8')
    for (const token of forbiddenCoreApiTokens) {
      assert(
        !hasToken(source, token),
        `Core source must not expose wrapper/browser mount API token ${token}: ${relativePath}`
      )
    }
    for (const pattern of forbiddenCoreBrowserGlobalPatterns) {
      assert(
        !pattern.test(source),
        `Core source must not read browser document/location globals: ${relativePath}`
      )
    }
    const declaredDependencies = new Set(Object.keys(packageJson.dependencies || {}))
    for (const specifier of collectBareImportSpecifiers(source)) {
      const packageName = packageNameFromSpecifier(specifier)
      assert(
        !isForbiddenCoreDependency(packageName),
        `Core source must not import framework or wrapper package ${specifier}: ${relativePath}`
      )
      assert(
        declaredDependencies.has(packageName),
        `Core source imports ${specifier} but ${packageName} is not declared in core dependencies: ${relativePath}`
      )
    }
  }
}

assert(existsSync(coreDir), 'Missing packages/core')
assert(existsSync(coreSrcDir), 'Missing packages/core/src')

const packageJson = await readJson(join(coreDir, 'package.json'))
const tsconfig = await readJson(join(coreDir, 'tsconfig.json'))
const indexSource = await readFile(join(coreSrcDir, 'index.ts'), 'utf8')
const headlessSource = await readFile(join(coreSrcDir, 'headless.ts'), 'utf8')
const browserSource = await readFile(join(coreSrcDir, 'browser.ts'), 'utf8')
const typesSource = await readFile(join(coreSrcDir, 'contracts', 'types.ts'), 'utf8')
const sourceFiles = await readAllSourceFiles(coreSrcDir)

assertCorePackageMetadata(packageJson)
assertCoreTsConfig(tsconfig)
assertCoreEntrypoint(indexSource)
assertCoreHeadlessEntrypoint(headlessSource)
assertCoreBrowserEntrypoint(browserSource, indexSource)
assertCoreInstanceContract(typesSource)
await assertCoreSourceBoundary(sourceFiles)

console.log(
  `[core-api] Verified ${requiredValueExports.length} root value exports, ${requiredTypeExports.length} root type exports, ${requiredHeadlessValueExports.length} headless value exports, ${requiredBrowserApiTokens.length} browser API tokens, ${requiredInstanceMethods.length} instance methods, and ${sourceFiles.length} pure TS core files.`
)
