import { Ref } from 'vue';
import { FileViewerErrorMessageFormatter, FileViewerRequestController, FileViewerFileRef as FileRef, FileViewerLifecycleContext, FileViewerLoadStartState, FileViewerOptions, FileViewerRenderCompleteState } from '@file-viewer/core';
import { FileViewerVueRenderSession } from '../rendererBridge';
interface UseViewerSourceLoadingOptions {
    getFile: () => FileRef | undefined;
    getUrl: () => string | undefined;
    getSourceFilename?: () => string | undefined;
    getOptions: () => FileViewerOptions | undefined;
    filename: Ref<string>;
    currentFile: Ref<File | null>;
    currentBuffer: Ref<ArrayBuffer | null>;
    currentSourceUrl: Ref<string | null>;
    renderedReady: Ref<boolean>;
    progressiveReady: Ref<boolean>;
    requestController: FileViewerRequestController;
    clearRenderedContent: (reason?: FileViewerLifecycleContext['reason']) => void;
    mountRenderedContent: (buffer: ArrayBuffer, file: File, version: number, sourceUrl?: string, streamUrl?: string) => Promise<FileViewerVueRenderSession | undefined>;
    destroyRenderSession: (session?: FileViewerVueRenderSession | null) => void;
    setActiveRenderSession: (session: FileViewerVueRenderSession | null) => void;
    buildLoadStartState: (input: {
        version: number;
        source: FileViewerLifecycleContext['source'];
        file?: File | null;
        sourceUrl?: string | null;
    }) => FileViewerLoadStartState;
    buildRenderCompleteState: (input: {
        version: number;
        source: FileViewerLifecycleContext['source'];
        file?: File | null;
        sourceUrl?: string | null;
    }) => FileViewerRenderCompleteState;
    notifyLifecycle: (context: FileViewerLifecycleContext) => void;
    setActiveDocumentContext: (context: FileViewerLifecycleContext) => void;
    markLoadStarted: (version: number) => void;
    clearLoadStarted: (version: number) => void;
    startLoading: (message: string) => void;
    setLoadingMessage: (message: string) => void;
    stopLoading: () => void;
    showError: (message: string) => void;
    clearError: () => void;
    resetLoading: () => void;
    formatErrorMessage: FileViewerErrorMessageFormatter;
}
/**
 * FileViewer 组件层的来源加载门面。
 *
 * 请求版本、取消错误、文件包装、PDF URL 流式判断等通用能力来自
 * `@file-viewer/core`；这里只把 Vue 状态、加载态和渲染挂载回调串起来。
 */
export declare const useViewerSourceLoading: ({ getFile, getUrl, getSourceFilename, getOptions, filename, currentFile, currentBuffer, currentSourceUrl, renderedReady, progressiveReady, requestController, clearRenderedContent, mountRenderedContent, destroyRenderSession, setActiveRenderSession, buildLoadStartState, buildRenderCompleteState, notifyLifecycle, setActiveDocumentContext, markLoadStarted, clearLoadStarted, startLoading, setLoadingMessage, stopLoading, showError, clearError, resetLoading, formatErrorMessage }: UseViewerSourceLoadingOptions) => {
    cancelPreview: (reason?: FileViewerLifecycleContext["reason"]) => void;
    refreshPreview: () => Promise<void>;
    resetViewer: (reason?: FileViewerLifecycleContext["reason"]) => void;
    isCurrentRequest: (version: number) => boolean;
    previewLocalFile: (source: FileRef, version: number) => Promise<import('@file-viewer/core').FileViewerLocalFilePreviewState<FileViewerVueRenderSession>>;
    previewRemoteFile: (url: string, version: number) => Promise<import('@file-viewer/core').FileViewerRemoteFilePreviewState<FileViewerVueRenderSession>>;
};
export {};
