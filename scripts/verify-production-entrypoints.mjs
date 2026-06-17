import { existsSync } from 'node:fs'
import { readFile, stat } from 'node:fs/promises'
import { dirname, extname, join, resolve } from 'node:path'
import { pathToFileURL, fileURLToPath } from 'node:url'
import vm from 'node:vm'
import {
  collectExportEntrypoints,
  collectPackageEntrypoints,
  loadEcosystemReleaseContext
} from './lib/ecosystem-packages.mjs'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const sourceRoot = resolve(scriptDir, '..')
const { entries } = await loadEcosystemReleaseContext(sourceRoot)

const importableExtensions = new Set(['.js', '.mjs'])
const webGlobalPackages = new Set([
  '@flyfish-group/file-viewer-web',
  '@file-viewer/web'
])
const webGlobalBundle = 'dist/flyfish-file-viewer-web.iife.js'

async function assertFile(path, label = path) {
  if (!existsSync(path)) {
    throw new Error(`Missing production entrypoint: ${label}`)
  }
  const info = await stat(path)
  if (!info.isFile()) {
    throw new Error(`Production entrypoint is not a file: ${label}`)
  }
}

async function assertDirectory(path, label = path) {
  if (!existsSync(path)) {
    throw new Error(`Missing production directory: ${label}`)
  }
  const info = await stat(path)
  if (!info.isDirectory()) {
    throw new Error(`Production entrypoint is not a directory: ${label}`)
  }
}

function normalizeEntrypoint(entrypoint) {
  return entrypoint.replace(/^\.\//, '')
}

function isImportableEntrypoint(entrypoint) {
  const normalized = normalizeEntrypoint(entrypoint)
  return importableExtensions.has(extname(normalized)) && !normalized.includes('*')
}

function collectProductionImportEntrypoints(packageJson) {
  const entrypoints = new Set()
  for (const field of ['main', 'module', 'browser']) {
    if (typeof packageJson[field] === 'string' && isImportableEntrypoint(packageJson[field])) {
      entrypoints.add(packageJson[field])
    }
  }
  for (const entrypoint of collectExportEntrypoints(packageJson.exports)) {
    if (isImportableEntrypoint(entrypoint)) {
      entrypoints.add(entrypoint)
    }
  }
  return [...entrypoints]
}

async function assertPackageEntrypoints(entry) {
  for (const entrypoint of collectPackageEntrypoints(entry.packageJson)) {
    await assertFile(
      join(entry.absoluteDir, entrypoint),
      `${entry.packageName} ${entrypoint}`
    )
  }
}

async function importProductionEntrypoints(entry) {
  for (const entrypoint of collectProductionImportEntrypoints(entry.packageJson)) {
    const absolutePath = join(entry.absoluteDir, entrypoint)
    await import(pathToFileURL(absolutePath).href)
  }
}

async function assertViewerStaticEntrypoints(entry) {
  const viewerDir = join(entry.absoluteDir, 'viewer')
  await assertDirectory(viewerDir, `${entry.packageName} viewer/`)
  for (const file of [
    'index.html',
    'compare.html',
    'flyfish-viewer-assets.json',
    'flyfish-viewer-manifest.json'
  ]) {
    await assertFile(join(viewerDir, file), `${entry.packageName} viewer/${file}`)
  }
  await assertDirectory(join(viewerDir, 'assets'), `${entry.packageName} viewer/assets/`)
  await assertDirectory(join(viewerDir, 'wasm'), `${entry.packageName} viewer/wasm/`)
}

async function assertWebGlobalEntrypoint(entry) {
  if (!webGlobalPackages.has(entry.packageName)) {
    return false
  }
  const bundlePath = join(entry.absoluteDir, webGlobalBundle)
  await assertFile(bundlePath, `${entry.packageName} ${webGlobalBundle}`)
  const context = { window: {} }
  vm.runInNewContext(await readFile(bundlePath, 'utf8'), context, {
    filename: `${entry.packageName}/${webGlobalBundle}`
  })
  const globalApi = context.window.FlyfishFileViewerWeb || context.FlyfishFileViewerWeb
  for (const exportName of [
    'mountViewerFrame',
    'mountViewer',
    'buildViewerSrc',
    'createViewerFrameFilePostController'
  ]) {
    if (typeof globalApi?.[exportName] !== 'function') {
      throw new Error(`${entry.packageName} browser global bundle is missing ${exportName}`)
    }
  }
  return true
}

async function assertRootVue3StaticEntrypoints(entry) {
  if (entry.packageDir !== '.') {
    return
  }
  await assertFile(join(entry.absoluteDir, 'dist', 'file-viewer3.css'), `${entry.packageName} dist/file-viewer3.css`)
  await assertDirectory(join(entry.absoluteDir, 'dist', 'components'), `${entry.packageName} dist/components/`)
}

let checkedEntrypointCount = 0
let importedEntrypointCount = 0
let checkedGlobalBundleCount = 0

for (const entry of entries) {
  await assertPackageEntrypoints(entry)
  checkedEntrypointCount += collectPackageEntrypoints(entry.packageJson).length

  const importEntrypoints = collectProductionImportEntrypoints(entry.packageJson)
  await importProductionEntrypoints(entry)
  importedEntrypointCount += importEntrypoints.length

  if (webGlobalPackages.has(entry.packageName)) {
    await assertViewerStaticEntrypoints(entry)
  }
  if (await assertWebGlobalEntrypoint(entry)) {
    checkedGlobalBundleCount += 1
  }
  await assertRootVue3StaticEntrypoints(entry)
}

console.log(
  `[production-entrypoints] Verified ${entries.length} packages, ${checkedEntrypointCount} declared entrypoint files, ${importedEntrypointCount} importable ESM production entrypoints, and ${checkedGlobalBundleCount} browser global bundles.`
)
