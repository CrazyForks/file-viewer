import { FileRenderExportAdapter } from './type';
/**
 * 这些格式只有专属适配器准备好后才展示打印。
 *
 * 它们的在线预览常依赖分页引擎、虚拟渲染或 Worker 生命周期，直接克隆
 * DOM 很容易只得到当前页或当前视口。
 */
export declare const ADAPTER_PRINT_REQUIRED_EXTENSIONS: string[];
/**
 * 这些格式的预览结果是完整 DOM / SVG / Canvas 截图，解除滚动容器裁切后
 * 可以稳定进入浏览器打印流程。
 */
export declare const DOM_PRINTABLE_EXTENSIONS: string[];
/**
 * 这些格式默认不展示打印按钮，避免导出半截内容。
 *
 * - 表格链路使用虚拟滚动，只渲染局部窗口；
 * - 压缩包/邮件包含嵌套预览，顶层不是单一可打印文档；
 * - EPUB 使用 iframe/连续分页；
 * - 3D、音视频是交互媒体。
 */
export declare const NON_PRINTABLE_EXTENSIONS: string[];
export declare const normalizeFileExtension: (extension: string) => string;
export declare const needsDedicatedPrintAdapter: (extension: string) => boolean;
export declare const isDomPrintableExtension: (extension: string) => boolean;
export declare const isKnownNonPrintableExtension: (extension: string) => boolean;
export declare const resolvePrintAvailability: (extension: string, adapter: FileRenderExportAdapter | null, renderedReady: boolean) => boolean;
