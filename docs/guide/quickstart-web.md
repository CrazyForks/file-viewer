# 纯 JS 集成

<div class="doc-kicker">Vanilla JavaScript</div>

<p class="doc-lead">
  纯 JS 包现在提供原生 <code>&lt;flyfish-file-viewer&gt;</code> 组件和 <code>mountViewer(container, options)</code> 两种标准入口。
  推荐优先使用 Custom Element；需要完全命令式控制时再使用 controller 挂载。
</p>

## 标准安装

新项目优先使用标准包名:

```bash
npm install @file-viewer/web
```

历史包名仍同步维护:

```bash
npm install @flyfish-group/file-viewer-web
```

```html
<flyfish-file-viewer
  id="viewer"
  src="/files/demo.pdf"
  filename="demo.pdf"
  theme="light"
  toolbar-position="bottom-right"
  style="height: 720px"
></flyfish-file-viewer>
```

```ts
import { defineFileViewerElement } from '@file-viewer/web'

defineFileViewerElement()

const viewer = document.getElementById('viewer') as HTMLElement & {
  zoomIn(): Promise<unknown>
  printRenderedHtml(): Promise<void>
}

viewer.addEventListener('viewer-event', event => {
  console.log((event as CustomEvent).detail.type)
})

viewer.zoomIn()
```

元素容器需要有明确高度，预览器会填满组件本身。

## 命令式挂载

需要在非组件化脚本里动态创建、替换或销毁预览器时，可以直接使用 `mountViewer`。它返回完整 controller:

```ts
import { mountViewer } from '@file-viewer/web'

const controller = mountViewer(document.getElementById('viewer')!, {
  url: '/files/demo.pdf',
  options: {
    theme: 'light',
    toolbar: { position: 'bottom-right' },
    archive: { cache: true, workerTimeoutMs: 30000 }
  },
  onEvent(event) {
    console.log(event.type, event.payload)
  }
})

controller.reload()
```

## 鉴权文件

业务系统可以先完成登录态、权限或签名校验，再把文件二进制交给预览器。传 `Blob` 或 `ArrayBuffer` 时请同时传 `name`:

```ts
const blob = await fetch('/api/files/contract', { credentials: 'include' }).then(res => res.blob())

const viewer = document.querySelector('flyfish-file-viewer')
viewer.file = blob
viewer.name = 'contract.pdf'
viewer.options = { theme: 'light' }
```

## 构建工具接入

Vite、Webpack、Rspack、Rollup 等构建工具可以直接使用 ESM 包入口。构建工具会负责解析 `@file-viewer/web`、Vue 和底层预览依赖:

```ts
import { defineFileViewerElement } from '@file-viewer/web'

defineFileViewerElement()
```

不要把 `dist/index.js` 复制到 public 后直接用浏览器加载。该入口保留了包依赖关系，面向构建工具和包管理器；无构建工具页面请使用下面的 IIFE 全局包。

## 通过普通 script 引入

IIFE 包会暴露 `window.FlyfishFileViewerWeb`:

```bash
cp ./node_modules/@file-viewer/web/dist/flyfish-file-viewer-web.iife.js ./public/vendor/file-viewer-web/flyfish-file-viewer-web.iife.js
```

```html
<script src="/vendor/file-viewer-web/flyfish-file-viewer-web.iife.js"></script>

<flyfish-file-viewer
  src="/files/demo.docx"
  filename="demo.docx"
  theme="light"
  toolbar-position="bottom-right"
  style="display:block;height:720px"
></flyfish-file-viewer>
```

IIFE 会自动执行 `defineFileViewerElement()` 并暴露 `window.FlyfishFileViewerWeb`。如果你更喜欢命令式方式，仍然可以使用 `window.FlyfishFileViewerWeb.mountViewer(container, options)`。

## 自托管 Worker / WASM 资源

大多数业务只需要安装包即可。内网、CSP 严格、静态资源前缀特殊或希望固定重型资源路径时，建议把 viewer assets 复制到业务自己的静态目录:

```bash
npx file-viewer-copy-assets ./public/file-viewer
```

复制命令会写入 `flyfish-viewer-assets.json`，并校验 PDF、archive、DOCX、Excel、Draw.io、CAD、Typst、SQLite 等 worker/WASM/vendor 静态资源是否齐全。预览运行时不会默认访问公共 CDN 或第三方在线资源；部署路径特殊时，可以在 `options.pdf.workerUrl`、`options.pdf.cMapUrl`、`options.pdf.wasmUrl`、`options.pdf.standardFontDataUrl`、`options.drawing.viewerScriptUrl`、`options.archive.workerUrl`、`options.archive.wasmUrl`、`options.docx.workerUrl`、`options.docx.workerJsZipUrl`、`options.spreadsheet.workerUrl`、`options.typst.compilerWasmUrl`、`options.typst.rendererWasmUrl`、`options.data.sqlWasmUrl` 等参数中指定自托管地址。Draw.io 默认使用随 viewer assets 分发的官方 diagrams.net 离线 viewer，并在官方 viewer 不可用时回退内置 SVG。

## API

| API | 说明 |
| --- | --- |
| `<flyfish-file-viewer>` | 原生 Web Component，可用属性、property、事件和实例方法控制完整预览器 |
| `defineFileViewerElement(tagName?)` | 注册 Custom Element；IIFE 包会自动注册默认标签 |
| `mountViewer(container, options)` | 挂载预览器并返回 controller |
| `controller.update(options)` | 更新文件或运行参数 |
| `controller.reload()` | 重新加载当前文件 |
| `controller.destroy()` | 卸载预览器并释放资源 |
| `createViewerControllerHandle()` | 创建可复用的 controller handle，适合框架组件包封装 |

### Custom Element 属性和事件

| 类型 | 支持项 |
| --- | --- |
| HTML 属性 | `src` / `url`、`filename` / `name`、`type`、`size`、`theme`、`toolbar`、`toolbar-position`、`watermark`、`search`、`options` |
| JS property | `url`、`file`、`buffer`、`name`、`filename`、`type`、`size`、`options`、`coreOptions`、`source` |
| 原生事件 | `viewer-ready`、`viewer-event`、`viewer-state-change`、`viewer-error`，以及 `viewer-load-complete`、`viewer-search-change` 等按事件类型派发的细分事件 |
| 实例方法 | `load`、`update`、`reload`、`destroy`、`downloadOriginalFile`、`printRenderedHtml`、`exportRenderedHtml`、`zoomIn`、`zoomOut`、`resetZoom`、`searchDocument`、`nextSearchResult`、`previousSearchResult`、`collectDocumentAnchors`、`scrollToAnchor`、`scrollToLine`、`getDocumentTextChunks`、`getOperationAvailability`、`getZoomState`、`getSearchState`、`subscribe` |

`options` 与 Vue、React、jQuery、Svelte 标准组件包保持一致，支持主题、水印、搜索、统一缩放、下载、打印、导出 HTML、beforeOperation 前置校验、生命周期 hooks、压缩包缓存和格式专项参数。

## 常见问题

| 现象 | 处理方式 |
| --- | --- |
| 控制台提示裸包名无法解析 | 使用构建工具打包，或在无构建页面使用 IIFE 全局包 |
| 文件接口 401 | 由宿主页面先 `fetch` 成 `Blob`，再传 `file` + `name` |
| 压缩包或 CAD 卡在资源加载 | 运行 `file-viewer-copy-assets`，并检查 worker/WASM 的 MIME、CSP 和访问路径 |
| 页面空白 | 确认父容器有稳定高度，且传入文件带有可识别扩展名 |
