# @file-viewer/renderer-ebook

Flyfish File Viewer 的独立 EPUB 电子书 renderer 包。它负责 `.epub` 文件解析、目录展示、滚动阅读、上一页/下一页导航和阅读进度同步。

## 用法

```ts
import FileViewer from '@file-viewer/vue3'
import { ebookRenderer } from '@file-viewer/renderer-ebook'

const options = {
  builtinRenderers: 'none',
  renderers: ebookRenderer,
}
```

也可以与其他 renderer 组合：

```ts
import { ebookRenderer } from '@file-viewer/renderer-ebook'
import { pdfRenderer } from '@file-viewer/renderer-pdf'
import { archiveRenderer } from '@file-viewer/renderer-archive'

const options = {
  builtinRenderers: 'none',
  renderers: [pdfRenderer, archiveRenderer, ebookRenderer],
}
```

## 能力边界

- `.epub` 使用 `epubjs` 解析 EPUB 包、OPF 元数据、导航目录和章节资源。
- 阅读区采用滚动文档模式，兼容性优先，避免部分浏览器在超宽分页布局下出现正文白板。
- 支持目录窗格显隐、章节跳转、上一页/下一页和阅读进度展示。
- 不绑定任何在线服务或公共 CDN，适合内网知识库、培训资料和长文档附件预览。

## 迁移说明

`@file-viewer/core` 已不再内置 EPUB renderer，也不再直接安装 `epubjs`。需要 EPUB 预览时，请显式安装本包，或直接使用 `@file-viewer/preset-all` 聚合能力。
