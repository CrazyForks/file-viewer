import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const sourceRoot = resolve(scriptDir, '..')
const args = process.argv.slice(2)

const readJson = async path => JSON.parse(await readFile(path, 'utf8'))
const branchRoles = await readJson(join(sourceRoot, 'ecosystem', 'branch-roles.json'))

const optionValue = name => {
  const prefix = `${name}=`
  const match = args.find(arg => arg.startsWith(prefix))
  return match ? match.slice(prefix.length) : null
}

const repoSlugFromUrl = url => {
  const match = String(url).match(/github\.com[:/]([^/]+\/[^/]+?)(?:\.git)?$/)
  if (!match) {
    throw new Error(`Unable to parse GitHub repository URL: ${url}`)
  }
  return match[1]
}

const repo = optionValue('--repo') || repoSlugFromUrl(branchRoles.publicMainRepository.github)
const output = optionValue('--output')
const jsonOutput = args.includes('--json')

const runGhJson = commandArgs => {
  const result = spawnSync('gh', commandArgs, {
    cwd: sourceRoot,
    encoding: 'utf8',
    stdio: 'pipe'
  })
  if (result.status !== 0) {
    const details = [result.stderr, result.stdout].filter(Boolean).join('\n')
    throw new Error(`Command failed: gh ${commandArgs.join(' ')}${details ? `\n${details}` : ''}`)
  }
  return JSON.parse(result.stdout || '{}')
}

const api = path => runGhJson(['api', `repos/${repo}${path}`])

const [repoInfo, views, clones, referrers, paths] = [
  api(''),
  api('/traffic/views'),
  api('/traffic/clones'),
  api('/traffic/popular/referrers'),
  api('/traffic/popular/paths')
]

const snapshot = {
  generatedAt: new Date().toISOString(),
  repo,
  stars: repoInfo.stargazers_count,
  forks: repoInfo.forks_count,
  openIssues: repoInfo.open_issues_count,
  watchers: repoInfo.subscribers_count,
  views,
  clones,
  referrers,
  paths
}

const table = (headers, rows) => {
  const line = `| ${headers.join(' | ')} |`
  const divider = `| ${headers.map(() => '---').join(' | ')} |`
  return [line, divider, ...rows.map(row => `| ${row.join(' | ')} |`)].join('\n')
}

const renderMarkdown = data => {
  const referrerRows = data.referrers.length
    ? data.referrers.map(item => [item.referrer, item.count, item.uniques])
    : [['-', '-', '-']]
  const pathRows = data.paths.length
    ? data.paths.map(item => [item.path, item.title || '-', item.count, item.uniques])
    : [['-', '-', '-', '-']]

  return [
    '# GitHub Traffic Snapshot',
    '',
    `- Generated at: ${data.generatedAt}`,
    `- Repository: ${data.repo}`,
    `- Stars: ${data.stars}`,
    `- Forks: ${data.forks}`,
    `- Open issues: ${data.openIssues}`,
    `- Watchers: ${data.watchers}`,
    `- Views: ${data.views.count} total / ${data.views.uniques} unique`,
    `- Clones: ${data.clones.count} total / ${data.clones.uniques} unique`,
    '',
    '## Referrers',
    '',
    table(['Referrer', 'Views', 'Unique visitors'], referrerRows),
    '',
    '## Popular Content',
    '',
    table(['Path', 'Title', 'Views', 'Unique visitors'], pathRows),
    ''
  ].join('\n')
}

const body = jsonOutput ? `${JSON.stringify(snapshot, null, 2)}\n` : renderMarkdown(snapshot)

if (output) {
  const outputPath = resolve(sourceRoot, output)
  await mkdir(dirname(outputPath), { recursive: true })
  await writeFile(outputPath, body)
  console.log(`Wrote ${outputPath.replace(`${sourceRoot}/`, '')}`)
} else {
  process.stdout.write(body)
}
