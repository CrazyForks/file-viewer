import { FileRenderContext } from '../../../../package/common/type';
/**
 * Render Typst source documents through the browser WASM compiler/renderer stack.
 *
 * The heavy Typst runtime is kept behind this async vendor entry so normal
 * Office/PDF/image previews do not pay for the WASM compiler on first load.
 */
export default function renderTypst(buffer: ArrayBuffer, target: HTMLDivElement, _type?: string, context?: FileRenderContext): Promise<import('vue').App<Element>>;
