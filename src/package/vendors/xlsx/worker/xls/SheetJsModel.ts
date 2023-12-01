import type { Range, WorkSheet } from 'xlsx'
import { utils } from 'xlsx'
import type { CellMerge, SheetModel } from '../type'

export const defaults = {
  rowHeight: 20,
  colWidth: 70
}

/**
 * sheet数据表数据
 */
export default class SheetJsModel implements SheetModel {

  private readonly _ws: WorkSheet

  private static readonly defaults = defaults

  private _data: undefined | string[][]

  private _merge: undefined | Array<CellMerge>

  private _rowHeights: undefined | number | number[]

  private _colWidths: undefined | number | number[]

  private readonly range: Range

  public static create(ws: WorkSheet) {
    return new SheetJsModel(ws)
  }

  private constructor(ws: WorkSheet) {
    this._ws = ws
    const { '!ref': refs } = ws
    this.range = utils.decode_range(refs || 'A1')
  }

  private get ws() {
    return this._ws
  }

  public get defaults() {
    return SheetJsModel.defaults
  }

  public get data() {
    return this._data ?? (this._data = this.getData())
  }

  public get cell() {
    return {}
  }

  public get merge() {
    return this._merge ?? (this._merge = this.getMerge())
  }

  public get columns() {
    return []
  }

  public get rowHeights() {
    return this._rowHeights ?? (this._rowHeights = this.getRowHeights())
  }

  public get colWidths() {
    return this._colWidths ?? (this._colWidths = this.getColWidths())
  }

  // 表格数据
  private getData(): string[][] {
    const sheet = this.ws
    if (sheet) {
      return utils.sheet_to_json(sheet, { header: 1, defval: '' })
    }
    return []
  }

  // 单元格合并选项
  private getMerge(): Array<CellMerge> {
    const sheet: WorkSheet = this.ws
    const { '!merges': merges = [] } = sheet

    return merges.map(merge => {
      const { r: top, c: left } = merge.s
      const { r: bottom, c: right } = merge.e
      // 构建区域
      return {
        row: top,
        col: left,
        rowspan: bottom - top + 1,
        colspan: right - left + 1
      }
    })
  }

  // 行高
  private getRowHeights() {
    const { rowHeight } = this.defaults
    const worksheet = this.ws
    const { '!rows': rows = [] } = worksheet
    const { s: { r: startRow }, e: { r: endRow } } = this.range
    const heights: number[] = []
    if (rows.length) {
      for (let i = startRow; i <= endRow; i++) {
        const height = rows[i]?.hpx
        if (height) {
          heights[i] = height
        }
      }
    }
    return heights.length ? heights : rowHeight;
  }

  // 直接取得像素值可能存在未知情况，需要进一步确定
  private getColWidths() {
    const { colWidth } = this.defaults
    const worksheet = this.ws
    const { '!cols': cols = [] } = worksheet
    const { s: { c: startCol }, e: { c: endCol } } = this.range
    const widths = []
    if (cols.length) {
      for (let i = startCol; i <= endCol; i++) {
        const height = cols[i]?.wpx
        if (height) {
          widths[i] = height
        }
      }
    }
    return widths.length ? widths : colWidth
  }

  public toObject(): object {
    const { defaults, data, merge, rowHeights, colWidths } = this
    return {
      defaults,
      data,
      merge,
      rowHeights,
      colWidths
    }
  }
}
