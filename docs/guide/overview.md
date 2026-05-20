# 概述

Flyfish Viewer 可以为业务系统快速补齐文件在线预览能力。它不同于依赖后端转码的方案，核心解析和渲染都在浏览器端完成，不会额外占用服务器执行 Office 转 PDF、临时文件清理或异步转换任务。

这让它特别适合静态部署、内网私有化、低运维成本和多系统复用场景。查看[快速开始](/guide/quickstart)可以直接跑通第一个预览示例。

## 当前能力

<div class="doc-grid">
  <div class="doc-card">
    <h3>多格式预览</h3>
    <p>内置 74 个扩展名映射，覆盖 Word、Excel、PowerPoint、PDF、OFD、CAD、Excalidraw、draw.io、EPUB、Markdown、图片、音频、视频以及代码/文本。</p>
  </div>
  <div class="doc-card">
    <h3>纯前端渲染</h3>
    <p>大部分格式不需要后端转码服务。业务侧只需要提供可访问 URL、File 或二进制数据包装后的 File。</p>
  </div>
  <div class="doc-card">
    <h3>按需异步加载</h3>
    <p>PDF、OFD、CAD、绘图、Office、Markdown 和代码高亮都按需进入对应预览链路，减少无关格式的加载成本。</p>
  </div>
  <div class="doc-card">
    <h3>双接入路线</h3>
    <p>Vue3 和 Vue2.7 都有对应 npm 包；跨技术栈或多系统场景可独立部署 Demo 站点并通过 iframe 嵌入。</p>
  </div>
</div>

## 优势

- **交付边界清楚。** 组件、Demo、文档站、公开成品仓库、npm tarball 和构建脚本都围绕成品交付维护，接入方可以先验收效果再决定集成方式。
- **视觉体验更接近真实阅读。** Word 文档使用灰色页面底和白色纸张；PDF 提供缩放、页码、导航窗格和可视宽度自适应，避免打开后内容被挤压或不可读。
- **格式策略务实。** PPTX 重点增强组合图形、主题背景、图片裁剪和 EMF 矢量图片；OFD 基于 `DLTech21/ofd.js` 源码链路预览；CAD 支持 DXF，DWG 作为转换提示入口；Excalidraw 和 draw.io 使用官方预览能力；EPUB 使用 `epubjs`，音频使用浏览器原生播放器；代码/日志使用 `highlight.js` 轻量高亮，HTML 按源码展示。内置 CAD、绘图、UMD、音频和 EPUB 回归样例来自公开来源，方便复现实文件兼容问题。
- **适合平台复用。** 多个系统可以共用同一套预览站点，只要升级静态资源即可统一更新预览能力。
- **Vue2 / Vue3 同步维护。** Vue3 包是 `@flyfish-group/file-viewer3@1.0.8`，Vue2 包是 `@flyfish-group/file-viewer@1.0.8`，两条包线保持一致的格式能力和 Demo 体验。
- **二开路径明确。** 公开仓库提供成品下载，源码和商业二开通过 [dev.flyfish.group/shop](https://dev.flyfish.group/shop) 自助开通，避免交付渠道混乱。

## 关键特性

| 能力 | 说明 |
| --- | --- |
| Word | `docx` 使用 `docx-preview`，`.doc` 使用 `msdoc-viewer`，保留文档页面感 |
| Excel | 多种表格格式统一进入表格预览链路，保留常见尺寸、合并和样式 |
| PowerPoint | PPTX 增强组合图形坐标、旋转/翻转、主题背景、图片裁剪和 EMF 矢量图预览 |
| PDF | 基于 `pdfjs-dist`，支持缩放工具栏、页码状态、导航窗格和宽度适配 |
| OFD | 使用 `DLTech21/ofd.js` 源码链路，重型能力按需加载 |
| CAD | 支持 DXF 图纸预览，提供缩放、平移和图层控制 |
| 绘图 | Excalidraw 使用官方 `restore` + `exportToSvg`，draw.io 使用官方 diagrams.net `GraphViewer` |
| 电子书 | EPUB 使用 `epubjs`，提供目录、分页和安全只读阅读 |
| 代码/文本 | 使用 `highlight.js` 高亮多语言源码、UMD 产物、日志、配置和 diff |
| 图片/音频/视频 | 图片使用浏览器原生能力和轻量查看器，音频和 MP4 使用原生媒体播放 |

## 成品与源码

公开 GitHub 仓库用于分发可直接下载使用的构建产物和示例，不包含源码目录。需要源码、二开包或商业自助开通的用户，可以前往 [https://dev.flyfish.group/shop](https://dev.flyfish.group/shop)，付费 4.99 后自助开通。

项目遵循 `Apache-2.0` 许可证。二开或商用时，请保留许可证、版权和来源说明，并注明项目来源为 Flyfish Viewer / `@flyfish-group/file-viewer3` 或 `@flyfish-group/file-viewer`。如果你基于项目修复了通用问题或增强了通用能力，也欢迎一起贡献。

<div class="doc-shot">
  <img src="/_images/demo-doc.png" alt="DOC 文档按 Word 风格展示" />
  <p class="doc-caption">Word 预览在视觉上回到灰色工作台与白色纸张的阅读模型，用户打开正式文档时会更接近熟悉的文档软件体验。</p>
</div>
