import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadEcosystemReleaseContext } from './lib/ecosystem-packages.mjs'
import { rendererModularizationLines } from './renderer-dependency-plan.mjs'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const sourceRoot = resolve(scriptDir, '..')
const { entries } = await loadEcosystemReleaseContext(sourceRoot)

const entriesByPackageName = new Map(entries.map(entry => [entry.packageName, entry]))
const rendererEntries = entries.filter(entry => entry.kind === 'renderer')
const wrapperEntries = entries.filter(entry => entry.kind === 'standard-wrapper')
const compatibilityEntries = entries.filter(entry => entry.kind === 'compatibility')
const presetEntries = entries.filter(entry => entry.kind === 'preset')
const coreEntry = entries.find(entry => entry.kind === 'core')

const rendererPackageNames = new Set(rendererEntries.map(entry => entry.packageName))
const wrapperPackageNames = new Set(wrapperEntries.map(entry => entry.packageName))
const compatibilityPackageNames = new Set(compatibilityEntries.map(entry => entry.packageName))
const presetPackageNames = new Set(presetEntries.map(entry => entry.packageName))
const highLevelPackageNames = new Set([
  ...rendererPackageNames,
  ...wrapperPackageNames,
  ...compatibilityPackageNames,
  ...presetPackageNames
])
const pluginEnginePackageNames = new Set([
  '@file-viewer/pptx',
  '@file-viewer/eda-layout',
  '@file-viewer/eda-orcad'
])
const pluginRendererPackageNames = new Set(
  rendererEntries
    .map(entry => entry.packageName)
    .filter(packageName => !pluginEnginePackageNames.has(packageName))
)
const rendererPackageNamesByRendererId = new Map(
  rendererEntries.map(entry => [entry.renderer?.id, entry.packageName])
)
const presetRendererAllowList = {
  lite: ['text', 'image', 'media'],
  office: ['pdf', 'word', 'spreadsheet', 'presentation', 'ofd'],
  engineering: ['cad', 'model', 'drawing', 'mindmap', 'geo', 'typst', 'archive', 'data', 'eda']
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

function dependencyNames(packageJson) {
  return {
    dependencies: Object.keys(packageJson.dependencies || {}),
    optionalDependencies: Object.keys(packageJson.optionalDependencies || {}),
    peerDependencies: Object.keys(packageJson.peerDependencies || {})
  }
}

function assertNoPackages(entry, packageNames, message) {
  for (const [field, names] of Object.entries(dependencyNames(entry.packageJson))) {
    const blocked = names.filter(name => packageNames.has(name))
    assert(
      blocked.length === 0,
      `${entry.packageName} ${field} must not include ${message}: ${blocked.join(', ')}`
    )
  }
}

function assertOnlyAllowedWorkspaceDeps(entry, allowedPackageNames, reason) {
  for (const [field, names] of Object.entries(dependencyNames(entry.packageJson))) {
    const blocked = names.filter(name => highLevelPackageNames.has(name) && !allowedPackageNames.has(name))
    assert(
      blocked.length === 0,
      `${entry.packageName} ${field} has invalid File Viewer dependency for ${reason}: ${blocked.join(', ')}`
    )
  }
}

assert(coreEntry, 'Missing @file-viewer/core ecosystem entry')

assertNoPackages(
  coreEntry,
  highLevelPackageNames,
  'renderer, preset, wrapper, or compatibility packages'
)

for (const wrapperEntry of wrapperEntries) {
  assertOnlyAllowedWorkspaceDeps(
    wrapperEntry,
    new Set(['@file-viewer/core']),
    'standard component packages'
  )
}

for (const compatibilityEntry of compatibilityEntries) {
  const targetPackage = compatibilityEntry.compatibilityPackage?.targetPackage
  assert(targetPackage, `${compatibilityEntry.packageName} must declare a compatibility targetPackage`)
  assert(
    entriesByPackageName.has(targetPackage),
    `${compatibilityEntry.packageName} target package ${targetPackage} is not part of the ecosystem manifest`
  )
  assertOnlyAllowedWorkspaceDeps(
    compatibilityEntry,
    new Set([targetPackage]),
    'compatibility alias packages'
  )
  assert(
    compatibilityEntry.packageJson.dependencies?.[targetPackage],
    `${compatibilityEntry.packageName} must depend on its target package ${targetPackage}`
  )
}

for (const presetEntry of presetEntries) {
  const dependencies = new Set(Object.keys(presetEntry.packageJson.dependencies || {}))
  if (presetEntry.packageName === '@file-viewer/preset-all') {
    assert(
      dependencies.has('@file-viewer/core'),
      '@file-viewer/preset-all must depend on @file-viewer/core'
    )
    for (const rendererPackageName of pluginRendererPackageNames) {
      assert(
        dependencies.has(rendererPackageName),
        `@file-viewer/preset-all must aggregate ${rendererPackageName}`
      )
    }
    assertNoPackages(
      presetEntry,
      new Set([...wrapperPackageNames, ...compatibilityPackageNames]),
      'wrapper or compatibility packages'
    )
  } else if (presetRendererAllowList[presetEntry.preset.id]) {
    const allowedRendererPackages = new Set(
      presetRendererAllowList[presetEntry.preset.id].map(rendererId => {
        const packageName = rendererPackageNamesByRendererId.get(rendererId)
        assert(
          packageName,
          `${presetEntry.packageName} allow-list renderer ${rendererId} is not in ecosystem/wrappers.json`
        )
        return packageName
      })
    )
    assert(
      dependencies.has('@file-viewer/core'),
      `${presetEntry.packageName} must depend on @file-viewer/core`
    )
    for (const rendererPackageName of allowedRendererPackages) {
      assert(
        dependencies.has(rendererPackageName),
        `${presetEntry.packageName} must aggregate ${rendererPackageName}`
      )
    }
    assertOnlyAllowedWorkspaceDeps(
      presetEntry,
      new Set(['@file-viewer/core', ...allowedRendererPackages]),
      `${presetEntry.preset.id} preset packages`
    )
    assertNoPackages(
      presetEntry,
      new Set([...wrapperPackageNames, ...compatibilityPackageNames]),
      'wrapper or compatibility packages'
    )
  } else {
    assertOnlyAllowedWorkspaceDeps(
      presetEntry,
      new Set(['@file-viewer/core']),
      'automation/plugin packages'
    )
  }
}

for (const rendererEntry of rendererEntries) {
  const allowedPackages = new Set(['@file-viewer/core'])
  for (const line of rendererModularizationLines) {
    if (line.targetPackage !== rendererEntry.packageName) {
      continue
    }
    for (const dependency of line.dependencies) {
      if (pluginEnginePackageNames.has(dependency)) {
        allowedPackages.add(dependency)
      }
    }
  }
  assertOnlyAllowedWorkspaceDeps(rendererEntry, allowedPackages, 'renderer packages')
}

const coreDependencies = new Set(Object.keys(coreEntry.packageJson.dependencies || {}))
const linesByDependency = new Map()
for (const line of rendererModularizationLines) {
  for (const dependency of line.dependencies) {
    const lines = linesByDependency.get(dependency) || []
    lines.push(line)
    linesByDependency.set(dependency, lines)
  }
}

for (const line of rendererModularizationLines) {
  if (line.status === 'retained') {
    for (const dependency of line.dependencies) {
      assert(
        coreDependencies.has(dependency),
        `${dependency} is marked retained in core but is not declared by @file-viewer/core`
      )
    }
    continue
  }

  if (line.status !== 'planned') {
    assert(
      entriesByPackageName.has(line.targetPackage),
      `${line.id} target package ${line.targetPackage} is missing from ecosystem/wrappers.json`
    )
  }

  if (line.status === 'extracted') {
    const leakedDependencies = line.dependencies.filter(dependency => {
      if (!coreDependencies.has(dependency)) {
        return false
      }
      const owners = linesByDependency.get(dependency) || []
      return owners.every(owner => owner.status === 'extracted')
    })
    assert(
      leakedDependencies.length === 0,
      `${line.id} is extracted but @file-viewer/core still depends on ${leakedDependencies.join(', ')}`
    )
  }
}

const linesByTargetPackage = new Map()
for (const line of rendererModularizationLines) {
  if (line.targetPackage === '@file-viewer/core') {
    continue
  }
  const lines = linesByTargetPackage.get(line.targetPackage) || []
  lines.push(line)
  linesByTargetPackage.set(line.targetPackage, lines)
}

for (const rendererEntry of rendererEntries) {
  if (pluginEnginePackageNames.has(rendererEntry.packageName)) {
    continue
  }
  assert(
    linesByTargetPackage.has(rendererEntry.packageName),
    `${rendererEntry.packageName} is a renderer package but has no renderer-dependency-plan entry`
  )
}

console.log(
  `[on-demand-boundaries] Verified ${wrapperEntries.length} wrappers, ${compatibilityEntries.length} compatibility aliases, ${presetEntries.length} presets, ${rendererEntries.length} renderer packages, and ${rendererModularizationLines.length} renderer dependency lines.`
)
