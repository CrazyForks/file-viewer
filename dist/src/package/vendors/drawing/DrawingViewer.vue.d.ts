type __VLS_Props = {
    data: ArrayBuffer;
    type: string;
};
declare global {
    interface Window {
        GraphViewer?: {
            createViewerForElement: (element: HTMLElement, callback?: (viewer: unknown) => void) => unknown;
            processElements: (className?: string) => void;
        };
    }
}
declare const __VLS_export: import('vue').DefineComponent<__VLS_Props, {}, {}, {}, {}, import('vue').ComponentOptionsMixin, import('vue').ComponentOptionsMixin, {}, string, import('vue').PublicProps, Readonly<__VLS_Props> & Readonly<{}>, {}, {}, {}, {}, string, import('vue').ComponentProvideOptions, false, {}, any>;
declare const _default: typeof __VLS_export;
export default _default;
