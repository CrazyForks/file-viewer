import { spawnSync } from 'node:child_process'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadEcosystemReleaseContext, readJson } from './lib/ecosystem-packages.mjs'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const sourceRoot = resolve(scriptDir, '..')
const args = new Set(process.argv.slice(2))
const strict = args.has('--strict')

const { rootPackage, wrapperManifest, entries } = await loadEcosystemReleaseContext(sourceRoot)
const branchRoles = await readJson(join(sourceRoot, 'ecosystem', 'branch-roles.json'))

function run(command, commandArgs, options = {}) {
  const result = spawnSync(command, commandArgs, {
    cwd: options.cwd ?? sourceRoot,
    encoding: 'utf8',
    stdio: 'pipe',
    timeout: options.timeout ?? 20_000
  })

  return {
    ok: result.status === 0,
    status: result.status,
    stdout: (result.stdout || '').trim(),
    stderr: (result.stderr || '').trim()
  }
}

function firstRefHash(output) {
  return output.split('\n').find(Boolean)?.split('\t')[0] || ''
}

function lsRemoteHead(url, branch = 'main') {
  const result = run('git', ['ls-remote', url, `refs/heads/${branch}`])
  return {
    ok: result.ok && Boolean(firstRefHash(result.stdout)),
    hash: firstRefHash(result.stdout),
    error: result.ok ? '' : result.stderr || result.stdout
  }
}

function npmVersion(packageName) {
  const result = run('npm', ['view', packageName, 'version'], { timeout: 30_000 })
  return {
    ok: result.ok && Boolean(result.stdout),
    version: result.stdout.replace(/^"|"$/g, ''),
    error: result.ok ? '' : result.stderr || result.stdout
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
  ])

  if (!result.ok) {
    return {
      ok: false,
      tag,
      url: '',
      assetCount: 0,
      error: result.stderr || result.stdout
    }
  }

  try {
    const release = JSON.parse(result.stdout)
    return {
      ok: true,
      tag: release.tagName,
      url: release.url,
      assetCount: Array.isArray(release.assets) ? release.assets.length : 0,
      error: ''
    }
  } catch (error) {
    return {
      ok: false,
      tag,
      url: '',
      assetCount: 0,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

function formatHash(value) {
  return value ? `\`${value.slice(0, 12)}\`` : '`missing`'
}

function okLabel(ok) {
  return ok ? 'ok' : 'missing'
}

function syncLabel(left, right) {
  if (!left.ok || !right.ok) {
    return 'missing'
  }
  return left.hash === right.hash ? 'ok' : 'stale'
}

const localBranch = run('git', ['branch', '--show-current']).stdout
const sourceBranch = branchRoles.currentSourceBranch || localBranch
const sourceHead = run('git', ['rev-parse', 'HEAD']).stdout
const sourceRemoteHead = lsRemoteHead(branchRoles.sourceRemote.url, sourceBranch)
const sourceHeadInSync = sourceRemoteHead.ok && sourceHead === sourceRemoteHead.hash
const branchRows = branchRoles.branches.map(branch => ({
  ...branch,
  remote: lsRemoteHead(branchRoles.sourceRemote.url, branch.name)
}))
const publicGithubHead = lsRemoteHead(branchRoles.publicMainRepository.github, 'main')
const publicGiteeHead = lsRemoteHead(branchRoles.publicMainRepository.gitee, 'main')
const publicMainInSync = publicGithubHead.ok && publicGiteeHead.ok && publicGithubHead.hash === publicGiteeHead.hash
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
    `open-source main Gitee repository ${publicGiteeHead.hash.slice(0, 12)} differs from GitHub ${publicGithubHead.hash.slice(0, 12)}`,
  !release.ok && `GitHub Release v${rootPackage.version} missing`,
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

console.log(`# File Viewer Ecosystem Status\n`)
console.log(`Generated: ${new Date().toISOString()}`)
console.log(`Workspace: \`${sourceRoot}\``)
console.log(`Version target: \`${rootPackage.version}\`\n`)

console.log(`## Aggregate Source\n`)
console.log(`- Local checkout branch: \`${localBranch}\``)
console.log(`- Source branch: \`${sourceBranch}\``)
console.log(`- Local HEAD: ${formatHash(sourceHead)}`)
console.log(
  `- Remote \`${branchRoles.sourceRemote.name}/${sourceBranch}\`: ${formatHash(sourceRemoteHead.hash)} (${sourceHeadInSync ? 'ok' : okLabel(sourceRemoteHead.ok)})\n`
)

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
console.log(`- Gitee main: ${formatHash(publicGiteeHead.hash)} (${syncLabel(publicGithubHead, publicGiteeHead)})`)
console.log(`- GitHub Release: \`${release.tag}\` (${okLabel(release.ok)}, assets: ${release.assetCount}${release.url ? `, ${release.url}` : ''})\n`)

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
  console.log(`## Remaining Gaps\n`)
  for (const failure of failures) {
    console.log(`- ${failure}`)
  }
  console.log()
}

if (strict && failures.length) {
  process.exitCode = 1
}
