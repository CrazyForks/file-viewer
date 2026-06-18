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
const { entries, wrapperManifest } = await loadEcosystemReleaseContext(sourceRoot)

const importableExtensions = new Set(['.js', '.mjs'])
const allowedEntryFormats = new Set([
  'esm',
  'types',
  'iife',
  'viewer-assets',
  'copy-assets-cli',
  'svelte-component'
])
const webGlobalPackages = new Set([
  '@flyfish-group/file-viewer-web',
  '@file-viewer/web'
])
const webGlobalBundle = 'dist/flyfish-file-viewer-web.iife.js'
const wrappersByPackageName = new Map(wrapperManifest.wrappers.map(wrapper => [wrapper.packageName, wrapper]))

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
  if (!entry.packageJson.unpkg || !entry.packageJson.jsdelivr) {
    throw new Error(`${entry.packageName} browser global package must declare both unpkg and jsdelivr bundle fields`)
  }

  const bundleEntrypoints = new Set([
    entry.packageJson.unpkg,
    entry.packageJson.jsdelivr,
    `./${webGlobalBundle}`
  ])
  for (const bundleEntrypoint of bundleEntrypoints) {
    const normalizedEntrypoint = normalizeEntrypoint(bundleEntrypoint)
    const bundlePath = join(entry.absoluteDir, normalizedEntrypoint)
    await assertFile(bundlePath, `${entry.packageName} ${bundleEntrypoint}`)

    const context = { window: {} }
    vm.runInNewContext(await readFile(bundlePath, 'utf8'), context, {
      filename: `${entry.packageName}/${normalizedEntrypoint}`
    })
    const globalApi = context.window.FlyfishFileViewerWeb || context.FlyfishFileViewerWeb
    for (const exportName of [
      'mountViewerFrame',
      'mountViewer',
      'buildViewerSrc',
      'createViewerFrameFilePostController'
    ]) {
      if (typeof globalApi?.[exportName] !== 'function') {
        throw new Error(`${entry.packageName} browser global bundle ${bundleEntrypoint} is missing ${exportName}`)
      }
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

async function assertEntrypointFieldFile(entry, fieldName, value) {
  if (typeof value !== 'string') {
    throw new Error(`${entry.packageName} entry format requires ${fieldName}`)
  }
  await assertFile(
    join(entry.absoluteDir, normalizeEntrypoint(value)),
    `${entry.packageName} ${fieldName} ${value}`
  )
}

async function assertWrapperEntryFormats(entry) {
  const wrapper = wrappersByPackageName.get(entry.packageName)
  if (!wrapper) {
    return 0
  }
  if (!Array.isArray(wrapper.entryFormats) || !wrapper.entryFormats.length) {
    throw new Error(`${entry.packageName} wrapper manifest must declare entryFormats`)
  }
  for (const format of wrapper.entryFormats) {
    if (!allowedEntryFormats.has(format)) {
      throw new Error(`${entry.packageName} wrapper manifest has unsupported entry format: ${format}`)
    }
  }

  if (wrapper.entryFormats.includes('esm')) {
    await assertEntrypointFieldFile(entry, 'module', entry.packageJson.module)
    await assertEntrypointFieldFile(entry, 'exports["."].import', entry.packageJson.exports?.['.']?.import)
  }

  if (wrapper.entryFormats.includes('types')) {
    await assertEntrypointFieldFile(entry, 'types', entry.packageJson.types)
    await assertEntrypointFieldFile(entry, 'exports["."].types', entry.packageJson.exports?.['.']?.types)
  }

  if (wrapper.entryFormats.includes('iife')) {
    await assertEntrypointFieldFile(entry, 'unpkg', entry.packageJson.unpkg)
    await assertEntrypointFieldFile(entry, 'jsdelivr', entry.packageJson.jsdelivr)
    await assertWebGlobalEntrypoint(entry)
  }

  if (wrapper.entryFormats.includes('viewer-assets')) {
    if (!entry.packageJson.exports?.['./viewer/*']) {
      throw new Error(`${entry.packageName} declares viewer-assets but package.json is missing exports["./viewer/*"]`)
    }
    if (!entry.packageJson.files?.includes('viewer')) {
      throw new Error(`${entry.packageName} declares viewer-assets but package.json files does not include viewer`)
    }
    await assertViewerStaticEntrypoints(entry)
  }

  if (wrapper.entryFormats.includes('copy-assets-cli')) {
    await assertEntrypointFieldFile(
      entry,
      'bin.file-viewer-copy-assets',
      entry.packageJson.bin?.['file-viewer-copy-assets']
    )
  }

  if (wrapper.entryFormats.includes('svelte-component')) {
    await assertEntrypointFieldFile(entry, 'svelte', entry.packageJson.svelte)
    await assertEntrypointFieldFile(entry, 'exports["."].svelte', entry.packageJson.exports?.['.']?.svelte)
  }

  return wrapper.entryFormats.length
}

let checkedEntrypointCount = 0
let importedEntrypointCount = 0
let checkedGlobalBundleCount = 0
let checkedWrapperEntryFormatCount = 0

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
  checkedWrapperEntryFormatCount += await assertWrapperEntryFormats(entry)
  await assertRootVue3StaticEntrypoints(entry)
}

console.log(
  `[production-entrypoints] Verified ${entries.length} packages, ${checkedEntrypointCount} declared entrypoint files, ${importedEntrypointCount} importable ESM production entrypoints, ${checkedGlobalBundleCount} browser global bundles, and ${checkedWrapperEntryFormatCount} wrapper entry format claims.`
)
