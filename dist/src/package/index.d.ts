import { default as FileViewer } from './components/FileViewer';
import { App } from 'vue';
import { FileViewerExpose } from './common/type';
declare interface FileViewerInstaller {
    /**
     * 全局注册 `<file-viewer>` 组件。
     */
    install(app: App, options?: FileViewerVue3PluginOptions): void;
}
export interface FileViewerVue3PluginOptions {
    componentName?: string;
}
export type FileViewerVue3Handle = FileViewerExpose;
/**
 * Vue3 插件安装器。
 *
 * 这里顺手引入库级样式，确保宿主项目只要 `app.use(FileViewer)`，
 * 就能拿到组件渲染所需的基础样式。
 */
declare class Installer implements FileViewerInstaller {
    private installed;
    install(app: App, options?: FileViewerVue3PluginOptions): void;
}
declare const _default: Installer;
export default _default;
export { FileViewer };
export { createFlyfishFileViewer, mountFlyfishFileViewer } from './native';
export type { CreateFlyfishFileViewerOptions, FlyfishFileViewerNativeController, FlyfishFileViewerNativeSource } from './native';
export type { FileRef, ViewerAiOptions, ViewerApplyViewStateOptions, ViewerArchiveOptions, ViewerCadOptions, ViewerController, ViewerControllerAccessor, ViewerControllerHandle, ViewerDocxOptions, ViewerEvent, ViewerEventHandler, ViewerEventType, ViewerFetchFile, ViewerFetchInput, ViewerMountOptions, ViewerOptions, ViewerPdfOptions, ViewerSpreadsheetOptions, ViewerCoreOptions, ViewerSearchOptions, ViewerSourceInput, ViewerThemeMode, ViewerToolbarOptions, ViewerToolbarPosition, ViewerTypstOptions, ViewerViewState, ViewerWatermarkOptions, ViewerLifecycleContext, ViewerOperationContext, ViewerState, ViewerStateListener, } from './controller';
export type { FileRenderContext, FileRenderExportAdapter, FileRenderExportMode, FileRenderExportOptions, FileViewerAiOptions, FileViewerApplyViewStateOptions, FileViewerArchiveOptions, FileViewerBeforeOperation, FileViewerCadDwfLineWeightMode, FileViewerCadOptions, FileViewerCadRenderer, FileViewerDocxOptions, FileViewerDocumentAnchor, FileViewerDocumentChunk, FileViewerEmits, FileViewerEventMap, FileViewerExpose, FileViewerLifecycleContext, FileViewerLifecycleHooks, FileViewerLifecyclePhase, FileViewerOperationAvailability, FileViewerOperationContext, FileViewerOperationType, FileViewerOptions, FileViewerPdfOptions, FileViewerSpreadsheetOptions, FileViewerProps, FileViewerSearchMatch, FileViewerSearchOptions, FileViewerSearchProvider, FileViewerSearchState, FileViewerSourceType, FileViewerToolbarOptions, FileViewerToolbarPosition, FileViewerThemeMode, FileViewerTypstOptions, FileViewerViewScrollState, FileViewerViewState, FileViewerViewStateChange, FileViewerViewStateChangeAction, FileViewerViewStateChangeSource, FileViewerViewStateProvider, FileViewerWatermarkOptions, FileViewerZoomProvider, FileViewerZoomState } from './common/type';
