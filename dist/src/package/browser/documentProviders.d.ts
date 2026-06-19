import { FileViewerSearchProvider, FileViewerZoomProvider } from '@file-viewer/core';
export interface FileViewerSearchProviderHost extends HTMLElement {
    __flyfishViewerSearchProvider?: FileViewerSearchProvider;
}
export interface FileViewerZoomProviderHost extends HTMLElement {
    __flyfishViewerZoomProvider?: FileViewerZoomProvider;
}
export declare const registerFileViewerSearchProvider: (host: HTMLElement, provider: FileViewerSearchProvider) => void;
export declare const unregisterFileViewerSearchProvider: (host: HTMLElement | null | undefined) => void;
export declare const findFileViewerSearchProvider: (root: HTMLElement | null | undefined) => FileViewerSearchProvider | null;
export declare const registerFileViewerZoomProvider: (host: HTMLElement, provider: FileViewerZoomProvider) => void;
export declare const unregisterFileViewerZoomProvider: (host: HTMLElement | null | undefined) => void;
export declare const findFileViewerZoomProvider: (root: HTMLElement | null | undefined) => FileViewerZoomProvider | null;
