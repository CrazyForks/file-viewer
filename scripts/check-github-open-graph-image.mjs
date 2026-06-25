import { dirname, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const sourceRoot = resolve(scriptDir, '..')
const args = process.argv.slice(2)

const optionValue = (name, fallback) => {
  const prefix = `${name}=`
  const match = args.find(arg => arg.startsWith(prefix))
  return match ? match.slice(prefix.length) : fallback
}

const owner = optionValue('--owner', 'flyfish-dev')
const name = optionValue('--repo', 'file-viewer')

const result = spawnSync(
  'gh',
  [
    'api',
    'graphql',
    '-F',
    `owner=${owner}`,
    '-F',
    `name=${name}`,
    '-f',
    'query=query($owner:String!, $name:String!) { repository(owner:$owner, name:$name) { openGraphImageUrl usesCustomOpenGraphImage } }'
  ],
  {
    cwd: sourceRoot,
    encoding: 'utf8',
    stdio: 'pipe'
  }
)

if (result.status !== 0) {
  const details = [result.stderr, result.stdout].filter(Boolean).join('\n')
  throw new Error(`Failed to read GitHub Open Graph URL.${details ? `\n${details}` : ''}`)
}

const payload = JSON.parse(result.stdout || '{}')
const repository = payload.data?.repository
const url = repository?.openGraphImageUrl
const usesCustomOpenGraphImage = Boolean(repository?.usesCustomOpenGraphImage)
if (!url) {
  throw new Error('GitHub did not return an Open Graph image URL.')
}

const response = await fetch(url)
if (!response.ok) {
  throw new Error(`Failed to fetch Open Graph image: ${response.status} ${response.statusText}`)
}

const bytes = Buffer.from(await response.arrayBuffer())
let width = null
let height = null
let type = 'unknown'

if (bytes.subarray(0, 8).toString('hex') === '89504e470d0a1a0a') {
  type = 'png'
  width = bytes.readUInt32BE(16)
  height = bytes.readUInt32BE(20)
}

console.log(`Repository: ${owner}/${name}`)
console.log(`Open Graph URL: ${url}`)
console.log(`Uses custom Open Graph image: ${usesCustomOpenGraphImage ? 'yes' : 'no'}`)
console.log(`Image type: ${type}`)
console.log(`Image size: ${width && height ? `${width}x${height}` : 'unknown'}`)

if (usesCustomOpenGraphImage) {
  console.log('Status: GitHub reports a custom social preview image is configured.')
} else {
  console.log('Status: GitHub reports no custom social preview image. Upload .github/social-preview.png in Settings -> Social preview.')
}
