import type { App } from 'vue'
import { createApp, defineAsyncComponent } from 'vue'
import type { FileRenderContext } from '@file-viewer/core'

// 导入异步组件
const XlsxTable = defineAsyncComponent(() => import('./XlsxTable.vue'))
/**
 * 渲染excel
 */
export default async function render(buffer: ArrayBuffer, target: HTMLDivElement, type?: string, context?: FileRenderContext): Promise<App> {
  // Excel 使用 canvas 虚拟表格按窗口渲染，直接打印或克隆 DOM 导出 HTML 会丢失未进入视口的内容。
  context?.registerExportAdapter?.({
    print: false,
    exportHtml: false
  })

  const app = createApp({
    render: () => <XlsxTable data={buffer} />
  })
  app.mount(target)
  return app
}
