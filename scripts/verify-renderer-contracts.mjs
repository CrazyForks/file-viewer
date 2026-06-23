import { existsSync, statSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  collectPackageEntrypoints,
  loadEcosystemReleaseContext
} from './lib/ecosystem-packages.mjs'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const sourceRoot = resolve(scriptDir, '..')
const { entries, rootPackage } = await loadEcosystemReleaseContext(sourceRoot)

const expectedWorkspaceRange = `workspace:^${rootPackage.version}`
const packageNamesByKind = entries.reduce((result, entry) => {
  result[entry.kind] ||= new Set()
  result[entry.kind].add(entry.packageName)
  return result
}, {})
const wrapperPackageNames = new Set([
  ...(packageNamesByKind['standard-wrapper'] || []),
  ...(packageNamesByKind.compatibility || [])
])
const rendererEntries = entries.filter(entry => entry.kind === 'renderer')
const pluginEnginePackages = new Set([
  '@file-viewer/pptx',
  '@file-viewer/eda-layout',
  '@file-viewer/eda-orcad'
])

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

function assertFile(path, label = path) {
  assert(existsSync(path), `Missing ${label}`)
  assert(statSync(path).isFile(), `${label} must be a file`)
}

function assertDirectory(path, label = path) {
  assert(existsSync(path), `Missing ${label}`)
  assert(statSync(path).isDirectory(), `${label} must be a directory`)
}

function normalizeEntrypoint(value) {
  return String(value || '').replace(/^\.\//, '')
}

function dependencyFields(packageJson) {
  return {
    dependencies: packageJson.dependencies || {},
    optionalDependencies: packageJson.optionalDependencies || {},
    peerDependencies: packageJson.peerDependencies || {}
  }
}

function assertNoWrapperDependencies(entry) {
  for (const [field, dependencies] of Object.entries(dependencyFields(entry.packageJson))) {
    for (const packageName of Object.keys(dependencies)) {
      assert(
        !wrapperPackageNames.has(packageName),
        `${entry.packageName} ${field}.${packageName} must not depend on a component or compatibility wrapper`
      )
    }
  }
}

function assertCommonPackageContract(entry) {
  const packageJson = entry.packageJson
  assert(packageJson.name === entry.renderer.packageName, `${entry.id} package name drifted from wrappers.json`)
  assert(packageJson.private !== true, `${entry.packageName} must be publishable`)
  assert(packageJson.type === 'module', `${entry.packageName} must be an ESM package`)
  assert(packageJson.publishConfig?.access === 'public', `${entry.packageName} publishConfig.access must be public`)
  assert(packageJson.main === './dist/index.js', `${entry.packageName} main must be ./dist/index.js`)
  assert(packageJson.module === './dist/index.js', `${entry.packageName} module must be ./dist/index.js`)
  assert(packageJson.types === './dist/index.d.ts', `${entry.packageName} types must be ./dist/index.d.ts`)
  assert(packageJson.exports?.['.']?.import === './dist/index.js', `${entry.packageName} exports["."].import must be ./dist/index.js`)
  assert(packageJson.exports?.['.']?.types === './dist/index.d.ts', `${entry.packageName} exports["."].types must be ./dist/index.d.ts`)
  assert(packageJson.exports?.['./package.json'] === './package.json', `${entry.packageName} must export ./package.json`)
  assert(packageJson.scripts?.build, `${entry.packageName} must provide a build script`)
  assert(packageJson.scripts?.['type-check'], `${entry.packageName} must provide a type-check script`)

  const files = new Set(packageJson.files || [])
  for (const requiredFile of ['dist', 'README.md', 'README.en.md', 'LICENSE']) {
    assert(files.has(requiredFile), `${entry.packageName} package files must include ${requiredFile}`)
  }

  assertFile(join(entry.absoluteDir, 'README.md'), `${entry.packageName} README.md`)
  assertFile(join(entry.absoluteDir, 'README.en.md'), `${entry.packageName} README.en.md`)
  assertFile(join(entry.absoluteDir, 'LICENSE'), `${entry.packageName} LICENSE`)
  assertDirectory(join(entry.absoluteDir, 'dist'), `${entry.packageName} dist/`)
  collectPackageEntrypoints(packageJson).forEach(entrypoint => {
    assertFile(
      join(entry.absoluteDir, normalizeEntrypoint(entrypoint)),
      `${entry.packageName} ${entrypoint}`
    )
  })
  assertNoWrapperDependencies(entry)
}

async function assertPluginRendererContract(entry) {
  const sourceIndex = join(entry.absoluteDir, 'src', 'index.ts')
  assertFile(sourceIndex, `${entry.packageName} src/index.ts`)
  const source = await readFile(sourceIndex, 'utf8')
  const exportBaseName = entry.renderer.id.replace(/(^|-)([a-z0-9])/g, (_match, _dash, char) => char.toUpperCase())
  const camelBaseName = exportBaseName.charAt(0).toLowerCase() + exportBaseName.slice(1)

  assert(
    entry.packageJson.dependencies?.['@file-viewer/core'] === expectedWorkspaceRange,
    `${entry.packageName} must depend on @file-viewer/core@${expectedWorkspaceRange}`
  )
  assert(
    /export\s+default\s+\w+Renderer/.test(source),
    `${entry.packageName} src/index.ts must default-export a renderer plugin`
  )
  assert(
    source.includes(`export const ${camelBaseName}Renderer`) ||
      source.includes(`export const ${camelBaseName}RendererDefinitions`) ||
      source.includes(`export const ${camelBaseName}RendererDefinition`),
    `${entry.packageName} src/index.ts must expose a named renderer export`
  )
  assert(
    source.includes('renderFileViewer'),
    `${entry.packageName} src/index.ts must expose lazy renderFileViewer* handlers`
  )
  assert(
    source.includes('import('),
    `${entry.packageName} src/index.ts must keep heavy renderer implementation behind dynamic import()`
  )
}

for (const entry of rendererEntries) {
  assertCommonPackageContract(entry)
  if (!pluginEnginePackages.has(entry.packageName)) {
    await assertPluginRendererContract(entry)
  }
}

console.log(
  `[renderer-contracts] Verified ${rendererEntries.length} renderer packages, including ${rendererEntries.length - pluginEnginePackages.size} plugin renderer packages and ${pluginEnginePackages.size} engine package.`
)
