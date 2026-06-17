# 纯 JS 集成

<div class="doc-kicker">For Plain Web Apps</div>

<p class="doc-lead">
  纯 JS 包提供 iframe 创建、挂载、URL 参数拼接和二进制推送工具。它同样只走私有化静态部署，
  默认加载宿主项目里的 <code>/file-viewer/index.html</code>。
</p>

## 安装

推荐用 `npm` 安装，安装脚本会自动把私有化 viewer 静态产物复制到宿主项目:

```bash
npm install --save @flyfish-group/file-viewer-web@1.0.26
```

如果使用 pnpm 10，可能会看到 `Ignored build scripts: @flyfish-group/file-viewer-web`。这是 pnpm 的依赖脚本审批机制，不是包安装失败。请执行:

```bash
pnpm approve-builds
```

并允许 `@flyfish-group/file-viewer-web`。也可以安装后手动运行:

```bash
pnpm exec file-viewer-copy-assets ./public/file-viewer
```

使用 `npm install` 或已允许 pnpm 安装脚本后，包内的 Vue3 基线 viewer 产物会自动复制到宿主项目的 `public/file-viewer`。上线时请确保这个目录会被你的构建工具作为静态资源发布。

复制脚本默认会先清空目标目录再复制完整 viewer 产物，确保 `index.html`、`assets/*`、`vendor/*` 来自同一次构建。不要只复制 `index.html`，否则异步 chunk 会因为 hash 不一致返回 404 或 `text/html`。

## 标准接入边界

纯 JS 包只支持两种标准接入方式:

- **推荐方式:** 安装 `@flyfish-group/file-viewer-web`，允许安装脚本复制产物，然后使用 `mountViewerFrame`，默认加载 `/file-viewer/index.html`。
- **自定义静态路径:** 使用 `file-viewer-copy-assets` 把完整 viewer 目录复制到业务静态目录，再显式传入 `viewerUrl`，例如 `/vendor/file-viewer/index.html`。

以下做法不属于标准接入，不保证可用:

- 只复制 `index.html`，没有同步 `assets/*` 和 `vendor/*`。
- 目标目录里混用了不同版本的 `index.html` 和 hash chunk。
- 静态服务把不存在的 `.js`、`.wasm` 返回成 HTML fallback。
- 业务系统缓存旧 `index.html`，但服务器已经删除旧 hash 文件。

## 最短示例

```html
<div id="viewer" style="height: 100vh"></div>

<script type="module">
  import { mountViewerFrame } from '@flyfish-group/file-viewer-web'

  mountViewerFrame(document.getElementById('viewer'), {
    url: '/files/demo.pdf',
    onEvent(event) {
      console.log(event.type, event.event, event.payload)
    },
    options: {
      theme: 'light',
      toolbar: { position: 'bottom-right' },
      watermark: { text: '内部资料', opacity: 0.14 },
      archive: { cache: true, workerTimeoutMs: 30000 }
    }
  })
</script>
```

`mountViewerFrame` 会向容器里插入 iframe，并返回控制器。

```ts
const controller = mountViewerFrame(container, { url: '/files/demo.pdf' })

controller.reload()
controller.update({ url: '/files/report.docx' })
controller.destroy()
```

## 通过 script 标签引入

没有构建工具、不能把 `import` 写进业务源码、或只是在传统后台页面里接入时，有两种标准方式:

- 现代浏览器推荐使用原生 `<script type="module">` 加载 ESM helper。
- 传统页面可以直接引用 IIFE 全局包，使用 `window.FlyfishFileViewerWeb`。

两种方式加载的都只是轻量 iframe helper；真正的预览器仍然是完整的私有化 viewer 静态目录，PDF、Office、CAD、压缩包等重型渲染器继续按文件类型异步加载。

### 目录准备

先把两类静态资源放到业务站点可访问的位置:

```txt
public/
  file-viewer/
    index.html
    assets/
    vendor/
  vendor/
    file-viewer-web/
      index.js
      flyfish-file-viewer-web.iife.js
```

推荐通过 npm 安装后复制:

```bash
npm install @flyfish-group/file-viewer-web@1.0.26
npx file-viewer-copy-assets ./public/file-viewer
mkdir -p ./public/vendor/file-viewer-web
cp ./node_modules/@flyfish-group/file-viewer-web/dist/index.js ./public/vendor/file-viewer-web/index.js
cp ./node_modules/@flyfish-group/file-viewer-web/dist/flyfish-file-viewer-web.iife.js ./public/vendor/file-viewer-web/flyfish-file-viewer-web.iife.js
```

`/file-viewer/` 必须是完整目录，不能只复制 `index.html`。`/vendor/file-viewer-web/index.js` 和 IIFE 文件都只是很小的 iframe helper，用来创建 iframe、拼 URL、推送 Blob 和监听事件。

### URL 文件

```html
<div id="viewer" style="height: 720px"></div>

<script type="module">
  import { mountViewerFrame } from '/vendor/file-viewer-web/index.js'

  const controller = mountViewerFrame(document.getElementById('viewer'), {
    viewerUrl: '/file-viewer/index.html',
    url: '/files/demo.pdf',
    options: {
      theme: 'light',
      toolbar: { position: 'bottom-right' },
      search: { maxMatches: 1000 }
    },
    onEvent(event) {
      console.log('[viewer]', event.type, event.event, event.payload)
    }
  })

  window.viewerController = controller
</script>
```

### 鉴权文件或接口下载文件

```html
<div id="viewer" style="height: 720px"></div>

<script type="module">
  import { mountViewerFrame } from '/vendor/file-viewer-web/index.js'

  const response = await fetch('/api/files/contract', {
    credentials: 'include'
  })
  const blob = await response.blob()

  mountViewerFrame(document.getElementById('viewer'), {
    viewerUrl: '/file-viewer/index.html',
    file: blob,
    name: 'contract.docx',
    options: {
      theme: 'light',
      toolbar: { position: 'bottom-right' },
      watermark: { text: '内部资料', opacity: 0.14 }
    }
  })
</script>
```

传 `file` 时一定要同时传 `name`，预览器需要通过扩展名选择渲染链路。`file` 可以是 `File`、`Blob` 或 `ArrayBuffer`。

### 使用 import map 保留包名写法

如果希望 HTML 里仍然写 `@flyfish-group/file-viewer-web`，可以加 import map:

```html
<script type="importmap">
{
  "imports": {
    "@flyfish-group/file-viewer-web": "/vendor/file-viewer-web/index.js"
  }
}
</script>

<script type="module">
  import { mountViewerFrame } from '@flyfish-group/file-viewer-web'

  mountViewerFrame(document.getElementById('viewer'), {
    viewerUrl: '/file-viewer/index.html',
    url: '/files/demo.xlsx',
    options: { theme: 'light' }
  })
</script>
```

浏览器不会像 Vite、Webpack 一样自动解析裸包名；没有 import map 或构建工具时，`import '@flyfish-group/file-viewer-web'` 会失败。

### 传统 script 全局包

如果页面里已有很多普通 `<script>`，可以直接使用 IIFE 包。它会挂载 `window.FlyfishFileViewerWeb`，不要求业务脚本写 `import`:

```html
<div id="viewer" style="height: 720px"></div>

<script src="/vendor/file-viewer-web/flyfish-file-viewer-web.iife.js"></script>

<script>
  window.FlyfishFileViewerWeb.mountViewerFrame(document.getElementById('viewer'), {
    viewerUrl: '/file-viewer/index.html',
    url: '/files/demo.pptx',
    options: {
      theme: 'light',
      toolbar: { position: 'bottom-right' }
    }
  })
</script>
```

IIFE 包只提供 iframe 控制器，不会把完整预览器和重型渲染器打进业务页面。业务系统仍然要部署同版本的 `/file-viewer/` 静态目录。

仓库的 adapter demo 会随构建输出 `/manual-iife.html`，这是普通 script 标签接入的最小可运行页面；如果客户系统不使用构建工具，优先按这个页面的目录结构和调用方式对接。

本地验证可以执行下面的命令。它会先校验 adapter demo 的静态产物，再用真实浏览器打开 demo 首页、`/jquery.html`、`/svelte-action.html` 和 `/manual-iife.html`，验证 React wrapper、Pure Web wrapper、jQuery wrapper、Svelte action 与普通 script 标签全局包都能正确创建 viewer iframe。

```bash
pnpm build:adapter-demo
pnpm verify:adapter-browser-smoke
```

### CDN 只适合快速验证

也可以临时用 CDN 验证 helper:

```html
<script type="module">
  import { mountViewerFrame } from 'https://unpkg.com/@flyfish-group/file-viewer-web@1.0.26/dist/index.js'

  mountViewerFrame(document.getElementById('viewer'), {
    viewerUrl: '/file-viewer/index.html',
    url: '/files/demo.pdf'
  })
</script>
```

传统 script 也可以临时引用 CDN 上的 IIFE 包:

```html
<script src="https://unpkg.com/@flyfish-group/file-viewer-web@1.0.26/dist/flyfish-file-viewer-web.iife.js"></script>
```

生产环境仍建议自托管 `/vendor/file-viewer-web/index.js` 和 `/file-viewer/`。这样版本、缓存、CSP、跨域和内网访问都可控。

### 常见问题

| 现象 | 原因与处理 |
| --- | --- |
| `Failed to resolve module specifier '@flyfish-group/file-viewer-web'` | 浏览器不能解析裸包名。改成 `/vendor/file-viewer-web/index.js`，或配置 import map |
| `Expected a JavaScript-or-Wasm module script but the server responded with text/html` | 静态服务把缺失的 `.js` / `.wasm` 回退成了 HTML。检查路径是否存在，并关闭资源目录的 SPA fallback |
| iframe 空白或控制台出现 chunk 404 | `/file-viewer/` 没有完整复制，或 `index.html` 与 `assets/*` 不是同一次构建。重新运行 `file-viewer-copy-assets` |
| `window.FlyfishFileViewerWeb` 是 `undefined` | 普通 `<script>` 页面没有加载 IIFE 文件，或脚本路径被网关回退成 HTML。确认加载的是 `dist/flyfish-file-viewer-web.iife.js` |
| DOCX、PDF 等文件接口 401 | `url` 模式由 iframe 直接请求文件，登录态或跨域可能不同。改用宿主页面 `fetch` 后传 `file` + `name` |
| 切到暗色或工具栏位置不符合宿主 UI | 在 `options` 里显式传 `theme: 'light'`、`toolbar: { position: 'bottom-right' }` |

## 预览鉴权文件

```ts
import { mountViewerFrame } from '@flyfish-group/file-viewer-web'

const blob = await fetch('/api/files/contract', {
  credentials: 'include'
}).then(response => response.blob())

mountViewerFrame(document.getElementById('viewer')!, {
  file: blob,
  name: 'contract.pdf'
})
```

当传入 `file` 时，组件会生成 `?name=...&from=...` 的 iframe 地址，并在 iframe 加载完成后通过 `postMessage` 把二进制内容推送给预览器。

## 手写 iframe 接入

如果业务项目不能使用 npm helper，也必须遵守同一套静态目录和 iframe 协议。先复制完整 viewer 产物:

```bash
npx file-viewer-copy-assets ./public/vendor/file-viewer
```

URL 文件直接拼接 `url`:

```html
<iframe
  src="/vendor/file-viewer/index.html?url=%2Ffiles%2Fdemo.docx&__flyfish_viewer_version=1.0.26"
  style="width: 100%; height: 100vh; border: 0"
></iframe>
```

鉴权文件先由业务系统下载成 `Blob`，再使用 `name` + `from` + `postMessage`:

```html
<iframe id="viewer" style="width: 100%; height: 100vh; border: 0"></iframe>

<script>
  var frame = document.getElementById('viewer')
  var origin = window.location.origin

  fetch('/api/files/contract', { credentials: 'include' })
    .then(function (response) { return response.blob() })
    .then(function (blob) {
      frame.addEventListener('load', function () {
        frame.contentWindow.postMessage(blob, origin)
      })

      frame.src = '/vendor/file-viewer/index.html' +
        '?name=' + encodeURIComponent('contract.docx') +
        '&from=' + encodeURIComponent(origin) +
        '&__flyfish_viewer_version=1.0.26'
    })
</script>
```

仓库内置了对应的纯手写页面: `packages/demo/manual-js.html`。运行 `pnpm dev:adapters` 后访问 `/manual-js.html` 即可验证。

## 手动复制 viewer 产物

如果你的项目没有自动执行安装脚本，或者需要复制到自定义目录，可以运行:

```bash
npx file-viewer-copy-assets ./public/vendor/file-viewer
```

再指定 `viewerUrl`:

```ts
mountViewerFrame(container, {
  viewerUrl: '/vendor/file-viewer/index.html',
  url: '/files/demo.xlsx'
})
```

也可以在 Node 脚本中调用:

```ts
import { copyViewerAssets } from '@flyfish-group/file-viewer-web/node'

await copyViewerAssets({
  targetDir: 'public/vendor/file-viewer'
})
```

`mountViewerFrame` 会默认给 iframe 入口追加 `__flyfish_viewer_version` 查询参数，用于避免浏览器或代理继续使用旧 `index.html`，从而引用已经不存在的旧 hash chunk。静态服务已严格配置 HTML 不缓存时，可以传 `cacheKey: false` 关闭。

## 可用 API

| API | 说明 |
| --- | --- |
| `buildViewerSrc(options)` | 根据 `url`、`file`、`name`、`params` 构造 iframe 地址 |
| `createViewerFrame(options)` | 创建 iframe 元素 |
| `mountViewerFrame(container, options)` | 挂载 iframe 并返回控制器 |
| `mountViewer(container, options)` | `mountViewerFrame` 的标准化别名，适合纯 JS wrapper 新项目 |
| `postFileToViewer(frame, options)` | 主动把 `Blob` / `ArrayBuffer` 推送给 iframe |
| `syncViewerFrame(frame, options)` | 更新 iframe 地址 |
| `copyViewerAssets(options)` | Node 环境下复制 viewer 静态产物 |

`options` 会被序列化到 iframe 查询参数中，当前支持:

- `theme`: 支持 `light`、`dark`、`system`。默认 `system` 跟随系统；浅色业务系统建议传 `light`。
- `toolbar`: 声明是否显示下载原文件、完整打印、导出 HTML 和统一缩放按钮；`zoom` 可单独关闭缩放按钮，`position` 支持 `auto`、`top`、`bottom-right`，默认 `auto`，PDF 会自动悬浮到右下角；打印和缩放按钮仍会按当前格式和渲染链路动态显隐。
- `watermark`: 配置文字或图片水印。
- `search`: 配置搜索高亮、整词/大小写和最大命中数；PDF 等特殊格式会优先使用渲染器原生搜索，iframe 会回传 `flyfish-viewer:search` 事件。
- `ai`: 配置文本切片结构，返回行号、页码和锚点上下文，便于业务侧做向量化、溯源、来源定位和高亮，不绑定云端模型。
- `pdf.toolbar`: 控制是否显示 PDF 自身页码、缩放和旋转工具栏；文档比对等紧凑场景可以设为 `false`。
- `archive`: 配置 libarchive worker、IndexedDB 缓存、压缩包体积上限和内部文件预览上限。

生命周期、操作能力变化、缩放状态、搜索状态和当前位置会通过 `onEvent` 回传给宿主，事件类型包括 `flyfish-viewer:lifecycle`、`flyfish-viewer:operation`、`flyfish-viewer:search` 和 `flyfish-viewer:location`，其中 `operation-availability-change` 可用于同步外部下载、打印、导出和缩放按钮，`zoom-change` 可用于同步外部比例文本。由于 iframe 查询参数不能序列化函数，按钮前置校验请优先在 Vue2 / Vue3 组件模式使用 `options.beforeOperation`；iframe 模式适合做日志、审计和状态同步。

## 构建上线

上线只需要发布业务构建产物和 viewer 静态目录。默认结构是:

```txt
dist/
  index.html
  assets/
  file-viewer/
    index.html
    assets/
    vendor/
      libarchive/
        worker-bundle.js
        libarchive.wasm
```

仓库里的适配层演示可以作为上线前 smoke test:

```bash
pnpm build:adapter-demo
pnpm --filter @flyfish-group/file-viewer-demo preview
```

确认页面里的 React 和 Web 两个面板都能看到预览内容后，再部署构建产物。
