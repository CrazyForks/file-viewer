# @flyfish-group/file-viewer-web

纯 Web 文件预览组件。只提供私有化部署路线: npm 包随包携带 Vue 基线 viewer 产物；使用 `npm install` 或已允许 pnpm 安装脚本后，会自动复制到宿主项目的 `public/file-viewer`，组件默认加载 `/file-viewer/index.html`。

```bash
npm install @flyfish-group/file-viewer-web@1.0.20
```

pnpm 10 默认会拦截依赖包的 `postinstall`。如果安装后提示 `Ignored build scripts: @flyfish-group/file-viewer-web`，请执行 `pnpm approve-builds` 允许该包，或运行 `pnpm exec file-viewer-copy-assets ./public/file-viewer`。复制脚本会先清空目标目录再复制，避免 `index.html` 和 `assets/*` hash 不同版本导致动态 import 404。

标准接入只有两条: 使用 `mountViewerFrame` 加载安装时复制出来的 `/file-viewer/index.html`，或使用 `file-viewer-copy-assets` 把完整 viewer 目录复制到自定义静态路径后传入 `viewerUrl`。只复制入口 HTML、混用不同版本 hash 文件、或让服务端把缺失 JS 回退成 HTML 都不属于支持范围。

```ts
import { mountViewerFrame } from '@flyfish-group/file-viewer-web'

mountViewerFrame(document.getElementById('viewer')!, {
  url: 'https://example.com/demo.pdf',
  onEvent(event) {
    console.log(event.type, event.event, event.payload)
  },
  options: {
    toolbar: true,
    watermark: { text: '内部预览', opacity: 0.14 },
    archive: { workerUrl: '/file-viewer/vendor/libarchive/worker-bundle.js', cache: true }
  }
})
```

鉴权文件可以由宿主系统先下载成 `Blob`，再通过 `file` 和 `name` 推送给 iframe。

```ts
const blob = await fetch('/api/files/contract', { credentials: 'include' }).then(res => res.blob())

mountViewerFrame(document.getElementById('viewer')!, {
  file: blob,
  name: 'contract.pdf'
})
```

如果你的静态目录不是 `public/file-viewer`，可以在安装后手动复制一次:

```bash
npx file-viewer-copy-assets ./public/vendor/file-viewer
```

然后在组件里覆盖 `viewerUrl`:

```ts
mountViewerFrame(el, {
  viewerUrl: '/vendor/file-viewer/index.html',
  url
})
```

`mountViewerFrame` 会默认给 iframe 地址追加 `__flyfish_viewer_version`，用于绕开浏览器或代理缓存里的旧 `index.html`。如果你的静态服务已经严格设置 HTML 不缓存，可以传 `cacheKey: false` 关闭。

无法使用 helper 的纯手写页面，也应沿用同一套 iframe 协议:

```html
<iframe
  src="/vendor/file-viewer/index.html?url=%2Ffiles%2Fdemo.docx&__flyfish_viewer_version=1.0.20"
  style="width: 100%; height: 100vh; border: 0"
></iframe>
```

`options` 会透传给 Vue 基线预览器，可配置下载/打印/导出 HTML 操作栏、文字或图片水印，以及压缩包预览的 `libarchive.js` Worker、IndexedDB 缓存和体积上限。打印按钮会按当前格式和渲染链路动态显隐；Word / PDF 打印和导出会生成完整页面，不依赖当前 iframe 视口或已渲染 canvas。生命周期、操作能力变化和内置操作事件会通过 `onEvent` 回传给宿主，适合记录加载耗时、审计下载/打印尝试和同步外部状态。
