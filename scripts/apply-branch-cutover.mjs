import { existsSync } from 'node:fs'
import { cp, mkdtemp, readFile, rm, stat } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const sourceRoot = resolve(scriptDir, '..')
const args = process.argv.slice(2)

function readArg(name, fallback) {
  const index = args.indexOf(name)
  return index >= 0 ? args[index + 1] : fallback
}

const snapshotRoot = resolve(
  sourceRoot,
  readArg('--snapshot-dir', process.env.FILE_VIEWER_BRANCH_CUTOVER_DIR || '.release/branch-cutover')
)
const remoteName = readArg('--remote', process.env.FILE_VIEWER_BRANCH_CUTOVER_REMOTE || 'origin')
const pushEnabled = args.includes('--push')
const skipBackup = args.includes('--skip-backup')
const backupBranchArg = readArg('--backup-branch', '')

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'))
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

function run(command, commandArgs, options = {}) {
  const printable = `${[command, ...commandArgs].join(' ')}`
  console.log(`$ ${printable}`)
  const result = spawnSync(command, commandArgs, {
    cwd: options.cwd || sourceRoot,
    encoding: 'utf8',
    stdio: options.capture ? 'pipe' : 'inherit'
  })
  if (result.status !== 0) {
    throw new Error(`Command failed: ${printable}\n${result.stderr || result.stdout || ''}`)
  }
  return result.stdout?.trim() || ''
}

function sanitizeBranchSegment(value) {
  return value
    .replace(/[^a-zA-Z0-9._/-]+/g, '-')
    .replace(/\/+/g, '/')
    .replace(/^-+|-+$/g, '')
}

function defaultBackupBranch(version, sourceCommit) {
  const timestamp = new Date()
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z')
  return `workspace/pre-branch-cutover-v${version}-${sourceCommit}-${timestamp}`
}

function readRemoteHead(remoteRefs, branch) {
  const suffix = `refs/heads/${branch}`
  const line = remoteRefs
    .split('\n')
    .map(value => value.trim())
    .find(value => value.endsWith(suffix))
  return line ? line.split(/\s+/)[0] : ''
}

async function materializeSnapshot(target) {
  const targetDir = join(snapshotRoot, target.snapshotDir)
  await assertDirectory(targetDir, `${target.branch} snapshot`)
  await assertFile(join(targetDir, 'package.json'), `${target.branch} package.json`)
  await assertFile(join(targetDir, 'BRANCH_ROLE.md'), `${target.branch} BRANCH_ROLE.md`)

  const workDir = await mkdtemp(join(tmpdir(), `file-viewer-cutover-${target.branch}-`))
  await cp(targetDir, workDir, {
    recursive: true,
    force: true,
    filter: source => !source.split('/').includes('.git')
  })
  run('git', ['init', '--initial-branch', target.branch], { cwd: workDir })
  run('git', ['add', '-A'], { cwd: workDir })
  run(
    'git',
    [
      '-c',
      'user.name=Flyfish Release Bot',
      '-c',
      'user.email=release@flyfish.dev',
      'commit',
      '-m',
      `chore: cut over ${target.branch} to ${target.role}`
    ],
    { cwd: workDir }
  )
  const commit = run('git', ['rev-parse', '--short', 'HEAD'], { cwd: workDir, capture: true })
  const tree = run('git', ['rev-parse', 'HEAD^{tree}'], { cwd: workDir, capture: true })
  return {
    ...target,
    workDir,
    commit,
    tree
  }
}

async function cleanupMaterializedTargets(materializedTargets) {
  await Promise.all(
    materializedTargets.map(target => rm(target.workDir, { recursive: true, force: true }))
  )
}

await assertDirectory(snapshotRoot, 'branch cutover snapshot root')
run('node', ['scripts/prepare-branch-cutover.mjs', '--verify-only'])

const summary = await readJson(join(snapshotRoot, 'branch-cutover-summary.json'))
const branchRoles = await readJson(join(sourceRoot, 'ecosystem', 'branch-roles.json'))
const rootPackage = await readJson(join(sourceRoot, 'package.json'))
const sourceCommit = run('git', ['rev-parse', '--short', 'HEAD'], { capture: true })
const remoteUrl = run('git', ['remote', 'get-url', remoteName], { capture: true })

if (remoteUrl !== branchRoles.sourceRemote.url) {
  throw new Error(
    `Remote ${remoteName} points to ${remoteUrl}, expected private aggregate remote ${branchRoles.sourceRemote.url}`
  )
}

const workingTreeStatus = run('git', ['status', '--porcelain'], { capture: true })
if (workingTreeStatus && pushEnabled) {
  throw new Error('Working tree must be clean before applying branch cutover.')
}
if (workingTreeStatus && !pushEnabled) {
  console.log('Working tree has uncommitted changes; continuing because this is a dry run.')
}

const remoteRefs = run('git', ['ls-remote', '--heads', remoteName], { capture: true })
const backupBranch = sanitizeBranchSegment(
  backupBranchArg || defaultBackupBranch(rootPackage.version, sourceCommit)
)
const mainRemoteHead = readRemoteHead(remoteRefs, 'main')
const mainTree = run('git', ['rev-parse', 'HEAD^{tree}'], { capture: true })
const targets = summary.targets.map(target => ({
  ...target,
  currentRemoteHead: readRemoteHead(remoteRefs, target.branch)
}))

const materializedTargets = []
try {
  for (const target of targets) {
    materializedTargets.push(await materializeSnapshot(target))
  }

  console.log('')
  console.log(pushEnabled ? 'Branch cutover push plan:' : 'Branch cutover dry-run plan:')
  console.log(`Remote: ${remoteName} -> ${remoteUrl}`)
  console.log(`Backup branch: ${skipBackup ? '(skipped)' : backupBranch}`)
  console.log(
    `main\tprivate-aggregate-workspace\t${rootPackage.name}\told=${mainRemoteHead || '(new)'}\tnew=${sourceCommit}\ttree=${mainTree}`
  )
  for (const target of materializedTargets) {
    console.log(
      `${target.branch}\t${target.role}\t${target.packageName}\told=${target.currentRemoteHead || '(new)'}\tnew=${target.commit}\ttree=${target.tree}`
    )
  }

  if (!pushEnabled) {
    console.log('')
    console.log('Dry run only. Re-run with --push to update remote branches.')
  } else {
    run('git', ['fetch', remoteName, `+refs/heads/*:refs/remotes/${remoteName}/*`])
    if (!skipBackup) {
      for (const [branch, head] of [
        ['main', mainRemoteHead],
        ...materializedTargets.map(target => [target.branch, target.currentRemoteHead])
      ]) {
        if (head) {
          run('git', ['push', remoteName, `${head}:refs/heads/${backupBranch}/${branch}`])
        }
      }
    }
    const mainPushArgs = []
    if (mainRemoteHead) {
      mainPushArgs.push(`--force-with-lease=refs/heads/main:${mainRemoteHead}`)
    }
    mainPushArgs.push(remoteName, 'HEAD:refs/heads/main')
    run('git', mainPushArgs)
    for (const target of materializedTargets) {
      const pushArgs = []
      if (target.currentRemoteHead) {
        pushArgs.push(`--force-with-lease=refs/heads/${target.branch}:${target.currentRemoteHead}`)
      }
      pushArgs.push(remoteUrl, `HEAD:refs/heads/${target.branch}`)
      run('git', pushArgs, { cwd: target.workDir })
    }
    run('git', ['fetch', remoteName, 'main', 'v2', 'v3'])
    console.log('Branch cutover pushed successfully.')
  }
} finally {
  await cleanupMaterializedTargets(materializedTargets)
}
