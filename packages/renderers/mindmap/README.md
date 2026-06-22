# @file-viewer/renderer-mindmap

Flyfish File Viewer 的独立 XMind / Mind Map renderer 包。它负责解析现代 `content.json` 和经典 `content.xml` XMind 文件，并提供支持 Pointer / 鼠标 / 触摸拖拽、移动端双指缩放、键盘平移、自适应容器尺寸、统一 toolbar 状态同步和定位的脑图画布。

## 用法

```ts
import FileViewer from '@file-viewer/vue3'
import { mindmapRenderer } from '@file-viewer/renderer-mindmap'

const options = {
  rendererMode: 'replace',
  renderers: mindmapRenderer,
}
```

也可以和其他 renderer 一起组合：

```ts
import { pdfRenderer } from '@file-viewer/renderer-pdf'
import { mindmapRenderer } from '@file-viewer/renderer-mindmap'

const options = {
  rendererMode: 'replace',
  renderers: [pdfRenderer, mindmapRenderer],
}
```

## 能力边界

- 支持 `.xmind`。
- 支持 XMind 2020+ 的 `content.json` 和 XMind 8 / Classic 的 `content.xml`。
- 支持多 sheet、节点层级、标签、备注、链接、图片资源提示、概要/标注/浮动节点状态。
- 支持工具栏缩放、适配画布、Pointer / 鼠标 / 触摸三层拖拽平移、移动端双指缩放、按帧合并平移更新、`Ctrl` / `Command` + 滚轮指针缩放、键盘方向键平移。
- 首次打开和容器尺寸变化时会自动适配视图；用户手动拖拽、滚轮或缩放后会保留当前画布视角，只做安全边界校正。
- 鼠标和触摸拖拽都带 document 级兜底监听，Pointer 拖拽不依赖不稳定的 `buttons` 状态，适配移动 WebView、嵌入式浏览器和部分 Pointer Capture 释放不稳定的场景。

## 迁移说明

core 已不再内置 XMind 解析器，也不会默认安装 `@ljheee/xmind-parser`。需要 XMind 脑图预览时，请显式安装本包，或直接使用 `@file-viewer/preset-all` 聚合能力。
