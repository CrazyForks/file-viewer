import { FileRenderExportAdapter } from '../../../../package/common/type';
declare global {
    interface Window {
        __FLYFISH_TYPST_COMPILER_WASM_URL__?: string;
    }
}
type __VLS_Props = {
    source: string;
    filename?: string;
    compilerWasmUrl?: string;
    exportAdapter?: (adapter: FileRenderExportAdapter | null) => void;
};
declare const __VLS_export: import('vue').DefineComponent<__VLS_Props, {}, {}, {}, {}, import('vue').ComponentOptionsMixin, import('vue').ComponentOptionsMixin, {}, string, import('vue').PublicProps, Readonly<__VLS_Props> & Readonly<{}>, {}, {}, {}, {}, string, import('vue').ComponentProvideOptions, false, {}, any>;
declare const _default: typeof __VLS_export;
export default _default;
