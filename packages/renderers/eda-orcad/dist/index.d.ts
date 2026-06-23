export declare const ORCAD_CFB_MAGIC: readonly [208, 207, 17, 224, 161, 177, 26, 225];
export declare const isOrcadCompoundFile: (bytes: Uint8Array) => boolean;
export declare const cleanupOrcadText: (text: string) => string;
export declare const looksLikeOrcadText: (bytes: Uint8Array) => boolean;
export declare const decodeOrcadSample: (bytes: Uint8Array) => string;
export declare const createOrcadHexPreview: (bytes: Uint8Array) => string;
export declare const extractOrcadAsciiStrings: (bytes: Uint8Array) => string[];
export declare const extractOrcadUtf16Strings: (bytes: Uint8Array) => string[];
export declare const collectOrcadStrings: (chunks: Uint8Array[], maxStrings?: number) => string[];
