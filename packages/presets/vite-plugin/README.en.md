# @file-viewer/vite-plugin

Vite plugin for Flyfish File Viewer on-demand renderer assembly. It can auto-discover installed `@file-viewer/preset-*` packages and inject them into the page, so Vue, React, Svelte, jQuery, and Vanilla JS components receive matching preview capability without application code passing `renderers` manually. It can also generate `virtual:file-viewer-renderers` from declared formats, import only matching renderer packages, and provide renderer-oriented chunk planning plus offline worker/WASM/font asset copying.

## Install

```bash
pnpm add @file-viewer/vue3 @file-viewer/vite-plugin @file-viewer/renderer-pdf
```

Install additional renderer packages when you need more formats, such as `@file-viewer/renderer-word`, `@file-viewer/renderer-ofd`, `@file-viewer/renderer-presentation`, `@file-viewer/renderer-cad`, `@file-viewer/renderer-drawing`, `@file-viewer/renderer-3d`, `@file-viewer/renderer-data`, `@file-viewer/renderer-eda`, `@file-viewer/renderer-typst`, `@file-viewer/renderer-archive`, or `@file-viewer/renderer-text`.

When you want one package for a common product shape, install a preset:

```bash
pnpm add @file-viewer/vue3 @file-viewer/vite-plugin @file-viewer/preset-office
```

Available presets:

- `@file-viewer/preset-lite`: text, Markdown, code, image, audio, and video.
- `@file-viewer/preset-office`: PDF, Word, Excel, PowerPoint, OFD, RTF, and OpenDocument.
- `@file-viewer/preset-engineering`: CAD, 3D, drawing, XMind, Geo, Typst, Archive, Data, and EDA.
- `@file-viewer/preset-all`: the complete official demo format matrix.

## vite.config.ts

```ts
import { defineConfig } from 'vite'
import { fileViewerRenderers } from '@file-viewer/vite-plugin'

export default defineConfig({
  plugins: [
    fileViewerRenderers({
      formats: ['pdf', 'dwg', 'typst', 'zip', 'xmind'],
      scan: true,
      copyAssets: true,
      chunkStrategy: 'renderer'
    })
  ]
})
```

Or use one preset package:

```ts
fileViewerRenderers({
  preset: 'office',
  copyAssets: true
})
```

`inject` is enabled by default. The plugin injects `virtual:file-viewer-renderers` into Vite HTML entrypoints, preset imports register themselves in core, and framework components consume them through `autoRenderers`.

```ts
const options = {
  // Defaults to true; set false when a product needs total manual control.
  autoRenderers: true
}
```

For strict registry control, disable injection and pass the virtual module explicitly:

```ts
fileViewerRenderers({
  preset: 'office',
  inject: false,
  copyAssets: true
})
```

```ts
import { configuredFileViewerRenderers } from 'virtual:file-viewer-renderers'

const options = {
  rendererMode: 'replace',
  renderers: configuredFileViewerRenderers
}
```

You can also use `preset: 'auto'` to discover installed preset packages. When `preset-all` is installed, it wins to avoid importing narrower presets twice.

`scan: true` inspects common source folders for lightweight hints and merges them with `formats`:

```ts
export const fileViewerFormats = ['pdf', 'docx', 'xlsx']
```

```html
<input accept=".pdf,.docx" data-file-viewer-formats="dwg,xmind" />
```

This is useful when upload accept lists, sample matrices, or attachment allow-lists already live in source code: dev and production builds can generate the renderer assembly module without a second hand-written import list.

## Missing Renderer Guidance

When a file extension is in the supported matrix but the current project has not assembled its renderer, core now shows an install-oriented “renderer assembly required” state with the recommended preset / renderer package. For example, `.pdf` points to `@file-viewer/preset-office` or `@file-viewer/renderer-pdf`. Only truly unknown extensions show an unsupported-format state.

## Current Boundary

The plugin currently generates imports for extracted renderer packages: Word, Spreadsheet, PDF, OFD, Presentation, CAD, Draw.io/Excalidraw/Mermaid/PlantUML, 3D, Data, EDA, Typst, archives, email, EPUB, code/Markdown/Patch/Git Bundle, image, media, XMind, and Geo. Declare them explicitly with `formats`, or let `scan: true` discover source hints automatically; core-supported extensions such as `.zipx`, `.cbz`, `.tiff`, `.mjs`, `.gv`, `.patch`, `.bundle`, `.mermaid`, `.puml`, and `.mpeg` also resolve to their renderer packages. With `copyAssets:true`, the plugin also copies the Typst compiler / renderer WASM files and the `wasm/typst/fonts/` default-font directory. `preset: 'auto' | 'lite' | 'office' | 'engineering' | 'all'` imports matching `@file-viewer/preset-*` packages; when `formats` are also present, the plugin adds extra renderers outside the preset.

## Documentation

- On-demand renderer architecture: <https://doc.file-viewer.app/guide/on-demand-renderers>
- Supported formats: <https://doc.file-viewer.app/guide/formats>
