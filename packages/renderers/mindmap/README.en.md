# @file-viewer/renderer-mindmap

Standalone XMind and mind map renderer package for Flyfish File Viewer. It parses modern `content.json` and classic `content.xml` XMind files, then renders an interactive canvas with pan, zoom, sheet tabs, and node navigation.

## Usage

```ts
import FileViewer from '@file-viewer/vue3'
import { mindmapRenderer } from '@file-viewer/renderer-mindmap'

const options = {
  rendererMode: 'replace',
  renderers: mindmapRenderer,
}
```

You can combine it with other renderer packages:

```ts
import { pdfRenderer } from '@file-viewer/renderer-pdf'
import { mindmapRenderer } from '@file-viewer/renderer-mindmap'

const options = {
  rendererMode: 'replace',
  renderers: [pdfRenderer, mindmapRenderer],
}
```

## Capabilities

- Supports `.xmind`.
- Supports XMind 2020+ `content.json` and XMind 8 / Classic `content.xml`.
- Supports multiple sheets, hierarchy, labels, notes, hyperlinks, image resource hints, summaries, callouts, and floating-topic states.
- Supports toolbar zoom, fit-to-canvas, Pointer / mouse / touch drag panning, requestAnimationFrame-coalesced pan updates, `Ctrl` / `Command` + wheel pointer zoom, and arrow-key panning.
- Mouse and touch panning include document-level fallback listeners for mobile WebViews, embedded browsers, and unstable Pointer Capture release behavior.

## Migration Note

The core package still keeps the bundled XMind renderer for backward compatibility. A later migration will switch the core XMind entry to this package and remove `@ljheee/xmind-parser` from core direct dependencies.
