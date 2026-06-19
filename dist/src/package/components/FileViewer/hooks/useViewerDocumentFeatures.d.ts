import { Ref } from 'vue';
import { FileViewerDocumentAnchor, FileViewerOptions, FileViewerSearchState } from '@file-viewer/core';
interface UseViewerDocumentFeaturesOptions {
    output: Ref<HTMLDivElement | null>;
    getOptions: () => FileViewerOptions | undefined;
    emitSearchChange: (state: FileViewerSearchState) => void;
    emitLocationChange: (anchor: FileViewerDocumentAnchor | null) => void;
}
/**
 * FileViewer 的文档交互门面。
 *
 * 底层锚点、滚动和文本切片由 core 负责，Vue 侧只保留搜索响应式 hook；
 * 这里负责把这些能力组合成组件对外暴露的 API，并同步搜索/定位状态。
 */
export declare const useViewerDocumentFeatures: ({ output, getOptions, emitSearchChange, emitLocationChange }: UseViewerDocumentFeaturesOptions) => {
    refreshDocumentIndex: (options?: import('@file-viewer/core').FileViewerDocumentFeatureActionOptions) => Promise<FileViewerDocumentAnchor[]>;
    clearDocumentState: () => Promise<FileViewerSearchState>;
    getScrollContainer: () => HTMLElement | null;
    searchDocument: (query: string) => Promise<FileViewerSearchState>;
    clearDocumentSearch: () => Promise<FileViewerSearchState>;
    nextSearchResult: () => Promise<FileViewerSearchState>;
    previousSearchResult: () => Promise<FileViewerSearchState>;
    getSearchState: () => FileViewerSearchState;
    collectDocumentAnchors: (options?: import('@file-viewer/core').FileViewerDocumentFeatureActionOptions) => Promise<FileViewerDocumentAnchor[]>;
    scrollToAnchor: (anchor: FileViewerDocumentAnchor | string | number | null | undefined, options?: import('@file-viewer/core').FileViewerDocumentFeatureActionOptions) => Promise<boolean>;
    scrollToLine: (line: number, options?: import('@file-viewer/core').FileViewerDocumentFeatureActionOptions) => Promise<boolean>;
    getDocumentTextChunks: (options?: boolean | import('@file-viewer/core').FileViewerAiOptions) => import('@file-viewer/core').FileViewerDocumentChunk[];
};
export {};
