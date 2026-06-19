import { readFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { validateJsonSchema } from './lib/simple-json-schema.mjs'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const sourceRoot = resolve(scriptDir, '..')
const args = process.argv.slice(2)

function readArg(name, fallback) {
  const index = args.indexOf(name)
  return index >= 0 ? args[index + 1] : fallback
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'))
}

const schemaPath = resolve(
  sourceRoot,
  readArg('--schema', 'ecosystem/release-status.schema.json')
)
const statusPath = resolve(
  sourceRoot,
  readArg(
    '--status',
    process.env.FILE_VIEWER_PUBLIC_REPO_DIR
      ? join(process.env.FILE_VIEWER_PUBLIC_REPO_DIR, 'artifacts', 'release-status.json')
      : '../file-viewer-public/artifacts/release-status.json'
  )
)

const [schema, status] = await Promise.all([readJson(schemaPath), readJson(statusPath)])
const failures = validateJsonSchema(status, schema)

if (schema.$id !== 'https://github.com/flyfish-dev/file-viewer/releases/download/v2.0.0/release-status.schema.json') {
  failures.push('schema $id must point at the GitHub Release schema asset')
}

if (!schema.required?.includes('gapSummary') || !schema.required?.includes('gapDetails')) {
  failures.push('schema must require gapSummary and gapDetails')
}

if (status.gapSummary?.total !== status.gaps?.length) {
  failures.push('status gapSummary.total must match gaps.length')
}

if (status.gapDetails?.length !== status.gaps?.length) {
  failures.push('status gapDetails.length must match gaps.length')
}

if (failures.length) {
  throw new Error(`Release status schema verification failed:\n${failures.join('\n')}`)
}

console.log(`Verified release status schema ${schemaPath} against ${statusPath}.`)
