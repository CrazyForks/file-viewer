import { type FileRenderHandler, type FileViewerRenderedInstance, type FileViewerRendererPlugin, type RendererDefinition } from '@file-viewer/core';
export declare const archiveRendererDefinition: RendererDefinition;
export declare const renderFileViewerArchive: FileRenderHandler<FileViewerRenderedInstance, HTMLDivElement>;
export declare const archiveRenderer: FileViewerRendererPlugin<FileRenderHandler<FileViewerRenderedInstance, HTMLDivElement>>;
export default archiveRenderer;
