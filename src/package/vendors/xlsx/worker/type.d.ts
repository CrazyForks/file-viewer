export declare interface CellMerge {
  row: number,
  col: number,
  rowspan: number,
  colspan: number
}

export declare interface SheetImage {
  id: string,
  src: string,
  contentType?: string,
  left: number,
  top: number,
  width: number,
  height: number,
  row: number,
  col: number
}

export declare interface SheetStructure {
  merge?: CellMerge[],
  colWidths?: number | number[],
  rowHeights?: number | number[],
  columns?: SheetColumn[],
  images?: SheetImage[]
}

export declare interface SheetColumn {
  key: number,
  title: string,
  hidden?: boolean,
  editor: false,
  className: string,
  renderer: 'styleRender'
}

export declare interface SheetDefinition {
  id: number,
  name: string,
  hidden?: boolean,
  rowCount?: number,
  colCount?: number
}

export declare interface SheetWindow {
  startRow: number,
  endRow: number,
  pageSize: number,
  totalRows: number,
  totalCols: number
}

export declare interface SheetModel {

  /**
   * 获取默认值
   */
  get defaults(): any;

  /**
   * 获取数据
   */
  get data(): string[][];

  /**
   * 获取单元格
   */
  get cell(): { [key: string]: Object<any> };

  /**
   * 获取单元格合并
   */
  get merge(): CellMerge[];

  /**
   * 获取行高
   */
  get rowHeights(): number | number[];

  /**
   * 获取列宽
   */
  get colWidths(): number | number[];

  /**
   * 获取列属性
   */
  get columns(): SheetColumn[];

  /**
   * 获取整表级结构信息。
   * 列宽和合并单元格不应该被窗口切片截断，所以单独下发。
   */
  readonly structure?: SheetStructure;

  /**
   * 获取当前预览窗口
   */
  readonly meta?: SheetWindow;
}
