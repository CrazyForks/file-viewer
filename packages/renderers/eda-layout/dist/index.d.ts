export type EdaLayoutFormat = 'gdsii' | 'oasis';
export interface EdaPoint {
    x: number;
    y: number;
}
export interface EdaLayoutElement {
    kind: 'boundary' | 'path' | 'text' | 'sref' | 'aref';
    structure: string;
    layer?: number;
    datatype?: number;
    text?: string;
    reference?: string;
    width?: number;
    xy: EdaPoint[];
}
export interface EdaLayoutBounds {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
}
export interface EdaLayoutPreview {
    format: EdaLayoutFormat;
    libraryName?: string;
    userUnit?: number;
    databaseUnit?: number;
    structureCount: number;
    structures: string[];
    elements: EdaLayoutElement[];
    bounds?: EdaLayoutBounds;
    warnings: string[];
}
export interface EdaOasisInspection {
    format: 'oasis';
    magicFound: boolean;
    byteLength: number;
    warnings: string[];
}
export declare const parseGdsLayout: (bytes: Uint8Array) => EdaLayoutPreview | undefined;
export declare const inspectOasisLayout: (bytes: Uint8Array) => EdaOasisInspection;
