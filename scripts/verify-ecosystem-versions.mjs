import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadEcosystemReleaseContext } from './lib/ecosystem-packages.mjs'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const sourceRoot = resolve(scriptDir, '..')
const { rootPackage, wrapperManifest, entries } = await loadEcosystemReleaseContext(sourceRoot)

const rootVersion = rootPackage.version
const expectedWorkspaceRange = `workspace:^${rootVersion}`
const corePackageName = wrapperManifest.corePackage.packageName
const entryByName = new Map()
const entryById = new Map()
const entryByDir = new Map()
const historicalPackageNames = new Set()
const standardPackageByHistoricalName = new Map()
const compatibilityPackageByName = new Map()
const standardWrapperPackageNames = new Set(wrapperManifest.wrappers.map(wrapper => wrapper.packageName))
const wrapperByPackageName = new Map(wrapperManifest.wrappers.map(wrapper => [wrapper.packageName, wrapper]))

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

function installDependencies(packageJson) {
  return {
    ...packageJson.dependencies,
    ...packageJson.optionalDependencies
  }
}

function allDependencyFields(packageJson) {
  return {
    dependencies: packageJson.dependencies || {},
    optionalDependencies: packageJson.optionalDependencies || {},
    peerDependencies: packageJson.peerDependencies || {},
    devDependencies: packageJson.devDependencies || {}
  }
}

function assertUnique(map, key, label, packageName) {
  assert(!map.has(key), `Duplicate ${label} ${key} in ecosystem release packages`)
  map.set(key, packageName)
}

function normalizeRepositoryUrl(value) {
  return String(value || '')
    .replace(/^git\+/, '')
    .replace(/\.git$/, '')
}

function assertPackageFiles(entry, requiredFiles) {
  const files = new Set(entry.packageJson.files || [])
  for (const requiredFile of requiredFiles) {
    assert(
      files.has(requiredFile),
      `${entry.packageName} package.json files must include ${requiredFile}`
    )
  }
}

function assertRepositoryMetadata(entry, expectedUrl, expectedDirectory) {
  assert(entry.packageJson.repository?.type === 'git', `${entry.packageName} repository.type must be git`)
  assert(
    normalizeRepositoryUrl(entry.packageJson.repository?.url) === normalizeRepositoryUrl(expectedUrl),
    `${entry.packageName} repository.url must point to ${expectedUrl}`
  )
  assert(
    entry.packageJson.repository?.directory === expectedDirectory,
    `${entry.packageName} repository.directory must be ${expectedDirectory}`
  )
}

for (const wrapper of wrapperManifest.wrappers) {
  for (const packageName of wrapper.historicalPackages) {
    assert(!historicalPackageNames.has(packageName), `Duplicate historical package ${packageName}`)
    historicalPackageNames.add(packageName)
    standardPackageByHistoricalName.set(packageName, wrapper.packageName)
  }
}

for (const renderer of wrapperManifest.renderers || []) {
  const entry = entries.find(candidate => candidate.id === `renderer-${renderer.id}`)
  assert(entry, `Missing renderer release entry for ${renderer.id}`)
  assert(entry.kind === 'renderer', `${renderer.packageName} must be a renderer release entry`)
  assert(entry.packageName === renderer.packageName, `${renderer.id} package name drifted from wrappers.json`)
  assert(entry.packageDir === renderer.packageDir, `${renderer.id} packageDir drifted from wrappers.json`)
  assertRepositoryMetadata(entry, renderer.github, renderer.packageDir)
  assert(
    entry.packageJson.bugs?.url === `${renderer.github}/issues`,
    `${entry.packageName} bugs.url must be ${renderer.github}/issues`
  )
}

for (const preset of wrapperManifest.presets || []) {
  const entry = entries.find(candidate => candidate.id === `preset-${preset.id}`)
  assert(entry, `Missing preset release entry for ${preset.id}`)
  assert(entry.kind === 'preset', `${preset.packageName} must be a preset release entry`)
  assert(entry.packageName === preset.packageName, `${preset.id} package name drifted from wrappers.json`)
  assert(entry.packageDir === preset.packageDir, `${preset.id} packageDir drifted from wrappers.json`)
  assertRepositoryMetadata(entry, preset.github, preset.packageDir)
  assert(
    entry.packageJson.bugs?.url === `${preset.github}/issues`,
    `${entry.packageName} bugs.url must be ${preset.github}/issues`
  )
}

for (const compatibilityPackage of wrapperManifest.compatibilityPackages || []) {
  assert(
    compatibilityPackage.id,
    `Compatibility package ${compatibilityPackage.packageName || '(unnamed)'} must declare id`
  )
  assert(
    compatibilityPackage.packageName,
    `Compatibility package ${compatibilityPackage.id} must declare packageName`
  )
  assert(
    compatibilityPackage.targetPackage,
    `Compatibility package ${compatibilityPackage.packageName} must declare targetPackage`
  )
  assert(
    compatibilityPackage.packageDir,
    `Compatibility package ${compatibilityPackage.packageName} must declare packageDir`
  )
  assert(
    historicalPackageNames.has(compatibilityPackage.packageName),
    `${compatibilityPackage.packageName} compatibility package is not declared in wrappers.json historicalPackages`
  )
  assert(
    standardPackageByHistoricalName.get(compatibilityPackage.packageName) === compatibilityPackage.targetPackage,
    `${compatibilityPackage.packageName} targetPackage must match its wrapper historical package owner`
  )
  assert(
    !compatibilityPackageByName.has(compatibilityPackage.packageName),
    `Duplicate compatibility package manifest entry ${compatibilityPackage.packageName}`
  )
  compatibilityPackageByName.set(compatibilityPackage.packageName, compatibilityPackage)
}

for (const historicalPackageName of historicalPackageNames) {
  assert(
    compatibilityPackageByName.has(historicalPackageName),
    `${historicalPackageName} is declared as historical package but has no compatibilityPackages entry`
  )
}

for (const entry of entries) {
  assertUnique(entryByName, entry.packageName, 'package name', entry.packageName)
  assertUnique(entryById, entry.id, 'package id', entry.packageName)
  assertUnique(entryByDir, entry.packageDir, 'package directory', entry.packageName)

  assert(
    entry.version === rootVersion,
    `${entry.packageName} version ${entry.version} must match root version ${rootVersion}`
  )
  assert(entry.packageJson.private !== true, `${entry.packageName} must not be private`)
  assert(
    entry.packageJson.publishConfig?.access === 'public',
    `${entry.packageName} publishConfig.access must be public`
  )
  assertPackageFiles(entry, ['README.md', 'README.en.md'])
}

const releasePackageNames = new Set(entryByName.keys())
const coreEntry = entries.find(entry => entry.packageName === corePackageName)
assert(coreEntry, `Missing core package ${corePackageName} in ecosystem release list`)
assert(coreEntry.kind === 'core', `${corePackageName} must be marked as the core release package`)
assert(coreEntry.version === rootVersion, `${corePackageName} version must match ${rootVersion}`)
assertRepositoryMetadata(coreEntry, wrapperManifest.corePackage.sourceRepository, coreEntry.packageDir)

for (const wrapper of wrapperManifest.wrappers) {
  const entry = entries.find(candidate => candidate.id === wrapper.id)
  assert(entry, `Missing standard wrapper release entry for ${wrapper.id}`)
  assert(entry.kind === 'standard-wrapper', `${wrapper.packageName} must be a standard-wrapper release entry`)
  assert(entry.packageName === wrapper.packageName, `${wrapper.id} package name drifted from wrappers.json`)
  assert(entry.packageDir === wrapper.packageDir, `${wrapper.id} packageDir drifted from wrappers.json`)
  assertRepositoryMetadata(entry, wrapper.github, wrapper.packageDir)
  assert(
    entry.packageJson.bugs?.url === `${wrapper.github}/issues`,
    `${entry.packageName} bugs.url must be ${wrapper.github}/issues`
  )
}

for (const entry of entries) {
  for (const [field, dependencies] of Object.entries(allDependencyFields(entry.packageJson))) {
    for (const [packageName, range] of Object.entries(dependencies)) {
      if (releasePackageNames.has(packageName)) {
        assert(
          range === expectedWorkspaceRange,
          `${entry.packageName} ${field}.${packageName} must be ${expectedWorkspaceRange}, got ${range}`
        )
      }
    }
  }

  if (entry.kind === 'standard-wrapper') {
    const wrapper = wrapperByPackageName.get(entry.packageName)
    const allowedWrapperDependencies = new Set(
      wrapper?.flavor === 'full' && wrapper.basePackage ? [wrapper.basePackage] : []
    )
    const dependencies = installDependencies(entry.packageJson)
    for (const packageName of Object.keys(dependencies)) {
      assert(
        !historicalPackageNames.has(packageName),
        `${entry.packageName} must not depend on historical compatibility package ${packageName}`
      )
      assert(
        !standardWrapperPackageNames.has(packageName)
          || packageName === entry.packageName
          || allowedWrapperDependencies.has(packageName),
        `${entry.packageName} must not depend on another standard wrapper package ${packageName}`
      )
    }
    if (wrapper?.flavor === 'full') {
      assert(
        dependencies['@file-viewer/preset-all'] === expectedWorkspaceRange,
        `${entry.packageName} full package must depend on @file-viewer/preset-all@${expectedWorkspaceRange}`
      )
      assert(
        wrapper.basePackage && dependencies[wrapper.basePackage] === expectedWorkspaceRange,
        `${entry.packageName} full package must depend on ${wrapper.basePackage}@${expectedWorkspaceRange}`
      )
    } else {
      assert(
        dependencies[corePackageName] === expectedWorkspaceRange,
        `${entry.packageName} must depend on ${corePackageName}@${expectedWorkspaceRange}`
      )
    }
  }

  if (entry.kind === 'compatibility') {
    const compatibilityPackage = compatibilityPackageByName.get(entry.packageName)
    assert(
      compatibilityPackage,
      `${entry.packageName} compatibility package is not declared in ecosystem/wrappers.json compatibilityPackages`
    )
    assert(
      entry.id === compatibilityPackage.id,
      `${entry.packageName} release entry id ${entry.id} must match compatibilityPackages id ${compatibilityPackage.id}`
    )
    assert(
      entry.packageDir === compatibilityPackage.packageDir,
      `${entry.packageName} packageDir must match compatibilityPackages.packageDir`
    )
    const standardPackageName = standardPackageByHistoricalName.get(entry.packageName)
    assert(
      standardPackageName === compatibilityPackage.targetPackage,
      `${entry.packageName} target package must be ${standardPackageName}`
    )
    const dependencies = installDependencies(entry.packageJson)
    if (standardPackageName === '@file-viewer/react') {
      assert(
        !dependencies[corePackageName] && !dependencies['@file-viewer/web'],
        `${entry.packageName} must remain a thin React alias instead of depending on core/web directly`
      )
      assert(
        dependencies['@file-viewer/react'] === expectedWorkspaceRange,
        `${entry.packageName} must depend on @file-viewer/react@${expectedWorkspaceRange}`
      )
    }
    if (standardPackageName === '@file-viewer/web') {
      assert(
        dependencies['@file-viewer/web'] === expectedWorkspaceRange,
        `${entry.packageName} must depend on @file-viewer/web@${expectedWorkspaceRange}`
      )
    }
    if (standardPackageName === '@file-viewer/vue2.7') {
      assert(
        dependencies['@file-viewer/vue2.7'] === expectedWorkspaceRange,
        `${entry.packageName} must depend on @file-viewer/vue2.7@${expectedWorkspaceRange}`
      )
    }
    if (standardPackageName === '@file-viewer/vue3') {
      assert(
        dependencies['@file-viewer/vue3'] === expectedWorkspaceRange,
        `${entry.packageName} must depend on @file-viewer/vue3@${expectedWorkspaceRange}`
      )
    }
    if (entry.packageName === 'file-viewer3') {
      assert(
        !dependencies['@flyfish-group/file-viewer3'],
        `${entry.packageName} must alias @file-viewer/vue3 directly instead of chaining through @flyfish-group/file-viewer3`
      )
    }
  }
}

console.log(
  `Verified ${entries.length} ecosystem package versions and workspace dependency ranges at ${rootVersion}.`
)
