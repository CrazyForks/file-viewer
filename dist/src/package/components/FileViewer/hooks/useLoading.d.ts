import { MaybeRefOrGetter } from 'vue';
import { FileViewerLoadingState, FileViewerStateTheme } from '@file-viewer/core';
export type LoadingTheme = FileViewerStateTheme;
export declare const resolveLoadingTheme: (extend?: string) => import('@file-viewer/core').FileViewerLoadingTheme;
/**
 * FileViewer loading 响应式门面。
 *
 * 真实 loading 状态机和主题矩阵在 `@file-viewer/core` 中维护，
 * 这里仅把纯 TS controller 的快照同步成组件需要的 Vue ref/computed 形态。
 */
export declare const useLoading: (extendSource: MaybeRefOrGetter<string>) => {
    loading: import('vue').ComputedRef<boolean>;
    error: import('vue').ComputedRef<string>;
    message: import('vue').ComputedRef<string>;
    theme: import('vue').ComputedRef<{
        accent: string;
        badge: string;
        hint: string;
        label: string;
        soft: string;
    }>;
    styleVars: import('vue').ComputedRef<{
        "--viewer-accent": string;
        "--viewer-soft": string;
    }>;
    startLoading: (nextMessage: string) => FileViewerLoadingState;
    setLoadingMessage: (nextMessage: string) => FileViewerLoadingState;
    stopLoading: () => FileViewerLoadingState;
    showError: (nextMessage: string) => FileViewerLoadingState;
    clearError: () => FileViewerLoadingState;
    resetLoading: () => FileViewerLoadingState;
    syncLoadingState: () => FileViewerLoadingState;
};
