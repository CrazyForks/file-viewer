import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { spawn, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { loadEcosystemReleaseContext, readJson } from './lib/ecosystem-packages.mjs'
import { normalizeReleaseError } from './lib/release-error-normalizer.mjs'
import { describeReleaseGaps } from './lib/release-gap-classifier.mjs'
import { comparePublicMirrorTrees } from './lib/git-remote-tree.mjs'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const sourceRoot = resolve(scriptDir, '..')
const argv = process.argv.slice(2)
const args = new Set(argv)

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

const publicRepoDir = resolve(
  sourceRoot,
  readArg('--public-repo-dir', process.env.FILE_VIEWER_PUBLIC_REPO_DIR || '../file-viewer-public')
)
const outFile = resolve(
  sourceRoot,
  readArg('--out-file', join(publicRepoDir, 'artifacts', 'release-status.json'))
)
const fast = args.has('--fast')
const gitTimeout = readNumberArg('--git-timeout-ms', fast ? 5_000 : 20_000)
const npmTimeout = readNumberArg('--npm-timeout-ms', fast ? 8_000 : 30_000)
const ghTimeout = readNumberArg('--gh-timeout-ms', fast ? 8_000 : 20_000)
const npmRegistry = readArg(
  '--npm-registry',
  process.env.FILE_VIEWER_NPM_REGISTRY || 'https://registry.npmjs.org/'
)

const { rootPackage, wrapperManifest, entries } = await loadEcosystemReleaseContext(sourceRoot)
const branchRoles = await readJson(join(sourceRoot, 'ecosystem', 'branch-roles.json'))

function run(command, commandArgs, options = {}) {
  const result = spawnSync(command, commandArgs, {
    cwd: options.cwd ?? sourceRoot,
    encoding: 'utf8',
    stdio: 'pipe',
    timeout: options.timeout ?? 20_000
  })
  const error = result.error instanceof Error ? result.error.message : ''
  return {
    ok: result.status === 0,
    status: result.status,
    signal: result.signal || '',
    stdout: (result.stdout || '').trim(),
    stderr: (result.stderr || '').trim(),
    error
  }
}

function runAsync(command, commandArgs, options = {}) {
  return new Promise(resolve => {
    const child = spawn(command, commandArgs, {
      cwd: options.cwd ?? sourceRoot,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe']
    })
    let stdout = ''
    let stderr = ''
    let timedOut = false
    child.stdout.setEncoding('utf8')
    child.stderr.setEncoding('utf8')
    child.stdout.on('data', chunk => {
      stdout += chunk
    })
    child.stderr.on('data', chunk => {
      stderr += chunk
    })
    const timer = setTimeout(() => {
      timedOut = true
      child.kill('SIGTERM')
    }, options.timeout ?? 20_000)
    child.on('error', error => {
      clearTimeout(timer)
      resolve({
        ok: false,
        status: null,
        signal: '',
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        error: error.message
      })
    })
    child.on('close', (status, signal) => {
      clearTimeout(timer)
      resolve({
        ok: status === 0 && !timedOut,
        status,
        signal: signal || '',
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        error: timedOut ? `Timed out after ${options.timeout ?? 20_000}ms` : ''
      })
    })
  })
}

function firstRefHash(output) {
  return output.split('\n').find(Boolean)?.split('\t')[0] || ''
}

function commandError(result) {
  return result.ok
    ? ''
    : normalizeReleaseError(result.error || result.stderr || result.stdout || result.signal || 'unknown error')
}

async function lsRemoteHead(url, branch = 'main') {
  const result = await runAsync('git', ['ls-remote', url, `refs/heads/${branch}`], { timeout: gitTimeout })
  const hash = firstRefHash(result.stdout)
  return {
    url,
    branch,
    ok: result.ok && Boolean(hash),
    hash,
    error: result.ok && hash ? '' : commandError(result) || 'missing ref'
  }
}

async function npmPackageVersion(packageName) {
  const result = await runAsync('npm', ['view', packageName, 'version', '--registry', npmRegistry], {
    timeout: npmTimeout
  })
  return {
    ok: result.ok && Boolean(result.stdout),
    version: result.stdout.replace(/^"|"$/g, ''),
    error: result.ok && result.stdout ? '' : commandError(result) || 'unpublished'
  }
}

async function githubRelease(tag) {
  const result = await runAsync('gh', [
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
      error: commandError(result)
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

function localWorktree() {
  return {
    branch: run('git', ['branch', '--show-current']).stdout,
    commit: run('git', ['rev-parse', 'HEAD']).stdout,
    shortCommit: run('git', ['rev-parse', '--short', 'HEAD']).stdout,
    dirty: Boolean(run('git', ['status', '--porcelain']).stdout)
  }
}

const sourceBranch = branchRoles.currentSourceBranch || 'main'
const local = localWorktree()
const sourceBaselineNote =
  'Private Gitea main is the complete original aggregate workspace. The local checkout branch is only the execution context and can be transitional during branch cutover.'
const componentTargets = [
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

const [sourceRemote, publicGithub, publicGitee, release, componentRepositories, npmPackages] =
  await Promise.all([
    lsRemoteHead(branchRoles.sourceRemote.url, sourceBranch),
    lsRemoteHead(branchRoles.publicMainRepository.github, 'main'),
    lsRemoteHead(branchRoles.publicMainRepository.gitee, 'main'),
    githubRelease(`v${rootPackage.version}`),
    Promise.all(componentTargets.map(async target => {
      const [github, gitee] = await Promise.all([
        lsRemoteHead(target.github),
        lsRemoteHead(target.gitee)
      ])
      return {
        id: target.id,
        packageName: target.packageName,
        github,
        gitee
      }
    })),
    Promise.all(entries.map(async entry => {
      const registry = await npmPackageVersion(entry.packageName)
      return {
        packageName: entry.packageName,
        expectedVersion: entry.version,
        publishedVersion: registry.version || null,
        ok: registry.ok && registry.version === entry.version,
        error: registry.ok && registry.version === entry.version ? '' : registry.error || `expected ${entry.version}`
      }
    }))
  ])

const publicMainTreeStatus = comparePublicMirrorTrees({
  publicRepoDir,
  githubHead: publicGithub,
  giteeHead: publicGitee,
  giteeUrl: branchRoles.publicMainRepository.gitee,
  branch: 'main',
  timeout: gitTimeout
})
const publicMainInSync = publicGithub.ok && publicGitee.ok && publicMainTreeStatus.inSync

const gaps = [
  !sourceRemote.ok && `source remote ${sourceRemote.url} missing ${sourceBranch}`,
  sourceRemote.ok &&
    local.commit !== sourceRemote.hash &&
    `local HEAD ${local.shortCommit} does not match ${branchRoles.sourceRemote.name}/${sourceBranch} ${sourceRemote.hash.slice(0, 12)}`,
  local.dirty && 'local source worktree has uncommitted changes',
  !publicGithub.ok && 'open-source main GitHub repository missing main',
  !release.ok && `GitHub Release v${rootPackage.version} missing`,
  release.ok && !release.hasManifest && `GitHub Release v${rootPackage.version} missing release-manifest.json`,
  release.ok && !release.hasStatus && `GitHub Release v${rootPackage.version} missing release-status.json`,
  release.ok && !release.hasSchema && `GitHub Release v${rootPackage.version} missing release-status.schema.json`,
  ...componentRepositories.flatMap(row => [
    !row.github.ok && `${row.id} GitHub repository missing`
  ]),
  ...npmPackages.map(row => !row.ok && `${row.packageName} npm ${row.publishedVersion || 'unpublished'} !== ${row.expectedVersion}`)
].filter(Boolean)
const gapReport = describeReleaseGaps(gaps)
const nextActions = [
  gaps.some(gap => gap.includes(' npm ')) &&
    'Run `npm login` / passkey in an interactive terminal, then `pnpm release:ecosystem:publish`.',
  gaps.some(gap => gap.includes('GitHub Release')) &&
    'Create or update the GitHub Release assets, then rerun `pnpm release:public`.',
  gaps.some(gap => gap.includes('worktree') || gap.includes('local HEAD')) &&
    'Commit and push the local source/public repository changes, then regenerate the release status report.',
  !gaps.length && 'Release channels are aligned. Keep this report attached to the GitHub Release for downstream verification.'
].filter(Boolean)

const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  version: rootPackage.version,
  sourcePolicy: 'private-complete-original-workspace',
  openSourcePolicy: 'public-open-source-main-repository',
  sourceBaseline: {
    repository: branchRoles.sourceRemote.url,
    branch: sourceBranch,
    policy: 'private-complete-original-workspace',
    authoritativeCommit: sourceRemote.hash || '',
    localBranch: local.branch,
    localCommit: local.commit,
    inSync: sourceRemote.ok && local.commit === sourceRemote.hash,
    note: sourceBaselineNote
  },
  local,
  sourceRemote,
  openSourceMain: {
    github: publicGithub,
    gitee: publicGitee,
    inSync: publicMainInSync,
    syncMode: publicMainTreeStatus.mode,
    treeChecked: publicMainTreeStatus.checked,
    referenceTree: publicMainTreeStatus.referenceTree,
    giteeTree: publicMainTreeStatus.giteeTree,
    treeError: publicMainTreeStatus.error,
    reportHashNote:
      'The open-source main repository mirrors the current public source tree and records the private source commit in the public commit body for traceability. The observed remote hash can trail until that mirror commit is pushed. Gitee can intentionally use a shallow snapshot commit; inSync is true when the file tree matches even if commit hashes differ. Use pnpm audit:ecosystem-status for live remote heads.'
  },
  githubRelease: release,
  componentRepositories,
  npmPackages,
  gaps,
  gapSummary: gapReport.summary,
  gapDetails: gapReport.details,
  nextActions
}

if (existsSync(outFile)) {
  const previous = JSON.parse(await readFile(outFile, 'utf8'))
  const previousComparable = {
    ...previous,
    generatedAt: report.generatedAt
  }
  if (JSON.stringify(previousComparable) === JSON.stringify(report)) {
    report.generatedAt = previous.generatedAt
  }
}

await mkdir(dirname(outFile), { recursive: true })
await writeFile(outFile, `${JSON.stringify(report, null, 2)}\n`, 'utf8')

console.log(`Wrote release status report to ${outFile} with ${gaps.length} gap${gaps.length === 1 ? '' : 's'}.`)
