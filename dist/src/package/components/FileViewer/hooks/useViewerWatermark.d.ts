import { FileViewerWatermarkOptions } from '../../../../../package/common/type';
export declare const useViewerWatermark: (getWatermark: () => boolean | FileViewerWatermarkOptions | undefined) => {
    normalizedWatermark: import('vue').ComputedRef<FileViewerWatermarkOptions | null>;
    watermarkStyle: import('vue').ComputedRef<{
        backgroundImage: string;
    } | undefined>;
    watermarkInlineStyle: import('vue').ComputedRef<string>;
};
