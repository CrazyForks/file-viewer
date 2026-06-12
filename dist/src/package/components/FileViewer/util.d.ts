import { FileRenderContext } from '../../../../package/common/type';
export declare function getExtend(name: string): string;
export declare function render(buffer: ArrayBuffer, type: string, target: HTMLDivElement, context?: FileRenderContext): Promise<import('../../../../package/common/type').Rendered | undefined>;
