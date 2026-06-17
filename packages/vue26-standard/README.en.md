# @file-viewer/vue2.6

The standard Vue 2.6 wrapper for Flyfish File Viewer. It supports both `Vue.use()` plugin installation and local component registration. It does not depend on the Vue 2.7 Composition API. Internally it reuses the `@file-viewer/web` iframe protocol, the shared `@file-viewer/core` runtime, and the same production viewer assets.

```bash
npm install vue@2.6 @file-viewer/vue2.6 @file-viewer/web
```

## Global Installation

```ts
import Vue from 'vue'
import FileViewerPlugin from '@file-viewer/vue2.6'

Vue.use(FileViewerPlugin)
```

```vue
<template>
  <section style="height: 100vh">
    <FileViewer
      ref="viewer"
      url="/example/demo.pdf"
      :options="{
        theme: 'light',
        toolbar: { position: 'bottom-right' }
      }"
      @viewer-event="handleViewerEvent"
    />
  </section>
</template>
```

The default viewer entry is `/file-viewer/index.html`. Copy the viewer assets into your public directory with the command provided by `@file-viewer/web`:

```bash
npx file-viewer-copy-assets ./public/file-viewer
```

## Local Component

```ts
import { FileViewer } from '@file-viewer/vue2.6'

export default {
  components: { FileViewer }
}
```

## Instance Methods

```ts
const viewer = this.$refs.viewer
viewer.reload()
viewer.postFile()
viewer.update({ url: '/example/report.docx' })
viewer.destroy()
```

Use `@file-viewer/vue2.7` for Vue 2.7 projects. Use this package when your application is still on Vue 2.6.

## Capabilities

`@file-viewer/vue2.6` shares the same `@file-viewer/core` capabilities and baseline viewer as the pure web and Vue 3 wrappers, including PDF, Word, Excel, PowerPoint, OFD, CAD/DWG/DXF/DWF, EPUB/UMD, archives, email, Markdown, highlighted code, images, audio, video, 3D models, geospatial files, and structured data assets.

See the official documentation for the full format matrix, options, lifecycle hooks, beforeOperation, theme, watermark, search, zoom, print, and export APIs: https://doc.flyfish.dev/

Chinese README: [README.md](./README.md).
