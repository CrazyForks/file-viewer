# 组件用法

<div class="doc-kicker">API At A Glance</div>

<p class="doc-lead">
  `file-viewer` 的 API 非常克制，目前真正需要记住的就两条输入路径：`url` 和 `file`。
  但要把它接进真实业务里，光知道“有这两个参数”还不够，你还得知道渲染器是怎么识别文件类型的、什么时候该传 URL、什么时候应该先把结果包装成带扩展名的 `File`。
</p>

这套 API 在两个 npm 包中保持一致: Vue3 使用 `@flyfish-group/file-viewer3@1.0.8`，Vue2.7 使用 `@flyfish-group/file-viewer@1.0.8`。差异只在插件注册方式。

## 先记住这 4 条规则

- 渲染器靠文件扩展名选择处理链路，所以文件名本身非常重要。
- 当 `file` 和 `url` 同时存在时，组件会优先渲染 `file`。
- 如果你拿到的是 `Blob` 或 `ArrayBuffer`，推荐先包装成带扩展名的 `File` 再传入。
- 组件会默认撑满父容器，所以父容器必须有明确高度。

## 输入方式怎么选

| 输入方式 | 推荐程度 | 适合场景 | 说明 |
| --- | --- | --- | --- |
| `url` | 推荐 | 文件地址可直接访问、链路简单 | 组件会在浏览器内下载文件，再按扩展名选择渲染器 |
| `file: File` | 强烈推荐 | 本地上传、鉴权下载后预览、宿主系统已拿到文件对象 | 最稳妥的二进制接入方式 |
| `Blob` / `ArrayBuffer` | 先包装再用 | SDK 返回二进制、接口已返回文件流 | 建议先包装成 `new File([...], 'demo.pdf')`，把文件名和扩展名补全 |

## 行为规则

- 预览器会根据文件名扩展名自动选择渲染器
- 当 `file` 和 `url` 同时存在时，优先渲染 `file`
- 当 `file` 被清空后，如果 `url` 仍然存在，会自动回退到 `url`
- 组件默认撑满父容器，因此父容器必须有稳定高度
- 扩展名匹配会自动转成小写，所以 `PDF`、`DocX` 这类大小写差异不会影响命中
- OFD、CAD、绘图、EPUB、PDF、Office、Markdown、音频和代码高亮等渲染器均按需异步加载，只有命中文件类型时才拉取对应代码块
- PPTX 属于浏览器端近似渲染链路，已增强组合图形、主题背景、图片裁剪和 EMF 矢量图片；如果业务材料大量使用复杂动画或专有 Office 特效，建议把真实样本加入上线前回归。

## URL 预览

```vue
<script setup lang="ts">
import { ref } from 'vue'

const url = ref('https://example.com/demo.pdf')
</script>

<template>
  <div style="height: 100vh">
    <file-viewer :url="url" />
  </div>
</template>
```

适合场景:

- 文件地址可直接访问
- 文件服务已正确配置 CORS
- 业务无需先进行额外下载或鉴权处理

<div class="doc-note">
  如果你的 URL 形如 <code>/download?id=123</code>，路径里没有明确扩展名，预览器就很难准确判断该走哪条渲染链路。遇到这种带签名、带鉴权或通过接口中转的地址，建议直接先把结果取回来，再包装成 <code>File</code> 传入。
</div>

## 文件对象预览

```vue
<script setup lang="ts">
import { ref } from 'vue'

const file = ref<File | undefined>()

function onChange(event: Event) {
  const input = event.target as HTMLInputElement
  const value = input.files?.item(0)
  if (value) file.value = value
}
</script>

<template>
  <div style="height: 100vh">
    <input type="file" @change="onChange" />
    <div style="height: calc(100vh - 40px)">
      <file-viewer :file="file" />
    </div>
  </div>
</template>
```

适合场景:

- 用户本地上传后立即预览
- 宿主系统已经拿到了最终文件对象
- 文件访问链路涉及鉴权，不方便直接暴露 URL

## 鉴权接口返回 Blob 时怎么接

很多业务系统真正拿到的不是公开 URL，而是一个需要携带登录态的下载接口。这种情况下，推荐你先把 `Blob` 包成 `File`:

```ts
const response = await fetch('/api/preview/contract/123', {
  credentials: 'include'
})

const blob = await response.blob()

file.value = new File([blob], 'contract.pdf', {
  type: blob.type
})
```

这样做的好处是:

- 文件内容已经在宿主系统的权限链路里拿到了
- 预览器可以通过 `contract.pdf` 正确识别扩展名
- 业务侧可以自己决定缓存、重试和错误提示策略

## SDK 返回 ArrayBuffer 时怎么接

如果你的下载 SDK 返回的是 `ArrayBuffer`，思路也一样，先补一个正确的文件名:

```ts
const buffer = await sdk.downloadAttachment(id)

file.value = new File([buffer], 'report.xlsx')
```

这里最重要的不是 `ArrayBuffer` 本身，而是你给它补上的 `report.xlsx` 这个文件名。没有扩展名，渲染器就不知道该走哪条链路。

## 典型切换方式

```vue
<script setup lang="ts">
import { ref } from 'vue'

const url = ref('https://example.com/demo.docx')
const file = ref<File | undefined>()

function useRemote() {
  file.value = undefined
  url.value = 'https://example.com/demo.docx'
}

async function useLocal(blob: Blob) {
  file.value = new File([blob], 'local-preview.pdf', { type: blob.type })
}
</script>
```

这一组行为在组件里是稳定的:

- `file` 一旦有值，就优先走 `file`
- `file` 清空后，如果 `url` 还在，就会自动回退到 `url`

## 常见注意事项

### 父容器高度

这类问题最容易被忽略。如果父容器没有高度，预览器会跟着塌陷，最终看起来像“没有渲染”。

### URL 请求失败

如果控制台里能看到 403、404 或 CORS 报错，问题一般不在预览器本身，而是在目标文件地址的可访问性上。

### 文件名要尽量准确

预览器依赖文件扩展名选择渲染器，所以无论你传入的是 URL 还是二进制结果，文件名都应该尽量带上正确扩展名。

### OFD、CAD、绘图和电子书怎么接

`.ofd` 会使用 `DLTech21/ofd.js` 仓库源码在浏览器端解析，避开 npm dist 的授权 wasm 分支。`.dxf` 会使用 CAD 预览器显示图纸。DWG 作为兼容入口会提示先转换为 DXF，这是为了避免把 GPL 授权的 DWG 解析运行时打入组件包。

`.excalidraw` 会使用官方 `@excalidraw/excalidraw` 的 `exportToSvg` 生成只读 SVG 预览；`.drawio` / `.dio` 会使用官方 diagrams.net `GraphViewer` 渲染，不在组件里手写 mxGraphModel 解析逻辑。

`.epub` 会使用 `epubjs` 解析电子书包、目录和章节资源，并在浏览器内提供只读分页阅读。Kindle 专有格式或 DRM 电子书建议先转换为 EPUB / PDF 后再传入预览器。

### 音频怎么接

`.mp3`、`.mpeg`、`.wav`、`.ogg`、`.oga`、`.opus`、`.m4a`、`.aac`、`.flac`、`.weba` 会走浏览器原生 `<audio>` 播放器。不同浏览器对音频编码支持不完全一致，如果要保证最稳的跨端体验，建议优先输出 MP3 或 OGG。

### `html` 会被当网页渲染吗

不会。`html` 在当前版本属于代码/文本类型，会按源码内容高亮显示，而不是作为真正网页执行。这一层策略更安全，也更适合做代码、模板和片段查看。
