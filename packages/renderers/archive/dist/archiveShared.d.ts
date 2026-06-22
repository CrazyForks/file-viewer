export declare const ARCHIVE_PREVIEWABLE_EXTENSIONS: readonly string[];
export interface ArchiveEntryView {
    id: string;
    path: string;
    name: string;
    extension: string;
    size: number;
    lastModified?: number;
    depth: number;
    previewable: boolean;
    compressedFile: {
        name: string;
        size: number;
        lastModified?: number;
        extract(): Promise<File>;
    };
}
export declare const getArchiveEntryExtension: (name: string) => string;
export declare const isArchiveExtension: (extension: string) => boolean;
export declare const isPreviewableArchiveEntry: (name: string) => boolean;
export declare const formatArchiveBytes: (value: number) => string;
export declare const flattenArchiveObject: (input: Record<string, unknown>, prefix?: string) => ArchiveEntryView[];
export declare const createArchiveCacheKey: (archiveName: string, archiveSize: number, entry: ArchiveEntryView) => string;
