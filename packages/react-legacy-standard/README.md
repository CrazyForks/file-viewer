# @file-viewer/react-legacy

标准 React legacy wrapper 包，面向 React 16.8 和 React 17。它不依赖 React 18/19 的能力，也不依赖新的 JSX runtime，内部复用 `@file-viewer/web` 和 `@file-viewer/core` 的 iframe 协议、静态 viewer 产物和完整预览能力。

```bash
npm install react@17 @file-viewer/react-legacy @file-viewer/web
```

## 快速开始

```tsx
import React, { useRef } from 'react'
import FileViewer, { type FileViewerLegacyHandle } from '@file-viewer/react-legacy'

export function Preview() {
  const viewerRef = useRef<FileViewerLegacyHandle>(null)

  return (
    <div style={{ height: '100vh' }}>
      <FileViewer
        ref={viewerRef}
        url="/example/demo.docx"
        options={{
          theme: 'light',
          toolbar: { position: 'bottom-right' }
        }}
      />
    </div>
  )
}
```

默认加载 `/file-viewer/index.html`。请通过 `@file-viewer/web` 提供的复制命令把 viewer 静态产物放入站点目录:

```bash
npx file-viewer-copy-assets ./public/file-viewer
```

## Ref API

```ts
viewerRef.current?.reload()
viewerRef.current?.postFile()
viewerRef.current?.update({ url: '/example/report.pdf' })
viewerRef.current?.destroy()
```

新项目如果使用 React 18 或 React 19，建议优先使用 `@file-viewer/react`；旧业务系统使用 React 16.8/17 时使用本包。

## 能力范围

`@file-viewer/react-legacy` 与纯 Web、Vue3 基线 viewer 共享同一套 `@file-viewer/core` 能力，覆盖 PDF、Word、Excel、PPT、OFD、CAD/DWG/DXF/DWF、EPUB/UMD、压缩包、邮件、Markdown、代码高亮、图片、音频、视频、3D 模型、地理数据和结构化数据资产等预览链路。

完整格式矩阵、参数、生命周期 hooks、beforeOperation、主题、水印、搜索、缩放、打印和导出能力请查看官方文档: https://doc.flyfish.dev/

English README: [README.en.md](./README.en.md)。
