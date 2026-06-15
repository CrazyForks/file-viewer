import { ArchiveEntryView } from './shared';
/**
 * Worker 不可用时的兼容兜底。
 *
 * 主链路仍然使用 libarchive.js Worker 覆盖更多压缩格式；这里仅在 Worker
 * 路径、MIME、CSP 或移动端 WebView 限制导致初始化失败时接管 ZIP/TAR/GZIP
 * 这些最常见格式，避免用户停在 loading。
 */
export declare const loadArchiveEntriesWithoutWorker: (data: ArrayBuffer, filename: string) => Promise<ArchiveEntryView[] | null>;
