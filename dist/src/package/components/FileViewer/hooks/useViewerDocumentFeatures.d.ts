import { Ref } from 'vue';
import { FileViewerDocumentAnchor, FileViewerDocumentChunk, FileViewerOptions, FileViewerSearchState } from '../../../../../package/common/type';
interface UseViewerDocumentFeaturesOptions {
    output: Ref<HTMLDivElement | null>;
    getOptions: () => FileViewerOptions | undefined;
    emitSearchChange: (state: FileViewerSearchState) => void;
    emitLocationChange: (anchor: FileViewerDocumentAnchor | null) => void;
}
/**
 * FileViewer 的文档交互门面。
 *
 * 底层搜索、高亮、锚点收集继续放在 `src/package/use` 的通用 hooks 中；
 * 这里只负责把这些能力组合成组件对外暴露的 API，并处理 iframe 事件桥接。
 */
export declare const useViewerDocumentFeatures: ({ output, getOptions, emitSearchChange, emitLocationChange }: UseViewerDocumentFeaturesOptions) => {
    refreshDocumentIndex: () => Promise<FileViewerDocumentAnchor[]>;
    clearDocumentState: () => void;
    getScrollContainer: () => HTMLElement | null;
    searchDocument: (query: string) => Promise<FileViewerSearchState>;
    clearDocumentSearch: () => Promise<FileViewerSearchState>;
    nextSearchResult: () => Promise<FileViewerSearchState>;
    previousSearchResult: () => Promise<FileViewerSearchState>;
    getSearchState: () => FileViewerSearchState;
    collectDocumentAnchors: () => Promise<FileViewerDocumentAnchor[]>;
    scrollToAnchor: (anchor: FileViewerDocumentAnchor | string) => Promise<boolean>;
    scrollToLine: (line: number) => Promise<boolean>;
    getDocumentTextChunks: () => FileViewerDocumentChunk[];
};
export {};
