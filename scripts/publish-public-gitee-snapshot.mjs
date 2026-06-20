import { existsSync } from 'node:fs'
import { cp, mkdir, rm } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
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
const message = readArg('--message', 'chore: publish open-source main snapshot mirror')

function run(command, commandArgs, options = {}) {
  const result = spawnSync(command, commandArgs, {
    cwd: options.cwd || sourceRoot,
    encoding: 'utf8',
    stdio: options.capture ? 'pipe' : 'inherit'
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

async function copyTrackedFiles(from, to) {
  const trackedFiles = run('git', ['ls-files', '-z'], { cwd: from, capture: true })
    .split('\0')
    .filter(Boolean)

  for (const file of trackedFiles) {
    const source = join(from, file)
    const target = join(to, file)
    await mkdir(dirname(target), { recursive: true })
    await cp(source, target, { force: true, preserveTimestamps: true })
  }

  return trackedFiles.length
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

await rm(snapshotDir, { recursive: true, force: true })
await mkdir(snapshotDir, { recursive: true })

const fileCount = await copyTrackedFiles(publicRepoDir, snapshotDir)

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
if (snapshotTree !== publicTree) {
  throw new Error(`Snapshot tree ${snapshotTree} does not match public tree ${publicTree}.`)
}

console.log(`Prepared Gitee snapshot mirror in ${snapshotDir}`)
console.log(`Tracked files: ${fileCount}`)
console.log(`Public source commit: ${publicHead}`)
console.log(`Snapshot commit: ${snapshotHead}`)
console.log(`Tree: ${snapshotTree}`)
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
