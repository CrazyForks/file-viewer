import { existsSync } from 'node:fs'
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import {
  collectPackageEntrypoints,
  loadEcosystemReleaseContext,
  readJson
} from './lib/ecosystem-packages.mjs'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const sourceRoot = resolve(scriptDir, '..')
const args = process.argv.slice(2)

const readArg = (name, fallback) => {
  const index = args.indexOf(name)
  return index >= 0 ? args[index + 1] : fallback
}

const outputRoot = resolve(
  sourceRoot,
  readArg(
    '--out-dir',
    process.env.FILE_VIEWER_COMPONENT_REPO_DIR ||
      process.env.FILE_VIEWER_WRAPPER_REPO_DIR ||
      '.release/component-repos'
  )
)
const smokeRoot = resolve(
  sourceRoot,
  readArg(
    '--tmp-dir',
    process.env.FILE_VIEWER_COMPONENT_STANDALONE_SMOKE_DIR ||
      process.env.FILE_VIEWER_WRAPPER_STANDALONE_SMOKE_DIR ||
      '.release/component-standalone-smoke'
  )
)
const selectedPackages = new Set(
  args
    .filter(arg => arg.startsWith('--package='))
    .map(arg => arg.slice('--package='.length))
)
const selectedIds = new Set(
  args
    .filter(arg => arg.startsWith('--id='))
    .map(arg => arg.slice('--id='.length))
)
const keepTemp = args.includes('--keep-temp')
const packageManager = readArg('--package-manager', process.env.FILE_VIEWER_WRAPPER_STANDALONE_PM || 'npm')
const commandTimeoutMs = Number(
  readArg('--timeout-ms', process.env.FILE_VIEWER_WRAPPER_STANDALONE_TIMEOUT_MS || '300000')
)

const { wrapperManifest, entries } = await loadEcosystemReleaseContext(sourceRoot)
const entryByPackageName = new Map(entries.map(entry => [entry.packageName, entry]))

const run = (command, commandArgs, cwd = sourceRoot, options = {}) => {
  console.log(`$ ${[command, ...commandArgs].join(' ')}`)
  const result = spawnSync(command, commandArgs, {
    cwd,
    encoding: 'utf8',
    stdio: options.quiet ? 'pipe' : 'inherit',
    timeout: options.timeoutMs ?? commandTimeoutMs,
    killSignal: 'SIGTERM'
  })
  if (result.error) {
    throw new Error(
      [
        `Command failed in ${cwd}: ${command} ${commandArgs.join(' ')}`,
        result.error.message,
        result.stdout,
        result.stderr
      ].filter(Boolean).join('\n')
    )
  }
  if (result.status !== 0) {
    throw new Error(
      [
        `Command failed in ${cwd}: ${command} ${commandArgs.join(' ')}`,
        result.stdout,
        result.stderr
      ].filter(Boolean).join('\n')
    )
  }
  return result.stdout?.trim() || ''
}

const writeJson = async (path, value) => {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

const toFileSpec = (fromDir, targetFile) => {
  const relativePath = relative(fromDir, targetFile).split(sep).join('/')
  return `file:${relativePath.startsWith('.') ? relativePath : `./${relativePath}`}`
}

const dependencyBlocks = packageJson => [
  packageJson.dependencies,
  packageJson.devDependencies,
  packageJson.optionalDependencies
].filter(Boolean)

const localDependencyNames = packageJson => {
  const names = new Set()
  for (const block of dependencyBlocks(packageJson)) {
    for (const name of Object.keys(block)) {
      if (entryByPackageName.has(name)) {
        names.add(name)
      }
    }
  }
  return names
}

const collectLocalDependencyClosure = (packageJson, collected = new Set()) => {
  for (const dependencyName of localDependencyNames(packageJson)) {
    if (collected.has(dependencyName)) {
      continue
    }
    collected.add(dependencyName)
    const entry = entryByPackageName.get(dependencyName)
    if (entry) {
      collectLocalDependencyClosure(entry.packageJson, collected)
    }
  }
  return collected
}

const assertBuiltEntrypoints = async entry => {
  for (const entrypoint of collectPackageEntrypoints(entry.packageJson)) {
    const absoluteEntrypoint = join(entry.absoluteDir, entrypoint)
    if (!existsSync(absoluteEntrypoint)) {
      throw new Error(
        `${entry.packageName} is missing ${entrypoint}. Run pnpm --filter ${entry.packageName} build before standalone wrapper smoke.`
      )
    }
  }
}

const rewriteLocalDependencies = (packageJson, tarballByPackageName, repoDir, closure) => {
  for (const block of dependencyBlocks(packageJson)) {
    for (const dependencyName of Object.keys(block)) {
      const tarball = tarballByPackageName.get(dependencyName)
      if (tarball) {
        block[dependencyName] = toFileSpec(repoDir, tarball)
      }
    }
  }

  packageJson.devDependencies ??= {}
  for (const dependencyName of closure) {
    if (dependencyName === packageJson.name) {
      continue
    }
    if (
      packageJson.dependencies?.[dependencyName] ||
      packageJson.optionalDependencies?.[dependencyName] ||
      packageJson.devDependencies?.[dependencyName]
    ) {
      continue
    }
    const tarball = tarballByPackageName.get(dependencyName)
    if (tarball) {
      packageJson.devDependencies[dependencyName] = toFileSpec(repoDir, tarball)
    }
  }
}

const installArgsFor = name => {
  if (name === 'npm') {
    return [
      'install',
      '--ignore-scripts',
      '--no-audit',
      '--no-fund',
      '--prefer-online',
      '--legacy-peer-deps',
      '--install-strategy=shallow'
    ]
  }
  if (name === 'pnpm') {
    return ['install', '--ignore-scripts', '--prefer-offline']
  }
  if (name === 'yarn') {
    return ['install', '--ignore-scripts']
  }
  throw new Error(`Unsupported package manager for standalone wrapper smoke: ${name}`)
}

const buildArgsFor = name => {
  if (name === 'npm') {
    return ['run', 'build']
  }
  if (name === 'pnpm') {
    return ['run', 'build']
  }
  if (name === 'yarn') {
    return ['build']
  }
  throw new Error(`Unsupported package manager for standalone wrapper smoke: ${name}`)
}

const wrappers = wrapperManifest.wrappers.filter(wrapper => {
  if (selectedPackages.size && !selectedPackages.has(wrapper.packageName)) {
    return false
  }
  if (selectedIds.size && !selectedIds.has(wrapper.id)) {
    return false
  }
  return true
})

if (!wrappers.length) {
  throw new Error('No wrappers selected for standalone build smoke.')
}

if (!existsSync(outputRoot)) {
  throw new Error(`Missing exported component repo directory: ${outputRoot}. Run pnpm components:export first.`)
}

const tarballDir = join(smokeRoot, 'tarballs')
const caseRoot = join(smokeRoot, 'cases')
if (!keepTemp) {
  await rm(smokeRoot, { recursive: true, force: true })
}
await mkdir(tarballDir, { recursive: true })
await mkdir(caseRoot, { recursive: true })

const dependencyClosure = new Set()
for (const wrapper of wrappers) {
  const wrapperPackageJson = await readJson(join(outputRoot, wrapper.repository, 'package.json'))
  collectLocalDependencyClosure(wrapperPackageJson, dependencyClosure)
}

const tarballByPackageName = new Map()
for (const packageName of dependencyClosure) {
  const entry = entryByPackageName.get(packageName)
  if (!entry) {
    continue
  }
  await assertBuiltEntrypoints(entry)
  run('pnpm', ['-C', entry.packageDir, 'pack', '--pack-destination', tarballDir], sourceRoot, { quiet: true })
  const tarball = join(tarballDir, entry.tarballName)
  if (!existsSync(tarball)) {
    throw new Error(`Expected local tarball was not created: ${tarball}`)
  }
  tarballByPackageName.set(packageName, tarball)
  console.log(`Packed ${entry.packageName} -> ${entry.tarballName}`)
}

for (const wrapper of wrappers) {
  const exportedRepoDir = join(outputRoot, wrapper.repository)
  const repoDir = join(caseRoot, wrapper.repository)
  await rm(repoDir, { recursive: true, force: true })
  await cp(exportedRepoDir, repoDir, { recursive: true, force: true })

  const packageJsonPath = join(repoDir, 'package.json')
  const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'))
  const closure = collectLocalDependencyClosure(packageJson)
  rewriteLocalDependencies(packageJson, tarballByPackageName, repoDir, closure)
  await writeJson(packageJsonPath, packageJson)

  run(packageManager, installArgsFor(packageManager), repoDir)
  run(packageManager, buildArgsFor(packageManager), repoDir)
  console.log(`Standalone build smoke passed for ${wrapper.packageName}`)
}

console.log(`Verified ${wrappers.length} standalone wrapper build${wrappers.length === 1 ? '' : 's'} with ${packageManager}.`)
