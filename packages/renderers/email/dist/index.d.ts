import { type FileRenderHandler, type FileViewerRenderedInstance, type FileViewerRendererPlugin, type RendererDefinition } from '@file-viewer/core';
export declare const emailRendererDefinition: RendererDefinition;
export declare const renderFileViewerEmail: FileRenderHandler<FileViewerRenderedInstance, HTMLDivElement>;
export declare const emailRenderer: FileViewerRendererPlugin<FileRenderHandler<FileViewerRenderedInstance, HTMLDivElement>>;
export default emailRenderer;
