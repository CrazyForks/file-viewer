# @file-viewer/preset-lite

The lite renderer preset for Flyfish File Viewer. It is designed for Markdown, code, text, image, audio, and video preview without installing heavy Office, PDF, CAD, Typst, 3D, or archive pipelines by default.

## When To Use

- You need a ready-to-use but very small attachment preview setup.
- Your product mainly handles README files, logs, configuration files, screenshots, images, audio, and video.
- You plan to add `@file-viewer/renderer-pdf`, `@file-viewer/renderer-word`, or other professional renderers only when a product line needs them.

## Usage

The recommended path is to use it with `@file-viewer/vite-plugin`. Once this preset is installed, the plugin discovers and activates lightweight attachment capability automatically:

```ts
fileViewerRenderers({
  copyAssets: true
})
```

Components keep `autoRenderers:true` by default, so application code does not pass `renderers` manually. Pass the preset directly only when you need full manual registry control:

```ts
import FileViewer from '@file-viewer/vue3'
import { liteRenderers } from '@file-viewer/preset-lite'

const options = {
  builtinRenderers: 'none',
  rendererMode: 'replace',
  renderers: liteRenderers,
}
```

## Included Renderers

- `@file-viewer/renderer-text`
- `@file-viewer/renderer-image`
- `@file-viewer/renderer-media`

## Documentation

- On-demand renderer architecture: <https://doc.file-viewer.app/guide/on-demand-renderers>
- Supported formats: <https://doc.file-viewer.app/guide/formats>
