import { MaybeRefOrGetter } from 'vue';
export interface LoadingTheme {
    accent: string;
    badge: string;
    hint: string;
    label: string;
    soft: string;
}
/**
 * 根据扩展名返回统一的加载主题。
 * 这样不同预览器可以复用同一套视觉语义，避免颜色、图标和文案各写一份。
 */
export declare const resolveLoadingTheme: (extend?: string) => LoadingTheme;
/**
 * 统一管理加载、错误、文案和主题色。
 * 组件只负责描述业务流程，不再在主文件里散落一堆 loading 状态切换。
 */
export declare const useLoading: (extendSource: MaybeRefOrGetter<string>) => {
    loading: import('vue').Ref<boolean, boolean>;
    error: import('vue').Ref<string, string>;
    message: import('vue').Ref<string, string>;
    theme: import('vue').ComputedRef<LoadingTheme>;
    styleVars: import('vue').ComputedRef<{
        '--viewer-accent': string;
        '--viewer-soft': string;
    }>;
    startLoading: (nextMessage: string) => void;
    setLoadingMessage: (nextMessage: string) => void;
    stopLoading: () => void;
    showError: (nextMessage: string) => void;
    clearError: () => void;
    resetLoading: () => void;
};
