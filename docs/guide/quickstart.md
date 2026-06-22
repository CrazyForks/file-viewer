# 快速开始

<div class="doc-kicker">Get Running Fast</div>

<p class="doc-lead">
  如果你现在最想做的事情是“尽快看到效果”，这一页就是最快路径。
  先选接入路线，再复制一段最小示例，十几分钟内你就能把预览器跑起来。
</p>

## 先选接入路线

| 方案 | 适合谁 | 优点 | 你应该看哪页 |
| --- | --- | --- | --- |
| Vue3 组件集成 | Vue 3 项目 | 主推组件体验，完整渲染能力直接进入 Vue 应用 | [Vue3 集成](/guide/quickstart-vue3) |
| Vue2 组件集成 | Vue2.7 / Vue2.6 项目 | 保留旧业务栈，体验与 Vue3 一致 | [Vue2 集成](/guide/quickstart-vue2) |
| React 组件集成 | React 16.8 / 17 / 18 / 19 项目 | 原生 React 组件，props、事件和 ref 都能直接调试 | [React 集成](/guide/quickstart-react) |
| 纯 JS 集成 | 非框架页面、微前端壳、任意 Web 系统 | `<flyfish-file-viewer>` 原生组件，也可用 `mountViewer` 命令式挂载 | [纯 JS 集成](/guide/quickstart-web) |
| jQuery / Svelte | 老后台、SvelteKit 或轻量页面 | 独立标准组件包，复用同一套 core 和 options | [生态组件总览](/guide/ecosystem) |
| Core / PPTX 引擎 | 自研组件、深度二开、单独验证 PPTX | framework-neutral 能力与独立 renderer 包 | [生态组件总览](/guide/ecosystem) |

<div class="doc-callout">
  <strong>推荐经验:</strong> core 只负责底层预览能力和 API；Vue、React、Pure Web、jQuery、Svelte 标准组件包负责各自生态的原生接入体验。所有标准组件包都使用同一套 options、事件、搜索、缩放、打印和导出语义。
</div>

## 运行环境

- Node.js `>= 18`
- Vue2 / Vue3 项目推荐使用 `pnpm`
- React / 纯 JS 项目可以使用 npm、pnpm、yarn 或业务项目已有包管理器
- 浏览器需要支持现代前端能力，建议优先在最新版 Chrome 或 Edge 中联调

## Vue3 最短路径

```bash
pnpm add @file-viewer/vue3
```

```ts
import { createApp } from 'vue'
import App from './App.vue'
import FileViewer from '@file-viewer/vue3'

createApp(App).use(FileViewer).mount('#app')
```

```vue
<script setup lang="ts">
const options = {
  theme: 'light',
  toolbar: { position: 'bottom-right' },
  watermark: { text: '内部预览', opacity: 0.14 }
}
</script>

<template>
  <div style="height: 100vh">
    <file-viewer url="/files/demo.docx" :options="options" />
  </div>
</template>
```

## Vue2 最短路径

Vue2.7 项目优先使用 `@file-viewer/vue2.7`，能力与 Vue3 包保持一致，入口会自动带上样式:

```bash
pnpm add @file-viewer/vue2.7
```

```ts
import Vue from 'vue'
import App from './App.vue'
import FileViewer from '@file-viewer/vue2.7'

Vue.use(FileViewer)

new Vue({
  render: h => h(App)
}).$mount('#app')
```

Vue2.6 老项目使用 `@file-viewer/vue2.6`。完整步骤见 [Vue2 集成](/guide/quickstart-vue2)。

## React 最短路径

```bash
npm install @file-viewer/react
```

```tsx
import FileViewer from '@file-viewer/react'

export function Preview() {
  return (
    <div style={{ height: '100vh' }}>
      <FileViewer
        url="/files/demo.docx"
        options={{ theme: 'light', toolbar: { position: 'bottom-right' } }}
      />
    </div>
  )
}
```

完整步骤见 [React 集成](/guide/quickstart-react)。

## 纯 JS 最短路径

```bash
npm install @file-viewer/web
```

```html
<flyfish-file-viewer
  src="/files/demo.pdf"
  theme="light"
  toolbar-position="bottom-right"
  style="display:block;height:100vh"
></flyfish-file-viewer>

<script type="module">
  import { defineFileViewerElement } from '@file-viewer/web'

  defineFileViewerElement()
</script>
```

传统后台页面或无构建工具项目请使用 IIFE 全局包接入；详细示例见 [纯 JS 集成](/guide/quickstart-web)。

## 下一步建议

- 想了解 Demo 中每个示例文件的作用: 看 [Demo 说明](/guide/demo)
- 想查看 Vue3、Vue2、React、Pure Web、jQuery、Svelte、Core 和 PPTX 引擎的完整包矩阵: 看 [生态组件总览](/guide/ecosystem)
- 想明确 `file`、`url`、水印、工具栏、压缩包缓存和导出的参数行为: 看 [组件用法](/guide/usage)
- 准备做本地验证和打包: 看 [本地开发与打包](/guide/development)
- 想下载公开源码、成品或了解优先支持: 看 [发布与开源分发](/guide/distribution)
