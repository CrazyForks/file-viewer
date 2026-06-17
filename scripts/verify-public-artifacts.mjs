import { readFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadEcosystemReleaseContext, readJson } from './lib/ecosystem-packages.mjs'
import {
  assertDirectory,
  assertFile,
  assertPublicArtifactOnlyRepo
} from './lib/public-artifacts.mjs'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const sourceRoot = resolve(scriptDir, '..')
const args = process.argv.slice(2)

function readArg(name, fallback) {
  const index = args.indexOf(name)
  if (index >= 0) {
    return args[index + 1]
  }
  return fallback
}

const publicRepoDir = resolve(
  sourceRoot,
  readArg('--public-repo-dir', process.env.FILE_VIEWER_PUBLIC_REPO_DIR || '../file-viewer-public')
)
const { rootPackage, wrapperManifest, entries: ecosystemPackageEntries } =
  await loadEcosystemReleaseContext(sourceRoot)
const version = rootPackage.version

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

async function readText(path) {
  return readFile(path, 'utf8')
}

function assertIncludes(content, needle, label) {
  assert(content.includes(needle), `${label} is missing ${needle}`)
}

function assertPackageRecord(record, entry) {
  assert(record, `Release manifest is missing ${entry.packageName}`)
  assert(record.version === entry.version, `${entry.packageName} manifest version ${record.version} !== ${entry.version}`)
  assert(record.kind === entry.kind, `${entry.packageName} manifest kind ${record.kind} !== ${entry.kind}`)
  assert(record.packageDir === entry.packageDir, `${entry.packageName} manifest packageDir drifted`)
}

async function assertReleaseManifest(repoDir) {
  const manifestPath = join(repoDir, 'artifacts', 'release-manifest.json')
  await assertFile(manifestPath, 'artifacts/release-manifest.json')
  const manifest = await readJson(manifestPath)
  assert(manifest.version === version, `Public artifact manifest version ${manifest.version} !== ${version}`)
  assert(manifest.artifactOnly === true, 'Public artifact manifest must declare artifactOnly=true')
  assert(manifest.corePackage?.packageName === wrapperManifest.corePackage.packageName, 'Core package metadata drifted')
  assert(manifest.corePackage?.visibility === wrapperManifest.corePackage.visibility, 'Core package visibility metadata drifted')

  const artifactRecords = new Map((manifest.adapterArtifacts || []).map(record => [record.name, record]))
  const adapterPackages = manifest.adapterPackages || {}
  for (const entry of ecosystemPackageEntries) {
    assert(adapterPackages[entry.packageName] === entry.version, `${entry.packageName} adapter package version missing from manifest`)
    const record = artifactRecords.get(entry.packageName)
    assertPackageRecord(record, entry)
    if (entry.publicArtifact?.includeTarball === false) {
      assert(record.artifactIncluded === false, `${entry.packageName} duplicate artifact should not be included`)
      assert(record.artifactDuplicateOf === entry.publicArtifact.duplicateOf, `${entry.packageName} duplicate artifact target drifted`)
      continue
    }
    assert(record.artifactIncluded === true, `${entry.packageName} artifact should be included`)
    assert(record.tarball === entry.tarballName, `${entry.packageName} tarball name drifted`)
    await assertFile(join(repoDir, 'artifacts', entry.tarballName), `${entry.packageName} tarball`)
  }

  const wrapperRecords = new Map((manifest.wrapperRepositories || []).map(record => [record.packageName, record]))
  for (const wrapper of wrapperManifest.wrappers) {
    const record = wrapperRecords.get(wrapper.packageName)
    assert(record, `Wrapper repository manifest is missing ${wrapper.packageName}`)
    for (const [key, expected] of Object.entries({
      framework: wrapper.framework,
      repository: wrapper.repository,
      github: wrapper.github,
      gitee: wrapper.gitee
    })) {
      assert(record[key] === expected, `${wrapper.packageName} wrapper repository ${key} drifted`)
    }
    assert(
      JSON.stringify(record.historicalPackages || []) === JSON.stringify(wrapper.historicalPackages || []),
      `${wrapper.packageName} historical package mapping drifted`
    )
  }

  for (const requiredTarball of [
    `file-viewer-v3-${version}-demo.tar.gz`,
    `file-viewer-v3-${version}-adapter-demo.tar.gz`,
    `file-viewer-v3-${version}-lib-dist.tar.gz`,
    `file-viewer-v3-${version}-docs.tar.gz`
  ]) {
    await assertFile(join(repoDir, 'artifacts', requiredTarball), requiredTarball)
  }

  if (manifest.vue2Package) {
    assert(manifest.vue2Package.name === '@flyfish-group/file-viewer', 'Vue2 compatibility package name drifted')
    assert(manifest.vue2Package.version === version, `Vue2 compatibility package version ${manifest.vue2Package.version} !== ${version}`)
    assert(manifest.vue2Package.tarball, 'Vue2 compatibility package tarball is missing from manifest')
    await assertFile(join(repoDir, 'artifacts', manifest.vue2Package.tarball), 'Vue2 compatibility package tarball')
  }

  return manifest
}

async function assertReadmes(repoDir) {
  const readme = await readText(join(repoDir, 'README.md'))
  const readmeEn = await readText(join(repoDir, 'README.en.md'))
  for (const content of [readme, readmeEn]) {
    assertIncludes(content, wrapperManifest.corePackage.packageName, 'public README')
    assertIncludes(content, 'https://doc.flyfish.dev', 'public README')
    assertIncludes(content, 'https://viewer.flyfish.dev', 'public README')
    for (const wrapper of wrapperManifest.wrappers) {
      assertIncludes(content, wrapper.packageName, 'public README')
      assertIncludes(content, wrapper.github, 'public README')
      assertIncludes(content, wrapper.gitee, 'public README')
    }
  }
}

await assertDirectory(publicRepoDir, 'public artifact repository')
for (const requiredFile of ['README.md', 'README.en.md', 'LICENSE', 'package.json']) {
  await assertFile(join(publicRepoDir, requiredFile), requiredFile)
}
for (const requiredDirectory of ['dist', 'artifacts']) {
  await assertDirectory(join(publicRepoDir, requiredDirectory), requiredDirectory)
}

const manifest = await assertReleaseManifest(publicRepoDir)
await assertPublicArtifactOnlyRepo(publicRepoDir, { allowedRoots: manifest.allowedRoots })
await assertReadmes(publicRepoDir)

console.log(`Verified public artifact repository at ${publicRepoDir} for ${version}.`)
