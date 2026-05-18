import { createApp, defineAsyncComponent } from 'vue'

const CadViewer = defineAsyncComponent(() => import('./CadViewer.vue'))

/**
 * 渲染 CAD 图纸。
 *
 * 当前内置 MIT 协议的 @cadview/core，提供 DXF 解析、Canvas 渲染、平移缩放和测量能力。
 * DWG 属于专有格式，开源纯前端转换器通常带 GPL 约束，因此这里不默认打进组件库。
 */
export default async function renderCad(buffer: ArrayBuffer, target: HTMLDivElement, type?: string) {
  const app = createApp({
    render: () => <CadViewer data={buffer} type={type || 'dxf'} />
  })
  app.mount(target)
  return app
}
