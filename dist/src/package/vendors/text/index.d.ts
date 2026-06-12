/**
 * 渲染文本和代码。
 *
 * 这里刻意把 CodeViewer 做成异步组件，让 highlight.js 只在命中代码/文本格式时加载；
 * HTML/XML 等源码会被当作字符串高亮，不会以真实 DOM 执行。
 * @param buffer 文本二进制内容
 * @param target 目标
 * @param type 文件扩展名，用于选择 highlight.js 语言
 */
export default function renderText(buffer: ArrayBuffer, target: HTMLDivElement, type?: string): Promise<import('vue').App<Element>>;
