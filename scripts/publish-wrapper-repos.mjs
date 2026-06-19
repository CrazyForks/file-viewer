import { existsSync } from 'node:fs'
import { readFile, stat } from 'node:fs/promises'
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

const outputRoot = resolve(
  sourceRoot,
  readArg(
    '--out-dir',
    process.env.FILE_VIEWER_COMPONENT_REPO_DIR ||
      process.env.FILE_VIEWER_WRAPPER_REPO_DIR ||
      '.release/component-repos'
  )
)
const branch = readArg(
  '--branch',
  process.env.FILE_VIEWER_COMPONENT_REPO_BRANCH ||
    process.env.FILE_VIEWER_WRAPPER_REPO_BRANCH ||
    'main'
)
const commitMessage = readArg(
  '--message',
  process.env.FILE_VIEWER_COMPONENT_REPO_COMMIT_MESSAGE ||
    process.env.FILE_VIEWER_WRAPPER_REPO_COMMIT_MESSAGE ||
    'chore: sync component package release'
)
const dryRun = args.includes('--dry-run')
const push = args.includes('--push')
const selectedHosts = new Set(
  args
    .filter(arg => arg.startsWith('--host='))
    .map(arg => arg.slice('--host='.length))
)
const allowedHosts = new Set(['github', 'gitee'])
for (const host of selectedHosts) {
  if (!allowedHosts.has(host)) {
    throw new Error(`Unsupported host ${host}. Use --host=github or --host=gitee.`)
  }
}
const hosts = selectedHosts.size ? [...selectedHosts] : [...allowedHosts]
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
const selectedVerifyArgs = [
  ...[...selectedPackages].map(packageName => `--package=${packageName}`),
  ...[...selectedIds].map(id => `--id=${id}`)
]

const readJson = async path => JSON.parse(await readFile(path, 'utf8'))
const wrapperManifest = await readJson(join(sourceRoot, 'ecosystem', 'wrappers.json'))
const corePackage = wrapperManifest.corePackage

const includeCore = selectedIds.size === 0 && (
  selectedPackages.size === 0 ||
  selectedPackages.has(corePackage.packageName)
)

const wrappers = wrapperManifest.wrappers.filter(wrapper => {
  if (selectedPackages.size && !selectedPackages.has(wrapper.packageName)) {
    return false
  }
  if (selectedIds.size && !selectedIds.has(wrapper.id)) {
    return false
  }
  return true
})

const targets = [
  ...(includeCore
    ? [{
        kind: 'core',
        packageName: corePackage.packageName,
        repository: corePackage.repository,
        github: corePackage.github,
        gitee: corePackage.gitee
      }]
    : []),
  ...wrappers.map(wrapper => ({
    kind: 'component',
    packageName: wrapper.packageName,
    repository: wrapper.repository,
    github: wrapper.github,
    gitee: wrapper.gitee
  }))
]

if (!targets.length) {
  throw new Error('No core or component packages selected for publishing.')
}

const assertDirectory = async (path, label = path) => {
  if (!existsSync(path)) {
    throw new Error(`Missing directory: ${label}`)
  }
  const info = await stat(path)
  if (!info.isDirectory()) {
    throw new Error(`Not a directory: ${label}`)
  }
}

const gitUrl = url => `${url}.git`
const hasStandaloneGitDir = cwd => existsSync(join(cwd, '.git'))

const run = (command, commandArgs, cwd, options = {}) => {
  const printable = `${[command, ...commandArgs].join(' ')}`
  if (dryRun && options.mutates !== false) {
    console.log(`[dry-run] (${cwd}) ${printable}`)
    return { status: 0, stdout: '', stderr: '' }
  }

  const result = spawnSync(command, commandArgs, {
    cwd,
    encoding: 'utf8',
    stdio: options.capture ? 'pipe' : 'inherit'
  })
  if (result.status !== 0 && !options.allowFailure) {
    throw new Error(`Command failed in ${cwd}: ${printable}\n${result.stderr || result.stdout || ''}`)
  }
  return result
}

const hasStagedChanges = cwd => {
  if (dryRun && !hasStandaloneGitDir(cwd)) {
    return true
  }
  const result = run('git', ['diff', '--cached', '--quiet'], cwd, {
    allowFailure: true,
    capture: true,
    mutates: false
  })
  return result.status !== 0
}

const hasHeadCommit = cwd => {
  if (dryRun && !hasStandaloneGitDir(cwd)) {
    return true
  }
  const result = run('git', ['rev-parse', '--verify', 'HEAD'], cwd, {
    allowFailure: true,
    capture: true,
    mutates: false
  })
  return result.status === 0
}

const remoteExists = (cwd, name) => {
  if (dryRun && !hasStandaloneGitDir(cwd)) {
    return false
  }
  const result = run('git', ['remote', 'get-url', name], cwd, {
    allowFailure: true,
    capture: true,
    mutates: false
  })
  return result.status === 0
}

const fetchRemoteBranch = (cwd, remoteName, branchName) => {
  const result = run('git', ['fetch', remoteName, branchName], cwd, {
    allowFailure: true,
    capture: true
  })
  return result.status === 0
}

const adoptRemoteBranchHistory = (cwd, remoteName, branchName) => {
  if (dryRun || !push) {
    return false
  }
  if (!fetchRemoteBranch(cwd, remoteName, branchName)) {
    return false
  }

  run('git', ['reset', '--mixed', `${remoteName}/${branchName}`], cwd)
  return true
}

const ensureRemote = (cwd, name, url) => {
  if (remoteExists(cwd, name)) {
    run('git', ['remote', 'set-url', name, url], cwd)
  } else {
    run('git', ['remote', 'add', name, url], cwd)
  }
}

const verifyWrapperRepos = () => {
  console.log('Verifying component repositories before publishing...')
  run(
    'node',
    ['scripts/verify-wrapper-repos.mjs', '--out-dir', outputRoot, ...selectedVerifyArgs],
    sourceRoot,
    { mutates: false }
  )
}

verifyWrapperRepos()

for (const target of targets) {
  const repoDir = join(outputRoot, target.repository)
  await assertDirectory(repoDir, target.repository)

  if (!existsSync(join(repoDir, '.git'))) {
    run('git', ['init', '-b', branch], repoDir)
  } else {
    run('git', ['checkout', '-B', branch], repoDir)
  }

  if (hosts.includes('github')) {
    ensureRemote(repoDir, 'origin', gitUrl(target.github))
  }
  if (hosts.includes('gitee')) {
    ensureRemote(repoDir, 'gitee', gitUrl(target.gitee))
  }

  const primaryRemote = hosts.includes('github') ? 'origin' : 'gitee'
  const adoptedRemoteHistory = adoptRemoteBranchHistory(repoDir, primaryRemote, branch)
  if (adoptedRemoteHistory) {
    console.log(`Using existing ${primaryRemote}/${branch} history for ${target.packageName}`)
  }

  run('git', ['add', '-A'], repoDir)
  if (hasStagedChanges(repoDir)) {
    run('git', ['commit', '-m', commitMessage], repoDir)
  } else {
    console.log(`No ${target.kind} package changes to commit for ${target.packageName}`)
  }

  if (push) {
    if (!hasHeadCommit(repoDir)) {
      throw new Error(`Cannot push ${target.packageName}: repository has no commit`)
    }
    if (hosts.includes('github')) {
      run('git', ['push', '-u', 'origin', branch], repoDir)
    }
    if (hosts.includes('gitee')) {
      run('git', ['push', '-u', 'gitee', branch], repoDir)
    }
  }

  console.log(`${push ? 'Published' : 'Prepared'} ${target.packageName} in ${repoDir}`)
}

console.log(
  `${push ? 'Published' : 'Prepared'} ${targets.length} core/component repos to ${hosts.join(', ')} from ${outputRoot}${dryRun ? ' (dry-run)' : ''}.`
)
