import { FileRenderContext } from '../../common/type';
export declare const MODEL_EXTENSIONS: string[];
export default function renderModel(buffer: ArrayBuffer, target: HTMLDivElement, type?: string, context?: FileRenderContext): Promise<import('vue').App<Element>>;
