import { readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import vm from 'node:vm'
import ts from 'typescript'
import { formatEntryFormats } from './lib/wrapper-entry-formats.mjs'

const sourceRoot = process.cwd()
const wrapperManifest = JSON.parse(await readFile(join(sourceRoot, 'ecosystem', 'wrappers.json'), 'utf8'))
const readmeTemplate = JSON.parse(await readFile(join(sourceRoot, 'ecosystem', 'wrapper-readme-template.json'), 'utf8'))

const formatModule = await loadTypescriptModule(join(sourceRoot, 'packages/core/src/registry/formats.ts'))
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
      ['`url`', '远程文件地址，适合对象存储、业务接口或内网文件服务返回的文件链接。'],
      ['`file`', '`File`、`Blob` 或 `ArrayBuffer`，适合上传、本地选择和业务接口已取回的二进制。'],
      ['`buffer`', '直接传入 `ArrayBuffer`，适合解密、鉴权或自定义下载后再预览。'],
      ['`name` / `filename`', '显示文件名并辅助推断扩展名；当 URL 不含扩展名时建议显式传入。'],
      ['`type`', '显式指定扩展名或 MIME 线索，覆盖自动识别结果。'],
      ['`size`', '文件大小提示，用于生命周期上下文、加载状态和安全限制展示。'],
      ['`options`', '完整 `FileViewerOptions`，所有框架包保持同一套参数语义。'],
      ['`onEvent` / `onStateChange`', 'Vanilla JS / Pure Web、React、Svelte 等命令式包装层的统一事件和状态订阅；Vue 组件会映射为原生 emit。']
    ]
  }
  return [
    ['`url`', 'Remote file URL from object storage, business APIs, or intranet file services.'],
    ['`file`', '`File`, `Blob`, or `ArrayBuffer` for uploads, local selection, or already-fetched binary data.'],
    ['`buffer`', 'Direct `ArrayBuffer` input after custom download, authorization, or decryption.'],
    ['`name` / `filename`', 'Display name and extension hint. Pass it explicitly when the URL has no useful extension.'],
    ['`type`', 'Explicit extension or MIME hint that overrides automatic detection.'],
    ['`size`', 'File size hint used in lifecycle context, loading states, and safety limits.'],
    ['`options`', 'The shared `FileViewerOptions` surface. Every component package keeps the same semantics.'],
    ['`onEvent` / `onStateChange`', 'Unified event and state subscriptions for imperative wrappers such as Vanilla JavaScript / Pure Web, React, and Svelte. Vue maps the same events to native emits.']
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
      ['`pdf`', '配置 PDF.js Worker、导航栏、目录、缩略图、旋转、流式读取、Range chunk 和凭据。'],
      ['`docx` / `spreadsheet`', 'DOCX 由 @file-viewer/renderer-word 承接并使用自研 @file-viewer/docx，默认自动选择 Worker 或主线程解析，连续流式阅读和异步分批渲染，可按需显式开启视觉分页；表格由 @file-viewer/renderer-spreadsheet 承接，默认保真解析，大文件自动启用 Worker，表头拖拽调列宽可按需显式开启。'],
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
    ['`pdf`', 'PDF.js worker, navigation pane, outline, thumbnails, rotation, streaming, range chunk size, and credentials.'],
    ['`docx` / `spreadsheet`', 'DOCX is provided by @file-viewer/renderer-word and uses the self-maintained @file-viewer/docx engine with automatic worker/main-thread selection, continuous flow reading, and async rendering by default; visual pagination is opt-in. Spreadsheet is provided by @file-viewer/renderer-spreadsheet with fidelity-first parsing, automatic Worker use for large files, and opt-in header drag column resizing.'],
    ['`typst` / `data` / `cad`', 'Typst, SQLite, CAD/DWG/DXF/DWF WASM, worker, encoding, and rendering strategy options.'],
    ['`hooks` / `beforeOperation`', 'Shared lifecycle hooks and operation preflight checks for audit, permission, telemetry, and safety controls.']
  ]
}

function componentSurfaceRows(locale) {
  if (locale === 'zh') {
    return [
      [
        'Vanilla JS / Pure Web `@file-viewer/web`',
        '`<flyfish-file-viewer>` 属性 `src/url`、`filename/name`、`type`、`size`、`theme`、`toolbar`、`toolbar-position`、`watermark`、`search`、`options`；也支持 `mountViewer(...)`',
        '`viewer-ready`、`viewer-event`、`viewer-state-change`、`viewer-error`、`onEvent`、`onStateChange`、`controller.subscribe()`',
        'Custom Element 实例暴露完整 controller handle；IIFE script 标签会自动注册元素，同时保留 `mountViewer` 命令式挂载和资源复制 CLI。'
      ],
      [
        'Vue 3 `@file-viewer/vue3`',
        '`url`、`file`、`options`',
        '`load-start`、`load-complete`、`unload-start`、`unload-complete`、`operation-before`、`operation-cancel`、`operation-availability-change`、`search-change`、`location-change`、`zoom-change`、`view-state-change`',
        '模板 `ref` 暴露 `FileViewerExpose`；适合声明式接入。`Blob` / `ArrayBuffer` 建议包装成带扩展名的 `File` 后传给 `file`。'
      ],
      [
        'Vue 2.7 `@file-viewer/vue2.7`',
        '`url`、`file`、`buffer`、`name`、`filename`、`type`、`size`、`options`、`containerClass`、`containerStyle`',
        '`viewer-event` / `viewerEvent`',
        '组件实例暴露 controller handle 全量方法；适合 Vue 2.7 项目和历史 `@flyfish-group/file-viewer` 平滑升级。'
      ],
      [
        'Vue 2.6 `@file-viewer/vue2.6`',
        '同 Vue 2.7',
        '`viewer-event` / `viewerEvent`',
        '独立 Vue 2.6 构建，不要求业务升级到 Vue 2.7。'
      ],
      [
        'React `@file-viewer/react`',
        '`ViewerMountOptions` + `div` 原生属性，如 `className`、`style`、`data-*`、`aria-*`',
        '`onEvent`、`onStateChange`',
        '`ref` 暴露 `FileViewerHandle`；`useFileViewer()` 会返回 `ref`、`props`、`state`、`handle`，便于自定义工具栏。'
      ],
      [
        'React Legacy `@file-viewer/react-legacy`',
        '同 React 标准包',
        '`onEvent`、`onStateChange`',
        '面向 React 16.8 / 17；组件名和默认导出保持 legacy 生态友好。'
      ],
      [
        'jQuery `@file-viewer/jquery`',
        '`$(el).fileViewer(ViewerMountOptions & { replace?: boolean })`',
        '`onEvent`、`onStateChange` 或 `getFileViewerController(el).subscribe()`',
        '插件方法支持 `zoomIn`、`printRenderedHtml`、`searchDocument` 等；`replace:false` 可在同一节点上原地更新。'
      ],
      [
        'Svelte `@file-viewer/svelte`',
        '`ViewerMountOptions` + `className`、`containerStyle`',
        '`on:viewerEvent`、`onEvent`、`onStateChange`',
        '`bind:this` 暴露 controller handle；也提供 `use:fileViewer` action，action 额外支持 `replace`。'
      ]
    ]
  }

  return [
    [
      'Vanilla JS / Pure Web `@file-viewer/web`',
      '`<flyfish-file-viewer>` attributes: `src/url`, `filename/name`, `type`, `size`, `theme`, `toolbar`, `toolbar-position`, `watermark`, `search`, `options`; also supports `mountViewer(...)`',
      '`viewer-ready`, `viewer-event`, `viewer-state-change`, `viewer-error`, `onEvent`, `onStateChange`, `controller.subscribe()`',
      'The Custom Element instance exposes the full controller handle; the IIFE script auto-registers it while keeping imperative `mountViewer` and the asset copy CLI.'
    ],
    [
      'Vue 3 `@file-viewer/vue3`',
      '`url`, `file`, `options`',
      '`load-start`, `load-complete`, `unload-start`, `unload-complete`, `operation-before`, `operation-cancel`, `operation-availability-change`, `search-change`, `location-change`, `zoom-change`, `view-state-change`',
      'Template refs expose `FileViewerExpose`. For `Blob` / `ArrayBuffer`, prefer wrapping it as a named `File` so extension detection stays deterministic.'
    ],
    [
      'Vue 2.7 `@file-viewer/vue2.7`',
      '`url`, `file`, `buffer`, `name`, `filename`, `type`, `size`, `options`, `containerClass`, `containerStyle`',
      '`viewer-event` / `viewerEvent`',
      'The component instance exposes the full controller handle. This is the Vue 2.7 line behind the historical `@flyfish-group/file-viewer` package.'
    ],
    [
      'Vue 2.6 `@file-viewer/vue2.6`',
      'Same as Vue 2.7',
      '`viewer-event` / `viewerEvent`',
      'Separate Vue 2.6 build for long-lived applications that cannot move to Vue 2.7.'
    ],
    [
      'React `@file-viewer/react`',
      '`ViewerMountOptions` plus native `div` props such as `className`, `style`, `data-*`, and `aria-*`',
      '`onEvent`, `onStateChange`',
      '`ref` exposes `FileViewerHandle`; `useFileViewer()` returns `ref`, `props`, `state`, and `handle` for custom toolbars.'
    ],
    [
      'React Legacy `@file-viewer/react-legacy`',
      'Same as the React package',
      '`onEvent`, `onStateChange`',
      'Targets React 16.8 / 17 with a legacy-friendly component export.'
    ],
    [
      'jQuery `@file-viewer/jquery`',
      '`$(el).fileViewer(ViewerMountOptions & { replace?: boolean })`',
      '`onEvent`, `onStateChange`, or `getFileViewerController(el).subscribe()`',
      'Plugin methods include `zoomIn`, `printRenderedHtml`, and `searchDocument`; `replace:false` updates the same node in place.'
    ],
    [
      'Svelte `@file-viewer/svelte`',
      '`ViewerMountOptions` plus `className` and `containerStyle`',
      '`on:viewerEvent`, `onEvent`, `onStateChange`',
      '`bind:this` exposes the controller handle; the `use:fileViewer` action is also available and adds `replace`.'
    ]
  ]
}

function toolbarOptionRows(locale) {
  if (locale === 'zh') {
    return [
      ['`toolbar: false`', '隐藏内置工具栏，但不关闭下载、打印、导出、缩放等 controller API，适合完全自定义业务工具栏。'],
      ['`toolbar: true`', '使用默认内置工具栏，下载、打印、HTML 导出和缩放按钮都会按能力动态显隐。'],
      ['`download` / `print` / `exportHtml` / `zoom`', '表达业务是否允许展示对应按钮；最终仍会结合文件类型、渲染完成状态、导出适配器和缩放 provider 计算真实可用性。'],
      ['`position`', '`auto`、`top`、`bottom-right`。默认 `auto`，PDF 自动悬浮右下角，减少和 PDF 自身页码 / 目录工具栏冲突。'],
      ['`beforeOperation`', '工具栏层统一前置校验，会在 `options.beforeOperation` 后执行。返回 `false` 或抛错都会取消本次操作。'],
      ['`beforeDownload` / `beforePrint` / `beforeExportHtml`', '单按钮前置校验；适合下载权限、打印审计、导出水印确认等细粒度业务规则。']
    ]
  }
  return [
    ['`toolbar: false`', 'Hides the built-in toolbar without disabling controller APIs such as download, print, export, and zoom. Use this for a fully custom business toolbar.'],
    ['`toolbar: true`', 'Uses the default built-in toolbar. Download, print, HTML export, and zoom buttons are still shown only when the active renderer supports them.'],
    ['`download` / `print` / `exportHtml` / `zoom`', 'Expresses whether the host allows a button. Final availability is still computed from file type, render readiness, export adapter, and zoom provider state.'],
    ['`position`', '`auto`, `top`, or `bottom-right`. The default `auto` floats PDF actions at bottom right to avoid conflicting with the PDF page / outline toolbar.'],
    ['`beforeOperation`', 'Toolbar-level preflight that runs after `options.beforeOperation`. Returning `false` or throwing cancels the operation.'],
    ['`beforeDownload` / `beforePrint` / `beforeExportHtml`', 'Operation-specific preflight for download permission, print audit, export confirmation, and similar business rules.']
  ]
}

function onDemandRendererSection(locale, componentPackageName = '@file-viewer/vue3') {
  const officeInstallCommand = `npm i ${componentPackageName} @file-viewer/preset-office`
  const viteOfficeInstallCommand = `npm i -D @file-viewer/vite-plugin`
  const allInstallCommand = `npm i ${componentPackageName} @file-viewer/preset-all`

  if (locale === 'zh') {
    return [
      '## 工程级按需 renderer 装配',
      '',
      '快速开始的核心是先跑通组件，再明确格式能力边界。推荐先安装当前生态组件包，再按产品形态选择 `@file-viewer/preset-lite`、`@file-viewer/preset-office`、`@file-viewer/preset-engineering` 或 `@file-viewer/preset-all`。Webpack、Rspack、Rollup、Umi、传统多页应用等非 Vite 项目，优先通过 `options.preset` 或 `options.renderers` 显式注入能力；Vite 插件只是进一步省掉手动 import 并复制离线资产。',
      '',
      '```bash',
      officeInstallCommand,
      '```',
      '',
      '```ts',
      "import officePreset from '@file-viewer/preset-office'",
      '',
      'const options = {',
      '  preset: officePreset,',
      "  rendererMode: 'replace'",
      '}',
      '```',
      '',
      '需要组合办公文档与工程图纸等能力时，继续使用同一个 `preset` 字段传数组即可：',
      '',
      '```ts',
      "import officePreset from '@file-viewer/preset-office'",
      "import engineeringPreset from '@file-viewer/preset-engineering'",
      '',
      'const options = {',
      '  preset: [officePreset, engineeringPreset],',
      "  rendererMode: 'replace'",
      '}',
      '```',
      '',
      '如果只需要少数格式，也可以安装单 renderer 并传给 `options.renderers`：',
      '',
      '```ts',
      "import { pdfRenderer } from '@file-viewer/renderer-pdf'",
      '',
      'const options = {',
      '  renderers: [pdfRenderer],',
      "  rendererMode: 'replace'",
      '}',
      '```',
      '',
      'Vite 项目可以再加插件，插件会免配置发现已安装 preset、注入 virtual module，并按命中格式复制 Worker / WASM / 字体 / vendor 资源：',
      '',
      '```bash',
      viteOfficeInstallCommand,
      '```',
      '',
      '```ts',
      "import { fileViewerRenderers } from '@file-viewer/vite-plugin'",
      '',
      'export default {',
      '  plugins: [',
      '    fileViewerRenderers({',
      '      copyAssets: true',
      '      // 无需 preset 配置：插件会自动发现已安装的 @file-viewer/preset-office。',
      '    })',
      '  ]',
      '}',
      '```',
      '',
      '重度用户需要一次拥有官方 Demo 的完整能力时，直接把 preset 换成全量包；非 Vite 项目继续传 `options.preset`，Vite 配置也保持不变：',
      '',
      '```bash',
      allInstallCommand,
      '```',
      '',
      '需要自定义装配时，再显式配置插件：',
      '',
      '```ts',
      'fileViewerRenderers({',
      "  preset: 'auto',        // 同时开启源码扫描时，仍自动发现已安装 preset",
      '  scan: true,            // 识别 fileViewerFormats、data-file-viewer-formats、accept',
      "  formats: ['pdf'],      // 在已安装 preset 之外额外补充精确 renderer",
      '  copyAssets: true,',
      "  chunkStrategy: 'renderer'",
      '})',
      '```',
      '',
      '严格裁剪或组件库内部测试时，可以关闭自动注入并显式传入 virtual module：',
      '',
      '```ts',
      '// vite.config.ts',
      "fileViewerRenderers({ formats: ['pdf'], inject: false, copyAssets: true })",
      '```',
      '',
      '```ts',
      '// 业务组件入口',
      "import { configuredFileViewerRenderers } from 'virtual:file-viewer-renderers'",
      '',
      'const options = {',
      '  renderers: configuredFileViewerRenderers,',
      "  rendererMode: 'replace'",
      '}',
      '```',
      '',
      '- Vue、React、Svelte、jQuery、Vanilla JS / Pure Web 都传同一份 `options`，只是在各自生态中映射为 props、hook、action、plugin 或 `mountViewer(...)` 参数。',
      '- `preset-lite` 面向文本、Markdown、代码、图片和音视频；`preset-office` 面向 PDF / Word / Excel / PowerPoint / OFD；`preset-engineering` 面向 CAD / 3D / 绘图 / XMind / Geo / Typst / EDA / Data。',
      '- 想要最小包体时，可以不用 preset，直接安装 `@file-viewer/renderer-pdf`、`@file-viewer/renderer-word` 等单个 renderer，并通过 `options.renderers` 手动注入。',
      '- `fileViewerRenderers()` 或 `fileViewerRenderers({ copyAssets:true })` 会免配置自动发现已安装 preset；如果同时开启 `scan:true`，请使用 `preset:\'auto\'` 或 `autoPresets:true` 保留 preset 自动发现。',
      '- `scan:true` 会识别 `fileViewerFormats`、`data-file-viewer-formats` 和上传控件 `accept`，调试与打包时自动选择 renderer。',
      '- `copyAssets:true` 会复制 PDF/CAD/Typst/Archive/Data 等 worker、WASM 和 vendor 资源，满足离线和企业内网部署。',
      '- `builtinRenderers` 仍可用于高级基线控制或历史兼容；普通快速接入只需要 `preset` / `renderers` 与 `rendererMode`。',
      '- 如果打开的是支持矩阵内但未装配的格式，预览器会提示应安装的 preset / renderer；只有真正不在矩阵中的扩展名才提示不支持。',
      '- `@file-viewer/preset-all` 是全量一键方案，适合 demo、后台运维工具和企业全格式附件中心；普通业务仍建议优先选择更窄的 preset。',
      ''
    ].join('\n')
  }

  return [
    '## Engineering-Grade On-Demand Renderer Assembly',
    '',
    'The quickstart flow is: get the component running first, then make the format boundary explicit. Install the component package for the current ecosystem, then choose `@file-viewer/preset-lite`, `@file-viewer/preset-office`, `@file-viewer/preset-engineering`, or `@file-viewer/preset-all`. For Webpack, Rspack, Rollup, Umi, classic multi-page apps, and other non-Vite stacks, pass capability explicitly through `options.preset` or `options.renderers`. The Vite plugin is an optional convenience layer that removes manual imports and copies offline assets.',
    '',
    '```bash',
    officeInstallCommand,
    '```',
    '',
    '```ts',
    "import officePreset from '@file-viewer/preset-office'",
    '',
    'const options = {',
    '  preset: officePreset,',
    "  rendererMode: 'replace'",
    '}',
    '```',
    '',
    'When a product combines Office documents with engineering drawings, keep the same `preset` field and pass an array:',
    '',
    '```ts',
    "import officePreset from '@file-viewer/preset-office'",
    "import engineeringPreset from '@file-viewer/preset-engineering'",
    '',
    'const options = {',
    '  preset: [officePreset, engineeringPreset],',
    "  rendererMode: 'replace'",
    '}',
    '```',
    '',
    'For exact small cuts, install one renderer and pass it through `options.renderers`:',
    '',
    '```ts',
    "import { pdfRenderer } from '@file-viewer/renderer-pdf'",
    '',
    'const options = {',
    '  renderers: [pdfRenderer],',
    "  rendererMode: 'replace'",
    '}',
    '```',
    '',
    'Vite projects can add the plugin. It auto-discovers installed presets, injects the virtual module, and copies matching Worker / WASM / font / vendor assets:',
    '',
    '```bash',
    viteOfficeInstallCommand,
    '```',
    '',
    '```ts',
    "import { fileViewerRenderers } from '@file-viewer/vite-plugin'",
    '',
    'export default {',
    '  plugins: [',
    '    fileViewerRenderers({',
    '      copyAssets: true',
    '      // No preset option required: the plugin discovers installed @file-viewer/preset-office.',
    '    })',
    '  ]',
      '}',
      '```',
      '',
    'Heavy users that want the complete official demo capability can switch to the full preset. Non-Vite projects keep `options.preset`; the Vite config stays the same:',
    '',
    '```bash',
    allInstallCommand,
    '```',
    '',
    'Use explicit plugin options only when you need customization:',
    '',
    '```ts',
    'fileViewerRenderers({',
    "  preset: 'auto',        // keep installed preset auto-discovery while scanning source hints",
    '  scan: true,            // detects fileViewerFormats, data-file-viewer-formats, and accept',
    "  formats: ['pdf'],      // adds exact renderers outside the installed preset",
    '  copyAssets: true,',
    "  chunkStrategy: 'renderer'",
    '})',
    '```',
    '',
    'For strict custom cuts or component-library tests, disable injection and pass the virtual module explicitly:',
    '',
    '```ts',
    '// vite.config.ts',
    "fileViewerRenderers({ formats: ['pdf'], inject: false, copyAssets: true })",
    '```',
    '',
    '```ts',
    '// Application viewer entry',
    "import { configuredFileViewerRenderers } from 'virtual:file-viewer-renderers'",
    '',
    'const options = {',
    '  renderers: configuredFileViewerRenderers,',
    "  rendererMode: 'replace'",
    '}',
    '```',
    '',
    '- Vue, React, Svelte, jQuery, and Vanilla JavaScript / Pure Web all receive the same `options`; each package maps them to native props, hooks, actions, plugins, or `mountViewer(...)` parameters.',
    '- `preset-lite` covers text, Markdown, code, images, audio, and video; `preset-office` covers PDF / Word / Excel / PowerPoint / OFD; `preset-engineering` covers CAD / 3D / drawing / XMind / Geo / Typst / EDA / Data.',
    '- For the smallest custom bundle, skip presets, install individual renderers such as `@file-viewer/renderer-pdf` or `@file-viewer/renderer-word`, and pass them through `options.renderers`.',
    '- `fileViewerRenderers()` or `fileViewerRenderers({ copyAssets:true })` auto-discovers installed presets without explicit configuration. When `scan:true` is also enabled, use `preset:\'auto\'` or `autoPresets:true` to keep preset auto-discovery.',
    '- `scan:true` detects `fileViewerFormats`, `data-file-viewer-formats`, and upload `accept` hints so development and production builds select matching renderers automatically.',
    '- `copyAssets:true` copies PDF/CAD/Typst/Archive/Data workers, WASM, and vendor assets for offline and enterprise intranet deployment.',
    '- `builtinRenderers` remains available for advanced baseline control or historical compatibility. Normal quick starts only need `preset` / `renderers` plus `rendererMode`.',
    '- If a file is in the supported matrix but its renderer is not assembled, the viewer shows the recommended preset / renderer package. Truly unknown extensions still show an unsupported-format state.',
    '- `@file-viewer/preset-all` is the full one-step capability path for demos, admin tools, and enterprise all-format workbenches. Normal product surfaces should still prefer narrower presets.',
    ''
  ].join('\n')
}

function customToolbarRows(locale) {
  if (locale === 'zh') {
    return [
      ['Vanilla JS / Pure Web', '`<flyfish-file-viewer toolbar="false">` 或 `mountViewer(container, { options:{ toolbar:false }, onStateChange })`；外部 DOM 按钮可直接调用元素实例 / controller 的 `zoomIn()`、`printRenderedHtml()`、`searchDocument()` 等方法，复杂场景用 `viewer-state-change` 或 `controller.subscribe()` 同步状态。'],
      ['Vue 3', '传 `:options="{ toolbar: false }"` 隐藏内置工具栏，通过模板 `ref` 调用 `downloadOriginalFile()`、`printRenderedHtml()`、`exportRenderedHtml()`、`zoomIn()`、`zoomOut()`、`resetZoom()`；用 `@operation-availability-change` 和 `@zoom-change` 同步按钮显隐与比例。'],
      ['Vue 2.7 / 2.6', '同样设置 `toolbar:false`，通过 `$refs.viewer` 调用实例方法；监听 `@viewer-event`，在 `event.type === "operation-availability-change"` 或 `event.type === "zoom-change"` 时更新外部工具栏。'],
      ['React / React Legacy', '推荐 `useFileViewer({ options:{ toolbar:false } })`，把 `viewer.props` 传给组件，把按钮绑定到 `viewer.handle`，并读取 `viewer.state.availability` / `viewer.state.zoom` 控制禁用状态。'],
      ['jQuery', '`$("#viewer").fileViewer({ options:{ toolbar:false } })`；按钮调用 `$("#viewer").fileViewer("zoomIn")` 或通过 `getFileViewerController($("#viewer")).subscribe()` 获取能力状态。'],
      ['Svelte', '`<FileViewer bind:this={viewer} options={{ toolbar:false }} />`；按钮直接调用 `viewer.zoomIn()`、`viewer.printRenderedHtml()`，并用 `on:viewerEvent` / `onStateChange` 同步状态。']
    ]
  }
  return [
    ['Vanilla JS / Pure Web', 'Use `<flyfish-file-viewer toolbar="false">` or `mountViewer(container, { options:{ toolbar:false }, onStateChange })`; custom DOM buttons can call `zoomIn()`, `printRenderedHtml()`, `searchDocument()`, and other element / controller methods directly. Use `viewer-state-change` or `controller.subscribe()` for advanced state sync.'],
    ['Vue 3', 'Pass `:options="{ toolbar: false }"`, call `downloadOriginalFile()`, `printRenderedHtml()`, `exportRenderedHtml()`, `zoomIn()`, `zoomOut()`, and `resetZoom()` through the template ref, and sync buttons with `@operation-availability-change` plus `@zoom-change`.'],
    ['Vue 2.7 / 2.6', 'Use `toolbar:false`, call instance methods through `$refs.viewer`, and listen to `@viewer-event` for `operation-availability-change` or `zoom-change`.'],
    ['React / React Legacy', 'Prefer `useFileViewer({ options:{ toolbar:false } })`; pass `viewer.props` to the component, bind custom buttons to `viewer.handle`, and read `viewer.state.availability` / `viewer.state.zoom`.'],
    ['jQuery', 'Use `$("#viewer").fileViewer({ options:{ toolbar:false } })`; buttons can call `$("#viewer").fileViewer("zoomIn")` or read capability state through `getFileViewerController($("#viewer")).subscribe()`.'],
    ['Svelte', 'Use `<FileViewer bind:this={viewer} options={{ toolbar:false }} />`; buttons call `viewer.zoomIn()` / `viewer.printRenderedHtml()`, with `on:viewerEvent` or `onStateChange` for state sync.']
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
      ['`search-change` / `location-change` / `zoom-change` / `view-state-change`', '搜索命中、定位锚点、缩放状态和完整视图快照变化时触发，用于外层同步 UI、投屏或恢复阅读进度。']
    ]
  }
  return [
    ['`load-start` / `hooks.onLoadStart`', 'Fires when parsing or downloading starts. Context includes filename, type, source, version, URL, File, and size.'],
    ['`load-complete` / `hooks.onLoadComplete`', 'Fires when the current document has rendered. Context includes duration, source data, and version.'],
    ['`unload-start` / `hooks.onUnloadStart`', 'Fires before replace, reset, or component unmount so external state or resources can be saved.'],
    ['`unload-complete` / `hooks.onUnloadComplete`', 'Fires after the previous document is released. The reason is `replace`, `reset`, or `component-unmount`.'],
    ['`operation-before` / `operation-cancel`', 'Fires around download, print, HTML export, and zoom actions. Returning `false` from `beforeOperation` cancels the action.'],
    ['`operation-availability-change`', 'Fires when download, print, HTML export, or zoom support changes for the active format.'],
    ['`search-change` / `location-change` / `zoom-change` / `view-state-change`', 'Fires when search matches, document anchors, zoom state, or full view-state snapshots change so host UIs, display screens, and reading-position restore flows can stay in sync.']
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
      ['PDF / DOCX / Excel / PPTX', '按需配置 `options.pdf.workerUrl`、`options.pdf.cMapUrl`、`options.pdf.wasmUrl`、`options.pdf.standardFontDataUrl`、`options.docx.workerUrl`、`options.docx.workerJsZipUrl`、`options.spreadsheet.workerUrl`、`options.presentation.workerUrl` / `options.presentation.workerType`；PDF 默认探测真实静态 Worker，不可用时懒加载包内 handler 兜底；DOCX 默认自动选择 Worker 或主线程解析，Electron `file://` 等本地不安全协议会自动回退；Excel 默认 `worker: auto`，大文件达到 `workerAutoThreshold` 自动启用 Worker，列宽拖拽可通过 `options.spreadsheet.resizableColumns` 显式开启；PPTX 默认按需创建模块 Worker，严格 CSP、旧 WebView 或自托管 CDN 场景可固定 Worker 地址。'],
      ['Typst / SQLite / Archive', '按需配置 Typst compiler/renderer WASM、`data.sqlWasmUrl`、`archive.workerUrl` / `archive.wasmUrl`；Typst 仅使用本地 WASM 真实渲染，不访问公共 CDN。'],
      ['Drawing', 'Draw.io 默认使用随 viewer assets 分发的官方 diagrams.net 离线 viewer；路径特殊时可通过 `options.drawing.viewerScriptUrl` 覆盖，`preferOfficial:false` 才切到内置 SVG 兜底。'],
      ['离线部署', '运行时不依赖公共 CDN 或第三方在线资源；`file-viewer-copy-assets` 会复制 PDF、CAD、Typst、SQLite、压缩包、Draw.io、DOCX worker/JSZip、PPTX worker 和 Office worker/vendor 资产。'],
      ['部署原则', '默认只在命中特定格式时异步加载对应依赖；没有命中的格式不会拉取重型 Worker、WASM 或解析库。']
    ]
  }
  return [
    ['Shared viewer assets', 'The Pure Web package ships `file-viewer-copy-assets` to copy workers, WASM, vendor files, and examples into your static directory.'],
    ['CAD / DWG / DXF / DWF', 'Configure `options.cad.wasmPath`, `workerUrl`, `dwfWasmUrl`, and `dxfEncoding` for self-hosted or intranet deployment.'],
    ['PDF / DOCX / Excel / PPTX', 'Configure `options.pdf.workerUrl`, `options.pdf.cMapUrl`, `options.pdf.wasmUrl`, `options.pdf.standardFontDataUrl`, `options.docx.workerUrl`, `options.docx.workerJsZipUrl`, `options.spreadsheet.workerUrl`, and `options.presentation.workerUrl` / `options.presentation.workerType`; PDF probes the real static worker first and lazy-loads the packaged handler when unavailable; DOCX chooses worker or main-thread parsing automatically, Electron `file://` and other unsafe local protocols fall back without user configuration; Excel defaults to `worker: auto`, enabling Worker automatically for files at or above `workerAutoThreshold`, and header drag column resizing is controlled by `options.spreadsheet.resizableColumns`; PPTX creates a module Worker on demand and can pin the worker URL/type for strict CSP, legacy WebViews, or self-hosted CDNs.'],
    ['Typst / SQLite / Archive', 'Configure Typst compiler/renderer WASM, `data.sqlWasmUrl`, and `archive.workerUrl` / `archive.wasmUrl` as needed; Typst renders through local WASM only and never falls back to a public CDN.'],
    ['Drawing', 'Draw.io uses the official diagrams.net offline viewer shipped with viewer assets by default; override `options.drawing.viewerScriptUrl` for custom paths, or set `preferOfficial:false` for the built-in SVG fallback.'],
    ['Offline deployment', 'Runtime preview code does not depend on public CDN or third-party online assets; `file-viewer-copy-assets` copies PDF, CAD, Typst, SQLite, archive, Draw.io, DOCX worker/JSZip, PPTX worker, and Office worker/vendor assets.'],
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

function generatedWrapperBlock(locale, wrapper) {
  const template = readmeTemplate.locales[locale]
  const componentPackageName = wrapper?.packageName || '@file-viewer/vue3'

  if (locale === 'zh') {
    return [
      wrapperMarkers.start,
      `## ${template.wrapperEcosystemHeading}`,
      '',
      '所有标准组件包都只共享 `@file-viewer/core` 这个总底座，不依赖其他框架组件实现。core 负责格式矩阵、资源解析、renderer 协议、事件、操作 API、搜索、缩放、打印和导出；PDF、Word、PPTX、CAD、Typst 等重型链路通过独立 renderer 或 preset 显式装配；各框架组件包自己维护本地 controller、组件生命周期、类型出口和生态交互。',
      '',
      markdownTable(
        template.wrapperMatrixHeaders,
        wrapperRows('zh')
      ),
      '',
      `## ${template.wrapperFormatHeading}`,
      '',
      `共享格式矩阵当前覆盖 ${rendererDefinitions.length} 条预览链路、${supportedExtensions.length} 个扩展名。完整能力通过 renderer / preset 按需装配，组件层只做生态适配，不互相嵌套。`,
      '',
      markdownTable(
        template.formatMatrixHeaders,
        rendererRows('zh')
      ),
      '',
      onDemandRendererSection('zh', componentPackageName),
      '## 统一参数与事件',
      '',
      '所有生态组件都围绕同一套 `ViewerMountOptions` 与 `FileViewerOptions` 工作，只是映射到各自框架的 props、事件、ref、action 或插件 API。',
      '',
      markdownTable(['参数', '说明'], mountOptionRows('zh')),
      '',
      '## 实际组件属性',
      '',
      '下面列的是每个标准组件包当前真实暴露的属性、事件和控制入口。需要 `buffer`、`name`、`type`、`size` 这类命令式挂载参数时，优先选择 Vanilla JS / Pure Web、React、Svelte、jQuery 或 Vue2 组件；Vue3 声明式组件保持 `url` / `file` / `options` 的简洁入口，复杂二进制来源请包装成带文件名的 `File`。',
      '',
      markdownTable(['组件', '实际属性 / 入口', '事件入口', '定制入口'], componentSurfaceRows('zh')),
      '',
      markdownTable(['Options 字段', '说明'], viewerOptionRows('zh')),
      '',
      '## 工具栏定制',
      '',
      markdownTable(['配置', '说明'], toolbarOptionRows('zh')),
      '',
      '完全自定义工具栏时，推荐关闭内置工具栏并使用组件 ref / controller 暴露的标准 API。不要在预览器外层用 CSS `transform: scale()` 做缩放；PDF、Excel、CAD、canvas 和文本层格式都应通过内部缩放 provider 保持坐标正确。',
      '',
      '缩放状态由各格式 renderer 的内部 provider 上报。首屏自适应、容器尺寸变化或 PDF / Word / 图片等异步布局完成后，内置工具栏会显示真实缩放比例，而不是固定显示 `100%`；自定义工具栏也应监听 `zoom-change` / `operation-availability-change`，或读取 `getZoomState()` / `getOperationAvailability()`。',
      '',
      '视图状态同步用于投屏、双端协同和恢复阅读进度。所有标准 renderer loader 都会获得通用 view-state provider，至少记录 `renderer`、缩放和滚动位置；PDF、XMind、Geo、3D、CAD 等高交互路径会补充页码、导航、画布 pan、地图中心、相机视角或底层视图快照。初始化可传 `options.initialViewState`，运行中监听 `view-state-change`；Pure Web / Vue3 controller 还可直接调用 `getViewState()` 与 `applyViewState(state, { source: "api", action: "restore" })`。',
      '',
      markdownTable(['生态', '推荐方式'], customToolbarRows('zh')),
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
      '完整参数、生命周期 hooks、beforeOperation、主题、水印、搜索、缩放、打印和导出说明见官方文档: https://doc.file-viewer.app/',
      '',
      '在线 Demo: https://demo.file-viewer.app/ 。License: Apache-2.0。二开或商用请保留 Flyfish Viewer 来源说明；如果修复了通用兼容问题，也欢迎贡献回对应组件仓库。',
      wrapperMarkers.end
    ].join('\n')
  }

  return [
    wrapperMarkers.start,
    `## ${template.wrapperEcosystemHeading}`,
    '',
    'Every standard component package shares `@file-viewer/core` as the only common foundation, and no framework component package depends on another framework implementation. Core owns format metadata, source loading, the renderer protocol, events, operation APIs, search, zoom, print, and export. Heavy PDF, Word, PPTX, CAD, Typst, and similar pipelines are assembled explicitly through renderer packages or presets; each framework package owns its local controller, component lifecycle, type exports, and ecosystem-specific interaction layer.',
    '',
    markdownTable(
      template.wrapperMatrixHeaders,
      wrapperRows('en')
    ),
    '',
    `## ${template.wrapperFormatHeading}`,
    '',
    `The shared format matrix currently covers ${rendererDefinitions.length} preview pipelines and ${supportedExtensions.length} file extensions. Full capability is assembled through renderer packages or presets, while component packages only adapt their own ecosystem without nesting through another framework implementation.`,
    '',
    markdownTable(
      template.formatMatrixHeaders,
      rendererRows('en')
    ),
    '',
    onDemandRendererSection('en', componentPackageName),
    '## Shared Options And Events',
    '',
    'Every ecosystem package uses the same `ViewerMountOptions` and `FileViewerOptions` semantics, mapped to framework-native props, events, refs, actions, or plugin APIs.',
    '',
    markdownTable(['Option', 'Description'], mountOptionRows('en')),
    '',
    '## Actual Component Props',
    '',
    'The table below lists the real props, event channel, and customization entry for every standard package. If you need imperative mount fields such as `buffer`, `name`, `type`, or `size`, prefer Vanilla JavaScript / Pure Web, React, Svelte, jQuery, or Vue 2. The Vue 3 declarative component intentionally keeps the compact `url` / `file` / `options` entry; wrap raw binary input as a named `File` when extension detection matters.',
    '',
    markdownTable(['Component', 'Actual props / entry', 'Event channel', 'Customization entry'], componentSurfaceRows('en')),
    '',
    markdownTable(['Options Field', 'Description'], viewerOptionRows('en')),
    '',
    '## Toolbar Customization',
    '',
    markdownTable(['Config', 'Description'], toolbarOptionRows('en')),
    '',
    'For fully custom toolbars, hide the built-in toolbar and call the standard ref / controller APIs from your own UI. Do not implement zoom with an outer CSS `transform: scale()`; PDF, Excel, CAD, canvas-based, and text-layer renderers should use their internal zoom providers to keep coordinates correct.',
    '',
    'Zoom state is reported by each renderer provider. After first-screen fit, container resize, or asynchronous PDF / Word / image layout, built-in toolbars show the real scale instead of assuming `100%`. Custom toolbars should listen to `zoom-change` / `operation-availability-change`, or read `getZoomState()` / `getOperationAvailability()`.',
    '',
    'View-state sync is designed for projection systems, remote-control displays, side-by-side review, and reading-position restore. Every standard renderer loader gets a generic view-state provider that records at least `renderer`, zoom, and scroll position; PDF, XMind, Geo, 3D, and CAD add page, navigation, canvas pan, map center, camera, or native view snapshots. Pass `options.initialViewState` for first render, listen to `view-state-change` while running, and use `getViewState()` / `applyViewState(state, { source: "api", action: "restore" })` on Pure Web / Vue3 controllers when an imperative restore API is needed.',
    '',
    markdownTable(['Ecosystem', 'Recommended pattern'], customToolbarRows('en')),
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
    'See the official documentation for options, lifecycle hooks, beforeOperation, theme, watermark, search, zoom, print, and export APIs: https://doc.file-viewer.app/',
    '',
    'Online demo: https://demo.file-viewer.app/. License: Apache-2.0. For second development or commercial use, keep clear Flyfish Viewer attribution; shared compatibility fixes are welcome in the matching component repository.',
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
      '下面内容由 `ecosystem/wrappers.json` 和 `packages/core/src/registry/formats.ts` 自动生成。开源总仓库同步 README 时会携带同一份索引，确保用户可以从任意入口找到标准 npm 包、历史兼容包、分散组件仓库和 release 下载物。',
      '',
      `核心底座包: \`${core.packageName}\`。core 源码已公开，GitHub: ${core.github}，Gitee: ${core.gitee}。开源总仓库提供可运行的主 Demo 源码、core、标准组件包、兼容包、文档源码和 release 索引；完整 Demo、component demo、文档站和样例构建产物通过 GitHub Release 或 Cloudflare Pages 分发，避免普通 clone 被静态产物拖大。私有 Gitea \`main\` 是完整原始聚合仓，用于统一自动化、内部集成历史、打赏支持和优先技术支持，不等同于 GitHub 开源总仓库。`,
      '',
      markdownTable(
        template.wrapperMatrixHeaders,
        wrapperRows('zh')
      ),
      '',
      onDemandRendererSection('zh'),
      '### 组件属性与工具栏定制摘要',
      '',
      '每个生态包都暴露原生接入方式。Vanilla JS / Pure Web 优先面向非框架、Custom Element 和 script 标签场景；Vue3 保持轻量声明式 props；React、Svelte、jQuery 和 Vue2 适合需要 `buffer`、`name`、`type`、`size` 等命令式挂载参数的场景。完整示例见官方文档: https://doc.file-viewer.app/guide/ecosystem',
      '',
      markdownTable(['组件', '实际属性 / 入口', '事件入口', '定制入口'], componentSurfaceRows('zh')),
      '',
      '内置工具栏可直接使用，也可以通过 `toolbar:false` 进入 headless 操作模式，自行用组件 ref、hook、controller、action 或 jQuery plugin method 组装业务工具栏。',
      '',
      markdownTable(['工具栏配置', '说明'], toolbarOptionRows('zh')),
      '',
      '缩放状态由各格式 renderer 的内部 provider 上报。首屏自适应、容器尺寸变化或 PDF / Word / 图片等异步布局完成后，内置工具栏会显示真实缩放比例，而不是固定显示 `100%`；自定义工具栏也应监听 `zoom-change` / `operation-availability-change`，或读取 `getZoomState()` / `getOperationAvailability()`。',
      '',
      '视图状态同步用于投屏、双端协同和恢复阅读进度。所有通过标准 renderer loader 挂载的格式都会获得通用 view-state provider，至少能记录 `renderer`、当前缩放和滚动位置；PDF、XMind、Geo、3D、CAD 等高交互路径会补充页码、导航、画布 pan、地图中心、相机视角或底层视图快照。初始化可传 `options.initialViewState`，运行中监听 `view-state-change`；Pure Web / Vue3 controller 可直接调用 `getViewState()` 和 `applyViewState(state, { source: "api", action: "restore" })`。',
      '',
      `共享格式矩阵当前声明 ${rendererDefinitions.length} 条预览链路、${supportedExtensions.length} 个扩展名。完整能力通过 renderer / preset 按需装配，格式说明见本文“支持格式”和官方文档: https://doc.file-viewer.app/guide/formats`,
      publicMarkers.end
    ].join('\n')
  }

  return [
    publicMarkers.start,
    `## ${template.publicEcosystemHeading}`,
    '',
    'This section is generated from `ecosystem/wrappers.json` and `packages/core/src/registry/formats.ts`. The open-source main repository carries the same index so users can find standard npm packages, historical compatibility packages, split component repositories, and release downloads from one place.',
    '',
    `Core foundation package: \`${core.packageName}\`. Core source is public: ${core.github} and ${core.gitee}. The open-source aggregate repository provides runnable main demo source, core, standard component packages, compatibility aliases, documentation source, and release indexes; full demo, component demo, docs, and sample-file builds are distributed through GitHub Releases or Cloudflare Pages so normal clones stay practical. Private Gitea \`main\` is the complete original aggregate workspace for unified automation, integration history, sponsorship, and priority support, and is not the same as the GitHub open-source aggregate.`,
    '',
    markdownTable(
      template.wrapperMatrixHeaders,
      wrapperRows('en')
    ),
    '',
    onDemandRendererSection('en'),
    '### Component Props and Toolbar Customization Summary',
    '',
    'Every ecosystem package exposes a native integration surface. Vanilla JavaScript / Pure Web is the first stop for framework-free pages, Custom Elements, and script tags; Vue 3 keeps a compact declarative prop API; React, Svelte, jQuery, and Vue 2 are better when you need imperative mount fields such as `buffer`, `name`, `type`, and `size`. See the full examples in the official documentation: https://doc.file-viewer.app/guide/ecosystem',
    '',
    markdownTable(['Component', 'Actual props / entry', 'Event channel', 'Customization entry'], componentSurfaceRows('en')),
    '',
    'The built-in toolbar can be used as-is, or hidden with `toolbar:false` so your own UI can call the same ref, hook, controller, action, or jQuery plugin APIs.',
    '',
    markdownTable(['Toolbar config', 'Description'], toolbarOptionRows('en')),
    '',
    'Zoom state is reported by each renderer provider. After first-screen fit, container resize, or asynchronous PDF / Word / image layout, built-in toolbars show the real scale instead of assuming `100%`. Custom toolbars should listen to `zoom-change` / `operation-availability-change`, or read `getZoomState()` / `getOperationAvailability()`.',
    '',
    'View-state sync is designed for projection systems, remote-control displays, side-by-side review, and reading-position restore. Every standard renderer path registers a generic provider that records at least `renderer`, zoom, and scroll position; PDF, XMind, Geo, 3D, and CAD add page, navigation, canvas pan, map center, camera, or native view snapshots. Pass `options.initialViewState` for first render, listen to `view-state-change` while running, and call `getViewState()` / `applyViewState(state, { source: "api", action: "restore" })` on Pure Web / Vue3 controllers when an imperative restore API is needed.',
    '',
    `The shared format matrix currently declares ${rendererDefinitions.length} preview pipelines and ${supportedExtensions.length} file extensions. Full capability is assembled through renderer packages or presets. See the full format guide in this README and the official documentation: https://doc.file-viewer.app/guide/formats`,
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
    const next = syncBlock(current, generatedWrapperBlock(locale, wrapper))
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
