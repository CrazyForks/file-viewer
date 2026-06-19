import { ComputedRef, Ref, ShallowRef } from 'vue';
import { FileRenderExportAdapter, FileViewerOperationAvailability, FileViewerOptions, FileViewerToolbarOptions, FileViewerToolbarPosition, FileViewerZoomState } from '@file-viewer/core';
interface UseViewerToolbarOptions {
    activeExportAdapter: ShallowRef<FileRenderExportAdapter | null>;
    currentBuffer: Ref<ArrayBuffer | null>;
    currentExtend: ComputedRef<string>;
    currentFile: Ref<File | null>;
    currentSourceUrl: Ref<string | null>;
    error: Ref<string>;
    getOptions: () => FileViewerOptions | undefined;
    getZoomState: () => FileViewerZoomState;
    loading: Ref<boolean>;
    normalizedToolbar: ComputedRef<FileViewerToolbarOptions>;
    renderedReady: Ref<boolean>;
    zoomState: FileViewerZoomState;
    emitOperationAvailabilityChange: (availability: FileViewerOperationAvailability) => void;
    emitZoomChange: (state: FileViewerZoomState) => void;
}
/**
 * FileViewer 组件层的工具栏与能力状态门面。
 *
 * 按钮显隐、PDF 默认悬浮位置和能力矩阵由 `@file-viewer/core` 统一计算；
 * 这里只负责把 Vue 响应式状态、组件事件和操作 API 串起来。
 */
export declare const useViewerToolbar: ({ activeExportAdapter, currentBuffer, currentExtend, currentFile, currentSourceUrl, error, getOptions, getZoomState, loading, normalizedToolbar, renderedReady, zoomState, emitOperationAvailabilityChange, emitZoomChange }: UseViewerToolbarOptions) => {
    operationAvailability: ComputedRef<FileViewerOperationAvailability>;
    visibleToolbar: ComputedRef<FileViewerToolbarOptions>;
    showToolbar: ComputedRef<boolean>;
    toolbarPosition: ComputedRef<FileViewerToolbarPosition>;
    toolbarDisabled: ComputedRef<boolean>;
    zoomButtonDisabled: (action: keyof Pick<FileViewerZoomState, "canZoomIn" | "canZoomOut" | "canReset">) => boolean;
};
export {};
