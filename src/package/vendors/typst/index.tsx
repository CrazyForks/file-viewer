import { readFileViewerText as readText } from '@file-viewer/core'
import { createApp, defineAsyncComponent } from 'vue'
import type { FileRenderContext } from '@file-viewer/core'

const TypstViewer = defineAsyncComponent(() => import('./TypstViewer.vue'))

/**
 * Render Typst source documents through the browser WASM compiler/renderer stack.
 *
 * The heavy Typst runtime is kept behind this async vendor entry so normal
 * Office/PDF/image previews do not pay for the WASM compiler on first load.
 */
export default async function renderTypst(
  buffer: ArrayBuffer,
  target: HTMLDivElement,
  _type?: string,
  context?: FileRenderContext
) {
  const source = await readText(buffer)
  const app = createApp({
    render: () => (
      <TypstViewer
        source={source}
        filename={context?.filename}
        compilerWasmUrl={context?.options?.typst?.compilerWasmUrl}
        exportAdapter={context?.registerExportAdapter}
      />
    )
  })
  app.mount(target)
  return app
}
