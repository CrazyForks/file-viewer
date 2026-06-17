# @file-viewer/react-legacy

The standard legacy React wrapper for React 16.8 and React 17. It avoids React 18/19-only assumptions and does not require the new JSX runtime. The package reuses the `@file-viewer/web` iframe protocol, the shared `@file-viewer/core` runtime, and the same production viewer assets.

```bash
npm install react@17 @file-viewer/react-legacy @file-viewer/web
```

## Quick Start

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

The default viewer entry is `/file-viewer/index.html`. Copy the viewer assets into your public directory with the command provided by `@file-viewer/web`:

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

Use `@file-viewer/react` for React 18 or React 19 projects. Use this package when your application is still on React 16.8 or React 17.

## Capabilities

`@file-viewer/react-legacy` shares the same `@file-viewer/core` capabilities and baseline viewer as the pure web and Vue 3 wrappers, including PDF, Word, Excel, PowerPoint, OFD, CAD/DWG/DXF/DWF, EPUB/UMD, archives, email, Markdown, highlighted code, images, audio, video, 3D models, geospatial files, and structured data assets.

See the official documentation for the full format matrix, options, lifecycle hooks, beforeOperation, theme, watermark, search, zoom, print, and export APIs: https://doc.flyfish.dev/

Chinese README: [README.md](./README.md).
