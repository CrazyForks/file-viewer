import { FileViewerWatermarkOptions } from '@file-viewer/core';
export declare const useViewerWatermark: (getWatermark: () => boolean | FileViewerWatermarkOptions | undefined) => {
    normalizedWatermark: import('vue').ComputedRef<FileViewerWatermarkOptions | null>;
    watermarkStyle: import('vue').ComputedRef<import('@file-viewer/core').FileViewerWatermarkStyle | undefined>;
    watermarkInlineStyle: import('vue').ComputedRef<string>;
};
