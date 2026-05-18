---
layout: home
title: Flyfish Viewer
titleTemplate: false
hero:
  name: Flyfish Viewer
  text: 一款纯前端Serverless的全能文档预览器
  tagline: Flyfish Viewer 可以为您的应用快速集成文档预览能力，不同于市面上的文档预览方案，本项目对文档的所有解析和渲染全部都在浏览器端完成。
  image:
    src: /_media/logo.svg
    alt: Flyfish Viewer
  actions:
    - theme: brand
      text: 快速开始
      link: /guide/quickstart
    - theme: alt
      text: 在线 Demo
      link: https://viewer.flyfish.dev
    - theme: alt
      text: npm 包
      link: https://www.npmjs.com/package/@flyfish-group/file-viewer3
    - theme: alt
      text: GitHub 成品仓库
      link: https://github.com/wybaby168/file-viewer
features:
  - title: 最新技术栈
    details: 基于 Vite + Vue2/3 + ts + 组合式 API
  - title: 超高兼容性
    details: 内置 59 个扩展名映射，覆盖 Office、PDF、OFD、CAD、Markdown、代码/文本、图片和视频
  - title: 超优质代码
    details: 完全异步组件加载，WebWorker，超高性能
  - title: 面向交付
    details: 文档、Demo、混淆压缩、构建和 npm 打包链路已经完整打通
---

<div class="doc-kicker">Serverless Preview Experience</div>

<p class="doc-lead">
  Flyfish Viewer 想解决的，不只是“文件能不能打开”，而是“业务里能不能放心交付”。
  当一个预览器要走进 OA、知识库、附件中心和流程系统，稳定性、说明文档、接入路径和页面质感都应该一起到位。
</p>

<div class="doc-brand-panel">
  <img src="/_media/logo.svg" alt="Flyfish Viewer 品牌标识" />
  <p class="doc-caption">沿用项目原始品牌物料中的矢量 Logo，在首页保留更完整的品牌识别，也让展示在高分辨率屏幕上更干净。</p>
</div>

<div class="doc-shot">
  <img src="/_images/demo-main.png" alt="Flyfish Viewer 主界面预览" />
  <p class="doc-caption">本地 Demo 的主界面，示例文件切换、上传和预览都在一个页面完成，适合联调和对外演示。</p>
</div>

## 为什么它适合真实项目

<div class="doc-grid">
  <div class="doc-card">
    <h3>先把复杂度留给组件</h3>
    <p>业务系统只需要提供文件 URL 或二进制数据，渲染细节由预览器统一处理，接入侧可以保持简洁。</p>
  </div>
  <div class="doc-card">
    <h3>让 `.doc` 看起来更像 Word</h3>
    <p>当前版本对 `.doc` 引入了更完整的解析方案，并用灰色工作台与白色纸张模拟文档阅读体验。</p>
  </div>
  <div class="doc-card">
    <h3>适合平台化复用</h3>
    <p>如果你有多个系统共用同一套预览能力，可以直接把它独立部署，通过 iframe 嵌入统一升级。</p>
  </div>
  <div class="doc-card">
    <h3>文档与构建一起交付</h3>
    <p>README、VitePress 文档站、本地构建、混淆压缩、npm 打包和线上 Demo 一起维护，方便发布和协作。</p>
  </div>
</div>

## 从哪里开始最顺

- 想尽快跑起来: 从 [快速开始](/guide/quickstart) 开始。
- 想先看效果再决定接入方式: 查看 [Demo 说明](/guide/demo)。
- 需要嵌入已有系统: 直接阅读 [Iframe 嵌入](/guide/iframe)。
- 准备发版: 看 [本地开发与打包](/guide/development)。
- 需要下载成品或了解源码开通: 看 [发布与成品分发](/guide/distribution)。

<div class="doc-callout">
  <strong>一眼看懂接入路线:</strong> 如果你已经在 Vue 3 项目里开发，优先使用组件集成；如果你希望多系统复用、统一升级或者隔离依赖，优先使用 iframe 独立部署方案。
</div>
