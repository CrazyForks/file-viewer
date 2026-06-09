# 概述

Flyfish Viewer 可以为业务系统快速补齐文件在线预览能力。它不同于依赖后端转码的方案，核心解析和渲染都在浏览器端完成，不会额外占用服务器执行 Office 转 PDF、临时文件清理或异步转换任务。

这让它特别适合静态部署、内网私有化、低运维成本和多系统复用场景。查看[快速开始](/guide/quickstart)可以直接跑通第一个预览示例。

## 当前能力

<div class="doc-grid">
  <div class="doc-card">
    <h3>多格式预览</h3>
    <p>内置 149 个扩展名映射，覆盖 Word、Excel、PowerPoint、PDF、OFD、Typst、压缩包、邮件、OLB/DRA、CAD、3D 模型、Excalidraw、draw.io、EPUB、UMD、Markdown、图片、音频、视频以及代码/文本。</p>
  </div>
  <div class="doc-card">
    <h3>纯前端渲染</h3>
    <p>大部分格式不需要后端转码服务。业务侧只需要提供可访问 URL、File 或二进制数据包装后的 File。</p>
  </div>
  <div class="doc-card">
    <h3>按需异步加载</h3>
    <p>PDF、OFD、Typst、压缩包、邮件、OLB/DRA、CAD、3D 模型、绘图、Office、EPUB、UMD、Markdown 和代码高亮都按需进入对应预览链路，减少无关格式的加载成本。</p>
  </div>
  <div class="doc-card">
    <h3>多接入路线</h3>
    <p>Vue3 和 Vue2.7 都有对应 npm 包；两个安装器都会自动带上样式。React、纯 JS 和跨技术栈场景通过 iframe 复用 Vue3 基线 viewer 静态产物。</p>
  </div>
</div>

## 优势

- **交付边界清楚。** 组件、Demo、文档站、公开成品仓库、npm tarball 和构建脚本都围绕成品交付维护，接入方可以先验收效果再决定集成方式。
- **视觉体验更接近真实阅读。** Word 文档使用灰色页面底和白色纸张；PDF 提供缩放、页码、导航窗格和可视宽度自适应，避免打开后内容被挤压或不可读。
- **格式策略务实。** PPTX 重点增强组合图形、主题背景、图片裁剪和 EMF 矢量图片；OFD 基于 `DLTech21/ofd.js` 源码链路预览；Typst 直接读取 `.typ` / `.typst` 源文件，命中格式时才加载浏览器 WASM 编译与 SVG 渲染链路；压缩包用 `libarchive.js` Worker 按需解压内部文件；邮件用 `postal-mime` / `@kenjiuno/msgreader` 解析正文和附件；OLB/DRA 用 `cfb` 做结构树、对象候选、属性和诊断预览；CAD 支持 DXF，DWG 会尽量识别 DXF 误命名和提取内嵌预览图；3D 模型基于 Three.js 支持常见浏览器可渲染格式；Excalidraw 和 draw.io 使用官方预览能力；EPUB 使用 `epubjs`；UMD 电子书按文件结构解析元数据、目录和 zlib 正文段；音频使用浏览器原生播放器；代码/日志使用 `highlight.js` 轻量高亮，HTML 按源码展示。内置 CAD、3D、绘图、压缩包、邮件、EDA、Typst、UMD、音频和 EPUB 回归样例来源清楚，方便复现实文件兼容问题。
- **适合平台复用。** 多个系统可以共用同一套私有化 viewer 静态产物，只要升级静态资源即可统一更新预览能力。
- **Vue2 / Vue3 / React / 纯 JS 同步维护。** Vue3 包是 `@flyfish-group/file-viewer3@1.0.21`，Vue2 包是 `@flyfish-group/file-viewer@1.0.21`，React 包是 `@flyfish-group/file-viewer-react@1.0.21`，纯 JS 包是 `@flyfish-group/file-viewer-web@1.0.21`。Vue3 和 Vue2 安装器都会自动带入样式；React 和纯 JS 包不复制渲染器，只通过 iframe 加载 Vue3 基线产物。
- **二开路径明确。** 公开仓库提供成品下载，源码和商业二开通过 [https://dev.flyfish.group/shop](https://dev.flyfish.group/shop) 自助开通，避免交付渠道混乱。

## 关键特性

| 能力 | 说明 |
| --- | --- |
| Word | `docx` 使用 `docx-preview`，`.doc` 使用 `msdoc-viewer`，保留文档页面感 |
| Excel | 多种表格格式统一进入表格预览链路，保留常见尺寸、合并和样式 |
| PowerPoint | PPTX 增强组合图形坐标、旋转/翻转、主题背景、图片裁剪和 EMF 矢量图预览 |
| PDF | 基于 `pdfjs-dist`，同源 URL 默认渐进读取，服务端支持 Range 时自动分片加载，支持缩放工具栏、页码状态、导航窗格、宽度适配、完整打印和导出 HTML |
| 操作栏 | 支持下载原文件、打印完整渲染结果、导出渲染后 HTML，以及文字或图片水印；打印按钮会按当前格式和渲染链路动态显隐 |
| OFD | 使用 `DLTech21/ofd.js` 源码链路，重型能力按需加载 |
| Typst | 直接读取 `.typ` / `.typst` 源文件，按需加载浏览器 WASM 编译与 SVG 渲染链路，支持按页预览、打印和 HTML 导出 |
| 压缩包 | 使用 `libarchive.js` Worker 读取目录，内部文件按需解压、缓存并继续在线预览 |
| 邮件 | EML / MSG 支持头信息、HTML/文本正文、附件下载和附件继续预览 |
| EDA | OLB / DRA 使用 CFB 容器解析、结构树、对象候选、属性和可读字符串索引，适合结构初筛 |
| CAD | 支持 DXF 图纸预览，提供缩放、平移和图层控制；DWG 尽量展示内嵌预览图 |
| 3D 模型 | 使用 Three.js 交互渲染 GLTF/GLB、OBJ、STL、PLY、FBX、DAE、3DS、3MF、AMF、USD/USDZ、KMZ、点云和 VTK 等格式 |
| 绘图 | Excalidraw 使用官方 `restore` + `exportToSvg`，draw.io 使用官方 diagrams.net `GraphViewer` |
| 电子书 | EPUB 使用 `epubjs`，UMD 解析移动电子书封装、目录和压缩正文 |
| 代码/文本 | 使用 `highlight.js` 高亮多语言源码、日志、配置和 diff |
| 图片/音频/视频 | 图片使用浏览器原生能力和轻量查看器，音频和 MP4 使用原生媒体播放 |

## 成品与源码

公开 GitHub 仓库用于分发可直接下载使用的构建产物和示例，不包含源码目录。需要源码、二开包或商业自助开通的用户，可以前往 [https://dev.flyfish.group/shop](https://dev.flyfish.group/shop)，付费 4.99 后自助开通。

项目遵循 `Apache-2.0` 许可证。二开或商用时，请保留许可证、版权和来源说明，并注明项目来源为 Flyfish Viewer / `@flyfish-group/file-viewer3` 或 `@flyfish-group/file-viewer`。如果你基于项目修复了通用问题或增强了通用能力，也欢迎一起贡献。

<div class="doc-shot">
  <img src="/_images/demo-doc.png" alt="DOC 文档按 Word 风格展示" />
  <p class="doc-caption">Word 预览在视觉上回到灰色工作台与白色纸张的阅读模型，用户打开正式文档时会更接近熟悉的文档软件体验。</p>
</div>
