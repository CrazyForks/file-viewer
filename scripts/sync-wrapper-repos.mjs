import { existsSync } from 'node:fs'
import { cp, mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { basename, dirname, join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const sourceRoot = resolve(scriptDir, '..')
const args = process.argv.slice(2)

const readArg = (name, fallback) => {
  const index = args.indexOf(name)
  return index >= 0 ? args[index + 1] : fallback
}

const outputRoot = resolve(
  sourceRoot,
  readArg('--out-dir', process.env.FILE_VIEWER_WRAPPER_REPO_DIR || '.release/wrapper-repos')
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
const keepExisting = args.includes('--keep-existing')

const workspacePackageDirs = [
  sourceRoot,
  ...(
    await readdir(join(sourceRoot, 'packages'), { withFileTypes: true })
  )
    .filter(entry => entry.isDirectory())
    .map(entry => join(sourceRoot, 'packages', entry.name))
]

const readJson = async path => JSON.parse(await readFile(path, 'utf8'))
const writeJson = async (path, value) => writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8')

const rootPackage = await readJson(join(sourceRoot, 'package.json'))
const wrapperManifest = await readJson(join(sourceRoot, 'ecosystem', 'wrappers.json'))

const workspaceVersions = new Map()
for (const packageDir of workspacePackageDirs) {
  const packagePath = join(packageDir, 'package.json')
  if (!existsSync(packagePath)) {
    continue
  }
  const packageJson = await readJson(packagePath)
  workspaceVersions.set(packageJson.name, packageJson.version)
}

const run = (command, commandArgs) => {
  const result = spawnSync(command, commandArgs, {
    cwd: sourceRoot,
    encoding: 'utf8',
    stdio: 'pipe'
  })
  if (result.status !== 0) {
    throw new Error(`Command failed: ${command} ${commandArgs.join(' ')}\n${result.stderr || result.stdout}`)
  }
  return result.stdout.trim()
}

const assertDirectory = async path => {
  if (!existsSync(path)) {
    throw new Error(`Missing directory: ${path}`)
  }
  const info = await stat(path)
  if (!info.isDirectory()) {
    throw new Error(`Not a directory: ${path}`)
  }
}

const assertFile = async path => {
  if (!existsSync(path)) {
    throw new Error(`Missing file: ${path}`)
  }
  const info = await stat(path)
  if (!info.isFile()) {
    throw new Error(`Not a file: ${path}`)
  }
}

const removePath = path => rm(path, { recursive: true, force: true })

const shouldCopy = source => {
  const name = basename(source)
  return ![
    '.DS_Store',
    '.git',
    '.vercel',
    'dist',
    'node_modules',
    'tsconfig.tsbuildinfo'
  ].includes(name)
}

const copyPackage = async (from, to) => {
  if (!keepExisting) {
    await removePath(to)
  }
  await mkdir(to, { recursive: true })
  await cp(from, to, {
    recursive: true,
    force: true,
    filter: shouldCopy
  })
}

const normalizeWorkspaceRange = (dependencyName, range) => {
  if (!range?.startsWith?.('workspace:')) {
    return range
  }
  const workspaceRange = range.slice('workspace:'.length)
  if (workspaceRange === '*' || workspaceRange === '') {
    const version = workspaceVersions.get(dependencyName)
    return version ? `^${version}` : `^${rootPackage.version}`
  }
  return workspaceRange
}

const normalizeDependencyBlock = block => {
  if (!block) {
    return
  }
  for (const [dependencyName, range] of Object.entries(block)) {
    block[dependencyName] = normalizeWorkspaceRange(dependencyName, range)
  }
}

const normalizePackageJson = async (targetDir, wrapper) => {
  const packagePath = join(targetDir, 'package.json')
  const packageJson = await readJson(packagePath)
  packageJson.packageManager = rootPackage.packageManager
  packageJson.private = false
  packageJson.repository = {
    type: 'git',
    url: `git+${wrapper.github}.git`
  }
  packageJson.homepage = wrapper.github
  packageJson.bugs = {
    url: `${wrapper.github}/issues`
  }
  normalizeDependencyBlock(packageJson.dependencies)
  normalizeDependencyBlock(packageJson.devDependencies)
  normalizeDependencyBlock(packageJson.peerDependencies)
  normalizeDependencyBlock(packageJson.optionalDependencies)
  await writeJson(packagePath, packageJson)
}

const writeGitignore = async targetDir => {
  await writeFile(
    join(targetDir, '.gitignore'),
    [
      'node_modules/',
      'dist/',
      '*.tgz',
      '*.tsbuildinfo',
      '.DS_Store',
      '.pnpm-store/',
      '.npm-cache/',
      ''
    ].join('\n'),
    'utf8'
  )
}

const writeStandaloneManifest = async (targetDir, wrapper, packageJson) => {
  const manifest = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    sourceBranch: run('git', ['branch', '--show-current']),
    sourceCommit: run('git', ['rev-parse', '--short', 'HEAD']),
    organization: wrapperManifest.organization,
    framework: wrapper.framework,
    packageName: wrapper.packageName,
    packageVersion: packageJson.version,
    repository: wrapper.repository,
    github: wrapper.github,
    gitee: wrapper.gitee,
    historicalPackages: wrapper.historicalPackages,
    sourcePackageDir: wrapper.packageDir,
    corePackage: wrapperManifest.corePackage.packageName,
    coreSourceVisibility: wrapperManifest.corePackage.visibility
  }
  await writeJson(join(targetDir, 'wrapper-repo-manifest.json'), manifest)
}

const assertStandaloneRepo = async (targetDir, wrapper) => {
  await assertFile(join(targetDir, 'package.json'))
  await assertFile(join(targetDir, 'README.md'))
  await assertFile(join(targetDir, 'README.en.md'))
  await assertFile(join(targetDir, 'LICENSE'))
  const packageJson = await readJson(join(targetDir, 'package.json'))
  if (packageJson.name !== wrapper.packageName) {
    throw new Error(`Package name mismatch in ${targetDir}: ${packageJson.name} !== ${wrapper.packageName}`)
  }
  const serialized = JSON.stringify(packageJson)
  if (serialized.includes('workspace:')) {
    throw new Error(`Workspace dependency leaked into standalone repo: ${targetDir}`)
  }
  if (existsSync(join(targetDir, 'node_modules')) || existsSync(join(targetDir, 'dist'))) {
    throw new Error(`Generated dependency/build output leaked into standalone repo: ${targetDir}`)
  }
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
  throw new Error('No wrappers selected for export.')
}

await mkdir(outputRoot, { recursive: true })
await assertFile(join(sourceRoot, 'LICENSE'))

for (const wrapper of wrappers) {
  const sourcePackageDir = join(sourceRoot, wrapper.packageDir)
  await assertDirectory(sourcePackageDir)
  const targetDir = join(outputRoot, wrapper.repository)
  await copyPackage(sourcePackageDir, targetDir)
  await cp(join(sourceRoot, 'LICENSE'), join(targetDir, 'LICENSE'), { force: true })
  await writeGitignore(targetDir)
  await normalizePackageJson(targetDir, wrapper)
  const targetPackageJson = await readJson(join(targetDir, 'package.json'))
  await writeStandaloneManifest(targetDir, wrapper, targetPackageJson)
  await assertStandaloneRepo(targetDir, wrapper)
  console.log(`Prepared ${wrapper.packageName} -> ${targetDir}`)
}

console.log(`Prepared ${wrappers.length} wrapper repo${wrappers.length === 1 ? '' : 's'} in ${outputRoot}`)
