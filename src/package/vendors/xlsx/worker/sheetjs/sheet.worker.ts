import type { WorkBook } from 'styled-exceljs'
import { read, utils } from 'styled-exceljs'
import SheetJsModel from './SheetJsModel'
import type { SheetDefinition } from '../type'

const ctx: Worker = self as any

const context = {
  workbook: null as null | WorkBook,
  sheets: [] as SheetDefinition[]
}

const readOptions = {
  type: 'array' as const,
  dense: true,
  cellDates: true,
  cellStyles: true,
  browserPixels: true,
  drawings: true,
  validateMerges: true
}

ctx.onmessage = async (message) => {
  const { data: { type, payload = {} } } = message
  const {
    sheet,
    workbook,
    startRow = 0,
    pageSize = 500,
    sessionId = 0
  } = payload

  switch (type) {
    case 'parseWorkbook':
      parseWorkbook(workbook)
      break
    case 'parseSheet':
      parseSheet(sheet, startRow, pageSize, sessionId)
      break
  }
}

ctx.onerror = (err) => {
  console.error(err)
}

const parseWorkbook = (data: ArrayBuffer) => {
  try {
    // styled-exceljs 是唯一 Excel 解析入口，XLS / XLSX / XLSB 都走同一套样式模型。
    context.workbook = read(data, readOptions)
    parseSheets()
  } catch (error) {
    ctx.postMessage({
      type: 'parseError',
      payload: {
        message: error instanceof Error ? error.message : String(error)
      }
    })
  }
}

const parseSheet = (sheet: number, startRow = 0, pageSize = 500, sessionId = 0) => {
  try {
    const workbook = context.workbook
    const sheetName = context.sheets.find(item => item.id === sheet)?.name
    if (workbook?.Sheets && sheetName) {
      const worksheet = workbook.Sheets[sheetName]
      if (worksheet) {
        const sheetMeta = context.sheets.find(item => item.id === sheet)
        const sheetModel = SheetJsModel.create(worksheet, {
          startRow,
          pageSize,
          totalRows: sheetMeta?.rowCount,
          totalCols: sheetMeta?.colCount
        })
        const windowData = sheetModel.toObject()
        const structure = startRow === 0 ? sheetModel.structure : undefined

        ctx.postMessage({
          type: 'parseSheet',
          payload: {
            sessionId,
            sheet,
            sheetData: structure ? {
              ...windowData,
              structure
            } : windowData
          }
        })
      }
    }
  } catch (error) {
    ctx.postMessage({
      type: 'parseError',
      payload: {
        sessionId,
        startRow,
        message: error instanceof Error ? error.message : String(error)
      }
    })
  }
}

const parseSheets = () => {
  const workbook = context.workbook
  if (workbook?.SheetNames) {
    const workbookSheets = workbook.Workbook?.Sheets || []
    context.sheets = workbook.SheetNames.reduce<SheetDefinition[]>((result, name, sourceIndex) => {
      const worksheet = workbook.Sheets[name]
      const ref = worksheet?.['!ref']
      if (!ref) {
        return result
      }
      const range = utils.decode_range(ref)
      result.push({
        id: result.length,
        name,
        hidden: !!workbookSheets[sourceIndex]?.Hidden,
        rowCount: range.e.r + 1,
        colCount: range.e.c + 1
      })
      return result
    }, [])
    ctx.postMessage({ type: 'sheets', payload: { sheets: context.sheets } })
  }
}
