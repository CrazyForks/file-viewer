# 按需渲染架构计划

<div class="doc-kicker">On-demand Renderer Architecture</div>

<p class="doc-lead">
  文件预览器的格式越来越多，不能让每个项目在安装阶段都承担全部 Office、CAD、Typst、3D、压缩包、邮件和工程格式依赖。
  2.x 的目标是把 core 收敛为轻量、框架无关、纯 TypeScript 的预览底座，把重渲染链路拆成可组合、可自动装配、可独立发布的 renderer package。
</p>

## 设计目标

| 目标 | 要求 |
| --- | --- |
| 安装更快 | 默认组件包只安装 core、组件本身和必要轻量依赖；PDF、Office、CAD、Typst、3D、archive 等重链路不再默认进入 core `dependencies`。 |
| 打包更轻 | 用户只 `import` 自己装配的 renderer，Vite / Rollup / Webpack / Rspack 才会把对应依赖打进最终产物。 |
| 调试简单 | Vue、React、Svelte、jQuery、Vanilla JS 都仍然是原生组件体验，不回退 iframe；只是在组件 options 中显式传入 renderer/preset。 |
| 自动化友好 | 提供 preset、Vite 插件、资产复制 CLI 和校验脚本，让用户可以“一行装配”，也能精确控制企业内网部署资源。 |
| 渐进兼容 | 先支持 `@file-viewer/preset-all` 维持完整能力，再逐步把默认安装切到 lightweight preset，避免一次性破坏现有客户。 |

## 行业基线

- 使用 ESM `import()` 做运行时拆分。Vite 生产构建基于 Rollup，动态导入会天然形成异步 chunk。
- 使用 `package.json#exports` 暴露稳定子路径。Node.js 官方文档建议显式定义导出入口，避免用户引用内部文件。
- 使用 Rollup `manualChunks` 或 Vite `build.rollupOptions.output.manualChunks` 给 demo / 官网这类应用稳定命名大型 renderer chunk。
- 使用 optional peer / peerDependenciesMeta 时只作为“插件提示”，不把重依赖放回 core；renderer package 自己声明真实依赖。

## 最终包形态

| 包 | 定位 | 依赖原则 |
| --- | --- | --- |
| `@file-viewer/core` | 纯 TS 核心：类型、格式注册表、source loader、dispatcher、生命周期、搜索、缩放、打印/导出 API、资产解析协议 | 只保留无渲染重依赖的基础代码；不依赖 Vue/React/Svelte，不依赖 Office/CAD/PDF/Typst 等重库 |
| `@file-viewer/vue3`、`@file-viewer/react`、`@file-viewer/svelte` 等 | 生产可用标准组件 | 只依赖 core 和自身生态依赖；通过 props/options 接收 renderers/presets |
| `@file-viewer/renderer-*` | 单条或一组强相关渲染链路 | 自己声明真实重依赖、worker、wasm、vendor assets 和 smoke 样本 |
| `@file-viewer/preset-lite` | 常用轻量格式：文本、Markdown、图片、音视频基础预览 | 体积小，适合默认安装体验 |
| `@file-viewer/preset-office` | Word、Excel、PPT、OpenDocument、RTF | 明确引入 Office 相关依赖 |
| `@file-viewer/preset-engineering` | CAD、3D、XMind、Draw.io、Excalidraw、Geo、EDA 结构预览 | 工程格式单独安装 |
| `@file-viewer/preset-all` | 完整能力聚合包 | 需要全格式时一行安装，demo 和全量发行版使用 |
| `@file-viewer/vite-plugin` | 自动生成 renderer virtual module、复制 assets、设置 manual chunks | 让业务项目按配置自动装配，不需要手写大量 import |

## 用户接入方式

### 方式一：轻量默认

```ts
import { FileViewer } from '@file-viewer/vue3'

// Vue / React / Svelte / jQuery / Vanilla JS 都保持同一套 options 语义。
const options = {
  // 当前已可用: 只启用图片、音视频、代码、Markdown 和 UMD 这类轻量内置链路。
  builtinRenderers: 'lite',
}
```

### 方式二：业务按需组合

```ts
import { FileViewer } from '@file-viewer/vue3'
import { pdfRenderer } from '@file-viewer/renderer-pdf'
import { wordRenderer, spreadsheetRenderer } from '@file-viewer/preset-office'
import { cadRenderer } from '@file-viewer/renderer-cad'

const options = {
  builtinRenderers: 'none',
  renderers: [pdfRenderer, wordRenderer, spreadsheetRenderer, cadRenderer],
}
```

### 方式三：全量体验

```ts
import { FileViewer } from '@file-viewer/vue3'
import { allRenderers } from '@file-viewer/preset-all'

const options = {
  builtinRenderers: 'none',
  renderers: allRenderers,
}
```

### 方式四：构建插件自动装配

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import { fileViewerRenderers } from '@file-viewer/vite-plugin'

export default defineConfig({
  plugins: [
    fileViewerRenderers({
      formats: ['pdf', 'docx', 'xlsx', 'pptx', 'dwg', 'dxf'],
      copyAssets: true,
      chunkStrategy: 'renderer',
    }),
  ],
})
```

业务代码只引入 virtual module：

```ts
import { configuredFileViewerRenderers } from 'virtual:file-viewer-renderers'

const options = {
  rendererMode: 'replace',
  renderers: configuredFileViewerRenderers,
}
```

## Renderer 插件协议

每个 renderer package 暴露稳定的装配对象：

```ts
import type { FileViewerRendererPlugin } from '@file-viewer/core'

export const pdfRenderer: FileViewerRendererPlugin = {
  id: 'pdf',
  definitions: [
    { id: 'pdf', extensions: ['pdf'], label: 'PDF' },
  ],
  assets: [
    { id: 'pdf.worker', kind: 'worker', source: 'dist/assets/pdf.worker.mjs' },
  ],
  install(registry) {
    registry.register({
      id: 'pdf',
      extensions: ['pdf'],
      handler: async (...args) => {
        const { renderPdf } = await import('./pdfRenderer')
        return renderPdf(...args)
      },
    })
  },
}
```

核心原则：

- `core` 只认识协议，不知道具体 PDF、CAD、Typst、Office 的依赖。
- renderer 的 worker/wasm/vendor 静态资源跟着 renderer 包走，通过统一 asset manifest 暴露。
- wrapper 只负责把用户传入的 renderers 安装进 viewer，不复制渲染逻辑。
- preset 只是 renderer plugin 数组，不再隐藏性地把所有依赖塞进默认组件包。

## 当前渲染线拆分计划

| 阶段 | 渲染线 | 目标包 |
| --- | --- | --- |
| Phase 1 | core 插件协议、wrapper 传参、preset-all 兼容层、资产 manifest v2、迁移校验脚本 | `@file-viewer/core`、所有组件包 |
| Phase 2 | PDF、Word/DOCX/DOC/ODT/RTF、Excel、PPT、OFD、Typst、CAD、Archive | `@file-viewer/renderer-pdf`、`@file-viewer/renderer-word`、`@file-viewer/renderer-spreadsheet`、`@file-viewer/renderer-presentation`、`@file-viewer/renderer-ofd`、`@file-viewer/renderer-typst`、`@file-viewer/renderer-cad`、`@file-viewer/renderer-archive` |
| Phase 3 | XMind、Draw.io/Excalidraw、3D、Geo、Email、EPUB、Code/Markdown、Media、Image | `@file-viewer/renderer-mindmap`、`@file-viewer/renderer-drawing`、`@file-viewer/renderer-3d`、`@file-viewer/renderer-geo`、`@file-viewer/renderer-email`、`@file-viewer/renderer-ebook`、`@file-viewer/renderer-text`、`@file-viewer/renderer-media`、`@file-viewer/renderer-image` |
| Phase 4 | EDA、GDSII/OASIS、OrCAD/Allegro、复杂数据资产 | `@file-viewer/renderer-eda`、`@file-viewer/eda-layout`、`@file-viewer/eda-orcad`、`@file-viewer/renderer-data` |
| Phase 5 | Vite 插件、自动 sample smoke matrix、安装体积预算、release pipeline 分发 | `@file-viewer/vite-plugin`、release scripts |

## 复杂格式方案边界

| 格式线 | 当前优先方案 | 后续拆包方向 |
| --- | --- | --- |
| Typst | 使用官方 Typst Rust/WASM 生态在浏览器内编译并渲染，不退化为源码查看。 | `@file-viewer/renderer-typst` 独立维护 compiler/renderer WASM、字体和缓存策略。 |
| Draw.io / diagrams.net | 以 diagrams.net 官方离线 viewer 包、`viewer-static.min.js` 和 XML/SVG 解析链路为基准，优先保证离线预览，不依赖公网 CDN。 | `@file-viewer/renderer-drawing` 统一 drawio、excalidraw、Mermaid 类绘图资产。 |
| OpenDocument / WPS 兼容格式 | 常规 ODT/ODS/ODP 走 ZIP+XML 结构解析；高保真 Office 兼容方向预留 LibreOffice WASM 路线。 | Office renderer 拆出后，复杂版式可继续独立演进为 WASM 后端。 |
| XMind | 解析现代 `content.json` 和经典 `content.xml`，渲染层提供可拖拽、缩放、定位的自研画布；官方 XMind TS/SVG viewer 可作为后续高保真对照，但不直接引入不可控交互。 | `@file-viewer/renderer-mindmap` 单独维护 XMind/FreeMind/OPML 等思维导图体验。 |
| Archive | 优先 `libarchive.js` Worker + WASM，覆盖 RAR/7z/TAR/ZIP 等多格式；Worker 不可用时降级 ZIP/TAR/GZIP，内部文件点击后再按需解压和嵌套预览。 | `@file-viewer/renderer-archive` 独立维护 worker/wasm、缓存、内存上限和移动端 fallback。 |
| EDA / 工程二进制 | 简单结构先做安全解析和树形浏览；Cadence DRA/OLB/DSN 等复杂二进制以后续 OpenAllegroParser/OpenOrCadParser WASM 化为主，不硬塞进 core。 | 参考 PPTX 独立内核路线，必要时拆 `@file-viewer/eda-*`、`@file-viewer/eda-allegro` 并引入 WASM/增量渲染。 |

调研结论是：能用成熟官方或事实标准开源链路的格式不手搓；规格复杂、二进制重、需要长期迭代的能力，应该像 PPTX 一样拆成独立内核和独立 renderer 包持续维护。

## 验收 checklist

### Phase 1：协议与装配

- [x] 新增 `FileViewerRendererPlugin`、`FileViewerRendererPreset`、`installFileViewerRendererPlugins()` 类型和 API。
- [x] `createViewer()` 支持传入 renderer plugins，并能通过 `rendererMode: 'replace' | 'extend'` 覆盖或追加默认 registry。
- [x] 所有 wrapper 共享的 `FileViewerOptions` / `ViewerOptions` 类型暴露 `renderers` 和 `rendererMode`，可直接接收 renderer plugin 或 preset。
- [x] `FileViewerOptions.builtinRenderers` 支持 `all`、`lite`、`none`，为默认轻量化和显式全量装配提供稳定开关。
- [ ] wrapper README 和官网示例补齐 `renderers` / `rendererMode` 的按需装配示例。
- [ ] Vue3 旧组件渲染面板切换到同一套 renderer plugin/preset 装配链路。
- [x] `@file-viewer/preset-all` 能复现当前 198 个扩展名的完整能力。
- [x] `pnpm audit:renderer-deps` 输出所有 core 直接依赖对应的目标 renderer package，不允许 unclassified。

### Phase 2：第一批重链路拆包

- [ ] `@file-viewer/core` 移除 PDF/Office/OFD/Typst/CAD/archive 直接依赖。
- [x] 建立 `@file-viewer/renderer-pdf` 独立包，并让 `@file-viewer/preset-all` 优先聚合该包的 PDF renderer。
- [x] 建立 `@file-viewer/renderer-cad` 独立包，并让 `@file-viewer/preset-all` 优先聚合该包的 CAD renderer。
- [x] 建立 `@file-viewer/renderer-typst` 独立包，并让 `@file-viewer/preset-all` 优先聚合该包的 Typst renderer。
- [x] 建立 `@file-viewer/renderer-archive` 独立包，并让 `@file-viewer/preset-all` 优先聚合该包的 archive renderer。
- [x] 建立 `@file-viewer/renderer-email` 独立包，并让 `@file-viewer/preset-all` 优先聚合该包的 EML / MSG / MBOX renderer。
- [x] 建立 `@file-viewer/renderer-ebook` 独立包，并让 `@file-viewer/preset-all` 优先聚合该包的 EPUB renderer。
- [x] 建立 `@file-viewer/renderer-mindmap` 独立包，并让 `@file-viewer/preset-all` 优先聚合该包的 XMind renderer。
- [x] 建立 `@file-viewer/renderer-text` 独立包，并让 `@file-viewer/preset-all` 优先聚合该包的代码 / Markdown renderer。
- [ ] 每个 renderer 包有独立 `package.json#exports`、README、assets manifest、type-check、build、browser smoke。
- [ ] demo 使用 `preset-all`，业务组件 README 默认展示 lite/office/cad 按需安装示例。
- [ ] 全量 preset 和历史兼容包仍能覆盖原来的格式矩阵。
- [ ] 安装 `@file-viewer/vue3` 不再安装 `pdfjs-dist`、`@flyfish-dev/cad-viewer`、`@myriaddreamin/*`、`libarchive.js`。

### Phase 3：体验与自动化

- [ ] `@file-viewer/vite-plugin` 能按 `formats` 自动生成 virtual renderer module。
- [ ] 插件能复制 worker/wasm/vendor assets，并输出可部署 manifest。
- [ ] demo 构建 chunk 按 renderer 命名，PDF/Office/CAD/Typst/3D 等不会进入首屏主包。
- [ ] 每个 wrapper 的文档都提供“一个组件，一行代码”和“按需 renderer”两种接入方式。
- [ ] 增加独立安装 smoke：只安装 `@file-viewer/core + @file-viewer/renderer-pdf` 时 PDF 可预览，其他格式显示明确缺失提示。

### Phase 4：专业格式独立内核

- [ ] EDA/GDS/OASIS/OrCAD/Allegro 独立 renderer 包建立真实样本库和解析边界说明。
- [ ] OASIS/GDSII 大文件走 WebGL 或 WASM，不进入 core 首屏链路。
- [ ] `@file-viewer/eda-layout` 和 `@file-viewer/eda-orcad` 能独立发布、独立回归。
- [ ] docs 明确“结构预览”和“完整可视预览”的差异，避免营销口径误导。

### Phase 5：发布与质量门禁

- [ ] 新增安装体积预算：`@file-viewer/core` packed size、依赖数量、cold install 时间纳入 CI。
- [ ] 新增 bundle 预算：demo 主入口、lite preset、office preset、engineering preset 分别统计 gzip/brotli。
- [ ] 新增 release 校验：每个 renderer 包 npm tarball、README、exports、assets manifest、smoke 样本齐全。
- [ ] 官网、文档站、README 的支持矩阵能区分 core、preset-lite、preset-office、preset-engineering、preset-all。
- [ ] 迁移完成后 `@file-viewer/core` 的 `dependencies` 只保留真正跨 renderer 的轻量工具，重依赖直接数量接近 0。

## 当前状态

运行以下命令可以查看当前 core 直接依赖和目标拆包路线：

```bash
pnpm audit:renderer-deps
pnpm audit:renderer-deps -- --json
```

当前 core 仍直接声明了完整渲染依赖，这是 2.x 后续要持续压缩的主工作线。短期先保留 `preset-all` 兼容，长期让默认组件包回到轻量安装体验。

## 外部参考

- Vite 生产构建和动态导入 chunk: <https://vite.dev/guide/build>
- Rollup `manualChunks` 配置: <https://rollupjs.org/configuration-options/>
- Node.js package `exports` 与 conditional exports: <https://nodejs.org/api/packages.html>

<div class="doc-note">
  这个计划的核心不是“拆很多包”本身，而是让用户用到什么才安装什么、打包什么、部署什么。完整能力仍然保留，但默认体验必须轻。
</div>
