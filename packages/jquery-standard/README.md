# @file-viewer/jquery

标准 jQuery wrapper 包。它复用 `@file-viewer/web` 和 `@file-viewer/core` 的 iframe 协议、静态 viewer 产物和完整预览能力，只提供轻量的 `$(el).fileViewer()` 接入层。

```bash
npm install jquery @file-viewer/jquery @file-viewer/web
```

## 快速开始

```ts
import $ from 'jquery'
import { installJQueryFileViewer } from '@file-viewer/jquery'

installJQueryFileViewer($)

$('#viewer').fileViewer({
  url: '/example/demo.pdf',
  options: {
    theme: 'light',
    toolbar: { position: 'bottom-right' }
  }
})
```

默认加载 `/file-viewer/index.html`。请通过 `@file-viewer/web` 提供的复制命令把 viewer 静态产物放入站点目录:

```bash
npx file-viewer-copy-assets ./public/file-viewer
```

## 方法调用

```ts
$('#viewer').fileViewer('update', {
  url: '/example/report.docx',
  options: { theme: 'auto' }
})

$('#viewer').fileViewer('reload')
$('#viewer').fileViewer('postFile')
$('#viewer').fileViewer('destroy')
```

需要直接访问底层 controller 时:

```ts
import { getFileViewerController } from '@file-viewer/jquery'

const controller = getFileViewerController($('#viewer'))
controller?.reload()
```

## script 标签

如果运行时已有 `window.jQuery` 或 `window.$`，包会自动注册 `$.fn.fileViewer`。纯 script 标签场景建议优先使用构建工具或 CDN 的 ESM 入口，并确保同页可访问 `/file-viewer/index.html`。

## 能力范围

`@file-viewer/jquery` 与 Vue3 基线 viewer 共享同一套 `@file-viewer/core` 能力，覆盖 PDF、Word、Excel、PPT、OFD、CAD/DWG/DXF/DWF、EPUB/UMD、压缩包、邮件、Markdown、代码高亮、图片、音频、视频、3D 模型、地理数据和结构化数据资产等预览链路。

完整格式矩阵、参数、生命周期 hooks、beforeOperation、主题、水印、搜索、缩放、打印和导出能力请查看官方文档: https://doc.flyfish.dev/

English README: [README.en.md](./README.en.md)。
