import { Ref } from 'vue';
import { FileRenderExportAdapter, FileViewerLifecycleContext, FileViewerOptions } from '@file-viewer/core';
import { FileViewerVueRenderSession } from '../rendererBridge';
interface UseViewerRenderSurfaceOptions {
    output: Ref<HTMLDivElement | null>;
    getOptions: () => FileViewerOptions | undefined;
    isCurrentRequest: (version: number) => boolean;
    notifyActiveUnloadStart: (reason?: FileViewerLifecycleContext['reason']) => FileViewerLifecycleContext | null;
    notifyActiveUnloadComplete: (context: FileViewerLifecycleContext | null, reason?: FileViewerLifecycleContext['reason']) => void;
    clearActiveDocumentContext: () => void;
    clearDocumentState: () => void;
    refreshDocumentIndex: () => Promise<unknown> | unknown;
    startZoomObserver: () => void;
    stopZoomObserver: () => void;
    clearZoomProvider: () => void;
    refreshZoomProvider: () => void;
}
/**
 * FileViewer 组件层的渲染面板门面。
 *
 * 它只管理 Vue component package 的 DOM surface、渲染 session 和 export adapter；
 * 具体格式派发仍由 core registry + Vue renderer bridge 完成。
 */
export declare const useViewerRenderSurface: ({ output, getOptions, isCurrentRequest, notifyActiveUnloadStart, notifyActiveUnloadComplete, clearActiveDocumentContext, clearDocumentState, refreshDocumentIndex, startZoomObserver, stopZoomObserver, clearZoomProvider, refreshZoomProvider }: UseViewerRenderSurfaceOptions) => {
    destroyRenderSession: (session?: FileViewerVueRenderSession | null | undefined) => void;
    setActiveRenderSession: (session: FileViewerVueRenderSession | null) => import('@file-viewer/core').MutableFileViewerRenderSurfaceState<FileViewerVueRenderSession>;
    clearRenderedContent: (reason?: FileViewerLifecycleContext["reason"]) => import('@file-viewer/core').FileViewerRenderSurfaceClearState<FileViewerVueRenderSession, FileViewerLifecycleContext | null>;
    mountRenderedContent: (buffer: ArrayBuffer, file: File, version: number, sourceUrl?: string, streamUrl?: string) => Promise<FileViewerVueRenderSession | undefined>;
    activeExportAdapter: import('vue').ShallowRef<FileRenderExportAdapter | null, FileRenderExportAdapter | null>;
    renderedReady: Ref<boolean, boolean>;
    progressiveReady: Ref<boolean, boolean>;
};
export {};
