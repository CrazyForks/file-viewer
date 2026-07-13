# @file-viewer/preset-all

The full renderer preset for Flyfish File Viewer. It packages the current complete format matrix as an explicit preset and acts as the compatibility bridge for the 2.x on-demand renderer architecture.

## When To Use

- You want the same full-format coverage as the official demo.
- You are migrating from the historical all-in-one dependency model to on-demand renderer assembly.
- You want to start with one complete preset, then later replace it with `@file-viewer/preset-lite`, `@file-viewer/preset-office`, `@file-viewer/preset-engineering`, or narrower single-renderer combinations.

## Usage

In Vite projects, the recommended path is to let `@file-viewer/vite-plugin` discover this preset automatically:

```bash
pnpm add @file-viewer/vue3 @file-viewer/core @file-viewer/vite-plugin @file-viewer/preset-all
```

```ts
import { fileViewerRenderers } from '@file-viewer/vite-plugin'

export default {
  plugins: [
    fileViewerRenderers({
      copyAssets: true
    })
  ]
}
```

Components keep `autoRenderers:true` by default, so application code does not pass `allRenderers` manually.

Pass it directly only when you need full manual registry control:

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

This version first aggregates the extracted `@file-viewer/renderer-word`, `@file-viewer/renderer-spreadsheet`, `@file-viewer/renderer-pdf`, `@file-viewer/renderer-ofd`, `@file-viewer/renderer-presentation`, `@file-viewer/renderer-cad`, `@file-viewer/renderer-drawing`, `@file-viewer/renderer-3d`, `@file-viewer/renderer-data`, `@file-viewer/renderer-eda`, `@file-viewer/renderer-typst`, `@file-viewer/renderer-archive`, `@file-viewer/renderer-email`, `@file-viewer/renderer-epub`, `@file-viewer/renderer-text`, `@file-viewer/renderer-image`, `@file-viewer/renderer-media`, `@file-viewer/renderer-mindmap`, and `@file-viewer/renderer-geo` packages. Core now keeps only lightweight native paths and shared contracts, while this preset remains the full aggregation layer.

Use `@file-viewer/preset-lite` for lightweight attachments, `@file-viewer/preset-office` for office documents, and `@file-viewer/preset-engineering` for CAD / 3D / EDA-style engineering attachments. `preset-all` is best for the official demo, internal all-format attachment centers, or migration compatibility.

## Documentation

- On-demand renderer architecture: <https://doc.file-viewer.app/guide/on-demand-renderers>
- Supported formats: <https://doc.file-viewer.app/guide/formats>
