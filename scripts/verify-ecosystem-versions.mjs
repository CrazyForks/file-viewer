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

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

function runtimeDependencies(packageJson) {
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
    const dependencies = runtimeDependencies(entry.packageJson)
    for (const packageName of Object.keys(dependencies)) {
      assert(
        !historicalPackageNames.has(packageName),
        `${entry.packageName} must not depend on historical compatibility package ${packageName}`
      )
    }

    if (entry.packageName === '@file-viewer/web') {
      assert(
        dependencies[corePackageName] === expectedWorkspaceRange,
        `${entry.packageName} must depend on ${corePackageName}@${expectedWorkspaceRange}`
      )
    } else {
      assert(
        dependencies['@file-viewer/web'] === expectedWorkspaceRange,
        `${entry.packageName} must depend on @file-viewer/web@${expectedWorkspaceRange}`
      )
    }
  }

  if (entry.kind === 'compatibility') {
    assert(
      historicalPackageNames.has(entry.packageName),
      `${entry.packageName} compatibility package is not declared in ecosystem/wrappers.json historicalPackages`
    )
    const standardPackageName = standardPackageByHistoricalName.get(entry.packageName)
    const dependencies = runtimeDependencies(entry.packageJson)
    if (standardPackageName === '@file-viewer/react') {
      assert(
        !dependencies[corePackageName],
        `${entry.packageName} must consume the web compatibility facade instead of depending on ${corePackageName}`
      )
      assert(
        dependencies['@flyfish-group/file-viewer-web'] === expectedWorkspaceRange,
        `${entry.packageName} must depend on @flyfish-group/file-viewer-web@${expectedWorkspaceRange}`
      )
    }
  }
}

console.log(
  `Verified ${entries.length} ecosystem package versions and workspace dependency ranges at ${rootVersion}.`
)
