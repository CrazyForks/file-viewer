import { FileRef, FileViewerLifecycleContext, FileViewerOperationAvailability, FileViewerOptions, FileViewerOperationContext } from '../../common/type';
type __VLS_Props = {
    /**
     * 本地二进制输入。优先级高于 `url`。
     *
     * 推荐传入带正确扩展名的 `File`；如果业务侧只有 Blob 或 ArrayBuffer，
     * 请先包装成 `new File([...], 'demo.pdf')`，保证格式识别稳定。
     */
    file?: FileRef;
    /**
     * 远端文件地址。组件会在浏览器内下载该地址，再根据路径里的扩展名选择渲染器。
     *
     * 目标资源必须允许浏览器访问；鉴权或无扩展名下载接口建议由宿主侧先取回，
     * 再通过 `file` 参数传入。
     */
    url?: string;
    /**
     * 预览器通用选项。
     *
     * 目前覆盖内置操作栏、水印，以及压缩包内文件预览的缓存/体积限制。
     */
    options?: FileViewerOptions;
};
declare const __VLS_export: import('vue').DefineComponent<__VLS_Props, {
    downloadOriginalFile: () => Promise<void>;
    printRenderedHtml: () => Promise<void>;
    exportRenderedHtml: () => Promise<void>;
    getOperationAvailability: () => {
        download: boolean;
        print: boolean;
        exportHtml: boolean;
    };
}, {}, {}, {}, import('vue').ComponentOptionsMixin, import('vue').ComponentOptionsMixin, {} & {
    "load-start": (context: FileViewerLifecycleContext) => any;
    "load-complete": (context: FileViewerLifecycleContext) => any;
    "unload-start": (context: FileViewerLifecycleContext) => any;
    "unload-complete": (context: FileViewerLifecycleContext) => any;
    "operation-before": (context: FileViewerOperationContext) => any;
    "operation-cancel": (context: FileViewerOperationContext) => any;
    "operation-availability-change": (availability: FileViewerOperationAvailability) => any;
}, string, import('vue').PublicProps, Readonly<__VLS_Props> & Readonly<{
    "onLoad-start"?: ((context: FileViewerLifecycleContext) => any) | undefined;
    "onLoad-complete"?: ((context: FileViewerLifecycleContext) => any) | undefined;
    "onUnload-start"?: ((context: FileViewerLifecycleContext) => any) | undefined;
    "onUnload-complete"?: ((context: FileViewerLifecycleContext) => any) | undefined;
    "onOperation-before"?: ((context: FileViewerOperationContext) => any) | undefined;
    "onOperation-cancel"?: ((context: FileViewerOperationContext) => any) | undefined;
    "onOperation-availability-change"?: ((availability: FileViewerOperationAvailability) => any) | undefined;
}>, {}, {}, {}, {}, string, import('vue').ComponentProvideOptions, false, {}, any>;
declare const _default: typeof __VLS_export;
export default _default;
