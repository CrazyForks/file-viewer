import { Ref } from 'vue';
import { FileViewerDocumentAnchor, FileViewerSearchOptions, FileViewerSearchProvider } from '../../../package/common/type';
export declare const registerFileViewerSearchProvider: (host: HTMLElement, provider: FileViewerSearchProvider) => void;
export declare const unregisterFileViewerSearchProvider: (host: HTMLElement | null | undefined) => void;
export declare const useDocumentSearch: (root: Ref<HTMLElement | null>, optionsSource?: () => boolean | FileViewerSearchOptions | undefined, scrollContainerSource?: () => HTMLElement | null | undefined) => {
    anchors: import('vue').ShallowRef<FileViewerDocumentAnchor[], FileViewerDocumentAnchor[]>;
    state: {
        query: string;
        total: number;
        currentIndex: number;
        current: {
            id: string;
            index: number;
            text: string;
            anchor: {
                id: string;
                index: number;
                line: number;
                type: "page" | "line" | "block";
                label: string;
                text: string;
                page?: number | undefined;
                top: number;
                left: number;
                width: number;
                height: number;
            } | null;
            line?: number | undefined;
            page?: number | undefined;
        } | null;
        matches: {
            id: string;
            index: number;
            text: string;
            anchor: {
                id: string;
                index: number;
                line: number;
                type: "page" | "line" | "block";
                label: string;
                text: string;
                page?: number | undefined;
                top: number;
                left: number;
                width: number;
                height: number;
            } | null;
            line?: number | undefined;
            page?: number | undefined;
        }[];
    };
    observe: () => void;
    refreshAnchors: () => Promise<FileViewerDocumentAnchor[]>;
    search: (query: string) => Promise<{
        query: string;
        total: number;
        currentIndex: number;
        current: {
            id: string;
            index: number;
            text: string;
            anchor: {
                id: string;
                index: number;
                line: number;
                type: "page" | "line" | "block";
                label: string;
                text: string;
                page?: number | undefined;
                top: number;
                left: number;
                width: number;
                height: number;
            } | null;
            line?: number | undefined;
            page?: number | undefined;
        } | null;
        matches: {
            id: string;
            index: number;
            text: string;
            anchor: {
                id: string;
                index: number;
                line: number;
                type: "page" | "line" | "block";
                label: string;
                text: string;
                page?: number | undefined;
                top: number;
                left: number;
                width: number;
                height: number;
            } | null;
            line?: number | undefined;
            page?: number | undefined;
        }[];
    }>;
    next: () => Promise<{
        query: string;
        total: number;
        currentIndex: number;
        current: {
            id: string;
            index: number;
            text: string;
            anchor: {
                id: string;
                index: number;
                line: number;
                type: "page" | "line" | "block";
                label: string;
                text: string;
                page?: number | undefined;
                top: number;
                left: number;
                width: number;
                height: number;
            } | null;
            line?: number | undefined;
            page?: number | undefined;
        } | null;
        matches: {
            id: string;
            index: number;
            text: string;
            anchor: {
                id: string;
                index: number;
                line: number;
                type: "page" | "line" | "block";
                label: string;
                text: string;
                page?: number | undefined;
                top: number;
                left: number;
                width: number;
                height: number;
            } | null;
            line?: number | undefined;
            page?: number | undefined;
        }[];
    }>;
    previous: () => Promise<{
        query: string;
        total: number;
        currentIndex: number;
        current: {
            id: string;
            index: number;
            text: string;
            anchor: {
                id: string;
                index: number;
                line: number;
                type: "page" | "line" | "block";
                label: string;
                text: string;
                page?: number | undefined;
                top: number;
                left: number;
                width: number;
                height: number;
            } | null;
            line?: number | undefined;
            page?: number | undefined;
        } | null;
        matches: {
            id: string;
            index: number;
            text: string;
            anchor: {
                id: string;
                index: number;
                line: number;
                type: "page" | "line" | "block";
                label: string;
                text: string;
                page?: number | undefined;
                top: number;
                left: number;
                width: number;
                height: number;
            } | null;
            line?: number | undefined;
            page?: number | undefined;
        }[];
    }>;
    clear: () => Promise<{
        query: string;
        total: number;
        currentIndex: number;
        current: {
            id: string;
            index: number;
            text: string;
            anchor: {
                id: string;
                index: number;
                line: number;
                type: "page" | "line" | "block";
                label: string;
                text: string;
                page?: number | undefined;
                top: number;
                left: number;
                width: number;
                height: number;
            } | null;
            line?: number | undefined;
            page?: number | undefined;
        } | null;
        matches: {
            id: string;
            index: number;
            text: string;
            anchor: {
                id: string;
                index: number;
                line: number;
                type: "page" | "line" | "block";
                label: string;
                text: string;
                page?: number | undefined;
                top: number;
                left: number;
                width: number;
                height: number;
            } | null;
            line?: number | undefined;
            page?: number | undefined;
        }[];
    }>;
};
