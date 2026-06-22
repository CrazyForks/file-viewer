# @file-viewer/renderer-text

Standalone code, text, and Markdown renderer package for Flyfish File Viewer. It handles source highlighting, Markdown reading surfaces, and unified zoom for `.txt`, `.json`, `.ts`, `.vue`, `.log`, `.md`, `.markdown`, and other text-oriented formats.

## Usage

```ts
import FileViewer from '@file-viewer/vue3'
import { textRenderer } from '@file-viewer/renderer-text'

const options = {
  builtinRenderers: 'none',
  renderers: textRenderer,
}
```

You can also compose it with other renderers:

```ts
import { textRenderer } from '@file-viewer/renderer-text'
import { pdfRenderer } from '@file-viewer/renderer-pdf'

const options = {
  builtinRenderers: 'none',
  renderers: [pdfRenderer, textRenderer],
}
```

## Capabilities

- Code and text preview uses `highlight.js` core with per-language dynamic imports instead of registering every language up front.
- HTML, XML, Vue, and similar files are escaped and shown as source, never executed.
- Markdown uses `marked` for a read-only reading surface with dark/light theme support, table scrolling, and a unified zoom provider.
- Does not depend on any online service or public CDN, making it suitable for intranet logs, configs, snippets, README files, and knowledge-base attachments.

## Migration Note

The core package still keeps bundled code / markdown renderers for backward compatibility. A later migration will switch the core text entries to this package and remove `highlight.js` and `marked` from core direct dependencies.
