import { FileRenderContext } from '../../../../package/common/type';
/**
 * 渲染 CAD 图纸。
 *
 * @flyfish-dev/cad-viewer 提供 DWG / DXF / DWF / DWFx / XPS 纯前端预览。
 * DWG 解析依赖按需加载的 LibreDWG WASM 与独立 Worker，DWF 系列走 native renderer。
 */
export default function renderCad(buffer: ArrayBuffer, target: HTMLDivElement, type?: string, context?: FileRenderContext): Promise<import('vue').App<Element>>;
