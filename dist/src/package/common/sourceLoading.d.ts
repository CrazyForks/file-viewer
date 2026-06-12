import { FileViewerPdfOptions } from './type';
export declare const DEFAULT_PDF_RANGE_CHUNK_SIZE: number;
export declare const normalizePdfStreamingMode: (mode: FileViewerPdfOptions["streaming"]) => true | false | "same-origin";
export declare const isSameOriginUrl: (url: string, pageHref: string) => boolean;
export declare const shouldStreamPdfUrl: ({ extension, pageHref, streaming, url }: {
    extension: string;
    pageHref: string;
    streaming?: FileViewerPdfOptions["streaming"];
    url: string;
}) => boolean;
