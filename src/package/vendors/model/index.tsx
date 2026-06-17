import { createApp, defineAsyncComponent } from 'vue'
import type { FileRenderContext } from '@file-viewer/core'
export { MODEL_EXTENSIONS } from './shared'

const ModelViewer = defineAsyncComponent(() => import('./ModelViewer.vue'))

export default async function renderModel(
  buffer: ArrayBuffer,
  target: HTMLDivElement,
  type?: string,
  context?: FileRenderContext
) {
  const app = createApp({
    render: () => <ModelViewer data={buffer} type={type || 'glb'} sourceUrl={context?.url} />
  })
  app.mount(target)
  return app
}
