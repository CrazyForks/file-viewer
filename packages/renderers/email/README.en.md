# @file-viewer/renderer-email

Standalone email renderer package for Flyfish File Viewer. It handles `.eml`, `.msg`, and `.mbox` previews, body/header switching, attachment download, and nested attachment previews.

## Usage

```ts
import FileViewer from '@file-viewer/vue3'
import { emailRenderer } from '@file-viewer/renderer-email'

const options = {
  builtinRenderers: 'none',
  renderers: emailRenderer,
}
```

You can also compose it with other renderers:

```ts
import { emailRenderer } from '@file-viewer/renderer-email'
import { pdfRenderer } from '@file-viewer/renderer-pdf'
import { archiveRenderer } from '@file-viewer/renderer-archive'

const options = {
  builtinRenderers: 'none',
  renderers: [pdfRenderer, archiveRenderer, emailRenderer],
}
```

## Capabilities

- Parses `.eml` and `.mbox` with `postal-mime`.
- Parses Outlook `.msg` with `@kenjiuno/msgreader`.
- Supports HTML body, plain-text body, and raw header switching. HTML email is rendered read-only inside a sandbox iframe.
- Supports attachment download and nested preview through `renderNestedBuffer` when the host viewer provides it.
- Does not depend on any online service or public CDN, making it suitable for intranet attachment centers, ticket email archives, and customer communication review.

## Migration Note

The core package still keeps the bundled email renderer for backward compatibility. A later migration will switch the core email entry to this package and remove `postal-mime`, `@kenjiuno/msgreader`, and related parser dependencies from core direct dependencies.
