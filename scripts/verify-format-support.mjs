import { readFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadEcosystemReleaseContext } from './lib/ecosystem-packages.mjs'
import {
  readCoreRendererDefinitions,
  summarizeRendererSupport
} from './lib/format-support.mjs'

const expectedRendererCount = 23
const expectedExtensionCount = 194
const scriptDir = dirname(fileURLToPath(import.meta.url))
const sourceRoot = resolve(scriptDir, '..')

function fail(message) {
  throw new Error(`[format-support] ${message}`)
}

function assert(condition, message) {
  if (!condition) {
    fail(message)
  }
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'))
}

async function assertDocumentedCounts(path) {
  const content = await readFile(path, 'utf8')
  assert(
    content.includes(String(expectedExtensionCount)),
    `${path} must mention ${expectedExtensionCount} supported extensions`
  )
  assert(
    content.includes(String(expectedRendererCount)),
    `${path} must mention ${expectedRendererCount} preview pipelines`
  )
}

const renderers = await readCoreRendererDefinitions(sourceRoot)
const summary = summarizeRendererSupport(renderers)

assert(
  summary.rendererCount === expectedRendererCount,
  `Expected ${expectedRendererCount} renderer pipelines, got ${summary.rendererCount}`
)
assert(
  summary.rawExtensionCount === expectedExtensionCount,
  `Expected ${expectedExtensionCount} declared extensions, got ${summary.rawExtensionCount}`
)
assert(
  summary.uniqueExtensionCount === expectedExtensionCount,
  `Expected ${expectedExtensionCount} unique extensions, got ${summary.uniqueExtensionCount}`
)
assert(
  summary.duplicateExtensions.length === 0,
  `Duplicate extension ownership detected: ${summary.duplicateExtensions
    .map(item => `${item.extension}(${item.owners.join(',')})`)
    .join(', ')}`
)

for (const renderer of renderers.values()) {
  for (const extension of renderer.extensionList) {
    assert(
      extension === extension.toLowerCase(),
      `Extension ${extension} in renderer ${renderer.id} must stay lowercase`
    )
    assert(
      /^[a-z0-9]+$/.test(extension),
      `Extension ${extension} in renderer ${renderer.id} must be alphanumeric`
    )
  }
}

const matrix = await readJson(join(sourceRoot, 'ecosystem', 'smoke-matrix.json'))
assert(
  matrix.coverage?.requireAllRendererIds === true,
  'Smoke matrix must require every renderer id'
)

const { wrapperManifest } = await loadEcosystemReleaseContext(sourceRoot)
const documentationFiles = [
  'README.md',
  'README.en.md',
  'docs/guide/formats.md',
  'docs/guide/index.md',
  'docs/guide/overview.md',
  ...wrapperManifest.wrappers.flatMap(wrapper => [
    join(wrapper.packageDir, 'README.md'),
    join(wrapper.packageDir, 'README.en.md')
  ])
]

for (const relativePath of documentationFiles) {
  await assertDocumentedCounts(join(sourceRoot, relativePath))
}

console.log(
  `[format-support] Verified ${summary.uniqueExtensionCount} extensions, ${summary.rendererCount} renderer pipelines, smoke matrix coverage, and ${documentationFiles.length} documentation count references.`
)
