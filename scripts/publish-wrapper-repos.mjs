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
  readArg('--out-dir', process.env.FILE_VIEWER_WRAPPER_REPO_DIR || '.release/wrapper-repos')
)
const branch = readArg('--branch', process.env.FILE_VIEWER_WRAPPER_REPO_BRANCH || 'main')
const commitMessage = readArg(
  '--message',
  process.env.FILE_VIEWER_WRAPPER_REPO_COMMIT_MESSAGE || 'chore: sync wrapper release'
)
const dryRun = args.includes('--dry-run')
const push = args.includes('--push')
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

const readJson = async path => JSON.parse(await readFile(path, 'utf8'))
const wrapperManifest = await readJson(join(sourceRoot, 'ecosystem', 'wrappers.json'))

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
  throw new Error('No wrappers selected for publishing.')
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

const ensureRemote = (cwd, name, url) => {
  if (remoteExists(cwd, name)) {
    run('git', ['remote', 'set-url', name, url], cwd)
  } else {
    run('git', ['remote', 'add', name, url], cwd)
  }
}

for (const wrapper of wrappers) {
  const repoDir = join(outputRoot, wrapper.repository)
  await assertDirectory(repoDir, wrapper.repository)

  if (!existsSync(join(repoDir, '.git'))) {
    run('git', ['init', '-b', branch], repoDir)
  } else {
    run('git', ['checkout', '-B', branch], repoDir)
  }

  ensureRemote(repoDir, 'origin', gitUrl(wrapper.github))
  ensureRemote(repoDir, 'gitee', gitUrl(wrapper.gitee))

  run('git', ['add', '-A'], repoDir)
  if (hasStagedChanges(repoDir)) {
    run('git', ['commit', '-m', commitMessage], repoDir)
  } else {
    console.log(`No wrapper changes to commit for ${wrapper.packageName}`)
  }

  if (push) {
    if (!hasHeadCommit(repoDir)) {
      throw new Error(`Cannot push ${wrapper.packageName}: repository has no commit`)
    }
    run('git', ['push', '-u', 'origin', branch], repoDir)
    run('git', ['push', '-u', 'gitee', branch], repoDir)
  }

  console.log(`${push ? 'Published' : 'Prepared'} ${wrapper.packageName} in ${repoDir}`)
}

console.log(
  `${push ? 'Published' : 'Prepared'} ${wrappers.length} wrapper repos from ${outputRoot}${dryRun ? ' (dry-run)' : ''}.`
)
