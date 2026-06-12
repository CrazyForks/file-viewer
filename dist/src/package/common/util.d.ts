type ReadResult = string | ArrayBuffer | undefined | null;
export declare function readBuffer(file: File): Promise<ReadResult>;
export declare function readDataURL(buffer: ArrayBuffer): Promise<string>;
export declare function readText(buffer: ArrayBuffer): Promise<string>;
export {};
