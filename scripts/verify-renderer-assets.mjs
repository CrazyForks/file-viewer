import { existsSync, statSync } from 'node:fs'
import { readdir, readFile } from 'node:fs/promises'
import { dirname, extname, join, normalize, relative, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { pathToFileURL, fileURLToPath } from 'node:url'
import {
  collectPackageEntrypoints,
  loadEcosystemReleaseContext
} from './lib/ecosystem-packages.mjs'
import { rendererModularizationLines } from './renderer-dependency-plan.mjs'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const sourceRoot = resolve(scriptDir, '..')
const { entries } = await loadEcosystemReleaseContext(sourceRoot)
const coreEntry = entries.find(entry => entry.packageName === '@file-viewer/core')
const webEntry = entries.find(entry => entry.packageName === '@file-viewer/web')
const rendererEntries = entries.filter(entry => entry.kind === 'renderer')

if (!coreEntry) {
  throw new Error('Missing @file-viewer/core release entry')
}
if (!webEntry) {
  throw new Error('Missing @file-viewer/web release entry')
}

const {
  DEFAULT_FILE_VIEWER_RENDERER_ASSET_MANIFESTS
} = await import(pathToFileURL(join(coreEntry.absoluteDir, 'dist', 'platform', 'assets.js')).href)

const coreRequire = createRequire(join(coreEntry.absoluteDir, 'package.json'))
const rendererEntryByPackageName = new Map(
  rendererEntries.map(entry => [entry.packageName, entry])
)
const rendererEntryByRendererId = new Map()
for (const entry of rendererEntries) {
  if (entry.renderer?.id) {
    rendererEntryByRendererId.set(entry.renderer.id, entry)
  }
}
for (const line of rendererModularizationLines) {
  const targetEntry = rendererEntryByPackageName.get(line.targetPackage)
  if (!targetEntry) {
    continue
  }
  for (const rendererId of line.renderers) {
    rendererEntryByRendererId.set(rendererId, targetEntry)
  }
}
const plannedRendererIds = new Set(
  rendererModularizationLines.flatMap(line => line.renderers)
)
const allowedAssetKinds = new Set([
  'bundled-wasm',
  'directory',
  'script',
  'wasm',
  'wasm-directory',
  'worker'
])
const allowedAssetTargets = new Set(['bundled', 'external', 'public'])
const deniedPathFragments = ['..', '\\']

function run(command, commandArgs, options = {}) {
  const result = spawnSync(command, commandArgs, {
    cwd: options.cwd || sourceRoot,
    encoding: 'utf8',
    stdio: options.capture ? 'pipe' : 'inherit',
    env: {
      ...process.env,
      npm_config_loglevel: 'error'
    }
  })
  if (result.status !== 0) {
    throw new Error(`Command failed: ${command} ${commandArgs.join(' ')}`)
  }
  return result.stdout || ''
}

function normalizePackPath(path) {
  return path.replace(/^package\//, '').replace(/\\/g, '/')
}

function parseNpmPackJson(output, packageName) {
  const jsonStart = output.indexOf('[')
  if (jsonStart === -1) {
    throw new Error(`${packageName} npm pack dry-run did not return JSON output`)
  }
  const parsed = JSON.parse(output.slice(jsonStart))
  if (!Array.isArray(parsed) || parsed.length !== 1) {
    throw new Error(`${packageName} npm pack dry-run returned an unexpected payload`)
  }
  return parsed[0]
}

function readDryRunPack(entry) {
  const output = run('npm', ['pack', '--dry-run', '--json'], {
    cwd: entry.absoluteDir,
    capture: true
  })
  const payload = parseNpmPackJson(output, entry.packageName)
  return {
    files: payload.files.map(file => normalizePackPath(file.path))
  }
}

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

async function listFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...await listFiles(path))
    } else if (entry.isFile()) {
      files.push(path)
    }
  }
  return files
}

function isRelativeRuntimeAssetPath(value) {
  return (
    value &&
    !value.startsWith('/') &&
    !value.startsWith('#') &&
    !value.startsWith('data:') &&
    !/^[a-z][a-z0-9+.-]*:/i.test(value)
  )
}

function packageRelativePath(entry, absolutePath) {
  return relative(entry.absoluteDir, absolutePath).replace(/\\/g, '/')
}

async function collectNewUrlRuntimeAssets(entry) {
  const distDir = join(entry.absoluteDir, 'dist')
  if (!existsSync(distDir)) {
    return []
  }

  const assets = []
  const files = (await listFiles(distDir)).filter(file => extname(file) === '.js')
  const pattern = /new\s+URL\(\s*(['"])([^'"]+)\1\s*,\s*import\.meta\.url\s*\)/g
  for (const file of files) {
    const source = await readFile(file, 'utf8')
    let match
    while ((match = pattern.exec(source))) {
      const rawPath = match[2]
      if (!isRelativeRuntimeAssetPath(rawPath)) {
        continue
      }
      const absoluteAssetPath = resolve(dirname(file), rawPath)
      assets.push({
        from: packageRelativePath(entry, file),
        rawPath,
        packagePath: packageRelativePath(entry, absoluteAssetPath),
        absolutePath: absoluteAssetPath
      })
    }
  }
  return assets
}

function assertEntrypointsPacked(entry, files) {
  const packedFiles = new Set(files)
  for (const entrypoint of collectPackageEntrypoints(entry.packageJson)) {
    if (entrypoint.includes('*')) {
      continue
    }
    const normalized = entrypoint.replace(/^\.\//, '')
    assert(
      packedFiles.has(normalized),
      `${entry.packageName} npm package is missing declared entrypoint ${entrypoint}`
    )
  }
}

async function verifyRendererPackage(entry) {
  const pack = readDryRunPack(entry)
  const packedFiles = new Set(pack.files)
  for (const requiredFile of ['package.json', 'README.md', 'README.en.md', 'LICENSE']) {
    assert(packedFiles.has(requiredFile), `${entry.packageName} npm package is missing ${requiredFile}`)
  }
  assertEntrypointsPacked(entry, pack.files)

  const runtimeAssets = await collectNewUrlRuntimeAssets(entry)
  runtimeAssets.forEach(asset => {
    assertFile(asset.absolutePath, `${entry.packageName} runtime asset ${asset.rawPath} referenced by ${asset.from}`)
    assert(
      packedFiles.has(asset.packagePath),
      `${entry.packageName} npm package is missing runtime asset ${asset.packagePath} referenced by ${asset.from}`
    )
  })

  return {
    fileCount: pack.files.length,
    runtimeAssetCount: runtimeAssets.length
  }
}

function assertSafeManifestPath(asset, field, value) {
  if (!value) {
    return
  }
  assert(!/^[a-z][a-z0-9+.-]*:/i.test(value), `${asset.id}.${field} must not be an absolute URL: ${value}`)
  assert(!value.startsWith('/'), `${asset.id}.${field} must not be an absolute path: ${value}`)
  const normalized = normalize(value).replace(/\\/g, '/')
  assert(
    !deniedPathFragments.some(fragment => normalized.split('/').includes(fragment)),
    `${asset.id}.${field} must not escape the viewer asset root: ${value}`
  )
}

function verifyAssetManifestShape() {
  const seenManifestIds = new Set()
  const seenAssetIds = new Set()
  for (const manifest of DEFAULT_FILE_VIEWER_RENDERER_ASSET_MANIFESTS) {
    assert(manifest.rendererId, 'renderer asset manifest must declare rendererId')
    assert(!seenManifestIds.has(manifest.rendererId), `Duplicate renderer asset manifest: ${manifest.rendererId}`)
    assert(
      plannedRendererIds.has(manifest.rendererId),
      `${manifest.rendererId} asset manifest is not tracked by renderer-dependency-plan.mjs`
    )
    seenManifestIds.add(manifest.rendererId)
    assert(Array.isArray(manifest.assets) && manifest.assets.length, `${manifest.rendererId} asset manifest must list assets`)

    for (const asset of manifest.assets) {
      assert(asset.id, `${manifest.rendererId} asset must declare id`)
      assert(!seenAssetIds.has(asset.id), `Duplicate renderer asset id: ${asset.id}`)
      seenAssetIds.add(asset.id)
      assert(asset.rendererId === manifest.rendererId, `${asset.id} rendererId must match its manifest`)
      assert(allowedAssetKinds.has(asset.kind), `${asset.id} has unsupported asset kind: ${asset.kind}`)
      assert(allowedAssetTargets.has(asset.target), `${asset.id} has unsupported asset target: ${asset.target}`)
      assert(typeof asset.required === 'boolean', `${asset.id} must declare required boolean`)
      assert(asset.description && asset.description.length >= 12, `${asset.id} must have a useful description`)
      assert(asset.defaultPath || asset.defaultUrl || asset.packagePath, `${asset.id} must declare a default path, URL, or packagePath`)
      assertSafeManifestPath(asset, 'defaultPath', asset.defaultPath)
      if (asset.packagePath) {
        const assetEntry = rendererEntryByRendererId.get(asset.rendererId) || coreEntry
        const assetRequire = createRequire(join(assetEntry.absoluteDir, 'package.json'))
        let resolvedAssetPath
        try {
          resolvedAssetPath = assetRequire.resolve(asset.packagePath)
        } catch (error) {
          if (assetEntry === coreEntry) {
            throw error
          }
          resolvedAssetPath = coreRequire.resolve(asset.packagePath)
        }
        assertFile(resolvedAssetPath, `${asset.id} package asset ${asset.packagePath}`)
      }
    }
  }
  return {
    manifestCount: DEFAULT_FILE_VIEWER_RENDERER_ASSET_MANIFESTS.length,
    assetCount: seenAssetIds.size
  }
}

function assertViewerAssetPacked(packFiles, asset) {
  if (asset.target !== 'public' || !asset.defaultPath) {
    return false
  }

  const expectedPath = `viewer/${asset.defaultPath}`.replace(/\/+$/, '')
  const packedFiles = new Set(packFiles)
  if (asset.kind === 'directory' || asset.kind === 'wasm-directory') {
    assert(
      packFiles.some(file => file === expectedPath || file.startsWith(`${expectedPath}/`)),
      `@file-viewer/web npm package is missing viewer asset directory ${expectedPath}`
    )
  } else {
    assert(
      packedFiles.has(expectedPath),
      `@file-viewer/web npm package is missing viewer asset file ${expectedPath}`
    )
  }
  return true
}

function verifyWebViewerAssets() {
  const pack = readDryRunPack(webEntry)
  const viewerDir = join(webEntry.absoluteDir, 'viewer')
  assertDirectory(viewerDir, '@file-viewer/web viewer/')
  let checkedAssetCount = 0
  for (const manifest of DEFAULT_FILE_VIEWER_RENDERER_ASSET_MANIFESTS) {
    for (const asset of manifest.assets) {
      if (asset.target === 'public' && asset.defaultPath) {
        const absolutePath = join(viewerDir, asset.defaultPath)
        if (asset.kind === 'directory' || asset.kind === 'wasm-directory') {
          assertDirectory(absolutePath, `@file-viewer/web viewer/${asset.defaultPath}`)
        } else {
          assertFile(absolutePath, `@file-viewer/web viewer/${asset.defaultPath}`)
        }
      }
      if (assertViewerAssetPacked(pack.files, asset)) {
        checkedAssetCount += 1
      }
    }
  }
  return {
    fileCount: pack.files.length,
    checkedAssetCount
  }
}

let checkedRendererFileCount = 0
let checkedRuntimeAssetCount = 0
for (const entry of rendererEntries) {
  const result = await verifyRendererPackage(entry)
  checkedRendererFileCount += result.fileCount
  checkedRuntimeAssetCount += result.runtimeAssetCount
}
const manifestResult = verifyAssetManifestShape()
const webResult = verifyWebViewerAssets()

console.log(
  `[renderer-assets] Verified ${rendererEntries.length} renderer npm dry-runs (${checkedRendererFileCount} files), ${checkedRuntimeAssetCount} renderer-local runtime assets, ${manifestResult.manifestCount} core asset manifests / ${manifestResult.assetCount} assets, and ${webResult.checkedAssetCount} @file-viewer/web viewer assets (${webResult.fileCount} packed files).`
)
