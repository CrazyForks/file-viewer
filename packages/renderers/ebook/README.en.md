# @file-viewer/renderer-ebook

Standalone EPUB ebook renderer package for Flyfish File Viewer. It handles `.epub` parsing, table-of-contents navigation, scrolling reading, previous/next navigation, and reading progress.

## Usage

```ts
import FileViewer from '@file-viewer/vue3'
import { ebookRenderer } from '@file-viewer/renderer-ebook'

const options = {
  builtinRenderers: 'none',
  renderers: ebookRenderer,
}
```

You can also compose it with other renderers:

```ts
import { ebookRenderer } from '@file-viewer/renderer-ebook'
import { pdfRenderer } from '@file-viewer/renderer-pdf'
import { archiveRenderer } from '@file-viewer/renderer-archive'

const options = {
  builtinRenderers: 'none',
  renderers: [pdfRenderer, archiveRenderer, ebookRenderer],
}
```

## Capabilities

- Parses `.epub` packages, OPF metadata, navigation, and chapter resources with `epubjs`.
- Uses scrolling reading mode for compatibility, avoiding blank content in browsers that struggle with very wide paginated EPUB layouts.
- Supports TOC visibility, chapter jumping, previous/next navigation, and reading progress.
- Does not depend on any online service or public CDN, making it suitable for intranet knowledge bases, training materials, and long-form attachment preview.

## Migration Note

The core package no longer bundles the EPUB renderer and no longer installs `epubjs` directly. Install this renderer explicitly, or use `@file-viewer/preset-all`, when EPUB preview is required.
