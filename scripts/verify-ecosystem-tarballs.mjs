import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import {
  collectPackageEntrypoints,
  loadEcosystemReleaseContext
} from './lib/ecosystem-packages.mjs'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const sourceRoot = resolve(scriptDir, '..')
const args = process.argv.slice(2)

const readArg = (name, fallback) => {
  const index = args.indexOf(name)
  return index >= 0 ? args[index + 1] : fallback
}

const packDirArg = readArg('--pack-dir', null)
const packDir = packDirArg ? resolve(sourceRoot, packDirArg) : null
const mode = packDir ? 'tarball' : 'dry-run'
const { entries } = await loadEcosystemReleaseContext(sourceRoot)
const webGlobalPackages = new Set([
  '@flyfish-group/file-viewer-web',
  '@file-viewer/web'
])
const webGlobalBundle = 'dist/flyfish-file-viewer-web.iife.js'

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
    packageJson: entry.packageJson,
    files: payload.files.map(file => normalizePackPath(file.path))
  }
}

function readPackedTarball(entry) {
  const tarballPath = join(packDir, entry.tarballName)
  if (!existsSync(tarballPath)) {
    throw new Error(`Missing packed tarball for ${entry.packageName}: ${tarballPath}`)
  }
  const listing = run('tar', ['-tzf', tarballPath], { capture: true })
  const packageJsonSource = run('tar', ['-xOf', tarballPath, 'package/package.json'], {
    capture: true
  })
  return {
    packageJson: JSON.parse(packageJsonSource),
    files: listing
      .split('\n')
      .filter(Boolean)
      .map(normalizePackPath)
  }
}

function hasWorkspaceDependency(packageJson) {
  const dependencyGroups = [
    packageJson.dependencies,
    packageJson.devDependencies,
    packageJson.peerDependencies,
    packageJson.optionalDependencies
  ]
  return dependencyGroups.some(group =>
    Object.values(group || {}).some(version => typeof version === 'string' && version.startsWith('workspace:'))
  )
}

function isAllowedBinScript(entry, path) {
  return Object.values(entry.packageJson.bin || {})
    .filter(value => typeof value === 'string')
    .map(value => value.replace(/^\.\//, ''))
    .includes(path)
}

function sourceEntrypoints(entry) {
  return new Set(
    collectPackageEntrypoints(entry.packageJson)
      .map(value => value.replace(/^\.\//, ''))
      .filter(value => value.startsWith('src/'))
  )
}

function assertNoForbiddenPackFiles(entry, files) {
  const allowedSourceEntrypoints = sourceEntrypoints(entry)
  const forbiddenPatterns = [
    { pattern: /^packages\//, reason: 'workspace package directory' },
    { pattern: /^docs\//, reason: 'documentation source directory' },
    { pattern: /^public\//, reason: 'public source directory' },
    { pattern: /^ecosystem\//, reason: 'ecosystem source metadata' },
    { pattern: /^\.release\//, reason: 'local release staging output' },
    { pattern: /^node_modules\//, reason: 'installed dependency output' },
    { pattern: /^\.git\//, reason: 'git metadata' },
    { pattern: /(^|\/)\.DS_Store$/, reason: 'macOS metadata' },
    { pattern: /(^|\/)\.env(\.|$)/, reason: 'environment secret file' },
    { pattern: /(^|\/)tsconfig(?:\..*)?\.json$/, reason: 'TypeScript build config' },
    { pattern: /(^|\/).*\.tsbuildinfo$/, reason: 'TypeScript incremental state' },
    { pattern: /(^|\/)(vite|rollup|webpack|eslint|prettier)\.config\./, reason: 'build tooling config' },
    { pattern: /(^|\/)(pnpm-lock|package-lock|yarn)\.lock$/, reason: 'workspace lockfile' },
    { pattern: /(^|\/).*\.map$/, reason: 'source map' }
  ]

  for (const file of files) {
    if (file.startsWith('src/') && (!entry.publicSource || !allowedSourceEntrypoints.has(file))) {
      throw new Error(`${entry.packageName} tarball includes undeclared source file: ${file}`)
    }
    if (file.startsWith('scripts/') && !isAllowedBinScript(entry, file)) {
      throw new Error(`${entry.packageName} tarball includes non-bin script ${file}`)
    }
    const match = forbiddenPatterns.find(rule => rule.pattern.test(file))
    if (match) {
      throw new Error(`${entry.packageName} tarball includes forbidden ${match.reason}: ${file}`)
    }
  }
}

function assertEntrypointsPacked(entry, files) {
  const packedFiles = new Set(files)
  for (const entrypoint of collectPackageEntrypoints(entry.packageJson)) {
    if (entrypoint.includes('*')) {
      continue
    }
    const normalized = entrypoint.replace(/^\.\//, '')
    if (!packedFiles.has(normalized)) {
      throw new Error(`${entry.packageName} tarball is missing entrypoint ${entrypoint}`)
    }
  }
}

function assertWebGlobalBundlePacked(entry, files) {
  if (!webGlobalPackages.has(entry.packageName)) {
    return
  }
  if (!new Set(files).has(webGlobalBundle)) {
    throw new Error(`${entry.packageName} tarball is missing browser global bundle ${webGlobalBundle}`)
  }
}

function assertRequiredDocs(entry, files) {
  const packedFiles = new Set(files)
  for (const requiredFile of ['package.json', 'README.md', 'README.en.md']) {
    if (!packedFiles.has(requiredFile)) {
      throw new Error(`${entry.packageName} tarball is missing ${requiredFile}`)
    }
  }
}

function verifyPack(entry, pack) {
  assertRequiredDocs(entry, pack.files)
  assertNoForbiddenPackFiles(entry, pack.files)
  assertWebGlobalBundlePacked(entry, pack.files)
  if (mode === 'tarball') {
    assertEntrypointsPacked(entry, pack.files)
    if (hasWorkspaceDependency(pack.packageJson)) {
      throw new Error(`${entry.packageName} packed package.json still contains workspace: dependencies`)
    }
  }
}

let checkedFileCount = 0
for (const entry of entries) {
  const pack = mode === 'tarball' ? readPackedTarball(entry) : readDryRunPack(entry)
  verifyPack(entry, pack)
  checkedFileCount += pack.files.length
}

console.log(
  `[ecosystem-tarballs] Verified ${entries.length} ${mode === 'tarball' ? 'packed tarball' : 'npm dry-run'} package${entries.length === 1 ? '' : 's'} and ${checkedFileCount} file entries.`
)
