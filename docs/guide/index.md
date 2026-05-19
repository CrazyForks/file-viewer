# 文档导览

<div class="doc-kicker">Start From The Right Door</div>

<p class="doc-lead">
  Flyfish Viewer 官方文档同时承担组件主页、接入手册和成品交付说明。
  文档围绕真实交付路径组织: 先确认支持格式和 Demo 表现，再选择 Vue 组件或 iframe 嵌入，最后完成打包、发布和成品分发。
</p>

<div class="doc-link-row">
  <a href="https://doc.flyfish.dev" target="_blank" rel="noreferrer">官方文档</a>
  <a href="https://viewer.flyfish.dev" target="_blank" rel="noreferrer">在线 Demo</a>
  <a href="https://github.com/flyfish-dev/file-viewer" target="_blank" rel="noreferrer">GitHub 成品仓库</a>
  <a href="/guide/quickstart">快速开始</a>
  <a href="/guide/formats">支持格式</a>
  <a href="/guide/usage">组件用法</a>
</div>

## 优秀之处

<div class="doc-grid">
  <div class="doc-card">
    <h3>纯前端 Serverless</h3>
    <p>主要解析和渲染工作在浏览器完成，减少后端转码服务、临时文件和任务队列带来的维护成本。</p>
  </div>
  <div class="doc-card">
    <h3>覆盖真实附件场景</h3>
    <p>内置 59 个扩展名映射，覆盖 Office、PDF、OFD、CAD、Markdown、代码/文本、图片和视频。</p>
  </div>
  <div class="doc-card">
    <h3>按需加载更轻</h3>
    <p>OFD、CAD、PDF、Office、Markdown 和代码高亮链路按格式异步加载，避免所有解析器一次性进入首屏。</p>
  </div>
  <div class="doc-card">
    <h3>阅读体验更完整</h3>
    <p>Word 保留白色纸张和灰色页面底，PDF 支持缩放、导航窗格和宽度自适应，打开后默认就是可读状态。</p>
  </div>
</div>

## 推荐阅读顺序

<div class="doc-grid">
  <div class="doc-card">
    <h3>先看 Demo</h3>
    <p>在线 Demo 提供按文件类型分组的样例文件盒子，点击样例即可打开并自动收起选择器，适合快速验收全部格式。</p>
  </div>
  <div class="doc-card">
    <h3>确认格式边界</h3>
    <p>支持格式页列出当前注册的 59 个扩展名、对应渲染链路和真实业务里的适用边界。</p>
  </div>
  <div class="doc-card">
    <h3>选择接入方式</h3>
    <p>Vue 3 项目可以直接使用组件；多系统复用、隔离依赖或带鉴权文件场景，优先考虑 iframe 嵌入。</p>
  </div>
  <div class="doc-card">
    <h3>准备发布分发</h3>
    <p>发布文档说明了混淆压缩产物、npm tarball、Demo 静态站、文档站和公开成品仓库的交付关系。</p>
  </div>
</div>

## 当前重点能力

- Word 视图保留灰色页面底和白色纸张，`.docx` 会按当前可用宽度自适应缩放，长文档缺少显式分页时也会补足视觉分页。
- PDF 视图支持宽度自适应、缩放工具栏、页码状态和可显隐导航窗格。
- OFD 使用 `DLTech21/ofd.js` 的浏览器端解析和渲染能力，并保持按需异步加载。
- CAD 支持 DXF 在线预览，DWG 作为兼容入口给出转换提示，避免引入不合适的运行时授权链路。
- 代码和文本使用 `highlight.js` 轻量高亮，HTML 会按源码展示，不在预览器里执行。

## 常用入口

| 你要做什么 | 推荐页面 |
| --- | --- |
| 想最快跑起来 | [快速开始](/guide/quickstart) |
| 想确认所有格式 | [支持格式](/guide/formats) |
| 想看示例文件和回归建议 | [Demo 说明](/guide/demo) |
| 想在 Vue 3 中接入 | [Vue3 集成](/guide/quickstart-vue3) |
| 想让多个系统共用预览器 | [Iframe 嵌入](/guide/iframe) |
| 想了解参数和事件 | [组件用法](/guide/usage) |
| 想下载成品或二开 | [发布与成品分发](/guide/distribution) |

<div class="doc-note">
  如果你只是想快速判断项目是否适合业务，建议先打开 <a href="https://viewer.flyfish.dev" target="_blank" rel="noreferrer">viewer.flyfish.dev</a>，再用自己的真实附件补一轮回归。
</div>
