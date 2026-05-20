# Flyfish Viewer

把 Word、Excel、PPT、PDF、音频和电子书稳稳带进浏览器里。

`@flyfish-group/file-viewer3` 是一款基于 Vue 3、TypeScript 和 Vite 构建的纯前端文件预览组件。Vue2.7 项目请使用同能力包 `@flyfish-group/file-viewer`。两条 npm 包线保持一致的格式覆盖、示例体验和 API 语义，在线 Demo 始终使用 `v3` 分支产物作为最新体验基准。

它不依赖后端转码服务，适合接入 OA、知识库、附件中心、流程系统和需要离线能力的业务场景。这个项目的目标很直接: 让文档预览不再像临时拼出来的功能，而是像一个可以放心交付、能独立演示、能持续维护的产品模块。

- 在线 Demo: [viewer.flyfish.dev](https://viewer.flyfish.dev)
- 官方文档/组件主页: [doc.flyfish.dev](https://doc.flyfish.dev)
- npm(Vue3): [@flyfish-group/file-viewer3](https://www.npmjs.com/package/@flyfish-group/file-viewer3)
- npm(Vue2): [@flyfish-group/file-viewer](https://www.npmjs.com/package/@flyfish-group/file-viewer)
- 公开成品仓库: [github.com/flyfish-dev/file-viewer](https://github.com/flyfish-dev/file-viewer)
- 源码自助开通: [dev.flyfish.group/shop](https://dev.flyfish.group/shop)

## 当前发布版本

| 技术栈 | npm 包 | 最新版本 | 推荐分支 | 说明 |
| --- | --- | --- | --- | --- |
| Vue3 | `@flyfish-group/file-viewer3` | `1.0.8` | `v3` | 主推版本，在线 Demo 与后续上线均以此为准 |
| Vue2.7 | `@flyfish-group/file-viewer` | `1.0.8` | `main` | 兼容 Vue2 项目，格式能力与 Vue3 保持一致 |

![Flyfish Viewer demo](https://doc.flyfish.dev/_images/demo-main.png)

## 为什么值得接入

- **纯前端 Serverless。** 文档解析和展示全部在浏览器内完成，部署简单，不依赖 Office 服务端、LibreOffice 守护进程或额外转码链路。
- **格式覆盖完整。** 当前内置 74 个扩展名映射，覆盖 Word、Excel、PowerPoint、PDF、OFD、CAD、Excalidraw、draw.io、EPUB、Markdown、图片、音频、代码/文本和 MP4，能覆盖绝大多数业务附件场景。
- **按需异步加载。** PDF、OFD、CAD、绘图、Office、Markdown 和代码高亮渲染器都按需加载，重型解析依赖不会进入其他格式的首屏路径。
- **阅读体验更像产品。** `.doc`、`.docx`、PDF 都保留灰色工作台、白色纸张、居中阅读和自适应缩放，避免“内容能打开但不好读”的落差。
- **Demo 更适合验收。** 示例文件按文档、表格、图纸、代码、图片等类型分组展示，点击样例即可打开并自动收起选择器。
- **Vue2 / Vue3 体验一致。** `main` 分支面向 Vue2.7，`v3` 分支面向 Vue3；两边共享完整格式覆盖、示例文件盒子、文档站和 iframe 集成体验。
- **组件和独立站两用。** 既支持在 Vue 项目里直接作为组件使用，也支持独立部署后通过 iframe 嵌入到任意系统，方便多业务线复用。
- **适合成品交付。** 官方文档、在线 Demo、公开成品仓库、混淆压缩产物、npm tarball 和静态部署产物都一起维护，便于下载、验收和二次接入。

## 支持格式

当前版本内置 74 个扩展名映射，覆盖 14 条预览链路。

| 类别 | 扩展名 | 当前表现 | 适合场景 |
| --- | --- | --- | --- |
| Word | `docx` | `docx-preview`，更适合保留文档结构和版式 | 新生成的 Word 文档、正式文档 |
| Word | `doc` | `msdoc-viewer` + Word 风格页面容器 | 历史 `.doc` 老文档 |
| Excel | `xlsx` | `styled-exceljs` + 虚拟滚动，支持尺寸、合并和常见样式 | 需要保留表格结构和样式的业务 |
| Excel 兼容格式 | `xlsm`、`xlsb`、`xls`、`csv`、`ods`、`fods`、`numbers` | 统一解析，按格式可用信息渐进还原样式 | 老表格、轻量数据查看 |
| PowerPoint | `pptx` | 浏览幻灯片内容，增强组合图形、主题背景、图片裁剪与 EMF 矢量图预览 | 汇报材料、课件、方案 |
| PDF | `pdf` | 基于 `pdfjs-dist` 预览，支持缩放工具栏、页码状态和可显隐导航窗格 | 合同、票据、版式成品 |
| OFD | `ofd` | 基于 `DLTech21/ofd.js` 仓库源码在线预览国产版式文档，避开 npm dist 授权 wasm 分支 | 电子发票、公文、归档材料 |
| CAD | `dxf` | 基于 `@cadview/core` 预览图纸，支持缩放、平移、图层控制 | 工程图纸、二维 CAD 附件 |
| CAD 兼容入口 | `dwg` | 提示转换为 DXF 后预览，不内置 GPL DWG 解析器 | 需要兼容上传入口的业务 |
| Excalidraw | `excalidraw` | 基于官方 `@excalidraw/excalidraw` 的 `restore` + `exportToSvg` 输出只读预览 | 白板草图、流程草稿、产品沟通图 |
| draw.io | `drawio`、`dio` | 基于官方 diagrams.net `GraphViewer` 预览 mxGraphModel / mxfile | 流程图、架构图、业务泳道图 |
| 电子书 | `epub` | 基于 `epubjs` 解析目录和章节资源，使用兼容性更好的滚动阅读 | 电子书、培训手册、长篇阅读材料 |
| Markdown | `md`、`markdown` | Markdown 阅读样式 | README、知识文档、说明文档 |
| 图片 | `gif`、`jpg`、`jpeg`、`bmp`、`tiff`、`tif`、`png`、`svg`、`webp` | 原生图片浏览 | 图片附件、设计稿、Logo |
| 代码/文本 | `txt`、`json`、`js`、`mjs`、`cjs`、`umd`、`css`、`java`、`py`、`html`、`htm`、`jsx`、`ts`、`tsx`、`xml`、`log`、`vue`、`yaml`、`yml`、`ini`、`sh`、`bash`、`sql`、`go`、`rs`、`php`、`c`、`cpp`、`cc`、`h`、`hpp`、`cs`、`diff` | 使用 `highlight.js` 轻量高亮，HTML 按源码展示 | 日志、配置、代码片段、UMD 产物源码 |
| 音频 | `mp3`、`mpeg`、`wav`、`ogg`、`oga`、`opus`、`m4a`、`aac`、`flac`、`weba` | 浏览器原生音频播放，带控制条和基础进度信息 | 录音、播客、语音附件、音效素材 |
| 视频 | `mp4` | 浏览器原生视频播放 | 演示视频、录屏 |

## 三条接入路线

### 1. Vue 3 组件集成

适合已经在 Vue 3 项目里开发，希望最短路径完成接入的团队。当前在线 Demo 和生产上线均以 `v3` 分支作为最终产物来源。

```bash
pnpm add @flyfish-group/file-viewer3
```

```ts
import { createApp } from 'vue'
import App from './App.vue'
import FileViewer from '@flyfish-group/file-viewer3'

createApp(App).use(FileViewer).mount('#app')
```

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

### 2. Vue 2 组件集成

适合仍在 Vue2.7 技术栈上，希望直接以内嵌组件方式完成接入的团队。

```bash
pnpm add @flyfish-group/file-viewer
```

```ts
import Vue from 'vue'
import App from './App.vue'
import FileViewer from '@flyfish-group/file-viewer'

Vue.use(FileViewer)

new Vue({
  render: h => h(App)
}).$mount('#app')
```

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

### 3. Iframe 嵌入

适合多系统共用一套预览器、想把预览能力独立部署、或者不希望把解析依赖带进业务包的场景。

```html
<iframe
  id="viewer"
  src="https://viewer.flyfish.dev?url=https%3A%2F%2Fexample.com%2Fdemo.docx"
  style="width: 100%; height: 100%; border: 0"
></iframe>
```

更完整的二进制推送方案、`from` 安全校验和宿主页面示例，请查看文档站中的 [Iframe 嵌入说明](https://doc.flyfish.dev/guide/iframe)。

## 使用说明

- 组件支持两条主要输入路径: `url?: string` 与 `file?: File`
- 当 `file` 和 `url` 同时存在时，会优先渲染 `file`
- 如果业务侧拿到的是 `Blob` 或 `ArrayBuffer`，推荐先包装成带扩展名的 `File`
- 预览器会填满父容器，请为父容器提供稳定高度
- 使用 `url` 预览时，目标资源需要允许浏览器访问；跨域场景下需要正确配置 CORS
- 如果下载地址本身没有明确扩展名，建议先在业务侧取回文件，再包装成 `File`
- PPTX 渲染器会尽量还原常见组合图形、旋转/翻转、主题背景、图片裁剪和 EMF 矢量图片；复杂 Office 特效仍建议用真实业务文件做回归
- OFD、CAD、绘图、EPUB、PDF、Office、Markdown、音频和代码高亮渲染器都按需异步加载，只有命中格式时才拉取对应代码块

```ts
const blob = await response.blob()
const file = new File([blob], 'contract.pdf', { type: blob.type })
```

## 本地开发

下面的命令适用于源码开通后的完整项目。公开 GitHub 成品仓库不包含源码目录，普通用户建议直接通过 npm、`dist/` 或 `artifacts/` 里的 tarball 使用。

```bash
pnpm install
pnpm dev
```

常用脚本:

- `pnpm build`: 构建示例站点
- `pnpm build-lib`: 构建组件库产物
- `pnpm docs:dev`: 启动 VitePress 文档站
- `pnpm docs:build`: 构建文档站
- `pnpm type-check`: 执行 TypeScript 类型检查

## 打包发布

Vue3 和 Vue2 发包时分别在对应分支执行同一套发布链路:

| 包 | 分支 | npm 名称 |
| --- | --- | --- |
| Vue3 | `v3` | `@flyfish-group/file-viewer3` |
| Vue2.7 | `main` | `@flyfish-group/file-viewer` |

建议在发布前执行下面这组命令:

```bash
pnpm type-check
pnpm build
pnpm build-lib
pnpm obfuscate
pnpm docs:build
npm pack
```

其中:

- `dist/` 是库构建产物；执行 `pnpm obfuscate` 后会对其中的 `.js` / `.mjs` 进行压缩混淆
- `pnpm build` 会生成可独立部署的 Demo 静态站点产物
- `docs/.vitepress/dist/` 是文档站静态产物
- `npm pack` 会生成可直接发布或分发的 npm 包 tarball

如果只是准备 npm 包，可以直接执行:

```bash
pnpm release:pack
```

发布到 npm:

```bash
npm publish --dry-run --access public
npm publish --access public
```

如果 npm 账号启用了 MFA，请使用交互式终端完成浏览器确认后再等待发布结果。

公开 GitHub 仓库只提交可直接使用的构建产物、示例、文档和 npm tarball，不提交当前源码目录。需要源码、二开包或商业自助开通的用户，可以前往 [https://dev.flyfish.group/shop](https://dev.flyfish.group/shop)，付费 4.99 后自助开通。

## 文档导航

- [文档导览](https://doc.flyfish.dev/guide/)
- [快速开始](https://doc.flyfish.dev/guide/quickstart)
- [Demo 说明](https://doc.flyfish.dev/guide/demo)
- [组件用法](https://doc.flyfish.dev/guide/usage)
- [支持格式](https://doc.flyfish.dev/guide/formats)
- [本地开发与打包](https://doc.flyfish.dev/guide/development)

## 开源说明

本项目使用 `Apache-2.0` 许可证。

二开或商用时，请按许可证要求保留版权、许可证和来源说明，并注明项目来源为 Flyfish Viewer / `@flyfish-group/file-viewer3` 或 `@flyfish-group/file-viewer`。如果你基于本项目修复了通用问题或增强了通用能力，也欢迎通过 issue / PR 一起贡献回来，让这套预览能力继续变得更稳。
