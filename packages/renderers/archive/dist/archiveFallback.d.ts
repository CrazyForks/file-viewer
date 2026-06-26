import { type ArchiveEntryView } from './archiveShared.js';
export declare const isLikelyEncryptedArchive: (data: ArrayBuffer, filename: string) => boolean;
/**
 * Worker fallback for constrained browsers, temporary local servers, and
 * mobile WebViews. The main libarchive path still covers broader formats;
 * this covers common ZIP/TAR/GZIP archives without an extra static Worker.
 */
export declare const loadArchiveEntriesWithoutWorker: (data: ArrayBuffer, filename: string) => Promise<ArchiveEntryView[] | null>;
