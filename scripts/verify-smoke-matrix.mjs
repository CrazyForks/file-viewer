import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { extname, join } from 'node:path'
import { readCoreRendererDefinitions } from './lib/format-support.mjs'

const sourceRoot = process.cwd()
const matrixPath = join(sourceRoot, 'ecosystem', 'smoke-matrix.json')
const wrapperManifestPath = join(sourceRoot, 'ecosystem', 'wrappers.json')
const examplesRoot = join(sourceRoot, 'apps', 'viewer-demo', 'public', 'example')
const vitePluginSourcePath = join(sourceRoot, 'packages', 'presets', 'vite-plugin', 'src', 'index.ts')
const pluginEnginePackages = new Set([
  '@file-viewer/pptx',
  '@file-viewer/eda-layout',
  '@file-viewer/eda-orcad'
])

function fail(message) {
  throw new Error(`[smoke-matrix] ${message}`)
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'))
}

function assertUnique(items, label, selectId = item => item.id) {
  const seen = new Set()
  for (const item of items) {
    const id = selectId(item)
    if (!id) {
      fail(`${label} contains an item without id`)
    }
    if (seen.has(id)) {
      fail(`${label} contains duplicate id ${id}`)
    }
    seen.add(id)
  }
}

function assertSampleExists(sample, label) {
  const samplePath = join(examplesRoot, sample)
  if (!existsSync(samplePath)) {
    fail(`${label} sample does not exist: apps/viewer-demo/public/example/${sample}`)
  }
}

function sampleExtension(sample, explicitExtension) {
  if (explicitExtension) {
    return explicitExtension.toLowerCase()
  }
  return extname(sample).replace(/^\./, '').toLowerCase()
}

function quotedValues(text) {
  return [...String(text).matchAll(/'([^']+)'/g)].map(match => match[1])
}

async function readViteRendererPackageDescriptors() {
  const source = await readFile(vitePluginSourcePath, 'utf8')
  const rendererModuleMatch = source.match(
    /const rendererModules:[\s\S]*?=\s*\[([\s\S]*?)\]\s*\n\nconst descriptorsById/
  )
  if (!rendererModuleMatch) {
    fail('Could not find rendererModules in @file-viewer/vite-plugin source')
  }

  const descriptors = new Map()
  const rendererObjectPattern = /\{\s*id:\s*'([^']+)'([\s\S]*?)chunkName:\s*'[^']+'\s*\}/g
  for (const match of rendererModuleMatch[1].matchAll(rendererObjectPattern)) {
    const id = match[1]
    const body = match[2]
    const packageName = body.match(/packageName:\s*'([^']+)'/)?.[1]
    const rendererIdsSource = body.match(/rendererIds:\s*\[([\s\S]*?)\]/)?.[1]
    if (!packageName || !rendererIdsSource) {
      fail(`Could not parse renderer package descriptor for ${id}`)
    }
    if (descriptors.has(packageName)) {
      fail(`Vite renderer package descriptor contains duplicate package ${packageName}`)
    }
    const rendererIds = quotedValues(rendererIdsSource)
    if (!rendererIds.length) {
      fail(`Vite renderer package descriptor ${packageName} does not expose renderer ids`)
    }
    descriptors.set(packageName, {
      id,
      packageName,
      rendererIds
    })
  }

  if (!descriptors.size) {
    fail('No Vite renderer package descriptors were detected')
  }
  return descriptors
}

function assertRendererSample(entry, label) {
  const renderer = renderers.get(entry.rendererId)
  if (!renderer) {
    fail(`${label} references unknown renderer ${entry.rendererId}`)
  }
  const extension = sampleExtension(entry.sample, entry.extension)
  if (!renderer.extensions.has(extension)) {
    fail(`${label} extension ${extension} is not supported by renderer ${entry.rendererId}`)
  }
  assertSampleExists(entry.sample, label)
}

const [matrix, wrapperManifest, renderers, viteRendererPackages] = await Promise.all([
  readJson(matrixPath),
  readJson(wrapperManifestPath),
  readCoreRendererDefinitions(sourceRoot),
  readViteRendererPackageDescriptors()
])

if (matrix.schemaVersion !== 1) {
  fail(`Unsupported schemaVersion ${matrix.schemaVersion}`)
}

const surfaces = new Set(matrix.surfaces || [])
for (const surface of ['main-demo', 'compare-page', 'script-tag']) {
  if (!surfaces.has(surface)) {
    fail(`Missing required smoke surface ${surface}`)
  }
}

assertUnique(matrix.wrappers || [], 'wrappers')
const matrixWrappers = new Map((matrix.wrappers || []).map(wrapper => [wrapper.id, wrapper]))
for (const wrapper of wrapperManifest.wrappers) {
  const matrixWrapper = matrixWrappers.get(wrapper.id)
  if (!matrixWrapper) {
    fail(`Smoke matrix is missing wrapper ${wrapper.id}`)
  }
  if (matrixWrapper.packageName !== wrapper.packageName) {
    fail(`Wrapper ${wrapper.id} package mismatch: ${matrixWrapper.packageName} !== ${wrapper.packageName}`)
  }
  if (!surfaces.has(matrixWrapper.surface)) {
    fail(`Wrapper ${wrapper.id} references unknown surface ${matrixWrapper.surface}`)
  }
}

assertUnique(matrix.cases || [], 'cases')
const coveredRendererIds = new Set()
const coveredFamilies = new Set()
for (const smokeCase of matrix.cases || []) {
  assertRendererSample(smokeCase, `Case ${smokeCase.id}`)
  if (!Array.isArray(smokeCase.surfaces) || !smokeCase.surfaces.length) {
    fail(`Case ${smokeCase.id} must declare at least one surface`)
  }
  for (const surface of smokeCase.surfaces) {
    if (!surfaces.has(surface)) {
      fail(`Case ${smokeCase.id} references unknown surface ${surface}`)
    }
  }
  if (!Array.isArray(smokeCase.assertions) || !smokeCase.assertions.length) {
    fail(`Case ${smokeCase.id} must declare at least one assertion`)
  }
  coveredRendererIds.add(smokeCase.rendererId)
  coveredFamilies.add(smokeCase.family)
}

if (matrix.coverage?.requireAllRendererIds) {
  for (const rendererId of renderers.keys()) {
    if (!coveredRendererIds.has(rendererId)) {
      fail(`Smoke matrix does not cover renderer ${rendererId}`)
    }
  }
}

let coveredRendererPackageCount = 0
if (matrix.coverage?.requireAllRendererPackages) {
  for (const rendererPackage of wrapperManifest.renderers || []) {
    if (pluginEnginePackages.has(rendererPackage.packageName)) {
      continue
    }
    const descriptor = viteRendererPackages.get(rendererPackage.packageName)
    if (!descriptor) {
      fail(`Smoke matrix cannot resolve renderer package ${rendererPackage.packageName} through @file-viewer/vite-plugin`)
    }
    const missingRendererIds = descriptor.rendererIds.filter(rendererId => !coveredRendererIds.has(rendererId))
    if (missingRendererIds.length) {
      fail(
        `Smoke matrix does not cover renderer package ${rendererPackage.packageName}; missing renderer ids: ${missingRendererIds.join(', ')}`
      )
    }
    coveredRendererPackageCount += 1
  }
}

for (const family of matrix.coverage?.requiredFormatFamilies || []) {
  if (!coveredFamilies.has(family)) {
    fail(`Smoke matrix does not cover required family ${family}`)
  }
}

assertUnique(matrix.wrapperCases || [], 'wrapperCases')
const wrapperCaseIds = new Set()
for (const wrapperCase of matrix.wrapperCases || []) {
  if (!matrixWrappers.has(wrapperCase.wrapperId)) {
    fail(`Wrapper case ${wrapperCase.id} references unknown wrapper ${wrapperCase.wrapperId}`)
  }
  if (!surfaces.has(wrapperCase.surface)) {
    fail(`Wrapper case ${wrapperCase.id} references unknown surface ${wrapperCase.surface}`)
  }
  assertSampleExists(wrapperCase.sample, `Wrapper case ${wrapperCase.id}`)
  wrapperCaseIds.add(wrapperCase.wrapperId)
}
for (const wrapper of wrapperManifest.wrappers) {
  if (!wrapperCaseIds.has(wrapper.id)) {
    fail(`Smoke matrix does not include a wrapper case for ${wrapper.id}`)
  }
}

const requiredWrapperFamilies = matrix.wrapperCoverage?.requiredFamilies || []
assertUnique(requiredWrapperFamilies, 'wrapperCoverage.requiredFamilies', item => item.family)
if (matrix.wrapperCoverage?.requireEveryWrapper && !requiredWrapperFamilies.length) {
  fail('wrapperCoverage.requireEveryWrapper is enabled but no requiredFamilies were declared')
}
for (const family of requiredWrapperFamilies) {
  assertRendererSample(family, `Wrapper required family ${family.family}`)
  if (!Array.isArray(family.assertions) || !family.assertions.length) {
    fail(`Wrapper required family ${family.family} must declare at least one assertion`)
  }
}

let wrapperTargetCount = 0
if (matrix.wrapperCoverage?.requireEveryWrapper) {
  for (const wrapper of wrapperManifest.wrappers) {
    const matrixWrapper = matrixWrappers.get(wrapper.id)
    if (!matrixWrapper) {
      fail(`Wrapper coverage cannot find wrapper ${wrapper.id}`)
    }
    for (const family of requiredWrapperFamilies) {
      wrapperTargetCount += 1
    }
  }
}

console.log(
  `[smoke-matrix] Verified ${matrix.cases.length} format cases, ${matrix.wrapperCases.length} wrapper cases, ${wrapperTargetCount} wrapper family targets, ${renderers.size} renderer pipelines, and ${coveredRendererPackageCount} renderer packages.`
)
