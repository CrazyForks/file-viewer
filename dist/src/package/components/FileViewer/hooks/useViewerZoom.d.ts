import { Ref } from 'vue';
import { FileViewerOperationType, FileViewerZoomState } from '../../../../../package/common/type';
interface UseFileViewerZoomOptions {
    output: Ref<HTMLDivElement | null>;
    enabled: () => boolean;
    runBeforeOperation: (operation: FileViewerOperationType) => Promise<boolean>;
}
/**
 * FileViewer 组件层的缩放门面。
 *
 * 通用 provider 协议放在 `src/package/use` 里供各渲染器注册；
 * 这里只负责把缩放按钮接入现有操作前置钩子和组件 ref API。
 */
export declare const useViewerZoom: ({ output, enabled, runBeforeOperation }: UseFileViewerZoomOptions) => {
    getZoomState: () => FileViewerZoomState;
    zoomState: {
        scale: number;
        label: string;
        canZoomIn: boolean;
        canZoomOut: boolean;
        canReset: boolean;
        minScale?: number | undefined;
        maxScale?: number | undefined;
    };
    hasZoomProvider: () => boolean;
    refreshZoomProvider: () => import('../../../../../package/common/type').FileViewerZoomProvider | null;
    startZoomObserver: () => void;
    stopZoomObserver: () => void;
    clearZoomProvider: () => void;
    zoomIn: () => Promise<FileViewerZoomState>;
    zoomOut: () => Promise<FileViewerZoomState>;
    resetZoom: () => Promise<FileViewerZoomState>;
};
export {};
