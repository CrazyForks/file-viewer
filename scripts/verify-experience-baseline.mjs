import { existsSync } from 'node:fs'
import { readFile, stat } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { loadEcosystemReleaseContext } from './lib/ecosystem-packages.mjs'

const sourceRoot = process.cwd()
const baselinePath = join(sourceRoot, 'ecosystem', 'experience-baseline.json')
const smokeMatrixPath = join(sourceRoot, 'ecosystem', 'smoke-matrix.json')

function fail(message) {
  throw new Error(`[experience-baseline] ${message}`)
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'))
}

async function assertFile(path, label) {
  if (!existsSync(path)) {
    fail(`Missing ${label}: ${path}`)
  }
  const fileStat = await stat(path)
  if (!fileStat.isFile()) {
    fail(`${label} is not a file: ${path}`)
  }
}

function assertUnique(items, label, selectId = item => item.id) {
  const seen = new Set()
  for (const item of items || []) {
    const id = selectId(item)
    if (!id) {
      fail(`${label} contains an item without id`)
    }
    if (seen.has(id)) {
      fail(`${label} contains duplicate id ${id}`)
    }
    seen.add(id)
  }
  return seen
}

function assertPackageScript(packageJson, scriptName, label) {
  if (!packageJson.scripts?.[scriptName]) {
    fail(`${label} references missing package script ${scriptName}`)
  }
}

function packageEntryByName(entries, rootPackage, packageName) {
  if (rootPackage.name === packageName) {
    return {
      packageName,
      packageDir: '.',
      packageJson: rootPackage,
      absoluteDir: sourceRoot
    }
  }
  return entries.find(entry => entry.packageName === packageName)
}

const [baseline, smokeMatrix, releaseContext] = await Promise.all([
  readJson(baselinePath),
  readJson(smokeMatrixPath),
  loadEcosystemReleaseContext(sourceRoot)
])

const { rootPackage, wrapperManifest, entries } = releaseContext

if (baseline.schemaVersion !== 1) {
  fail(`Unsupported schemaVersion ${baseline.schemaVersion}`)
}
if (baseline.baseline?.sourceBranch !== wrapperManifest.sourceBranch) {
  fail(`Baseline sourceBranch must match wrappers.json sourceBranch ${wrapperManifest.sourceBranch}`)
}
if (baseline.baseline?.rootPackage !== rootPackage.name) {
  fail(`Baseline rootPackage must match package.json name ${rootPackage.name}`)
}

for (const scriptName of baseline.requiredScripts || []) {
  assertPackageScript(rootPackage, scriptName, 'requiredScripts')
}

const featureIds = assertUnique(baseline.featureGroups, 'featureGroups')
for (const requiredFeature of [
  'source-loading',
  'options',
  'toolbar-operations',
  'lifecycle-events',
  'document-navigation',
  'layout-visual',
  'print-export',
  'wrapper-contract'
]) {
  if (!featureIds.has(requiredFeature)) {
    fail(`Missing required feature group ${requiredFeature}`)
  }
}

const evidence = new Set()
for (const featureGroup of baseline.featureGroups || []) {
  if (!Array.isArray(featureGroup.evidence) || !featureGroup.evidence.length) {
    fail(`Feature group ${featureGroup.id} must declare evidence`)
  }
  for (const item of featureGroup.evidence) {
    evidence.add(item)
  }
}
for (const requiredEvidence of baseline.requiredEvidence || []) {
  if (!evidence.has(requiredEvidence) && !baseline.cases?.some(item => item.assertions?.includes(requiredEvidence))) {
    fail(`Required evidence ${requiredEvidence} is not covered by feature groups or cases`)
  }
}

const wrapperById = new Map(wrapperManifest.wrappers.map(wrapper => [wrapper.id, wrapper]))
const surfaceIds = assertUnique(baseline.surfaces, 'surfaces')
for (const requiredSurface of [
  'vue3-current-component',
  'compare-page',
  'iframe-runtime',
  'react-current-adapter',
  'pure-js-current-adapter',
  'script-tag-iife'
]) {
  if (!surfaceIds.has(requiredSurface)) {
    fail(`Missing required baseline surface ${requiredSurface}`)
  }
}

for (const surface of baseline.surfaces || []) {
  const entry = packageEntryByName(entries, rootPackage, surface.packageName)
  if (!entry) {
    fail(`Surface ${surface.id} references unknown package ${surface.packageName}`)
  }
  if (surface.wrapperId) {
    const wrapper = wrapperById.get(surface.wrapperId)
    if (!wrapper) {
      fail(`Surface ${surface.id} references unknown wrapper ${surface.wrapperId}`)
    }
    if (
      surface.packageName !== wrapper.packageName &&
      !wrapper.historicalPackages.includes(surface.packageName)
    ) {
      fail(`Surface ${surface.id} package ${surface.packageName} is not ${wrapper.packageName} or one of its historical aliases`)
    }
  }
  for (const feature of surface.preserves || []) {
    if (!featureIds.has(feature)) {
      fail(`Surface ${surface.id} preserves unknown feature group ${feature}`)
    }
  }
  for (const scriptName of surface.smokeScripts || []) {
    assertPackageScript(rootPackage, scriptName, `Surface ${surface.id}`)
  }
  for (const entryFile of surface.entryFiles || []) {
    await assertFile(resolve(sourceRoot, entryFile), `surface ${surface.id} entry file`)
  }
}

const smokeCaseIds = new Set([
  ...(smokeMatrix.cases || []).map(item => item.id),
  ...(smokeMatrix.wrapperCases || []).map(item => item.id)
])
const smokeSurfaces = new Set(smokeMatrix.surfaces || [])
const smokeMatrixWrappers = new Set((smokeMatrix.wrappers || []).map(wrapper => wrapper.id))

assertUnique(baseline.cases, 'cases')
const coveredSurfaces = new Set()
const coveredFeatures = new Set()
for (const testCase of baseline.cases || []) {
  if (!surfaceIds.has(testCase.surface)) {
    fail(`Case ${testCase.id} references unknown surface ${testCase.surface}`)
  }
  coveredSurfaces.add(testCase.surface)

  if (testCase.smokeCaseId && !smokeCaseIds.has(testCase.smokeCaseId)) {
    fail(`Case ${testCase.id} references unknown smoke matrix case ${testCase.smokeCaseId}`)
  }
  if (testCase.wrapperId) {
    if (!wrapperById.has(testCase.wrapperId)) {
      fail(`Case ${testCase.id} references unknown wrapper ${testCase.wrapperId}`)
    }
    if (!smokeMatrixWrappers.has(testCase.wrapperId)) {
      fail(`Case ${testCase.id} wrapper ${testCase.wrapperId} is missing from smoke-matrix wrappers`)
    }
  }
  const surface = baseline.surfaces.find(item => item.id === testCase.surface)
  if (surface?.kind !== 'baseline-page' && surface?.kind !== 'baseline-component' && surface?.wrapperId) {
    const smokeSurface = smokeMatrix.wrappers?.find(wrapper => wrapper.id === surface.wrapperId)?.surface
    if (smokeSurface && !smokeSurfaces.has(smokeSurface)) {
      fail(`Case ${testCase.id} maps to unknown smoke surface ${smokeSurface}`)
    }
  }
  for (const scriptName of testCase.scripts || []) {
    assertPackageScript(rootPackage, scriptName, `Case ${testCase.id}`)
  }
  if (!Array.isArray(testCase.features) || !testCase.features.length) {
    fail(`Case ${testCase.id} must declare feature coverage`)
  }
  for (const feature of testCase.features) {
    if (!featureIds.has(feature)) {
      fail(`Case ${testCase.id} references unknown feature group ${feature}`)
    }
    coveredFeatures.add(feature)
  }
  if (!Array.isArray(testCase.assertions) || !testCase.assertions.length) {
    fail(`Case ${testCase.id} must declare assertions`)
  }
}

for (const surfaceId of surfaceIds) {
  if (!coveredSurfaces.has(surfaceId)) {
    fail(`No baseline case covers surface ${surfaceId}`)
  }
}
for (const featureId of featureIds) {
  if (!coveredFeatures.has(featureId)) {
    fail(`No baseline case covers feature group ${featureId}`)
  }
}

console.log(
  `[experience-baseline] Verified ${baseline.surfaces.length} surfaces, ${baseline.cases.length} baseline cases, ${baseline.featureGroups.length} feature groups, and ${baseline.requiredScripts.length} required scripts.`
)
