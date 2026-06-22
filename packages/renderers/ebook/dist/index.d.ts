import { type FileRenderHandler, type FileViewerRenderedInstance, type FileViewerRendererPlugin, type RendererDefinition } from '@file-viewer/core';
export declare const ebookRendererDefinition: RendererDefinition;
export declare const renderFileViewerEpub: FileRenderHandler<FileViewerRenderedInstance, HTMLDivElement>;
export declare const ebookRenderer: FileViewerRendererPlugin<FileRenderHandler<FileViewerRenderedInstance, HTMLDivElement>>;
export default ebookRenderer;
