export declare interface CellMerge {
  row: number,
  col: number,
  rowspan: number,
  colspan: number
}

export declare interface SheetColumn {
  key: number,
  title: string,
  editor: false,
  className: string,
  renderer: 'styleRender'
}

export declare interface SheetDefinition {
  id: number,
  name: string
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
}
