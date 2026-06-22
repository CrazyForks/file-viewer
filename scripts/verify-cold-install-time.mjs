import { existsSync } from 'node:fs'
import { mkdir, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { spawnSync } from 'node:child_process'
import { performance } from 'node:perf_hooks'
import { fileURLToPath } from 'node:url'
import {
  collectPackageEntrypoints,
  loadEcosystemReleaseContext
} from './lib/ecosystem-packages.mjs'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const sourceRoot = resolve(scriptDir, '..')
const args = process.argv.slice(2)

const readArg = (name, fallback) => {
  const index = args.indexOf(name)
  return index >= 0 ? args[index + 1] : fallback
}

const readRepeatedArg = (name) =>
  args
    .filter(arg => arg.startsWith(`${name}=`))
    .map(arg => arg.slice(name.length + 1))

const commandTimeoutMs = Number(
  readArg('--timeout-ms', process.env.FILE_VIEWER_COLD_INSTALL_TIMEOUT_MS || '600000')
)
const coldInstallRoot = resolve(
  sourceRoot,
  readArg(
    '--tmp-dir',
    process.env.FILE_VIEWER_COLD_INSTALL_DIR || '.release/cold-install-time'
  )
)
const keepTemp = args.includes('--keep-temp')
const warnOnly = args.includes('--warn-only') || process.env.FILE_VIEWER_COLD_INSTALL_WARN_ONLY === '1'
const jsonOutput = args.includes('--json')
const budgetMultiplier = Number(process.env.FILE_VIEWER_COLD_INSTALL_BUDGET_MULTIPLIER || '1')

const { entries } = await loadEcosystemReleaseContext(sourceRoot)
const entryByPackageName = new Map(entries.map(entry => [entry.packageName, entry]))

const targetDefinitions = [
  {
    id: 'core',
    label: 'Core only',
    dependencies: ['@file-viewer/core'],
    smokeImports: ['@file-viewer/core'],
    maxMs: 60_000
  },
  {
    id: 'vue3',
    label: 'Vue 3 wrapper only',
    dependencies: ['@file-viewer/vue3'],
    smokeImports: [],
    maxMs: 120_000
  },
  {
    id: 'vue3-lite',
    aliases: ['preset-lite', 'lite'],
    label: 'Vue 3 + lite preset',
    dependencies: ['@file-viewer/vue3', '@file-viewer/preset-lite'],
    smokeImports: ['@file-viewer/preset-lite'],
    maxMs: 150_000
  },
  {
    id: 'vue3-office',
    aliases: ['preset-office', 'office'],
    label: 'Vue 3 + office preset',
    dependencies: ['@file-viewer/vue3', '@file-viewer/preset-office'],
    smokeImports: ['@file-viewer/preset-office'],
    maxMs: 240_000
  },
  {
    id: 'vue3-engineering',
    aliases: ['preset-engineering', 'engineering'],
    label: 'Vue 3 + engineering preset',
    dependencies: ['@file-viewer/vue3', '@file-viewer/preset-engineering'],
    smokeImports: ['@file-viewer/preset-engineering'],
    maxMs: 300_000
  },
  {
    id: 'vue3-all',
    aliases: ['preset-all', 'all'],
    label: 'Vue 3 + full preset',
    dependencies: ['@file-viewer/vue3', '@file-viewer/preset-all'],
    smokeImports: ['@file-viewer/preset-all'],
    maxMs: 420_000
  }
]

const targetById = new Map()
for (const target of targetDefinitions) {
  targetById.set(target.id, target)
  for (const alias of target.aliases || []) {
    targetById.set(alias, target)
  }
}

const selectedTargetNames = readRepeatedArg('--target')
const selectedTargets = selectedTargetNames.length
  ? [...new Map(selectedTargetNames.map(name => {
    const target = targetById.get(name)
    if (!target) {
      throw new Error(
        `Unknown cold install target "${name}". Known targets: ${targetDefinitions.map(item => item.id).join(', ')}`
      )
    }
    return [target.id, target]
  })).values()]
  : targetDefinitions

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

function run(command, commandArgs, cwd = sourceRoot, options = {}) {
  if (!jsonOutput) {
    console.log(`$ ${[command, ...commandArgs].join(' ')}`)
  }
  const captureOutput = options.capture || jsonOutput
  const result = spawnSync(command, commandArgs, {
    cwd,
    encoding: 'utf8',
    stdio: captureOutput ? 'pipe' : 'inherit',
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

function runtimeDependencyNames(packageJson) {
  return Object.keys({
    ...(packageJson.dependencies || {}),
    ...(packageJson.optionalDependencies || {})
  }).sort()
}

function collectLocalDependencyClosure(entry, collected = new Map()) {
  for (const dependencyName of runtimeDependencyNames(entry.packageJson)) {
    const dependencyEntry = entryByPackageName.get(dependencyName)
    if (!dependencyEntry || collected.has(dependencyEntry.packageName)) {
      continue
    }
    collected.set(dependencyEntry.packageName, dependencyEntry)
    collectLocalDependencyClosure(dependencyEntry, collected)
  }
  return collected
}

async function assertBuiltEntrypoints(entry) {
  for (const entrypoint of collectPackageEntrypoints(entry.packageJson)) {
    const absoluteEntrypoint = join(entry.absoluteDir, entrypoint)
    assert(
      existsSync(absoluteEntrypoint),
      `${entry.packageName} is missing ${entrypoint}. Build it before cold install verification.`
    )
  }
}

function toFileSpec(fromDir, targetFile) {
  const relativePath = relative(fromDir, targetFile).split(sep).join('/')
  return `file:${relativePath.startsWith('.') ? relativePath : `./${relativePath}`}`
}

async function directorySizeBytes(directory) {
  if (!existsSync(directory)) {
    return 0
  }
  let total = 0
  const items = await readdir(directory, { withFileTypes: true })
  for (const item of items) {
    const absolutePath = join(directory, item.name)
    if (item.isDirectory()) {
      total += await directorySizeBytes(absolutePath)
    } else {
      total += (await stat(absolutePath)).size
    }
  }
  return total
}

function formatBytes(value) {
  if (value < 1024) {
    return `${value} B`
  }
  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KiB`
  }
  return `${(value / 1024 / 1024).toFixed(2)} MiB`
}

function formatMs(value) {
  if (value < 1000) {
    return `${Math.round(value)} ms`
  }
  return `${(value / 1000).toFixed(2)} s`
}

function collectTargetEntries(target) {
  const entriesByPackage = new Map()
  for (const packageName of target.dependencies) {
    const entry = entryByPackageName.get(packageName)
    assert(entry, `Missing package entry for cold install target ${target.id}: ${packageName}`)
    entriesByPackage.set(entry.packageName, entry)
    collectLocalDependencyClosure(entry).forEach(dependencyEntry => {
      entriesByPackage.set(dependencyEntry.packageName, dependencyEntry)
    })
  }
  return [...entriesByPackage.values()]
}

const requiredEntries = new Map()
for (const target of selectedTargets) {
  for (const entry of collectTargetEntries(target)) {
    requiredEntries.set(entry.packageName, entry)
  }
}

const tarballDir = join(coldInstallRoot, 'tarballs')
const casesDir = join(coldInstallRoot, 'cases')
if (!keepTemp) {
  await rm(coldInstallRoot, { recursive: true, force: true })
}
await mkdir(tarballDir, { recursive: true })
await mkdir(casesDir, { recursive: true })

const tarballByPackageName = new Map()
for (const entry of requiredEntries.values()) {
  await assertBuiltEntrypoints(entry)
  run('pnpm', ['-C', entry.packageDir, 'pack', '--pack-destination', tarballDir], sourceRoot, {
    capture: true
  })
  const tarball = join(tarballDir, entry.tarballName)
  assert(existsSync(tarball), `Expected tarball was not created: ${tarball}`)
  tarballByPackageName.set(entry.packageName, tarball)
  if (!jsonOutput) {
    console.log(`[cold-install] Packed ${entry.packageName} -> ${entry.tarballName}`)
  }
}

const reports = []
const errors = []

for (const target of selectedTargets) {
  const targetEntries = collectTargetEntries(target)
  const caseRoot = join(casesDir, target.id)
  await rm(caseRoot, { recursive: true, force: true })
  await mkdir(caseRoot, { recursive: true })

  const dependencies = Object.fromEntries(
    targetEntries.map(entry => [
      entry.packageName,
      toFileSpec(caseRoot, tarballByPackageName.get(entry.packageName))
    ])
  )

  await writeFile(
    join(caseRoot, 'package.json'),
    `${JSON.stringify(
      {
        name: `file-viewer-cold-install-${target.id}`,
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
    `${target.smokeImports.map((packageName, index) => `import * as package${index} from '${packageName}'`).join('\n')}
${target.smokeImports.map((_packageName, index) => `if (!package${index}) throw new Error('Missing package ${index}')`).join('\n')}
console.log('[cold-install] Smoke import passed for ${target.id}.')
`
  )

  const startedAt = performance.now()
  run(
    'npm',
    [
      'install',
      '--ignore-scripts',
      '--no-audit',
      '--no-fund',
      '--prefer-online',
      '--legacy-peer-deps',
      '--install-strategy=shallow'
    ],
    caseRoot
  )
  const elapsedMs = performance.now() - startedAt

  if (target.smokeImports.length) {
    run('npm', ['run', 'smoke'], caseRoot)
  }

  const nodeModulesBytes = await directorySizeBytes(join(caseRoot, 'node_modules'))
  const maxMs = Math.round(target.maxMs * budgetMultiplier)
  const report = {
    id: target.id,
    label: target.label,
    dependencyCount: targetEntries.length,
    elapsedMs: Math.round(elapsedMs),
    maxMs,
    nodeModulesBytes
  }
  reports.push(report)

  if (elapsedMs > maxMs) {
    errors.push(
      `${target.id} cold install took ${formatMs(elapsedMs)}, exceeding budget ${formatMs(maxMs)}`
    )
  }
}

if (jsonOutput) {
  console.log(JSON.stringify({ reports, warnOnly }, null, 2))
} else {
  for (const report of reports) {
    console.log(
      `[cold-install] ${report.id}: ${formatMs(report.elapsedMs)} / budget ${formatMs(report.maxMs)}, local packages ${report.dependencyCount}, node_modules ${formatBytes(report.nodeModulesBytes)}.`
    )
  }
}

if (errors.length) {
  const prefix = warnOnly ? '[cold-install] Warnings' : '[cold-install] Failed'
  console.error(prefix)
  errors.forEach(error => console.error(`  - ${error}`))
  if (!warnOnly) {
    process.exitCode = 1
  }
} else {
  if (!jsonOutput) {
    console.log(`[cold-install] Passed ${reports.length} cold install target${reports.length === 1 ? '' : 's'}.`)
  }
}
