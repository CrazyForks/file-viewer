import { FileRenderContext, FileRenderHandlerRendererSession, FileViewerRenderedInstance as Rendered } from '@file-viewer/core';
export type FileViewerVueRenderSession = FileRenderHandlerRendererSession<Rendered | undefined>;
/**
 * Bridges the Vue renderer registry into the framework-neutral core renderer session.
 *
 * The Vue component package owns only the async component loaders and DOM surface; source
 * normalization, handler dispatch and session teardown stay in @file-viewer/core.
 */
export declare function createVueRenderSession(buffer: ArrayBuffer, type: string, target: HTMLDivElement, context?: FileRenderContext): Promise<FileViewerVueRenderSession>;
