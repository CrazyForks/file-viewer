import { createApp, defineAsyncComponent } from 'vue'

const PptxRender = defineAsyncComponent(() => import('./PptxRender.vue'))

/**
 * pptx渲染逻辑，使用vue组件，重构自pptxjs，感谢大神让我站在巨人的肩膀上
 * @param buffer 二进制数据
 * @param target 目标
 */
export default async function renderPptx(buffer: ArrayBuffer, target: HTMLDivElement, type?: string) {
  return createApp({
    render: () => <PptxRender data={buffer} type={type} />
  }).mount(target)
}
