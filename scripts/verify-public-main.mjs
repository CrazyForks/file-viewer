import { readFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadEcosystemReleaseContext, readJson } from './lib/ecosystem-packages.mjs'
import { validateJsonSchema } from './lib/simple-json-schema.mjs'
import {
  assertDirectory,
  assertFile,
  assertOpenSourceMainRepoLayout
} from './lib/public-main.mjs'
import { entryFormatLabels } from './lib/wrapper-entry-formats.mjs'

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
const readmeTemplate = await readJson(join(sourceRoot, 'ecosystem', 'wrapper-readme-template.json'))
const version = rootPackage.version
const requiredMetadataAssets = [
  {
    name: 'release-manifest.json',
    role: 'release-manifest'
  },
  {
    name: 'release-status.json',
    role: 'release-status'
  },
  {
    name: 'release-status.schema.json',
    role: 'release-status-schema'
  }
]

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
  assert(manifest.version === version, `Open-source main repository manifest version ${manifest.version} !== ${version}`)
  assert(manifest.openSourceMain === true, 'Open-source main repository manifest must declare openSourceMain=true')
  assert(manifest.coreSourceIncluded === true, 'Open-source main repository manifest must declare coreSourceIncluded=true')
  assert(manifest.sourcePolicy === 'public-open-source-main-repository', 'Open-source main repository source policy drifted')
  assert(manifest.repositoryRole === 'open-source-main-repository', 'Open-source main repository role drifted')
  assert(manifest.corePackage?.packageName === wrapperManifest.corePackage.packageName, 'Core package metadata drifted')
  assert(manifest.corePackage?.visibility === wrapperManifest.corePackage.visibility, 'Core package visibility metadata drifted')

  const metadataAssets = new Map((manifest.metadataAssets || []).map(asset => [asset.name, asset]))
  for (const expected of requiredMetadataAssets) {
    const asset = metadataAssets.get(expected.name)
    assert(asset, `Release manifest is missing metadata asset ${expected.name}`)
    assert(asset.role === expected.role, `Release manifest metadata asset ${expected.name} role drifted`)
    assert(asset.required === true, `Release manifest metadata asset ${expected.name} must be required`)
    await assertFile(join(repoDir, 'artifacts', expected.name), `metadata asset ${expected.name}`)
  }

  const artifactRecords = new Map((manifest.ecosystemArtifacts || []).map(record => [record.name, record]))
  const ecosystemPackages = manifest.ecosystemPackages || {}
  for (const entry of ecosystemPackageEntries) {
    assert(ecosystemPackages[entry.packageName] === entry.version, `${entry.packageName} ecosystem package version missing from manifest`)
    const record = artifactRecords.get(entry.packageName)
    assertPackageRecord(record, entry)
    if (entry.wrapper) {
      assert(
        JSON.stringify(record.entryFormats || []) === JSON.stringify(entry.wrapper.entryFormats || []),
        `${entry.packageName} ecosystem artifact entry format mapping drifted`
      )
    }
    if (entry.releaseArtifact?.includeTarball === false) {
      assert(record.artifactIncluded === false, `${entry.packageName} duplicate artifact should not be included`)
      assert(record.artifactDuplicateOf === entry.releaseArtifact.duplicateOf, `${entry.packageName} duplicate artifact target drifted`)
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
      JSON.stringify(record.entryFormats || []) === JSON.stringify(wrapper.entryFormats || []),
      `${wrapper.packageName} wrapper repository entry format mapping drifted`
    )
    assert(
      JSON.stringify(record.historicalPackages || []) === JSON.stringify(wrapper.historicalPackages || []),
      `${wrapper.packageName} historical package mapping drifted`
    )
  }

  for (const requiredTarball of [
    `file-viewer-v2-${version}-demo.tar.gz`,
    `file-viewer-v2-${version}-component-demo.tar.gz`,
    `file-viewer-v2-${version}-lib-dist.tar.gz`,
    `file-viewer-v2-${version}-docs.tar.gz`
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

async function assertReleaseStatus(repoDir) {
  const sourceSchemaPath = join(sourceRoot, 'ecosystem', 'release-status.schema.json')
  const publicSchemaPath = join(repoDir, 'artifacts', 'release-status.schema.json')
  await assertFile(publicSchemaPath, 'artifacts/release-status.schema.json')
  const sourceSchema = await readJson(sourceSchemaPath)
  const publicSchema = await readJson(publicSchemaPath)
  assert(
    JSON.stringify(publicSchema) === JSON.stringify(sourceSchema),
    'Open-source main release status schema drifted from ecosystem/release-status.schema.json'
  )

  const statusPath = join(repoDir, 'artifacts', 'release-status.json')
  await assertFile(statusPath, 'artifacts/release-status.json')
  const status = await readJson(statusPath)
  const schemaFailures = validateJsonSchema(status, publicSchema)
  assert(!schemaFailures.length, `Release status schema validation failed:\n${schemaFailures.join('\n')}`)
  assert(status.schemaVersion === 1, 'Release status schemaVersion drifted')
  assert(status.version === version, `Release status version ${status.version} !== ${version}`)
  assert(status.sourcePolicy === 'private-complete-original-workspace', 'Release status source policy drifted')
  assert(status.openSourcePolicy === 'public-open-source-main-repository', 'Release status open-source policy drifted')
  assert(status.sourceBaseline?.branch === 'main', 'Release status source baseline branch must be private main')
  assert(
    status.sourceBaseline?.policy === 'private-complete-original-workspace',
    'Release status source baseline policy drifted'
  )
  assert(
    typeof status.sourceBaseline?.note === 'string' &&
      status.sourceBaseline.note.includes('complete original aggregate workspace'),
    'Release status must document that private main is the complete original aggregate workspace'
  )
  assert(
    status.sourceBaseline?.authoritativeCommit === status.sourceRemote?.hash,
    'Release status source baseline commit must match source remote hash'
  )
  assert(
    status.sourceBaseline?.localCommit === status.local?.commit,
    'Release status source baseline local commit must match local commit'
  )
  assert(
    typeof status.openSourceMain?.reportHashNote === 'string' && status.openSourceMain.reportHashNote.includes('public commit body'),
    'Release status must document the public mirror commit traceability caveat'
  )
  assert(typeof status.githubRelease?.hasManifest === 'boolean', 'Release status GitHub Release manifest flag missing')
  assert(typeof status.githubRelease?.hasStatus === 'boolean', 'Release status GitHub Release status flag missing')
  assert(typeof status.githubRelease?.hasSchema === 'boolean', 'Release status GitHub Release schema flag missing')
  assert(Array.isArray(status.componentRepositories), 'Release status component repository rows missing')
  assert(Array.isArray(status.npmPackages), 'Release status npm package rows missing')
  assert(Array.isArray(status.gaps), 'Release status gaps list missing')
  assert(Array.isArray(status.gapDetails), 'Release status gap detail rows missing')
  assert(status.gapSummary?.total === status.gaps.length, 'Release status gap summary total drifted')
  assert(status.gapDetails.length === status.gaps.length, 'Release status gap detail count drifted')
  assert(
    status.gapSummary.byChannel && typeof status.gapSummary.byChannel === 'object',
    'Release status gap summary channel map missing'
  )
  for (const detail of status.gapDetails) {
    assert(typeof detail.channel === 'string' && detail.channel, 'Release status gap detail channel missing')
    assert(typeof detail.message === 'string' && status.gaps.includes(detail.message), 'Release status gap detail message drifted')
    assert(typeof detail.externalBlocker === 'boolean', 'Release status gap detail externalBlocker flag missing')
    assert(typeof detail.nextAction === 'string' && detail.nextAction, 'Release status gap detail next action missing')
  }
  assert(
    status.componentRepositories.length === wrapperManifest.wrappers.length + 1,
    `Release status component repository count ${status.componentRepositories.length} !== ${wrapperManifest.wrappers.length + 1}`
  )
  assert(
    status.npmPackages.length === ecosystemPackageEntries.length,
    `Release status npm package count ${status.npmPackages.length} !== ${ecosystemPackageEntries.length}`
  )
  const npmRows = new Map(status.npmPackages.map(row => [row.packageName, row]))
  for (const entry of ecosystemPackageEntries) {
    const row = npmRows.get(entry.packageName)
    assert(row, `Release status missing npm row for ${entry.packageName}`)
    assert(row.expectedVersion === entry.version, `${entry.packageName} release status expected version drifted`)
  }
}

async function assertReadmes(repoDir) {
  const readme = await readText(join(repoDir, 'README.md'))
  const readmeEn = await readText(join(repoDir, 'README.en.md'))
  for (const [locale, content] of [['zh', readme], ['en', readmeEn]]) {
    const template = readmeTemplate.locales[locale]
    const entryLabels = entryFormatLabels(locale)
    assertIncludes(content, wrapperManifest.corePackage.packageName, 'public README')
    assertIncludes(content, readmeTemplate.markers.publicGenerated.start, 'public README')
    assertIncludes(content, readmeTemplate.markers.publicGenerated.end, 'public README')
    assertIncludes(content, template.publicEcosystemHeading, 'public README')
    for (const requiredLink of readmeTemplate.requiredLinks) {
      assertIncludes(content, requiredLink.replace(/\/$/, ''), 'public README')
    }
    for (const requiredTerm of readmeTemplate.requiredTerms) {
      assertIncludes(content, requiredTerm, 'public README')
    }
    for (const header of template.wrapperMatrixHeaders) {
      assertIncludes(content, header, 'public README')
    }
    for (const wrapper of wrapperManifest.wrappers) {
      assertIncludes(content, wrapper.packageName, 'public README')
      assertIncludes(content, wrapper.github, 'public README')
      assertIncludes(content, wrapper.gitee, 'public README')
      for (const format of wrapper.entryFormats || []) {
        assertIncludes(content, entryLabels[format] || format, 'public README')
      }
      for (const historicalPackage of wrapper.historicalPackages || []) {
        assertIncludes(content, historicalPackage, 'public README')
      }
    }
  }
}

await assertDirectory(publicRepoDir, 'open-source main repository')
for (const requiredFile of ['README.md', 'README.en.md', 'BRANCHES.md', 'WRAPPER_ECOSYSTEM.md', 'LICENSE', 'package.json']) {
  await assertFile(join(publicRepoDir, requiredFile), requiredFile)
}
for (const requiredDirectory of ['apps', 'packages', 'docs', 'dist', 'artifacts']) {
  await assertDirectory(join(publicRepoDir, requiredDirectory), requiredDirectory)
}
await assertDirectory(join(publicRepoDir, 'packages', 'core'), 'packages/core')
await assertDirectory(join(publicRepoDir, 'packages', 'renderers'), 'packages/renderers')
await assertFile(join(publicRepoDir, 'pnpm-workspace.yaml'), 'pnpm-workspace.yaml')

const manifest = await assertReleaseManifest(publicRepoDir)
await assertReleaseStatus(publicRepoDir)
await assertOpenSourceMainRepoLayout(publicRepoDir, { allowedRoots: manifest.allowedRoots })
await assertReadmes(publicRepoDir)

console.log(`Verified open-source main repository at ${publicRepoDir} for ${version}.`)
