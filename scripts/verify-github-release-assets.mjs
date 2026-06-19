import { createHash } from 'node:crypto'
import { readdir, readFile, stat } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

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
const artifactsDir = join(publicRepoDir, 'artifacts')
const manifestPath = join(artifactsDir, 'release-manifest.json')
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
const tag = readArg('--tag', `v${manifest.version}`)
const repo = readArg('--repo', 'flyfish-dev/file-viewer')

function runGh(commandArgs) {
  const result = spawnSync('gh', commandArgs, {
    cwd: sourceRoot,
    encoding: 'utf8',
    stdio: 'pipe',
    timeout: 30_000
  })

  if (result.status !== 0) {
    throw new Error((result.stderr || result.stdout || '').trim() || `gh ${commandArgs.join(' ')} failed`)
  }

  return result.stdout
}

async function sha256(path) {
  const data = await readFile(path)
  return createHash('sha256').update(data).digest('hex')
}

async function expectedAssets() {
  const names = (await readdir(artifactsDir))
    .filter(name => !name.startsWith('.'))
    .sort()
  const entries = []
  for (const name of names) {
    const path = join(artifactsDir, name)
    const info = await stat(path)
    if (!info.isFile()) {
      continue
    }
    entries.push({
      name,
      size: info.size,
      digest: `sha256:${await sha256(path)}`
    })
  }
  return entries
}

const release = JSON.parse(
  runGh(['release', 'view', tag, '--repo', repo, '--json', 'tagName,assets'])
)
const expected = await expectedAssets()
const actual = new Map(release.assets.map(asset => [asset.name, asset]))
const expectedNames = new Set(expected.map(asset => asset.name))
const failures = []

for (const asset of expected) {
  const uploaded = actual.get(asset.name)
  if (!uploaded) {
    failures.push(`missing asset ${asset.name}`)
    continue
  }
  if (uploaded.state !== 'uploaded') {
    failures.push(`${asset.name} state is ${uploaded.state}`)
  }
  if (uploaded.size !== asset.size) {
    failures.push(`${asset.name} size ${uploaded.size} !== local ${asset.size}`)
  }
  if (uploaded.digest && uploaded.digest !== asset.digest) {
    failures.push(`${asset.name} digest ${uploaded.digest} !== local ${asset.digest}`)
  }
}

for (const asset of release.assets) {
  if (!expectedNames.has(asset.name)) {
    failures.push(`unexpected asset ${asset.name}`)
  }
}

if (failures.length) {
  throw new Error(`GitHub Release asset verification failed for ${repo}@${tag}:\n${failures.join('\n')}`)
}

console.log(
  `Verified ${expected.length} GitHub Release assets for ${repo}@${tag} from ${artifactsDir}.`
)
