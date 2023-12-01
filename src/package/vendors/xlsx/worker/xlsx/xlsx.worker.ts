import type { tNode } from 'txml/dist/txml'
import { filter, parse } from 'txml/dist/txml'
import ExcelJsModel from './ExcelJsModel'
import { context } from './context'
import ExcelJS from 'exceljs'

const ctx: Worker = self as any

ctx.onmessage = async (message) => {
  const { data: { type, payload: { sheet, workbook } } } = message
  switch (type) {
    case 'parseWorkbook':
      await parseWorkbook(workbook)
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
const parseWorkbook = async (data: ArrayBuffer) => {
  // 初始化工作薄
  context.workbook = await new ExcelJS.Workbook().xlsx.load(data)
  // 紧接着初始化sheets
  parseSheets()
  // 然后初始化主题
  parseThemes(context.workbook?.model?.themes)
}

const parseSheet = (sheet: number) => {
  const workbook = context.workbook
  const sheets = context.sheets
  if (workbook?.getWorksheet && sheets.length) {
    const worksheet = workbook.getWorksheet(sheet)
    const sheetData = ExcelJsModel.create(worksheet).toObject()
    ctx.postMessage({
      type: 'parseSheet',
      payload: {
        sheetData
      }
    })
  }
}

const parseSheets = () => {
  const workbook = context.workbook
  if (workbook?.worksheets) {
    context.sheets = workbook.worksheets.filter(sheet => sheet.rowCount).map(sheet => ({
      id: sheet.id,
      name: sheet.name
    }))
    ctx.postMessage({
      type: 'sheets',
      payload: {
        sheets: context.sheets
      }
    })
  }
  return []
}

// 解析多个主题，最终只取得最后一个
const parseThemes = (themes: string[] | { string: string }) => {
  if (Array.isArray(themes)) {
    themes.forEach(parseTheme)
  } else if (themes) {
    Object.values(themes).forEach(parseTheme)
  }
}

/**
 * 解析主题xml
 * @param xml
 */
const parseTheme = (xml: string) => {
  const doc = parse(xml)
  const elements = filter(doc, (node: tNode) => node.tagName === 'a:clrScheme')
  const colorNode = elements[0]
  if (colorNode) {
    const nodes = colorNode.children
    const colors: any = {}
    for (let i = 0; i < nodes.length; i++) {
      const element = nodes[i]
      if (!element) continue
      const content = element.children[0]
      if (!content) continue
      let value: string | null
      if (content.tagName === 'a:sysClr') {
        value = content.attributes.lastClr
      } else {
        value = content.attributes.val
      }
      colors[element.tagName.substring(2)] = value || '000000'
    }
    context.themeColors = colors
  }
}


export default ctx
