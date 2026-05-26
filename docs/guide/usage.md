# 组件用法

<div class="doc-kicker">API At A Glance</div>

<p class="doc-lead">
  `file-viewer` 的 API 非常克制，目前真正需要记住的是两条输入路径：`url` 和 `file`，以及一个可选的 `options`。
  但要把它接进真实业务里，光知道“有这两个参数”还不够，你还得知道渲染器是怎么识别文件类型的、什么时候该传 URL、什么时候应该先把结果包装成带扩展名的 `File`。
</p>

这套 API 在多个 npm 包中保持一致: Vue3 使用 `@flyfish-group/file-viewer3@1.0.12`，Vue2.7 使用 `@flyfish-group/file-viewer@1.0.12`，React 使用 `@flyfish-group/file-viewer-react@1.0.12`，纯 JS 使用 `@flyfish-group/file-viewer-web@1.0.12`。React 和纯 JS 包只负责 iframe、参数和二进制推送，默认加载私有化静态目录 `/file-viewer/index.html`。

## 先记住这 4 条规则

- 渲染器靠文件扩展名选择处理链路，所以文件名本身非常重要。
- 当 `file` 和 `url` 同时存在时，组件会优先渲染 `file`。
- 如果你拿到的是 `Blob` 或 `ArrayBuffer`，推荐先包装成带扩展名的 `File` 再传入。
- 组件会默认撑满父容器，所以父容器必须有明确高度。
- React、纯 JS 和 iframe 模式默认使用 `/file-viewer/index.html`，如果静态目录不同，请显式传入 `viewerUrl`。

## 输入方式怎么选

| 输入方式 | 推荐程度 | 适合场景 | 说明 |
| --- | --- | --- | --- |
| `url` | 推荐 | 文件地址可直接访问、链路简单 | 组件会在浏览器内下载文件，再按扩展名选择渲染器 |
| `file: File` | 强烈推荐 | 本地上传、鉴权下载后预览、宿主系统已拿到文件对象 | 最稳妥的二进制接入方式 |
| `Blob` / `ArrayBuffer` | 先包装再用 | SDK 返回二进制、接口已返回文件流 | 建议先包装成 `new File([...], 'demo.pdf')`，把文件名和扩展名补全 |

React、纯 JS 和 iframe 适配层允许直接传 `Blob` 或 `ArrayBuffer`，但仍然需要同时提供 `name`，例如 `contract.pdf`。底层会把二进制推送给私有化 viewer iframe，渲染规则仍由 Vue3 基线预览器决定。

## 行为规则

- 预览器会根据文件名扩展名自动选择渲染器
- 当 `file` 和 `url` 同时存在时，优先渲染 `file`
- 当 `file` 被清空后，如果 `url` 仍然存在，会自动回退到 `url`
- 组件默认撑满父容器，因此父容器必须有稳定高度
- 扩展名匹配会自动转成小写，所以 `PDF`、`DocX` 这类大小写差异不会影响命中
- OFD、压缩包、邮件、OLB/DRA、CAD、3D 模型、绘图、EPUB、UMD、PDF、Office、Markdown、音频和代码高亮等渲染器均按需异步加载，只有命中文件类型时才拉取对应代码块
- PPTX 属于浏览器端近似渲染链路，已增强组合图形、主题背景、图片裁剪和 EMF 矢量图片；如果业务材料大量使用复杂动画或专有 Office 特效，建议把真实样本加入上线前回归。
- `options` 可以配置内置操作栏、水印、压缩包 Worker、缓存和体积上限。

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

## 预览器 options

`options` 用于配置通用交互和重型格式的运行参数。Vue2 / Vue3 组件、React 组件、纯 JS helper 和 iframe 查询参数都使用同一套语义。

```vue
<script setup lang="ts">
import { ref } from 'vue'

const url = ref('/example/archive.zip')
const options = {
  toolbar: {
    download: true,
    print: true,
    exportHtml: true
  },
  watermark: {
    text: '内部资料',
    opacity: 0.16,
    rotate: -24,
    color: '#1f7a58'
  },
  archive: {
    workerUrl: '/vendor/libarchive/worker-bundle.js',
    cache: true,
    maxArchiveSize: 320 * 1024 * 1024,
    maxEntryPreviewSize: 64 * 1024 * 1024
  }
}
</script>

<template>
  <div style="height: 100vh">
    <file-viewer :url="url" :options="options" />
  </div>
</template>
```

| 选项 | 说明 |
| --- | --- |
| `toolbar` | `true` 或对象；控制下载原文件、打印完整渲染结果和导出渲染后 HTML |
| `watermark` | `true`、文字配置或图片配置；支持 `text`、`image`、`opacity`、`rotate`、`gapX/gapY`、`width/height`、字体和颜色 |
| `archive.workerUrl` | libarchive.js Worker 地址；私有化部署时建议把 `worker-bundle.js` 与 `libarchive.wasm` 放在同一目录 |
| `archive.cache` | 是否使用 IndexedDB 缓存已解压的压缩包内文件 |
| `archive.maxArchiveSize` | 单个压缩包允许读取目录的最大体积，默认 320MB |
| `archive.maxEntryPreviewSize` | 压缩包内单文件允许预览的最大体积，默认 64MB |

图片水印可以传 `https` URL、相对路径或 data URL。开启图片水印时，文字水印不会重复绘制。

## 打印、导出和水印的交付行为

- 下载原文件会保留用户传入的原始二进制内容，不会把渲染后的页面反向写回文件。
- 打印会生成只包含预览内容和水印的独立打印窗口，不带 Demo 侧边栏、示例选择器或操作工具条。
- PDF 打印和导出 HTML 使用 PDF 专属导出适配器逐页生成完整页面，和当前滚动位置、当前可见页、导航窗格显隐状态都解耦，避免只输出当前页或被滚动容器截断。
- 非 PDF 格式会克隆当前渲染结果，并把 canvas 转成图片，保证图纸、3D、绘图、表格和文档在导出 HTML 时仍有可读内容。
- 水印会同时参与预览、打印和 HTML 导出。文字水印适合内部资料、审批流和归档场景；图片水印适合品牌 Logo 或业务系统标识。

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

### OFD、压缩包、邮件、EDA、CAD、3D 模型、绘图和电子书怎么接

`.ofd` 会使用 `DLTech21/ofd.js` 仓库源码在浏览器端解析，避开 npm dist 的授权 wasm 分支。`.dxf` 会使用 CAD 预览器显示图纸。DWG 会先识别误命名 DXF，再尝试提取真实 DWG 的内嵌预览图；完整几何解析仍建议在业务侧转换为 DXF，避免把 GPL 或闭源 DWG 解析运行时打入组件包。

`.zip`、`.7z`、`.rar`、`.tar`、`.gz`、`.xz`、`.cab`、`.iso`、`.jar`、`.apk`、`.cbz`、`.cbr` 等压缩包会使用 `libarchive.js` Worker 读取目录。内部文件在点击后按需解压，并继续交给对应格式预览器。私有化部署时请确认 `/vendor/libarchive/worker-bundle.js` 和同目录下的 `libarchive.wasm` 可访问，或者通过 `options.archive.workerUrl` 指定自己的静态地址。

`.eml` 使用 `postal-mime`，`.msg` 使用 `@kenjiuno/msgreader`。邮件正文会在安全 iframe 中展示，附件可以下载，也可以继续在线预览。

`.olb` 与 `.dra` 使用 `cfb` 做 OrCAD / Allegro 常见复合文档结构预览。组件会展示结构树、流类型、元件符号、封装、Padstack、属性、可读字符串和诊断信息；它适合附件初筛和内容确认，不替代专业 EDA 软件里的封装编辑、规则校核和电气验证。

3D 模型使用 Three.js，支持 `glb/gltf/obj/stl/ply/fbx/dae/3ds/3mf/amf/usd/usda/usdc/usdz/kmz/pcd/wrl/vrml/xyz/vtk/vtp`。如果模型有外部贴图、材质或 `.bin`，远程 `url` 预览会按原始文件目录继续加载；本地上传时更推荐使用单文件 `.glb`。`step/stp/iges/igs/ifc/3dm` 会给出需要 CAD/BIM/WASM 几何内核的原因和转换建议。

`.excalidraw` 会使用官方 `@excalidraw/excalidraw` 的 `exportToSvg` 生成只读 SVG 预览；`.drawio` / `.dio` 会使用官方 diagrams.net `GraphViewer` 渲染，不在组件里手写 mxGraphModel 解析逻辑。

`.epub` 会使用 `epubjs` 解析电子书包、目录和章节资源，并在浏览器内提供只读滚动阅读。阅读器会默认打开第一个正文章节，避免停留在封面或空白包装页。

`.umd` 会按早期移动电子书结构在浏览器端解析文件头、元数据、章节偏移、章节标题和压缩正文。正文数据块使用 `pako` 解压并按 UTF-16LE 解码，适合历史小说附件和旧移动阅读文件。Kindle 专有格式或 DRM 电子书建议先转换为 EPUB / UMD 文本电子书 / PDF 后再传入预览器。

### 音频怎么接

`.mp3`、`.mpeg`、`.wav`、`.ogg`、`.oga`、`.opus`、`.m4a`、`.aac`、`.flac`、`.weba` 会走浏览器原生 `<audio>` 播放器。不同浏览器对音频编码支持不完全一致，如果要保证最稳的跨端体验，建议优先输出 MP3 或 OGG。

### `html` 会被当网页渲染吗

不会。`html` 在当前版本属于代码/文本类型，会按源码内容高亮显示，而不是作为真正网页执行。这一层策略更安全，也更适合做代码、模板和片段查看。
