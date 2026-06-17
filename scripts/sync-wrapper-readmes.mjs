import { readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import vm from 'node:vm'
import ts from 'typescript'

const sourceRoot = process.cwd()
const wrapperManifest = JSON.parse(await readFile(join(sourceRoot, 'ecosystem', 'wrappers.json'), 'utf8'))

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
      throw new Error(`Unexpected runtime import while reading ${path}: ${specifier}`)
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

function generatedBlock(locale) {
  if (locale === 'zh') {
    return [
      '<!-- FILE_VIEWER_GENERATED:START -->',
      '## 生态包矩阵',
      '',
      '所有 wrapper 都复用同一个 `@file-viewer/core` / `@file-viewer/web` 底座。core 源码保留在私有 Gitea 仓库，wrapper 仓库面向 GitHub/Gitee 公开发布。',
      '',
      markdownTable(
        ['框架', '标准 npm 包', 'GitHub', 'Gitee', '兼容历史包'],
        wrapperRows('zh')
      ),
      '',
      '## 格式支持矩阵',
      '',
      `当前共享底座覆盖 ${rendererDefinitions.length} 条预览链路、${supportedExtensions.length} 个扩展名。所有格式都按需异步加载，wrapper 层不重复打包渲染器。`,
      '',
      markdownTable(
        ['预览链路', '分类', '扩展名', '能力', '加载'],
        rendererRows('zh')
      ),
      '',
      '完整参数、生命周期 hooks、beforeOperation、主题、水印、搜索、缩放、打印和导出说明见官方文档: https://doc.flyfish.dev/',
      '<!-- FILE_VIEWER_GENERATED:END -->'
    ].join('\n')
  }

  return [
    '<!-- FILE_VIEWER_GENERATED:START -->',
    '## Ecosystem Matrix',
    '',
    'Every wrapper reuses the same `@file-viewer/core` / `@file-viewer/web` foundation. Core source stays in the private Gitea repository, while wrappers are prepared for public GitHub/Gitee distribution.',
    '',
    markdownTable(
      ['Framework', 'Standard npm package', 'GitHub', 'Gitee', 'Historical aliases'],
      wrapperRows('en')
    ),
    '',
    '## Format Support Matrix',
    '',
    `The shared runtime currently covers ${rendererDefinitions.length} preview pipelines and ${supportedExtensions.length} file extensions. Renderers stay lazy-loaded, so wrapper packages do not duplicate heavy preview logic.`,
    '',
    markdownTable(
      ['Preview pipeline', 'Category', 'Extensions', 'Capabilities', 'Loading'],
      rendererRows('en')
    ),
    '',
    'See the official documentation for options, lifecycle hooks, beforeOperation, theme, watermark, search, zoom, print, and export APIs: https://doc.flyfish.dev/',
    '<!-- FILE_VIEWER_GENERATED:END -->'
  ].join('\n')
}

function syncBlock(text, block) {
  const start = '<!-- FILE_VIEWER_GENERATED:START -->'
  const end = '<!-- FILE_VIEWER_GENERATED:END -->'
  const startIndex = text.indexOf(start)
  const endIndex = text.indexOf(end)
  if (startIndex >= 0 && endIndex > startIndex) {
    return `${text.slice(0, startIndex).trimEnd()}\n\n${block}\n${text.slice(endIndex + end.length)}`
  }
  return `${text.trimEnd()}\n\n${block}\n`
}

for (const wrapper of wrapperManifest.wrappers) {
  for (const [filename, locale] of [['README.md', 'zh'], ['README.en.md', 'en']]) {
    const readmePath = resolve(sourceRoot, wrapper.packageDir, filename)
    const current = await readFile(readmePath, 'utf8')
    const next = syncBlock(current, generatedBlock(locale))
    await writeFile(readmePath, next, 'utf8')
    console.log(`Updated ${wrapper.packageDir}/${filename}`)
  }
}
