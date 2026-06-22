# @file-viewer/vite-plugin

Vite plugin for Flyfish File Viewer on-demand renderer assembly. It generates `virtual:file-viewer-renderers` from the formats your application declares, imports only the matching renderer packages, and provides renderer-oriented chunk planning plus offline worker/WASM asset copying.

## Install

```bash
pnpm add @file-viewer/vue3 @file-viewer/vite-plugin @file-viewer/renderer-pdf
```

Install additional renderer packages when you need more formats, such as `@file-viewer/renderer-word`, `@file-viewer/renderer-ofd`, `@file-viewer/renderer-presentation`, `@file-viewer/renderer-cad`, `@file-viewer/renderer-drawing`, `@file-viewer/renderer-3d`, `@file-viewer/renderer-data`, `@file-viewer/renderer-eda`, `@file-viewer/renderer-typst`, or `@file-viewer/renderer-archive`.

## vite.config.ts

```ts
import { defineConfig } from 'vite'
import { fileViewerRenderers } from '@file-viewer/vite-plugin'

export default defineConfig({
  plugins: [
    fileViewerRenderers({
      formats: ['pdf', 'dwg', 'typst', 'zip', 'xmind'],
      copyAssets: true,
      chunkStrategy: 'renderer'
    })
  ]
})
```

## Application Code

```ts
import FileViewer from '@file-viewer/vue3'
import { configuredFileViewerRenderers } from 'virtual:file-viewer-renderers'

const options = {
  rendererMode: 'replace',
  renderers: configuredFileViewerRenderers
}
```

## Current Boundary

The plugin currently generates imports for renderer packages that have already been split out: PDF, OFD, Presentation, CAD, Draw.io/Excalidraw, 3D, Data, EDA, Typst, archives, email, EPUB, code/Markdown, image, media, XMind, and Geo. Formats that are still waiting for standalone packages, such as Word and Excel, produce clear guidance. Use `@file-viewer/preset-all` for full compatibility until every renderer line is fully extracted.

## Documentation

- On-demand renderer architecture: <https://doc.file-viewer.app/guide/on-demand-renderers>
- Supported formats: <https://doc.file-viewer.app/guide/formats>
