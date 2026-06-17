import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
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

  const utilityFacadeSource = await readSource(entry, 'src/package/common/util.ts')
  assertImportsFrom(utilityFacadeSource, '@file-viewer/core', `${entry.packageName} utility facade`)
  assertTokens(utilityFacadeSource, [
    'FileViewerReadResult',
    'readFileViewerBuffer as readBuffer',
    'readFileViewerDataUrl as readDataURL',
    'readFileViewerText as readText'
  ], `${entry.packageName} utility facade`)
  for (const forbiddenToken of ['new FileReader', 'readAsArrayBuffer', 'readAsDataURL', 'readAsText']) {
    assert(
      !utilityFacadeSource.includes(forbiddenToken),
      `${entry.packageName} utility facade must not keep local browser read implementation ${forbiddenToken}`
    )
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
