import { spawnSync } from 'node:child_process'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadEcosystemReleaseContext, readJson } from './lib/ecosystem-packages.mjs'
import { normalizeReleaseError } from './lib/release-error-normalizer.mjs'
import { describeReleaseGaps } from './lib/release-gap-classifier.mjs'
import { comparePublicMirrorTrees } from './lib/git-remote-tree.mjs'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const sourceRoot = resolve(scriptDir, '..')
const argv = process.argv.slice(2)
const args = new Set(argv)
const strict = args.has('--strict')
const fast = args.has('--fast')

function readArg(name, fallback) {
  const index = argv.indexOf(name)
  return index >= 0 ? argv[index + 1] : fallback
}

function readNumberArg(name, fallback) {
  const value = Number(readArg(name, fallback))
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be a positive number, got ${value}`)
  }
  return value
}

const defaultGitTimeout = fast ? 5_000 : 20_000
const defaultNpmTimeout = fast ? 8_000 : 30_000
const defaultGhTimeout = fast ? 8_000 : 20_000
const gitTimeout = readNumberArg(
  '--git-timeout-ms',
  process.env.FILE_VIEWER_AUDIT_GIT_TIMEOUT_MS || defaultGitTimeout
)
const npmTimeout = readNumberArg(
  '--npm-timeout-ms',
  process.env.FILE_VIEWER_AUDIT_NPM_TIMEOUT_MS || defaultNpmTimeout
)
const ghTimeout = readNumberArg(
  '--gh-timeout-ms',
  process.env.FILE_VIEWER_AUDIT_GH_TIMEOUT_MS || defaultGhTimeout
)

const { rootPackage, wrapperManifest, entries } = await loadEcosystemReleaseContext(sourceRoot)
const branchRoles = await readJson(join(sourceRoot, 'ecosystem', 'branch-roles.json'))
const publicRepoDir = resolve(
  sourceRoot,
  readArg('--public-repo-dir', process.env.FILE_VIEWER_PUBLIC_REPO_DIR || '../file-viewer-public')
)

function run(command, commandArgs, options = {}) {
  const result = spawnSync(command, commandArgs, {
    cwd: options.cwd ?? sourceRoot,
    encoding: 'utf8',
    stdio: 'pipe',
    timeout: options.timeout ?? 20_000
  })

  const errorMessage = result.error instanceof Error ? result.error.message : ''

  return {
    ok: result.status === 0,
    status: result.status,
    signal: result.signal || '',
    stdout: (result.stdout || '').trim(),
    stderr: (result.stderr || '').trim(),
    error: errorMessage
  }
}

function firstRefHash(output) {
  return output.split('\n').find(Boolean)?.split('\t')[0] || ''
}

function lsRemoteHead(url, branch = 'main') {
  const result = run('git', ['ls-remote', url, `refs/heads/${branch}`], { timeout: gitTimeout })
  return {
    ok: result.ok && Boolean(firstRefHash(result.stdout)),
    hash: firstRefHash(result.stdout),
    error: result.ok ? '' : normalizeReleaseError(result.error || result.stderr || result.stdout || result.signal)
  }
}

function npmVersion(packageName) {
  const result = run('npm', ['view', packageName, 'version'], { timeout: npmTimeout })
  return {
    ok: result.ok && Boolean(result.stdout),
    version: result.stdout.replace(/^"|"$/g, ''),
    error: result.ok ? '' : normalizeReleaseError(result.error || result.stderr || result.stdout || result.signal)
  }
}

function ghRelease(tag) {
  const result = run('gh', [
    'release',
    'view',
    tag,
    '-R',
    'flyfish-dev/file-viewer',
    '--json',
    'tagName,url,assets'
  ], { timeout: ghTimeout })

  if (!result.ok) {
    return {
      ok: false,
      tag,
      url: '',
      assetCount: 0,
      hasManifest: false,
      hasStatus: false,
      hasSchema: false,
      error: normalizeReleaseError(result.error || result.stderr || result.stdout || result.signal)
    }
  }

  try {
    const release = JSON.parse(result.stdout)
    const assets = Array.isArray(release.assets) ? release.assets : []
    return {
      ok: true,
      tag: release.tagName,
      url: release.url,
      assetCount: assets.length,
      hasManifest: assets.some(asset => asset.name === 'release-manifest.json'),
      hasStatus: assets.some(asset => asset.name === 'release-status.json'),
      hasSchema: assets.some(asset => asset.name === 'release-status.schema.json'),
      error: ''
    }
  } catch (error) {
    return {
      ok: false,
      tag,
      url: '',
      assetCount: 0,
      hasManifest: false,
      hasStatus: false,
      hasSchema: false,
      error: normalizeReleaseError(error instanceof Error ? error.message : String(error))
    }
  }
}

function formatHash(value) {
  return value ? `\`${value.slice(0, 12)}\`` : '`missing`'
}

function okLabel(ok) {
  return ok ? 'ok' : 'missing'
}

function syncLabel(left, right, treeStatus) {
  if (!left.ok || !right.ok) {
    return 'missing'
  }
  if (left.hash === right.hash) {
    return 'ok'
  }
  if (treeStatus?.mode === 'tree') {
    return 'ok-tree'
  }
  if (treeStatus?.mode === 'unchecked') {
    return 'unchecked'
  }
  return 'stale'
}

function parseWorktrees(output) {
  return output
    .split(/\n(?=worktree )/)
    .map(block => block.trim())
    .filter(Boolean)
    .map(block => {
      const entry = {
        path: '',
        head: '',
        branch: ''
      }

      for (const line of block.split('\n')) {
        const [key, ...valueParts] = line.split(' ')
        const value = valueParts.join(' ')
        if (key === 'worktree') {
          entry.path = value
        }
        if (key === 'HEAD') {
          entry.head = value
        }
        if (key === 'branch') {
          entry.branch = value.replace(/^refs\/heads\//, '')
        }
      }

      return entry
    })
}

function worktreeStatus(path) {
  if (!path) {
    return {
      dirty: false,
      changeCount: 0
    }
  }

  const result = run('git', ['status', '--porcelain'], { cwd: path })
  const changes = result.stdout.split('\n').filter(Boolean)
  return {
    dirty: changes.length > 0,
    changeCount: changes.length
  }
}

const localBranch = run('git', ['branch', '--show-current']).stdout
const sourceBranch = branchRoles.currentSourceBranch || localBranch
const sourceHead = run('git', ['rev-parse', 'HEAD']).stdout
const sourceRemoteHead = lsRemoteHead(branchRoles.sourceRemote.url, sourceBranch)
const sourceHeadInSync = sourceRemoteHead.ok && sourceHead === sourceRemoteHead.hash
const worktrees = parseWorktrees(run('git', ['worktree', 'list', '--porcelain']).stdout)
const sourceBranchWorktree = worktrees.find(worktree => worktree.branch === sourceBranch) || null
const sourceBranchWorktreeStatus = sourceBranchWorktree ? worktreeStatus(sourceBranchWorktree.path) : null
const sourceBranchWorktreeInSync =
  !sourceBranchWorktree || (sourceRemoteHead.ok && sourceBranchWorktree.head === sourceRemoteHead.hash)
const branchRows = branchRoles.branches.map(branch => ({
  ...branch,
  remote: lsRemoteHead(branchRoles.sourceRemote.url, branch.name)
}))
const publicGithubHead = lsRemoteHead(branchRoles.publicMainRepository.github, 'main')
const publicGiteeHead = lsRemoteHead(branchRoles.publicMainRepository.gitee, 'main')
const publicMainTreeStatus = comparePublicMirrorTrees({
  publicRepoDir,
  githubHead: publicGithubHead,
  giteeHead: publicGiteeHead,
  giteeUrl: branchRoles.publicMainRepository.gitee,
  branch: 'main',
  timeout: gitTimeout
})
const publicMainInSync = publicGithubHead.ok && publicGiteeHead.ok && publicMainTreeStatus.inSync
const release = ghRelease(`v${rootPackage.version}`)

const remoteTargets = [
  {
    id: 'core',
    packageName: wrapperManifest.corePackage.packageName,
    github: wrapperManifest.corePackage.github,
    gitee: wrapperManifest.corePackage.gitee
  },
  ...wrapperManifest.wrappers.map(wrapper => ({
    id: wrapper.id,
    packageName: wrapper.packageName,
    github: wrapper.github,
    gitee: wrapper.gitee
  }))
]

const remoteRows = remoteTargets.map(target => {
  const github = lsRemoteHead(target.github)
  const gitee = lsRemoteHead(target.gitee)
  return {
    ...target,
    github,
    gitee
  }
})

const npmRows = entries.map(entry => ({
  packageName: entry.packageName,
  expectedVersion: entry.version,
  npm: npmVersion(entry.packageName)
}))

const failures = [
  !sourceRemoteHead.ok && `source remote ${branchRoles.sourceRemote.url} missing ${sourceBranch}`,
  sourceRemoteHead.ok &&
    !sourceHeadInSync &&
    `local HEAD ${sourceHead.slice(0, 12)} does not match source ${sourceBranch} ${sourceRemoteHead.hash.slice(0, 12)}`,
  ...branchRows.map(row => !row.remote.ok && `source remote missing branch ${row.name}`),
  !publicGithubHead.ok && 'open-source main GitHub repository missing main',
  !publicGiteeHead.ok && 'open-source main Gitee repository missing main',
  publicGithubHead.ok &&
    publicGiteeHead.ok &&
    !publicMainInSync &&
    (publicMainTreeStatus.checked
      ? `open-source main Gitee repository tree ${publicMainTreeStatus.giteeTree.slice(0, 12)} differs from GitHub tree ${publicMainTreeStatus.referenceTree.slice(0, 12)}`
      : `open-source main Gitee repository ${publicGiteeHead.hash.slice(0, 12)} differs from GitHub ${publicGithubHead.hash.slice(0, 12)}${publicMainTreeStatus.error ? ` (${publicMainTreeStatus.error})` : ''}`),
  !release.ok && `GitHub Release v${rootPackage.version} missing`,
  release.ok && !release.hasManifest && `GitHub Release v${rootPackage.version} missing release-manifest.json`,
  release.ok && !release.hasStatus && `GitHub Release v${rootPackage.version} missing release-status.json`,
  release.ok && !release.hasSchema && `GitHub Release v${rootPackage.version} missing release-status.schema.json`,
  ...remoteRows.flatMap(row => [
    !row.github.ok && `${row.id} GitHub repository missing`,
    !row.gitee.ok && `${row.id} Gitee repository missing`
  ]),
  ...npmRows.map(row => {
    if (!row.npm.ok) {
      return `${row.packageName} is not published to npm`
    }
    if (row.npm.version !== row.expectedVersion) {
      return `${row.packageName} npm version ${row.npm.version} !== ${row.expectedVersion}`
    }
    return false
  })
].filter(Boolean)
const gapReport = describeReleaseGaps(failures)

const nextActions = [
  failures.some(failure => failure.includes('npm')) &&
    'Run `npm login` / passkey in an interactive terminal, then `pnpm release:ecosystem:publish`.',
  failures.some(failure => failure.includes('Gitee repository missing')) &&
    'Set `FILE_VIEWER_GITEE_TOKEN_FILE=<repo-external-token-file>` and run `pnpm components:gitee:publish`.',
  failures.some(failure => failure.includes('open-source main Gitee repository')) &&
    'Use `pnpm public:gitee:snapshot -- --push --confirm-rewrite-history` to publish a shallow Gitee mirror when full-history push exceeds remote limits.',
  'Use `pnpm release:channels:preflight -- --skip-external` for a fast local release gate, or `pnpm release:channels:preflight` when npm/Gitee credentials are ready.'
].filter(Boolean)

console.log(`# File Viewer Ecosystem Status\n`)
console.log(`Generated: ${new Date().toISOString()}`)
console.log(`Workspace: \`${sourceRoot}\``)
console.log(`Version target: \`${rootPackage.version}\`\n`)
if (fast) {
  console.log(`Mode: \`fast\` (git ${gitTimeout}ms, npm ${npmTimeout}ms, gh ${ghTimeout}ms)\n`)
}

console.log(`## Aggregate Source\n`)
console.log(`- Local checkout branch: \`${localBranch}\``)
console.log(`- Source branch: \`${sourceBranch}\``)
console.log(`- Local HEAD: ${formatHash(sourceHead)}`)
console.log(
  `- Remote \`${branchRoles.sourceRemote.name}/${sourceBranch}\`: ${formatHash(sourceRemoteHead.hash)} (${sourceHeadInSync ? 'ok' : okLabel(sourceRemoteHead.ok)})\n`
)

console.log(`## Local Worktrees\n`)
console.log(`| branch | path | head | status |`)
console.log(`| --- | --- | --- | --- |`)
for (const worktree of worktrees) {
  const status = worktreeStatus(worktree.path)
  const notes = []
  if (worktree.branch === sourceBranch && !sourceBranchWorktreeInSync) {
    notes.push('stale-source-worktree')
  }
  if (status.dirty) {
    notes.push(`${status.changeCount} local changes`)
  }
  console.log(
    `| \`${worktree.branch || '(detached)'}\` | \`${worktree.path}\` | ${formatHash(worktree.head)} | ${notes.length ? notes.join(', ') : 'clean'} |`
  )
}
if (sourceBranchWorktree && sourceBranchWorktreeStatus?.dirty) {
  console.log(
    `\n> Note: \`${sourceBranch}\` is checked out at \`${sourceBranchWorktree.path}\` with ${sourceBranchWorktreeStatus.changeCount} local change(s). Treat \`${sourceRoot}\` and remote \`${branchRoles.sourceRemote.name}/${sourceBranch}\` as the release audit source until that worktree is reconciled.`
  )
}
console.log()

console.log(`## Source Branch Roles\n`)
console.log(`| branch | role | package | remote |`)
console.log(`| --- | --- | --- | --- |`)
for (const row of branchRows) {
  console.log(
    `| \`${row.name}\` | ${row.role} | \`${row.packageName}\` | ${formatHash(row.remote.hash)} (${okLabel(row.remote.ok)}) |`
  )
}
console.log()

console.log(`## Open-Source Main Repository\n`)
console.log(`- GitHub main: ${formatHash(publicGithubHead.hash)} (${okLabel(publicGithubHead.ok)})`)
console.log(`- Gitee main: ${formatHash(publicGiteeHead.hash)} (${syncLabel(publicGithubHead, publicGiteeHead, publicMainTreeStatus)})`)
if (publicGithubHead.ok && publicGiteeHead.ok && publicGithubHead.hash !== publicGiteeHead.hash) {
  console.log(
    `- Mirror tree sync: ${publicMainTreeStatus.mode}${publicMainTreeStatus.referenceTree ? `, reference ${formatHash(publicMainTreeStatus.referenceTree)}` : ''}${publicMainTreeStatus.giteeTree ? `, gitee ${formatHash(publicMainTreeStatus.giteeTree)}` : ''}${publicMainTreeStatus.error ? `, ${publicMainTreeStatus.error}` : ''}`
  )
}
console.log(
  `- GitHub Release: \`${release.tag}\` (${okLabel(release.ok)}, assets: ${release.assetCount}, manifest: ${okLabel(release.hasManifest)}, status: ${okLabel(release.hasStatus)}, schema: ${okLabel(release.hasSchema)}${release.url ? `, ${release.url}` : ''})\n`
)

console.log(`## Core And Component Repositories\n`)
console.log(`| id | package | GitHub | Gitee |`)
console.log(`| --- | --- | --- | --- |`)
for (const row of remoteRows) {
  console.log(
    `| ${row.id} | \`${row.packageName}\` | ${formatHash(row.github.hash)} (${okLabel(row.github.ok)}) | ${formatHash(row.gitee.hash)} (${okLabel(row.gitee.ok)}) |`
  )
}
console.log()

console.log(`## npm Registry\n`)
console.log(`| package | target | npm |`)
console.log(`| --- | --- | --- |`)
for (const row of npmRows) {
  console.log(
    `| \`${row.packageName}\` | \`${row.expectedVersion}\` | ${row.npm.ok ? `\`${row.npm.version}\`` : '`unpublished`'} |`
  )
}
console.log()

if (failures.length) {
  console.log(`## Gap Summary\n`)
  console.log(`- Total: ${gapReport.summary.total}`)
  console.log(`- External blockers: ${gapReport.summary.externalBlockers}`)
  console.log(`- Local actionable: ${gapReport.summary.localActionable}`)
  console.log(`- External blocker channels: ${gapReport.summary.externalBlockerChannels.length ? gapReport.summary.externalBlockerChannels.join(', ') : 'none'}`)
  console.log()
  console.log(`| channel | count | external blocker |`)
  console.log(`| --- | --- | --- |`)
  for (const [channel, count] of Object.entries(gapReport.summary.byChannel).sort(([left], [right]) => left.localeCompare(right))) {
    const externalBlocker = gapReport.details.some(detail => detail.channel === channel && detail.externalBlocker)
    console.log(`| ${channel} | ${count} | ${externalBlocker ? 'yes' : 'no'} |`)
  }
  console.log()

  console.log(`## Remaining Gaps\n`)
  for (const detail of gapReport.details) {
    console.log(`- [${detail.channel}] ${detail.message}`)
  }
  console.log()
}

console.log(`## Next Actions\n`)
for (const action of nextActions) {
  console.log(`- ${action}`)
}
console.log()

if (strict && failures.length) {
  process.exitCode = 1
}
