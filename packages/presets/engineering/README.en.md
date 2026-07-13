# @file-viewer/preset-engineering

The engineering renderer preset for Flyfish File Viewer. It targets professional attachment workflows such as CAD, 3D models, Draw.io / Excalidraw / Mermaid / PlantUML, XMind, geospatial files, Typst, EDA, archives, and structured data assets.

## When To Use

- Your product focuses on R&D, manufacturing, design review, engineering delivery, EDA triage, or technical documentation.
- You need CAD / 3D / drawing / geospatial / EDA preview lines without installing the complete official demo renderer matrix.
- You want WASM, Worker, and vendor assets to keep using the shared manifest and `@file-viewer/vite-plugin` self-hosting flow.

## Usage

The recommended path is to use it with `@file-viewer/vite-plugin`. Once this preset is installed, the plugin discovers and activates engineering-file capability automatically:

```ts
fileViewerRenderers({
  copyAssets: true
})
```

Components keep `autoRenderers:true` by default, so application code does not pass `renderers` manually. Pass the preset directly only when you need full manual registry control:

```ts
import FileViewer from '@file-viewer/vue3'
import { engineeringRenderers } from '@file-viewer/preset-engineering'

const options = {
  builtinRenderers: 'none',
  rendererMode: 'replace',
  renderers: engineeringRenderers,
}
```

## Included Renderers

- `@file-viewer/renderer-cad`
- `@file-viewer/renderer-3d`
- `@file-viewer/renderer-drawing`
- `@file-viewer/renderer-mindmap`
- `@file-viewer/renderer-geo`
- `@file-viewer/renderer-typst`
- `@file-viewer/renderer-archive`
- `@file-viewer/renderer-data`
- `@file-viewer/renderer-eda`

## Documentation

- On-demand renderer architecture: <https://doc.file-viewer.app/guide/on-demand-renderers>
- Supported formats: <https://doc.file-viewer.app/guide/formats>
