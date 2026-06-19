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

function mountOptionRows(locale) {
  if (locale === 'zh') {
    return [
      ['`url`', '远程文件地址，适合 CDN、对象存储和业务接口返回的文件链接。'],
      ['`file`', '`File`、`Blob` 或 `ArrayBuffer`，适合上传、本地选择和业务接口已取回的二进制。'],
      ['`buffer`', '直接传入 `ArrayBuffer`，适合解密、鉴权或自定义下载后再预览。'],
      ['`name` / `filename`', '显示文件名并辅助推断扩展名；当 URL 不含扩展名时建议显式传入。'],
      ['`type`', '显式指定扩展名或 MIME 线索，覆盖自动识别结果。'],
      ['`size`', '文件大小提示，用于生命周期上下文、加载状态和安全限制展示。'],
      ['`options`', '完整 `FileViewerOptions`，所有框架包保持同一套参数语义。'],
      ['`onEvent` / `onStateChange`', 'Pure Web、React、Svelte 等命令式包装层的统一事件和状态订阅；Vue 组件会映射为原生 emit。']
    ]
  }
  return [
    ['`url`', 'Remote file URL for CDN, object storage, or business API file links.'],
    ['`file`', '`File`, `Blob`, or `ArrayBuffer` for uploads, local selection, or already-fetched binary data.'],
    ['`buffer`', 'Direct `ArrayBuffer` input after custom download, authorization, or decryption.'],
    ['`name` / `filename`', 'Display name and extension hint. Pass it explicitly when the URL has no useful extension.'],
    ['`type`', 'Explicit extension or MIME hint that overrides automatic detection.'],
    ['`size`', 'File size hint used in lifecycle context, loading states, and safety limits.'],
    ['`options`', 'The shared `FileViewerOptions` surface. Every component package keeps the same semantics.'],
    ['`onEvent` / `onStateChange`', 'Unified event and state subscriptions for imperative wrappers such as Pure Web, React, and Svelte. Vue maps the same events to native emits.']
  ]
}

function viewerOptionRows(locale) {
  if (locale === 'zh') {
    return [
      ['`theme`', '`light`、`dark` 或 `system`，优先级高于浏览器 `prefers-color-scheme`。'],
      ['`watermark`', '开启文字或图片水印，可设置透明度、旋转、间距、尺寸、字体和颜色。'],
      ['`toolbar`', '控制下载、打印、HTML 导出、缩放和工具栏位置，并支持操作级前置校验。'],
      ['`search`', '配置文档搜索、高亮 class、大小写、整词匹配、最大命中数和 debounce。'],
      ['`ai`', '控制文本结构采集、分块大小和最大文本长度，为溯源、定位、向量化和外部 AI 流程提供基础。'],
      ['`archive`', '配置压缩包 Worker/WASM、超时、缓存、包体限制和压缩包内单文件预览大小。'],
      ['`pdf`', '配置 PDF.js Worker、导航栏、目录、旋转、流式读取、Range chunk 和凭据。'],
      ['`docx` / `spreadsheet`', '配置 Office Worker、渐进渲染和表格 Worker，保持大文件预览体验。'],
      ['`typst` / `data` / `cad`', '配置 Typst、SQLite、CAD/DWG/DXF/DWF 等 WASM、Worker、编码和渲染策略。'],
      ['`hooks` / `beforeOperation`', '统一生命周期 hooks 和操作前置校验，可用于审计、权限、埋点和安全控制。']
    ]
  }
  return [
    ['`theme`', '`light`, `dark`, or `system`. This takes precedence over browser `prefers-color-scheme`.'],
    ['`watermark`', 'Text or image watermark with opacity, rotation, gap, size, font, and color controls.'],
    ['`toolbar`', 'Controls download, print, HTML export, zoom, toolbar position, and operation-level preflight checks.'],
    ['`search`', 'Document search, highlight class names, case sensitivity, whole-word matching, max matches, and debounce.'],
    ['`ai`', 'Text collection, chunk size, and max text length for provenance, location, vectorization, and external AI workflows.'],
    ['`archive`', 'Archive Worker/WASM URLs, timeout, cache, archive limits, and nested entry preview limits.'],
    ['`pdf`', 'PDF.js worker, navigation pane, outline, rotation, streaming, range chunk size, and credentials.'],
    ['`docx` / `spreadsheet`', 'Office workers, progressive rendering, and spreadsheet worker settings for large documents.'],
    ['`typst` / `data` / `cad`', 'Typst, SQLite, CAD/DWG/DXF/DWF WASM, worker, encoding, and rendering strategy options.'],
    ['`hooks` / `beforeOperation`', 'Shared lifecycle hooks and operation preflight checks for audit, permission, telemetry, and safety controls.']
  ]
}

function lifecycleRows(locale) {
  if (locale === 'zh') {
    return [
      ['`load-start` / `hooks.onLoadStart`', '开始解析或下载文档时触发，包含文件名、类型、来源、版本、URL、File 和 size。'],
      ['`load-complete` / `hooks.onLoadComplete`', '当前文档完成渲染时触发，包含耗时、来源上下文和版本号。'],
      ['`unload-start` / `hooks.onUnloadStart`', '替换、重置或组件卸载前触发，可用于保存状态或释放外部资源。'],
      ['`unload-complete` / `hooks.onUnloadComplete`', '旧文档释放完成后触发，reason 会标识 `replace`、`reset` 或 `component-unmount`。'],
      ['`operation-before` / `operation-cancel`', '下载、打印、HTML 导出和缩放前后触发；`beforeOperation` 返回 `false` 可取消操作。'],
      ['`operation-availability-change`', '当前格式是否可下载、可打印、可导出 HTML、可缩放发生变化时触发。'],
      ['`search-change` / `location-change` / `zoom-change`', '搜索命中、定位锚点和缩放状态变化时触发，用于外层同步 UI。']
    ]
  }
  return [
    ['`load-start` / `hooks.onLoadStart`', 'Fires when parsing or downloading starts. Context includes filename, type, source, version, URL, File, and size.'],
    ['`load-complete` / `hooks.onLoadComplete`', 'Fires when the current document has rendered. Context includes duration, source data, and version.'],
    ['`unload-start` / `hooks.onUnloadStart`', 'Fires before replace, reset, or component unmount so external state or resources can be saved.'],
    ['`unload-complete` / `hooks.onUnloadComplete`', 'Fires after the previous document is released. The reason is `replace`, `reset`, or `component-unmount`.'],
    ['`operation-before` / `operation-cancel`', 'Fires around download, print, HTML export, and zoom actions. Returning `false` from `beforeOperation` cancels the action.'],
    ['`operation-availability-change`', 'Fires when download, print, HTML export, or zoom support changes for the active format.'],
    ['`search-change` / `location-change` / `zoom-change`', 'Fires when search matches, document anchors, or zoom state changes so host UIs can stay in sync.']
  ]
}

function publicApiRows(locale) {
  if (locale === 'zh') {
    return [
      ['`load` / `update` / `reload` / `destroy`', '命令式控制文档加载、参数更新、重新加载和销毁。'],
      ['`downloadOriginalFile()`', '下载原始文件，遵循 toolbar 与 `beforeOperation` 权限校验。'],
      ['`printRenderedHtml()`', '打印当前完整渲染内容，优先使用各格式的高保真打印适配器。'],
      ['`exportRenderedHtml()`', '导出当前渲染后的 HTML，用于归档、审计和离线查看。'],
      ['`zoomIn()` / `zoomOut()` / `resetZoom()`', '调用当前格式自己的缩放 provider，避免外层 CSS 缩放导致坐标偏移。'],
      ['`searchDocument()` / `nextSearchResult()` / `previousSearchResult()`', '打开文档级搜索并在命中之间导航，保持高亮状态。'],
      ['`collectDocumentAnchors()` / `scrollToAnchor()` / `scrollToLine()`', '采集页面、目录、标题或代码行锚点，并执行定位跳转。'],
      ['`getDocumentTextChunks()`', '获取结构化文本块，便于搜索、AI 溯源、向量化和外部索引。'],
      ['`getOperationAvailability()` / `getZoomState()` / `getSearchState()`', '读取当前能力、缩放和搜索状态，便于自定义工具栏。']
    ]
  }
  return [
    ['`load` / `update` / `reload` / `destroy`', 'Imperatively load, update, reload, and destroy the viewer.'],
    ['`downloadOriginalFile()`', 'Downloads the original file while respecting toolbar and `beforeOperation` checks.'],
    ['`printRenderedHtml()`', 'Prints the complete rendered document using the best available per-format print adapter.'],
    ['`exportRenderedHtml()`', 'Exports rendered HTML for archiving, audit, or offline review.'],
    ['`zoomIn()` / `zoomOut()` / `resetZoom()`', 'Uses the active renderer zoom provider instead of outer CSS transforms that can break coordinates.'],
    ['`searchDocument()` / `nextSearchResult()` / `previousSearchResult()`', 'Runs document-level search and navigates highlighted matches.'],
    ['`collectDocumentAnchors()` / `scrollToAnchor()` / `scrollToLine()`', 'Collects pages, outline items, headings, or code-line anchors and scrolls to them.'],
    ['`getDocumentTextChunks()`', 'Returns structured text chunks for search, AI provenance, vectorization, and external indexes.'],
    ['`getOperationAvailability()` / `getZoomState()` / `getSearchState()`', 'Reads current capability, zoom, and search state for custom toolbars.']
  ]
}

function assetRows(locale) {
  if (locale === 'zh') {
    return [
      ['通用 viewer assets', 'Pure Web 包提供 `file-viewer-copy-assets`，可把 Worker、WASM、vendor 和示例资源复制到业务静态目录。'],
      ['CAD / DWG / DXF / DWF', '按需配置 `options.cad.wasmPath`、`workerUrl`、`dwfWasmUrl`、`dxfEncoding`，支持自托管和内网部署。'],
      ['PDF / DOCX / Excel', '按需配置 `options.pdf.workerUrl`、`options.docx.workerUrl`、`options.spreadsheet.workerUrl`，大文件可走 Worker 与渐进渲染。'],
      ['Typst / SQLite / Archive', '按需配置 Typst compiler/renderer WASM、`data.sqlWasmUrl`、`archive.workerUrl` / `archive.wasmUrl`。'],
      ['部署原则', '默认只在命中特定格式时异步加载对应依赖；没有命中的格式不会拉取重型 Worker、WASM 或解析库。']
    ]
  }
  return [
    ['Shared viewer assets', 'The Pure Web package ships `file-viewer-copy-assets` to copy workers, WASM, vendor files, and examples into your static directory.'],
    ['CAD / DWG / DXF / DWF', 'Configure `options.cad.wasmPath`, `workerUrl`, `dwfWasmUrl`, and `dxfEncoding` for self-hosted or intranet deployment.'],
    ['PDF / DOCX / Excel', 'Configure `options.pdf.workerUrl`, `options.docx.workerUrl`, and `options.spreadsheet.workerUrl`; large files can use workers and progressive rendering.'],
    ['Typst / SQLite / Archive', 'Configure Typst compiler/renderer WASM, `data.sqlWasmUrl`, and `archive.workerUrl` / `archive.wasmUrl` as needed.'],
    ['Deployment principle', 'Heavy workers, WASM files, and parser libraries stay lazy-loaded and are only requested when the active file type needs them.']
  ]
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
      '## 统一参数与事件',
      '',
      '所有生态组件都围绕同一套 `ViewerMountOptions` 与 `FileViewerOptions` 工作，只是映射到各自框架的 props、事件、ref、action 或插件 API。',
      '',
      markdownTable(['参数', '说明'], mountOptionRows('zh')),
      '',
      markdownTable(['Options 字段', '说明'], viewerOptionRows('zh')),
      '',
      '## 生命周期与操作事件',
      '',
      markdownTable(['事件 / hook', '说明'], lifecycleRows('zh')),
      '',
      '## 公共操作 API',
      '',
      markdownTable(['API', '说明'], publicApiRows('zh')),
      '',
      '## Worker、WASM 与私有化部署',
      '',
      markdownTable(['资源', '说明'], assetRows('zh')),
      '',
      '## 质量门禁',
      '',
      '- 组件包只依赖 `@file-viewer/core` 和自身生态依赖，不嵌套引用其他框架组件包。',
      '- 格式解析、搜索、缩放、打印、导出、水印、生命周期和 beforeOperation 语义全部来自同一个 core。',
      '- 发布前需通过类型检查、组件 API 校验、README 生成校验、格式矩阵校验、独立仓库导出和浏览器 smoke。',
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
    '## Shared Options And Events',
    '',
    'Every ecosystem package uses the same `ViewerMountOptions` and `FileViewerOptions` semantics, mapped to framework-native props, events, refs, actions, or plugin APIs.',
    '',
    markdownTable(['Option', 'Description'], mountOptionRows('en')),
    '',
    markdownTable(['Options Field', 'Description'], viewerOptionRows('en')),
    '',
    '## Lifecycle And Operation Events',
    '',
    markdownTable(['Event / hook', 'Description'], lifecycleRows('en')),
    '',
    '## Public Operation API',
    '',
    markdownTable(['API', 'Description'], publicApiRows('en')),
    '',
    '## Workers, WASM, And Private Deployment',
    '',
    markdownTable(['Asset', 'Description'], assetRows('en')),
    '',
    '## Quality Gates',
    '',
    '- Component packages only depend on `@file-viewer/core` and their own ecosystem dependencies. They do not nest through another framework component package.',
    '- Format parsing, search, zoom, print, export, watermark, lifecycle, and beforeOperation semantics all come from the same core.',
    '- Releases should pass type checks, component API verification, README generation checks, format-matrix verification, standalone repository export, and browser smoke tests.',
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
      '下面内容由 `ecosystem/wrappers.json` 和 `packages/core/src/formats.ts` 自动生成。开源总仓库同步 README 时会携带同一份索引，确保用户可以从任意入口找到标准 npm 包、历史兼容包、分散组件仓库和 release 下载物。',
      '',
      `核心底座包: \`${core.packageName}\`。core 源码已公开，GitHub: ${core.github}，Gitee: ${core.gitee}。开源总仓库提供可直接运行的主 Demo 源码、core、标准组件包、兼容包、文档源码、构建产物、示例文件和 release tarball；私有 Gitea \`main\` 是完整原始聚合仓，用于统一自动化、内部集成历史、打赏支持和优先技术支持，不等同于 GitHub 开源总仓库。`,
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
    'This section is generated from `ecosystem/wrappers.json` and `packages/core/src/formats.ts`. The open-source main repository carries the same index so users can find standard npm packages, historical compatibility packages, split component repositories, and release downloads from one place.',
    '',
    `Core foundation package: \`${core.packageName}\`. Core source is public: ${core.github} and ${core.gitee}. The open-source aggregate repository provides runnable main demo source, core, standard component packages, compatibility aliases, documentation source, build artifacts, examples, and release tarballs; private Gitea \`main\` is the complete original aggregate workspace for unified automation, integration history, sponsorship, and priority support, and is not the same as the GitHub open-source aggregate.`,
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
