# File Viewer 生态重构 Checklist

> 目标: 在保留当前完整且完全相同预览体验的前提下，把项目演进为以纯 TypeScript core 为唯一底座、各框架只作为 wrapper 的多生态文件预览体系。

## 基线

- 基线分支: `v3`
- 基线提交: `c6132d286499d1c6acf82d3df5fe7baa120c832d`
- 记录时间: `2026-06-17 16:38:01 +0800`
- 当前源码远端: `origin -> https://git.flyfish.dev/flyfish-group/file-viewer.git`
- 当前根包: `@flyfish-group/file-viewer3@1.0.26`
- 当前适配层:
  - `packages/web`: `@flyfish-group/file-viewer-web@1.0.25`
  - `packages/react`: `@flyfish-group/file-viewer-react@1.0.25`
  - `packages/demo`: `@flyfish-group/file-viewer-demo@1.0.25`
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
- [ ] 各生态 wrapper 共享同一个 core 版本、同一套类型定义、同一套参数语义和同一套能力判断。
- [ ] core 源码只在 Gitea 私有仓库维护，不把私有 core 源码推到公开 GitHub/Gitee。
- [ ] 除 core 之外的生态 wrapper 项目公开维护，GitHub 和 Gitee 均在 `flyfish-dev` 组织下同步。
- [ ] 现有 npm 包名继续作为标准包名的兼容别名同步更新。
- [ ] 公开产物仓库 `flyfish-dev/file-viewer` 只发布混淆/压缩后的构建产物、Demo、文档、示例、tarball 和分发说明。

## 目标包名和仓库矩阵

| 能力 | 标准 npm 包名 | 兼容/历史 npm 包名 | 代码归属 | 公开仓库 | Gitee 镜像 | 状态 |
| --- | --- | --- | --- | --- | --- | --- |
| Core | `@file-viewer/core` | 待定 | Gitea 私有当前仓库 `main` | 不公开源码，仅公开包和产物 | 不公开源码，仅公开包和产物 | [ ] 待建 |
| Vue 3 wrapper | `@file-viewer/vue3` | `@flyfish-group/file-viewer3`, `file-viewer3` | 公开 wrapper 仓库 | `github.com/flyfish-dev/file-viewer-vue3` | `gitee.com/flyfish-dev/file-viewer-vue3` | [ ] 待建 |
| Vue 2.7 wrapper | `@file-viewer/vue2.7` | `@flyfish-group/file-viewer` | 公开 wrapper 仓库 | `github.com/flyfish-dev/file-viewer-vue2.7` | `gitee.com/flyfish-dev/file-viewer-vue2.7` | [ ] 待建 |
| Vue 2.6 wrapper | `@file-viewer/vue2.6` | 无 | 公开 wrapper 仓库 | `github.com/flyfish-dev/file-viewer-vue2.6` | `gitee.com/flyfish-dev/file-viewer-vue2.6` | [ ] 待建 |
| React wrapper | `@file-viewer/react` | `@flyfish-group/file-viewer-react` | 公开 wrapper 仓库 | `github.com/flyfish-dev/file-viewer-react` | `gitee.com/flyfish-dev/file-viewer-react` | [ ] 待建 |
| React legacy wrapper | `@file-viewer/react-legacy` | 无 | 公开 wrapper 仓库 | `github.com/flyfish-dev/file-viewer-react-legacy` | `gitee.com/flyfish-dev/file-viewer-react-legacy` | [ ] 待建 |
| Pure JS wrapper | `@file-viewer/web` | `@flyfish-group/file-viewer-web` | 公开 wrapper 仓库 | `github.com/flyfish-dev/file-viewer-web` | `gitee.com/flyfish-dev/file-viewer-web` | [ ] 待建 |
| jQuery wrapper | `@file-viewer/jquery` | 无 | 公开 wrapper 仓库 | `github.com/flyfish-dev/file-viewer-jquery` | `gitee.com/flyfish-dev/file-viewer-jquery` | [ ] 待建 |
| Svelte wrapper | `@file-viewer/svelte` | 无 | 公开 wrapper 仓库 | `github.com/flyfish-dev/file-viewer-svelte` | `gitee.com/flyfish-dev/file-viewer-svelte` | [ ] 待建 |
| Public artifacts | 非源码分发 | 当前 `flyfish-dev/file-viewer` | 公开产物仓库 | `github.com/flyfish-dev/file-viewer` | `gitee.com/flyfish-dev/file-viewer` | [ ] 待更新 |

## Phase 0: 基线冻结与验收网

- [ ] 给当前 `v3` 最新状态创建迁移基线 tag，记录支持矩阵和关键截图。
- [ ] 把 `pnpm type-check`、`pnpm build-only`、`pnpm docs:build` 固化为每轮迁移必跑 gate。
- [ ] 补充统一 smoke 清单，至少覆盖 PDF、DOCX、XLSX、PPTX、OFD、CAD、DWF/DWFX、EPUB、压缩包、邮件、Markdown、代码、图片、音视频、地理数据、数据资产。
- [ ] 为 wrapper 迁移准备对比用例: Vue3 当前组件、iframe 当前组件、React 当前适配层、纯 JS 当前适配层。
- [ ] 明确“体验完全相同”的证据: DOM 快照、关键截图、事件回调、能力按钮显隐、options 行为、打印/导出结果。

## Phase 1: 设计纯 TypeScript core 边界

- [ ] 定义 `@file-viewer/core` 的公开 API:
  - [x] `createViewer(container, options)`
  - [x] `viewer.load(source)`
  - [x] `viewer.destroy()`
  - [x] `viewer.updateOptions(options)`
  - [x] `viewer.getCapabilities()`
  - [ ] `viewer.zoomIn()/zoomOut()/resetZoom()`
  - [ ] `viewer.search()/nextSearchResult()/previousSearchResult()/clearSearch()`
  - [ ] `viewer.print()/download()/exportHtml()`
  - [ ] `viewer.collectDocumentAnchors()/getDocumentTextChunks()`
- [x] 定义 framework-neutral 类型:
  - [x] `FileViewerOptions`
  - [x] `FileViewerSource`
  - [x] `ViewerLifecycleContext`
  - [x] `ViewerOperationContext`
  - [x] `ViewerCapabilityState`
  - [x] `RendererPlugin`
  - [x] `RendererSession`
  - [x] `RenderSurface`
- [x] 定义 renderer registry，所有格式只通过 core 注册与派发。
- [x] 定义统一 options 序列化协议，保证 iframe / pure JS / wrapper 行为一致。
  - [x] `@file-viewer/core` 提供 JSON-safe options 清洗、序列化、URLSearchParams 写入和解析。
  - [x] runtime-only hooks / beforeOperation 在 iframe 查询参数中显式剥离，避免不同 wrapper 行为漂移。
  - [x] `packages/web`、Vue 基线入口和 React wrapper 复用同一协议。
- [x] 定义错误、loading、空状态、unsupported 状态的 core 级呈现协议。
  - [x] `@file-viewer/core` 提供 `FileViewerStateDescriptor` / `FileViewerStateTheme`，覆盖 loading、ready、empty、unsupported、error。
  - [x] 下载、流式 PDF、常规解析的默认进度文案迁入 core，Vue3 入口复用同一常量。
  - [x] unsupported fallback 和错误格式化复用 core descriptor，避免 wrapper 各自硬编码状态文案。
- [x] 定义 assets/worker/wasm 路径解析策略，避免 wrapper 各自实现资源路径逻辑。
  - [x] `@file-viewer/core` 提供 viewer asset URL、archive worker/wasm、CAD wasm/worker、Typst compiler wasm 默认解析。
  - [x] archive / CAD / Typst 首批重型资源链路接入 core resolver，保持现有默认路径与 fallback 行为。
  - [ ] 后续 renderer plugin manifest 需要继续声明各自 assets，供 React/Vue/Svelte/pure JS wrapper 自动复制或外链。

## Phase 2: 抽离现有能力到 core

- [ ] 从 `src/package/common` 抽出 source loading、类型识别、能力判断、打印导出、worker ref、生命周期事件。
  - [x] source loading 的 PDF 流式策略迁入 `@file-viewer/core`。
  - [x] 文件名归一化、扩展名识别和 source 归一化迁入 `@file-viewer/core`。
  - [x] `File | Blob | ArrayBuffer` 输入包装和 ArrayBuffer 读取迁入 `@file-viewer/core`。
  - [x] 打印能力矩阵和 `resolvePrintAvailability` 迁入 `@file-viewer/core`。
  - [x] 生命周期上下文构建、生命周期 hook 分发、iframe 安全序列化迁入 `@file-viewer/core`。
  - [x] 操作上下文、beforeOperation / toolbar pre-hook 顺序、取消协议迁入 `@file-viewer/core`。
  - [x] toolbar 默认值、可见性、PDF 默认悬浮位置和 operation availability 迁入 `@file-viewer/core`。
  - [x] 搜索 provider、缩放 provider、文档锚点/文本切片协议补齐到 `@file-viewer/core`。
  - [x] 渲染上下文 `FileRenderContext`、通用 handler 协议迁入 `@file-viewer/core`。
  - [x] worker ref 管理迁入 `@file-viewer/core`，Vue3 兼容路径改为 re-export。
  - [ ] 打印导出执行链路迁入 `@file-viewer/core`。
    - [x] 导出 HTML 文档模板迁入 `@file-viewer/core`，Vue3 旧路径保留 re-export。
    - [x] 页面尺寸、`@page`、打印页样式工具迁入 `@file-viewer/core`。
    - [x] 下载触发、canvas 快照替换、图片等待、打印窗口 ready、渲染 HTML 组装迁入 `@file-viewer/core`。
    - [ ] 打印窗口打开、beforeOperation 编排、错误提示仍在 Vue wrapper hook 中，后续继续抽成 core controller + wrapper adapter。
- [ ] 从 `src/package/use` 抽出搜索、定位、缩放、loading 状态为纯 TS controller。
  - [x] 缩放状态标准化迁入 `@file-viewer/core`。
  - [x] 搜索 options / empty state 标准化迁入 `@file-viewer/core`。
  - [x] AI 文本切片生成迁入 `@file-viewer/core`。
  - [x] DOM 锚点采集、DOM 搜索高亮、provider 注册表和 Vue 响应式门面继续拆分。
    - [x] DOM 锚点采集、当前定位和锚点滚动迁入 `@file-viewer/core`，Vue 旧路径保留 re-export/门面。
    - [x] 搜索/缩放 provider 注册表和查找协议迁入 `@file-viewer/core`，Vue 旧路径保持兼容。
    - [x] DOM 搜索高亮、命中滚动和 MutationObserver 调度迁入 pure TS controller，Vue hook 仅负责响应式状态同步。
- [x] 从 `src/package/vendors/renders.ts` 抽出 registry，保证格式注册不依赖 Vue。
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
- [ ] 将 `v2` 定义为 Vue 2.7 wrapper 分支。
- [ ] 将 `v3` 定义为 Vue 3 wrapper 分支。
- [ ] 给 `main`、`v2`、`v3` 写入分支职责 README 和发布流程说明。
- [ ] 确保 `v2` / `v3` wrapper 都依赖同一个 `@file-viewer/core`，不复制核心渲染逻辑。
  - [x] `v3` 的格式矩阵和渲染分发入口先接入 `@file-viewer/core`。
  - [ ] `v2` 同步接入同一个 `@file-viewer/core`。
- [ ] 从当前 Vue3 根包迁移出 wrapper 代码后，保留兼容 alias 发布流程。

## Phase 4: Wrapper 标准实现

- [ ] Vue 3 wrapper:
  - [ ] 支持 plugin install、组件用法、props、events、slots/ref API。
  - [ ] 兼容当前 `<file-viewer :url :file :options />` 体验。
- [ ] Vue 2.7 wrapper:
  - [ ] 支持 `Vue.use(FileViewer)`。
  - [ ] 保持现有 `@flyfish-group/file-viewer` API 行为。
- [ ] Vue 2.6 wrapper:
  - [ ] 不依赖 Vue 2.7 composition API。
  - [ ] 提供 Options API 组件和插件安装。
- [ ] React modern wrapper:
  - [ ] 面向 React 18/19。
  - [ ] 支持 `ref` API、受控 props、事件回调。
- [ ] React legacy wrapper:
  - [ ] 面向 React 16/17。
  - [ ] 避免新 JSX transform / concurrent-only 依赖。
- [ ] Pure JS wrapper:
  - [ ] 支持 `mountViewer(container, options)`。
  - [ ] 支持 script tag / ESM / UMD 或 IIFE 分发。
- [ ] jQuery wrapper:
  - [ ] 支持 `$(el).fileViewer(options)`。
  - [ ] 支持方法调用和 destroy。
- [ ] Svelte wrapper:
  - [ ] 支持 Svelte component props/events/actions。
  - [ ] 兼容 SvelteKit SSR 边界，浏览器端挂载 core。
- [ ] 所有 wrapper 的 options、hooks、beforeOperation、toolbar、watermark、theme、search、ai、pdf、docx、archive、cad 等参数保持完整一致。

## Phase 5: 公开仓库与 README

- [ ] 为每个 wrapper 创建 GitHub 公开仓库。
- [ ] 为每个 wrapper 创建 Gitee 镜像仓库。
- [ ] 每个 wrapper 仓库包含:
  - [ ] 中文 README
  - [ ] English README
  - [ ] 安装方式
  - [ ] 快速开始
  - [ ] 完整 options 指引
  - [ ] 完整格式支持矩阵
  - [ ] 与 `@file-viewer/core` 的关系说明
  - [ ] 与历史包名兼容说明
  - [ ] Demo 链接
  - [ ] License / attribution / contribution 说明
- [ ] 公开 README 明确 core 源码不在公开仓库，源码/商业二开入口仍按当前商业入口说明。
- [ ] `flyfish-dev/file-viewer` 公开产物仓库 README 列出所有开源 wrapper 仓库和 npm 包。

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
- [ ] 兼容包 README 明确推荐迁移到 `@file-viewer/*` 标准包名。
- [ ] 所有 npm 包版本号连续、依赖 core 版本一致、dist 类型声明完整。

## Phase 7: 构建产物与公开分发

- [ ] 生成 core dist、各 wrapper dist、各 adapter demo、主 demo、文档站、示例文件、worker/wasm assets。
- [ ] 公开产物仓库包含最新所有渠道分发构建产物。
- [ ] 公开产物仓库不包含私有 core 源码。
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
- [ ] wrapper smoke 覆盖:
  - [ ] Vue 3
  - [ ] Vue 2.7
  - [ ] Vue 2.6
  - [ ] React modern
  - [ ] React legacy
  - [ ] Pure JS
  - [ ] jQuery
  - [ ] Svelte
- [ ] 每个 wrapper 至少验证 PDF、DOCX、XLSX、图片、Markdown、CAD、压缩包、邮件、地理数据。
- [ ] 生产构建验证每个 wrapper 的 ESM/CJS/UMD/script tag 入口。
- [ ] 浏览器 smoke 验证主 Demo、文档比对、iframe、script tag、React、Vue、jQuery、Svelte 示例。
- [ ] 发布前检查 npm tarball 内容，不泄露私有源码。

## 第一批可立即执行的代码任务

- [x] 在当前仓库新增 `packages/core` 或 `src/core` 草案目录，先迁移 framework-neutral 类型和 renderer registry。
- [ ] 将 `src/package/common/type.ts` 中与 Vue 无关的类型抽到 core。
  - [x] `FileViewerOptions`、source、生命周期、操作、导出适配、渲染器 registry 等 framework-neutral 类型已进入 core。
  - [x] Vue3 公共 source 类型补齐 `buffer`，避免 wrapper hook 类型与 core 漂移。
  - [x] Vue3 公共搜索/缩放 provider 类型改为复用 core 类型。
  - [x] Vue3 公共 `FileRenderContext` / `FileHandler` 类型改为复用 core 类型。
  - [x] Vue3 公共打印布局和导出 HTML 模板改为复用 core。
  - [x] Vue3 iframe options 解析改为复用 core 序列化协议。
  - [ ] Vue3 入口仍存在旧类型 re-export 和 Vue 相关 `Rendered` 类型，需要继续拆薄。
- [x] 将 `src/package/vendors/renders.ts` 改造成 core registry 的适配入口。
- [ ] 给现有 Vue3 组件增加一个薄 wrapper 层，让它先调用 core registry，逐步降低 `FileViewer.vue` 职责。
  - [x] `FileViewer.vue` 已改用 core 的 lifecycle/operation/toolbar helper，继续保留 Vue emit、DOM 挂载和响应式状态。
- [x] 新增 `@file-viewer/core` package manifest 草案，暂不发布。
- [ ] 新增 wrapper README 模板，统一中英文结构和格式矩阵。
- [ ] 先把 `packages/web` 和 `packages/react` 版本从 1.0.25 对齐到当前 1.0.26，再作为后续标准包名迁移基线。

## 完成审计标准

只有当以下证据同时成立，才能认为本目标完成:

- [ ] 当前私有 Gitea 仓库 `main` 分支只包含 core 核心底座源码。
- [ ] `v2` / `v3` 分支分别是 Vue2.7 / Vue3 wrapper，且依赖同一 core。
- [ ] 所有目标 wrapper 均存在 GitHub 和 Gitee 公开仓库。
- [ ] 所有 `@file-viewer/*` npm 包均发布成功，历史包名作为兼容 alias 同步发布。
- [ ] 所有 wrapper 的 README 中英文完整，且支持矩阵、参数、Demo、生态关系一致。
- [ ] 公开产物仓库包含最新全渠道构建产物和所有仓库索引，不包含私有 core 源码。
- [ ] 本地和生产 smoke 证明各生态体验与当前 v3 基线一致，没有功能倒退。
