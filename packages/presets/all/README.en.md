# @file-viewer/preset-all

The full renderer preset for Flyfish File Viewer. It packages the current complete format matrix as an explicit preset and acts as the compatibility bridge for the 2.x on-demand renderer architecture.

## When To Use

- You want the same full-format coverage as the official demo.
- You are migrating from the historical all-in-one dependency model to on-demand renderer assembly.
- You want to start with one preset, then later replace it with narrower combinations such as `preset-lite`, `preset-office`, `renderer-pdf`, or `renderer-cad`.

## Usage

```ts
import FileViewer from '@file-viewer/vue3'
import { allRenderers } from '@file-viewer/preset-all'

const options = {
  renderers: allRenderers,
}
```

Use replace mode when the viewer should only install renderers from this preset:

```ts
const options = {
  rendererMode: 'replace',
  renderers: allRenderers,
}
```

This version first aggregates the extracted `@file-viewer/renderer-pdf`, `@file-viewer/renderer-cad`, `@file-viewer/renderer-typst`, `@file-viewer/renderer-archive`, `@file-viewer/renderer-email`, `@file-viewer/renderer-ebook`, `@file-viewer/renderer-text`, and `@file-viewer/renderer-mindmap` packages. Renderers that have not been split out yet are still filled in by `@file-viewer/core` for compatibility. As Office, OFD, drawing, 3D, Geo, EDA, media, image, and data-asset renderers move out, this preset remains the full aggregation layer.

## Documentation

- On-demand renderer architecture: <https://doc.file-viewer.app/guide/on-demand-renderers>
- Supported formats: <https://doc.file-viewer.app/guide/formats>
