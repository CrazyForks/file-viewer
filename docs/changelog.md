# 更新日志

这份日志记录的是当前仓库主线中，对外最值得说明的能力演进。

## 当前主线

### 下一版本: 性能与边缘部署优化

- PDF 远端 URL 加载链路新增渐进读取策略: 同源 PDF 默认直接交给 PDF.js 通过 URL 读取，服务端支持 Range 时自动分片加载，避免先整包下载 Blob 后才开始建页；跨域 URL 默认保持旧的兼容下载链路
- 新增 `options.pdf.streaming`、`options.pdf.rangeChunkSize` 和 `options.pdf.withCredentials`，可按业务文件服务能力控制 PDF 渐进读取、Range 分片大小和凭据策略
- 下载按钮支持 URL 源文件回退，流式 PDF 没有预下载 buffer 时也可以触发原始文件下载
- 新增 Cloudflare Pages Direct Upload 部署脚本、`wrangler.toml` 和 `_headers` 缓存策略，便于将 Demo 切到 Cloudflare 边缘网络并保持 `viewer.flyfish.dev` 域名不变

### `v1.0.19` 页面尺寸感知打印与入口组件瘦身版本

- Vue3 包 `@flyfish-group/file-viewer3@1.0.19`、Vue2 包 `@flyfish-group/file-viewer@1.0.19`、React 包 `@flyfish-group/file-viewer-react@1.0.19` 和纯 JS 包 `@flyfish-group/file-viewer-web@1.0.19` 统一推进到连续版本
- PDF 打印会按真实页面 CSS 尺寸生成完整高保真页图，并通过 `@page size` 固定输出纸张大小，避免导航窗格、视口宽度或缩放状态导致页面被挤压、裁切或只打印当前页
- DOCX / DOC 打印保留白色纸张和文档页尺寸，导出窗口只包含主体页面，避免把 Demo 外壳、工具栏、滚动容器或预览缩放带入打印结果
- 新增 `printStyle` 渲染适配器能力，PDF、DOCX、DOC 等有真实页面尺寸的格式可以按文件自身尺寸输出打印样式，后续格式可复用同一机制
- 将下载、打印、导出 HTML 的实现从 `FileViewer.vue` 抽离到 `useViewerExport` 和导出模板 helper，入口组件回归预览状态、生命周期和操作可用性的单一职责
- 补充打印页尺寸与导出模板单测，并同步刷新文档站、README、Demo 示例版本、公开成品包和 npm 版本说明到 `1.0.19`

### `v1.0.18` 公开 issue 修复与真实 PDF 示例版本

- Vue3 包 `@flyfish-group/file-viewer3@1.0.18`、Vue2 包 `@flyfish-group/file-viewer@1.0.18`、React 包 `@flyfish-group/file-viewer-react@1.0.18` 和纯 JS 包 `@flyfish-group/file-viewer-web@1.0.18` 统一推进到连续版本
- 修复 GitHub issue #13: PDF 旋转页与导航配置兼容性增强，新增 `options.pdf.navigation` 和 `options.pdf.defaultNavigationVisible`，继续保持页侧边栏 / 树形目录侧边栏切换
- 修复 GitHub issue #9 与 #8: Excel 自动文本色更可靠，支持 workbook drawing 图片渲染，并按渲染链路隐藏不可靠的打印 / 导出入口
- 修复 GitHub issue #4: `.doc` 表格布局和单元格可读性增强，老 Word 文档在白色纸张容器里更接近实际阅读效果
- 修复 GitHub issue #1: `.doc` 的 `msdoc-viewer` CFB 局部 sector 容错改为包管理器无关的 `scripts/patch-msdoc-viewer.mjs`，npm / pnpm / yarn 安装后都可在构建前自动应用
- Demo PDF 替换为项目方提供的 13 页《PDF沉浸式翻译技术说明》，用于验证长文档阅读、缩放、页导航、树形目录、完整打印和 HTML 导出
- 文档站、README、集成说明、示例来源、公开成品包和 npm 版本说明同步刷新到 `1.0.18`

### `v1.0.17` 打印能力矩阵与完整页打印版本

- Vue3 包 `@flyfish-group/file-viewer3@1.0.17`、Vue2 包 `@flyfish-group/file-viewer@1.0.17`、React 包 `@flyfish-group/file-viewer-react@1.0.17` 和纯 JS 包 `@flyfish-group/file-viewer-web@1.0.17` 统一推进到连续版本
- PDF 导航窗格继续完善“页面 / 目录”切换，目录模式支持树形层级、展开折叠和定位跳转，便于用户在长文档中快速预览
- Word、DOC 和 PDF 预览统一增强打印 / HTML 导出，专属导出适配器会移除预览缩放、滚动容器和 Demo 全局布局样式，避免只打印一页或页面被截断
- 新增打印能力动态判断，表格、压缩包、邮件、EPUB、音视频、3D 等不适合直接打印的渲染链路会自动隐藏打印按钮，避免用户进入错误打印流程
- 优化 Demo 暗色模式和 Markdown 阅读面，Markdown / 代码跟随系统主题，PDF / Word / Excel 等原始版式内容保持独立显示；同时替换更丰富的 DOCX / PDF / Markdown 示例并同步压缩包样例
- 新增文档加载、卸载生命周期钩子，以及下载、打印、导出 HTML 的按钮前置校验钩子，iframe 适配器同步透出事件和操作能力变化
- 文档站、README、集成说明、分发说明和公开成品包说明同步刷新到 `1.0.17`

### `v1.0.15` 预览交互、打印与集成钩子增强版本

- PDF 导航窗格新增“页面 / 目录”切换，目录模式会读取 PDF 大纲并以可展开树形结构跳转，页面模式继续保留页侧边栏
- 增强 Word 和通用文档打印导出，`.docx` / `.doc` 会使用专属导出适配器清理预览缩放、绝对定位和滚动容器，避免只打印一页或页面被截断
- 新增 `options.hooks` 生命周期钩子，覆盖文档开始加载、加载完成、开始卸载和卸载完成，并提供文件类型、文件名、来源、URL、大小、版本和耗时上下文
- 新增 `options.beforeOperation` 与 toolbar 级前置操作钩子，下载、打印、导出 HTML 前都可以返回 `false` 取消，便于接入权限校验、审计确认和业务二次弹窗
- React / 纯 JS iframe 适配层新增 viewer 事件监听入口，基线预览器会通过 `postMessage` 向宿主同步生命周期和操作事件
- 文档、README 和四条 npm 包线版本说明同步刷新到 `1.0.15`

### `v1.0.14` 最新发布与文档站同步版本

- Vue3 包 `@flyfish-group/file-viewer3@1.0.14`、Vue2 包 `@flyfish-group/file-viewer@1.0.14`、React 包 `@flyfish-group/file-viewer-react@1.0.14` 和纯 JS 包 `@flyfish-group/file-viewer-web@1.0.14` 统一抬升到最新版本
- 文档站首页、快速开始、分发说明、支持格式页和 README 中的安装示例同步刷新到 `1.0.14`
- 公开成品仓库、Demo 静态产物和文档站静态产物重新构建，方便直接下载和验收
- 继续保持 Vue3 / Vue2 / React / 纯 JS 的集成路径、按需异步加载、示例分组和 PDF / OFD / 压缩包 / 邮件 / CAD / 绘图 / 电子书预览链路一致

### `v1.0.12` 完整格式、成品仓库与 npm 同步版本

- Vue3 包 `@flyfish-group/file-viewer3@1.0.12`、Vue2 包 `@flyfish-group/file-viewer@1.0.12`、React 包 `@flyfish-group/file-viewer-react@1.0.12` 和纯 JS 包 `@flyfish-group/file-viewer-web@1.0.12` 统一对齐到 npm `latest`
- 新增压缩包预览，基于 `libarchive.js` Worker 支持 ZIP、7z、RAR、TAR、GZIP、BZIP2、XZ、CAB、ISO、JAR、APK、CBZ/CBR 等入口，内部文件按需解压、IndexedDB 缓存并继续调用统一预览器
- 新增 EML / MSG 邮件预览，支持头信息、HTML/文本正文、附件下载和附件继续在线预览
- 增强 OLB / DRA 结构预览，基于 `cfb` 解析常见 EDA 复合文档容器，并提供结构树、元件/封装/Padstack 候选、属性、诊断、二进制退化和可读字符串索引
- 预览器新增 `options.watermark`、`options.toolbar` 和 `options.archive`，支持文字/图片水印、下载原文件、完整打印、导出渲染后 HTML、压缩包 worker 和体积限制配置
- 修复 PDF 打印和导出 HTML 的完整性，PDF 会通过专属导出适配器逐页生成全部页面，不再依赖当前滚动视口、当前页或已渲染 canvas，避免只打印当前页或内容被截断
- DWG 入口从单纯提示转换为尽力展示: 误命名 DXF 会直接按 DXF 解析，真实 DWG 会尝试提取内嵌 PNG/JPEG/BMP 预览图，并说明无法完整解析几何的原因
- 新增 Three.js 3D 模型预览器，支持 `glb`、`gltf`、`obj`、`stl`、`ply`、`fbx`、`dae`、`3ds`、`3mf`、`amf`、`usd`、`usda`、`usdc`、`usdz`、`kmz`、`pcd`、`wrl`、`vrml`、`xyz`、`vtk`、`vtp`；`step`、`stp`、`iges`、`igs`、`ifc`、`3dm` 会给出转换原因和建议
- Demo 新增 GLTF / OBJ / STL / PLY / STEP 3D 样例，以及 ZIP、TAR.GZ、EML、MSG、OLB、DRA 样例，支持格式矩阵更新到 135 个扩展名、19 条预览链路
- 文档站全局导航、首页、格式矩阵、分发说明、快速开始和 npm README 均刷新到 `1.0.12`
- 公开成品仓库继续只保留混淆压缩构建产物、Demo 静态站、文档静态站、样例文件和 tarball，不提交源码目录
- React / 纯 JS 文档继续推荐 `npm install` 零步骤安装，并补充 pnpm 10 拦截 `postinstall` 时的 `pnpm approve-builds` / `pnpm exec file-viewer-copy-assets` 处理方式

### `v1.0.9` 媒体、绘图与电子书预览增强版本

- Vue3 包 `@flyfish-group/file-viewer3@1.0.9` 和 Vue2 包 `@flyfish-group/file-viewer@1.0.9` 同步发布到 npm `latest`
- 新增 React 包 `@flyfish-group/file-viewer-react@1.0.9` 和纯 JS 包 `@flyfish-group/file-viewer-web@1.0.9`，通过 iframe 复用 Vue3 基线 viewer 静态产物
- 新增适配层 Demo，覆盖 React 组件和纯 JS helper 两种入口，构建后可直接作为私有化静态站点部署
- 增强 PPTX 渲染，补齐组合图形坐标映射、旋转/翻转、主题背景、图片裁剪和 EMF 转 SVG 预览
- 新增 `.epub` 预览，使用 `epubjs` 按需解析 EPUB 包、目录和滚动阅读，并避开部分浏览器超宽分页 iframe 白板问题
- 新增 `.umd` 电子书预览，按 UMD 文件结构解析元数据、章节目录和 zlib 压缩正文
- 新增 `.mp3`、`.mpeg`、`.wav`、`.ogg`、`.oga`、`.opus`、`.m4a`、`.aac`、`.flac`、`.weba` 音频入口，使用浏览器原生播放器
- 新增 `.excalidraw` 预览，使用官方 `@excalidraw/excalidraw` 的 `exportToSvg` 能力按需生成只读 SVG
- 新增 `.drawio` / `.dio` 预览，使用官方 diagrams.net `GraphViewer` 处理 mxGraphModel / mxfile
- 补充 Demo 示例文件、格式矩阵、FAQ 和接入说明

### `v1.0.8` 文档视觉与预览稳定性版本

- Vue3 包 `@flyfish-group/file-viewer3@1.0.8` 和 Vue2 包 `@flyfish-group/file-viewer@1.0.8` 同步发布到 npm `latest`
- 修复 PDF worker 生命周期，快速切换 PDF / OFD / PDF 时不再触发 worker 销毁告警
- 稳定 OFD 渲染状态，避免反复闪动“正在解析 OFD”
- 刷新文档站截图、主题配色和 iframe 示例页视觉

### `v1.0.7` PDF 自适应修复版本

- Vue3 包 `@flyfish-group/file-viewer3@1.0.7` 和 Vue2 包 `@flyfish-group/file-viewer@1.0.7` 同步发布到 npm `latest`
- 修复 PDF.js 5 下 canvas 布局尺寸被 DPR backing store 干扰的问题，避免 PDF 页面被裁切或显示不完整
- 修复 PDF 默认宽度适配计算，导航窗格开启时也能按当前视口宽度给出可读缩放比例
- 同步刷新线上 Demo、文档说明和公开成品仓库产物

### `v1.0.6` 成品分发版本

- Vue3 包 `@flyfish-group/file-viewer3@1.0.6` 和 Vue2 包 `@flyfish-group/file-viewer@1.0.6` 均已发布到 npm `latest`
- 新增 PDF 缩放工具栏、页码状态和可显隐页面导航窗格
- 补齐 OFD、CAD、代码高亮与完整示例文件盒子
- 示例文件选择器支持分组折叠，默认展开第一个分组，并保持同一时间只展开一个分组
- 增加 `pnpm obfuscate` 与 `pnpm release:pack`，库产物支持压缩混淆后分发
- README、文档站和公开成品仓库说明同步补充 npm、GitHub、源码自助开通、授权与贡献说明
- npm tarball 只包含 `README.md`、`LICENSE` 和混淆压缩后的 `dist/`

### 文档站与交付说明完善

- 重写 README 与 VitePress 文档结构
- 增加 Demo 说明、本地开发与打包说明
- 补充截图、接入建议与发布前检查清单

### `.doc` 渲染能力升级

- 使用 `msdoc-viewer` 替换旧的 `.doc` 解析方案
- 将 `.doc` 内容渲染在 Word 风格页面容器中
- 增加灰色工作台、白色纸张与页面居中展示效果

### 示例与工程体验

- 提供更清晰的本地 Demo 入口说明
- 支持将预览器独立部署并通过 iframe 集成
- 本地构建、文档站构建与 npm 打包链路持续收敛

## 历史版本

### `v1.0.3`

- 修复与优化 PDF 字体、缩放和 Excel 样式相关问题

### 更早版本

- 优化 PPTX 加载性能
- 补强 Word 与 Excel 的基础预览能力
- 持续完善 TypeScript 与 Vue 3 版本实现

<div class="doc-note">
  npm 包版本请以 `package.json` 和实际发布记录为准；本页更偏向说明“这个仓库当前已经演进到了哪里”。
</div>
