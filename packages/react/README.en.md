# @flyfish-group/file-viewer-react

Private-deploy React integration for Flyfish Viewer. The component uses the shared `@flyfish-group/file-viewer-web` iframe facade; the web package carries the Vue 3 baseline viewer assets and centralizes the underlying core protocol. New integrations should prefer the standard package name `@file-viewer/react`; this historical package remains synchronized for compatibility.

```bash
npm install @flyfish-group/file-viewer-react @flyfish-group/file-viewer-web
```

```tsx
import FileViewer from '@flyfish-group/file-viewer-react'

export function Preview() {
  return (
    <div style={{ height: '100vh' }}>
      <FileViewer
        url="/files/demo.docx"
        options={{
          theme: 'light',
          toolbar: { position: 'bottom-right' }
        }}
        onViewerEvent={(event) => {
          console.log(event.type, event.event, event.payload)
        }}
      />
    </div>
  )
}
```

The default viewer entry is `/file-viewer/index.html`. If pnpm blocks the web package postinstall script, run:

```bash
pnpm approve-builds
pnpm exec file-viewer-copy-assets ./public/file-viewer
```

For authenticated files, download the file in your host application first and pass a `Blob` plus a filename:

```tsx
<FileViewer file={blob} name="contract.pdf" />
```

Official documentation: https://doc.flyfish.dev/

Online demo: https://viewer.flyfish.dev/

License: Apache-2.0. For second development or commercial use, keep clear Flyfish Viewer attribution and contribute shared compatibility improvements where possible.
