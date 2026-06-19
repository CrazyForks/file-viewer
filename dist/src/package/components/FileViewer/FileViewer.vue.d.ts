import { FileViewerComponentProps as FileViewerProps } from '@file-viewer/core';
declare const __VLS_export: import('vue').DefineComponent<FileViewerProps, import('@file-viewer/core').FileViewerPublicApi, {}, {}, {}, import('vue').ComponentOptionsMixin, import('vue').ComponentOptionsMixin, {} & {
    "load-start": (context: import('@file-viewer/core').FileViewerLifecycleContext) => any;
    "load-complete": (context: import('@file-viewer/core').FileViewerLifecycleContext) => any;
    "unload-start": (context: import('@file-viewer/core').FileViewerLifecycleContext) => any;
    "unload-complete": (context: import('@file-viewer/core').FileViewerLifecycleContext) => any;
    "search-change": (state: import('@file-viewer/core').FileViewerSearchState) => any;
    "operation-before": (context: import('@file-viewer/core').FileViewerOperationContext) => any;
    "operation-cancel": (context: import('@file-viewer/core').FileViewerOperationContext) => any;
    "operation-availability-change": (availability: import('@file-viewer/core').FileViewerOperationAvailability) => any;
    "location-change": (anchor: import('@file-viewer/core').FileViewerDocumentAnchor | null) => any;
    "zoom-change": (state: import('@file-viewer/core').FileViewerZoomState) => any;
}, string, import('vue').PublicProps, Readonly<FileViewerProps> & Readonly<{
    "onLoad-start"?: ((context: import('@file-viewer/core').FileViewerLifecycleContext) => any) | undefined;
    "onLoad-complete"?: ((context: import('@file-viewer/core').FileViewerLifecycleContext) => any) | undefined;
    "onUnload-start"?: ((context: import('@file-viewer/core').FileViewerLifecycleContext) => any) | undefined;
    "onUnload-complete"?: ((context: import('@file-viewer/core').FileViewerLifecycleContext) => any) | undefined;
    "onSearch-change"?: ((state: import('@file-viewer/core').FileViewerSearchState) => any) | undefined;
    "onOperation-before"?: ((context: import('@file-viewer/core').FileViewerOperationContext) => any) | undefined;
    "onOperation-cancel"?: ((context: import('@file-viewer/core').FileViewerOperationContext) => any) | undefined;
    "onOperation-availability-change"?: ((availability: import('@file-viewer/core').FileViewerOperationAvailability) => any) | undefined;
    "onLocation-change"?: ((anchor: import('@file-viewer/core').FileViewerDocumentAnchor | null) => any) | undefined;
    "onZoom-change"?: ((state: import('@file-viewer/core').FileViewerZoomState) => any) | undefined;
}>, {}, {}, {}, {}, string, import('vue').ComponentProvideOptions, false, {}, any>;
declare const _default: typeof __VLS_export;
export default _default;
