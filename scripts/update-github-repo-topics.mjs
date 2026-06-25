import { readFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const sourceRoot = resolve(scriptDir, '..')
const args = process.argv.slice(2)
const apply = args.includes('--apply')
const keepExisting = args.includes('--keep-existing')
const offline = args.includes('--offline')

if (apply && offline) {
  throw new Error('Cannot apply topic updates with --offline because current GitHub topics must be read first.')
}

const desiredTopics = [
  'file-viewer',
  'document-viewer',
  'document-preview',
  'file-preview',
  'office-viewer',
  'pdf-viewer',
  'docx',
  'pptx',
  'xlsx',
  'cad-viewer',
  'dwg',
  'dxf',
  'vue',
  'react',
  'typescript',
  'web-components',
  'wasm',
  'offline-first',
  'self-hosted',
  'private-deployment'
]

const readJson = async path => JSON.parse(await readFile(path, 'utf8'))
const branchRoles = await readJson(join(sourceRoot, 'ecosystem', 'branch-roles.json'))

const repoSlugFromUrl = url => {
  const match = String(url).match(/github\.com[:/]([^/]+\/[^/]+?)(?:\.git)?$/)
  if (!match) {
    throw new Error(`Unable to parse GitHub repository URL: ${url}`)
  }
  return match[1]
}

const repoArg = args.find(arg => arg.startsWith('--repo='))
const repo = repoArg
  ? repoArg.slice('--repo='.length)
  : repoSlugFromUrl(branchRoles.publicMainRepository.github)

const runGh = (commandArgs, { capture = false } = {}) => {
  const printable = `gh ${commandArgs.join(' ')}`
  const result = spawnSync('gh', commandArgs, {
    cwd: sourceRoot,
    encoding: 'utf8',
    stdio: capture ? 'pipe' : 'inherit'
  })
  if (result.status !== 0) {
    const details = [result.stderr, result.stdout].filter(Boolean).join('\n')
    throw new Error(`Command failed: ${printable}${details ? `\n${details}` : ''}`)
  }
  return result.stdout || ''
}

const readCurrentTopics = () => {
  if (offline) {
    return null
  }
  try {
    const currentOutput = runGh(
      ['repo', 'view', repo, '--json', 'repositoryTopics', '--jq', '.repositoryTopics[].name'],
      { capture: true }
    )
    return currentOutput
      .split('\n')
      .map(topic => topic.trim())
      .filter(Boolean)
  } catch (error) {
    if (apply) {
      throw error
    }
    console.warn(`Could not read current GitHub topics: ${error.message}`)
    return null
  }
}

const printPlan = currentTopics => {
  console.log(`Repository: ${repo}`)
  console.log(`Desired topics (${desiredTopics.length}): ${desiredTopics.join(', ')}`)
  if (currentTopics) {
    const currentSet = new Set(currentTopics)
    const desiredSet = new Set(desiredTopics)
    const toAdd = desiredTopics.filter(topic => !currentSet.has(topic))
    const toRemove = keepExisting ? [] : currentTopics.filter(topic => !desiredSet.has(topic))
    console.log(`Current topics (${currentTopics.length}): ${currentTopics.join(', ') || '(none)'}`)
    console.log(`Add: ${toAdd.join(', ') || '(none)'}`)
    console.log(`Remove: ${toRemove.join(', ') || '(none)'}`)
  }
  console.log('Run with --apply to update GitHub topics.')
}

if (!apply) {
  printPlan(readCurrentTopics())
  process.exit(0)
}

const currentTopics = readCurrentTopics()

const currentSet = new Set(currentTopics)
const desiredSet = new Set(desiredTopics)
const topicsToAdd = desiredTopics.filter(topic => !currentSet.has(topic))
const topicsToRemove = keepExisting ? [] : currentTopics.filter(topic => !desiredSet.has(topic))

printPlan(currentTopics)

if (!topicsToAdd.length && !topicsToRemove.length) {
  console.log('GitHub topics already match the desired discovery set.')
  process.exit(0)
}

const editArgs = ['repo', 'edit', repo]
for (const topic of topicsToAdd) {
  editArgs.push('--add-topic', topic)
}
for (const topic of topicsToRemove) {
  editArgs.push('--remove-topic', topic)
}

runGh(editArgs)
console.log(`Updated GitHub topics for ${repo}.`)
