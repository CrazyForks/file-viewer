# 更新日志

这份日志记录的是当前仓库主线中，对外最值得说明的能力演进。

## 当前主线

### 未发布：DWG 兼容和 3D 模型预览增强

- DWG 入口从单纯提示转换改为尽力展示: 误命名 DXF 会直接按 DXF 解析，真实 DWG 会尝试提取内嵌 PNG/JPEG/BMP 预览图，并说明无法完整解析几何的原因
- 新增 Three.js 3D 模型预览器，支持 `glb`、`gltf`、`obj`、`stl`、`ply`、`fbx`、`dae`、`3ds`、`3mf`、`amf`、`usd`、`usda`、`usdc`、`usdz`、`kmz`、`pcd`、`wrl`、`vrml`、`xyz`、`vtk`、`vtp`；`step`、`stp`、`iges`、`igs`、`ifc`、`3dm` 会给出转换原因和建议
- Demo 新增 GLTF / OBJ / STL / PLY 最小 3D 样例，支持格式矩阵更新到 101 个扩展名、16 条预览链路

### `v1.0.10` React / 纯 JS 安装文档修正版

- React 包 `@flyfish-group/file-viewer-react@1.0.10` 和纯 JS 包 `@flyfish-group/file-viewer-web@1.0.10` 同步发布到 npm `latest`
- 适配包仍复用 Vue3 `@flyfish-group/file-viewer3@1.0.9` 构建出来的私有化 viewer 静态产物
- 文档和 npm README 改为推荐 `npm install` 零步骤安装，并补充 pnpm 10 拦截 `postinstall` 时的 `pnpm approve-builds` / `pnpm exec file-viewer-copy-assets` 处理方式

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
