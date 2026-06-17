import { createApp, defineAsyncComponent } from 'vue'
import type { FileRenderContext } from '@file-viewer/core'

const EmailViewer = defineAsyncComponent(() => import('./EmailViewer.vue'))

export default async function renderEmail(
  buffer: ArrayBuffer,
  target: HTMLDivElement,
  type = 'eml',
  context?: FileRenderContext
) {
  const normalizedType = type === 'msg' ? 'msg' : type === 'mbox' ? 'mbox' : 'eml'
  const app = createApp({
    render: () => (
      <EmailViewer
        data={buffer}
        type={normalizedType}
        filename={context?.filename || `message.${normalizedType}`}
        options={context?.options}
      />
    )
  })
  app.mount(target)
  return app
}
