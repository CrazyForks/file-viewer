import { Column, ConfigType } from 'e-virt-table';
import { SheetModel } from './worker/type';
import { CellStyleCache, SheetDefaults, VirtualSheetState } from './XlsxTable.state';
export declare const INDEX_COLUMN_WIDTH = 68;
export declare const HEADER_HEIGHT = 34;
interface TableConfigOptions {
    hostHeight: number;
    sheetDefaults: SheetDefaults;
    virtualState: VirtualSheetState;
    zoomScale?: number;
}
export declare const getRowHeight: (heights: number | number[] | undefined, index: number, fallback: number) => number;
export declare const normalizeRowHeight: (height: number | undefined, fallback: number) => number;
export declare const detectIndexOffset: (ws: SheetModel) => 0 | 1;
export declare const buildColumns: (ws: SheetModel) => {
    columns: Column[];
    dataKeys: string[];
};
export declare const getDisplayColumns: (columns: Column[], zoomScale?: number) => Column[];
export declare const normalizeCellStyle: (meta: {
    className?: string;
    style: any;
} | undefined) => CellStyleCache | undefined;
export declare const createTableConfig: ({ hostHeight, sheetDefaults, virtualState, zoomScale }: TableConfigOptions) => ConfigType;
export {};
