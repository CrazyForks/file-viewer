# @flyfish-group/file-viewer-web

Private-deploy pure web integration for Flyfish Viewer. The package carries the Vue 3 baseline viewer assets and the framework-neutral iframe helper. New integrations should prefer the standard package name `@file-viewer/web`; this historical package remains synchronized for compatibility.

```bash
npm install @flyfish-group/file-viewer-web
```

The package installs the `file-viewer-copy-assets` command. Copy the complete viewer directory into your public static directory before using the helper:

```bash
npx file-viewer-copy-assets ./public/file-viewer
```

The copy command writes `flyfish-viewer-assets.json` into the target directory and validates public worker/WASM files against the renderer asset manifest exported by `@file-viewer/core`. This catches missing archive or CAD deployment assets before users open a document.

```ts
import { mountViewerFrame } from '@flyfish-group/file-viewer-web'

mountViewerFrame(document.getElementById('viewer')!, {
  viewerUrl: '/file-viewer/index.html',
  url: '/files/demo.pdf',
  options: {
    theme: 'light',
    toolbar: { position: 'bottom-right' }
  },
  onEvent(event) {
    console.log(event.type, event.event, event.payload)
  }
})
```

For authenticated files, download the file in your host application first and pass a `Blob` plus a filename:

```ts
const blob = await fetch('/api/files/contract', { credentials: 'include' }).then(res => res.blob())

mountViewerFrame(document.getElementById('viewer')!, {
  file: blob,
  name: 'contract.pdf'
})
```

pnpm 10 may block dependency postinstall scripts. If you see `Ignored build scripts: @flyfish-group/file-viewer-web`, run `pnpm approve-builds` and allow this package, or run `pnpm exec file-viewer-copy-assets ./public/file-viewer` manually.

Official documentation: https://doc.flyfish.dev/

Online demo: https://viewer.flyfish.dev/

License: Apache-2.0. For second development or commercial use, keep clear Flyfish Viewer attribution and contribute shared compatibility improvements where possible.
