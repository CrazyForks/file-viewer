# @flyfish-group/file-viewer-react

React 文件预览组件。只提供私有化部署路线: 组件运行协议复用 `@flyfish-group/file-viewer-web` 的 iframe 门面，web 包负责携带基线 viewer 静态产物并统一承接 core 协议；使用 `npm install` 或已允许 pnpm 安装脚本后，会复制到宿主项目 `public/file-viewer`。React 组件默认加载 `/file-viewer/index.html`，不依赖任何外部服务。新项目建议优先使用标准包名 `@file-viewer/react`；该历史包继续同步维护用于兼容已有系统。

```bash
npm install @flyfish-group/file-viewer-react
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
          theme: 'light',
          toolbar: { position: 'bottom-right' },
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

React 组件内部复用 `@flyfish-group/file-viewer-web` 的 iframe 地址、options 序列化和本地文件 postMessage 协议，会默认追加 `__flyfish_viewer_version` 来绕开旧 iframe 入口页缓存；静态服务已经保证 HTML 不缓存时，可传 `cacheKey={false}` 关闭。

`options` 会透传给 Vue 基线预览器，可配置主题、下载/打印/导出 HTML 操作栏、文字或图片水印、搜索高亮、AI 友好文本切片，以及压缩包预览的 `libarchive.js` Worker、IndexedDB 缓存和体积上限。`theme` 支持 `light`、`dark`、`system`，默认跟随系统；固定浅色宿主 UI 建议传 `theme: 'light'`。`toolbar.position` 支持 `auto`、`top`、`bottom-right`，默认 `auto`，PDF 会自动悬浮到右下角以避开自身导航栏；`pdf.toolbar` 可隐藏 PDF 自身工具栏，适合文档比对等紧凑场景。搜索 API 会按格式选择最佳链路，PDF 走 PDF.js 原生搜索，文本类格式走通用 DOM 高亮。打印按钮会按当前格式和渲染链路动态显隐；Word / PDF 打印和导出会生成完整页面，不依赖当前 iframe 视口或已渲染 canvas。生命周期、操作能力变化、搜索状态和当前位置会通过 `onViewerEvent` 回传给宿主，适合记录加载耗时、审计下载/打印尝试、搜索命中、页码/行号、AI 切片和溯源状态。
