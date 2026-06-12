import { App } from 'vue';
/**
 * 渲染器返回的 Vue 包装实例。
 *
 * Vue3 渲染器直接返回 `App`，少量兼容渲染器会返回只暴露 `$el`
 * 与 `unmount()` 的轻量包装对象。
 */
export interface AppWrapper {
    $el: Node;
    unmount(): void;
}
/**
 * 任意渲染器挂载完成后返回的可卸载实例。
 */
export type Rendered = App | AppWrapper;
/**
 * 组件可接受的本地二进制来源。
 *
 * 对外接入时最推荐传入带正确文件名的 `File`。如果业务侧拿到的是
 * `Blob` 或 `ArrayBuffer`，请先包装成 `new File([...], 'demo.pdf')`，
 * 这样渲染器才能通过扩展名选择正确的预览链路。
 */
export type FileRef = File | Blob | ArrayBuffer;
/**
 * 水印配置。
 *
 * `text` 与 `image` 至少设置一个；同时传入时优先使用图片水印。
 * 图片水印可以是 http(s) URL、相对路径或 data URL。
 */
export interface FileViewerWatermarkOptions {
    enabled?: boolean;
    text?: string;
    image?: string;
    opacity?: number;
    rotate?: number;
    gapX?: number;
    gapY?: number;
    width?: number;
    height?: number;
    fontSize?: number;
    color?: string;
    fontFamily?: string;
}
/**
 * 预览器内置操作栏位置。
 *
 * `auto` 是默认策略: PDF 这类有独立阅读工具栏的格式会自动悬浮到右下角，
 * 其他格式继续使用顶部操作栏；也可以显式传 `top` 或 `bottom-right`。
 */
export type FileViewerToolbarPosition = 'auto' | 'top' | 'bottom-right';
/**
 * 预览器内置操作栏配置。
 */
export interface FileViewerToolbarOptions {
    download?: boolean;
    print?: boolean;
    exportHtml?: boolean;
    /**
     * 操作栏位置。`bottom-right` 会以胶囊按钮组悬浮在预览区右下角，
     * 适合 PDF 等自身已经有顶部导航栏的格式。
     */
    position?: FileViewerToolbarPosition;
    /**
     * 内置操作按钮执行前的统一前置钩子。返回 `false` 时会取消本次操作。
     */
    beforeOperation?: FileViewerBeforeOperation;
    beforeDownload?: FileViewerBeforeOperation;
    beforePrint?: FileViewerBeforeOperation;
    beforeExportHtml?: FileViewerBeforeOperation;
}
/**
 * 压缩包预览配置。
 */
export interface FileViewerArchiveOptions {
    /**
     * libarchive.js Worker 地址。私有化部署时建议把
     * `worker-bundle.js` 与 `libarchive.wasm` 放在同一目录后传入。
     */
    workerUrl?: string;
    /**
     * 是否启用 IndexedDB 缓存压缩包内已解压的文件。
     */
    cache?: boolean;
    /**
     * 单个压缩包允许解析的最大体积，单位字节。
     */
    maxArchiveSize?: number;
    /**
     * 压缩包内单文件允许在线预览的最大体积，单位字节。
     */
    maxEntryPreviewSize?: number;
}
/**
 * PDF 预览配置。
 */
export interface FileViewerPdfOptions {
    /**
     * 是否显示 PDF 渲染器自己的阅读工具栏。
     *
     * 独立预览建议保持默认显示；在文档比对这类左右排版场景中可以设为
     * `false`，让 PDF 与 Word / Markdown 等格式从同一内容起点对齐。
     */
    toolbar?: boolean;
    /**
     * 是否启用左侧页面/目录导航窗格。设为 `false` 时会同时隐藏侧栏和切换按钮。
     */
    navigation?: boolean;
    /**
     * 导航窗格初始是否展开。未设置时默认展开，`navigation: false` 时会被忽略。
     */
    defaultNavigationVisible?: boolean;
    /**
     * 初始页面旋转角度。会按 90 度归一化到 0 / 90 / 180 / 270。
     */
    rotation?: number;
    /**
     * 远端 PDF 是否优先交给 PDF.js 直接按 URL 渐进读取。
     *
     * 默认 `same-origin`，即同源 PDF 交给 PDF.js 通过 URL 渐进读取；
     * 当文件服务支持 Range 时会进一步使用分片加载。跨域 URL 仍保持
     * 旧的 Blob 下载后预览链路，最大化兼容鉴权下载和 CORS 场景。
     * 设为 `true` 会对所有 URL 启用，设为 `false` 会完全禁用。
     */
    streaming?: boolean | 'same-origin';
    /**
     * PDF.js Range 请求的分片大小，默认 64KB；仅在文件服务支持 Range 时生效。
     */
    rangeChunkSize?: number;
    /**
     * PDF.js URL 读取 PDF 时是否携带浏览器凭据。
     */
    withCredentials?: boolean;
}
/**
 * Typst 预览配置。
 */
export interface FileViewerTypstOptions {
    /**
     * Typst compiler WASM 地址。需要浏览器端编译时才会加载。
     */
    compilerWasmUrl?: string;
}
export type FileViewerCadRenderer = 'auto' | 'webgl' | 'canvas2d';
export type FileViewerCadDwfLineWeightMode = 'adaptive' | 'physical' | 'hairline';
/**
 * CAD 预览配置。
 *
 * 默认使用 @flyfish-dev/cad-viewer，并从 viewer 静态目录下的
 * `wasm/cad/` 按需加载 LibreDWG WASM、DWF raster WASM 与 DWG Worker。
 * 私有化部署或 CDN 路径不同的场景，可以显式覆盖对应 URL。
 */
export interface FileViewerCadOptions {
    wasmPath?: string;
    workerUrl?: string | URL;
    dwfWasmUrl?: string;
    useWorker?: boolean;
    workerTimeoutMs?: number;
    renderer?: FileViewerCadRenderer;
    preferDwgWasm?: boolean;
    includePaperSpace?: boolean;
    maxInsertDepth?: number;
    keepRaw?: boolean;
    preloadDwg?: boolean;
    dwfPreferWebgl?: boolean;
    dwfPreferWasm?: boolean;
    dwfBackground?: string;
    dwfMaxDevicePixelRatio?: number;
    dwfMaxCanvasPixels?: number;
    dwfMaxGpuCacheBytes?: number;
    dwfMaxCachedScenes?: number;
    dwfLineWeightMode?: FileViewerCadDwfLineWeightMode;
    dwfMinStrokeCssPx?: number;
    dwfMaxOverviewStrokeCssPx?: number;
    dwfMinTextCssPx?: number;
    dwfMinFilledAreaCssPx?: number;
    canvasOptions?: Record<string, unknown>;
}
/**
 * 文档定位锚点。
 *
 * 预览器会尽量把当前渲染结果中的页面、段落、表格行、代码块等内容
 * 抽象成稳定锚点。不同格式的“行”粒度不完全相同：文本类文档通常可到
 * 段落/行块，PDF 这类画布型文档会优先回退到页与可用文本层。
 */
export interface FileViewerDocumentAnchor {
    id: string;
    index: number;
    line: number;
    type: 'page' | 'line' | 'block';
    label: string;
    text: string;
    page?: number;
    top: number;
    left: number;
    width: number;
    height: number;
}
/**
 * AI / 搜索可复用的文档文本切片。
 *
 * 这里不直接绑定任何云端能力，只提供溯源、向量化和高亮所需的稳定结构。
 */
export interface FileViewerDocumentChunk {
    id: string;
    text: string;
    anchor: FileViewerDocumentAnchor;
    startLine: number;
    endLine: number;
}
/**
 * 文档搜索配置。
 */
export interface FileViewerSearchOptions {
    /**
     * 是否启用搜索能力。设为 `false` 时公开方法仍存在，但不会执行高亮。
     */
    enabled?: boolean;
    /**
     * 是否区分大小写。
     */
    caseSensitive?: boolean;
    /**
     * 是否整词匹配。
     */
    wholeWord?: boolean;
    /**
     * 单次搜索最多保留的命中数量，避免极端大文档一次性插入过多高亮节点。
     */
    maxMatches?: number;
    /**
     * 搜索 MutationObserver 重新扫描的防抖时间。
     */
    debounce?: number;
    /**
     * 自定义高亮类名。
     */
    className?: string;
    /**
     * 当前命中高亮类名。
     */
    activeClassName?: string;
}
/**
 * 单条搜索命中。
 */
export interface FileViewerSearchMatch {
    id: string;
    index: number;
    text: string;
    anchor: FileViewerDocumentAnchor | null;
    line?: number;
    page?: number;
}
/**
 * 当前搜索状态。
 */
export interface FileViewerSearchState {
    query: string;
    total: number;
    currentIndex: number;
    current: FileViewerSearchMatch | null;
    matches: FileViewerSearchMatch[];
}
/**
 * 渲染器自定义搜索提供器。
 *
 * PDF.js、EPUB iframe、虚拟表格等格式拥有自己的文本层或虚拟滚动结构，
 * 不能总是由通用 DOM 高亮直接改写内部节点。渲染器可以在根节点上注册
 * 该提供器，让 FileViewer 的搜索 API 继续保持统一入口。
 */
export interface FileViewerSearchProvider {
    search: (query: string, options?: FileViewerSearchOptions) => FileViewerSearchState | Promise<FileViewerSearchState>;
    next?: () => FileViewerSearchState | Promise<FileViewerSearchState>;
    previous?: () => FileViewerSearchState | Promise<FileViewerSearchState>;
    clear?: () => FileViewerSearchState | Promise<FileViewerSearchState>;
    getState?: () => FileViewerSearchState;
}
/**
 * AI 友好能力配置。
 *
 * 预览器本身不内置云端模型调用；这里提供可选文本切片结构，业务侧可以
 * 基于 `getDocumentTextChunks()` 做向量化、溯源、AI 摘要和命中高亮。
 */
export interface FileViewerAiOptions {
    enabled?: boolean;
    collectText?: boolean;
    maxTextLength?: number;
    chunkSize?: number;
    chunkOverlap?: number;
}
/**
 * 预览器主题模式。
 *
 * `system` 是默认值，会继续跟随浏览器 `prefers-color-scheme`；
 * 浅色业务系统即使运行在深色操作系统中，也可以显式传 `light`
 * 锁定预览区、工具栏和支持主题切换的渲染器为浅色。
 */
export type FileViewerThemeMode = 'light' | 'dark' | 'system';
export type FileViewerSourceType = 'file' | 'url' | 'empty';
export type FileViewerLifecyclePhase = 'load-start' | 'load-complete' | 'unload-start' | 'unload-complete';
export interface FileViewerLifecycleContext {
    phase: FileViewerLifecyclePhase;
    type: string;
    filename: string;
    source: FileViewerSourceType;
    url?: string;
    file?: File;
    size?: number;
    version: number;
    timestamp: number;
    duration?: number;
    reason?: 'replace' | 'reset' | 'component-unmount';
}
export interface FileViewerLifecycleHooks {
    onLoadStart?: (context: FileViewerLifecycleContext) => void | Promise<void>;
    onLoadComplete?: (context: FileViewerLifecycleContext) => void | Promise<void>;
    onUnloadStart?: (context: FileViewerLifecycleContext) => void | Promise<void>;
    onUnloadComplete?: (context: FileViewerLifecycleContext) => void | Promise<void>;
}
export type FileViewerOperationType = 'download' | 'print' | 'export-html';
/**
 * 当前文档对内置操作的真实可用性。
 *
 * `toolbar` 只表达宿主想不想展示某个按钮；这里表达当前文件类型和渲染器
 * 是否真的能稳定完成该操作。尤其是打印，虚拟表格、播放器、3D 画布、
 * EPUB iframe 等链路无法保证完整分页输出时会主动关闭。
 */
export interface FileViewerOperationAvailability {
    download: boolean;
    print: boolean;
    exportHtml: boolean;
}
export interface FileViewerOperationContext extends Omit<FileViewerLifecycleContext, 'phase'> {
    operation: FileViewerOperationType;
    label: string;
}
export type FileViewerBeforeOperation = (context: FileViewerOperationContext) => boolean | void | Promise<boolean | void>;
/**
 * 预览器通用配置。
 */
export interface FileViewerOptions {
    /**
     * 预览器主题。默认 `system`，即跟随浏览器 `prefers-color-scheme`。
     * 业务系统已有固定浅色/深色 UI 时，建议显式传 `light` 或 `dark`，
     * 避免部分渲染器在系统深色模式下自动切换后和宿主视觉不一致。
     */
    theme?: FileViewerThemeMode;
    watermark?: boolean | FileViewerWatermarkOptions;
    toolbar?: boolean | FileViewerToolbarOptions;
    /**
     * 文档搜索能力配置。设为 `false` 可关闭内置搜索/高亮扫描；
     * 默认启用公开 API，业务 UI 可通过组件 ref 调用 `searchDocument()`。
     */
    search?: boolean | FileViewerSearchOptions;
    /**
     * AI 友好能力配置。预览器只提供文本切片、锚点和溯源上下文，不绑定模型服务。
     */
    ai?: boolean | FileViewerAiOptions;
    archive?: FileViewerArchiveOptions;
    pdf?: FileViewerPdfOptions;
    docx?: FileViewerDocxOptions;
    typst?: FileViewerTypstOptions;
    cad?: FileViewerCadOptions;
    /**
     * 文档加载/卸载生命周期钩子。直接使用 Vue 组件时可以传函数；
     * iframe 集成时同名事件会通过 `postMessage` 向宿主发送。
     */
    hooks?: FileViewerLifecycleHooks;
    /**
     * 内置操作按钮执行前的全局前置钩子。返回 `false` 时会取消本次操作。
     */
    beforeOperation?: FileViewerBeforeOperation;
}
/**
 * DOCX 渲染配置。
 *
 * 默认使用 Web Worker 承载 `docx-preview` 的 ZIP/XML 解析和 HTML 构建，
 * 主线程只负责把最终 HTML 挂载到预览区并执行缩放、打印等交互适配。
 * 这样可以保持 docxjs 的真实渲染结果，同时减少复杂 DOCX 首屏卡顿。
 */
export interface FileViewerDocxOptions {
    /**
     * 是否启用 DOCX Worker 渲染链路。默认开启。
     * 极少数 CSP 或低版本浏览器不允许内联 Worker 时，可设为 `false`
     * 回退到 docx-preview 原生主线程渲染。
     */
    worker?: boolean;
    /**
     * 是否把 Worker 返回的 docx-preview HTML 按页面分批挂载。默认开启。
     * 它不改变渲染器，只是避免一次性插入长文档 DOM 时阻塞首屏。
     */
    progressive?: boolean;
    /**
     * DOCX Worker 最大等待时间，单位毫秒，默认 15000。
     *
     * 少量复杂 Word 文件会触发浏览器 Worker DOM 兼容边界，设置超时可以避免
     * 永久停留在 loading；超时后仍会回到 docx-preview 原生主线程渲染。
     * 传入 0 或负数可关闭超时保护。
     */
    workerTimeout?: number;
}
/**
 * 导出/打印模式。
 */
export type FileRenderExportMode = 'export' | 'print';
/**
 * 渲染器自定义导出上下文。
 *
 * 大多数格式可以直接克隆当前 DOM；PDF 这类虚拟滚动或按需渲染格式
 * 需要在打印前重新生成完整页面，因此允许渲染器注册专属适配器。
 */
export interface FileRenderExportOptions {
    mode: FileRenderExportMode;
    title: string;
}
/**
 * 渲染器专属导出适配器。
 */
export interface FileRenderExportAdapter {
    /**
     * 当前渲染器是否允许打印。未设置时由文件类型能力矩阵兜底判断。
     */
    print?: boolean;
    /**
     * 当前渲染器是否允许导出渲染后的 HTML。
     */
    exportHtml?: boolean;
    /**
     * 是否把当前页面的全局 style/link 一并带进导出窗口。
     *
     * 专属分页适配器通常会自行输出必要样式，应关闭该项，避免宿主应用的
     * `height: 100vh`、`overflow: hidden` 等布局样式干扰浏览器分页打印。
     */
    includeDocumentStyles?: boolean;
    beforeSnapshot?: () => Promise<void> | void;
    /**
     * 打印专用样式。适合 PDF / Word 等有真实页面尺寸的格式输出 `@page size`，
     * 避免浏览器默认纸张或外层容器把页面缩放、裁切。
     */
    printStyle?: string | ((options: FileRenderExportOptions) => Promise<string> | string);
    toHtml?: (options: FileRenderExportOptions) => Promise<string> | string;
}
/**
 * 渲染器可选上下文。
 *
 * 部分格式需要知道原始 URL 的目录，例如 glTF / DAE / FBX 会继续加载
 * 同目录的贴图、bin 或材质文件。没有这些上下文时，渲染器仍应尽力预览
 * 单文件内容，并在资源缺失时给出明确错误。
 */
export interface FileRenderContext {
    filename?: string;
    url?: string;
    /**
     * 渲染器可以直接读取的远端 URL。当前主要给 PDF.js 使用，
     * 让同源 PDF 不必先整包下载为 Blob，就可以边拉取边建页。
     */
    streamUrl?: string;
    options?: FileViewerOptions;
    registerExportAdapter?: (adapter: FileRenderExportAdapter | null) => void;
    /**
     * 渲染器已经写入可读的渐进式内容，但完整高保真渲染仍在继续。
     * 主入口收到后可以先露出内容，避免用户长时间只看到 Loading。
     */
    onProgressiveRender?: () => void;
}
/**
 * 文件处理逻辑，用于声明具体格式的异步渲染器。
 *
 * 渲染器只在命中文件扩展名时被按需加载，避免 PDF、OFD、Typst、压缩包、
 * 邮件、CAD、3D、Office 等重型依赖进入无关格式的首屏路径。
 *
 * @param buffer 二进制缓存
 * @param target 目标dom
 * @param type 目标扩展名。部分渲染器会用它选择语言、容错策略或格式提示。
 * @param context 原始文件名、远端 URL 等补充上下文。
 */
export type FileHandler = (buffer: ArrayBuffer, target: HTMLDivElement, type?: string, context?: FileRenderContext) => Promise<Rendered>;
/**
 * 文件处理器组合。
 */
export interface FileHandlerComposite {
    accepts: Array<string>;
    handler: FileHandler;
}
