import { FileRenderHandler, FileViewerRenderedInstance as AppWrapper } from '@file-viewer/core';
type FileHandler = FileRenderHandler<AppWrapper, HTMLDivElement>;
export declare const vueRendererRegistryBridge: import('@file-viewer/core').FileRenderHandlerRegistryResult<AppWrapper, HTMLDivElement>;
export declare const vueRendererRegistry: import('@file-viewer/core').RendererRegistry;
export declare const vueRendererDispatcher: import('@file-viewer/core').FileViewerRendererDispatcher<FileHandler>;
export declare const missingCoreRendererHandlers: string[];
declare const renders: Map<string, FileHandler>;
export default renders;
