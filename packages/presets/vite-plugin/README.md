# @file-viewer/vite-plugin

Flyfish File Viewer 的 Vite 按需 renderer 自动装配插件。它根据业务声明的文件格式生成 `virtual:file-viewer-renderers`，只 import 命中的 renderer 包，并提供 chunk 分组和离线 worker/WASM 资源复制能力。

## 安装

```bash
pnpm add @file-viewer/vue3 @file-viewer/vite-plugin @file-viewer/renderer-pdf
```

需要更多格式时安装对应 renderer 包，例如 `@file-viewer/renderer-word`、`@file-viewer/renderer-ofd`、`@file-viewer/renderer-presentation`、`@file-viewer/renderer-cad`、`@file-viewer/renderer-drawing`、`@file-viewer/renderer-3d`、`@file-viewer/renderer-data`、`@file-viewer/renderer-eda`、`@file-viewer/renderer-typst`、`@file-viewer/renderer-archive`。

## vite.config.ts

```ts
import { defineConfig } from 'vite'
import { fileViewerRenderers } from '@file-viewer/vite-plugin'

export default defineConfig({
  plugins: [
    fileViewerRenderers({
      formats: ['pdf', 'dwg', 'typst', 'zip', 'xmind'],
      copyAssets: true,
      chunkStrategy: 'renderer'
    })
  ]
})
```

## 业务代码

```ts
import FileViewer from '@file-viewer/vue3'
import { configuredFileViewerRenderers } from 'virtual:file-viewer-renderers'

const options = {
  rendererMode: 'replace',
  renderers: configuredFileViewerRenderers
}
```

## 当前边界

当前插件会为已经拆出的 renderer 包生成导入：PDF、OFD、Presentation、CAD、Draw.io/Excalidraw、3D、Data、EDA、Typst、压缩包、邮件、EPUB、代码/Markdown、图片、媒体、XMind 和 Geo。尚未拆出的 Word 和 Excel 格式会给出明确提示；在拆包完成前，全量体验仍可直接使用 `@file-viewer/preset-all`。

## 文档

- 按需渲染架构: <https://doc.file-viewer.app/guide/on-demand-renderers>
- 支持格式: <https://doc.file-viewer.app/guide/formats>
