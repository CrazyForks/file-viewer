<script setup lang='ts'>

import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { HotTable } from '@handsontable/vue3'
import Handsontable from 'handsontable'
import { alignToClass, camelCase, captain, fixMatrix, getColor, valueOf, valuesOf } from './util'
import type { Border, Range } from 'exceljs/index.d'
import ExcelJS from 'exceljs'

// 边框类型
const borders: string[] = ['left', 'right', 'top', 'bottom']
// 主题类型
const themeTypes = ['lt1', 'dk1', 'lt2', 'dk2', 'accent1', 'accent2', 'accent3', 'accent4', 'accent5', 'accent6'];

const props = defineProps<{
  workbook: ExcelJS.Workbook,
}>()

const table = ref<typeof HotTable | null>(null)
const sheetIndex = ref(1)

// 表格设置，计算属性
const hotSettings = computed(() => {
  console.log('xxxxx')
  return {
    language: 'zh-CN',
    readOnly: true,
    data: data.value,
    cell: cell.value,
    mergeCells: merge.value,
    columns: columns.value,
    colHeaders: true,
    rowHeaders: true,
    rowHeights: rowHeights.value,
    height: 'calc(100vh - 107px)',
    // contextMenu: true,
    // manualRowMove: true,
    // 关闭外部点击取消选中时间的行为
    outsideClickDeselects: false,
    // fillHandle: {
    //   direction: 'vertical',
    //   autoInsertRow: true
    // },
    // afterSelectionEnd: this.afterSelectionEnd,
    // bindRowsWithHeaders: 'strict',
    licenseKey: 'non-commercial-and-evaluation'
  }
})

// 默认值
const defaults = computed(() => {
  const properties = ws.value?.properties
  return {
    rowHeight: properties?.defaultRowHeight || 20,
    colWidth: (properties?.defaultColWidth || 10) * 7
  }
})

// 表格数据
const data = computed(() => {
  const wsValue = ws.value
  if (!wsValue) return [[]]
  const result: string[][] = wsValue.getRows(1, wsValue.actualRowCount)?.map(row => {
    return valuesOf(row)?.map(valueOf)
  }) || [[]]
  return fixMatrix(result, cols.value?.length || 0)
})

// 单元格
const cell = computed(() => {
  const wsValue = ws.value
  return wsValue?.getRows(1, wsValue.actualRowCount)?.flatMap((row, ri) => {
    const model = row.model || { cells: [] }
    return model.cells?.map((cell, ci) => {
      if (cell.style) {
        const { alignment } = cell.style
        return {
          row: ri,
          col: ci,
          ...(alignment ? { className: alignToClass(alignment) } : {}),
          style: cell.style
        }
      }
    }).filter(i => i)
  })
})

// 单元格合并选项
const merge = computed(() => {
  const sheet: any = ws.value
  if (!sheet) return []
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
})

// 获取工作表
const ws = computed(() => {
  const { workbook: { getWorksheet } = {}, workbook } = props
  if (getWorksheet) {
    const index = sheetIndex.value || sheets.value[0].id
    return workbook.getWorksheet(index)
  }
  return null
})

// 获取所有工作表
const sheets = computed(() => {
  if (props.workbook.worksheets) {
    return props.workbook.worksheets.filter(sheet => sheet.rowCount)
  }
  return []
})

// 获取所有列
const cols = computed(() => {
  return ws.value?.columns.map(item => item.letter)
})

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
        }, {} as { [key: string]: { width: number, color: string } })
        return {
          row: ri,
          col: ci,
          ...content
        }
      }
    }).filter(i => i)
  })
})

// 行高
const rowHeights = computed(() => {
  const { rowHeight } = defaults.value
  const worksheet = ws.value
  if (worksheet) {
    const rows = worksheet.getRows(1, worksheet.actualRowCount)
    const heights = rows?.map(row => row.height || rowHeight) || []
    if (heights.length === 1) {
      return heights[0]
    } else if (heights.length) {
      return heights
    }
  }
  return rowHeight
})

// 上下文对象
const context = {
  themeColors: [] as string[],
  selection: {
    style: {},
    ranges: []
  }
}

// 切换sheet
const handleSheet = (index: number) => {
  if (sheetIndex.value !== index) {
    sheetIndex.value = index
    nextTick(() => {
      methods.updateTable()
    })
  }
}

// 内部使用的计算属性，列表
// note excel中列宽以字符长度为单位，1个字符≈7px
const columns = computed(() => {
  const { colWidth } = defaults.value
  return ws.value?.columns.map(item => ({
    ...(item.width ? { width: item.width * 7 } : { width: colWidth }),
    className: alignToClass(item.alignment || {}),
    renderer: 'styleRender'
  }))
})

// 内部方法
const methods = {
  hotTable() {
    return table.value?.hotInstance
  },
  updateTable() {
    this.hotTable().updateSettings({
      mergeCells: merge.value,
      data: data.value,
      colHeaders: cols.value,
      columns: columns.value,
      cell: cell.value,
      customBorders: border.value
    })
  },
  parseTheme() {
    const themes: any = props.workbook.model.themes
    const parser = new DOMParser()
    const contents: string[] = Object.values(themes)
    contents.forEach((theme) => {
      const doc = parser.parseFromString(theme, 'text/xml')
      const elements = doc.getElementsByTagName('a:clrScheme')
      const colorNode = elements.item(0)
      if (colorNode) {
        const nodes = colorNode.children
        const colors: any = {}
        for (let i = 0; i < nodes.length; i++) {
          const element = nodes.item(i)
          if (!element) continue
          const content = element.children.item(0)
          if (!content) continue
          let value: string | null
          if (content.tagName === 'a:sysClr') {
            value = content.getAttribute('lastClr')
          } else {
            value = content.getAttribute('val')
          }
          colors[element.tagName.substring(2)] = value || '000000'
        }
        // 使用映射的结果写入
        context.themeColors = themeTypes.map((name: string) => colors[name]);
      }
    })
  }
};

// 闭包块，不暴露
(() => {
  // 监听工作表的变更
  watch(() => props.workbook, () => {
    methods.parseTheme()
    methods.updateTable()
  })

  // 注册自定义渲染
  Handsontable
    .renderers
    .registerRenderer('styleRender', (hotInstance, TD, row, col, prop, value, cell) => {
      Handsontable.renderers.getRenderer('text')(hotInstance, TD, row, col, prop, value, cell)
      if (ws.value && cell.style) {

        const { style: { border, fill, font } } = cell
        const style: any = TD.style
        if (font) {
          if (font.bold) style.fontWeight = 'bold'
          if (font.size) style.fontSize = `${font.size}px`
          if (font.color) {
            style.color = getColor(font.color, context.themeColors)
          }
        }
        if (fill) {
          if (fill.bgColor) {
            style.backgroundColor = getColor(fill.bgColor, context.themeColors)
          }
          if (fill.fgColor && !style.backgroundColor) {
            style.backgroundColor = getColor(fill.fgColor, context.themeColors)
          }
        }
        if (border) {
          borders.map(key => ({ key, value: border[key] })).filter(v => v.value).forEach(v => {
            const { key, value: { style: borderStyle } } = v
            const prefix = `border${captain(key)}`
            if (borderStyle === 'thin') {
              style[`${prefix}Width`] = '1px'
            } else {
              style[`${prefix}Width`] = '2px'
            }
            style[`${prefix}Style`] = 'solid'
            style[`${prefix}Color`] = '#000'
          })
        }
      }
      // 启用了内联css，直接赋值
      if (cell.css) {
        const style: any = TD.style
        const { css } = cell
        Object.keys(css).forEach((key: string) => {
          const k = camelCase(key)
          style[k] = css[key]
        })
      }
    })
})()

onMounted(() => {
  methods.parseTheme()
})

</script>

<template>
  <div>
    <div>
      <hot-table ref='table' :settings='hotSettings'></hot-table>
    </div>
    <div class='btn-group'>
      <button
        v-for='sheet in sheets'
        :key='sheet.id'
        style='padding: 0 30px'
        :class='{active: sheetIndex === sheet.id}'
        :type="sheetIndex === sheet.id ? 'primary' : 'default'"
        @click='handleSheet(sheet.id)'
      >
        {{ sheet.name }}
      </button>
    </div>
  </div>
</template>

<style>
.handsontable {
  font-size: 13px;
  color: #222
}
</style>
<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>

.sheet-btn.active {
  background-color: aquamarine;
}

.btn-group {
  margin-top: 5px;
  display: block;
  border-bottom: 1px solid grey;
  background-color: lightblue;
}

.btn-group button {
  outline: 0;
  border: 0;
  border-radius: 0;
  border-left: 1px solid slategrey;
}

.btn-group button:last-child {
  border-right: 1px solid grey;
}

.btn-group button.active {
  background: #408FFF;
  color: white;
}

.table-tool {
  padding: 8px 0;
  border-top: 1px solid black;
}
</style>
