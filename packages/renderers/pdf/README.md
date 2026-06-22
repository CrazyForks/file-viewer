# @file-viewer/renderer-pdf

Flyfish File Viewer 的独立 PDF renderer 包，基于 PDF.js，提供 PDF 页面渲染、导航、目录、搜索、缩放、打印和 HTML 导出能力。

## 用法

```ts
import FileViewer from '@file-viewer/vue3'
import { pdfRenderer } from '@file-viewer/renderer-pdf'

const options = {
  rendererMode: 'replace',
  renderers: pdfRenderer,
}
```

也可以和其他 renderer 一起组合：

```ts
const options = {
  rendererMode: 'replace',
  renderers: [pdfRenderer],
}
```

## 离线资源

PDF 预览依赖 PDF.js worker、cMaps、WASM 和 standard fonts。资源路径沿用 `@file-viewer/core` 的统一 options：

```ts
const options = {
  renderers: pdfRenderer,
  pdf: {
    workerUrl: '/vendor/pdf/pdf.worker.mjs',
    cMapUrl: '/vendor/pdf/cmaps/',
    wasmUrl: '/vendor/pdf/wasm/',
    standardFontDataUrl: '/vendor/pdf/standard_fonts/',
  },
}
```

## 迁移说明

当前 core 仍保留内置 PDF renderer 以兼容历史全量包。后续会把 core 的 PDF 入口切换到本包，并从 core 直接依赖中移除 `pdfjs-dist`。
