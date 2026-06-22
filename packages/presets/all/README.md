# @file-viewer/preset-all

Flyfish File Viewer 的全量 renderer preset。它把当前完整格式矩阵包装成一个可显式装配的 preset，作为 2.x 按需渲染架构的兼容桥梁。

## 何时使用

- 你希望继续获得和官方 demo 一致的完整格式支持。
- 你正在从默认全量依赖迁移到按需 renderer 架构。
- 你希望先用一个 preset 接入，后续再替换为 `preset-lite`、`preset-office`、`renderer-pdf`、`renderer-cad` 等更细的组合。

## 用法

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

当前版本会优先聚合已经拆出的 `@file-viewer/renderer-pdf`、`@file-viewer/renderer-cad`、`@file-viewer/renderer-typst`、`@file-viewer/renderer-archive`、`@file-viewer/renderer-email`、`@file-viewer/renderer-ebook`、`@file-viewer/renderer-text` 和 `@file-viewer/renderer-mindmap`，剩余尚未拆包的链路暂由 `@file-viewer/core` 兼容补齐。随着 Office、OFD、绘图、3D、Geo、EDA、媒体、图片和数据资产继续独立，本 preset 会保持作为全量聚合层。

## 文档

- 按需渲染架构: <https://doc.file-viewer.app/guide/on-demand-renderers>
- 支持格式: <https://doc.file-viewer.app/guide/formats>
