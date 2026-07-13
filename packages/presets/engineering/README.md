# @file-viewer/preset-engineering

Flyfish File Viewer 的工程类 renderer preset。它面向 CAD、三维模型、Draw.io / Excalidraw / Mermaid / PlantUML、XMind、地理数据、Typst、EDA、压缩包和数据资产等专业附件场景。

## 何时使用

- 业务集中在研发、制造、设计、工程交付、EDA 初筛或技术文档协作。
- 你需要 CAD / 3D / 图形 / 地理 / EDA 等专业格式，但不想安装完整 demo 的所有 renderer。
- 你希望这些 WASM、Worker、vendor 资产都继续通过统一 manifest 和 `@file-viewer/vite-plugin` 自托管。

## 用法

推荐和 `@file-viewer/vite-plugin` 一起使用。安装本 preset 后，插件会自动发现并激活工程附件能力：

```ts
fileViewerRenderers({
  copyAssets: true
})
```

组件默认 `autoRenderers:true`，业务代码无需手动传 `renderers`。需要完全手动控制 registry 时再直接传入：

```ts
import FileViewer from '@file-viewer/vue3'
import { engineeringRenderers } from '@file-viewer/preset-engineering'

const options = {
  builtinRenderers: 'none',
  rendererMode: 'replace',
  renderers: engineeringRenderers,
}
```

## 包含的 renderer

- `@file-viewer/renderer-cad`
- `@file-viewer/renderer-3d`
- `@file-viewer/renderer-drawing`
- `@file-viewer/renderer-mindmap`
- `@file-viewer/renderer-geo`
- `@file-viewer/renderer-typst`
- `@file-viewer/renderer-archive`
- `@file-viewer/renderer-data`
- `@file-viewer/renderer-eda`

## 文档

- 按需渲染架构: <https://doc.file-viewer.app/guide/on-demand-renderers>
- 支持格式: <https://doc.file-viewer.app/guide/formats>
