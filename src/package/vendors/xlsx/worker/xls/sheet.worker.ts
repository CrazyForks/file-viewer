import type { WorkBook } from 'xlsx'
import { read } from 'xlsx'
import SheetJsModel from './SheetJsModel'
import type { SheetDefinition } from '../type'

const ctx: Worker = self as any

// 上下文缓存
const context = {
  workbook: null as null | WorkBook,
  sheets: [] as SheetDefinition[]
}

ctx.onmessage = async (message) => {
  const { data: { type, payload: { sheet, workbook } } } = message
  switch (type) {
    case 'parseWorkbook':
      parseWorkbook(workbook)
      break
    case 'parseSheet':
      parseSheet(sheet)
      break
  }
}

ctx.onerror = (err) => {
  console.error(err)
}

// 解析工作簿
const parseWorkbook = (data: ArrayBuffer) => {
  // 初始化工作簿
  context.workbook = read(data, { type: 'buffer' })
  console.log(context.workbook)
  // 紧接着初始化sheets
  parseSheets()
}

// 解析工作表
const parseSheet = (sheet: number) => {
  const workbook = context.workbook
  const sheetName = context.sheets[sheet]?.name
  if (workbook?.Sheets && sheetName) {
    const worksheet = workbook.Sheets[sheetName]
    if (worksheet) {
      const data = SheetJsModel.create(worksheet).toObject()
      ctx.postMessage({ type: 'parseSheet', payload: { sheetData: data } })
    }
  }
}

// 解析工作表们
const parseSheets = () => {
  const workbook = context.workbook
  if (workbook?.SheetNames) {
    context.sheets = workbook.SheetNames.map((name, index) => ({ id: index, name }))
    ctx.postMessage({ type: 'sheets', payload: { sheets: context.sheets } })
  }
}
