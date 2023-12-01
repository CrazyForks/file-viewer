// 主题类型
import type { Workbook } from 'exceljs/index.d'
import type { SheetDefinition } from '../type'

const themeTypes = ['lt1', 'dk1', 'lt2', 'dk2', 'accent1', 'accent2', 'accent3', 'accent4', 'accent5', 'accent6']
// 主题颜色
let themeColors: string[] = []

let workbook: undefined | Workbook
let sheets: SheetDefinition[] = []

// 解析结果缓存
export const context = {
  // 使用映射的结果写入
  set themeColors(colors: any) {
    themeColors = themeTypes.map((name: string) => colors[name])
  },
  get themeColors() {
    return themeColors
  },
  get workbook() {
    return workbook
  },
  set workbook(wb) {
    workbook = wb
  },
  get sheets() {
    return sheets
  },
  set sheets(value) {
    sheets = value
  }
}
