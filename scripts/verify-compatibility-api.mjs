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

const sourceFileExtensions = new Set(['.ts', '.tsx', '.vue', '.js', '.mjs', '.svelte'])
const forbiddenLegacyTokens = [
  'buildViewerSrc',
  'buildFileViewerFrameSrc',
  'createFileViewerFrameControllerHandle',
  'createViewerFrame',
  'createViewerFrameControllerHandle',
  'createViewerFrameFilePostController',
  'createViewerFrame',
  'getIframe',
  'isViewerFrameEvent',
  'mountFileViewerFrame',
  'mountViewerFrame',
  'postFileToViewer',
  'postFileViewerLifecycleEvent',
  'postFileViewerLocationChange',
  'postFileViewerMessageToParent',
  'postFileViewerOperationAvailabilityChange',
  'postFileViewerOperationContextEvent',
  'postFileViewerSearchChange',
  'postFileViewerZoomChange',
  'syncViewerFrame',
  'targetOrigin',
  'toFileViewerFrameOptions',
  'toViewerFrameOptions',
  'viewerUrl',
  'FileViewerFrameComponentProps',
  'FileViewerFrameIframeComponentProps',
  'ViewerFrameComponentProps',
  'ViewerFrameIframeComponentProps',
  'ViewerFrameOptions'
]

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

function installDependencies(packageJson) {
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

async function readSource(entry, relativePath) {
  return readFile(join(entry.absoluteDir, relativePath), 'utf8')
}

function requireEntry(packageName) {
  const entry = entryByName.get(packageName)
  assert(entry, `Missing compatibility package ${packageName}`)
  return entry
}

function assertNoLegacyIframeTokens(source, label) {
  for (const token of forbiddenLegacyTokens) {
    assert(!source.includes(token), `${label} must not contain legacy standalone-page API token ${token}`)
  }
}

async function assertNoLegacyIframeTokensInDir(entry, relativeDir) {
  const absoluteDir = join(entry.absoluteDir, relativeDir)
  if (!existsSync(absoluteDir)) {
    return
  }
  const sourceFiles = await readAllSourceFiles(absoluteDir)
  for (const file of sourceFiles) {
    const source = await readFile(file, 'utf8')
    const label = `${entry.packageName} ${relative(entry.absoluteDir, file)}`
    assertNoLegacyIframeTokens(source, label)
  }
}

async function verifyWebCompatibility() {
  const entry = requireEntry('@flyfish-group/file-viewer-web')
  const dependencies = installDependencies(entry.packageJson)
  assert(
    dependencies['@file-viewer/web'] === expectedWorkspaceRange,
    `${entry.packageName} must depend on @file-viewer/web@${expectedWorkspaceRange}`
  )
  assert(
    !dependencies['@file-viewer/core'],
    `${entry.packageName} must not depend on @file-viewer/core directly`
  )

  const indexSource = await readSource(entry, 'src/index.ts')
  assertImportsFrom(indexSource, '@file-viewer/web', entry.packageName)
  assertTokens(indexSource, [
    'createViewerControllerHandle',
    'mountViewer',
    'ViewerController',
    'ViewerMountOptions'
  ], entry.packageName)
  assertNoLegacyIframeTokens(indexSource, entry.packageName)

  const globalSource = await readSource(entry, 'src/global.ts')
  assertTokens(globalSource, ['FlyfishFileViewerWeb', 'createViewerControllerHandle', 'mountViewer'], `${entry.packageName} global bundle`)
  assertNoLegacyIframeTokens(globalSource, `${entry.packageName} global bundle`)
}

async function verifyReactCompatibility() {
  const entry = requireEntry('@flyfish-group/file-viewer-react')
  const dependencies = installDependencies(entry.packageJson)
  assert(
    dependencies['@file-viewer/react'] === expectedWorkspaceRange,
    `${entry.packageName} must depend on @file-viewer/react@${expectedWorkspaceRange}`
  )
  assert(
    !dependencies['@file-viewer/core'] && !dependencies['@file-viewer/web'],
    `${entry.packageName} must be a thin React alias instead of depending on core/web directly`
  )

  const source = await readSource(entry, 'src/index.tsx')
  assertImportsFrom(source, '@file-viewer/react', entry.packageName)
  assertNotImportsFrom(source, '@file-viewer/core', entry.packageName)
  assertNotImportsFrom(source, '@file-viewer/web', entry.packageName)
  assertTokens(source, ['FileViewer', 'FileViewerHandle', 'FileViewerProps'], entry.packageName)
  assertNoLegacyIframeTokens(source, entry.packageName)
}

async function verifyVue3ScopedCompatibility() {
  const entry = requireEntry('@flyfish-group/file-viewer3')
  const dependencies = installDependencies(entry.packageJson)
  assert(
    dependencies['@file-viewer/vue3'] === expectedWorkspaceRange,
    `${entry.packageName} must depend on @file-viewer/vue3@${expectedWorkspaceRange}`
  )
  assert(
    !dependencies['@file-viewer/core'],
    `${entry.packageName} must be a thin Vue 3 alias and must not depend on core directly`
  )
  assert(
    !existsSync(join(entry.absoluteDir, 'src')),
    `${entry.packageName} must not carry duplicate Vue 3 source; it should generate a thin alias dist`
  )
  const buildScript = await readSource(entry, 'scripts/build.mjs')
  assertTokens(buildScript, [
    "export { default } from '@file-viewer/vue3';",
    "export * from '@file-viewer/vue3';"
  ], `${entry.packageName} build script`)
  assertNoLegacyIframeTokens(buildScript, `${entry.packageName} build script`)
}

async function verifyVue3UnscopedCompatibility() {
  const entry = requireEntry('file-viewer3')
  const dependencies = installDependencies(entry.packageJson)
  assert(
    dependencies['@file-viewer/vue3'] === expectedWorkspaceRange,
    `${entry.packageName} must depend on @file-viewer/vue3@${expectedWorkspaceRange}`
  )
  assert(
    !dependencies['@file-viewer/core'] && !dependencies['@flyfish-group/file-viewer3'],
    `${entry.packageName} must remain a thin Vue 3 alias and must not depend on core or another compatibility alias`
  )
  assert(
    !existsSync(join(entry.absoluteDir, 'src')),
    `${entry.packageName} must not carry duplicate Vue 3 source; it should generate a thin alias dist`
  )
  const buildScript = await readSource(entry, 'scripts/build.mjs')
  assertTokens(buildScript, [
    "export { default } from '@file-viewer/vue3';",
    "export * from '@file-viewer/vue3';"
  ], `${entry.packageName} build script`)
  assertNoLegacyIframeTokens(buildScript, `${entry.packageName} build script`)
}

async function verifyVue27ScopedCompatibility() {
  const entry = requireEntry('@flyfish-group/file-viewer')
  const dependencies = installDependencies(entry.packageJson)
  assert(
    dependencies['@file-viewer/vue2.7'] === expectedWorkspaceRange,
    `${entry.packageName} must depend on @file-viewer/vue2.7@${expectedWorkspaceRange}`
  )
  assert(
    !dependencies['@file-viewer/core'] && !dependencies['@file-viewer/web'],
    `${entry.packageName} must remain a thin Vue 2.7 alias instead of depending on core/web directly`
  )
  assert(
    !existsSync(join(entry.absoluteDir, 'src')),
    `${entry.packageName} must not carry duplicate Vue 2.7 source; it should generate a thin alias dist`
  )
  const buildScript = await readSource(entry, 'scripts/build.mjs')
  assertTokens(buildScript, [
    "export { default } from '@file-viewer/vue2.7';",
    "export * from '@file-viewer/vue2.7';"
  ], `${entry.packageName} build script`)
  assertNoLegacyIframeTokens(buildScript, `${entry.packageName} build script`)
}

await verifyWebCompatibility()
await verifyReactCompatibility()
await verifyVue3ScopedCompatibility()
await verifyVue3UnscopedCompatibility()
await verifyVue27ScopedCompatibility()

console.log('Verified native compatibility aliases, Vue 2.7/Vue 3 scoped packages, and PPTX renderer ownership.')
