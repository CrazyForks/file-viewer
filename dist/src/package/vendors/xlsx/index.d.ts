import { App } from 'vue';
import { FileRenderContext } from '../../../../package/common/type';
/**
 * 渲染excel
 */
export default function render(buffer: ArrayBuffer, target: HTMLDivElement, type?: string, context?: FileRenderContext): Promise<App>;
