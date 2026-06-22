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

This version first aggregates the extracted `@file-viewer/renderer-word`, `@file-viewer/renderer-pdf`, `@file-viewer/renderer-ofd`, `@file-viewer/renderer-presentation`, `@file-viewer/renderer-cad`, `@file-viewer/renderer-drawing`, `@file-viewer/renderer-3d`, `@file-viewer/renderer-data`, `@file-viewer/renderer-eda`, `@file-viewer/renderer-typst`, `@file-viewer/renderer-archive`, `@file-viewer/renderer-email`, `@file-viewer/renderer-ebook`, `@file-viewer/renderer-text`, `@file-viewer/renderer-image`, `@file-viewer/renderer-media`, `@file-viewer/renderer-mindmap`, and `@file-viewer/renderer-geo` packages. Renderers that have not been split out yet are still filled in by `@file-viewer/core` for compatibility. As the remaining Excel and Office-compatible paths move out, this preset remains the full aggregation layer.

## Documentation

- On-demand renderer architecture: <https://doc.file-viewer.app/guide/on-demand-renderers>
- Supported formats: <https://doc.file-viewer.app/guide/formats>
