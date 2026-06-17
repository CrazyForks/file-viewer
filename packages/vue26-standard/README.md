# @file-viewer/vue2.6

标准 Vue 2.6 wrapper 包，提供 `Vue.use()` 插件安装和局部组件两种方式。它不依赖 Vue 2.7 Composition API，组件内部复用 `@file-viewer/web` 与 `@file-viewer/core` 的 iframe 协议、静态 viewer 产物和完整预览能力。

```bash
npm install vue@2.6 @file-viewer/vue2.6 @file-viewer/web
```

## 全局安装

```ts
import Vue from 'vue'
import FileViewerPlugin from '@file-viewer/vue2.6'

Vue.use(FileViewerPlugin)
```

```vue
<template>
  <section style="height: 100vh">
    <FileViewer
      ref="viewer"
      url="/example/demo.pdf"
      :options="{
        theme: 'light',
        toolbar: { position: 'bottom-right' }
      }"
      @viewer-event="handleViewerEvent"
    />
  </section>
</template>
```

默认加载 `/file-viewer/index.html`。请通过 `@file-viewer/web` 提供的复制命令把 viewer 静态产物放入站点目录:

```bash
npx file-viewer-copy-assets ./public/file-viewer
```

## 局部组件

```ts
import { FileViewer } from '@file-viewer/vue2.6'

export default {
  components: { FileViewer }
}
```

## 实例方法

```ts
const viewer = this.$refs.viewer
viewer.reload()
viewer.postFile()
viewer.update({ url: '/example/report.docx' })
viewer.destroy()
```

Vue 2.7 项目建议使用 `@file-viewer/vue2.7`；Vue 2.6 项目使用本包。

## 能力范围

`@file-viewer/vue2.6` 与纯 Web、Vue3 基线 viewer 共享同一套 `@file-viewer/core` 能力，覆盖 PDF、Word、Excel、PPT、OFD、CAD/DWG/DXF/DWF、EPUB/UMD、压缩包、邮件、Markdown、代码高亮、图片、音频、视频、3D 模型、地理数据和结构化数据资产等预览链路。

完整格式矩阵、参数、生命周期 hooks、beforeOperation、主题、水印、搜索、缩放、打印和导出能力请查看官方文档: https://doc.flyfish.dev/

English README: [README.en.md](./README.en.md)。
