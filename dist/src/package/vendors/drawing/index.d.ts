/**
 * 渲染绘图类文件。
 *
 * Excalidraw 走官方 `@excalidraw/excalidraw` 导出能力，
 * draw.io 走官方 diagrams.net GraphViewer。适配层只负责按需加载和挂载容器。
 */
export default function renderDrawing(buffer: ArrayBuffer, target: HTMLDivElement, type?: string): Promise<import('vue').App<Element>>;
