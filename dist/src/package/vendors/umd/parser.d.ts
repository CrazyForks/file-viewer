export type UmdBookKind = 'text' | 'comic' | 'mixed' | 'unknown';
export interface UmdImage {
    bytes: Uint8Array;
    extension: string;
    id: string;
    mimeType: string;
}
export interface UmdChapter {
    content: string;
    end: number;
    id: string;
    images: UmdImage[];
    start: number;
    title: string;
}
export interface UmdBook {
    author: string;
    category: string;
    chapters: UmdChapter[];
    contentLength: number;
    cover?: UmdImage;
    kind: UmdBookKind;
    publishedAt: string;
    publisher: string;
    rawType: number;
    title: string;
    vendor: string;
    warnings: string[];
}
export declare const parseUmdBook: (buffer: ArrayBuffer) => UmdBook;
