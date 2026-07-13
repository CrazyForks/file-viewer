# @file-viewer/preset-all

Flyfish File Viewer 的全量 renderer preset。它把当前完整格式矩阵包装成一个可显式装配的 preset，作为 2.x 按需渲染架构的兼容桥梁。

## 何时使用

- 你希望继续获得和官方 demo 一致的完整格式支持。
- 你正在从默认全量依赖迁移到按需 renderer 架构。
- 你希望先用一个完整 preset 接入，后续再替换为 `@file-viewer/preset-lite`、`@file-viewer/preset-office`、`@file-viewer/preset-engineering` 或更细的单 renderer 组合。

## 用法

推荐在 Vite 项目中让 `@file-viewer/vite-plugin` 自动发现本 preset：

```bash
pnpm add @file-viewer/vue3 @file-viewer/core @file-viewer/vite-plugin @file-viewer/preset-all
```

```ts
import { fileViewerRenderers } from '@file-viewer/vite-plugin'

export default {
  plugins: [
    fileViewerRenderers({
      copyAssets: true
    })
  ]
}
```

组件默认 `autoRenderers:true`，因此不需要手动把 `allRenderers` 传入业务组件。

需要完全手动控制 registry 时再直接传入：

```ts
import FileViewer from '@file-viewer/vue3'
import { allRenderers } from '@file-viewer/preset-all'

const options = {
  renderers: allRenderers,
}
```

如果你希望业务只加载这个 preset 提供的 renderer，可以使用 replace 模式：

```ts
const options = {
  rendererMode: 'replace',
  renderers: allRenderers,
}
```

当前版本会优先聚合已经拆出的 `@file-viewer/renderer-word`、`@file-viewer/renderer-spreadsheet`、`@file-viewer/renderer-pdf`、`@file-viewer/renderer-ofd`、`@file-viewer/renderer-presentation`、`@file-viewer/renderer-cad`、`@file-viewer/renderer-drawing`、`@file-viewer/renderer-3d`、`@file-viewer/renderer-data`、`@file-viewer/renderer-eda`、`@file-viewer/renderer-typst`、`@file-viewer/renderer-archive`、`@file-viewer/renderer-email`、`@file-viewer/renderer-epub`、`@file-viewer/renderer-text`、`@file-viewer/renderer-image`、`@file-viewer/renderer-media`、`@file-viewer/renderer-mindmap` 和 `@file-viewer/renderer-geo`。core 仅保留轻量原生链路和共享协议，本 preset 保持作为全量聚合层。

轻量附件优先使用 `@file-viewer/preset-lite`，办公文档优先使用 `@file-viewer/preset-office`，CAD / 3D / EDA 等工程附件优先使用 `@file-viewer/preset-engineering`。`preset-all` 更适合官方 Demo、内部全格式附件中心或迁移期兼容层。

## 文档

- 按需渲染架构: <https://doc.file-viewer.app/guide/on-demand-renderers>
- 支持格式: <https://doc.file-viewer.app/guide/formats>
