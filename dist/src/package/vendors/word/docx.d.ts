import { AppWrapper, FileRenderContext } from '../../../../package/common/type';
/**
 * 渲染docx文件
 */
export default function (buffer: ArrayBuffer, target: HTMLDivElement, context?: FileRenderContext): Promise<AppWrapper>;
