import { FileViewerArchiveOptions, ResolveFileViewerAssetUrlOptions } from '@file-viewer/core';
export declare const getBrowserFileViewerDocumentBaseUrl: () => string;
export declare const resolveBrowserFileViewerAssetUrl: (value: string | URL | undefined, fallback: string, options?: ResolveFileViewerAssetUrlOptions) => string;
export declare const resolveBrowserFileViewerArchiveWorkerUrl: (options?: Pick<FileViewerArchiveOptions, "workerUrl"> | null, baseUrl?: string) => string;
export declare const resolveBrowserFileViewerArchiveWasmUrl: (options?: Pick<FileViewerArchiveOptions, "wasmUrl"> | null, fallback?: string) => string;
