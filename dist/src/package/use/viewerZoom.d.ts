import { Ref } from 'vue';
import { FileViewerZoomProvider, FileViewerZoomState } from '../../../package/common/type';
export declare const createFileViewerZoomState: (patch?: Partial<FileViewerZoomState>) => FileViewerZoomState;
export declare const registerFileViewerZoomProvider: (host: HTMLElement, provider: FileViewerZoomProvider) => void;
export declare const unregisterFileViewerZoomProvider: (host: HTMLElement | null | undefined) => void;
export declare const findFileViewerZoomProvider: (root: HTMLElement | null | undefined) => FileViewerZoomProvider | null;
export declare const createZoomChangeEmitter: () => {
    emit(): void;
    subscribe(listener: () => void): () => void;
};
interface UseViewerZoomOptions {
    root: Ref<HTMLElement | null>;
    enabled?: () => boolean;
    beforeZoom?: (operation: 'zoom-in' | 'zoom-out' | 'zoom-reset') => Promise<boolean> | boolean;
}
/**
 * FileViewer 内部的统一缩放门面。
 *
 * 这里只寻找并调用当前渲染器注册的 provider，不做通用 CSS 缩放兜底。
 * 这样可以确保虚拟表格、PDF 文本层、CAD canvas 等交互坐标仍由各自渲染器掌控。
 */
export declare const useViewerZoom: ({ root, enabled, beforeZoom }: UseViewerZoomOptions) => {
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
    refreshZoomProvider: () => FileViewerZoomProvider | null;
    startZoomObserver: () => void;
    stopZoomObserver: () => void;
    clearZoomProvider: () => void;
    getZoomState: () => FileViewerZoomState;
    zoomIn: () => Promise<FileViewerZoomState>;
    zoomOut: () => Promise<FileViewerZoomState>;
    resetZoom: () => Promise<FileViewerZoomState>;
};
export {};
