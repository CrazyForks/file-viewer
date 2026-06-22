import { spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadEcosystemReleaseContext } from './lib/ecosystem-packages.mjs'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const sourceRoot = resolve(scriptDir, '..')
const { entries } = await loadEcosystemReleaseContext(sourceRoot)

const packageBudgets = {
  '@file-viewer/core': {
    maxPackedBytes: 330_000,
    maxUnpackedBytes: 1_600_000,
    maxFiles: 180,
    maxDirectRuntimeDependencies: 37,
    maxExternalDependencyClosure: 39,
    maxLocalPackageClosure: 2
  },
  '@file-viewer/vue3': {
    maxPackedBytes: 1_900_000,
    maxUnpackedBytes: 7_500_000,
    maxFiles: 45,
    maxDirectRuntimeDependencies: 3,
    maxExternalDependencyClosure: 41,
    maxLocalPackageClosure: 3
  },
  '@file-viewer/web': {
    maxPackedBytes: 33_000_000,
    maxUnpackedBytes: 125_000_000,
    maxFiles: 2_900,
    maxDirectRuntimeDependencies: 1,
    maxExternalDependencyClosure: 39,
    maxLocalPackageClosure: 3
  },
  '@file-viewer/preset-all': {
    maxPackedBytes: 10_000,
    maxUnpackedBytes: 32_000,
    maxFiles: 9,
    maxDirectRuntimeDependencies: 19,
    maxExternalDependencyClosure: 39,
    maxLocalPackageClosure: 21
  },
  '@file-viewer/vite-plugin': {
    maxPackedBytes: 30_000,
    maxUnpackedBytes: 100_000,
    maxFiles: 12,
    maxDirectRuntimeDependencies: 0,
    maxExternalDependencyClosure: 0,
    maxLocalPackageClosure: 1
  },
  '@file-viewer/pptx': {
    maxPackedBytes: 130_000,
    maxUnpackedBytes: 600_000,
    maxFiles: 24,
    maxDirectRuntimeDependencies: 5,
    maxExternalDependencyClosure: 5,
    maxLocalPackageClosure: 1
  },
  '@file-viewer/renderer-ofd': {
    maxPackedBytes: 140_000,
    maxUnpackedBytes: 520_000,
    maxFiles: 34,
    maxDirectRuntimeDependencies: 3,
    maxExternalDependencyClosure: 39,
    maxLocalPackageClosure: 3
  },
  '@file-viewer/renderer-word': {
    maxPackedBytes: 35_000,
    maxUnpackedBytes: 160_000,
    maxFiles: 18,
    maxDirectRuntimeDependencies: 5,
    maxExternalDependencyClosure: 39,
    maxLocalPackageClosure: 3
  },
  '@file-viewer/renderer-data': {
    maxPackedBytes: 35_000,
    maxUnpackedBytes: 160_000,
    maxFiles: 18,
    maxDirectRuntimeDependencies: 5,
    maxExternalDependencyClosure: 39,
    maxLocalPackageClosure: 3
  }
}

const kindBudgets = {
  renderer: {
    maxPackedBytes: 35_000,
    maxUnpackedBytes: 160_000,
    maxFiles: 18,
    maxDirectRuntimeDependencies: 4
  },
  'standard-wrapper': {
    maxPackedBytes: 30_000,
    maxUnpackedBytes: 120_000,
    maxFiles: 12,
    maxDirectRuntimeDependencies: 3
  },
  preset: {
    maxPackedBytes: 10_000,
    maxUnpackedBytes: 30_000,
    maxFiles: 10,
    maxDirectRuntimeDependencies: 20
  }
}

const entriesByPackageName = new Map(entries.map((entry) => [entry.packageName, entry]))
const packageNames = new Set(entriesByPackageName.keys())

function run(command, commandArgs, options = {}) {
  const result = spawnSync(command, commandArgs, {
    cwd: options.cwd || sourceRoot,
    encoding: 'utf8',
    stdio: options.capture ? 'pipe' : 'inherit',
    env: {
      ...process.env,
      npm_config_loglevel: 'error'
    }
  })
  if (result.status !== 0) {
    throw new Error(`Command failed: ${command} ${commandArgs.join(' ')}`)
  }
  return result.stdout || ''
}

function parseNpmPackJson(output, packageName) {
  const jsonStart = output.indexOf('[')
  if (jsonStart === -1) {
    throw new Error(`${packageName} npm pack dry-run did not return JSON output`)
  }
  const parsed = JSON.parse(output.slice(jsonStart))
  if (!Array.isArray(parsed) || parsed.length !== 1) {
    throw new Error(`${packageName} npm pack dry-run returned an unexpected payload`)
  }
  return parsed[0]
}

function readDryRunPack(entry) {
  const output = run('npm', ['pack', '--dry-run', '--json'], {
    cwd: entry.absoluteDir,
    capture: true
  })
  return parseNpmPackJson(output, entry.packageName)
}

function runtimeDependencyNames(packageJson) {
  return Object.keys({
    ...(packageJson.dependencies || {}),
    ...(packageJson.optionalDependencies || {})
  }).sort()
}

function collectInstallClosure(
  packageName,
  state = {
    external: new Set(),
    local: new Set(),
    visiting: new Set()
  }
) {
  if (state.visiting.has(packageName)) {
    return state
  }

  const entry = entriesByPackageName.get(packageName)
  if (!entry) {
    state.external.add(packageName)
    return state
  }

  state.local.add(packageName)
  state.visiting.add(packageName)
  for (const dependencyName of runtimeDependencyNames(entry.packageJson)) {
    collectInstallClosure(dependencyName, state)
  }
  state.visiting.delete(packageName)
  return state
}

function resolveBudget(entry) {
  return packageBudgets[entry.packageName] || kindBudgets[entry.kind] || null
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

function assertBudget(metric, value, max, entry, errors) {
  if (max === undefined) {
    return
  }
  if (value > max) {
    errors.push(`${entry.packageName} ${metric} ${value} exceeds budget ${max}`)
  }
}

const reports = []
const errors = []

for (const entry of entries) {
  const budget = resolveBudget(entry)
  if (!budget) {
    continue
  }

  const pack = readDryRunPack(entry)
  const runtimeDependencies = runtimeDependencyNames(entry.packageJson)
  const closure = collectInstallClosure(entry.packageName)
  const externalClosure = [...closure.external].filter((name) => !packageNames.has(name)).sort()
  const localClosure = [...closure.local].sort()

  const report = {
    packageName: entry.packageName,
    kind: entry.kind,
    packedBytes: pack.size,
    unpackedBytes: pack.unpackedSize,
    fileCount: pack.files.length,
    directRuntimeDependencyCount: runtimeDependencies.length,
    externalDependencyClosureCount: externalClosure.length,
    localPackageClosureCount: localClosure.length
  }
  reports.push(report)

  assertBudget('packedBytes', report.packedBytes, budget.maxPackedBytes, entry, errors)
  assertBudget('unpackedBytes', report.unpackedBytes, budget.maxUnpackedBytes, entry, errors)
  assertBudget('fileCount', report.fileCount, budget.maxFiles, entry, errors)
  assertBudget(
    'directRuntimeDependencyCount',
    report.directRuntimeDependencyCount,
    budget.maxDirectRuntimeDependencies,
    entry,
    errors
  )
  assertBudget(
    'externalDependencyClosureCount',
    report.externalDependencyClosureCount,
    budget.maxExternalDependencyClosure,
    entry,
    errors
  )
  assertBudget(
    'localPackageClosureCount',
    report.localPackageClosureCount,
    budget.maxLocalPackageClosure,
    entry,
    errors
  )
}

if (errors.length) {
  console.error('[install-budget] Failed')
  errors.forEach((error) => console.error(`  - ${error}`))
  console.error('\nCurrent install budget report:')
  reports.forEach((report) => {
    console.error(
      `  - ${report.packageName}: packed ${formatBytes(report.packedBytes)}, unpacked ${formatBytes(report.unpackedBytes)}, files ${report.fileCount}, direct deps ${report.directRuntimeDependencyCount}, external closure ${report.externalDependencyClosureCount}, local closure ${report.localPackageClosureCount}`
    )
  })
  process.exitCode = 1
} else {
  const tracked = reports.filter((report) =>
    [
      '@file-viewer/core',
      '@file-viewer/vue3',
      '@file-viewer/web',
      '@file-viewer/preset-all',
      '@file-viewer/vite-plugin'
    ].includes(report.packageName)
  )
  tracked.forEach((report) => {
    console.log(
      `[install-budget] ${report.packageName}: packed ${formatBytes(report.packedBytes)}, unpacked ${formatBytes(report.unpackedBytes)}, files ${report.fileCount}, direct deps ${report.directRuntimeDependencyCount}, external closure ${report.externalDependencyClosureCount}, local closure ${report.localPackageClosureCount}.`
    )
  })
  console.log(`[install-budget] Passed ${reports.length} package install surface budgets.`)
}
