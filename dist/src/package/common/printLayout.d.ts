export interface PrintPageSize {
    width: number;
    height: number;
}
interface ApplyPrintPageSizeOptions {
    heightMode?: 'fixed' | 'min';
}
interface BuildPrintPageStyleOptions extends PrintPageSize {
    selector: string;
    heightMode?: 'fixed' | 'min';
}
export declare const formatCssPixels: (value: number) => string;
export declare const getElementPrintPageSize: (element: HTMLElement, fallback?: Partial<PrintPageSize>) => PrintPageSize;
export declare const applyPrintPageSize: (element: HTMLElement, size: PrintPageSize, options?: ApplyPrintPageSizeOptions) => void;
export declare const buildPrintPageStyle: ({ selector, width, height, heightMode }: BuildPrintPageStyleOptions) => string;
export {};
