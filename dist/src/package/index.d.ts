import { default as FileViewer } from './components/FileViewer';
import { App } from 'vue';
declare interface FileViewerInstaller {
    /**
     * 全局注册 `<file-viewer>` 组件。
     */
    install(app: App): void;
}
/**
 * Vue3 插件安装器。
 *
 * 这里顺手引入库级样式，确保宿主项目只要 `app.use(FileViewer)`，
 * 就能拿到组件渲染所需的基础样式。
 */
declare class Installer implements FileViewerInstaller {
    private installed;
    install(app: App): void;
}
declare const _default: Installer;
export default _default;
export { FileViewer };
export type { FileRef, FileRenderExportAdapter, FileRenderExportMode, FileRenderExportOptions, FileViewerAiOptions, FileViewerArchiveOptions, FileViewerBeforeOperation, FileViewerDocumentAnchor, FileViewerDocumentChunk, FileViewerLifecycleContext, FileViewerLifecycleHooks, FileViewerLifecyclePhase, FileViewerOperationAvailability, FileViewerOperationContext, FileViewerOperationType, FileViewerOptions, FileViewerPdfOptions, FileViewerSearchMatch, FileViewerSearchOptions, FileViewerSearchState, FileViewerSourceType, FileViewerToolbarOptions, FileViewerToolbarPosition, FileViewerThemeMode, FileViewerTypstOptions, FileViewerWatermarkOptions } from './common/type';
