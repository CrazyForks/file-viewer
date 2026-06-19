import { existsSync } from 'node:fs'
import { cp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { basename, join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const sourceRoot = process.cwd()
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

const sourceDir = join(sourceRoot, 'packages', 'core')
const rootPackage = await readJson(join(sourceRoot, 'package.json'))
const corePackage = await readJson(join(sourceDir, 'package.json'))
const ecosystemManifest = await readJson(join(sourceRoot, 'ecosystem', 'wrappers.json'))
const coreMetadata = ecosystemManifest.corePackage
const targetDir = join(outputRoot, coreMetadata.repository)

function run(command, commandArgs) {
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

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'))
}

async function writeJson(path, value) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
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

async function removePath(path) {
  await rm(path, { recursive: true, force: true })
}

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

async function copyCleanDir(from, to) {
  await removePath(to)
  await mkdir(to, { recursive: true })
  await cp(from, to, {
    recursive: true,
    force: true,
    filter: shouldCopy
  })
}

async function normalizePackageJson() {
  const packageJson = {
    ...corePackage,
    packageManager: rootPackage.packageManager,
    private: false,
    repository: {
      type: 'git',
      url: `git+${coreMetadata.github}.git`
    },
    homepage: coreMetadata.github,
    bugs: {
      url: `${coreMetadata.github}/issues`
    },
    scripts: {
      ...corePackage.scripts,
      build: 'node scripts/clean-dist.mjs && tsc -b tsconfig.json --force && node scripts/fix-core-esm-extensions.mjs'
    }
  }
  await writeJson(join(targetDir, 'package.json'), packageJson)
}

async function writeGitignore() {
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

async function writeManifest() {
  await writeJson(join(targetDir, 'package-repo-manifest.json'), {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    sourceBranch: run('git', ['branch', '--show-current']),
    sourceCommit: run('git', ['rev-parse', '--short', 'HEAD']),
    organization: ecosystemManifest.organization,
    packageName: coreMetadata.packageName,
    packageVersion: corePackage.version,
    repository: coreMetadata.repository,
    github: coreMetadata.github,
    gitee: coreMetadata.gitee,
    aggregateRepository: coreMetadata.aggregateRepository,
    sourcePackageDir: 'packages/core'
  })
}

await assertDirectory(sourceDir, 'packages/core')
await mkdir(outputRoot, { recursive: true })
await copyCleanDir(sourceDir, targetDir)
await cp(join(sourceRoot, 'LICENSE'), join(targetDir, 'LICENSE'), { force: true })
await cp(
  join(sourceRoot, 'scripts', 'fix-core-esm-extensions.mjs'),
  join(targetDir, 'scripts', 'fix-core-esm-extensions.mjs'),
  { force: true }
)
await normalizePackageJson()
await writeGitignore()
await writeManifest()

await assertFile(join(targetDir, 'package.json'), 'core package.json')
await assertFile(join(targetDir, 'README.md'), 'core README.md')
await assertFile(join(targetDir, 'README.en.md'), 'core README.en.md')
await assertFile(join(targetDir, 'LICENSE'), 'core LICENSE')
await assertFile(join(targetDir, 'src', 'index.ts'), 'core src/index.ts')

console.log(`Prepared ${coreMetadata.packageName} -> ${targetDir}`)
