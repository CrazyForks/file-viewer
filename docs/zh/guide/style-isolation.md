# 样式隔离与主题定制

<div class="doc-kicker">Shadow DOM, Tokens, Parts</div>

<p class="doc-lead">
  File Viewer 在 Web Component / IIFE / full 原生入口中默认使用 Shadow DOM 隔离组件壳和预览内容。
  业务侧通过 CSS Custom Properties 和 Shadow Parts 定制外观，不再依赖内部 class 或全局覆盖。
</p>

这套方案面向宿主 CSS 不可控的企业后台、OA、低代码平台、微前端、门户页面和第三方系统嵌入场景。目标是两件事同时成立：宿主页面的强侵入样式不影响预览器，业务又能稳定地改主题、工具栏和关键区域样式。

## 推荐结论

| 场景 | 推荐方案 |
| --- | --- |
| 新项目、传统后台、script 标签、低代码、微前端 | 使用 `@file-viewer/web`、`@file-viewer/web-full` 或 `<flyfish-file-viewer>`，默认 `styleIsolation:'auto'` 即会走 Shadow DOM |
| Vue / React / Svelte / jQuery 项目需要抗宿主全局样式 | 继续使用当前框架组件，并传 `options.styleIsolation:'shadow'` |
| 需要继承外层字体、主题变量，但仍希望降低样式污染 | 使用 `styleIsolation:'scoped'` |
| 旧项目依赖内部 class 深度覆盖 | 暂时使用 `styleIsolation:'none'`，再逐步迁移到 tokens + parts |

iframe 不是核心推荐路径。它能获得更极端的隔离，但会放大文件传输、打印、搜索、尺寸同步、事件桥接和离线资产部署复杂度。File Viewer 的默认隔离策略优先使用平台原生 Shadow DOM。

## Public API

`FileViewerOptions` 新增统一字段：

```ts
type FileViewerStyleIsolation = 'auto' | 'shadow' | 'scoped' | 'none'

const options = {
  styleIsolation: 'shadow',
  theme: 'light',
  toolbar: { position: 'bottom-right' }
}
```

| 值 | 行为 |
| --- | --- |
| `auto` | 默认值。Web Component / Web full / IIFE / custom element 默认 `shadow`；框架组件保持历史兼容，但 renderer 内容可通过 core 隔离 |
| `shadow` | 创建 ShadowRoot 作为渲染面，样式优先注入隔离根，overlay 也优先挂在隔离根内 |
| `scoped` | 不创建 ShadowRoot，使用稳定根选择器、`@layer file-viewer` 和局部 reset 约束级联 |
| `none` | 保持历史 light DOM 行为，适合旧主题或深度 CSS 覆盖迁移期 |

Web Component 也支持 attribute：

```html
<flyfish-file-viewer
  src="/files/report.pdf"
  filename="report.pdf"
  style-isolation="shadow"
  theme="light"
  style="display:block;height:720px"
></flyfish-file-viewer>
```

需要回到旧行为：

```html
<flyfish-file-viewer style-isolation="none"></flyfish-file-viewer>
```

## CSS Tokens

优先通过 `--file-viewer-*` CSS 变量定制主题。这些变量可以写在 custom element、业务容器、`:root` 或主题 class 上；Shadow DOM 会继承 host 上的 CSS custom properties。

```css
flyfish-file-viewer {
  --file-viewer-bg: #f7f9fc;
  --file-viewer-text: #172033;
  --file-viewer-font: Inter, "Segoe UI", sans-serif;
  --file-viewer-toolbar-bg: rgba(255, 255, 255, 0.96);
  --file-viewer-toolbar-border: rgba(21, 75, 131, 0.16);
  --file-viewer-button-color: #154b83;
  --file-viewer-button-hover-bg: rgba(21, 75, 131, 0.08);
  --file-viewer-button-radius: 6px;
}
```

| Token | 用途 |
| --- | --- |
| `--file-viewer-bg` / `--file-viewer-text` / `--file-viewer-muted` | 壳层背景、主文本和弱文本颜色 |
| `--file-viewer-font` | 组件壳、工具栏、状态面板字体 |
| `--file-viewer-border` / `--file-viewer-focus-ring` | 边框和键盘焦点样式 |
| `--file-viewer-toolbar-bg` / `--file-viewer-toolbar-border` / `--file-viewer-toolbar-shadow` | 工具栏背景、描边和阴影 |
| `--file-viewer-toolbar-padding` / `--file-viewer-toolbar-gap` / `--file-viewer-toolbar-radius` | 工具栏间距和圆角 |
| `--file-viewer-toolbar-floating-offset` / `--file-viewer-toolbar-floating-padding` | 浮动工具栏偏移和安全边距 |
| `--file-viewer-group-bg` / `--file-viewer-group-border` | 工具栏分组背景和边框 |
| `--file-viewer-button-color` / `--file-viewer-button-hover-color` / `--file-viewer-button-disabled-color` | 按钮文本色 |
| `--file-viewer-button-hover-bg` / `--file-viewer-button-radius` | 按钮 hover 背景和圆角 |
| `--file-viewer-input-bg` / `--file-viewer-input-color` | 搜索输入等内置输入控件 |
| `--file-viewer-z-toolbar` / `--file-viewer-z-floating-toolbar` | 工具栏层级 |

## Shadow Parts

当变量不足以表达定制需求时，用 `::part()` 命中稳定外观面：

```css
flyfish-file-viewer::part(toolbar) {
  border-radius: 999px;
}

flyfish-file-viewer::part(button) {
  min-width: 32px;
  font-weight: 600;
}

flyfish-file-viewer::part(content) {
  background: #eef2f7;
}
```

| Part | 当前用途 |
| --- | --- |
| `host` | Web Component 内部 mount 节点 |
| `shell` | 预览器壳层 |
| `toolbar` | 内置工具栏容器 |
| `toolbar-group` | 工具栏按钮分组 |
| `toolbar-status` | 工具栏状态文本 |
| `button` | 内置按钮 |
| `input` | 搜索输入等内置输入控件 |
| `content` | renderer 内容挂载区 |

推荐 renderer 和后续扩展继续使用 `state-panel`、`watermark` 这类稳定 part 名称暴露状态面板和水印层。业务侧不要依赖 `.file-viewer-*` 内部 class，它们可能随实现调整。

## 框架组件写法

Vue / React / Svelte / jQuery 默认保持兼容，以免旧项目的局部样式和快照测试突然变化。需要强隔离时，在同一份 `options` 中开启：

```ts
const viewerOptions = {
  styleIsolation: 'shadow',
  preset: officePreset,
  rendererMode: 'replace',
  theme: 'light'
}
```

如果业务组件需要让外层 CSS 轻度影响预览器，但不希望全局 reset 污染文档内容，可以选择：

```ts
const viewerOptions = {
  styleIsolation: 'scoped'
}
```

## Hostile CSS 验证

上线前建议在宿主页加入一次强侵入 CSS harness，确认工具栏、按钮、正文、图片、canvas、表格和 SVG 都不被污染：

```css
* {
  box-sizing: content-box !important;
  font-size: 26px !important;
  line-height: 3 !important;
}

button,
input,
table,
img,
svg,
canvas,
a,
div {
  all: unset !important;
  display: block !important;
  border: 8px solid red !important;
}
```

期望结果：

- `styleIsolation:'shadow'` 下 Web Component 工具栏和内容仍保持可用。
- 业务通过 `--file-viewer-*` 设置的主题变量仍能生效。
- 业务通过 `flyfish-file-viewer::part(toolbar)` 等选择器能精准定制。
- 事件仍然 `bubbles:true`、`composed:true`，外层页面可以正常监听 `viewer-event`。

## 打印和导出

Shadow DOM 下打印和 HTML 导出会从当前渲染面收集内容和必要样式。格式专属适配器仍优先使用自身的完整页输出，例如 PDF 和 Word；不可靠的虚拟表格、媒体、3D 等链路会继续动态隐藏打印按钮。

如果你维护自定义 renderer：

- 不要把预览样式写入 `document.head` 或 `document.body`。
- 优先使用 core 提供的渲染面和样式注入 helper。
- lightbox、菜单、弹层等 overlay 优先挂在 `context.surface.shadowRoot` 或当前 renderer 容器内。
- 需要对外定制的内部节点使用稳定 `part` 名称，不暴露临时 class 作为公共 API。

## 迁移建议

1. 新 Web / IIFE 接入保持默认 `auto`，不要主动关闭隔离。
2. 旧项目如果依赖深度 class 覆盖，先用 `styleIsolation:'none'` 保持行为。
3. 把颜色、字体、间距、圆角迁移到 `--file-viewer-*` tokens。
4. 把少量结构定制迁移到 `::part()`。
5. 最后切回 `auto` 或显式 `shadow`，并跑 hostile CSS harness 与常用格式 smoke。
