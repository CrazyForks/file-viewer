# Changelog

完整对外更新日志见 [docs/changelog.md](docs/changelog.md)。

## File Viewer v2.2.2 — 2026-07-17

这是 2.2.1 的依赖与自托管安全补丁。能力矩阵保持 54 个 npm 目标、208 个扩展名和 25 条预览链路。

### Fixes

- `@file-viewer/renderer-epub` 与 `@file-viewer/thumbnail` 不再向 npm 用户安装 `epubjs → @xmldom/xmldom 0.7.x`。EPUB 引擎改为包内懒加载模块，构建固定使用 `@xmldom/xmldom 0.9.10`，同时生成版本、哈希与完整第三方许可证清单。
- 新增可重复的 `npm pack → 全新安装 → npm audit` 门禁：发布包必须包含本地 EPUB 模块、manifest 和 NOTICE，生产依赖树不得再出现 `epubjs` 或 `@xmldom/xmldom`。
- 修复 Nginx 的 `add_header` 继承边界：所有自定义缓存策略的 HTML、`.mjs`、静态资源、样例和 vendor 路由现在都会显式返回 `X-Content-Type-Options: nosniff` 与 `Referrer-Policy`；`.mjs` 继续使用正确的 `application/javascript` MIME。
- 完整保留 2.2.1 的上传 PDF 下载、复杂 DOCX 锚点布局、OFD 图片定位、PPT/PPTX 与全格式浏览器回归结果。

### Upgrade

```bash
pnpm add @file-viewer/vue3-full@2.2.2
pnpm add -D @file-viewer/vite-plugin@2.2.2
```

## File Viewer v2.2.1 — 2026-07-17

这是 2.2.0 的发布后补丁，集中修复上传 PDF 的下载数据源、复杂 DOCX 锚定绘图布局和自托管 Docker 运行时。能力矩阵仍为 54 个 npm 目标、208 个扩展名和 25 条预览链路。

### Fixes

- 修复上传 PDF 渲染后下载为 0 字节（#139）：PDF.js 将 `ArrayBuffer` 转移给 Worker 后，下载会自动回退到仍然完整的原始 `File`；流式 URL 与合法空文件仍保持各自原有语义。
- `@file-viewer/docx` 升级至 `0.3.21`，修复 WPS/WPG/图片锚点被重复偏移、嵌套组变换组合错误，以及同一段落中页面锚点与段落锚点混排造成的巨大空白（#133）；缺失页眉/页脚 root 的可选结构也在引擎层安全跳过（#130）。
- 自托管 Nginx 为 `.mjs` 显式返回 `application/javascript`，避免 `nosniff` 阻止 PDF.js Worker、PPT 和其他 ESM 运行时加载。
- CAD 运行时资源替换支持跨文件系统 `EXDEV`，复制、校验、交换与失败回滚均保留完整副本；Docker 构建上下文和 pnpm 缓存层同步收紧。
- 真实浏览器回归覆盖 PDF 上传/渲染/下载、OFD→PDF 同会话切换、二进制 PPT、PPTX、复杂锚定 DOCX，以及 Docker 中的模块 MIME 和离线资源完整性；#133 附件不再产生页面溢出，关键区块相对参考 PDF 的横向误差小于 0.4 pt、纵向误差约 2–3 pt。

### Upgrade

```bash
pnpm add @file-viewer/vue3-full@2.2.1
pnpm add -D @file-viewer/vite-plugin@2.2.1
```

## File Viewer v2.2.0 — 2026-07-17

这次升级把主 Demo、运行时资源路径和近期真实用户反馈一起收口。主 Demo 采用新的产品化工作台布局，桌面端把文件来源、文档操作和预览画布重新分层，移动端收进轻量悬浮操作；暗色模式、样例分组、搜索、缩放、上传和链接预览都保留完整交互。

### 适合升级的人

- 使用 Web Component / Shadow DOM 预览 PDF、PPTX 的项目。
- 部署在 Angular、Vue CLI、Webpack、Vite 子路径，或目录名包含空格、中文、`assets`、`static`、`js` 的项目。
- 需要预览 UTF-8、GBK、GB18030 CSV/TSV，或为代码/文本开启行号的项目。
- 使用 DWG、DXF、DWF、DWFx，并希望完整离线交付 CAD Worker/WASM 的项目。

### Highlights

- 主 Demo 全面重构为清爽的产品工作台；桌面、平板、移动端和暗色模式完成同视口视觉对照与交互回归。
- 通过显式 `?url=` 打开文件时首帧即进入沉浸模式：隐藏 Demo 品牌、样例、历史与外层状态，只保留预览器工具栏；桌面与移动端都保持文档容器独立滚动且无外层页面溢出。
- `@flyfish-dev/cad-viewer` 升级至 `0.7.0`；`dwg-worker.js`、`dwfv-render.wasm`、`libredwg-web.js`、`libredwg-web.wasm` 四个运行时文件全部纳入必需 manifest、原子复制、校验和回滚。
- STEP/STP、IGES/IGS 和 BREP 接入本地 OCCT Worker/WASM，直接生成 Three.js 网格，不再停留在转换提示；统一缩放、适配、暗色场景、装配层级和面颜色均纳入真实浏览器回归。
- 新增统一运行时资源基址 API。Full/非 Full、Vite/非 Vite、Angular 深层路由、相对 base、Windows 分隔符、空格和中文路径使用同一解析规则，不再依赖站点根目录。
- 修复 CSV 中文乱码（#124）：自动识别 UTF-8 BOM、严格 UTF-8，并回退 GB18030/GBK；新增 `spreadsheet.textEncoding` 显式覆盖和 TSV 支持。
- 新增 `text.lineNumbers`（#125）。普通文本默认关闭，大文件虚拟预览保持兼容；行号不会进入复制、搜索或无障碍文本。
- 修复大于 512 KiB 的 Markdown 被通用文本阈值切成源码视图（#136）。Markdown 默认继续渲染排版阅读面；只有显式设置 `text.markdownVirtualizeAboveBytes` 才会在超限后启用有界源码视图。
- 新增 `text.toolbar`（#137）。默认保留代码、文本和超大 Markdown 源码视图的类型、索引状态与行数栏；传 `false` 可只隐藏该 renderer 元信息栏，不影响 Viewer 全局工具栏。
- 修复 Web Component 中 PPTX 样式未进入实际 ShadowRoot（#127），以及 PPTX Worker 固定请求根路径（#129）；真实 IIFE 和 Angular 子路径均纳入浏览器回归。
- 修复全宽、flex grow、外层滚动容器中的 PDF 居中与缩放（#128），并让 PDF.js 根变量在 Shadow DOM 和 forced-colors 下正确生效。
- 修复宿主应用预载 PDF.js 3.x 时污染全局 fake-worker handler（#134）：File Viewer 的 PDF.js 5.4 只在自身 Worker 初始化期间临时接管 handler，随后恢复宿主 namespace，避免双向版本冲突。
- 修复静态 PDF Worker 与 API 版本不一致（#138）：使用 Worker 前会读取官方版本标记；发现旧 Worker 时不再实例化，而是自动回退到随包交付的同版本 PDF.js handler。
- DOCX 遇到缺失/损坏页眉页脚结构时自动降级为正文预览（#130），避免单个可选 part 让整份文档崩溃。
- Word 现在先按文件签名识别容器（#131）：即使 OOXML 文件被误命名为 `.doc`，也会进入 DOCX 渲染器；真实 CFB 二进制 `.doc` 仍走原解析链路。
- 非 Full 的 `preset-office` 资产复制补齐 Spreadsheet Worker（#135），并在 Vite 子路径、npm/pnpm 冷安装和生产构建中校验文件内容与来源版本。
- 新增 PowerPoint 97–2003 二进制 `.ppt` 预览：`@file-viewer/renderer-presentation` 使用 `@file-viewer/ppt@0.3.1` 的 Worker / OffscreenCanvas / WASM、独立 CJK 字体与有界帧缓存，与 PPTX OOXML 链路严格分流，并纳入统一缩放、打印和真实浏览器样例回归。Demo、Full、copy-assets、CDN/IIFE 和 Vue 2.6 + Vue CLI 3 示例都会交付经过校验的九文件 `vendor/ppt/` 运行时并开箱即用；PPT 运行时保留包内独立 LICENSE/NOTICE 与公开水印。格式矩阵更新为 208 个扩展名、25 条预览链路。
- 离线门禁覆盖 Demo 和所有分发资产；Demo 不再运行时请求 GitHub API，也不再用根绝对路径覆盖 Archive/Spreadsheet Worker。

### Upgrade

```bash
pnpm add @file-viewer/vue3-full@2.2.0
pnpm add -D @file-viewer/vite-plugin@2.2.0
```

非 Vite 项目继续使用同版本资产复制 CLI：

```bash
npx --no-install file-viewer-copy-assets ./public/file-viewer
```

## File Viewer v2.1.30 — 2026-07-15

这个版本统一了 Full 包的完整资产交付方式。仅执行 `npm install` 只会安装 renderer 代码，不会自动把 Worker、WASM、字体和 vendor 资源发布到业务站点；未完成资产交付时，不属于完整格式支持。

官方 8 个 Full 包：

- `@file-viewer/web-full`
- `@file-viewer/vue3-full`
- `@file-viewer/vue2.7-full`
- `@file-viewer/vue2.6-full`
- `@file-viewer/react-full`
- `@file-viewer/react-legacy-full`
- `@file-viewer/svelte-full`
- `@file-viewer/jquery-full`

交付规则：

- Vite：安装同版本 `@file-viewer/vite-plugin`，使用 `fileViewerRenderers({ copyAssets: true })`，dev/build 自动发布完整资源。
- Webpack、Rspack、Rollup、Vue CLI、Umi：运行 Full 包自带的同版本 CLI：`npx --no-install file-viewer-copy-assets ./public/file-viewer`。
- `@file-viewer/web-full`：直接使用 CDN/IIFE，或原样部署完整 `dist/` 目录时无需复制；只复制入口 IIFE 不是完整部署。

已覆盖 8 个 Full 包合约、10 组框架冷安装浏览器矩阵、Vue 2.6 / Vue CLI 3、Vite dev/build、非 Vite 复制 CLI 和 `web-full` 完整 `dist/` 回归。

### Upgrade

Vite：

```bash
pnpm add @file-viewer/vue3-full@2.1.30
pnpm add -D @file-viewer/vite-plugin@2.1.30
```

```ts
fileViewerRenderers({ copyAssets: true })
```

非 Vite：

```bash
pnpm add @file-viewer/vue3-full@2.1.30
npx --no-install file-viewer-copy-assets ./public/file-viewer
```

## 维护模板

后续发布说明继续使用“用户为什么升级”的结构：

```md
## File Viewer vX.Y.Z

这次主要改进 [场景] 的体验。

### 适合升级的人

- 使用 [框架/包/部署方式] 的项目
- 遇到 [具体问题] 的项目

### Highlights

- 修复 / 改进 [用户可感知变化]
- 更新 Demo、Docs、离线资源或组件 README

### Upgrade

pnpm add @file-viewer/vue3-full@latest
```
