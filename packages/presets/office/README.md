# @file-viewer/preset-office

Flyfish File Viewer 的 Office / 文档 renderer preset。它把 PDF、Word、Excel、PowerPoint、OFD、RTF 和 OpenDocument 这些高频办公文档组合成一个可显式安装的能力包。

## 何时使用

- 业务主要处理合同、报告、表格、演示稿、OFD 票据或政企办公附件。
- 你希望安装一个文档 preset，而不是手写多个 renderer import。
- 你不需要 CAD、3D、EDA、压缩包、邮件等完整 demo 能力。

## 用法

推荐和 `@file-viewer/vite-plugin` 一起使用。安装本 preset 后，插件会自动发现并激活 Office 文档能力：

```ts
fileViewerRenderers({
  copyAssets: true
})
```

组件默认 `autoRenderers:true`，业务代码无需手动传 `renderers`。需要完全手动控制 registry 时再直接传入：

```ts
import FileViewer from '@file-viewer/vue3'
import { officeRenderers } from '@file-viewer/preset-office'

const options = {
  builtinRenderers: 'none',
  rendererMode: 'replace',
  renderers: officeRenderers,
}
```

## 包含的 renderer

- `@file-viewer/renderer-pdf`
- `@file-viewer/renderer-word`
- `@file-viewer/renderer-spreadsheet`
- `@file-viewer/renderer-presentation`
- `@file-viewer/renderer-ofd`

## 文档

- 按需渲染架构: <https://doc.file-viewer.app/guide/on-demand-renderers>
- 支持格式: <https://doc.file-viewer.app/guide/formats>
