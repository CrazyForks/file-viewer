import { createApp, defineAsyncComponent } from 'vue'
import type { FileRenderContext } from '@file-viewer/core'

const EdaViewer = defineAsyncComponent(() => import('./EdaViewer.vue'))

export default async function renderEda(
  buffer: ArrayBuffer,
  target: HTMLDivElement,
  type = 'olb',
  context?: FileRenderContext
) {
  const normalizedType = type === 'dra' ? 'dra' : 'olb'
  const app = createApp({
    render: () => (
      <EdaViewer
        data={buffer}
        type={normalizedType}
        filename={context?.filename || `preview.${normalizedType}`}
      />
    )
  })
  app.mount(target)
  return app
}
