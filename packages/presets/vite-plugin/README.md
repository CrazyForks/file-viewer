# @file-viewer/vite-plugin

Flyfish File Viewer 的 Vite 按需 renderer 自动装配插件。它可以自动发现已安装的 `@file-viewer/preset-*` 包并注入到页面，让 Vue、React、Svelte、jQuery 和 Vanilla JS 组件无需手动传 `renderers` 就获得对应预览能力；也可以根据业务声明的文件格式生成 `virtual:file-viewer-renderers`，只 import 命中的 renderer 包，并提供 chunk 分组和离线 worker/WASM/字体资源复制能力。

## 安装

```bash
pnpm add @file-viewer/vue3 @file-viewer/vite-plugin @file-viewer/renderer-pdf
```

需要更多格式时安装对应 renderer 包，例如 `@file-viewer/renderer-word`、`@file-viewer/renderer-ofd`、`@file-viewer/renderer-presentation`、`@file-viewer/renderer-cad`、`@file-viewer/renderer-drawing`、`@file-viewer/renderer-3d`、`@file-viewer/renderer-data`、`@file-viewer/renderer-eda`、`@file-viewer/renderer-typst`、`@file-viewer/renderer-archive`、`@file-viewer/renderer-text`。

如果你希望用一个包完成常见场景装配，可以安装 preset：

```bash
pnpm add @file-viewer/vue3 @file-viewer/vite-plugin @file-viewer/preset-office
```

可选 preset：

- `@file-viewer/preset-lite`: 文本、Markdown、代码、图片、音频、视频。
- `@file-viewer/preset-office`: PDF、Word、Excel、PowerPoint、OFD、RTF、OpenDocument。
- `@file-viewer/preset-engineering`: CAD、3D、绘图、XMind、Geo、Typst、Archive、Data、EDA。
- `@file-viewer/preset-all`: 官方 demo 完整格式矩阵。

## vite.config.ts

```ts
import { defineConfig } from 'vite'
import { fileViewerRenderers } from '@file-viewer/vite-plugin'

export default defineConfig({
  plugins: [
    fileViewerRenderers({
      formats: ['pdf', 'dwg', 'typst', 'zip', 'xmind'],
      scan: true,
      copyAssets: true,
      chunkStrategy: 'renderer'
    })
  ]
})
```

或者使用 preset 一包装配：

```ts
fileViewerRenderers({
  preset: 'office',
  copyAssets: true
})
```

`inject` 默认开启，插件会把 `virtual:file-viewer-renderers` 注入 Vite HTML 入口，preset 导入后会自动注册到 core。常规业务只需要安装组件包和对应 preset，组件会通过 `autoRenderers` 默认读取这些能力。

```ts
const options = {
  // 默认 true；需要完全手动控制时设为 false。
  autoRenderers: true
}
```

如果你需要严格控制 registry，可以关闭注入并手动传入：

```ts
fileViewerRenderers({
  preset: 'office',
  inject: false,
  copyAssets: true
})
```

```ts
import { configuredFileViewerRenderers } from 'virtual:file-viewer-renderers'

const options = {
  rendererMode: 'replace',
  renderers: configuredFileViewerRenderers
}
```

也可以使用 `preset: 'auto'` 发现项目中已安装的 preset 包；当 `preset-all` 存在时会优先使用它，避免重复导入其它 preset。

`scan: true` 会扫描常见源码目录里的轻量 hint，并把它们合并到 `formats`：

```ts
export const fileViewerFormats = ['pdf', 'docx', 'xlsx']
```

```html
<input accept=".pdf,.docx" data-file-viewer-formats="dwg,xmind" />
```

这适合业务把上传入口、示例矩阵或附件白名单维护在源码中时使用：开发和构建阶段插件会自动生成 renderer 装配模块，少写一份手工 import 清单。

## 缺失 renderer 提示

如果用户打开的是支持矩阵内的格式，但项目没有安装或装配对应 renderer，core 会显示“需要装配预览能力”，并提示推荐安装的 preset / renderer 包，例如 `.pdf` 会引导安装 `@file-viewer/preset-office` 或 `@file-viewer/renderer-pdf`。只有真正不在支持矩阵中的扩展名才显示“不支持在线预览”。

## 当前边界

当前插件会为已经拆出的 renderer 包生成导入：Word、Spreadsheet、PDF、OFD、Presentation、CAD、Draw.io/Excalidraw/Mermaid/PlantUML、3D、Data、EDA、Typst、压缩包、邮件、EPUB、代码/Markdown/Patch/Git Bundle、图片、媒体、XMind 和 Geo。可以通过 `formats` 显式声明，也可以通过 `scan: true` 从源码 hint 自动发现；`.zipx`、`.cbz`、`.tiff`、`.mjs`、`.gv`、`.patch`、`.bundle`、`.mermaid`、`.puml`、`.mpeg` 等 core 支持的扩展也会映射到对应 renderer。开启 `copyAssets:true` 时会同时复制 Typst compiler / renderer WASM 与 `wasm/typst/fonts/` 默认字体目录。`preset: 'auto' | 'lite' | 'office' | 'engineering' | 'all'` 会导入对应 `@file-viewer/preset-*` 包；如果同时声明 `formats`，插件会在 preset 之外补充额外 renderer。

## 文档

- 按需渲染架构: <https://doc.file-viewer.app/guide/on-demand-renderers>
- 支持格式: <https://doc.file-viewer.app/guide/formats>
