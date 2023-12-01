import type { CellModel, Range, Worksheet } from 'exceljs/index.d'
import type { CellMerge, SheetColumn, SheetModel } from '../type'
import { alignToClass, camelCase, captain, fixMatrix, getColor, valueOf, valuesOf } from './util'
import { context } from './context'

// 边框类型
export const borders: Array<BorderKey> = ['left', 'right', 'top', 'bottom']

type BorderKey = 'left' | 'right' | 'top' | 'bottom'

const cellKey = (row: number, col: number) => {
  return `${row}-${col}`
}

const getCellStyle = (cell: CellModel) => {
  const { style: { border, fill, font } } = cell
  const style: any = {}
  const themeColors = context.themeColors
  if (font) {
    if (font.bold) style.fontWeight = 'bold'
    if (font.size) style.fontSize = `${font.size}px`
    if (font.color) {
      style.color = getColor(font.color, themeColors)
    }
  }
  if (fill) {
    if ('bgColor' in fill && fill.bgColor) {
      style.backgroundColor = getColor(fill.bgColor, themeColors)
    }
    if ('fgColor' in fill && !style.backgroundColor) {
      style.backgroundColor = getColor(fill.fgColor, themeColors)
    }
  }
  if (border) {
    borders.map(key => ({ key, value: border[key] })).filter(v => v.value).forEach(v => {
      const { key, value } = v
      const prefix = `border${captain(key)}`
      if (value?.style === 'thin') {
        style[`${prefix}Width`] = '0.5px'
      } else {
        style[`${prefix}Width`] = '1px'
      }
      style[`${prefix}Style`] = 'solid'
      style[`${prefix}Color`] = '#000'
    })
  }
  // 启用了内联css，直接赋值
  if ('css' in cell) {
    const { css } = cell as any
    Object.keys(css).forEach((key: string) => {
      const k = camelCase(key)
      style[k] = css[key]
    })
  }
  return style
}

/**
 * sheet数据表数据
 */
export default class ExcelJsModel implements SheetModel {

  private readonly _ws: Worksheet

  private _defaults: undefined | { rowHeight: number, colWidth: number }

  private _data: undefined | string[][]

  private _cell: undefined | { string: { className: string, style: any } }

  private _merge: undefined | Array<CellMerge>

  private _rowHeights: undefined | number | number[]

  private _colWidths: undefined | number | number[]

  private _columns: undefined | Array<SheetColumn>

  public static create(ws: Worksheet) {
    return new ExcelJsModel(ws)
  }

  private constructor(ws: Worksheet) {
    this._ws = ws
  }

  private get ws() {
    return this._ws
  }

  public get defaults() {
    return this._defaults ?? (this._defaults = this.getDefaults())
  }

  public get data() {
    return this._data ?? (this._data = this.getData())
  }

  public get cell() {
    return this._cell ?? (this._cell = this.getCell())
  }

  public get merge() {
    return this._merge ?? (this._merge = this.getMerge())
  }

  public get rowHeights() {
    return this._rowHeights ?? (this._rowHeights = this.getRowHeights())
  }

  public get colWidths() {
    return this._colWidths ?? (this._colWidths = this.getColWidths())
  }

  public get columns() {
    return this._columns ?? (this._columns = this.getColumns())
  }

  // 默认值
  private getDefaults() {
    const properties = this.ws.properties
    return {
      rowHeight: properties?.defaultRowHeight || 20,
      colWidth: (properties?.defaultColWidth || 10) * 7
    }
  }

  // 表格数据
  private getData() {
    const sheet = this.ws
    const result: string[][] = sheet.getRows(1, sheet.actualRowCount)?.map(row => {
      return valuesOf(row)?.map(valueOf)
    }) || [[]]
    return fixMatrix(result, this.columns.length || 0)
  }

  // 单元格
  private getCell() {
    const sheet = this.ws
    return sheet.getRows(1, sheet.actualRowCount)?.reduce((result: any, row, ri) => {
      const model = row.model || { cells: [] }
      model.cells?.filter(cell => cell && cell.style).forEach((cell, ci) => {
        const { alignment } = cell.style
        result[cellKey(ri, ci)] = {
          ...(alignment ? { className: alignToClass(alignment) } : {}),
          style: getCellStyle(cell)
        }
      })
      return result
    }, {})
  }

  // 单元格合并选项
  private getMerge(): Array<CellMerge> {
    const sheet: any = this.ws
    const { _merges: merges }: { _merges: { string: Range } } = sheet
    return Object.values(merges).map(merge => {
      const { top, left, bottom, right } = merge
      // 构建区域
      return {
        row: top - 1,
        col: left - 1,
        rowspan: bottom - top + 1,
        colspan: right - left + 1
      }
    })
  }

  // 行高
  private getRowHeights() {
    const { rowHeight } = this.defaults
    const worksheet = this.ws
    const rows = worksheet.getRows(1, worksheet.actualRowCount)
    const heights = rows?.map(row => row.height || rowHeight) || []
    if (heights.length === 1) {
      return heights[0]
    } else if (heights.length) {
      return heights
    }
    return rowHeight
  }

  // note excel中列宽以字符长度为单位，1个字符≈7px
  private getColWidths() {
    const { colWidth } = this.defaults
    const widths = this.ws.columns.map(item => item.width ? item.width * 7 : colWidth)
    if (widths.length === 1) {
      return widths[0]
    } else if (widths.length) {
      return widths
    }
    return colWidth
  }

  // 内部使用的计算属性，列表
  private getColumns(): Array<SheetColumn> {
    return this.ws.columns.map(item => ({
      key: item.number ?? 0,
      title: item.letter ?? '',
      editor: false,
      className: alignToClass(item.alignment || {}),
      renderer: 'styleRender'
    }))
  }

  public toObject(): object {
    const { defaults, data, cell, merge, rowHeights, colWidths, columns } = this
    return {
      defaults,
      data,
      cell,
      merge,
      rowHeights,
      colWidths,
      columns
    }
  }
}

/*
// 边框设置，设置边框属性
const border = computed(() => {
  return ws.value?.getRows(1, ws.value.actualRowCount)?.flatMap((row, ri) => {
    const model = row.model || { cells: [] }
    return model.cells?.map((cell, ci) => {
      if (cell.style && cell.style.border) {
        const model: any = cell.style.border
        const content = borders.filter(key => key in model && model[key]).reduce((result, key) => {
          const border: Partial<Border> = model[key]
          result[key] = {
            width: 1,
            color: getColor(border.color, context.themeColors) || '#000000'
          }
          return result
        }, {

        } as { [key: string]: { width: number, color: string } })
        return {
          row: ri,
          col: ci,
          ...content
        }
      }
    }).filter(i => i)
  })
})
*/
