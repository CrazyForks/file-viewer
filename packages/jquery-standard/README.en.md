# @file-viewer/jquery

The standard jQuery wrapper for Flyfish File Viewer. It reuses the `@file-viewer/web` iframe protocol, the shared `@file-viewer/core` runtime, and the same production viewer assets. The package itself is only a small `$(el).fileViewer()` bridge.

```bash
npm install jquery @file-viewer/jquery @file-viewer/web
```

## Quick Start

```ts
import $ from 'jquery'
import { installJQueryFileViewer } from '@file-viewer/jquery'

installJQueryFileViewer($)

$('#viewer').fileViewer({
  url: '/example/demo.pdf',
  options: {
    theme: 'light',
    toolbar: { position: 'bottom-right' }
  }
})
```

The default viewer entry is `/file-viewer/index.html`. Copy the viewer assets into your public directory with the command provided by `@file-viewer/web`:

```bash
npx file-viewer-copy-assets ./public/file-viewer
```

## Methods

```ts
$('#viewer').fileViewer('update', {
  url: '/example/report.docx',
  options: { theme: 'auto' }
})

$('#viewer').fileViewer('reload')
$('#viewer').fileViewer('postFile')
$('#viewer').fileViewer('destroy')
```

You can access the underlying controller when your integration needs the full iframe API:

```ts
import { getFileViewerController } from '@file-viewer/jquery'

const controller = getFileViewerController($('#viewer'))
controller?.reload()
```

## Script Tag Usage

When `window.jQuery` or `window.$` already exists, the package registers `$.fn.fileViewer` automatically. For script-tag-only projects, prefer an ESM CDN or a small bundler entry and make sure `/file-viewer/index.html` is reachable from the page.

## Capabilities

`@file-viewer/jquery` shares the same `@file-viewer/core` capabilities as the Vue 3 baseline viewer, including PDF, Word, Excel, PowerPoint, OFD, CAD/DWG/DXF/DWF, EPUB/UMD, archives, email, Markdown, code highlighting, images, audio, video, 3D models, geospatial files, and structured data assets.

See the official documentation for the full format matrix, options, lifecycle hooks, beforeOperation, theme, watermark, search, zoom, print, and export APIs: https://doc.flyfish.dev/

Chinese README: [README.md](./README.md).
