import { createApp, defineAsyncComponent } from 'vue'
import type { FileRenderContext } from '@file-viewer/core'

const PdfView = defineAsyncComponent(() => import('./PdfView.vue'))
export default async function renderPdf(buffer: ArrayBuffer, target: HTMLDivElement, context?: FileRenderContext) {
  const app = createApp({
    render: () => (
      <PdfView
        data={buffer.byteLength ? buffer : undefined}
        url={context?.streamUrl}
        exportAdapter={context?.registerExportAdapter}
        options={context?.options?.pdf}
      />
    )
  })
  app.mount(target)
  return app
}
