<script setup lang='ts'>

import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { HotTable } from '@handsontable/vue3'
import { alignToClass, fixMatrix, valueOf, valuesOf } from './util'
import type { Range, Workbook } from 'exceljs/index.d'
import ExcelJS from 'exceljs'
import { parseTheme } from './render'

const props = defineProps<{
  data: ArrayBuffer,
}>()

const table = ref<typeof HotTable | null>(null)
const workbook = ref<null | Workbook>(null)
const sheetIndex = ref(0)
const loading = ref(true)

// 表格设置，计算属性
const hotSettings = {
  language: 'zh-CN',
  readOnly: true,
  // columns: columns.value,
  colHeaders: true,
  rowHeaders: true,
  autoRowSize: false,
  autoColumnSize: false,
  height: '100%',
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
  return fixMatrix(result, columns.value?.length || 0)
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
  if (workbook.value?.getWorksheet) {
    const index = sheetIndex.value || sheets.value[0].id
    return workbook.value.getWorksheet(index)
  }
  return null
})

// 获取所有工作表
const sheets = computed(() => {
  if (workbook.value?.worksheets) {
    return workbook.value?.worksheets.filter(sheet => sheet.rowCount)
  }
  return []
})

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

// note excel中列宽以字符长度为单位，1个字符≈7px
const colWidths = computed(() => {
  const { colWidth } = defaults.value
  return ws.value?.columns.map(item => item.width ? item.width * 7 : colWidth)
})

// 切换sheet
const handleSheet = (index: number) => {
  if (sheetIndex.value !== index) {
    sheetIndex.value = index
    methods.updateTable()
  }
}

// 内部使用的计算属性，列表
const columns = computed(() => {
  return ws.value?.columns.map(item => ({
    key: item.number,
    title: item.letter,
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
    loading.value = true;
    nextTick(() => {
      setTimeout(() => {
        this.hotTable()?.updateSettings({
          data: data.value,
          cell: cell.value,
          columns: columns.value,
          mergeCells: merge.value,
          // customBorders: border.value,
          colWidths: colWidths.value,
          rowHeights: rowHeights.value
        })
      }, 0)
    })
  },
  parseTheme() {
    const themes = workbook.value?.model?.themes
    if (themes) {
      Object.values(themes).forEach(parseTheme)
    }
  }
}

// 监听工作表的变更
watch(workbook, () => {
  methods.parseTheme()
  methods.updateTable()
})

// 挂载完成，加载异步任务
onMounted(async () => {
  workbook.value = await new ExcelJS.Workbook().xlsx.load(props.data)
  methods.parseTheme()
  methods.hotTable()?.addHook('afterUpdateSettings', () => loading.value = false)
  const [{ id = 0 } = {}] = sheets.value || []
  if (!sheetIndex.value) sheetIndex.value = id
  return methods.updateTable();
})

</script>

<template>
  <div class='excel-wrapper'>
    <div class='loading' v-if='loading'>加载中，请耐心等待...</div>
    <div class='table-wrapper'>
      <hot-table ref='table' :settings='hotSettings' />
    </div>
    <div class='btn-group'>
      <button
        v-for='sheet in sheets'
        :key='sheet.id'
        style='padding: 0 30px'
        :class='{active: sheetIndex === sheet.id}'
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
.excel-wrapper {
    position: relative;
    width: 100%;
    height: 100%;
}

.table-wrapper {
    position: relative;
    width: 100%;
    height: calc(100% - 25px);
}

.loading {
    position: absolute;
    left: 0;
    top: 0;
    display: flex;
    text-align: center;
    justify-content: center;
    flex-direction: column;
    margin: 0 auto;
    width: 100%;
    height: 100%;
    background: white;
    font-size: 18px;
    font-weight: bold;
    z-index: 999;
    color: #0c9d0c;
}
.sheet-btn.active {
    background-color: aquamarine;
}

.btn-group {
    margin-top: 5px;
    display: block;
    border-bottom: 1px solid grey;
    background-color: lightgray;
}

.btn-group button {
    outline: 0;
    border: 0;
    border-top-left-radius: 5px;
    border-top-right-radius: 5px;
    color: #0c9d0c;
    border-left: 1px solid slategrey;
}

.btn-group button:last-child {
    border-right: 1px solid grey;
}

.btn-group button.active {
    background: #0c9d0c;
    color: white;
}

.table-tool {
    padding: 8px 0;
    border-top: 1px solid black;
}
</style>
