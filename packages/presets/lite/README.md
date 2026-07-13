# @file-viewer/preset-lite

Flyfish File Viewer 的轻量 renderer preset。它适合只需要 Markdown、代码、文本、图片、音频和视频预览的业务页面，避免默认安装 Office、PDF、CAD、Typst、3D、压缩包等重链路。

## 何时使用

- 你需要一个开箱即用但非常轻的附件预览能力。
- 业务只处理 README、日志、配置、截图、音视频等常见轻量文件。
- 你希望后续再按需叠加 `@file-viewer/renderer-pdf`、`@file-viewer/renderer-word` 或其它专业 renderer。

## 用法

推荐和 `@file-viewer/vite-plugin` 一起使用。安装本 preset 后，插件会自动发现并激活轻附件能力：

```ts
fileViewerRenderers({
  copyAssets: true
})
```

组件默认 `autoRenderers:true`，业务代码无需手动传 `renderers`。需要完全手动控制 registry 时再直接传入：

```ts
import FileViewer from '@file-viewer/vue3'
import { liteRenderers } from '@file-viewer/preset-lite'

const options = {
  builtinRenderers: 'none',
  rendererMode: 'replace',
  renderers: liteRenderers,
}
```

## 包含的 renderer

- `@file-viewer/renderer-text`
- `@file-viewer/renderer-image`
- `@file-viewer/renderer-media`

## 文档

- 按需渲染架构: <https://doc.file-viewer.app/guide/on-demand-renderers>
- 支持格式: <https://doc.file-viewer.app/guide/formats>
