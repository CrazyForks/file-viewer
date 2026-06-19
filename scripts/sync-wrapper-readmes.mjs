import { readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import vm from 'node:vm'
import ts from 'typescript'
import { formatEntryFormats } from './lib/wrapper-entry-formats.mjs'

const sourceRoot = process.cwd()
const wrapperManifest = JSON.parse(await readFile(join(sourceRoot, 'ecosystem', 'wrappers.json'), 'utf8'))
const readmeTemplate = JSON.parse(await readFile(join(sourceRoot, 'ecosystem', 'wrapper-readme-template.json'), 'utf8'))

const formatModule = await loadTypescriptModule(join(sourceRoot, 'packages/core/src/formats.ts'))
const rendererDefinitions = [...formatModule.DEFAULT_RENDERER_DEFINITIONS]
const supportedExtensions = [...formatModule.DEFAULT_SUPPORTED_EXTENSIONS]

function escapeCell(value) {
  return String(value).replace(/\|/g, '\\|')
}

async function loadTypescriptModule(path) {
  const source = await readFile(path, 'utf8')
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020
    },
    fileName: path
  })
  const module = { exports: {} }
  const sandbox = {
    exports: module.exports,
    module,
    require(specifier) {
      throw new Error(`Unexpected module import while reading ${path}: ${specifier}`)
    }
  }
  vm.runInNewContext(transpiled.outputText, sandbox, { filename: path })
  return module.exports
}

function capabilityText(value, label, locale) {
  if (!value) {
    return ''
  }
  if (value === true) {
    return label
  }
  if (value === 'adapter') {
    return locale === 'zh' ? `${label}(适配器)` : `${label}(adapter)`
  }
  if (value === 'provider') {
    return locale === 'zh' ? `${label}(Provider)` : `${label}(provider)`
  }
  return `${label}(${value})`
}

function capabilities(definition, locale) {
  const labels = locale === 'zh'
    ? {
        download: '下载',
        print: '打印',
        exportHtml: 'HTML',
        zoom: '缩放',
        search: '搜索'
      }
    : {
        download: 'download',
        print: 'print',
        exportHtml: 'HTML export',
        zoom: 'zoom',
        search: 'search'
      }
  return [
    capabilityText(definition.capabilities.download, labels.download, locale),
    capabilityText(definition.capabilities.print, labels.print, locale),
    capabilityText(definition.capabilities.exportHtml, labels.exportHtml, locale),
    capabilityText(definition.capabilities.zoom, labels.zoom, locale),
    capabilityText(definition.capabilities.search, labels.search, locale)
  ].filter(Boolean).join(', ')
}

function wrapperRows(locale) {
  return wrapperManifest.wrappers.map(wrapper => {
    const historical = wrapper.historicalPackages.length
      ? wrapper.historicalPackages.map(item => `\`${item}\``).join(', ')
      : (locale === 'zh' ? '无' : 'none')
    return [
      wrapper.framework,
      `\`${wrapper.packageName}\``,
      formatEntryFormats(wrapper.entryFormats, locale),
      `[${wrapper.repository}](${wrapper.github})`,
      `[${wrapper.repository}](${wrapper.gitee})`,
      historical
    ]
  })
}

function rendererRows(locale) {
  return rendererDefinitions.map(definition => [
    definition.label,
    definition.category,
    definition.extensions.map(extension => `\`.${extension}\``).join(', '),
    capabilities(definition, locale) || '-',
    definition.async ? (locale === 'zh' ? '按需异步' : 'lazy async') : (locale === 'zh' ? '同步' : 'sync')
  ])
}

function markdownTable(headers, rows) {
  return [
    `| ${headers.map(escapeCell).join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map(row => `| ${row.map(escapeCell).join(' | ')} |`)
  ].join('\n')
}

const wrapperMarkers = {
  start: readmeTemplate.markers.wrapperGenerated.start,
  end: readmeTemplate.markers.wrapperGenerated.end
}

const publicMarkers = {
  start: readmeTemplate.markers.publicGenerated.start,
  end: readmeTemplate.markers.publicGenerated.end
}

function generatedWrapperBlock(locale) {
  const template = readmeTemplate.locales[locale]

  if (locale === 'zh') {
    return [
      wrapperMarkers.start,
      `## ${template.wrapperEcosystemHeading}`,
      '',
      '所有标准组件包都只共享 `@file-viewer/core` 这个总底座，不依赖其他框架组件实现。core 内部负责格式矩阵、资源解析、browser/renderers、事件、操作 API、搜索、缩放、打印和导出；各框架组件包自己维护本地 controller、组件生命周期、类型出口和生态交互。',
      '',
      markdownTable(
        template.wrapperMatrixHeaders,
        wrapperRows('zh')
      ),
      '',
      `## ${template.wrapperFormatHeading}`,
      '',
      `共享 core 当前覆盖 ${rendererDefinitions.length} 条预览链路、${supportedExtensions.length} 个扩展名。所有格式都按需异步加载，组件层只做生态适配，不互相嵌套。`,
      '',
      markdownTable(
        template.formatMatrixHeaders,
        rendererRows('zh')
      ),
      '',
      '完整参数、生命周期 hooks、beforeOperation、主题、水印、搜索、缩放、打印和导出说明见官方文档: https://doc.flyfish.dev/',
      '',
      '在线 Demo: https://viewer.flyfish.dev/ 。License: Apache-2.0。二开或商用请保留 Flyfish Viewer 来源说明；如果修复了通用兼容问题，也欢迎贡献回对应组件仓库。',
      wrapperMarkers.end
    ].join('\n')
  }

  return [
    wrapperMarkers.start,
    `## ${template.wrapperEcosystemHeading}`,
    '',
    'Every standard component package shares `@file-viewer/core` as the only common foundation, and no framework component package depends on another framework implementation. Core owns format metadata, source loading, browser/renderers, events, operation APIs, search, zoom, print, and export; each framework package owns its local controller, component lifecycle, type exports, and ecosystem-specific interaction layer.',
    '',
    markdownTable(
      template.wrapperMatrixHeaders,
      wrapperRows('en')
    ),
    '',
    `## ${template.wrapperFormatHeading}`,
    '',
    `The shared core currently covers ${rendererDefinitions.length} preview pipelines and ${supportedExtensions.length} file extensions. Renderers stay lazy-loaded, and component packages only adapt their own ecosystem without nesting through another framework implementation.`,
    '',
    markdownTable(
      template.formatMatrixHeaders,
      rendererRows('en')
    ),
    '',
    'See the official documentation for options, lifecycle hooks, beforeOperation, theme, watermark, search, zoom, print, and export APIs: https://doc.flyfish.dev/',
    '',
    'Online demo: https://viewer.flyfish.dev/. License: Apache-2.0. For second development or commercial use, keep clear Flyfish Viewer attribution; shared compatibility fixes are welcome in the matching component repository.',
    wrapperMarkers.end
  ].join('\n')
}

function generatedPublicBlock(locale) {
  const core = wrapperManifest.corePackage
  const template = readmeTemplate.locales[locale]

  if (locale === 'zh') {
    return [
      publicMarkers.start,
      `## ${template.publicEcosystemHeading}`,
      '',
      '下面内容由 `ecosystem/wrappers.json` 和 `packages/core/src/formats.ts` 自动生成。公开仓库同步 README 时会携带同一份索引，确保用户可以从任意入口找到标准 npm 包、历史兼容包和公开组件仓库。',
      '',
      `核心底座包: \`${core.packageName}\`。core 源码已公开，GitHub: ${core.github}，Gitee: ${core.gitee}。公开仓库提供分散包源码、Demo、文档站、构建产物、示例文件和 tarball；私有 Gitea 完整聚合仓用于打赏支持、统一自动化和优先技术支持。`,
      '',
      markdownTable(
        template.wrapperMatrixHeaders,
        wrapperRows('zh')
      ),
      '',
      `共享 core 当前声明 ${rendererDefinitions.length} 条预览链路、${supportedExtensions.length} 个扩展名。完整格式说明见本文“支持格式”和官方文档: https://doc.flyfish.dev/guide/formats`,
      publicMarkers.end
    ].join('\n')
  }

  return [
    publicMarkers.start,
    `## ${template.publicEcosystemHeading}`,
    '',
    'This section is generated from `ecosystem/wrappers.json` and `packages/core/src/formats.ts`. The public repository carries the same index so users can find the standard npm packages, historical compatibility packages, and public component repositories from one place.',
    '',
    `Core foundation package: \`${core.packageName}\`. Core source is public: ${core.github} and ${core.gitee}. Public repositories provide split package sources, demos, documentation, build artifacts, examples, and tarballs; the private Gitea aggregate remains available for sponsorship, unified automation, and priority support.`,
    '',
    markdownTable(
      template.wrapperMatrixHeaders,
      wrapperRows('en')
    ),
    '',
    `The shared core currently declares ${rendererDefinitions.length} preview pipelines and ${supportedExtensions.length} file extensions. See the full format guide in this README and the official documentation: https://doc.flyfish.dev/guide/formats`,
    publicMarkers.end
  ].join('\n')
}

function syncBlock(text, block, markers = wrapperMarkers) {
  const { start, end } = markers
  const startIndex = text.indexOf(start)
  const endIndex = text.indexOf(end)
  if (startIndex >= 0 && endIndex > startIndex) {
    const tail = text.slice(endIndex + end.length)
    if (!tail.trim()) {
      return `${text.slice(0, startIndex).trimEnd()}\n\n${block}\n`
    }
    return `${text.slice(0, startIndex).trimEnd()}\n\n${block}\n${tail.replace(/^\n+/, '\n')}`
  }
  return `${text.trimEnd()}\n\n${block}\n`
}

for (const wrapper of wrapperManifest.wrappers) {
  for (const [filename, locale] of [['README.md', 'zh'], ['README.en.md', 'en']]) {
    const readmePath = resolve(sourceRoot, wrapper.packageDir, filename)
    const current = await readFile(readmePath, 'utf8')
    const next = syncBlock(current, generatedWrapperBlock(locale))
    await writeFile(readmePath, next, 'utf8')
    console.log(`Updated ${wrapper.packageDir}/${filename}`)
  }
}

for (const [filename, locale] of [['README.md', 'zh'], ['README.en.md', 'en']]) {
  const readmePath = resolve(sourceRoot, filename)
  const current = await readFile(readmePath, 'utf8')
  const next = syncBlock(current, generatedPublicBlock(locale), publicMarkers)
  await writeFile(readmePath, next, 'utf8')
  console.log(`Updated ${filename}`)
}
