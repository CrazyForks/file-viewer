import { existsSync } from 'node:fs'
import { cp, mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { readJson } from './lib/ecosystem-packages.mjs'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const sourceRoot = resolve(scriptDir, '..')
const args = process.argv.slice(2)

function readArg(name, fallback) {
  const index = args.indexOf(name)
  return index >= 0 ? args[index + 1] : fallback
}

const publicRepoDir = resolve(
  sourceRoot,
  readArg('--public-repo-dir', process.env.FILE_VIEWER_PUBLIC_REPO_DIR || '../file-viewer-public')
)
const snapshotDir = resolve(
  sourceRoot,
  readArg('--snapshot-dir', process.env.FILE_VIEWER_PUBLIC_GITEE_SNAPSHOT_DIR || '.release/public-gitee-snapshot')
)
const branch = readArg('--branch', 'main')
const shouldPush = args.includes('--push')
const keepSnapshot = args.includes('--keep')
const confirmRewriteHistory = args.includes('--confirm-rewrite-history')
const branchRoles = await readJson(join(sourceRoot, 'ecosystem', 'branch-roles.json'))
const remoteUrl = readArg('--remote-url', branchRoles.publicMainRepository.gitee)
const explicitMessage = readArg('--message', process.env.FILE_VIEWER_PUBLIC_GITEE_COMMIT_MESSAGE || '')
const packageMetadataFiles = ['package.json', 'README.md', 'README.en.md', 'LICENSE']
const excludedSnapshotPrefixes = [
  'apps/',
  'demo/',
  'component-demo/',
  'docs-dist/',
  'example/',
  'docs/.vitepress/cache/',
  'packages/'
]
const excludedRuntimePrefixes = [
  'packages/components/web/viewer/',
  'packages/compat/web/viewer/',
  'packages/components/web-full/dist/renderers/',
  'packages/components/web-full/dist/vendor/',
  'packages/components/web-full/dist/wasm/'
]
const excludedSnapshotFiles = [
  /^artifacts\/file-viewer-v[23]-.*-(demo|component-demo|docs)\.tar\.gz$/
]
const skipStats = {
  count: 0,
  bytes: 0,
  examples: []
}

function readNumberArg(name, fallback) {
  const value = readArg(name, fallback)
  const number = Number(value)
  return Number.isFinite(number) ? number : Number(fallback)
}

const maxFileMegabytes = Math.max(
  1,
  readNumberArg('--max-file-mb', process.env.FILE_VIEWER_PUBLIC_GITEE_MAX_FILE_MB || '25')
)
const maxFileBytes = maxFileMegabytes * 1024 * 1024

function run(command, commandArgs, options = {}) {
  const result = spawnSync(command, commandArgs, {
    cwd: options.cwd || sourceRoot,
    encoding: 'utf8',
    stdio: options.capture ? 'pipe' : 'inherit',
    // The open-source aggregate carries many offline assets. Captured commands
    // such as `git ls-files -z` can exceed Node's default 1 MiB buffer.
    maxBuffer: 256 * 1024 * 1024
  })

  if (result.status !== 0 && !options.allowFailure) {
    throw new Error(
      `Command failed in ${options.cwd || sourceRoot}: ${[command, ...commandArgs].join(' ')}\n${
        result.stderr || result.stdout || ''
      }`
    )
  }

  return (result.stdout || '').trim()
}

function toPosixPath(path) {
  return path.split(sep).join('/')
}

function isExcludedPath(relativePath, prefixes = []) {
  const normalized = toPosixPath(relativePath)
  return prefixes.some(prefix => normalized === prefix.slice(0, -1) || normalized.startsWith(prefix))
}

function isExcludedSnapshotFile(relativePath) {
  const normalized = toPosixPath(relativePath)
  return excludedSnapshotFiles.some(pattern => pattern.test(normalized))
}

function recordSkip(relativePath, size = 0, reason = 'excluded') {
  skipStats.count += 1
  skipStats.bytes += size
  if (skipStats.examples.length < 12) {
    skipStats.examples.push(`${relativePath} (${reason})`)
  }
}

async function shouldSkipFile(path, relativePath, reasonPrefix) {
  const info = await stat(path)
  if (!info.isFile()) {
    return false
  }
  if (info.size > maxFileBytes) {
    recordSkip(relativePath, info.size, `>${maxFileMegabytes}MB`)
    return true
  }
  if (reasonPrefix) {
    recordSkip(relativePath, info.size, reasonPrefix)
    return true
  }
  return false
}

function assertCleanGitRepo(cwd, label) {
  if (!existsSync(join(cwd, '.git'))) {
    throw new Error(`${label} is not a git repository: ${cwd}`)
  }

  const status = run('git', ['status', '--porcelain'], { cwd, capture: true })
  if (status) {
    throw new Error(`${label} has uncommitted changes. Commit or clean it first:\n${status}`)
  }
}

function firstRefHash(output) {
  return output.split('\n').find(Boolean)?.split(/\s+/)[0] || ''
}

function lsRemoteHead(url, branchName) {
  return firstRefHash(
    run('git', ['ls-remote', url, `refs/heads/${branchName}`], {
      capture: true,
      allowFailure: true
    })
  )
}

function compactCommitSubject(subject) {
  return subject.replace(/\s+/g, ' ').trim()
}

function publicCommitSubject(repoDir) {
  return compactCommitSubject(run('git', ['log', '-1', '--pretty=%s'], { cwd: repoDir, capture: true }))
}

function snapshotCommitMessage(repoDir) {
  if (explicitMessage) {
    return compactCommitSubject(explicitMessage)
  }
  const subject = publicCommitSubject(repoDir)
  return subject
    ? `chore: publish Gitee open-source snapshot - ${subject}`
    : 'chore: publish Gitee open-source snapshot'
}

async function copyTrackedFiles(from, to) {
  const trackedFiles = run('git', ['ls-files', '-z'], { cwd: from, capture: true })
    .split('\0')
    .filter(Boolean)

  let copied = 0
  for (const file of trackedFiles) {
    const source = join(from, file)
    if (isExcludedPath(file, excludedSnapshotPrefixes) || isExcludedSnapshotFile(file)) {
      await shouldSkipFile(source, file, 'gitee-slim')
      continue
    }
    if (await shouldSkipFile(source, file)) {
      continue
    }
    const target = join(to, file)
    await mkdir(dirname(target), { recursive: true })
    await cp(source, target, { force: true, preserveTimestamps: true })
    copied += 1
  }

  return copied
}

async function pathExists(path) {
  try {
    await stat(path)
    return true
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return false
    }
    throw error
  }
}

async function copyIfExists(source, target, options = {}) {
  if (!(await pathExists(source))) {
    return false
  }
  const sourceRelative = toPosixPath(relative(sourceRoot, source))
  const skippedByPrefix = options.runtime ? isExcludedPath(sourceRelative, excludedRuntimePrefixes) : false
  if (skippedByPrefix) {
    recordSkip(sourceRelative, 0, 'gitee-runtime-slim')
    return false
  }
  await mkdir(dirname(target), { recursive: true })
  await cp(source, target, {
    recursive: true,
    force: true,
    preserveTimestamps: true,
    filter: async path => {
      const relativePath = toPosixPath(relative(sourceRoot, path))
      if (options.runtime && isExcludedPath(relativePath, excludedRuntimePrefixes)) {
        recordSkip(relativePath, 0, 'gitee-runtime-slim')
        return false
      }
      const info = await stat(path)
      if (info.isFile() && info.size > maxFileBytes) {
        recordSkip(relativePath, info.size, `>${maxFileMegabytes}MB`)
        return false
      }
      return true
    }
  })
  return true
}

async function listPackageDirs(section) {
  const root = join(sourceRoot, 'packages', section)
  if (!(await pathExists(root))) {
    return []
  }
  const entries = await readdir(root, { withFileTypes: true })
  const dirs = []
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue
    }
    const relativeDir = `packages/${section}/${entry.name}`
    if (await pathExists(join(sourceRoot, relativeDir, 'package.json'))) {
      dirs.push(relativeDir)
    }
  }
  return dirs
}

async function packageDirs() {
  return [
    'packages/core',
    ...(await listPackageDirs('renderers')),
    ...(await listPackageDirs('components')),
    ...(await listPackageDirs('compat'))
  ]
}

function normalizeRuntimePackageJson(packageJson) {
  delete packageJson.scripts
  delete packageJson.devDependencies
  delete packageJson.publishConfig

  if (packageJson.name === '@file-viewer/svelte') {
    delete packageJson.svelte
    packageJson.main = './dist/index.js'
    packageJson.module = './dist/index.js'
    packageJson.types = './dist/index.d.ts'
    packageJson.exports = {
      '.': {
        types: './dist/index.d.ts',
        import: './dist/index.js',
        default: './dist/index.js'
      },
      './action': {
        types: './dist/index.d.ts',
        import: './dist/index.js',
        default: './dist/index.js'
      },
      './types': {
        types: './dist/index.d.ts',
        import: './dist/index.js',
        default: './dist/index.js'
      },
      './package.json': './package.json'
    }
    packageJson.files = ['dist', 'README.md', 'README.en.md']
  }

  return packageJson
}

async function copyRuntimePackage(relativePackageDir, snapshotRoot) {
  const sourcePackageDir = join(sourceRoot, relativePackageDir)
  const targetPackageDir = join(snapshotRoot, relativePackageDir)

  await rm(targetPackageDir, { recursive: true, force: true })
  await mkdir(targetPackageDir, { recursive: true })

  for (const filename of packageMetadataFiles) {
    await copyIfExists(join(sourcePackageDir, filename), join(targetPackageDir, filename))
  }

  const packageJsonPath = join(targetPackageDir, 'package.json')
  const packageJson = normalizeRuntimePackageJson(JSON.parse(await readFile(packageJsonPath, 'utf8')))
  await writeFile(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`, 'utf8')

  await copyIfExists(join(sourcePackageDir, 'dist'), join(targetPackageDir, 'dist'), { runtime: true })
  await copyIfExists(join(sourcePackageDir, 'vendor'), join(targetPackageDir, 'vendor'), { runtime: true })
  await copyIfExists(join(sourcePackageDir, 'viewer'), join(targetPackageDir, 'viewer'), { runtime: true })
  await copyIfExists(
    join(sourcePackageDir, 'scripts', 'copy-assets.mjs'),
    join(targetPackageDir, 'scripts', 'copy-assets.mjs')
  )
}

async function replacePackagesWithRuntimeDist(snapshotRoot) {
  const dirs = await packageDirs()
  await rm(join(snapshotRoot, 'packages'), { recursive: true, force: true })
  for (const relativePackageDir of dirs) {
    await copyRuntimePackage(relativePackageDir, snapshotRoot)
  }
  return dirs.length
}

async function rewriteSnapshotRootPackage(snapshotRoot) {
  const packagePath = join(snapshotRoot, 'package.json')
  const packageJson = JSON.parse(await readFile(packagePath, 'utf8'))
  packageJson.scripts = {
    'docs:dev': packageJson.scripts?.['docs:dev'] || 'vitepress dev docs',
    'docs:build': packageJson.scripts?.['docs:build'] || 'vitepress build docs',
    'docs:preview': packageJson.scripts?.['docs:preview'] || 'vitepress preview docs'
  }
  await writeFile(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`, 'utf8')
}

if (shouldPush && !confirmRewriteHistory) {
  throw new Error(
    'Refusing to rewrite the Gitee open-source main mirror without --confirm-rewrite-history. ' +
      'This command intentionally publishes a shallow snapshot branch to avoid oversized historical packs.'
  )
}

assertCleanGitRepo(publicRepoDir, 'Open-source main repository')

const publicHead = run('git', ['rev-parse', 'HEAD'], { cwd: publicRepoDir, capture: true })
const publicTree = run('git', ['rev-parse', 'HEAD^{tree}'], { cwd: publicRepoDir, capture: true })
const remoteHead = lsRemoteHead(remoteUrl, branch)
const message = snapshotCommitMessage(publicRepoDir)

await rm(snapshotDir, { recursive: true, force: true })
await mkdir(snapshotDir, { recursive: true })

const fileCount = await copyTrackedFiles(publicRepoDir, snapshotDir)
const packageCount = await replacePackagesWithRuntimeDist(snapshotDir)
await rewriteSnapshotRootPackage(snapshotDir)

run('git', ['init', '-b', branch], { cwd: snapshotDir })
run('git', ['config', 'user.name', 'Flyfish Release Bot'], { cwd: snapshotDir })
run('git', ['config', 'user.email', 'release@flyfish.dev'], { cwd: snapshotDir })
run('git', ['add', '-A'], { cwd: snapshotDir })
run(
  'git',
  [
    'commit',
    '-m',
    message,
    '-m',
    `Snapshot source: ${publicHead}`,
    '-m',
    `Snapshot tree: ${publicTree}`
  ],
  { cwd: snapshotDir }
)
run('git', ['remote', 'add', 'gitee', remoteUrl], { cwd: snapshotDir })

const snapshotHead = run('git', ['rev-parse', 'HEAD'], { cwd: snapshotDir, capture: true })
const snapshotTree = run('git', ['rev-parse', 'HEAD^{tree}'], { cwd: snapshotDir, capture: true })

console.log(`Prepared Gitee snapshot mirror in ${snapshotDir}`)
console.log(`Tracked files: ${fileCount}`)
console.log(`Runtime package directories: ${packageCount}`)
console.log(`Skipped Gitee-only heavy/resource files: ${skipStats.count}`)
console.log(`Skipped bytes: ${(skipStats.bytes / 1024 / 1024).toFixed(1)} MiB`)
if (skipStats.examples.length) {
  console.log(`Skipped examples: ${skipStats.examples.join('; ')}`)
}
console.log(`Public source commit: ${publicHead}`)
console.log(`Snapshot commit: ${snapshotHead}`)
console.log(`Public tree: ${publicTree}`)
console.log(`Snapshot tree: ${snapshotTree}`)
console.log(`Gitee ${branch}: ${remoteHead || '(missing)'}`)

if (shouldPush) {
  const pushArgs = ['push', 'gitee', `HEAD:refs/heads/${branch}`]
  if (remoteHead) {
    pushArgs.push(`--force-with-lease=refs/heads/${branch}:${remoteHead}`)
  }

  run('git', pushArgs, { cwd: snapshotDir })
  console.log(`Published shallow snapshot mirror to ${remoteUrl} ${branch}.`)
} else {
  console.log(
    'Dry run complete. To publish the shallow Gitee mirror, rerun with --push --confirm-rewrite-history.'
  )
}

if (!keepSnapshot) {
  await rm(snapshotDir, { recursive: true, force: true })
}
