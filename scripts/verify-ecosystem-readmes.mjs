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
const wrapperMarkers = readmeTemplate.markers.wrapperGenerated
const sharedRequiredLinks = [
  ...readmeTemplate.requiredLinks,
  'https://viewer.flyfish.dev/compare.html',
  branchRoles.publicMainRepository.github,
  branchRoles.publicMainRepository.gitee,
  wrapperManifest.corePackage.github,
  wrapperManifest.corePackage.gitee,
  'https://dev.flyfish.group/shop'
]

const localeReadmes = [
  {
    locale: 'zh',
    path: 'README.md',
    otherReadme: 'README.en.md',
    heading: readmeTemplate.locales.zh.publicEcosystemHeading,
    coreSourceHint: 'core 源码已公开',
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
    coreSourceHint: 'Core source is public',
    noAliasLabel: 'none',
    rendererCountText: `${supportSummary.rendererCount} preview pipelines`,
    extensionCountText: `${supportSummary.uniqueExtensionCount} file extensions`,
    matrixHeaders: readmeTemplate.locales.en.wrapperMatrixHeaders
  }
]

const wrapperReadmeConfigs = [
  {
    locale: 'zh',
    filename: 'README.md',
    generatedHeading: readmeTemplate.locales.zh.wrapperEcosystemHeading,
    formatHeading: readmeTemplate.locales.zh.wrapperFormatHeading,
    rendererCountText: `${supportSummary.rendererCount} 条预览链路`,
    extensionCountText: `${supportSummary.uniqueExtensionCount} 个扩展名`,
    noAliasLabel: '无',
    requiredTerms: [
      '统一参数与事件',
      '生命周期与操作事件',
      '公共操作 API',
      'Worker、WASM 与私有化部署',
      '质量门禁',
      'ViewerMountOptions',
      'FileViewerOptions',
      'beforeOperation',
      'getDocumentTextChunks()',
      'file-viewer-copy-assets',
      '按需异步',
      'https://doc.flyfish-viewer.app/',
      'https://viewer.flyfish.dev/',
      'Apache-2.0'
    ]
  },
  {
    locale: 'en',
    filename: 'README.en.md',
    generatedHeading: readmeTemplate.locales.en.wrapperEcosystemHeading,
    formatHeading: readmeTemplate.locales.en.wrapperFormatHeading,
    rendererCountText: `${supportSummary.rendererCount} preview pipelines`,
    extensionCountText: `${supportSummary.uniqueExtensionCount} file extensions`,
    noAliasLabel: 'none',
    requiredTerms: [
      'Shared Options And Events',
      'Lifecycle And Operation Events',
      'Public Operation API',
      'Workers, WASM, And Private Deployment',
      'Quality Gates',
      'ViewerMountOptions',
      'FileViewerOptions',
      'beforeOperation',
      'getDocumentTextChunks()',
      'file-viewer-copy-assets',
      'lazy-loaded',
      'https://doc.flyfish-viewer.app/',
      'https://viewer.flyfish.dev/',
      'Apache-2.0'
    ]
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

function assertGeneratedBlock(content, label, markers = publicMarkers) {
  const startIndex = content.indexOf(markers.start)
  const endIndex = content.indexOf(markers.end)
  assert(startIndex >= 0, `${label} must include ${markers.start}`)
  assert(endIndex > startIndex, `${label} must include ${markers.end} after the start marker`)
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
  assertIncludes(content, config.coreSourceHint, label)
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

for (const wrapper of wrapperManifest.wrappers) {
  for (const config of wrapperReadmeConfigs) {
    const readmePath = join(sourceRoot, wrapper.packageDir, config.filename)
    const label = `${wrapper.packageName} ${config.filename}`
    const content = await readFile(readmePath, 'utf8')

    assertGeneratedBlock(content, label, wrapperMarkers)
    assertIncludes(content, wrapper.packageName, label)
    assertIncludes(content, wrapper.framework, label)
    assertIncludes(content, wrapperManifest.corePackage.packageName, label)
    assertIncludes(content, config.generatedHeading, label)
    assertIncludes(content, config.formatHeading, label)
    assertIncludes(content, config.rendererCountText, label)
    assertIncludes(content, config.extensionCountText, label)
    assertWrapperMatrix(content, label, config.locale, config.noAliasLabel)
    for (const term of config.requiredTerms) {
      assertIncludes(content, term, label)
    }
  }
}

console.log(
  `Verified root and component ecosystem READMEs for ${wrapperManifest.wrappers.length} component packages, ${supportSummary.rendererCount} renderer pipelines, and ${supportSummary.uniqueExtensionCount} extensions.`
)
