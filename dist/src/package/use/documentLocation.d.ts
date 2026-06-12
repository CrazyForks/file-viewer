import { Ref } from 'vue';
import { FileViewerAiOptions, FileViewerDocumentAnchor, FileViewerDocumentChunk } from '../../../package/common/type';
export declare const collectDocumentAnchors: (root: HTMLElement | null) => FileViewerDocumentAnchor[];
export declare const findAnchorForElement: (element: Element | null, anchors: FileViewerDocumentAnchor[], root?: HTMLElement | null) => FileViewerDocumentAnchor | null;
export declare const getCurrentDocumentAnchor: (root: HTMLElement | null, anchors: FileViewerDocumentAnchor[]) => FileViewerDocumentAnchor | null;
export declare const scrollToDocumentAnchor: (root: HTMLElement | null, anchor: FileViewerDocumentAnchor | string | number | null | undefined) => boolean;
export declare const buildDocumentTextChunks: (anchors: FileViewerDocumentAnchor[], options?: boolean | FileViewerAiOptions) => FileViewerDocumentChunk[];
export declare const useDocumentLocation: (root: Ref<HTMLElement | null>) => {
    anchors: import('vue').ShallowRef<FileViewerDocumentAnchor[], FileViewerDocumentAnchor[]>;
    refreshAnchors: () => Promise<FileViewerDocumentAnchor[]>;
    getCurrentAnchor: () => FileViewerDocumentAnchor | null;
    scrollToAnchor: (anchor: FileViewerDocumentAnchor | string) => boolean;
    scrollToLine: (line: number) => Promise<boolean>;
    getTextChunks: (options?: boolean | FileViewerAiOptions) => FileViewerDocumentChunk[];
};
