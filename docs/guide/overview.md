# 概述

Flyfish Viewer 可以为您的应用快速集成文档预览能力。不同于市面上的文档预览方案，本项目对文档的所有解析和渲染全部都在浏览器端完成，不会给服务器造成任何额外的压力。与此同时，因其纯前端的特性，非常易于部署，可以部署在任何地方，如容器、服务器、甚至是手机、路由器等等。

查看[快速开始](/guide/quickstart)了解详情。

## 特性

- 📄 **支持海量文件格式。** 支持 `docx`、`pptx`、`xlsx`、`xls`、`pdf`、`ofd`、`dxf`、`markdown`、代码高亮、图片、视频等主流文件格式。
- 🌐 **现代纯前端文档渲染方案。** 纯前端文档预览解决方案，无需后端。
- 🛠 **优质代码，优雅实现。** 高质量的 TypeScript 代码，优雅的模块化实现。
- 🚀 **持续使用最新架构。** 基于最新 **Vite** 开发，并同时支持 **Vue2** 和 **Vue3**。
- ⚡ **异步渲染和解析。** 所有文件解析使用 **Web Worker** 异步处理，请纵享丝滑。
- 🧩 **完全响应式数据构建。** 使用完全的组合式 API 构建应用，高性能低占用。
- 🎨 **支持完全的样式自定义。** 解耦样式依赖，组件样式可以根据外部容器完全自适应。
- 🔌 **更加灵活的扩展性。** 支持自定义插件和钩子函数。
- 🎉 **成品开放，持续更新** 🎉🎉🎉

## 当前版本补充说明

<div class="doc-grid">
  <div class="doc-card">
    <h3>`.doc` 体验持续优化</h3>
    <p>当前版本对 `.doc` 文件使用 `msdoc-viewer` 进行解析，并在渲染层额外套用 Word 风格页面容器。</p>
  </div>
  <div class="doc-card">
    <h3>OFD 与 CAD 入列</h3>
    <p>新增 `DLTech21/ofd.js` 源码在线预览和 DXF 图纸预览，OFD 避开 npm dist 授权 wasm 分支，重型依赖保持异步加载。</p>
  </div>
  <div class="doc-card">
    <h3>代码高亮预览</h3>
    <p>代码和日志文件使用 `highlight.js` 轻量高亮，HTML 仍按源码展示，不在预览器中执行。</p>
  </div>
  <div class="doc-card">
    <h3>PDF 阅读体验升级</h3>
    <p>PDF 已补齐缩放工具栏、页码状态和可显隐导航窗格，长文档阅读更顺手。</p>
  </div>
  <div class="doc-card">
    <h3>适合业务交付</h3>
    <p>除了功能本身，文档、Demo、混淆压缩、npm 打包和静态部署链路也已经一并完善，适合直接用于成品分发和项目接入。</p>
  </div>
</div>

## 成品与源码

公开 GitHub 仓库用于分发可直接下载使用的构建产物和示例，不包含源码目录。需要源码、二开包或商业自助开通的用户，可以前往 [https://dev.flyfish.group/shop](https://dev.flyfish.group/shop)，付费 4.99 后自助开通。

项目遵循 `Apache-2.0` 许可证。二开或商用时，请保留许可证、版权和来源说明，并注明项目来源为 Flyfish Viewer / `@flyfish-group/file-viewer3`。

<div class="doc-shot">
  <img src="/_images/demo-doc.png" alt="DOC 文档按 Word 风格展示" />
  <p class="doc-caption">`.doc` 页面已经按 Word 风格居中显示在灰色工作台中，这一层体验补足了原有纯内容渲染的阅读落差。</p>
</div>
