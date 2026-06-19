import { readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'

export async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'))
}

export function npmPackFilename(packageName, packageVersion) {
  return `${packageName.replace(/^@/, '').replace(/\//g, '-')}-${packageVersion}.tgz`
}

export function ecosystemPackageSpecs(wrapperManifest) {
  return [
    {
      id: 'core',
      kind: 'core',
      packageDir: 'packages/core',
      publicSource: true,
      corePackage: wrapperManifest.corePackage
    },
    ...(wrapperManifest.compatibilityPackages || []).map(compatibilityPackage => ({
      id: compatibilityPackage.id,
      kind: 'compatibility',
      packageDir: compatibilityPackage.packageDir,
      compatibilityPackage,
      publicSource: compatibilityPackage.publicSource === true,
      publicArtifact: compatibilityPackage.publicArtifact ?? {
        includeTarball: true
      }
    })),
    ...wrapperManifest.wrappers.map(wrapper => ({
      id: wrapper.id,
      kind: 'standard-wrapper',
      packageDir: wrapper.packageDir,
      wrapper,
      publicSource: true
    }))
  ]
}

export async function loadEcosystemPackageEntry(sourceRoot, spec) {
  const absoluteDir = resolve(sourceRoot, spec.packageDir)
  const packageJson = await readJson(join(absoluteDir, 'package.json'))
  return {
    ...spec,
    absoluteDir,
    packageJson,
    packageName: packageJson.name,
    version: packageJson.version,
    tarballName: npmPackFilename(packageJson.name, packageJson.version),
    publicArtifact: spec.publicArtifact ?? {
      includeTarball: true
    }
  }
}

export async function loadEcosystemReleaseContext(sourceRoot) {
  const rootPackage = await readJson(join(sourceRoot, 'package.json'))
  const wrapperManifest = await readJson(join(sourceRoot, 'ecosystem', 'wrappers.json'))
  const specs = ecosystemPackageSpecs(wrapperManifest)
  const entries = await Promise.all(specs.map(spec => loadEcosystemPackageEntry(sourceRoot, spec)))
  return {
    rootPackage,
    wrapperManifest,
    specs,
    entries
  }
}

export function collectExportEntrypoints(value, paths = new Set()) {
  if (!value) {
    return paths
  }
  if (typeof value === 'string') {
    paths.add(value)
    return paths
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      collectExportEntrypoints(item, paths)
    }
    return paths
  }
  if (typeof value === 'object') {
    for (const item of Object.values(value)) {
      collectExportEntrypoints(item, paths)
    }
  }
  return paths
}

export function collectPackageEntrypoints(packageJson) {
  const entrypoints = new Set()
  for (const field of ['main', 'module', 'browser', 'types', 'svelte']) {
    if (typeof packageJson[field] === 'string') {
      entrypoints.add(packageJson[field])
    }
  }
  for (const item of collectExportEntrypoints(packageJson.exports)) {
    entrypoints.add(item)
  }
  for (const item of Object.values(packageJson.bin || {})) {
    if (typeof item === 'string') {
      entrypoints.add(item)
    }
  }
  return [...entrypoints].filter(entrypoint =>
    !entrypoint.startsWith('/') &&
    !entrypoint.includes(':') &&
    !entrypoint.includes('*') &&
    !entrypoint.startsWith('#') &&
    entrypoint !== './' &&
    entrypoint !== '.'
  )
}

export function ecosystemPackageManifestEntry(entry) {
  return {
    id: entry.id,
    kind: entry.kind,
    packageName: entry.packageName,
    version: entry.version,
    packageDir: entry.packageDir,
    tarball: entry.tarballName,
    publicSource: entry.publicSource,
    publicArtifact: entry.publicArtifact,
    targetPackage: entry.compatibilityPackage?.targetPackage ?? null,
    github: entry.wrapper?.github ?? null,
    gitee: entry.wrapper?.gitee ?? null,
    sourceRepository: entry.corePackage?.sourceRepository ?? null
  }
}
