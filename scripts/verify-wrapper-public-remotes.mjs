import { spawnSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const sourceRoot = resolve(scriptDir, '..')
const args = process.argv.slice(2)

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
const wrapperManifest = JSON.parse(
  await readFile(join(sourceRoot, 'ecosystem', 'wrappers.json'), 'utf8')
)

function lsRemote(url) {
  const result = spawnSync('git', ['ls-remote', '--heads', url], {
    cwd: sourceRoot,
    encoding: 'utf8',
    stdio: 'pipe',
    timeout: 20_000
  })

  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout || '').trim()
    throw new Error(detail || `git ls-remote failed for ${url}`)
  }

  return result.stdout
    .trim()
    .split('\n')
    .filter(Boolean)
    .map(line => line.split('\t')[1]?.replace('refs/heads/', ''))
    .filter(Boolean)
}

const failures = []
let checked = 0

for (const wrapper of wrapperManifest.wrappers) {
  for (const host of hosts) {
    const url = wrapper[host]
    checked += 1

    let branches
    try {
      branches = lsRemote(url)
    } catch (error) {
      failures.push(`${wrapper.id} ${host} repository is not reachable: ${url}\n${error.message}`)
      continue
    }

    if (!branches.includes('main')) {
      failures.push(`${wrapper.id} ${host} repository is missing main branch: ${url}`)
      continue
    }

    console.log(`${host}\t${wrapper.id}\tok\t${url}`)
  }
}

if (failures.length) {
  throw new Error(`Public component remote verification failed:\n${failures.join('\n')}`)
}

console.log(`Verified ${checked} public component remotes.`)
