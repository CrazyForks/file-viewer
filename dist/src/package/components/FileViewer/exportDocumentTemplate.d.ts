export interface BuildExportHtmlDocumentOptions {
    contentHtml: string;
    includeDocumentStyles?: boolean;
    printStyle?: string;
    title: string;
    watermarkInlineStyle?: string;
}
export declare const collectDocumentStyles: () => string;
export declare const buildExportHtmlDocument: ({ contentHtml, includeDocumentStyles, printStyle, title, watermarkInlineStyle }: BuildExportHtmlDocumentOptions) => string;
