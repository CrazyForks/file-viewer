import { createApp, defineAsyncComponent } from 'vue'

const OfdViewer = defineAsyncComponent(() => import('./OfdViewer.vue'))

/**
 * 渲染 OFD 版式文件。
 *
 * OFD 解析和页面渲染依赖较多，所以这里只创建异步 Vue 组件；
 * 真正的解析器和渲染器会在 OfdViewer.vue 挂载后再动态加载。
 */
export default async function renderOfd(buffer: ArrayBuffer, target: HTMLDivElement) {
  const app = createApp({
    render: () => <OfdViewer data={buffer} />
  })
  app.mount(target)
  return app
}
