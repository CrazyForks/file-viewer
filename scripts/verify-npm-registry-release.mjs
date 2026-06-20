import { existsSync } from 'node:fs'
import { mkdtemp, rm, stat } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { loadEcosystemReleaseContext } from './lib/ecosystem-packages.mjs'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const sourceRoot = resolve(scriptDir, '..')
const args = process.argv.slice(2)

function readArg(name, fallback) {
  const index = args.indexOf(name)
  return index >= 0 ? args[index + 1] : fallback
}

const explicitPackDir = readArg('--pack-dir', '')
const packDir = explicitPackDir
  ? resolve(sourceRoot, explicitPackDir)
  : await mkdtemp(join(tmpdir(), 'file-viewer-npm-registry-'))
const registry = readArg(
  '--registry',
  process.env.FILE_VIEWER_NPM_REGISTRY ||
    process.env.NPM_CONFIG_REGISTRY ||
    process.env.npm_config_registry ||
    'https://registry.npmjs.org/'
)
const keep = args.includes('--keep')
const { entries } = await loadEcosystemReleaseContext(sourceRoot)

function run(command, commandArgs, options = {}) {
  const result = spawnSync(command, commandArgs, {
    cwd: options.cwd || sourceRoot,
    encoding: 'utf8',
    stdio: options.capture ? 'pipe' : 'inherit',
    timeout: options.timeout ?? 60_000,
    env: {
      ...process.env,
      npm_config_loglevel: 'error'
    }
  })
  if (result.status !== 0) {
    throw new Error(
      `Command failed: ${command} ${commandArgs.join(' ')}\n${result.stderr || result.stdout || result.error?.message || ''}`
    )
  }
  return result.stdout || ''
}

async function assertFile(path, label = path) {
  if (!existsSync(path)) {
    throw new Error(`Missing file: ${label}`)
  }
  const info = await stat(path)
  if (!info.isFile()) {
    throw new Error(`Not a file: ${label}`)
  }
}

function verifyNpmMetadata(entry) {
  const spec = `${entry.packageName}@${entry.version}`
  const output = run('npm', ['view', spec, 'name', 'version', 'dist.tarball', '--json', '--registry', registry], {
    capture: true
  })
  const metadata = JSON.parse(output)
  if (metadata.name !== entry.packageName) {
    throw new Error(`${spec} npm name ${metadata.name} !== ${entry.packageName}`)
  }
  if (metadata.version !== entry.version) {
    throw new Error(`${spec} npm version ${metadata.version} !== ${entry.version}`)
  }
  const tarball = metadata.dist?.tarball || metadata['dist.tarball']
  if (!tarball) {
    throw new Error(`${spec} is missing npm dist.tarball`)
  }
}

function downloadNpmTarball(entry) {
  const spec = `${entry.packageName}@${entry.version}`
  verifyNpmMetadata(entry)
  run('npm', ['pack', spec, '--pack-destination', packDir, '--registry', registry, '--json'], {
    capture: true,
    timeout: 120_000
  })
}

function readPackedPackageJson(entry) {
  const tarballPath = join(packDir, entry.tarballName)
  const source = run('tar', ['-xOf', tarballPath, 'package/package.json'], {
    capture: true
  })
  return JSON.parse(source)
}

try {
  if (!explicitPackDir) {
    for (const entry of entries) {
      downloadNpmTarball(entry)
    }
  }

  for (const entry of entries) {
    const tarballPath = join(packDir, entry.tarballName)
    await assertFile(tarballPath, `${entry.packageName} npm tarball`)
    const packageJson = readPackedPackageJson(entry)
    if (packageJson.name !== entry.packageName) {
      throw new Error(`${entry.tarballName} package name ${packageJson.name} !== ${entry.packageName}`)
    }
    if (packageJson.version !== entry.version) {
      throw new Error(`${entry.tarballName} package version ${packageJson.version} !== ${entry.version}`)
    }
  }

  run('node', ['scripts/verify-ecosystem-tarballs.mjs', '--pack-dir', packDir])
  console.log(
    `Verified ${entries.length} npm release tarball${entries.length === 1 ? '' : 's'} from ${explicitPackDir ? packDir : registry}.`
  )
} finally {
  if (!explicitPackDir && !keep) {
    await rm(packDir, { recursive: true, force: true })
  }
}
