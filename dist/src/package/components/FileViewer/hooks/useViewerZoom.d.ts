import { Ref } from 'vue';
import { FileViewerOperationType } from '@file-viewer/core';
interface UseFileViewerZoomOptions {
    output: Ref<HTMLDivElement | null>;
    enabled: () => boolean;
    runBeforeOperation: (operation: FileViewerOperationType) => Promise<boolean>;
}
/**
 * FileViewer 组件层的缩放门面。
 *
 * provider 注册、状态读取和 MutationObserver 调度由 core controller 负责；
 * 这里只保留 Vue 响应式状态同步、操作前置钩子和组件 ref API。
 */
export declare const useViewerZoom: ({ output, enabled, runBeforeOperation }: UseFileViewerZoomOptions) => {
    hasZoomProvider(): boolean;
    refreshZoomProvider(): import('@file-viewer/core').FileViewerZoomProvider | null;
    startZoomObserver(): import('@file-viewer/core').FileViewerZoomState;
    stopZoomObserver(): import('@file-viewer/core').FileViewerZoomState;
    clearZoomProvider(): import('@file-viewer/core').FileViewerZoomState;
    getZoomState(): import('@file-viewer/core').FileViewerZoomState;
    zoomIn(): Promise<import('@file-viewer/core').FileViewerZoomState>;
    zoomOut(): Promise<import('@file-viewer/core').FileViewerZoomState>;
    resetZoom(): Promise<import('@file-viewer/core').FileViewerZoomState>;
    zoomState: {
        scale: number;
        label: string;
        canZoomIn: boolean;
        canZoomOut: boolean;
        canReset: boolean;
        minScale?: number | undefined;
        maxScale?: number | undefined;
    };
};
export {};
