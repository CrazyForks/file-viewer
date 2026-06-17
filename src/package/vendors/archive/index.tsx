import { createApp, defineAsyncComponent } from 'vue'
import type { FileRenderContext } from '@file-viewer/core'

const ArchiveViewer = defineAsyncComponent(() => import('./ArchiveViewer.vue'))

export { ARCHIVE_EXTENSIONS } from './shared'

export default async function renderArchive(buffer: ArrayBuffer, target: HTMLDivElement, context?: FileRenderContext) {
  const app = createApp({
    render: () => (
      <ArchiveViewer
        data={buffer}
        filename={context?.filename || 'archive.bin'}
        options={context?.options?.archive}
      />
    )
  })
  app.mount(target)
  return app
}
