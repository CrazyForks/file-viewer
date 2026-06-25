import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const sourceRoot = resolve(scriptDir, '..')
const args = process.argv.slice(2)

const defaultPackages = [
  '@file-viewer/core',
  '@file-viewer/web',
  '@file-viewer/web-full',
  '@file-viewer/vue3',
  '@file-viewer/vue3-full',
  '@file-viewer/react',
  '@file-viewer/react-full',
  '@file-viewer/svelte',
  '@file-viewer/svelte-full'
]

const optionValue = name => {
  const prefix = `${name}=`
  const match = args.find(arg => arg.startsWith(prefix))
  return match ? match.slice(prefix.length) : null
}

const period = optionValue('--period') || 'last-week'
const output = optionValue('--output')
const jsonOutput = args.includes('--json')
const packages = args
  .filter(arg => !arg.startsWith('--'))
  .flatMap(arg => arg.split(','))
  .map(arg => arg.trim())
  .filter(Boolean)

const packageNames = packages.length ? packages : defaultPackages

const readDownloads = async name => {
  const encoded = encodeURIComponent(name)
  const response = await fetch(`https://api.npmjs.org/downloads/point/${period}/${encoded}`)
  if (!response.ok) {
    return {
      package: name,
      downloads: null,
      start: null,
      end: null,
      error: `${response.status} ${response.statusText}`.trim()
    }
  }
  return response.json()
}

const rows = await Promise.all(packageNames.map(readDownloads))
const snapshot = {
  generatedAt: new Date().toISOString(),
  period,
  packages: rows.map(row => ({
    package: row.package,
    downloads: row.downloads,
    start: row.start,
    end: row.end,
    error: row.error || null
  }))
}

const renderMarkdown = data => [
  '# npm Downloads Snapshot',
  '',
  `- Generated at: ${data.generatedAt}`,
  `- Period: ${data.period}`,
  '',
  '| Package | Downloads | Start | End | Status |',
  '| --- | --- | --- | --- | --- |',
  ...data.packages.map(row => `| ${row.package} | ${row.downloads ?? '-'} | ${row.start ?? '-'} | ${row.end ?? '-'} | ${row.error ? `unavailable: ${row.error}` : 'ok'} |`),
  ''
].join('\n')

const body = jsonOutput ? `${JSON.stringify(snapshot, null, 2)}\n` : renderMarkdown(snapshot)

if (output) {
  const outputPath = resolve(sourceRoot, output)
  await mkdir(dirname(outputPath), { recursive: true })
  await writeFile(outputPath, body)
  console.log(`Wrote ${outputPath.replace(`${sourceRoot}/`, '')}`)
} else {
  process.stdout.write(body)
}
