import { FileRenderContext, FileViewerRenderedInstance as Rendered } from '@file-viewer/core';
/**
 * 压缩包内文件和邮件附件的嵌套预览入口。
 *
 * 主预览器和附件预览共享 core dispatcher。Vue3 标准组件包 不再持有格式专属
 * vendor，所有类型统一交给 framework-neutral core renderer。
 */
export declare const renderNestedBuffer: (buffer: ArrayBuffer, type: string, target: HTMLDivElement, context?: FileRenderContext) => Promise<Rendered>;
