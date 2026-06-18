import { constants } from 'node:fs'
import { access, readFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadEcosystemReleaseContext } from './lib/ecosystem-packages.mjs'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const sourceRoot = resolve(scriptDir, '..')
const { wrapperManifest } = await loadEcosystemReleaseContext(sourceRoot)

const sharedFrameProps = [
  'viewerUrl',
  'url',
  'file',
  'name',
  'from',
  'targetOrigin',
  'params',
  'cacheKey',
  'options',
  'onViewerEvent'
]

const sharedControllerMethods = [
  'getController',
  'getIframe',
  'update',
  'postFile',
  'reload',
  'destroy'
]

const sharedFrameComponentTypes = [
  'ViewerFrameComponentBridgeOptions',
  'ViewerFrameComponentProps',
  'ViewerFrameContainerComponentProps',
  'ViewerFrameControllerAccessor',
  'ViewerFrameHostComponentProps',
  'ViewerFrameIframeComponentProps'
]

const webHelperExports = [
  'buildViewerSrc',
  'createViewerDirectFrameController',
  'createViewerDirectFrameHandle',
  'createViewerFrame',
  'createViewerFrameControllerHandle',
  'createViewerFrameFilePostController',
  'createViewerMountedFrameHandle',
  'mountViewerFrame',
  'mountViewer',
  'syncViewerFrame',
  'postFileToViewer',
  'toMessageBlob',
  'toViewerFrameOptions',
  'isViewerFrameEvent',
  'getViewerUrl',
  'getViewerOrigin',
  'getSourceFilename'
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
    join(sourceRoot, wrapper.packageDir, 'src', 'index.tsx')
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

function assertSharedFrameProps(source, label) {
  assertTokens(source, sharedFrameProps, label)
}

function assertSharedControllerMethods(source, label) {
  if (
    source.includes('createViewerMountedFrameHandle') ||
    source.includes('createViewerFrameControllerHandle')
  ) {
    return
  }
  assertTokens(source, sharedControllerMethods, label)
}

function verifyWebWrapper(source, label) {
  assertImportsFrom(source, '@file-viewer/core', label)
  assertTokens(source, webHelperExports, label)
  assertTokens(source, [
    'DEFAULT_VIEWER_PUBLIC_DIR',
    'DEFAULT_VIEWER_URL',
    'VIEWER_FRAME_CACHE_KEY',
    'ViewerRuntimeOptions',
    ...sharedFrameComponentTypes,
    'ViewerFrameController',
    'ViewerDirectFrameHandle',
    'ViewerMountedFrameHandle',
    'ViewerFrameControllerHandle'
  ], label)
  assert(
    /export\s+const\s+mountViewer\s*=\s*mountViewerFrame/.test(source),
    `${label} must expose mountViewer as a mountViewerFrame alias`
  )
}

function verifyVueWrapper(source, label, version) {
  assertImportsFrom(source, 'vue', label)
  assertImportsFrom(source, '@file-viewer/web', label)
  assertSharedFrameProps(source, label)
  assertSharedControllerMethods(source, label)
  assertTokens(source, [
    'FileViewer',
    'install',
    'FileViewerPlugin',
    'componentName',
    'viewer-event',
    'viewerEvent',
    'ViewerRuntimeOptions',
    ...sharedFrameComponentTypes,
    'ViewerMountedFrameHandle'
  ], label)
  if (version === 'vue3') {
    assertTokens(source, ['defineComponent', 'onMounted', 'onBeforeUnmount', 'watch', 'expose'], label)
    assert(/export\s+default\s+FileViewerPlugin/.test(source), `${label} must default-export FileViewerPlugin`)
  } else {
    assertTokens(source, ['Vue.extend', 'PluginObject', 'beforeDestroy', 'render'], label)
    assert(/export\s+default\s+FileViewerPlugin/.test(source), `${label} must default-export FileViewerPlugin`)
  }
}

function verifyReactWrapper(source, label) {
  assertImportsFrom(source, 'react', label)
  assertImportsFrom(source, '@file-viewer/web', label)
  assertNotImportsFrom(source, '@file-viewer/core', label)
  assertSharedFrameProps(source, label)
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
    'onViewerEvent',
    'ViewerFrameOptions',
    'ViewerDirectFrameController',
    ...sharedFrameComponentTypes,
    'ViewerDirectFrameHandle'
  ], label)
  for (const forbiddenToken of [
    'createViewerFrameFilePostController',
    'isViewerFrameEvent',
    'setFrameReady',
    'frameReady'
  ]) {
    assert(
      !source.includes(forbiddenToken),
      `${label} must delegate direct iframe lifecycle to @file-viewer/web instead of ${forbiddenToken}`
    )
  }
  assert(/export\s+default\s+FileViewer/.test(source), `${label} must default-export FileViewer`)
}

function verifyReactLegacyWrapper(source, label) {
  assertImportsFrom(source, 'react', label)
  assertImportsFrom(source, '@file-viewer/web', label)
  assertNotImportsFrom(source, '@file-viewer/core', label)
  assertSharedFrameProps(source, label)
  assertTokens(source, [
    'FileViewerLegacyHandle',
    'FileViewerLegacyProps',
    'forwardRef',
    'useImperativeHandle',
    'React.createElement',
    'mountViewerFrame',
    ...sharedFrameComponentTypes,
    'ViewerFrameControllerHandle'
  ], label)
  if (source.includes('createViewerFrameControllerHandle')) {
    assertTokens(source, ['createViewerFrameControllerHandle'], label)
  } else {
    assertTokens(source, ['controller', 'iframe', 'update', 'postFile', 'reload', 'destroy'], label)
  }
  assert(/export\s+default\s+FileViewerLegacy/.test(source), `${label} must default-export FileViewerLegacy`)
}

function verifyJQueryWrapper(source, label) {
  assertImportsFrom(source, '@file-viewer/web', label)
  assertTokens(source, ['update', 'postFile', 'reload', 'destroy'], label)
  assertTokens(source, [
    'JQueryFileViewerMethod',
    'JQueryFileViewerOptions',
    'installJQueryFileViewer',
    'getFileViewerController',
    'destroyFileViewer',
    'fileViewer',
    'mountViewerFrame',
    ...sharedFrameComponentTypes
  ], label)
  for (const method of ['destroy', 'reload', 'postFile', 'update']) {
    assert(source.includes(`'${method}'`), `${label} must support jQuery method "${method}"`)
  }
  assert(/export\s+default\s+installJQueryFileViewer/.test(source), `${label} must default-export installJQueryFileViewer`)
}

function verifySvelteWrapper(source, label) {
  assertImportsFrom(source, '@file-viewer/web', label)
  assertTokens(source, [
    'FileViewerSvelteActionOptions',
    'FileViewerSvelteActionReturn',
    'fileViewer',
    'mountViewerFrame',
    'update',
    'destroy',
    'replace',
    ...sharedFrameComponentTypes,
    'ViewerMountedFrameHandle'
  ], label)
  assert(/export\s+default\s+fileViewer/.test(source), `${label} must default-export fileViewer action`)
}

const verifiers = {
  vue3: source => verifyVueWrapper(source, '@file-viewer/vue3', 'vue3'),
  'vue2.7': source => verifyVueWrapper(source, '@file-viewer/vue2.7', 'vue2'),
  'vue2.6': source => verifyVueWrapper(source, '@file-viewer/vue2.6', 'vue2'),
  react: source => verifyReactWrapper(source, '@file-viewer/react'),
  'react-legacy': source => verifyReactLegacyWrapper(source, '@file-viewer/react-legacy'),
  web: source => verifyWebWrapper(source, '@file-viewer/web'),
  jquery: source => verifyJQueryWrapper(source, '@file-viewer/jquery'),
  svelte: source => verifySvelteWrapper(source, '@file-viewer/svelte')
}

let checked = 0
for (const wrapper of wrapperManifest.wrappers) {
  const verify = verifiers[wrapper.id]
  assert(verify, `Missing wrapper API verifier for ${wrapper.id}`)
  const { content } = await readWrapperSource(wrapper)
  verify(content)
  checked += 1
}

console.log(`Verified ${checked} standard wrapper runtime API surfaces.`)
