/**
 * 渲染 OFD 版式文件。
 *
 * OFD 解析和页面渲染依赖较多，所以这里只创建异步 Vue 组件；
 * 真正的解析器和渲染器会在 OfdViewer.vue 挂载后再动态加载。
 */
export default function renderOfd(buffer: ArrayBuffer, target: HTMLDivElement): Promise<import('vue').App<Element>>;
