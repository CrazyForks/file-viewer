# @flyfish-group/file-viewer-react

React 文件预览组件。只提供私有化部署路线: 依赖的 `@flyfish-group/file-viewer-web` 会随包携带 Vue 基线 viewer 产物；使用 `npm install` 或已允许 pnpm 安装脚本后，会复制到宿主项目 `public/file-viewer`。React 组件默认加载 `/file-viewer/index.html`，不依赖任何外部服务。

```bash
npm install @flyfish-group/file-viewer-react@1.0.21
```

pnpm 10 默认会拦截依赖包的 `postinstall`。如果安装后提示 `Ignored build scripts: @flyfish-group/file-viewer-web`，请执行 `pnpm approve-builds` 允许该包，或运行 `pnpm exec file-viewer-copy-assets ./public/file-viewer`。复制脚本会先清空目标目录再复制，避免 `index.html` 和 `assets/*` hash 不同版本导致动态 import 404。

```tsx
import FileViewer from '@flyfish-group/file-viewer-react'

export function Preview() {
  return (
    <div style={{ height: '100vh' }}>
      <FileViewer
        url="https://example.com/demo.docx"
        onViewerEvent={(event) => {
          console.log(event.type, event.event, event.payload)
        }}
        options={{
          toolbar: true,
          watermark: { text: '内部预览', opacity: 0.14 },
          archive: {
            workerUrl: '/file-viewer/vendor/libarchive/worker-bundle.js',
            cache: true
          }
        }}
      />
    </div>
  )
}
```

`file` 优先级高于 `url`。当传入 `Blob` 或 `ArrayBuffer` 时，请同时传 `name`，例如 `contract.pdf`，用于 Vue 基线预览器识别格式。

```tsx
<FileViewer file={blob} name="contract.pdf" />
```

如果你的静态目录不是 `public/file-viewer`，复制到自定义目录后再覆盖 `viewerUrl`:

```tsx
<FileViewer viewerUrl="/vendor/file-viewer/index.html" url={url} />
```

React 组件内部复用 `mountViewerFrame` 的地址协议，会默认追加 `__flyfish_viewer_version` 来绕开旧 iframe 入口页缓存；静态服务已经保证 HTML 不缓存时，可传 `cacheKey={false}` 关闭。

`options` 会透传给 Vue 基线预览器，可配置下载/打印/导出 HTML 操作栏、文字或图片水印，以及压缩包预览的 `libarchive.js` Worker、IndexedDB 缓存和体积上限。打印按钮会按当前格式和渲染链路动态显隐；Word / PDF 打印和导出会生成完整页面，不依赖当前 iframe 视口或已渲染 canvas。生命周期、操作能力变化和内置操作事件会通过 `onViewerEvent` 回传给宿主，适合记录加载耗时、审计下载/打印尝试和同步外部状态。
