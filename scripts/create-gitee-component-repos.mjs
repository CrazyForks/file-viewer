import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const sourceRoot = resolve(scriptDir, '..')
const args = process.argv.slice(2)

const dryRun = args.includes('--dry-run') || process.env.FILE_VIEWER_GITEE_CREATE_DRY_RUN === '1'
const preflight = args.includes('--preflight')
const force = args.includes('--force')
const explicitToken =
  process.env.FILE_VIEWER_GITEE_TOKEN ||
  process.env.GITEE_TOKEN ||
  process.env.GITEE_ACCESS_TOKEN ||
  ''

const selectedIds = new Set(
  args
    .filter(arg => arg.startsWith('--id='))
    .map(arg => arg.slice('--id='.length))
)
const selectedPackages = new Set(
  args
    .filter(arg => arg.startsWith('--package='))
    .map(arg => arg.slice('--package='.length))
)

function readArg(name, fallback) {
  const index = args.indexOf(name)
  return index >= 0 ? args[index + 1] : fallback
}

const apiBase = readArg('--api-base', process.env.GITEE_API_BASE || 'https://gitee.com/api/v5')
const tokenFile = readArg('--token-file', process.env.FILE_VIEWER_GITEE_TOKEN_FILE || '')
const useGitCredentialToken =
  args.includes('--use-git-credential') ||
  process.env.FILE_VIEWER_GITEE_USE_GIT_CREDENTIAL === '1'

function readTokenFile(path) {
  if (!path) {
    return ''
  }

  return readFileSync(resolve(path), 'utf8').trim()
}

function readGiteeCredentialToken() {
  const result = spawnSync('git', ['credential', 'fill'], {
    cwd: sourceRoot,
    input: 'protocol=https\nhost=gitee.com\n\n',
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe']
  })

  if (result.status !== 0) {
    return ''
  }

  const passwordLine = result.stdout
    .split('\n')
    .find(line => line.startsWith('password='))

  return passwordLine?.slice('password='.length).trim() || ''
}

const tokenFromFile = !explicitToken ? readTokenFile(tokenFile) : ''
const credentialToken = !explicitToken && !tokenFromFile && useGitCredentialToken ? readGiteeCredentialToken() : ''
const token = explicitToken || tokenFromFile || credentialToken
const tokenSource = explicitToken
  ? 'environment'
  : tokenFromFile
    ? 'token-file'
    : credentialToken
      ? 'git-credential'
      : 'missing'
const missingTokenMessage =
  'Missing Gitee token. Set FILE_VIEWER_GITEE_TOKEN, GITEE_TOKEN, GITEE_ACCESS_TOKEN, FILE_VIEWER_GITEE_TOKEN_FILE, or pass --use-git-credential when the stored gitee.com password is an API token.'

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'))
}

function repoNameFromUrl(url) {
  const path = new URL(url).pathname.replace(/^\/+|\.git$/g, '')
  return path.split('/').at(-1)
}

function repoOwnerFromUrl(url) {
  const path = new URL(url).pathname.replace(/^\/+|\.git$/g, '')
  return path.split('/')[0]
}

function targetDescription(target) {
  if (target.id === 'core') {
    return 'Framework-neutral TypeScript core for Flyfish File Viewer.'
  }
  return `${target.framework} standard component package for Flyfish File Viewer.`
}

function targetHomepage(target) {
  return target.github || 'https://github.com/flyfish-dev/file-viewer'
}

async function giteeRequest(method, path, body = undefined) {
  if (!token) {
    throw new Error(missingTokenMessage)
  }

  const url = new URL(path, `${apiBase.replace(/\/+$/, '')}/`)
  const init = {
    method,
    headers: {
      Accept: 'application/json'
    }
  }

  if (method === 'GET') {
    url.searchParams.set('access_token', token)
  } else {
    const form = new URLSearchParams()
    form.set('access_token', token)
    for (const [key, value] of Object.entries(body || {})) {
      if (value !== undefined && value !== null) {
        form.set(key, String(value))
      }
    }
    init.headers['Content-Type'] = 'application/x-www-form-urlencoded'
    init.body = form
  }

  const response = await fetch(url, init)
  const text = await response.text()
  let payload = null
  try {
    payload = text ? JSON.parse(text) : null
  } catch {
    payload = text
  }

  return {
    ok: response.ok,
    status: response.status,
    payload
  }
}

function authHint(response) {
  if (response.status !== 401) {
    return ''
  }
  if (tokenSource === 'git-credential') {
    return ' The stored gitee.com git credential was used as the API token and was rejected; store a Gitee API access token in FILE_VIEWER_GITEE_TOKEN_FILE or an environment variable instead.'
  }
  return ' Check that the Gitee API token is valid and has organization repository permissions.'
}

async function verifyGiteeToken() {
  const response = await giteeRequest('GET', 'user')
  if (!response.ok) {
    throw new Error(
      `Gitee token preflight failed: HTTP ${response.status} ${JSON.stringify(response.payload)}${authHint(response)}`
    )
  }

  const user = response.payload?.login || response.payload?.name || response.payload?.id || 'unknown'
  console.log(
    `Gitee token preflight ok: source=${tokenSource}, user=${user}, selectedRepositories=${targets.length}.`
  )
}

async function repoExists(owner, repo) {
  if (!token) {
    return false
  }
  const response = await giteeRequest('GET', `repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`)
  if (response.ok) {
    return true
  }
  if (response.status === 404) {
    return false
  }
  throw new Error(
    `Failed to check Gitee repository ${owner}/${repo}: HTTP ${response.status} ${JSON.stringify(response.payload)}${authHint(response)}`
  )
}

async function createRepo(target) {
  const owner = repoOwnerFromUrl(target.gitee)
  const repo = repoNameFromUrl(target.gitee)

  if (!force && await repoExists(owner, repo)) {
    console.log(`exists\t${owner}/${repo}`)
    return 'exists'
  }

  if (dryRun) {
    console.log(`[dry-run]\tcreate\t${owner}/${repo}\t${target.packageName}`)
    return 'dry-run'
  }

  const response = await giteeRequest('POST', `orgs/${encodeURIComponent(owner)}/repos`, {
    name: repo,
    path: repo,
    description: targetDescription(target),
    homepage: targetHomepage(target),
    private: false,
    has_issues: true,
    has_wiki: false,
    can_comment: true,
    auto_init: false
  })

  if (response.ok || response.status === 201) {
    console.log(`created\t${owner}/${repo}`)
    return 'created'
  }

  if (response.status === 400 || response.status === 409) {
    if (await repoExists(owner, repo)) {
      console.log(`exists\t${owner}/${repo}`)
      return 'exists'
    }
  }

  throw new Error(
    `Failed to create Gitee repository ${owner}/${repo}: HTTP ${response.status} ${JSON.stringify(response.payload)}${authHint(response)}`
  )
}

const wrapperManifest = await readJson(join(sourceRoot, 'ecosystem', 'wrappers.json'))
const core = wrapperManifest.corePackage
const targets = [
  {
    id: 'core',
    kind: 'core',
    framework: 'Core',
    packageName: core.packageName,
    repository: core.repository,
    github: core.github,
    gitee: core.gitee
  },
  ...wrapperManifest.wrappers.map(wrapper => ({
    id: wrapper.id,
    kind: 'component',
    framework: wrapper.framework,
    packageName: wrapper.packageName,
    repository: wrapper.repository,
    github: wrapper.github,
    gitee: wrapper.gitee
  }))
].filter(target => {
  if (selectedIds.size && !selectedIds.has(target.id)) {
    return false
  }
  if (selectedPackages.size && !selectedPackages.has(target.packageName)) {
    return false
  }
  return true
})

if (!targets.length) {
  throw new Error('No Gitee core/component repositories selected.')
}

if ((preflight || !dryRun) && !token) {
  throw new Error(missingTokenMessage)
}

if (preflight) {
  await verifyGiteeToken()
  process.exit(0)
}

const results = new Map()
for (const target of targets) {
  const result = await createRepo(target)
  results.set(result, (results.get(result) || 0) + 1)
}

console.log(
  `Checked ${targets.length} Gitee repositories: ${[...results.entries()]
    .map(([name, count]) => `${name}=${count}`)
    .join(', ')}.`
)
