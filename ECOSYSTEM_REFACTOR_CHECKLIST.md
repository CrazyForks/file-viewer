# File Viewer 生态重构 Checklist

> 目标: 在保留当前完整且完全相同预览体验的前提下，把项目演进为以纯 TypeScript core 为唯一底座、各框架只作为 wrapper 的多生态文件预览体系。

## 基线

- 基线分支: `v3`
- 基线提交: `c6132d286499d1c6acf82d3df5fe7baa120c832d`
- 记录时间: `2026-06-17 16:38:01 +0800`
- 当前源码远端: `origin -> https://git.flyfish.dev/flyfish-group/file-viewer.git`
- 当前根包: `@flyfish-group/file-viewer3@1.0.26`
- 当前适配层:
  - `packages/web`: `@flyfish-group/file-viewer-web@1.0.26`
  - `packages/react`: `@flyfish-group/file-viewer-react@1.0.26`
  - `packages/demo`: `@flyfish-group/file-viewer-demo@1.0.26`
- 当前关键事实:
  - 根包仍是 Vue3 组件库，不是纯 TypeScript core。
  - 大量渲染器由 TS/TSX + Vue SFC 混合实现，`FileViewer.vue` 仍是核心入口。
  - React 和纯 JS 当前是 iframe 适配层，不是基于纯 TS core 的 wrapper。
  - 尚不存在 `@file-viewer/*` 标准命名包。
  - 尚不存在 jQuery、Svelte、Vue 2.6、React legacy/new 双线 wrapper。
  - `main` 当前仍是 Vue2 相关代码分支，不满足“主分支仅维护 core 核心底座”。

## 总体不变量

- [ ] 用户看到的主 Demo、文档比对页、iframe 体验、示例文件选择器、工具栏、水印、搜索、缩放、打印、导出、主题、生命周期 hooks 和 beforeOperation 行为保持一致。
- [ ] 当前 194 个扩展名、23 条预览链路的支持矩阵不得倒退。
  - [x] 新增 `pnpm verify:format-support`，从 core 格式矩阵校验 194 个扩展名、23 条预览链路、无重复扩展名归属，并确认 README / 文档站 / wrapper README 口径一致。
- [ ] 各生态 wrapper 共享同一个 core 版本、同一套类型定义、同一套参数语义和同一套能力判断。
- [ ] core 源码只在 Gitea 私有仓库维护，不把私有 core 源码推到公开 GitHub/Gitee。
- [ ] 除 core 之外的生态 wrapper 项目公开维护，GitHub 和 Gitee 均在 `flyfish-dev` 组织下同步。
- [ ] 现有 npm 包名继续作为标准包名的兼容别名同步更新。
- [ ] 公开产物仓库 `flyfish-dev/file-viewer` 只发布混淆/压缩后的构建产物、Demo、文档、示例、tarball 和分发说明。

## 目标包名和仓库矩阵

| 能力 | 标准 npm 包名 | 兼容/历史 npm 包名 | 代码归属 | 公开仓库 | Gitee 镜像 | 状态 |
| --- | --- | --- | --- | --- | --- | --- |
| Core | `@file-viewer/core` | 待定 | Gitea 私有当前仓库 `main` | 不公开源码，仅公开包和产物 | 不公开源码，仅公开包和产物 | [ ] 待建 |
| Vue 3 wrapper | `@file-viewer/vue3` | `@flyfish-group/file-viewer3`, `file-viewer3` | 公开 wrapper 仓库 | `github.com/flyfish-dev/file-viewer-vue3` | `gitee.com/flyfish-dev/file-viewer-vue3` | [~] monorepo 标准 wrapper 包已建，独立公开仓库待拆 |
| Vue 2.7 wrapper | `@file-viewer/vue2.7` | `@flyfish-group/file-viewer` | 公开 wrapper 仓库 | `github.com/flyfish-dev/file-viewer-vue2.7` | `gitee.com/flyfish-dev/file-viewer-vue2.7` | [~] monorepo wrapper 包已建，独立公开仓库待拆 |
| Vue 2.6 wrapper | `@file-viewer/vue2.6` | 无 | 公开 wrapper 仓库 | `github.com/flyfish-dev/file-viewer-vue2.6` | `gitee.com/flyfish-dev/file-viewer-vue2.6` | [~] monorepo wrapper 包已建，独立公开仓库待拆 |
| React wrapper | `@file-viewer/react` | `@flyfish-group/file-viewer-react` | 公开 wrapper 仓库 | `github.com/flyfish-dev/file-viewer-react` | `gitee.com/flyfish-dev/file-viewer-react` | [~] monorepo 自包含标准 wrapper 已建，独立公开仓库待拆 |
| React legacy wrapper | `@file-viewer/react-legacy` | 无 | 公开 wrapper 仓库 | `github.com/flyfish-dev/file-viewer-react-legacy` | `gitee.com/flyfish-dev/file-viewer-react-legacy` | [~] monorepo wrapper 包已建，独立公开仓库待拆 |
| Pure JS wrapper | `@file-viewer/web` | `@flyfish-group/file-viewer-web` | 公开 wrapper 仓库 | `github.com/flyfish-dev/file-viewer-web` | `gitee.com/flyfish-dev/file-viewer-web` | [~] monorepo 自包含标准 wrapper 已建，独立公开仓库待拆 |
| jQuery wrapper | `@file-viewer/jquery` | 无 | 公开 wrapper 仓库 | `github.com/flyfish-dev/file-viewer-jquery` | `gitee.com/flyfish-dev/file-viewer-jquery` | [~] monorepo wrapper 包已建，独立公开仓库待拆 |
| Svelte wrapper | `@file-viewer/svelte` | 无 | 公开 wrapper 仓库 | `github.com/flyfish-dev/file-viewer-svelte` | `gitee.com/flyfish-dev/file-viewer-svelte` | [~] monorepo wrapper 包已建，独立公开仓库待拆 |
| Public artifacts | 非源码分发 | 当前 `flyfish-dev/file-viewer` | 公开产物仓库 | `github.com/flyfish-dev/file-viewer` | `gitee.com/flyfish-dev/file-viewer` | [ ] 待更新 |

## Phase 0: 基线冻结与验收网

- [ ] 给当前 `v3` 最新状态创建迁移基线 tag，记录支持矩阵和关键截图。
- [x] 把 `pnpm type-check`、`pnpm build-only`、`pnpm docs:build` 固化为每轮迁移必跑 gate。
  - [x] 新增 `pnpm verify:migration-gates`，统一执行类型检查、主 Demo 构建、文档站构建、wrapper 源包校验和生态 npm manifest 列表校验。
  - [x] `pnpm verify:migration-gates` 已串联 wrapper 运行 API 和参数面校验，避免标准 wrapper 体验漂移。
- [x] 补充统一 smoke 清单，至少覆盖 PDF、DOCX、XLSX、PPTX、OFD、CAD、DWF/DWFX、EPUB、压缩包、邮件、Markdown、代码、图片、音视频、地理数据、数据资产。
  - [x] 新增 `ecosystem/smoke-matrix.json`，覆盖 23 条 renderer pipeline、Phase 0 要求的格式族、真实示例文件和 8 个 wrapper 基础入口。
  - [x] 新增 `pnpm verify:smoke-matrix`，反查 core renderer 定义、wrapper manifest 和 `public/example` 样本，避免 smoke 清单漂移。
  - [x] `pnpm verify:format-support` 作为支持矩阵防回退门禁，保证文档宣传数量和 core 实际注册数量一致。
- [ ] 为 wrapper 迁移准备对比用例: Vue3 当前组件、iframe 当前组件、React 当前适配层、纯 JS 当前适配层。
- [ ] 明确“体验完全相同”的证据: DOM 快照、关键截图、事件回调、能力按钮显隐、options 行为、打印/导出结果。

## Phase 1: 设计纯 TypeScript core 边界

- [ ] 定义 `@file-viewer/core` 的公开 API:
  - [x] `createViewer(container, options)`
  - [x] `viewer.load(source)`
  - [x] `viewer.destroy()`
  - [x] `viewer.updateOptions(options)`
  - [x] `viewer.getCapabilities()`
  - [x] `viewer.zoomIn()/zoomOut()/resetZoom()`
  - [x] `viewer.search()/nextSearchResult()/previousSearchResult()/clearSearch()`
  - [x] `viewer.print()/download()/exportHtml()`
  - [x] `viewer.collectDocumentAnchors()/getDocumentTextChunks()`
- [x] 定义 framework-neutral 类型:
  - [x] `FileViewerOptions`
  - [x] `FileViewerSource`
  - [x] `ViewerLifecycleContext`
  - [x] `ViewerOperationContext`
  - [x] `ViewerCapabilityState`
  - [x] `RendererPlugin`
  - [x] `RendererSession`
  - [x] `RenderSurface`
  - [x] 新增 `pnpm verify:core-api`，校验 `@file-viewer/core` 入口继续导出公开 API、framework-neutral 类型和 `FileViewerInstance` 方法。
- [x] 定义 renderer registry，所有格式只通过 core 注册与派发。
- [x] 定义统一 options 序列化协议，保证 iframe / pure JS / wrapper 行为一致。
  - [x] `@file-viewer/core` 提供 JSON-safe options 清洗、序列化、URLSearchParams 写入和解析。
  - [x] runtime-only hooks / beforeOperation 在 iframe 查询参数中显式剥离，避免不同 wrapper 行为漂移。
  - [x] `packages/web`、Vue 基线入口和 React wrapper 复用同一协议。
  - [x] iframe / wrapper postMessage 事件桥接迁入 core，生命周期、操作、搜索、定位、缩放状态复用同一投递协议。
  - [x] iframe 事件 payload 类型与校验 guard 迁入 core，`packages/web` / React wrapper 复用同一事件识别逻辑。
  - [x] iframe URL 构建、来源文件名推导、本地文件 Blob 投递迁入 core，`packages/web` 保留原 API 薄封装。
  - [x] React wrapper 运行逻辑直接依赖 core iframe 协议，`packages/web` 仅作为 viewer 静态产物兼容分发通道。
  - [x] iframe 本地文件 postMessage 重试、生命周期确认和定时器清理迁入 core，`packages/web` / React wrapper 复用同一控制器。
  - [x] 纯 Web iframe create/sync/mount 控制器迁入 core，`packages/web` 仅注入默认入口、缓存 key 和历史 API 名称。
- [x] 定义错误、loading、空状态、unsupported 状态的 core 级呈现协议。
  - [x] `@file-viewer/core` 提供 `FileViewerStateDescriptor` / `FileViewerStateTheme`，覆盖 loading、ready、empty、unsupported、error。
  - [x] 下载、流式 PDF、常规解析的默认进度文案迁入 core，Vue3 入口复用同一常量。
  - [x] unsupported fallback 和错误格式化复用 core descriptor，避免 wrapper 各自硬编码状态文案。
  - [x] Vue3 展示派生状态拆到组件 hooks，文件名、扩展名、主题、toolbar 默认值和错误状态复用 core 规则。
- [x] 定义 assets/worker/wasm 路径解析策略，避免 wrapper 各自实现资源路径逻辑。
  - [x] `@file-viewer/core` 提供 viewer asset URL、archive worker/wasm、CAD wasm/worker、Typst compiler wasm 默认解析。
  - [x] archive / CAD / Typst 首批重型资源链路接入 core resolver，保持现有默认路径与 fallback 行为。
  - [x] renderer asset manifest 已由 core 声明 archive、CAD、Typst 的 worker/WASM 资源，并提供统一解析 API，供 React/Vue/Svelte/pure JS wrapper 自动复制或外链。
  - [x] `@flyfish-group/file-viewer-web` / `@file-viewer/web` 复制脚本接入 core manifest，生成 `flyfish-viewer-assets.json` 并校验 public worker/WASM 资源。

## Phase 2: 抽离现有能力到 core

- [ ] 从 `src/package/common` 抽出 source loading、类型识别、能力判断、打印导出、worker ref、生命周期事件。
  - [x] source loading 的 PDF 流式策略迁入 `@file-viewer/core`。
  - [x] source loading 的请求版本、AbortController 和取消错误识别迁入 `@file-viewer/core`，wrapper 只负责触发 UI 状态。
  - [x] Vue3 来源加载门面拆到组件 hooks，复用 core source loading / source / state helper，继续削薄主入口。
  - [x] 文件名归一化、扩展名识别和 source 归一化迁入 `@file-viewer/core`。
  - [x] `File | Blob | ArrayBuffer` 输入包装和 ArrayBuffer 读取迁入 `@file-viewer/core`。
  - [x] 打印能力矩阵和 `resolvePrintAvailability` 迁入 `@file-viewer/core`。
  - [x] 生命周期上下文构建、生命周期 hook 分发、iframe 安全序列化迁入 `@file-viewer/core`。
  - [x] 操作上下文、beforeOperation / toolbar pre-hook 顺序、取消协议迁入 `@file-viewer/core`。
  - [x] Vue3 生命周期与 beforeOperation 门面拆到组件 hooks，复用 core context / hook / postMessage 协议，继续降低主入口职责。
  - [x] toolbar 默认值、可见性、PDF 默认悬浮位置和 operation availability 迁入 `@file-viewer/core`。
  - [x] Vue3 工具栏与能力状态门面拆到组件 hooks，复用 core operation availability / toolbar position / postMessage 协议。
  - [x] 搜索 provider、缩放 provider、文档锚点/文本切片协议补齐到 `@file-viewer/core`。
  - [x] 渲染上下文 `FileRenderContext`、通用 handler 协议迁入 `@file-viewer/core`。
  - [x] worker ref 管理迁入 `@file-viewer/core`，Vue3 兼容路径改为 re-export。
  - [x] Vue3 对外实例方法拆到组件 hooks，并沉淀 `FileViewerExpose` 类型，demo / compare 复用同一 API 契约。
  - [x] Vue3 props / emits 契约沉淀为 `FileViewerProps` / `FileViewerEmits`，入口组件复用公共类型。
  - [ ] 打印导出执行链路迁入 `@file-viewer/core`。
    - [x] 导出 HTML 文档模板迁入 `@file-viewer/core`，Vue3 旧路径保留 re-export。
    - [x] 页面尺寸、`@page`、打印页样式工具迁入 `@file-viewer/core`。
    - [x] 下载触发、canvas 快照替换、图片等待、打印窗口 ready、渲染 HTML 组装迁入 `@file-viewer/core`。
    - [x] core viewer 默认提供原文件下载、渲染 HTML 导出、打印窗口打开、beforeOperation 编排和高保真 HTML 快照。
    - [x] Vue3 `useViewerExport` 切换为 core operation executor + UI error adapter，和 core viewer 共享下载/导出/打印执行链路。
- [x] 从 `src/package/use` 抽出搜索、定位、缩放、loading 状态为纯 TS controller。
  - [x] 缩放状态标准化迁入 `@file-viewer/core`。
  - [x] 缩放 provider 发现、订阅、MutationObserver 和 beforeZoom 编排迁入 pure TS controller，Vue hook 仅保留响应式状态同步。
  - [x] loading 主题矩阵、运行态状态机和错误/消息切换迁入 pure TS controller，Vue hook 仅保留响应式状态同步。
  - [x] 搜索 options / empty state 标准化迁入 `@file-viewer/core`。
  - [x] AI 文本切片生成迁入 `@file-viewer/core`。
  - [x] DOM 锚点采集、DOM 搜索高亮、provider 注册表和 Vue 响应式门面继续拆分。
    - [x] DOM 锚点采集、当前定位和锚点滚动迁入 `@file-viewer/core`，Vue 旧路径保留 re-export/门面。
    - [x] 搜索/缩放 provider 注册表和查找协议迁入 `@file-viewer/core`，Vue 旧路径保持兼容。
    - [x] DOM 搜索高亮、命中滚动和 MutationObserver 调度迁入 pure TS controller，Vue hook 仅负责响应式状态同步。
- [x] 从 `src/package/vendors/renders.ts` 抽出 registry，保证格式注册不依赖 Vue。
  - [x] rendererId 到扩展名 handler 的派发器迁入 `@file-viewer/core`，Vue3 仅提供实际异步渲染 handler。
  - [x] FileRenderHandler 调用、legacy handler 到 RendererLoader 的适配和渲染实例销毁协议迁入 `@file-viewer/core`。
  - [x] Vue3 handler 列表可由 core 组合为带 `load()` 的 renderer registry，后续 wrapper 能复用同一桥接协议。
  - [x] Vue3 实际渲染入口改为通过 core renderer registry `load()` 进入，并透传旧版 `FileRenderContext` 保持现有渲染行为。
  - [x] Vue3 渲染实例卸载改为使用 core `RendererSession`，旧版 rendered 对象由 core session helper 统一包装。
  - [x] Vue3 渲染面板 surface 拆到组件 hooks，入口只组合 DOM surface、source loading 和 core registry bridge。
- [ ] 为每条现有预览链路建立 core renderer plugin:
  - [ ] Office Word/DOCX/DOC/DOT/RTF/ODT
  - [ ] Excel/表格
  - [ ] PPTX/ODP
  - [ ] PDF
  - [ ] OFD
  - [ ] Typst
  - [ ] 压缩包
  - [ ] 邮件/MBOX
  - [ ] OLB/DRA
  - [ ] CAD/DWF/DWFX/XPS
  - [ ] 地理数据
  - [ ] 3D 模型
  - [ ] Excalidraw/draw.io
  - [ ] EPUB/UMD
  - [ ] Markdown
  - [ ] 代码/文本
  - [ ] 图片/HEIC
  - [ ] 音视频/HLS/MIDI
  - [ ] 字体/设计/结构化数据资产
- [ ] 把 Vue SFC 依赖逐步替换为 core-managed DOM rendering、Web Components 或 framework-neutral view adapters。
- [ ] 保留必要第三方 UI/renderer 的异步加载，不把重型依赖打进 core 首屏。
- [ ] core 构建产物输出 ESM、类型声明、CSS/asset manifest、worker/wasm assets。

## Phase 3: 当前仓库分支职责重排

- [ ] 在 Gitea 私有仓库继续使用 `origin`。
- [ ] 将 `main` 改造为仅维护 core 核心底座代码。
  - [x] 新增 `ecosystem/branch-roles.json`，机器可读声明 `main` 的 core-only 私有源码职责。
- [ ] 将 `v2` 定义为 Vue 2.7 wrapper 分支。
  - [x] `ecosystem/branch-roles.json` 绑定 `v2 -> @file-viewer/vue2.7` 和 `@flyfish-group/file-viewer` 兼容包。
- [ ] 将 `v3` 定义为 Vue 3 wrapper 分支。
  - [x] `ecosystem/branch-roles.json` 绑定 `v3 -> @file-viewer/vue3`、`@flyfish-group/file-viewer3` 和 `file-viewer3` 兼容包。
- [ ] 给 `main`、`v2`、`v3` 写入分支职责 README 和发布流程说明。
  - [x] 新增根目录 `BRANCHES.md`，写明 core 私有源码、Vue2.7/Vue3 wrapper 线、公开 wrapper 仓库和公开成品仓库边界。
  - [x] 新增 `pnpm verify:branch-roles`，校验 `origin` Gitea 私有远端、branch role manifest、core visibility、wrapper GitHub/Gitee 组织和公开产物仓库 artifacts-only 策略。
- [ ] 确保 `v2` / `v3` wrapper 都依赖同一个 `@file-viewer/core`，不复制核心渲染逻辑。
  - [x] `v3` 的格式矩阵和渲染分发入口先接入 `@file-viewer/core`。
  - [ ] `v2` 同步接入同一个 `@file-viewer/core`。
- [ ] 从当前 Vue3 根包迁移出 wrapper 代码后，保留兼容 alias 发布流程。

## Phase 4: Wrapper 标准实现

- [ ] Vue 3 wrapper:
  - [x] 支持 plugin install、组件用法、props、events 和 ref/expose API。
  - [x] 兼容当前 `<file-viewer :url :file :options />` 输入体验，并通过 `@file-viewer/web` iframe controller 保持完整预览能力。
  - [x] `@file-viewer/vue3` 标准包名已从完整 Vue3 基线别名改为薄 wrapper；历史 `@flyfish-group/file-viewer3` / `file-viewer3` 继续作为兼容包同步维护。
- [ ] Vue 2.7 wrapper:
  - [x] 支持 `Vue.use(FileViewerPlugin)`，并允许自定义全局组件名。
  - [x] 提供 Vue 2.7 Options API 组件、事件和实例方法，复用 `@file-viewer/web` controller 保持当前 iframe 体验。
- [ ] Vue 2.6 wrapper:
  - [x] 不依赖 Vue 2.7 composition API。
  - [x] 提供 Options API 组件和 `Vue.use(FileViewerPlugin)` 插件安装，复用 `@file-viewer/web` controller。
- [x] React modern wrapper:
  - [x] 面向 React 18/19。
  - [x] 支持 `ref` API、受控 props、事件回调。
  - [x] `@file-viewer/react` 标准包名已改为自包含 wrapper，直接复用 `@file-viewer/core` iframe 协议和 `@file-viewer/web` viewer 入口，不再 re-export 历史 React 包。
- [ ] React legacy wrapper:
  - [x] 面向 React 16.8/17。
  - [x] 避免新 JSX transform / concurrent-only 依赖，使用 `React.createElement` + `@file-viewer/web` controller 作为薄封装。
- [x] Pure JS wrapper:
  - [x] 支持 `mountViewer(container, options)`，作为 `mountViewerFrame` 的标准化别名，不破坏历史 API。
  - [x] 支持 script tag / ESM / UMD 或 IIFE 分发。
    - [x] `@flyfish-group/file-viewer-web` 和 `@file-viewer/web` 构建 `dist/flyfish-file-viewer-web.iife.js`，暴露 `window.FlyfishFileViewerWeb`。
    - [x] 生产入口校验会执行 IIFE bundle，并断言 `mountViewerFrame`、`mountViewer`、`buildViewerSrc` 全局 API 存在。
    - [x] Adapter demo 输出 `/manual-iife.html`，使用普通 `<script>` 加载 IIFE 全局包，并由 `pnpm verify:adapter-demo-output` 校验页面和 helper 产物完整。
    - [x] 新增 `pnpm verify:adapter-browser-smoke`，可在 Playwright 环境下启动 adapter demo dist 并真实打开 demo 首页、`/vue3.html`、`/jquery.html`、`/svelte-action.html`、`/manual-js.html` 和 `/manual-iife.html`，验证 React/Pure Web/Vue3/jQuery/Svelte action wrapper iframe、手写 iframe + Blob postMessage 以及 IIFE 全局 API。
  - [x] `@file-viewer/web` 标准包名已改为自包含纯 Web wrapper，直接复用 `@file-viewer/core` iframe 协议，并随包携带 viewer 静态产物、复制 CLI、ESM API 和 IIFE 全局脚本。
- [ ] jQuery wrapper:
  - [x] 支持 `$(el).fileViewer(options)`。
  - [x] 支持 `destroy` / `reload` / `postFile` / `update` 方法调用，并可通过 `getFileViewerController()` 取得底层 controller。
- [ ] Svelte wrapper:
  - [x] 支持 Svelte component props/events/actions。
  - [x] 兼容 SvelteKit SSR 边界，浏览器端挂载 `@file-viewer/web` controller。
- [ ] 所有 wrapper 的 options、hooks、beforeOperation、toolbar、watermark、theme、search、ai、pdf、docx、typst、archive、cad 等参数保持完整一致。
  - [x] `@file-viewer/web` 统一导出 `ViewerRuntimeOptions`、toolbar、watermark、search、AI、PDF、DOCX、Typst、Archive、CAD 等运行时 option 类型别名。
  - [x] React、Vue 3、Vue 2.7、Vue 2.6、React legacy、jQuery、Svelte 标准 wrapper 统一 re-export `@file-viewer/web` 的完整类型面。
  - [x] 新增 `pnpm verify:wrapper-options`，阻止标准 wrapper 直接从 core 引入运行时 option 类型或重新声明 theme、toolbar、watermark、search、AI、Office、CAD 等参数字段。
  - [x] 标准 wrapper 统一 re-export `@file-viewer/web` 的 frame handle 与 frame param 类型，包括 `ViewerDirectFrameHandle` / `ViewerMountedFrameHandle` / `ViewerFrameControllerHandle` / `ViewerFrameParamValue`，避免不同生态类型出口漂移。
  - [x] 新增 `pnpm verify:wrapper-api`，校验 Vue、React、Pure JS、jQuery、Svelte wrapper 的运行入口、组件/插件/action/helper 导出和 controller 方法。
  - [x] 标准 wrapper 的 iframe handle / mounted controller handle / legacy controller handle 类型迁入 core，并经由 `@file-viewer/web` 统一透传。
  - [x] wrapper 共享 `viewerUrl/url/file/name/from/targetOrigin/params/cacheKey/options/onViewerEvent` frame component props 类型，React / Vue / Svelte / 兼容 React 包不再重复声明该参数面。
  - [x] wrapper 共享 iframe 外观与宿主容器 props 类型，Vue2.6 / Vue2.7 / Vue3 / React legacy / Svelte 不再各自维护 `iframeClassName/iframeStyle/iframeTitle/containerClass/containerStyle` 类型契约。
  - [x] wrapper 共享 props 到 iframe options 的转换 helper，`onViewerEvent` 与框架 emit/dispatch 的桥接顺序由 core/web 统一维护。
  - [x] wrapper 共享 mounted/controller handle 工厂，Vue2.6 / Vue2.7 / Vue3 / React legacy / Svelte 的公开实例方法默认值和销毁语义由 core/web 统一维护。
  - [x] React 标准 wrapper 的 iframe 文件投递控制器改为经由 `@file-viewer/web` 门面获取，标准 wrapper 不再直接 import `@file-viewer/core`。
  - [x] React 历史兼容包改为经由 `@flyfish-group/file-viewer-web` 门面获取 iframe 协议能力，不再直接 import `@file-viewer/core`。
  - [x] 新增 `pnpm verify:compatibility-api`，校验历史兼容包运行门面边界，防止 React 兼容包绕过 web 门面、scoped Vue3 兼容包重新声明 core 类型契约、`file-viewer3` 非 scoped alias 携带重复源码或纯 Web 兼容包丢失 core 门面导出。
  - [x] `pnpm verify:compatibility-api` 已对 scoped Vue3 根包的 `src/package/common/type.ts` 建立全量 alias 白名单，禁止兼容层重新出现 `export interface`、运行时 import、Vue import 或未登记类型别名。
  - [x] `pnpm verify:compatibility-api` 已锁定 scoped Vue3 根入口的公共类型出口，确保 `docx`、CAD、搜索 provider、导出上下文等完整参数类型只从 `./common/type` 兼容门面透出。

## Phase 5: 公开仓库与 README

- [x] 建立 `ecosystem/wrappers.json` 作为 wrapper npm 包、GitHub/Gitee 仓库和历史兼容包名的单一维护来源。
- [x] 提供 `scripts/sync-wrapper-readmes.mjs`，从 core 格式定义和 wrapper manifest 生成中英文 README 的生态矩阵与完整格式矩阵。
- [x] 提供 `scripts/sync-wrapper-repos.mjs`，可把 monorepo 中的 wrapper 包导出为独立公开仓库目录，并自动去除 `workspace:` 依赖和 monorepo-only `tsconfig` 路径引用。
- [x] 提供 `pnpm wrappers:standalone-smoke`，用本地生态 tarball 在临时独立仓库中执行 npm install/build，验证公开 wrapper 仓库离开 monorepo 后仍可构建。
- [x] 提供 `scripts/verify-wrapper-repos.mjs`，校验 wrapper 源目录和独立导出仓库的包名、npm 入口元数据、中英文 README、格式矩阵、Demo/文档链接、License、manifest、GitHub/Gitee 元数据、当前 HEAD freshness、`workspace:` 依赖、monorepo-only 脚本路径、历史兼容包依赖和私有 workspace 泄露。
- [x] 提供 `scripts/publish-wrapper-repos.mjs`，可把独立 wrapper 导出目录初始化为 Git 仓库，配置 GitHub/Gitee 远端，并在提交/推送前强制执行导出仓库 freshness、依赖边界和元数据预检。
- [x] `scripts/sync-public-artifacts.mjs` 接入统一 ecosystem npm release manifest，公开产物仓库会同步标准 wrapper tarball、仓库矩阵，并记录重复兼容 tarball 的省略策略。
- [x] 根 README / README.en.md 接入同一份 wrapper manifest，公开产物仓库同步时会自动写明标准 npm 包、GitHub/Gitee wrapper 仓库、core 源码私有边界和当前格式数量。
  - [x] 新增 `pnpm verify:ecosystem-readmes`，源码侧校验根 README / README.en.md 的公开生态索引，确保公开成品仓库同步前已包含标准包、历史兼容包、GitHub/Gitee wrapper 仓库、官方文档/Demo、源码自助开通入口和 core 私有边界。
- [ ] 为每个 wrapper 创建 GitHub 公开仓库。
- [ ] 为每个 wrapper 创建 Gitee 镜像仓库。
- [ ] 每个 wrapper 仓库包含:
  - [x] 中文 README
  - [x] English README
  - [x] 安装方式
  - [x] 快速开始
  - [x] 完整 options 指引
  - [x] 完整格式支持矩阵
  - [x] 与 `@file-viewer/core` 的关系说明
  - [x] 与历史包名兼容说明
  - [x] Demo 链接
  - [x] License / attribution / contribution 说明
- [x] 公开 README 明确 core 源码不在公开仓库，源码/商业二开入口仍按当前商业入口说明。
- [x] `flyfish-dev/file-viewer` 公开产物仓库 README 列出所有开源 wrapper 仓库和 npm 包。

## Phase 6: npm 发布与兼容别名

- [ ] 发布 `@file-viewer/core`。
- [ ] 发布 `@file-viewer/vue3`。
- [ ] 发布 `@file-viewer/vue2.7`。
- [ ] 发布 `@file-viewer/vue2.6`。
- [ ] 发布 `@file-viewer/react`。
- [ ] 发布 `@file-viewer/react-legacy`。
- [ ] 发布 `@file-viewer/web`。
- [ ] 发布 `@file-viewer/jquery`。
- [ ] 发布 `@file-viewer/svelte`。
- [ ] 同步发布兼容包:
  - [ ] `@flyfish-group/file-viewer3`
  - [ ] `file-viewer3`
  - [ ] `@flyfish-group/file-viewer`
  - [ ] `@flyfish-group/file-viewer-web`
  - [ ] `@flyfish-group/file-viewer-react`
- [x] 兼容包 README 明确推荐迁移到 `@file-viewer/*` 标准包名。
  - [x] 新增 `pnpm verify:compatibility-readmes`，根据 `ecosystem/wrappers.json` 校验当前 release 集合中的历史兼容包 README / README.en.md 都指向对应标准包名。
- [ ] 所有 npm 包版本号连续、依赖 core 版本一致、dist 类型声明完整。
  - [x] 新增 `scripts/release-ecosystem-packages.mjs`，统一列出、打包、dry-run 发布和正式发布 core、标准 wrapper 与历史兼容包，并在 pack/publish 前校验 `main`、`module`、`types`、`exports` 和 bin 指向的文件存在。
  - [x] 新增 `pnpm verify:ecosystem-versions`，独立校验 core、标准 wrapper 和历史兼容包的版本、内部 `workspace:^version` 依赖范围、wrapper manifest 对齐关系和标准 wrapper 不依赖历史包名。
  - [x] 生态发包与 tarball 校验要求所有 core、标准 wrapper 和历史兼容包都包含 `README.md` / `README.en.md`，包括根兼容包 `@flyfish-group/file-viewer3`。
  - [x] `pnpm verify:ecosystem-versions` 同步校验 core package 指向私有 Gitea 源码仓库、标准 wrapper package 指向各自 GitHub 公开仓库，并要求 package `files` 明确声明中英文 README。

## Phase 7: 构建产物与公开分发

- [ ] 生成 core dist、各 wrapper dist、各 adapter demo、主 demo、文档站、示例文件、worker/wasm assets。
  - [x] `scripts/sync-viewer-assets.mjs` 在 worker/WASM 资源内容未变化时保留已有 `flyfish-viewer-assets.json` 时间戳，避免发布构建后产生无意义源码仓脏变动。
- [ ] 公开产物仓库包含最新所有渠道分发构建产物。
- [ ] 公开产物仓库不包含私有 core 源码。
  - [x] 新增 `pnpm verify:public-artifacts`，校验公开产物仓库 release manifest、tarball、README、wrapper 仓库索引、允许根目录和源码边界，并接入 `pnpm release:public` 同步完成后的自动验收。
- [ ] 公开产物仓库 README 指向:
  - [ ] `@file-viewer/core`
  - [ ] `@file-viewer/vue3`
  - [ ] `@file-viewer/vue2.7`
  - [ ] `@file-viewer/vue2.6`
  - [ ] `@file-viewer/react`
  - [ ] `@file-viewer/react-legacy`
  - [ ] `@file-viewer/web`
  - [ ] `@file-viewer/jquery`
  - [ ] `@file-viewer/svelte`
  - [ ] GitHub/Gitee wrapper 仓库
  - [ ] 官方文档和 Demo
- [ ] GitHub Releases 提供每种接入方式可下载包。
- [ ] Docker / Cloudflare / Demo / 文档站部署脚本跟随新产物结构更新。

## Phase 8: 验证与发布门禁

- [ ] core 单测覆盖:
  - [x] 类型识别
  - [x] source loading
  - [x] lifecycle hooks
  - [x] beforeOperation
  - [x] renderer registry
  - [x] capability state
  - [x] search/location/zoom provider
  - [x] core API / 纯 TS 边界: `pnpm verify:core-api` 会阻止 core 入口、实例方法、ESM/声明产物元数据和源码依赖边界漂移。
- [x] wrapper smoke 覆盖:
  - [x] Vue 3
  - [x] Vue 2.7
  - [x] Vue 2.6
  - [x] React modern
  - [x] React legacy
  - [x] Pure JS
  - [x] jQuery
  - [x] Svelte
  - [x] `ecosystem/smoke-matrix.json` 的 `wrapperCoverage` 已为每个 wrapper 展开 PDF、DOCX、XLSX、图片、Markdown、CAD、压缩包、邮件、地理数据 smoke target。
- [x] wrapper repository export smoke 覆盖: `pnpm wrappers:export` 会刷新 README、导出 8 个独立 wrapper 仓库目录并运行 `pnpm wrappers:verify`。
- [x] wrapper runtime API smoke 覆盖: `pnpm verify:wrapper-api` 静态校验 8 个标准 wrapper 的运行入口和控制器能力。
- [x] 每个 wrapper 至少验证 PDF、DOCX、XLSX、图片、Markdown、CAD、压缩包、邮件、地理数据。
- [ ] 生产构建验证每个 wrapper 的 ESM/CJS/UMD/script tag 入口。
  - [x] 新增 `pnpm verify:production-entrypoints`，校验完整生态构建后的 package 声明入口、可导入 ESM 入口、纯 Web viewer 静态入口和 Vue3 基线静态资源入口。
  - [x] `pnpm release:ecosystem:build` 已在构建 core、viewer、标准 wrapper、历史兼容包、混淆产物和 wrapper 仓库导出后自动执行生产入口校验。
  - [x] 纯 Web IIFE script tag bundle 已纳入生产入口校验和 tarball 校验。
  - [x] Adapter demo 构建会输出并校验 `/manual-js.html` 与 `/manual-iife.html`，覆盖手写 iframe 和普通 script 标签接入的静态产物完整性。
  - [x] 新增可复现的 Playwright 浏览器 smoke 脚本，覆盖 adapter demo 首页的 React/Pure Web wrapper iframe、Vue3 wrapper 页面、jQuery wrapper 页面、Svelte action 页面、手写 iframe + Blob postMessage 页面和 script tag IIFE 页面。
  - [x] `ecosystem/wrappers.json` 新增 `entryFormats`，README、独立 wrapper manifest、公开成品 release manifest 和 wrapper 校验统一锁定 ESM、类型声明、Web IIFE、viewer 静态资源、复制 CLI、Svelte 组件等入口口径。
  - [ ] 独立 CJS / UMD / script tag 浏览器烟测仍需继续补齐到完整自动化。
- [ ] 浏览器 smoke 验证主 Demo、文档比对、iframe、script tag、React、Vue、jQuery、Svelte 示例。
  - [x] 新增 `pnpm verify:demo-browser-smoke`，在构建后的 `dist/` 上真实打开主 Demo 和 `/compare.html`，验证轻量文档渲染、文档比对双栏组件挂载和快捷键搜索浮层。
  - [x] 新增 `pnpm verify:browser-smoke`，构建主 Demo 与 adapter Demo 后统一跑主 Demo、文档比对、React/Web/Vue3/jQuery/Svelte、手写 iframe 和 script tag IIFE 浏览器 smoke。
- [x] 发布前检查 npm tarball 内容，不泄露私有源码。
  - [x] 新增 `pnpm verify:ecosystem-tarballs`，使用 npm dry-run 检查所有 core、标准 wrapper 和历史兼容包不会打入私有/未声明源码、工作区文件、source map、`.DS_Store` 或非 bin 脚本。
  - [x] `scripts/release-ecosystem-packages.mjs --pack` 生成正式 `.tgz` 后会再次校验实际 tarball，并确认入口文件存在且打包后的 `package.json` 不再包含 `workspace:` 依赖。

## 第一批可立即执行的代码任务

- [x] 在当前仓库新增 `packages/core` 或 `src/core` 草案目录，先迁移 framework-neutral 类型和 renderer registry。
- [x] 将 `src/package/common/type.ts` 中与 Vue 无关的类型抽到 core。
  - [x] `FileViewerOptions`、source、生命周期、操作、导出适配、渲染器 registry 等 framework-neutral 类型已进入 core。
  - [x] Vue3 公共 source 类型补齐 `buffer`，避免 wrapper hook 类型与 core 漂移。
  - [x] Vue3 公共搜索/缩放 provider 类型改为复用 core 类型。
  - [x] Vue3 公共 `FileRenderContext` / `FileHandler` 类型改为复用 core 类型。
  - [x] Vue3 公共打印布局和导出 HTML 模板改为复用 core。
  - [x] Vue3 iframe options 解析改为复用 core 序列化协议。
  - [x] Vue3 公共 watermark、toolbar、archive、PDF、DOCX、Typst、CAD、search、AI、lifecycle、operation、zoom 等 options / state 类型改为 core 类型别名，避免两套声明漂移。
  - [x] Vue3 `Rendered` / `AppWrapper` 兼容名改为 core `FileViewerRenderedInstance`，入口类型不再绑定 Vue `App`。
  - [x] Vue3 `file/url/options` props、事件 payload map 和 ref expose 方法面迁入 core，Vue 层仅保留 overload / alias。
  - [x] Vue3 `FileViewerEmits` 事件 overload 迁入 core `FileViewerComponentEmits`，旧 `src/package/common/type.ts` 仅保留同名兼容 alias。
  - [x] Vue3 根入口公共类型 re-export 已变成受控兼容层，`pnpm verify:compatibility-api` 会校验完整类型出口只能来自 `./common/type`。
- [x] 将 `src/package/vendors/renders.ts` 改造成 core registry 的适配入口。
- [ ] 给现有 Vue3 组件增加一个薄 wrapper 层，让它先调用 core registry，逐步降低 `FileViewer.vue` 职责。
  - [x] `FileViewer.vue` 已改用 core 的 lifecycle/operation/toolbar helper，继续保留 Vue emit、DOM 挂载和响应式状态。
- [x] 新增 `@file-viewer/core` package manifest 草案，暂不发布。
- [ ] 新增 wrapper README 模板，统一中英文结构和格式矩阵。
  - [x] 新增 `ecosystem/wrapper-readme-template.json`，集中声明 wrapper/public README 生成 marker、中英文标题、矩阵表头、必备官方链接和必备术语。
  - [x] `scripts/sync-wrapper-readmes.mjs` 改为读取 README 模板规范生成中英文生态矩阵和格式矩阵。
  - [x] `scripts/verify-wrapper-repos.mjs` / `scripts/verify-public-artifacts.mjs` 按模板规范校验 wrapper 与公开成品 README，确保所有标准包、GitHub/Gitee 仓库、官方文档、Demo、License 和格式数量不漂移。
  - [x] `scripts/verify-ecosystem-readmes.mjs` 复用同一模板规范，提前校验根 README 中英文公开生态索引，避免 release 同步后才发现公开说明缺口。
- [x] 先把 `packages/web` 和 `packages/react` 版本从 1.0.25 对齐到当前 1.0.26，再作为后续标准包名迁移基线。

## 完成审计标准

只有当以下证据同时成立，才能认为本目标完成:

- [ ] 当前私有 Gitea 仓库 `main` 分支只包含 core 核心底座源码。
- [ ] `v2` / `v3` 分支分别是 Vue2.7 / Vue3 wrapper，且依赖同一 core。
- [ ] 所有目标 wrapper 均存在 GitHub 和 Gitee 公开仓库。
- [ ] 所有 `@file-viewer/*` npm 包均发布成功，历史包名作为兼容 alias 同步发布。
- [ ] 所有 wrapper 的 README 中英文完整，且支持矩阵、参数、Demo、生态关系一致。
- [ ] 公开产物仓库包含最新全渠道构建产物和所有仓库索引，不包含私有 core 源码。
- [ ] 本地和生产 smoke 证明各生态体验与当前 v3 基线一致，没有功能倒退。
