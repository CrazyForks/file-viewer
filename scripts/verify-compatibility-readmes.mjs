import { readFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadEcosystemReleaseContext } from './lib/ecosystem-packages.mjs'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const sourceRoot = resolve(scriptDir, '..')
const { wrapperManifest, entries } = await loadEcosystemReleaseContext(sourceRoot)
const releaseEntryByName = new Map(entries.map(entry => [entry.packageName, entry]))
const compatibilityTargets = new Map()

for (const wrapper of wrapperManifest.wrappers) {
  for (const historicalPackage of wrapper.historicalPackages) {
    compatibilityTargets.set(historicalPackage, wrapper.packageName)
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

function hasChineseMigrationHint(content, standardPackageName) {
  return (
    content.includes(standardPackageName) &&
    (content.includes('标准包名') || content.includes('新项目') || content.includes('优先使用'))
  )
}

function hasEnglishMigrationHint(content, standardPackageName) {
  const normalized = content.toLowerCase()
  return (
    content.includes(standardPackageName) &&
    (normalized.includes('standard package name') ||
      normalized.includes('new integrations') ||
      normalized.includes('prefer'))
  )
}

let checked = 0
for (const [historicalPackage, standardPackage] of compatibilityTargets) {
  const entry = releaseEntryByName.get(historicalPackage)
  if (!entry) {
    continue
  }

  const readmePath = join(entry.absoluteDir, 'README.md')
  const readmeEnPath = join(entry.absoluteDir, 'README.en.md')
  const readme = await readFile(readmePath, 'utf8')
  const readmeEn = await readFile(readmeEnPath, 'utf8')

  assert(
    hasChineseMigrationHint(readme, standardPackage),
    `${historicalPackage} README.md must recommend the standard package ${standardPackage}`
  )
  assert(
    hasEnglishMigrationHint(readmeEn, standardPackage),
    `${historicalPackage} README.en.md must recommend the standard package ${standardPackage}`
  )
  checked += 1
}

console.log(`Verified ${checked} compatibility package README migration hints.`)
