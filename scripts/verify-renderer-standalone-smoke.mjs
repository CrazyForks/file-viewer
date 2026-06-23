import { existsSync } from 'node:fs'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import {
  collectPackageEntrypoints,
  loadEcosystemReleaseContext
} from './lib/ecosystem-packages.mjs'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const sourceRoot = resolve(scriptDir, '..')
const args = process.argv.slice(2)
const pluginEnginePackages = new Set([
  '@file-viewer/pptx',
  '@file-viewer/eda-layout',
  '@file-viewer/eda-orcad'
])

const readArg = (name, fallback) => {
  const index = args.indexOf(name)
  return index >= 0 ? args[index + 1] : fallback
}

const selectedRenderers = args
  .filter(arg => arg.startsWith('--renderer='))
  .map(arg => arg.slice('--renderer='.length))
const smokeAllRenderers = args.includes('--all')
const smokeRoot = resolve(
  sourceRoot,
  readArg(
    '--tmp-dir',
    process.env.FILE_VIEWER_RENDERER_STANDALONE_SMOKE_DIR || '.release/renderer-standalone-smoke'
  )
)
const keepTemp = args.includes('--keep-temp')
const commandTimeoutMs = Number(
  readArg('--timeout-ms', process.env.FILE_VIEWER_RENDERER_STANDALONE_TIMEOUT_MS || '300000')
)

const { entries } = await loadEcosystemReleaseContext(sourceRoot)
const entryByPackageName = new Map(entries.map(entry => [entry.packageName, entry]))
const entryById = new Map(entries.map(entry => [entry.id, entry]))
const pluginRendererEntries = entries.filter(
  entry => entry.kind === 'renderer' && !pluginEnginePackages.has(entry.packageName)
)

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

function run(command, commandArgs, cwd = sourceRoot, options = {}) {
  console.log(`$ ${[command, ...commandArgs].join(' ')}`)
  const result = spawnSync(command, commandArgs, {
    cwd,
    encoding: 'utf8',
    stdio: options.capture ? 'pipe' : 'inherit',
    timeout: options.timeoutMs ?? commandTimeoutMs,
    killSignal: 'SIGTERM',
    env: {
      ...process.env,
      npm_config_loglevel: 'error'
    }
  })
  if (result.error) {
    throw new Error(
      [
        `Command failed in ${cwd}: ${command} ${commandArgs.join(' ')}`,
        result.error.message,
        result.stdout,
        result.stderr
      ].filter(Boolean).join('\n')
    )
  }
  if (result.status !== 0) {
    throw new Error(
      [
        `Command failed in ${cwd}: ${command} ${commandArgs.join(' ')}`,
        result.stdout,
        result.stderr
      ].filter(Boolean).join('\n')
    )
  }
  return result.stdout?.trim() || ''
}

async function assertBuiltEntrypoints(entry) {
  for (const entrypoint of collectPackageEntrypoints(entry.packageJson)) {
    const absoluteEntrypoint = join(entry.absoluteDir, entrypoint)
    assert(
      existsSync(absoluteEntrypoint),
      `${entry.packageName} is missing ${entrypoint}. Build it before renderer standalone smoke.`
    )
  }
}

function localDependencyNames(packageJson) {
  const blocks = [
    packageJson.dependencies,
    packageJson.devDependencies,
    packageJson.optionalDependencies,
    packageJson.peerDependencies
  ].filter(Boolean)
  const names = new Set()
  for (const block of blocks) {
    for (const name of Object.keys(block)) {
      if (entryByPackageName.has(name)) {
        names.add(name)
      }
    }
  }
  return names
}

function collectLocalDependencyClosure(entry, collected = new Set()) {
  for (const dependencyName of localDependencyNames(entry.packageJson)) {
    if (collected.has(dependencyName)) {
      continue
    }
    const dependencyEntry = entryByPackageName.get(dependencyName)
    if (!dependencyEntry) {
      continue
    }
    collected.add(dependencyName)
    collectLocalDependencyClosure(dependencyEntry, collected)
  }
  return collected
}

function resolveRendererEntry(idOrName) {
  const normalized = idOrName.startsWith('renderer-') ? idOrName : `renderer-${idOrName}`
  const byId = entryById.get(normalized)
  if (byId?.kind === 'renderer' && !pluginEnginePackages.has(byId.packageName)) {
    return byId
  }
  const byPackageName = entryByPackageName.get(idOrName)
  if (byPackageName?.kind === 'renderer' && !pluginEnginePackages.has(byPackageName.packageName)) {
    return byPackageName
  }
  throw new Error(`Unknown renderer smoke target: ${idOrName}`)
}

function toFileSpec(fromDir, targetFile) {
  const relativePath = relative(fromDir, targetFile).split(sep).join('/')
  return `file:${relativePath.startsWith('.') ? relativePath : `./${relativePath}`}`
}

const coreEntry = entryByPackageName.get('@file-viewer/core')
const vitePluginEntry = entryByPackageName.get('@file-viewer/vite-plugin')
assert(coreEntry, 'Missing @file-viewer/core entry')
assert(vitePluginEntry, 'Missing @file-viewer/vite-plugin entry')

const rendererInputs = smokeAllRenderers
  ? pluginRendererEntries.map(entry => entry.renderer.id)
  : (selectedRenderers.length ? selectedRenderers : ['pdf'])
const rendererEntries = [...new Map(rendererInputs.map(input => {
  const entry = resolveRendererEntry(input)
  return [entry.packageName, entry]
})).values()]
assert(rendererEntries.length, 'No renderer smoke targets were selected')

const requiredEntries = new Map()
for (const entry of [coreEntry, vitePluginEntry, ...rendererEntries]) {
  requiredEntries.set(entry.packageName, entry)
  collectLocalDependencyClosure(entry).forEach(packageName => {
    const dependencyEntry = entryByPackageName.get(packageName)
    if (dependencyEntry) {
      requiredEntries.set(dependencyEntry.packageName, dependencyEntry)
    }
  })
}

const tarballDir = join(smokeRoot, 'tarballs')
const caseRoot = join(smokeRoot, 'case')
if (!keepTemp) {
  await rm(smokeRoot, { recursive: true, force: true })
}
await mkdir(tarballDir, { recursive: true })
await mkdir(caseRoot, { recursive: true })

const tarballByPackageName = new Map()
for (const entry of requiredEntries.values()) {
  await assertBuiltEntrypoints(entry)
  run('pnpm', ['-C', entry.packageDir, 'pack', '--pack-destination', tarballDir], sourceRoot, {
    capture: true
  })
  const tarball = join(tarballDir, entry.tarballName)
  assert(existsSync(tarball), `Expected tarball was not created: ${tarball}`)
  tarballByPackageName.set(entry.packageName, tarball)
  console.log(`Packed ${entry.packageName} -> ${entry.tarballName}`)
}

const dependencies = Object.fromEntries(
  [...requiredEntries.values()].map(entry => [
    entry.packageName,
    toFileSpec(caseRoot, tarballByPackageName.get(entry.packageName))
  ])
)
const smokeTargets = rendererEntries.map(entry => ({
  id: entry.renderer.id,
  packageName: entry.packageName
}))

await writeFile(
  join(caseRoot, 'package.json'),
  `${JSON.stringify(
    {
      name: 'file-viewer-renderer-standalone-smoke',
      private: true,
      type: 'module',
      scripts: {
        smoke: 'node smoke.mjs'
      },
      dependencies
    },
    null,
    2
  )}\n`
)

await writeFile(
  join(caseRoot, 'smoke.mjs'),
  `import assert from 'node:assert/strict'
import {
  createRendererRegistry,
  installFileViewerRendererPlugins
} from '@file-viewer/core'
import { fileViewerRenderers, resolveFileViewerRendererSelection } from '@file-viewer/vite-plugin'
${rendererEntries.map((entry, index) => `import renderer${index} from '${entry.packageName}'`).join('\n')}

const rendererPlugins = [${rendererEntries.map((_entry, index) => `renderer${index}`).join(', ')}]
const smokeTargets = ${JSON.stringify(smokeTargets, null, 2)}
const registry = createRendererRegistry([])
const handlers = new Map()
await installFileViewerRendererPlugins({
  registry,
  plugins: rendererPlugins,
  registerHandler(registration) {
    handlers.set(registration.rendererId, registration.handler)
  }
})

assert.equal(rendererPlugins.length, smokeTargets.length)
assert.equal(registry.hasExtension('docx'), smokeTargets.some(target => target.id === 'word'))

for (const target of smokeTargets) {
  const selection = resolveFileViewerRendererSelection({ renderers: [target.id] }, process.cwd())
  assert.deepEqual(
    selection.renderers.map(item => item.packageName),
    [target.packageName],
    target.id + ' must map to its own standalone renderer package'
  )
  const rendererIds = selection.renderers.flatMap(item => item.rendererIds)
  assert.ok(rendererIds.length, target.id + ' must expose at least one core renderer id')
  for (const rendererId of rendererIds) {
    assert.ok(registry.getById(rendererId), target.packageName + ' must register definition ' + rendererId)
    assert.ok(handlers.has(rendererId), target.packageName + ' must register handler ' + rendererId)
  }

  const vitePlugin = fileViewerRenderers({ renderers: [target.id] })
  await vitePlugin.buildStart?.()
  const resolvedId = vitePlugin.resolveId?.('virtual:file-viewer-renderers')
  assert.equal(typeof resolvedId, 'string', target.id + ' virtual module must resolve')
  const virtualCode = await vitePlugin.load?.(resolvedId)
  assert.ok(
    virtualCode.includes(target.packageName),
    target.id + ' virtual module must import ' + target.packageName
  )
  for (const otherTarget of smokeTargets) {
    if (otherTarget.packageName !== target.packageName) {
      assert.ok(
        !virtualCode.includes(otherTarget.packageName),
        target.id + ' virtual module must not import unrelated package ' + otherTarget.packageName
      )
    }
  }
}

console.log('[renderer-standalone-smoke] Renderer plugin installation passed for ' + smokeTargets.map(target => target.packageName).join(', ') + '.')
`
)

run('npm', [
  'install',
  '--ignore-scripts',
  '--no-audit',
  '--no-fund',
  '--prefer-online',
  '--legacy-peer-deps',
  '--install-strategy=shallow'
], caseRoot)
run('npm', ['run', 'smoke'], caseRoot)

console.log(
  `[renderer-standalone-smoke] Verified ${rendererEntries.map(entry => entry.packageName).join(', ')} in an isolated install.`
)
