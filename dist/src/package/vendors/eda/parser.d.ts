export type EdaFileType = 'olb' | 'dra';
export type EdaParserMode = 'cfb' | 'binary';
export type EdaStreamKind = 'text' | 'binary' | 'storage';
export type EdaDomainRole = 'root' | 'library' | 'symbol' | 'footprint' | 'padstack' | 'drawing' | 'metadata' | 'property' | 'geometry' | 'net' | 'unknown';
export type EdaDiagnosticLevel = 'info' | 'warning';
export interface EdaProperty {
    key: string;
    value: string;
    source: string;
}
export interface EdaStreamView {
    path: string;
    name: string;
    size: number;
    kind: EdaStreamKind;
    role: EdaDomainRole;
    sample?: string;
    hex?: string;
    strings: string[];
    properties: EdaProperty[];
}
export interface EdaTreeNode {
    id: string;
    path: string;
    name: string;
    kind: EdaStreamKind;
    role: EdaDomainRole;
    size: number;
    children: EdaTreeNode[];
}
export interface EdaEntity {
    id: string;
    name: string;
    role: EdaDomainRole;
    path: string;
    streamCount: number;
    byteLength: number;
    properties: EdaProperty[];
    pins: string[];
    layers: string[];
    keywords: string[];
    description?: string;
    footprint?: string;
}
export interface EdaStats {
    textStreams: number;
    binaryStreams: number;
    storageEntries: number;
    propertyCount: number;
    stringCount: number;
    symbolCount: number;
    footprintCount: number;
    padstackCount: number;
    confidence: 'high' | 'medium' | 'low';
}
export interface EdaDiagnostic {
    level: EdaDiagnosticLevel;
    code: string;
    message: string;
}
export interface EdaParseResult {
    type: EdaFileType;
    parser: EdaParserMode;
    title: string;
    byteLength: number;
    streamCount: number;
    totalStreamBytes: number;
    streams: EdaStreamView[];
    tree: EdaTreeNode[];
    entities: EdaEntity[];
    metadata: EdaProperty[];
    strings: string[];
    warnings: string[];
    diagnostics: EdaDiagnostic[];
    stats: EdaStats;
}
export declare const parseEdaFile: (buffer: ArrayBuffer, type?: string) => Promise<EdaParseResult>;
