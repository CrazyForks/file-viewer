import { readFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadEcosystemReleaseContext, readJson } from './lib/ecosystem-packages.mjs'
import { readCoreRendererDefinitions, summarizeRendererSupport } from './lib/format-support.mjs'
import { entryFormatLabels } from './lib/wrapper-entry-formats.mjs'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const sourceRoot = resolve(scriptDir, '..')
const { wrapperManifest } = await loadEcosystemReleaseContext(sourceRoot)
const branchRoles = await readJson(join(sourceRoot, 'ecosystem', 'branch-roles.json'))
const readmeTemplate = await readJson(join(sourceRoot, 'ecosystem', 'wrapper-readme-template.json'))
const renderers = await readCoreRendererDefinitions(sourceRoot)
const supportSummary = summarizeRendererSupport(renderers)

const publicMarkers = readmeTemplate.markers.publicGenerated
const sharedRequiredLinks = [
  ...readmeTemplate.requiredLinks,
  'https://viewer.flyfish.dev/compare.html',
  branchRoles.publicArtifactRepository.github,
  branchRoles.publicArtifactRepository.gitee,
  'https://dev.flyfish.group/shop'
]

const localeReadmes = [
  {
    locale: 'zh',
    path: 'README.md',
    otherReadme: 'README.en.md',
    heading: readmeTemplate.locales.zh.publicEcosystemHeading,
    privateCoreHint: 'core 源码只在私有 Gitea 仓库维护',
    noAliasLabel: '无',
    rendererCountText: `${supportSummary.rendererCount} 条预览链路`,
    extensionCountText: `${supportSummary.uniqueExtensionCount} 个扩展名`,
    matrixHeaders: readmeTemplate.locales.zh.wrapperMatrixHeaders
  },
  {
    locale: 'en',
    path: 'README.en.md',
    otherReadme: 'README.md',
    heading: readmeTemplate.locales.en.publicEcosystemHeading,
    privateCoreHint: 'Core source is maintained only in the private Gitea repository',
    noAliasLabel: 'none',
    rendererCountText: `${supportSummary.rendererCount} preview pipelines`,
    extensionCountText: `${supportSummary.uniqueExtensionCount} file extensions`,
    matrixHeaders: readmeTemplate.locales.en.wrapperMatrixHeaders
  }
]

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

function assertIncludes(content, value, label) {
  assert(typeof value === 'string' && value.length > 0, `${label} received an empty required value`)
  assert(content.includes(value), `${label} must include ${value}`)
}

function assertIncludesUrl(content, value, label) {
  const withoutTrailingSlash = value.replace(/\/$/, '')
  assert(
    content.includes(value) || content.includes(withoutTrailingSlash),
    `${label} must include ${value}`
  )
}

function assertGeneratedBlock(content, label) {
  const startIndex = content.indexOf(publicMarkers.start)
  const endIndex = content.indexOf(publicMarkers.end)
  assert(startIndex >= 0, `${label} must include ${publicMarkers.start}`)
  assert(endIndex > startIndex, `${label} must include ${publicMarkers.end} after the start marker`)
}

function assertWrapperMatrix(content, label, locale, noAliasLabel) {
  const labels = entryFormatLabels(locale)
  for (const wrapper of wrapperManifest.wrappers) {
    assertIncludes(content, wrapper.framework || wrapper.label, label)
    assertIncludes(content, wrapper.packageName, label)
    assertIncludes(content, wrapper.repository, label)
    assertIncludes(content, wrapper.github, label)
    assertIncludes(content, wrapper.gitee, label)
    for (const format of wrapper.entryFormats || []) {
      assertIncludes(content, labels[format] || format, label)
    }
    if (wrapper.historicalPackages.length) {
      for (const historicalPackage of wrapper.historicalPackages) {
        assertIncludes(content, historicalPackage, label)
      }
    } else {
      assertIncludes(content, noAliasLabel, label)
    }
  }
}

for (const config of localeReadmes) {
  const label = `${config.path} ecosystem section`
  const content = await readFile(join(sourceRoot, config.path), 'utf8')

  assertIncludes(content, config.otherReadme, `${config.path} language switch`)
  assertGeneratedBlock(content, label)
  assertIncludes(content, config.heading, label)
  assertIncludes(content, wrapperManifest.corePackage.packageName, label)
  assertIncludes(content, config.privateCoreHint, label)
  assertIncludes(content, config.rendererCountText, label)
  assertIncludes(content, config.extensionCountText, label)

  for (const header of config.matrixHeaders) {
    assertIncludes(content, header, label)
  }
  for (const link of sharedRequiredLinks) {
    assertIncludesUrl(content, link, label)
  }
  for (const term of readmeTemplate.requiredTerms) {
    assertIncludes(content, term, label)
  }
  assertWrapperMatrix(content, label, config.locale, config.noAliasLabel)
}

console.log(
  `Verified root ecosystem READMEs for ${wrapperManifest.wrappers.length} wrappers, ${supportSummary.rendererCount} renderer pipelines, and ${supportSummary.uniqueExtensionCount} extensions.`
)
