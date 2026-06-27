import { constants } from 'node:fs'
import { access, readFile, readdir } from 'node:fs/promises'
import { dirname, extname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadEcosystemReleaseContext } from './lib/ecosystem-packages.mjs'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const sourceRoot = resolve(scriptDir, '..')
const { wrapperManifest } = await loadEcosystemReleaseContext(sourceRoot)
const sourceFileExtensions = new Set(['.ts', '.tsx', '.vue', '.js', '.mjs', '.svelte'])
const standardWrapperPackageNames = new Set(wrapperManifest.wrappers.map(wrapper => wrapper.packageName))

const forbiddenLegacyTokens = [
  'buildViewerSrc',
  'createViewerFrame',
  'createViewerFrameControllerHandle',
  'createViewerFrameFilePostController',
  'getIframe',
  'isViewerFrameEvent',
  'mountViewerFrame',
  'postFile',
  'postFileToViewer',
  'syncViewerFrame',
  'targetOrigin',
  'toViewerFrameOptions',
  'viewerUrl',
  'ViewerFrameComponentBridgeOptions',
  'ViewerFrameComponentProps',
  'ViewerFrameContainerComponentProps',
  'ViewerFrameControllerAccessor',
  'ViewerFrameHostComponentProps',
  'ViewerFrameIframeComponentProps',
  'ViewerFrameOptions'
]

const sharedOptionTypeExports = [
  'FileRef',
  'ViewerAiOptions',
  'ViewerArchiveOptions',
  'ViewerCadOptions',
  'ViewerController',
  'ViewerControllerAccessor',
  'ViewerControllerHandle',
  'ViewerDocxOptions',
  'ViewerEvent',
  'ViewerEventHandler',
  'ViewerEventType',
  'ViewerFetchFile',
  'ViewerFetchInput',
  'ViewerMountOptions',
  'ViewerOptions',
  'ViewerPdfOptions',
  'ViewerCoreOptions',
  'ViewerSearchOptions',
  'ViewerSourceInput',
  'ViewerThemeMode',
  'ViewerToolbarOptions',
  'ViewerToolbarPosition',
  'ViewerTypstOptions',
  'ViewerWatermarkOptions'
]

const webControllerMethods = [
  'load',
  'update',
  'reload',
  'destroy',
  'getApi',
  'downloadOriginalFile',
  'printRenderedHtml',
  'exportRenderedHtml',
  'zoomIn',
  'zoomOut',
  'resetZoom',
  'searchDocument',
  'clearDocumentSearch',
  'nextSearchResult',
  'previousSearchResult',
  'collectDocumentAnchors',
  'scrollToAnchor',
  'scrollToLine',
  'getDocumentTextChunks',
  'getOperationAvailability'
]

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

async function exists(path) {
  try {
    await access(path, constants.F_OK)
    return true
  } catch {
    return false
  }
}

async function readWrapperSource(wrapper) {
  const candidates = [
    join(sourceRoot, wrapper.packageDir, 'src', 'index.ts'),
    join(sourceRoot, wrapper.packageDir, 'src', 'index.tsx'),
    join(sourceRoot, wrapper.packageDir, 'src', 'package', 'index.ts')
  ]
  for (const candidate of candidates) {
    if (await exists(candidate)) {
      return {
        path: candidate,
        content: await readFile(candidate, 'utf8')
      }
    }
  }
  throw new Error(`${wrapper.packageName} must provide src/index.ts or src/index.tsx`)
}

async function readAllSourceFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (['dist', 'node_modules', 'viewer'].includes(entry.name)) {
        continue
      }
      files.push(...await readAllSourceFiles(path))
      continue
    }
    if (entry.isFile() && sourceFileExtensions.has(extname(entry.name))) {
      files.push(path)
    }
  }
  return files
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function hasToken(source, token) {
  return new RegExp(`\\b${escapeRegExp(token)}\\b`).test(source)
}

function assertTokens(source, tokens, label) {
  for (const token of tokens) {
    assert(hasToken(source, token), `${label} must include ${token}`)
  }
}

function assertNoLegacyIframeApi(source, label) {
  for (const token of forbiddenLegacyTokens) {
    assert(!hasToken(source, token), `${label} must not expose legacy standalone-page API token ${token}`)
  }
}

function assertImportsFrom(source, packageName, label) {
  assert(
    source.includes(`from '${packageName}'`) || source.includes(`from "${packageName}"`),
    `${label} must import from ${packageName}`
  )
}

function assertReferencesPackage(source, packageName, label) {
  assert(
    source.includes(`'${packageName}'`) ||
      source.includes(`"${packageName}"`) ||
      source.includes(`'${packageName}/`) ||
      source.includes(`"${packageName}/`),
    `${label} must reference ${packageName}`
  )
}

function assertImportsFromAny(source, packageNames, label) {
  assert(
    packageNames.some(packageName =>
      source.includes(`from '${packageName}'`) || source.includes(`from "${packageName}"`)
    ),
    `${label} must import from ${packageNames.join(' or ')}`
  )
}

function assertNotImportsFrom(source, packageName, label) {
  assert(
    !source.includes(`from '${packageName}'`) && !source.includes(`from "${packageName}"`),
    `${label} must not import from ${packageName}`
  )
}

function importsFromPackage(source, packageName) {
  return source.includes(`from '${packageName}'`) ||
    source.includes(`from "${packageName}"`) ||
    source.includes(`import('${packageName}')`) ||
    source.includes(`import("${packageName}")`)
}

async function assertNoWrapperToWrapperImports(wrapper) {
  const sourceDir = join(sourceRoot, wrapper.packageDir, 'src')
  if (!(await exists(sourceDir))) {
    return
  }
  const forbiddenPackages = [...standardWrapperPackageNames].filter(packageName => packageName !== wrapper.packageName)
  for (const file of await readAllSourceFiles(sourceDir)) {
    const source = await readFile(file, 'utf8')
    const label = `${wrapper.packageName} ${relative(sourceDir, file)}`
    for (const packageName of forbiddenPackages) {
      assert(
        !importsFromPackage(source, packageName),
        `${label} must not import another standard component package ${packageName}`
      )
    }
  }
}

function assertReexportsLocalControllerTypes(source, label) {
  const reExportPattern = /export\s+type\s*{[\s\S]*}\s+from\s+['"]\.\/controller(?:\.js)?['"]/
  assert(reExportPattern.test(source), `${label} must re-export its local component controller types`)
  assertTokens(source, sharedOptionTypeExports, label)
}

function assertConsumesCore(source, label) {
  assertImportsFromAny(source, ['./controller', './controller.js'], label)
  assertImportsFrom(source, '@file-viewer/core', label)
  assertNotImportsFrom(source, '@file-viewer/web', label)
  assertTokens(source, [
    'mountViewer',
    'fileViewerCoreRendererRegistry',
    'ViewerMountOptions',
    'ViewerController'
  ], label)
}

function verifyWebWrapper(source, label) {
  assertConsumesCore(source, label)
  assertTokens(source, [
    'ViewerCoreOptions',
    'FlyfishFileViewerWeb',
    'FileViewerElement',
    'defineFileViewerElement',
    'FILE_VIEWER_ELEMENT_TAG'
  ], label)
  assertReexportsLocalControllerTypes(source, label)
  assertNoLegacyIframeApi(source, label)
}

function verifyVue3Wrapper(source, label) {
  assertImportsFrom(source, 'vue', label)
  assertImportsFromAny(source, ['./controller', './controller.js'], label)
  assertNotImportsFrom(source, '@file-viewer/web', label)
  assertTokens(source, [
    'FileViewer',
    'createFlyfishFileViewer',
    'mountFlyfishFileViewer',
    'FileViewerVue3PluginOptions',
    'FileViewerVue3Handle',
    'ViewerMountOptions'
  ], label)
  assertReexportsLocalControllerTypes(source, label)
  assertNoLegacyIframeApi(source, label)
}

function verifyVue2Wrapper(source, label) {
  assertImportsFrom(source, 'vue', label)
  assertConsumesCore(source, label)
  assertReexportsLocalControllerTypes(source, label)
  assertTokens(source, [
    'FileViewer',
    'install',
    'FileViewerPlugin',
    'componentName',
    'viewer-event',
    'viewerEvent',
    'createViewerControllerHandle',
    'mountViewer',
    'getApi',
    'load',
    'update',
    'reload',
    'destroy'
  ], label)
  assertNoLegacyIframeApi(source, label)
}

function verifyReactWrapper(source, label) {
  assertImportsFrom(source, 'react', label)
  assertConsumesCore(source, label)
  assertReexportsLocalControllerTypes(source, label)
  assertTokens(source, [
    'FileViewerHandle',
    'FileViewerProps',
    'forwardRef',
    'useImperativeHandle',
    'createViewerControllerHandle',
    'mountViewer',
    'ViewerMountOptions',
    'ViewerController'
  ], label)
  assertNoLegacyIframeApi(source, label)
  assert(/export\s+default\s+FileViewer/.test(source), `${label} must default-export FileViewer`)
}

function verifyReactLegacyWrapper(source, label) {
  assertImportsFrom(source, 'react', label)
  assertConsumesCore(source, label)
  assertReexportsLocalControllerTypes(source, label)
  assertTokens(source, [
    'FileViewerLegacyHandle',
    'FileViewerLegacyProps',
    'forwardRef',
    'useImperativeHandle',
    'createViewerControllerHandle',
    'mountViewer',
    'ViewerMountOptions',
    'ViewerController'
  ], label)
  assertNoLegacyIframeApi(source, label)
  assert(/export\s+default\s+FileViewerLegacy/.test(source), `${label} must default-export FileViewerLegacy`)
}

function verifyJQueryWrapper(source, label) {
  assertConsumesCore(source, label)
  assertReexportsLocalControllerTypes(source, label)
  assertTokens(source, [
    'JQueryFileViewerMethod',
    'JQueryFileViewerOptions',
    'installJQueryFileViewer',
    'getFileViewerController',
    'destroyFileViewer',
    'fileViewer',
    'mountViewer',
    'load',
    'update',
    'reload',
    'destroy'
  ], label)
  assertNoLegacyIframeApi(source, label)
  assert(/export\s+default\s+installJQueryFileViewer/.test(source), `${label} must default-export installJQueryFileViewer`)
}

function verifySvelteWrapper(source, label) {
  assertConsumesCore(source, label)
  assertReexportsLocalControllerTypes(source, label)
  assertTokens(source, [
    'FileViewerSvelteActionOptions',
    'FileViewerSvelteActionReturn',
    'fileViewer',
    'mountViewer',
    'update',
    'destroy',
    'replace'
  ], label)
  assertNoLegacyIframeApi(source, label)
  assert(/export\s+default\s+fileViewer/.test(source), `${label} must default-export fileViewer action`)
}

function verifyFullWrapper(wrapper, source) {
  const label = wrapper.packageName
  assert(wrapper.basePackage, `${label} full package must declare basePackage`)
  assertImportsFrom(source, '@file-viewer/preset-all', label)
  assertReferencesPackage(source, wrapper.basePackage, label)
  assertTokens(source, [
    'fileViewerFullPreset',
    'withFullViewerOptions',
    'withFullMountOptions',
    'rendererMode',
    'autoRenderers'
  ], label)
  assert(
    /preset\s*=\s*(?:allRenderers|fileViewerFullPreset)/.test(source),
    `${label} full package must default options.preset to @file-viewer/preset-all`
  )
  assert(
    /rendererMode\s*=\s*['"]replace['"]/.test(source),
    `${label} full package must default rendererMode to replace with an explicit full preset`
  )
  assert(
    /autoRenderers\s*:\s*rest\.autoRenderers\s*\?\?\s*true/.test(source),
    `${label} full package must keep auto-registered renderer presets enabled unless the user disables them`
  )
  assertNoLegacyIframeApi(source, label)
  assert(
    /export\s+\*\s+from\s+['"][^'"]+['"]/.test(source) ||
      /export\s+\{\s*default\s*\}\s+from\s+['"][^'"]+['"]/.test(source),
    `${label} full package must re-export the standard component API`
  )
}

const verifiers = {
  vue3: source => verifyVue3Wrapper(source, '@file-viewer/vue3'),
  'vue2.7': source => verifyVue2Wrapper(source, '@file-viewer/vue2.7'),
  'vue2.6': source => verifyVue2Wrapper(source, '@file-viewer/vue2.6'),
  react: source => verifyReactWrapper(source, '@file-viewer/react'),
  'react-legacy': source => verifyReactLegacyWrapper(source, '@file-viewer/react-legacy'),
  web: source => verifyWebWrapper(source, '@file-viewer/web'),
  jquery: source => verifyJQueryWrapper(source, '@file-viewer/jquery'),
  svelte: source => verifySvelteWrapper(source, '@file-viewer/svelte')
}

let checked = 0
for (const wrapper of wrapperManifest.wrappers) {
  const { content } = await readWrapperSource(wrapper)
  if (wrapper.flavor === 'full') {
    verifyFullWrapper(wrapper, content)
    checked += 1
    continue
  }
  const verify = verifiers[wrapper.id]
  assert(verify, `Missing wrapper API verifier for ${wrapper.id}`)
  await assertNoWrapperToWrapperImports(wrapper)
  verify(content)
  checked += 1
}

console.log(`Verified ${checked} standard component package native core API surfaces.`)
