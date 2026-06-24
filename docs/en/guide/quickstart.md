# Quickstart

<div class="doc-kicker">Get Running Fast</div>

<p class="doc-lead">
  Pick the package that matches your stack, give the viewer container a stable height, and pass a file URL or a real <code>File</code>.
  One component, one line of code, fast integration.
</p>

## Pick The Capability Layer First

Installing a standard component package such as `@file-viewer/vue3`, `@file-viewer/react`, or `@file-viewer/web` is the lightest path. It gives you the native framework component, types, controller APIs, and the core foundation; it does not install every heavy PDF, Office, CAD, Typst, archive, or engineering renderer by default.

Add a preset or a single renderer package for the file formats your product actually needs:

| Package | Coverage | Best fit |
| --- | --- | --- |
| `@file-viewer/preset-lite` | Text, Markdown, code, image, audio, video | Lightweight attachment preview |
| `@file-viewer/preset-office` | PDF, Word, Excel, PowerPoint, OFD, RTF, OpenDocument | OA, approvals, knowledge bases, contracts |
| `@file-viewer/preset-engineering` | CAD, 3D, drawing, XMind, Geo, Typst, Archive, Data, EDA | Engineering, R&D, design assets |
| `@file-viewer/preset-all` | Full official demo matrix | Demos and internal all-format workbenches |
| Single renderer | For example `@file-viewer/renderer-pdf` or `@file-viewer/renderer-word` | Minimal custom format cuts |

`@file-viewer/vite-plugin` can auto-discover installed presets and inject renderer modules. If a file extension is supported but the required renderer is not assembled, the viewer shows an install-oriented hint instead of a vague unsupported state.

## Vanilla JavaScript / Web Component

```bash
npm install @file-viewer/web
```

```html
<flyfish-file-viewer
  id="viewer"
  src="/files/demo.pdf"
  filename="demo.pdf"
  theme="light"
  toolbar-position="bottom-right"
  style="display:block;height:720px"
></flyfish-file-viewer>
```

```ts
import { defineFileViewerElement } from '@file-viewer/web'

defineFileViewerElement()
```

## Vue 3

```bash
npm install @file-viewer/vue3 @file-viewer/core @file-viewer/vite-plugin @file-viewer/preset-office
```

```ts
// vite.config.ts
import { fileViewerRenderers } from '@file-viewer/vite-plugin'

export default {
  plugins: [
    fileViewerRenderers({
      preset: 'office',
      scan: true,
      copyAssets: true,
      chunkStrategy: 'renderer'
    })
  ]
}
```

```ts
import { createApp } from 'vue'
import App from './App.vue'
import FileViewer from '@file-viewer/vue3'

createApp(App).use(FileViewer).mount('#app')
```

```vue
<template>
  <div style="height: 100vh">
    <file-viewer url="/files/report.docx" />
  </div>
</template>
```

## React

```bash
npm install @file-viewer/react
```

```tsx
import FileViewer from '@file-viewer/react'

export function Preview() {
  return (
    <div style={{ height: '100vh' }}>
      <FileViewer
        url="/files/report.pdf"
        options={{
          theme: 'light',
          toolbar: { position: 'bottom-right' },
          archive: { cache: true }
        }}
      />
    </div>
  )
}
```

React 16.8/17 projects can use `@file-viewer/react-legacy`.

## Authenticated Files

If your app must authenticate before downloading a file, fetch the file in the host app and pass a named `File` to the viewer:

```ts
const blob = await fetch('/api/files/contract', {
  credentials: 'include'
}).then(response => response.blob())

const file = new File([blob], 'contract.pdf', { type: blob.type })
```

Passing a filename with an extension is important because the viewer uses it to pick the renderer.

## Self-host Worker And WASM Assets

Most web apps can install the package and run. For intranet, strict CSP, offline, or custom static-prefix deployments, copy viewer assets into your app:

```bash
npx file-viewer-copy-assets ./public/file-viewer
```

The copy command verifies PDF, archive, DOCX, spreadsheet, Draw.io, CAD, Typst, SQLite, Worker, WASM, and vendor assets. Runtime options let you point each renderer to your own static paths.

## Try The Demo Locally

```bash
pnpm install
pnpm dev
```

The main demo opens at the Vite dev server URL. The comparison demo is available at `/compare.html`.
