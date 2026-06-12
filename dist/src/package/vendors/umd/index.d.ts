/**
 * 渲染 UMD 电子书。
 *
 * UMD 没有可靠维护的前端阅读库，这里只在命中 `.umd` 时按需挂载
 * 自研解析器；zlib 正文段交给成熟的 pako 解压，结构解析保持在本格式链路内。
 */
export default function renderUmd(buffer: ArrayBuffer, target: HTMLDivElement): Promise<import('vue').App<Element>>;
