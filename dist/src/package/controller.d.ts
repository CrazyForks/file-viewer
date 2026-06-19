import { FileViewerAiOptions, FileViewerArchiveOptions, FileViewerCadOptions, FileViewerDocxOptions, FileViewerDocumentAnchor, FileViewerDocumentChunk, FileViewerEvent, FileViewerEventHandler, FileViewerEventType, FileViewerFileRef, FileViewerInstance, FileViewerLifecycleContext, FileViewerOperationAvailability, FileViewerOperationContext, FileViewerOptions, FileViewerPdfOptions, FileViewerSpreadsheetOptions, FileViewerPublicApi, FileViewerSearchOptions, FileViewerSearchState, FileViewerThemeMode, FileViewerToolbarOptions, FileViewerToolbarPosition, FileViewerTypstOptions, FileViewerWatermarkOptions, FileViewerZoomState, RendererRegistry } from '@file-viewer/core';
export type FileRef = FileViewerFileRef;
export type ViewerWatermarkOptions = FileViewerWatermarkOptions;
export type ViewerToolbarPosition = FileViewerToolbarPosition;
export type ViewerToolbarOptions = FileViewerToolbarOptions;
export type ViewerArchiveOptions = FileViewerArchiveOptions;
export type ViewerPdfOptions = FileViewerPdfOptions;
export type ViewerSpreadsheetOptions = FileViewerSpreadsheetOptions;
export type ViewerDocxOptions = FileViewerDocxOptions;
export type ViewerTypstOptions = FileViewerTypstOptions;
export type ViewerCadOptions = FileViewerCadOptions;
export type ViewerSearchOptions = FileViewerSearchOptions;
export type ViewerAiOptions = FileViewerAiOptions;
export type ViewerThemeMode = FileViewerThemeMode;
export type ViewerOptions = FileViewerOptions;
export type ViewerEventType = FileViewerEventType;
export type ViewerEvent = FileViewerEvent;
export type ViewerEventHandler = FileViewerEventHandler;
export type ViewerLifecycleContext = FileViewerLifecycleContext;
export type ViewerOperationContext = FileViewerOperationContext;
export interface ViewerState {
    loading: boolean;
    ready: boolean;
    error: unknown | null;
    lastEvent: ViewerEvent | null;
    lifecycle: ViewerLifecycleContext | null;
    availability: FileViewerOperationAvailability | null;
    search: FileViewerSearchState | null;
    zoom: FileViewerZoomState | null;
    location: FileViewerDocumentAnchor | null;
}
export type ViewerStateListener = (state: ViewerState, event?: ViewerEvent) => void;
export interface ViewerMountOptions {
    url?: string;
    file?: FileRef;
    buffer?: ArrayBuffer;
    name?: string;
    filename?: string;
    type?: string;
    size?: number;
    options?: ViewerOptions;
    onEvent?: ViewerEventHandler;
    onStateChange?: ViewerStateListener;
}
export interface ViewerSourceInput {
    url?: string;
    file?: FileRef;
    buffer?: ArrayBuffer;
    filename?: string;
    name?: string;
    type?: string;
    size?: number;
}
export interface ViewerFetchInput {
    url: string;
    signal?: AbortSignal;
    source: ViewerSourceInput;
}
export type ViewerFetchFile = (input: ViewerFetchInput) => Promise<FileRef | null | undefined>;
export interface ViewerCoreOptions {
    registry?: RendererRegistry;
    fetchFile?: ViewerFetchFile;
    onError?: (error: unknown, source: ViewerSourceInput) => void;
}
export interface ViewerController {
    readonly container: HTMLElement;
    load(options: ViewerMountOptions): Promise<void>;
    update(options?: ViewerMountOptions): Promise<void>;
    reload(): Promise<void>;
    destroy(): void;
    getApi(): FileViewerPublicApi | FileViewerInstance | null;
    downloadOriginalFile(): Promise<void>;
    printRenderedHtml(): Promise<void>;
    exportRenderedHtml(): Promise<void>;
    zoomIn(): Promise<FileViewerZoomState | null>;
    zoomOut(): Promise<FileViewerZoomState | null>;
    resetZoom(): Promise<FileViewerZoomState | null>;
    searchDocument(query: string): Promise<FileViewerSearchState | null>;
    clearDocumentSearch(): Promise<FileViewerSearchState | null>;
    nextSearchResult(): Promise<FileViewerSearchState | null>;
    previousSearchResult(): Promise<FileViewerSearchState | null>;
    collectDocumentAnchors(): Promise<FileViewerDocumentAnchor[]>;
    scrollToAnchor(anchor: FileViewerDocumentAnchor | string): Promise<boolean>;
    scrollToLine(line: number): Promise<boolean>;
    getDocumentTextChunks(): FileViewerDocumentChunk[];
    getOperationAvailability(): FileViewerOperationAvailability | null;
    getZoomState(): FileViewerZoomState | null;
    getSearchState(): FileViewerSearchState | null;
    getState(): ViewerState;
    subscribe(listener: ViewerStateListener): () => void;
}
export type ViewerControllerAccessor = () => ViewerController | null;
export interface ViewerControllerHandle {
    load(options: ViewerMountOptions): Promise<void>;
    update(options?: ViewerMountOptions): Promise<void>;
    reload(): Promise<void>;
    destroy(): void;
    getController(): ViewerController | null;
    getApi(): FileViewerPublicApi | FileViewerInstance | null;
    downloadOriginalFile(): Promise<void>;
    printRenderedHtml(): Promise<void>;
    exportRenderedHtml(): Promise<void>;
    zoomIn(): Promise<FileViewerZoomState | null>;
    zoomOut(): Promise<FileViewerZoomState | null>;
    resetZoom(): Promise<FileViewerZoomState | null>;
    searchDocument(query: string): Promise<FileViewerSearchState | null>;
    clearDocumentSearch(): Promise<FileViewerSearchState | null>;
    nextSearchResult(): Promise<FileViewerSearchState | null>;
    previousSearchResult(): Promise<FileViewerSearchState | null>;
    collectDocumentAnchors(): Promise<FileViewerDocumentAnchor[]>;
    scrollToAnchor(anchor: FileViewerDocumentAnchor | string): Promise<boolean>;
    scrollToLine(line: number): Promise<boolean>;
    getDocumentTextChunks(): FileViewerDocumentChunk[];
    getOperationAvailability(): FileViewerOperationAvailability | null;
    getZoomState(): FileViewerZoomState | null;
    getSearchState(): FileViewerSearchState | null;
    getState(): ViewerState | null;
    subscribe(listener: ViewerStateListener): () => void;
}
export declare const createViewerControllerHandle: (getController: ViewerControllerAccessor, dispose: () => void) => ViewerControllerHandle;
export declare const mountViewer: (container: HTMLElement, initialOptions?: ViewerMountOptions, coreOptions?: ViewerCoreOptions) => ViewerController;
