# 纯 JS 集成

<div class="doc-kicker">For Plain Web Apps</div>

<p class="doc-lead">
  纯 JS 包提供 iframe 创建、挂载、URL 参数拼接和二进制推送工具。它同样只走私有化静态部署，
  默认加载宿主项目里的 <code>/file-viewer/index.html</code>。
</p>

## 安装

推荐用 `npm` 安装，安装脚本会自动把私有化 viewer 静态产物复制到宿主项目:

```bash
npm install --save @flyfish-group/file-viewer-web@1.0.22
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
      archive: { workerUrl: '/vendor/libarchive/worker-bundle.js', cache: true }
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
  src="/vendor/file-viewer/index.html?url=%2Ffiles%2Fdemo.docx&__flyfish_viewer_version=1.0.22"
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
        '&__flyfish_viewer_version=1.0.22'
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
| `postFileToViewer(frame, options)` | 主动把 `Blob` / `ArrayBuffer` 推送给 iframe |
| `syncViewerFrame(frame, options)` | 更新 iframe 地址 |
| `copyViewerAssets(options)` | Node 环境下复制 viewer 静态产物 |

`options` 会被序列化到 iframe 查询参数中，当前支持:

- `theme`: 支持 `light`、`dark`、`system`。默认 `system` 跟随系统；浅色业务系统建议传 `light`。
- `toolbar`: 声明是否允许下载原文件、完整打印和导出 HTML；`position` 支持 `auto`、`top`、`bottom-right`，默认 `auto`，PDF 会自动悬浮到右下角；打印按钮仍会按当前格式和渲染链路动态显隐。
- `watermark`: 配置文字或图片水印。
- `archive`: 配置 libarchive worker、IndexedDB 缓存、压缩包体积上限和内部文件预览上限。

生命周期、操作能力变化和内置操作事件会通过 `onEvent` 回传给宿主，事件类型包括 `flyfish-viewer:lifecycle` 和 `flyfish-viewer:operation`，其中 `operation-availability-change` 可用于同步外部下载、打印和导出按钮。由于 iframe 查询参数不能序列化函数，按钮前置校验请优先在 Vue2 / Vue3 组件模式使用 `options.beforeOperation`；iframe 模式适合做日志、审计和状态同步。

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
