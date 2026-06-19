import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const sourceRoot = resolve(scriptDir, '..')
const args = process.argv.slice(2)

function readArg(name, fallback) {
  const index = args.indexOf(name)
  return index >= 0 ? args[index + 1] : fallback
}

const skipExternal = args.includes('--skip-external')
const publicRepoDir = resolve(
  sourceRoot,
  readArg('--public-repo-dir', process.env.FILE_VIEWER_PUBLIC_REPO_DIR || '../file-viewer-public')
)

const steps = [
  {
    name: 'branch roles',
    command: ['node', 'scripts/verify-branch-roles.mjs']
  },
  {
    name: 'ecosystem checklist',
    command: ['node', 'scripts/verify-ecosystem-checklist.mjs']
  },
  {
    name: 'ecosystem README coverage',
    command: ['node', 'scripts/verify-ecosystem-readmes.mjs']
  },
  {
    name: 'ecosystem package metadata',
    command: ['node', 'scripts/release-ecosystem-packages.mjs', '--list'],
    okDetail: 'release package metadata loaded'
  },
  {
    name: 'open-source main repository',
    command: ['node', 'scripts/verify-public-main.mjs', '--public-repo-dir', publicRepoDir],
    skip: !existsSync(publicRepoDir),
    skipReason: `missing ${publicRepoDir}`
  },
  {
    name: 'npm publish authentication',
    command: ['node', 'scripts/release-ecosystem-packages.mjs', '--publish', '--preflight'],
    external: true
  },
  {
    name: 'Gitee API token',
    command: ['node', 'scripts/create-gitee-component-repos.mjs', '--preflight'],
    external: true
  }
]

function runStep(step) {
  if (step.skip) {
    return {
      ...step,
      status: 'skipped',
      detail: step.skipReason || 'not required'
    }
  }

  if (skipExternal && step.external) {
    return {
      ...step,
      status: 'skipped',
      detail: 'external checks skipped'
    }
  }

  const [command, ...commandArgs] = step.command
  const result = spawnSync(command, commandArgs, {
    cwd: sourceRoot,
    encoding: 'utf8',
    stdio: 'pipe',
    timeout: step.timeout ?? 30_000
  })

  const output = `${result.stdout || ''}\n${result.stderr || ''}`
  const detailLines = output
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
  const detail =
    result.status === 0 && step.okDetail
      ? step.okDetail
      : detailLines.find(line => line.startsWith('Error:')) ||
        detailLines.find(line => /authentication|missing|required|failed/i.test(line)) ||
        detailLines.at(-1) ||
        ''

  return {
    ...step,
    status: result.status === 0 ? 'ok' : 'failed',
    detail
  }
}

const results = steps.map(runStep)
const failures = results.filter(result => result.status === 'failed')

console.log('# Release Channels Preflight\n')
for (const result of results) {
  const label = result.status === 'ok' ? 'ok' : result.status
  console.log(`- ${label}\t${result.name}${result.detail ? `\t${result.detail}` : ''}`)
}

if (failures.length) {
  console.error(
    `\nRelease channels preflight failed: ${failures.map(result => result.name).join(', ')}.`
  )
  process.exit(1)
}

console.log('\nRelease channels preflight passed.')
