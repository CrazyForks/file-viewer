import type { App } from 'vue'

/**
 * 渲染器返回的 Vue 包装实例。
 *
 * Vue3 渲染器直接返回 `App`，少量兼容渲染器会返回只暴露 `$el`
 * 与 `unmount()` 的轻量包装对象。
 */
export interface AppWrapper {
  $el: Node,

  unmount(): void
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
 * 预览器内置操作栏配置。
 */
export interface FileViewerToolbarOptions {
  download?: boolean;
  print?: boolean;
  exportHtml?: boolean;
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

export type FileViewerBeforeOperation = (
  context: FileViewerOperationContext
) => boolean | void | Promise<boolean | void>;

/**
 * 预览器通用配置。
 */
export interface FileViewerOptions {
  watermark?: boolean | FileViewerWatermarkOptions;
  toolbar?: boolean | FileViewerToolbarOptions;
  archive?: FileViewerArchiveOptions;
  pdf?: FileViewerPdfOptions;
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
}

/**
 * 文件处理逻辑，用于声明具体格式的异步渲染器。
 *
 * 渲染器只在命中文件扩展名时被按需加载，避免 PDF、OFD、压缩包、
 * 邮件、CAD、3D、Office 等重型依赖进入无关格式的首屏路径。
 *
 * @param buffer 二进制缓存
 * @param target 目标dom
 * @param type 目标扩展名。部分渲染器会用它选择语言、容错策略或格式提示。
 * @param context 原始文件名、远端 URL 等补充上下文。
 */
export type FileHandler = (
  buffer: ArrayBuffer,
  target: HTMLDivElement,
  type?: string,
  context?: FileRenderContext
) => Promise<Rendered>;

/**
 * 文件处理器组合。
 */
export interface FileHandlerComposite {

  // 当前处理器可接受的扩展名列表，必须使用小写。
  accepts: Array<string>;
  // 实际执行预览渲染的异步处理器。
  handler: FileHandler
}
