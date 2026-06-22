# 按需渲染架构计划

<div class="doc-kicker">On-demand Renderer Architecture</div>

<p class="doc-lead">
  文件预览器的格式越来越多，不能让每个项目在安装阶段都承担全部 Office、CAD、Typst、3D、压缩包、邮件和工程格式依赖。
  2.x 的目标是把 core 收敛为轻量、框架无关、纯 TypeScript 的预览底座，把重渲染链路拆成可组合、可自动装配、可独立发布的 renderer package。
</p>

## 设计目标

| 目标       | 要求                                                                                                                           |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------ |
| 安装更快   | 默认组件包只安装 core、组件本身和必要轻量依赖；PDF、Office、CAD、Typst、3D、archive 等重链路不再默认进入 core `dependencies`。 |
| 打包更轻   | 用户只 `import` 自己装配的 renderer，Vite / Rollup / Webpack / Rspack 才会把对应依赖打进最终产物。                             |
| 调试简单   | Vue、React、Svelte、jQuery、Vanilla JS 都仍然是原生组件体验，不回退 iframe；只是在组件 options 中显式传入 renderer/preset。    |
| 自动化友好 | 提供 preset、Vite 插件、资产复制 CLI 和校验脚本，让用户可以“一行装配”，也能精确控制企业内网部署资源。                          |
| 渐进兼容   | 先支持 `@file-viewer/preset-all` 维持完整能力，再逐步把默认安装切到 lightweight preset，避免一次性破坏现有客户。               |

## 架构决策

最终方案采用“轻 core + 独立 renderer + preset 编排 + 构建插件自动装配”的四层模型。

| 层级              | 责任                                                                                                  | 不允许做的事                                                       |
| ----------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Core              | 文件源加载、格式识别、renderer registry、生命周期、搜索/定位、缩放、打印导出、统一 options 和事件 API | 直接依赖 PDF.js、Office、CAD、Typst、WASM、地图、3D、压缩包等重库  |
| Renderer package  | 单条格式链路的解析、渲染、worker/wasm/vendor assets、样例、smoke 测试和 README                        | 把 Vue/React/Svelte 组件逻辑塞进 renderer；依赖其它 wrapper 的实现 |
| Preset package    | 把多个 renderer 组合成 `lite`、`office`、`engineering`、`all` 等业务能力包                            | 隐式修改用户 options；在默认组件里偷偷安装全量依赖                 |
| Component package | Vue3、React、Svelte、jQuery、Vanilla JS 等原生组件体验，接收同一套 options 和 renderer/preset         | 使用 iframe 作为主链路；复制 renderer 逻辑；制造不同框架的参数差异 |

关键原则：

- **默认轻量**：安装 `@file-viewer/vue3`、`@file-viewer/react`、`@file-viewer/web` 只得到 core 和组件能力，不得到全部重渲染依赖。
- **显式能力**：用户要 PDF、Office、CAD、Typst、Archive、3D 等能力时，通过 renderer 或 preset 显式引入。
- **导入即装配**：业务代码 import 了哪个 renderer/preset，构建工具才有机会把对应依赖纳入产物；没有 import 的能力不进入最终 bundle。
- **全量仍简单**：需要最完整体验时，`@file-viewer/preset-all` 保留“一行安装、一行装配”的路径，官方 demo 使用它展示完整能力。
- **资产可追踪**：每个 renderer 的 worker、wasm、字体、vendor 文件必须通过 manifest/CLI 暴露，避免业务方手抄路径。

## 行业基线

- 使用 ESM `import()` 做运行时拆分。Vite 8 生产构建可以通过 `build.rolldownOptions.output.codeSplitting` 控制拆分；兼容 Vite 7 / Rollup 生态时继续支持 `build.rollupOptions.output.manualChunks`。
- 使用 `package.json#exports` 暴露稳定子路径。Node.js 官方文档建议显式定义导出入口，避免用户引用内部文件。
- 使用 renderer 级 chunk 命名策略给 demo / 官网这类应用稳定命名大型渲染链路，便于缓存和排查首屏体积。
- 使用 optional peer / peerDependenciesMeta 时只作为“插件提示”，不把重依赖放回 core；renderer package 自己声明真实依赖。

## 最终包形态

| 包                                                                  | 定位                                                                                                       | 依赖原则                                                                                  |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `@file-viewer/core`                                                 | 纯 TS 核心：类型、格式注册表、source loader、dispatcher、生命周期、搜索、缩放、打印/导出 API、资产解析协议 | 只保留无渲染重依赖的基础代码；不依赖 Vue/React/Svelte，不依赖 Office/CAD/PDF/Typst 等重库 |
| `@file-viewer/vue3`、`@file-viewer/react`、`@file-viewer/svelte` 等 | 生产可用标准组件                                                                                           | 只依赖 core 和自身生态依赖；通过 props/options 接收 renderers/presets                     |
| `@file-viewer/renderer-*`                                           | 单条或一组强相关渲染链路                                                                                   | 自己声明真实重依赖、worker、wasm、vendor assets 和 smoke 样本                             |
| `@file-viewer/preset-lite`                                          | 常用轻量格式：文本、Markdown、图片、音视频基础预览                                                         | 体积小，适合默认安装体验                                                                  |
| `@file-viewer/preset-office`                                        | Word、Excel、PPT、OpenDocument、RTF                                                                        | 明确引入 Office 相关依赖                                                                  |
| `@file-viewer/preset-engineering`                                   | CAD、3D、XMind、Draw.io、Excalidraw、Geo、EDA 结构预览                                                     | 工程格式单独安装                                                                          |
| `@file-viewer/preset-all`                                           | 完整能力聚合包                                                                                             | 需要全格式时一行安装，demo 和全量发行版使用                                               |
| `@file-viewer/vite-plugin`                                          | 自动生成 renderer virtual module、复制 assets、设置 manual chunks                                          | 让业务项目按配置自动装配，不需要手写大量 import                                           |

## 用户最佳体验路径

| 场景                            | 推荐方式                                                  | 安装体验                        | 打包体验                                 |
| ------------------------------- | --------------------------------------------------------- | ------------------------------- | ---------------------------------------- |
| 只预览常见轻量附件              | 安装组件包 + `@file-viewer/preset-lite`                   | 最快，依赖最少                  | 主包只包含轻量 renderer                  |
| 只需要 PDF/Word/Excel           | 安装组件包 + `@file-viewer/preset-office` 或单独 renderer | Office 依赖集中在 Office preset | 只会产生 Office 相关异步 chunk           |
| CAD/3D/Typst/Archive 等专项能力 | 安装对应 `@file-viewer/renderer-*`                        | 哪条链路用到才安装哪条          | worker/wasm 跟随 renderer asset manifest |
| 企业内网全格式平台              | 安装组件包 + `@file-viewer/preset-all` + asset copy CLI   | 一次性完整安装                  | chunk 按 renderer 拆分，避免首屏全部执行 |
| 大型业务前端希望自动化          | `@file-viewer/vite-plugin` 配置 `formats`                 | 由插件提示缺失 renderer         | 自动生成 virtual module 和部署 manifest  |

因此“分包”不是让用户手动拼很多碎片，而是把默认能力变轻，把完整能力保留为 preset，把工程化项目交给插件自动装配。

## 用户接入方式

### 方式一：轻量默认

```ts
import { FileViewer } from '@file-viewer/vue3'

// Vue / React / Svelte / jQuery / Vanilla JS 都保持同一套 options 语义。
const options = {
  // 当前已可用: 只启用图片、音视频、代码、Markdown 和 UMD 这类轻量内置链路。
  builtinRenderers: 'lite'
}
```

### 方式二：业务按需组合

```ts
import { FileViewer } from '@file-viewer/vue3'
import { pdfRenderer } from '@file-viewer/renderer-pdf'
import { ofdRenderer } from '@file-viewer/renderer-ofd'
import { wordRenderer } from '@file-viewer/renderer-word'
import { spreadsheetRenderer } from '@file-viewer/preset-office'
import { cadRenderer } from '@file-viewer/renderer-cad'

const options = {
  builtinRenderers: 'none',
  renderers: [pdfRenderer, ofdRenderer, wordRenderer, spreadsheetRenderer, cadRenderer]
}
```

### 方式三：全量体验

```ts
import { FileViewer } from '@file-viewer/vue3'
import { allRenderers } from '@file-viewer/preset-all'

const options = {
  builtinRenderers: 'none',
  renderers: allRenderers
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
      formats: ['pdf', 'ofd', 'dwg', 'dxf', 'typst', 'zip', 'xmind', 'geojson'],
      copyAssets: true,
      chunkStrategy: 'renderer'
    })
  ]
})
```

业务代码只引入 virtual module：

```ts
import { configuredFileViewerRenderers } from 'virtual:file-viewer-renderers'

const options = {
  rendererMode: 'replace',
  renderers: configuredFileViewerRenderers
}
```

## Renderer 插件协议

每个 renderer package 暴露稳定的装配对象：

```ts
import type { FileViewerRendererPlugin } from '@file-viewer/core'

export const pdfRenderer: FileViewerRendererPlugin = {
  id: 'pdf',
  definitions: [{ id: 'pdf', extensions: ['pdf'], label: 'PDF' }],
  assets: [{ id: 'pdf.worker', kind: 'worker', source: 'dist/assets/pdf.worker.mjs' }],
  install(registry) {
    registry.register({
      id: 'pdf',
      extensions: ['pdf'],
      handler: async (...args) => {
        const { renderPdf } = await import('./pdfRenderer')
        return renderPdf(...args)
      }
    })
  }
}
```

核心原则：

- `core` 只认识协议，不知道具体 PDF、CAD、Typst、Office 的依赖。
- renderer 的 worker/wasm/vendor 静态资源跟着 renderer 包走，通过统一 asset manifest 暴露。
- wrapper 只负责把用户传入的 renderers 安装进 viewer，不复制渲染逻辑。
- preset 只是 renderer plugin 数组，不再隐藏性地把所有依赖塞进默认组件包。

## Renderer 交付契约

每条独立 renderer 线路必须按同一套标准交付，防止“包拆出来了，但体验和维护反而变差”。

| 项目             | 必须交付                                                                                                                            |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Package manifest | `package.json` 包含 `exports`、`types`、`files`、`publishConfig`、`repository.directory`、准确 `dependencies`，不引用其它 wrapper。 |
| Public API       | 默认导出 renderer plugin，同时命名导出 `xxxRenderer`、`xxxRendererDefinition` 和必要的低阶 `renderFileViewerXxx()`。                |
| Lazy boundary    | renderer 入口只注册定义和 handler；真实重库必须在 handler 内部 `import()`，避免装配时立即执行重逻辑。                               |
| Assets           | worker/wasm/vendor/fonts 通过 manifest 或 copy helper 暴露；不能要求用户猜测 `node_modules` 内部路径。                              |
| Offline          | 所有运行时资源可从 npm 包或 demo public 目录复制，不能依赖第三方 CDN。                                                              |
| Samples          | 每个主要扩展名至少一个真实样例；复杂格式注明“结构预览 / 完整可视预览 / 需要商业转换链路”的边界。                                    |
| Tests            | `type-check`、`build`、format registry smoke、至少一个浏览器 smoke；WASM/worker renderer 需要资产存在校验。                         |
| Documentation    | 中文/英文 README、文档站接入示例、支持格式矩阵、故障排查和内网部署说明。                                                            |
| Release          | npm tarball 校验、公开源码仓同步、root README 和生态矩阵同步。                                                                      |

## 自动装配设计

`@file-viewer/vite-plugin` 是最终的工程化入口，目标不是替代显式 import，而是把显式 import 自动生成。

```ts
fileViewerRenderers({
  formats: ['pdf', 'docx', 'xlsx', 'dwg', 'typst'],
  preset: 'custom',
  copyAssets: true,
  chunkStrategy: 'renderer',
  missingRenderer: 'error'
})
```

插件需要完成：

- 根据 `formats` 查 `renderer manifest`，生成 `virtual:file-viewer-renderers`。
- 如果用户选择 `preset: 'all' | 'office' | 'engineering' | 'lite'`，自动 import 对应 preset。
- 检查 package 是否已安装；缺失时给出明确安装命令，而不是运行时报错。
- 复制 worker/wasm/vendor assets，并生成部署清单，服务于 Cloudflare Pages、Vercel、Docker、内网静态部署。
- 为 Vite 8 生成 Rolldown code splitting 配置；为 Vite 7/Rollup/Rspack/Webpack 提供对应 adapter 或文档 fallback。
- 产出 bundle 预算报告，让用户知道每条 renderer 带来的安装和打包成本。

## 分阶段实施路线

| 波次   | 目标                      | 关键动作                                                                                       | 完成证据                                                            |
| ------ | ------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Wave 0 | 建立依赖账本              | `audit:renderer-deps` 输出 core 直接重依赖、目标包、阶段和状态；新增安装体积和 bundle 预算脚本 | CI 能报告 core 依赖数、packed size、安装依赖闭包、demo 首屏 chunk   |
| Wave 1 | 完成 Phase 2 重链路拆出   | Word、Spreadsheet、OFD、Presentation、PDF、Typst、CAD、Archive 全部从 core 迁到 renderer 包    | `@file-viewer/core` 不再声明这些依赖；`preset-all` 格式矩阵不掉格式 |
| Wave 2 | 完成 Phase 3 体验链路拆出 | Drawing、3D、MindMap、Geo、Email、Ebook、Text、Media、Image 独立维护                           | 默认组件安装不带相关重库；各 renderer 有独立 smoke                  |
| Wave 3 | 完成 Phase 4 专业内核     | Data Asset 与 EDA 结构预览已先拆出独立 renderer；OASIS 大版图、OrCAD/Allegro 高保真图形继续独立内核化，复杂格式不挤进 core | 文档明确边界，复杂样例能结构化预览或进入专用内核                    |
| Wave 4 | 工程自动化                | `@file-viewer/vite-plugin`、asset manifest、virtual module、chunk strategy、离线部署校验       | 用户按 `formats` 配置即可自动生成 renderer 装配                     |
| Wave 5 | 默认轻量切换              | 组件包默认 `builtinRenderers: 'lite'` 或 `none`，全量能力改由 preset 显式启用                  | 新项目 cold install 明显下降；旧全量 demo 仍完整                    |

## 当前渲染线拆分计划

| 阶段    | 渲染线                                                                         | 目标包                                                                                                                                                                                                                                                                              |
| ------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Phase 1 | core 插件协议、wrapper 传参、preset-all 兼容层、资产 manifest v2、迁移校验脚本 | `@file-viewer/core`、所有组件包                                                                                                                                                                                                                                                     |
| Phase 2 | PDF、Word/DOCX/DOC/ODT/RTF、Excel、PPT、OFD、Typst、CAD、Archive               | `@file-viewer/renderer-pdf`、`@file-viewer/renderer-word`、`@file-viewer/renderer-spreadsheet`、`@file-viewer/renderer-presentation`、`@file-viewer/renderer-ofd`、`@file-viewer/renderer-typst`、`@file-viewer/renderer-cad`、`@file-viewer/renderer-archive`                      |
| Phase 3 | XMind、Draw.io/Excalidraw、3D、Geo、Email、EPUB、Code/Markdown、Media、Image   | `@file-viewer/renderer-mindmap`、`@file-viewer/renderer-drawing`、`@file-viewer/renderer-3d`、`@file-viewer/renderer-geo`、`@file-viewer/renderer-email`、`@file-viewer/renderer-ebook`、`@file-viewer/renderer-text`、`@file-viewer/renderer-media`、`@file-viewer/renderer-image` |
| Phase 4 | EDA、GDSII/OASIS、OrCAD/Allegro、复杂数据资产                                  | `@file-viewer/renderer-eda`、`@file-viewer/eda-layout`、`@file-viewer/eda-orcad`、`@file-viewer/renderer-data`                                                                                                                                                                      |
| Phase 5 | Vite 插件、自动 sample smoke matrix、安装体积预算、release pipeline 分发       | `@file-viewer/vite-plugin`、release scripts                                                                                                                                                                                                                                         |

## 复杂格式方案边界

| 格式线                      | 当前优先方案                                                                                                                                                  | 后续拆包方向                                                                                             |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Presentation / PPTX         | `@file-viewer/renderer-presentation` 作为标准 renderer 插件，底层复用 `@file-viewer/pptx` 原生引擎和 Worker 渐进幻灯片输出；ODP 仍归 OpenDocument 兼容链路。 | core 已移除 `@file-viewer/pptx` 直接依赖，PowerPoint 完整预览统一通过 renderer-presentation 或 preset-all 装配。 |
| Word / DOCX / DOC / RTF / ODT | `@file-viewer/renderer-word` 作为标准 renderer 插件，底层按需加载自研 `@file-viewer/docx`、`msdoc-viewer` 和 RTF/OpenDocument 兼容链路。 | core 已移除 `@file-viewer/docx`、`msdoc-viewer`、`rtf.js`、`linkedom` 等 Word 直接依赖，Word 完整预览统一通过 renderer-word 或 preset-all 装配。 |
| OFD                         | 使用 `DLTech21/ofd.js` 源码链路在线预览，避开 npm dist 授权 WASM 分支；当前已经拆成 `@file-viewer/renderer-ofd`，vendor 源码随包离线分发。                  | 后续清理 core 中的兼容 OFD 入口，并补充独立样例 smoke。                                                  |
| Typst                       | 使用官方 Typst Rust/WASM 生态在浏览器内编译并渲染，不退化为源码查看。                                                                                         | `@file-viewer/renderer-typst` 独立维护 compiler/renderer WASM、字体和缓存策略。                          |
| Draw.io / diagrams.net      | `@file-viewer/renderer-drawing` 以 diagrams.net 官方离线 viewer 包、`viewer-static.min.js` 和 XML/SVG 解析链路为基准，优先保证离线预览，不依赖公网 CDN。       | 后续在该包内继续统一 Mermaid / PlantUML 等绘图资产。                                                      |
| OpenDocument / WPS 兼容格式 | 常规 ODT/ODS/ODP 走 ZIP+XML 结构解析；高保真 Office 兼容方向预留 LibreOffice WASM 路线。                                                                      | Office renderer 拆出后，复杂版式可继续独立演进为 WASM 后端。                                             |
| XMind                       | 解析现代 `content.json` 和经典 `content.xml`，渲染层提供 Pointer / 鼠标 / 触摸可拖拽、缩放、定位的只读画布；官方 XMind TS/SVG viewer 可作为后续高保真对照，但不直接引入不可控交互。 | `@file-viewer/renderer-mindmap` 单独维护 XMind/FreeMind/OPML 等思维导图体验。                            |
| Archive                     | 优先 `libarchive.js` Worker + WASM，覆盖 RAR/7z/TAR/ZIP 等多格式；Worker 不可用时降级 ZIP/TAR/GZIP，内部文件点击后再按需解压和嵌套预览。                      | `@file-viewer/renderer-archive` 独立维护 worker/wasm、缓存、内存上限和移动端 fallback。                  |
| EDA / 工程二进制            | `@file-viewer/renderer-eda` 先承接 OLB/DRA/GDSII/OASIS 的结构预览；标准 GDSII 用纯 TS 解析 records 并生成 SVG 快速版图，OASIS 与 Cadence 专有二进制先做安全索引和诊断。 | 大型 OASIS/GDSII 后续适合引入 KLayout / dump_oas_gds2 路线的 WASM 或 WebGL 增量渲染；Cadence DRA/OLB/DSN 高保真预览以后续 OpenAllegroParser/OpenOrCadParser WASM 化为主。 |

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
- [x] 建立 `@file-viewer/renderer-word` 独立包，并让 `@file-viewer/preset-all` 优先聚合该包的 DOCX / DOC / RTF / ODT renderer。
- [x] 建立 `@file-viewer/renderer-ofd` 独立包，并让 `@file-viewer/preset-all` 优先聚合该包的 OFD renderer。
- [x] 建立 `@file-viewer/renderer-presentation` 独立包，并让 `@file-viewer/preset-all` 优先聚合该包的 OOXML 演示文稿 renderer。
- [x] 建立 `@file-viewer/renderer-cad` 独立包，并让 `@file-viewer/preset-all` 优先聚合该包的 CAD renderer。
- [x] 建立 `@file-viewer/renderer-typst` 独立包，并让 `@file-viewer/preset-all` 优先聚合该包的 Typst renderer。
- [x] 建立 `@file-viewer/renderer-archive` 独立包，并让 `@file-viewer/preset-all` 优先聚合该包的 archive renderer。
- [x] 建立 `@file-viewer/renderer-email` 独立包，并让 `@file-viewer/preset-all` 优先聚合该包的 EML / MSG / MBOX renderer。
- [x] 建立 `@file-viewer/renderer-ebook` 独立包，并让 `@file-viewer/preset-all` 优先聚合该包的 EPUB renderer。
- [x] 建立 `@file-viewer/renderer-mindmap` 独立包，并让 `@file-viewer/preset-all` 优先聚合该包的 XMind renderer。
- [x] 建立 `@file-viewer/renderer-drawing` 独立包，并让 `@file-viewer/preset-all` 优先聚合该包的 Draw.io / Excalidraw renderer。
- [x] 建立 `@file-viewer/renderer-3d` 独立包，并让 `@file-viewer/preset-all` 和 `@file-viewer/vite-plugin` 优先聚合该包的 3D renderer。
- [x] 建立 `@file-viewer/renderer-text` 独立包，并让 `@file-viewer/preset-all` 优先聚合该包的代码 / Markdown renderer。
- [x] 建立 `@file-viewer/renderer-image` 独立包，并让 `@file-viewer/preset-all` 优先聚合该包的图片 / HEIC renderer。
- [x] 建立 `@file-viewer/renderer-media` 独立包，并让 `@file-viewer/preset-all` 优先聚合该包的音频 / 视频 / HLS / MIDI renderer。
- [x] 建立 `@file-viewer/renderer-geo` 独立包，并让 `@file-viewer/preset-all` 优先聚合该包的 GeoJSON / KML / GPX / SHP renderer。
- [x] 建立 `@file-viewer/renderer-data` 独立包，并让 `@file-viewer/preset-all` 和 `@file-viewer/vite-plugin` 优先聚合 PSD / SQLite / Parquet / Avro / WASM / 字体 / AI / EPS / WebArchive renderer。
- [x] 建立 `@file-viewer/renderer-eda` 独立包，并让 `@file-viewer/preset-all` 和 `@file-viewer/vite-plugin` 优先聚合 OLB / DRA / GDSII / OASIS renderer。
- [ ] 每个 renderer 包有独立 `package.json#exports`、README、assets manifest、type-check、build、browser smoke。
- [ ] demo 使用 `preset-all`，业务组件 README 默认展示 lite/office/cad 按需安装示例。
- [ ] 全量 preset 和历史兼容包仍能覆盖原来的格式矩阵。
- [ ] 安装 `@file-viewer/vue3` 不再安装 `pdfjs-dist`、`@flyfish-dev/cad-viewer`、`@myriaddreamin/*`、`libarchive.js`。

### Phase 3：体验与自动化

- [x] `@file-viewer/vite-plugin` 能按 `formats` 自动生成 `virtual:file-viewer-renderers`，已覆盖 Word、PDF、OFD、Presentation、CAD、Drawing、3D、Typst、Archive、Email、EPUB、Text、Image、Media、XMind、Geo、Data 和 EDA；尚未拆出的格式会给出明确缺失提示。
- [x] 插件能复制已拆 renderer 中需要自托管的 PDF/CAD/Typst/Archive/Data worker、wasm 和 vendor assets，并输出 `flyfish-viewer-assets.json` 部署 manifest；OFD vendor 随 `@file-viewer/renderer-ofd` npm 包离线分发，3D 与 EDA renderer 当前无额外外部资产，Office 等待对应 renderer 拆包后补入。
- [ ] demo 构建 chunk 按 renderer 命名，PDF/Office/CAD/Typst/3D 等不会进入首屏主包。
- [ ] 每个 wrapper 的文档都提供“一个组件，一行代码”和“按需 renderer”两种接入方式。
- [ ] 增加独立安装 smoke：只安装 `@file-viewer/core + @file-viewer/renderer-pdf` 时 PDF 可预览，其他格式显示明确缺失提示。

### Phase 4：专业格式独立内核

- [x] EDA/GDS/OASIS/OrCAD/Allegro 独立 renderer 包建立结构预览入口、README 和解析边界说明。
- [ ] OASIS/GDSII 大文件走 WebGL 或 WASM，不进入 core 首屏链路。
- [ ] `@file-viewer/eda-layout` 和 `@file-viewer/eda-orcad` 能独立发布、独立回归。
- [ ] docs 明确“结构预览”和“完整可视预览”的差异，避免营销口径误导。

### Phase 5：发布与质量门禁

- [x] 新增安装体积预算：`@file-viewer/core`、`@file-viewer/vue3`、`@file-viewer/web`、`@file-viewer/preset-all` 的 packed size、unpacked size、文件数、直接依赖数和安装依赖闭包纳入 CI；真实 cold install 秒级计时保留为后续增强。
- [x] 新增 demo bundle 预算：`index.html` 和 `compare.html` 首屏入口统计 raw/gzip/brotli，PDF、Office、CAD、Typst、Archive、3D、Geo、XMind 等重链路必须保持异步 renderer chunk；lite/office/engineering preset 分项预算保留为后续增强。
- [ ] 新增 release 校验：每个 renderer 包 npm tarball、README、exports、assets manifest、smoke 样本齐全。
- [ ] 官网、文档站、README 的支持矩阵能区分 core、preset-lite、preset-office、preset-engineering、preset-all。
- [ ] 迁移完成后 `@file-viewer/core` 的 `dependencies` 只保留真正跨 renderer 的轻量工具，重依赖直接数量接近 0。

## 当前状态

运行以下命令可以查看当前 core 直接依赖和目标拆包路线：

```bash
pnpm audit:renderer-deps
pnpm audit:renderer-deps -- --json
```

截至当前工作区，`@file-viewer/core` 仍直接声明 31 个渲染依赖：

- Phase 2 还有 14 个依赖留在 core，其中 Presentation 和 Word 已完成 core 直接依赖摘除；下一步优先拆 Spreadsheet、PDF、OFD 或剩余 Office 兼容链路，继续减少默认安装面。
- Phase 3 还有 14 个依赖留在 core。
- Phase 4 还有 5 个依赖留在 core，其中 Data Asset 与 EDA 已分别建立 `@file-viewer/renderer-data`、`@file-viewer/renderer-eda` 独立包；下一步是清理 core 兼容入口里的 `ag-psd`、`sql.js`、`hyparquet`、`avsc` 和 `cfb` 直接依赖。

这说明 renderer 包和 `preset-all` 已经具备雏形，但“默认安装轻量化”尚未完成。短期先保留 `preset-all` 兼容完整能力，长期验收标准是组件包默认安装不再拉取 PDF、Office、CAD、Typst、Archive、3D 等重依赖。

## 终态验收门禁

完成精细化渲染架构前，以下门禁必须全部通过：

```bash
pnpm audit:renderer-deps
pnpm verify:core-framework-neutral
pnpm verify:core-api
pnpm verify:core-dependency-budget
pnpm verify:renderer-contracts
pnpm verify:renderer-assets
pnpm verify:install-budget
pnpm verify:bundle-budget
pnpm verify:format-support
pnpm verify:ecosystem-versions
pnpm verify:production-entrypoints
pnpm renderers:verify
pnpm docs:build
pnpm build-only
```

已落地与计划中的精细门禁：

- `verify:core-dependency-budget`：已落地。默认按当前基线阻止 core 直接渲染依赖继续膨胀；`verify:core-dependency-budget:strict` 用于拆包完成后的终态，要求 core 重渲染依赖为 0。
- `verify:renderer-contracts`：已落地。检查每个 renderer 包的 `exports`、`files`、README、LICENSE、dist 入口、build/type-check 脚本、wrapper 依赖隔离和 plugin 懒加载出口。
- `verify:renderer-assets`：已落地。检查每个 renderer npm dry-run 中的入口、`new URL(..., import.meta.url)` 本地运行时资源、core asset manifest 字段，以及 `@file-viewer/web` 发布包内的 viewer worker/wasm/vendor assets。
- `verify:install-budget`：已落地。检查关键包和 renderer/wrapper 默认预算的 npm packed size、unpacked size、文件数、直接 runtime dependencies、外部依赖闭包和本地生态包闭包，防止安装面继续膨胀。
- `verify:bundle-budget`：已落地。检查官方 demo 与文档比对入口的 raw/gzip/brotli 首屏体积，确认完整格式能力仍被拆到异步 renderer chunk，避免 Office/CAD/Typst/Archive/3D 等重链路污染入口包。
- `verify:renderer-standalone-smoke`：计划中。任意单 renderer + 任意 wrapper 能独立预览对应样例。
- `verify:cold-install-time`：计划中。在隔离临时目录中安装本地 tarball，记录 `@file-viewer/core`、`@file-viewer/vue3`、`@file-viewer/preset-all` 的真实冷安装耗时。

## 外部参考

- Vite 生产构建、动态导入错误处理和 Vite 8 chunk 策略: <https://vite.dev/guide/build>
- Rollup `manualChunks` 配置: <https://rollupjs.org/configuration-options/>
- Node.js package `exports` 与 conditional exports: <https://nodejs.org/api/packages.html>
- pnpm optional peer metadata: <https://pnpm.io/package_json#peerdependenciesmeta>

<div class="doc-note">
  这个计划的核心不是“拆很多包”本身，而是让用户用到什么才安装什么、打包什么、部署什么。完整能力仍然保留，但默认体验必须轻。
</div>
