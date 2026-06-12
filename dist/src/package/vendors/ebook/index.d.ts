/**
 * 渲染 EPUB 电子书。
 *
 * EPUB 的目录、分页和资源解析交给 epubjs；适配层只负责在命中 `.epub`
 * 时按需挂载阅读器，避免电子书依赖影响文档、图片、代码等轻量预览。
 */
export default function renderEpub(buffer: ArrayBuffer, target: HTMLDivElement): Promise<import('vue').App<Element>>;
