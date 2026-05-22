# Vue2 集成

<div class="doc-kicker">For Vue 2.7 Projects</div>

<p class="doc-lead">
  Vue2 包已经同步发布到 <code>@flyfish-group/file-viewer@1.0.9</code>。
  它面向 Vue2.7 项目，格式能力、示例文件和 iframe 体验与 v3 分支保持一致。
</p>

## 安装

```bash
pnpm add @flyfish-group/file-viewer
```

也可以使用 `npm`:

```bash
npm install --save @flyfish-group/file-viewer
```

## 注册插件

```ts
import Vue from 'vue'
import App from './App.vue'
import FileViewer from '@flyfish-group/file-viewer'

Vue.use(FileViewer)

new Vue({
  render: h => h(App)
}).$mount('#app')
```

## URL 预览

```vue
<template>
  <div style="height: 100vh">
    <file-viewer :url="url" />
  </div>
</template>

<script>
export default {
  data() {
    return {
      url: 'https://example.com/demo.pdf'
    }
  }
}
</script>
```

## File 预览

```vue
<template>
  <div style="height: 100vh">
    <input type="file" @change="onChange" />
    <div style="height: calc(100vh - 40px)">
      <file-viewer :file="file" />
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      file: undefined
    }
  },
  methods: {
    onChange(event) {
      const value = event.target.files && event.target.files.item(0)
      if (value) {
        this.file = value
      }
    }
  }
}
</script>
```

## 与 Vue3 版本保持一致

Vue2 `main` 分支和 Vue3 `v3` 分支共享同一套预览能力，包括 Word、Excel、PPT、PDF、OFD、CAD、3D 模型、Excalidraw、draw.io、Markdown、代码高亮、图片和视频。差异主要在包名和插件注册入口:

| 版本 | npm 包 | 最新版本 | 注册方式 |
| --- | --- | --- | --- |
| Vue2.7 | `@flyfish-group/file-viewer` | `1.0.9` | `Vue.use(FileViewer)` |
| Vue3 | `@flyfish-group/file-viewer3` | `1.0.9` | `createApp(App).use(FileViewer)` |

<div class="doc-note">
  如果一个预览器需要被多个不同技术栈系统复用，仍然建议优先看 <a href="/guide/iframe">Iframe 嵌入</a>，这样升级预览能力时不需要逐个业务项目发版。
</div>
