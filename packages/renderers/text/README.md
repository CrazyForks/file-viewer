# @file-viewer/renderer-text

Flyfish File Viewer 的独立代码、文本和 Markdown renderer 包。它负责 `.txt`、`.json`、`.ts`、`.vue`、`.log`、`.md`、`.markdown` 等文本类文件的源码高亮、Markdown 阅读面和统一缩放。

## 用法

```ts
import FileViewer from '@file-viewer/vue3'
import { textRenderer } from '@file-viewer/renderer-text'

const options = {
  builtinRenderers: 'none',
  renderers: textRenderer,
}
```

也可以与其他 renderer 组合：

```ts
import { textRenderer } from '@file-viewer/renderer-text'
import { pdfRenderer } from '@file-viewer/renderer-pdf'

const options = {
  builtinRenderers: 'none',
  renderers: [pdfRenderer, textRenderer],
}
```

## 能力边界

- 代码和文本使用 `highlight.js` core + 按语言动态加载，避免一次性注册全部语言。
- HTML / XML / Vue 等文件按源码方式转义展示，不执行脚本。
- Markdown 使用 `marked` 输出只读阅读面，并保留明暗主题、表格滚动和统一缩放 provider。
- 不绑定任何在线服务或公共 CDN，适合内网日志、配置、代码片段、README 和知识库附件预览。

## 迁移说明

当前 `@file-viewer/core` 仍保留内置 code / markdown renderer 以兼容历史全量包。后续会把 core 的文本入口切换到本包，并从 core 直接依赖中移除 `highlight.js` 和 `marked`。
