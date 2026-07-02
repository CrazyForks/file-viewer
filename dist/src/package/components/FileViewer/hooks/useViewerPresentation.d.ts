import { ComputedRef, Ref } from 'vue';
import { FileViewerStateTheme, FileViewerFileRef as FileRef, FileViewerOptions } from '@file-viewer/core';
interface UseViewerPresentationOptions {
    filename: Ref<string>;
    getFile: () => FileRef | undefined;
    getUrl: () => string | undefined;
    getSourceFilename?: () => string | undefined;
    getOptions: () => FileViewerOptions | undefined;
}
interface UseViewerErrorStateOptions {
    currentExtend: ComputedRef<string>;
    error: ComputedRef<string>;
    loadingTheme: ComputedRef<FileViewerStateTheme>;
    getOptions: () => FileViewerOptions | undefined;
}
/**
 * FileViewer 组件层的展示派生状态门面。
 *
 * 文件名、扩展名、主题和工具栏默认值仍由 core 规则决定；
 * 这里仅把 Vue props/ref 组合成模板和其他 hooks 需要的响应式状态。
 */
export declare const useViewerPresentation: ({ filename, getFile, getUrl, getSourceFilename, getOptions }: UseViewerPresentationOptions) => {
    displayFilename: ComputedRef<string>;
    currentExtend: ComputedRef<string>;
    normalizedToolbar: ComputedRef<import('@file-viewer/core').FileViewerToolbarOptions>;
    viewerTheme: ComputedRef<import('@file-viewer/core').FileViewerThemeMode>;
    formatErrorMessage: import('@file-viewer/core').FileViewerErrorMessageFormatter;
};
export declare const useViewerErrorState: ({ currentExtend, error, loadingTheme, getOptions }: UseViewerErrorStateOptions) => ComputedRef<import('@file-viewer/core').FileViewerStateDescriptor>;
export {};
