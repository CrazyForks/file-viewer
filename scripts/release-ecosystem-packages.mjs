import { existsSync } from 'node:fs'
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const sourceRoot = resolve(scriptDir, '..')
const args = process.argv.slice(2)

const readArg = (name, fallback) => {
  const index = args.indexOf(name)
  return index >= 0 ? args[index + 1] : fallback
}

const mode = args.includes('--publish')
  ? 'publish'
  : args.includes('--list')
    ? 'list'
    : 'pack'
const dryRun = args.includes('--dry-run')
const clean = args.includes('--clean')
const packDir = resolve(
  sourceRoot,
  readArg('--pack-dir', process.env.FILE_VIEWER_ECOSYSTEM_PACK_DIR || '.release/ecosystem')
)

const rootPackage = await readJson(join(sourceRoot, 'package.json'))
const wrapperManifest = await readJson(join(sourceRoot, 'ecosystem', 'wrappers.json'))

const packageSpecs = [
  {
    id: 'core',
    kind: 'core',
    packageDir: 'packages/core',
    publicSource: false
  },
  {
    id: 'vue3-compat-scoped',
    kind: 'compatibility',
    packageDir: '.',
    publicSource: false
  },
  {
    id: 'vue3-compat-unscoped',
    kind: 'compatibility',
    packageDir: 'packages/vue3-unscoped',
    publicSource: false
  },
  {
    id: 'web-compat',
    kind: 'compatibility',
    packageDir: 'packages/web',
    publicSource: false
  },
  {
    id: 'react-compat',
    kind: 'compatibility',
    packageDir: 'packages/react',
    publicSource: false
  },
  ...wrapperManifest.wrappers.map(wrapper => ({
    id: wrapper.id,
    kind: 'standard-wrapper',
    packageDir: wrapper.packageDir,
    wrapper,
    publicSource: true
  }))
]

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'))
}

function npmPackFilename(packageName, packageVersion) {
  return `${packageName.replace(/^@/, '').replace(/\//g, '-')}-${packageVersion}.tgz`
}

function run(command, commandArgs, cwd = sourceRoot) {
  console.log(`$ ${[command, ...commandArgs].join(' ')}`)
  const result = spawnSync(command, commandArgs, {
    cwd,
    encoding: 'utf8',
    stdio: 'inherit'
  })
  if (result.status !== 0) {
    throw new Error(`Command failed: ${command} ${commandArgs.join(' ')}`)
  }
}

async function assertDirectory(path, label = path) {
  if (!existsSync(path)) {
    throw new Error(`Missing directory: ${label}`)
  }
  const info = await stat(path)
  if (!info.isDirectory()) {
    throw new Error(`Not a directory: ${label}`)
  }
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

function collectExportEntrypoints(value, paths = new Set()) {
  if (!value) {
    return paths
  }
  if (typeof value === 'string') {
    paths.add(value)
    return paths
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      collectExportEntrypoints(item, paths)
    }
    return paths
  }
  if (typeof value === 'object') {
    for (const item of Object.values(value)) {
      collectExportEntrypoints(item, paths)
    }
  }
  return paths
}

function collectPackageEntrypoints(packageJson) {
  const entrypoints = new Set()
  for (const field of ['main', 'module', 'browser', 'types', 'svelte']) {
    if (typeof packageJson[field] === 'string') {
      entrypoints.add(packageJson[field])
    }
  }
  for (const item of collectExportEntrypoints(packageJson.exports)) {
    entrypoints.add(item)
  }
  for (const item of Object.values(packageJson.bin || {})) {
    if (typeof item === 'string') {
      entrypoints.add(item)
    }
  }
  return [...entrypoints].filter(entrypoint =>
    !entrypoint.startsWith('/') &&
    !entrypoint.includes(':') &&
    !entrypoint.includes('*') &&
    !entrypoint.startsWith('#') &&
    entrypoint !== './' &&
    entrypoint !== '.'
  )
}

async function verifyPackageEntrypoints(entry, { requireFiles }) {
  for (const field of ['main', 'module', 'types']) {
    if (!entry.packageJson[field]) {
      throw new Error(`${entry.packageName} is missing package.json ${field}`)
    }
  }
  if (!entry.packageJson.exports?.['.']) {
    throw new Error(`${entry.packageName} is missing package.json exports["."]`)
  }

  if (!requireFiles) {
    return
  }

  for (const entrypoint of collectPackageEntrypoints(entry.packageJson)) {
    await assertFile(
      join(entry.absoluteDir, entrypoint),
      `${entry.packageName} entrypoint ${entrypoint}. Run pnpm release:ecosystem:build before packing or publishing`
    )
  }
}

async function packageEntry(spec) {
  const absoluteDir = resolve(sourceRoot, spec.packageDir)
  const packageJson = await readJson(join(absoluteDir, 'package.json'))
  return {
    ...spec,
    absoluteDir,
    packageJson,
    packageName: packageJson.name,
    version: packageJson.version,
    tarballName: npmPackFilename(packageJson.name, packageJson.version)
  }
}

async function verifyPackage(entry, options) {
  await assertDirectory(entry.absoluteDir, entry.packageDir)
  await assertFile(join(entry.absoluteDir, 'package.json'), `${entry.packageDir}/package.json`)
  await assertFile(join(entry.absoluteDir, 'README.md'), `${entry.packageDir}/README.md`)
  if (entry.packageDir !== '.') {
    await assertFile(join(entry.absoluteDir, 'README.en.md'), `${entry.packageDir}/README.en.md`)
  }
  if (entry.packageJson.private === true) {
    throw new Error(`${entry.packageName} is private and cannot be released`)
  }
  if (entry.version !== rootPackage.version) {
    throw new Error(`${entry.packageName} version ${entry.version} does not match root version ${rootPackage.version}`)
  }
  if (entry.packageJson.publishConfig?.access !== 'public') {
    throw new Error(`${entry.packageName} must publish with access=public`)
  }
  await verifyPackageEntrypoints(entry, options)
}

const entries = await Promise.all(packageSpecs.map(packageEntry))
const names = new Set()
for (const entry of entries) {
  if (names.has(entry.packageName)) {
    throw new Error(`Duplicate release package: ${entry.packageName}`)
  }
  names.add(entry.packageName)
  await verifyPackage(entry, { requireFiles: mode !== 'list' })
}

if (mode === 'list') {
  console.log(JSON.stringify({
    version: rootPackage.version,
    packages: entries.map(entry => ({
      id: entry.id,
      kind: entry.kind,
      packageName: entry.packageName,
      version: entry.version,
      packageDir: entry.packageDir,
      tarballName: entry.tarballName,
      publicSource: entry.publicSource,
      github: entry.wrapper?.github ?? null,
      gitee: entry.wrapper?.gitee ?? null
    }))
  }, null, 2))
  process.exit(0)
}

if (mode === 'pack') {
  if (clean) {
    await rm(packDir, { recursive: true, force: true })
  }
  await mkdir(packDir, { recursive: true })
  for (const entry of entries) {
    run('pnpm', ['-C', entry.packageDir, 'pack', '--pack-destination', packDir])
    await assertFile(join(packDir, entry.tarballName), `${entry.packageName} tarball`)
  }
  const manifest = {
    version: rootPackage.version,
    generatedAt: new Date().toISOString(),
    packageCount: entries.length,
    packages: entries.map(entry => ({
      id: entry.id,
      kind: entry.kind,
      packageName: entry.packageName,
      version: entry.version,
      packageDir: entry.packageDir,
      tarball: entry.tarballName,
      publicSource: entry.publicSource,
      github: entry.wrapper?.github ?? null,
      gitee: entry.wrapper?.gitee ?? null
    }))
  }
  await writeFile(
    join(packDir, 'npm-release-manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
    'utf8'
  )
  console.log(`Packed ${entries.length} ecosystem packages into ${packDir}`)
}

if (mode === 'publish') {
  for (const entry of entries) {
    const publishArgs = ['-C', entry.packageDir, 'publish', '--access', 'public']
    if (dryRun) {
      publishArgs.push('--dry-run')
    }
    run('pnpm', publishArgs)
  }
  console.log(`${dryRun ? 'Dry-run published' : 'Published'} ${entries.length} ecosystem packages.`)
}
