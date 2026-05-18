# 文档导览

<div class="doc-kicker">Welcome To Flyfish Viewer</div>

<p class="doc-lead">
  欢迎来到 Flyfish Viewer 文档中心。
  这里保留了项目最早对外介绍时那套核心表达，也补齐了面向成品交付的使用说明、集成方案与发布流程。你可以先快速浏览项目定位，再按需要进入 Vue3 集成、iframe 嵌入或本地打包章节。
</p>

<div class="doc-hero-logo">
  <img src="/_media/logo.svg" alt="Flyfish Viewer Logo" />
</div>

## Flyfish Viewer

> 一款纯前端Serverless的全能文档预览器

- ✨ **最新技术栈**：基于 Vite + Vue2/3 + ts + 组合式 API
- 🚀 **超高兼容性**：内置 59 个扩展名映射，覆盖 Office、PDF、OFD、CAD、Markdown、代码/文本、图片和视频
- ⚡ **超优质代码**：完全异步组件加载，**Web Worker**，超高性能

<div class="doc-link-row">
  <a href="https://github.com/wybaby168/file-viewer" target="_blank" rel="noreferrer">GitHub 成品仓库</a>
  <a href="https://dev.flyfish.group/shop" target="_blank" rel="noreferrer">源码自助开通</a>
  <a href="/guide/quickstart">快速开始</a>
</div>

## 概述

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

## 开发背景

**Flyfish Viewer**（原file-viewer）是飞鱼开源团队呕心沥血，历时两年打造的纯前端文档预览解决方案。该项目诞生于CSDN博文，旨在降低浏览器段文档预览的门槛，整合市面上成熟的文档预览技术而实现的一套解决方案。原文链接：[https://blog.csdn.net/wybaby168/article/details/122842866](https://blog.csdn.net/wybaby168/article/details/122842866)

## 示例

可以查看 [Demo](https://viewer.flyfish.dev) 立即体验本组件。

公开 GitHub 仓库提供可直接下载使用的混淆压缩成品、示例文件和文档产物；如果需要源码、二开包或商业自助开通，请前往 [https://dev.flyfish.group/shop](https://dev.flyfish.group/shop)，付费 4.99 后自助开通。

<div class="doc-shot">
  <img src="/_images/demo1.png" alt="Flyfish Viewer 旧版示例" />
  <p class="doc-caption">这是项目早期文档中使用的展示图，今天再看，仍然能准确说明这套预览器的使用方式和页面气质。</p>
</div>

## 捐赠

如果你觉得 Flyfish Viewer 对你有帮助，或者想要给我一些项目维护的支持，欢迎给我[捐赠](/donate)。

> 目前CSDN上售卖的资源因权限问题无法更新，请使用我们的官方渠道进行支持。

## 社区

您可以关注我们的微信公众号，及时获取最新进展

<img src="/_images/mp.png" alt="微信公众号" style="width: 400px">

您也可以添加我们的客服微信`Yous_Gift`，咨询相关业务详情

<img src="/_images/contact.jpg" alt="客服微信" style="width: 300px">

## 接下来去哪里

1. [快速开始](/guide/quickstart)
2. [Vue3 集成](/guide/quickstart-vue3)
3. [Iframe 嵌入](/guide/iframe)
4. [Demo 说明](/guide/demo)
5. [本地开发与打包](/guide/development)
6. [发布与成品分发](/guide/distribution)
