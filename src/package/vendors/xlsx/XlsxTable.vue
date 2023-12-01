<script setup lang='ts'>

import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { HotTable } from '@handsontable/vue3'
import { cellKey } from './util'
import type { SheetDefinition, SheetModel } from './worker/type'
import { ExcelJsWorker, SheetJsWorker } from './worker'
import './render'
import { useWorker } from '@/package/use'

const props = defineProps<{
  data: ArrayBuffer,
  type: string
}>()

const table = ref<typeof HotTable | null>(null)
const sheets = ref<SheetDefinition[]>([])
const sheetIndex = ref(0)

let sheetData: undefined | SheetModel

// 表格设置，计算属性
const hotSettings = {
  language: 'zh-CN',
  // columns: columns.value,
  colHeaders: true,
  rowHeaders: true,
  autoRowSize: false,
  autoColumnSize: false,
  height: '100%',
  // 静态设置，提高性能
  cells(row: number, column: number) {
    const props = sheetData?.cell
    if (props && Object.keys(props).length) {
      return props[cellKey(row, column)]
    }
    return {}
  },
  columns(index: number) {
    const value = sheetData?.columns
    return value?.length ? value[index] : {}
  },
  colWidths(index: number) {
    const value = sheetData?.colWidths
    if (typeof value === 'number') {
      return value
    }
    return value && value[index] || sheetData?.defaults.colWidth
  },
  rowHeights(index: number) {
    const value = sheetData?.rowHeights
    if (typeof value === 'number') {
      return value
    }
    console.log(value)
    return value && value[index] || sheetData?.defaults.rowHeight
  },
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

const tableInstance = computed(() => table.value?.hotInstance)

// 组合后的工厂，可以根据props自动初始化
const compositeWorkerFactory = () => {
  return props.type === 'binary' ? SheetJsWorker.create() : ExcelJsWorker.create();
}

// 使用worker，状态内部管理
const { loading, worker, onWorkerEvent } = useWorker(compositeWorkerFactory)

// 切换sheet
const handleSheet = (index: number) => {
  if (sheetIndex.value !== index) {
    sheetIndex.value = index
    worker.emit('parseSheet', { sheet: sheetIndex.value ?? sheets.value[0].id })
  }
}

const updateTable = () => nextTick(() => {
  setTimeout(() => {
    tableInstance.value?.updateSettings({
      data: sheetData?.data,
      mergeCells: sheetData?.merge
      // customBorders: sheetData?.border,
    })
  }, 0)
})

// 处理sheet页读取
onWorkerEvent('sheets', ({ sheets: list }) => {
  // 初次解析得到sheets
  sheets.value = list
  if (list.length) {
    const [{ id: firstSheet }] = list
    // 设定活动表
    sheetIndex.value = firstSheet
    // 初次解析，必须保证有活动表
    worker.emit('parseSheet', { sheet: sheetIndex.value })
  }
})

// 处理单个表格解析
onWorkerEvent('parseSheet', ({ sheetData: ws }) => {
  sheetData = ws
  // 当且仅当解析完数据后重绘表格
  updateTable()
})

// 监听工作表的变更
watch(() => props.data, () => {
  worker.emit('parseWorkbook', { workbook: props.data })
})

// 挂载完成，加载异步任务
onMounted(async () => {
  // 添加table回调
  tableInstance.value?.addHook('afterUpdateSettings', () => loading.value = false)
  // 初次解析，主要是解析工作簿，主题、当前工作表
  worker.emit('parseWorkbook', { workbook: props.data })
})
</script>

<template>
  <div class='excel-wrapper'>
    <div class='loading' v-if='loading'>
      <img class='lg' src='./xlsx.png' alt='xlsx' />
      <img class='sm' src='./loading.gif' alt='loading' />
      加载中，请耐心等待...
    </div>
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

.excel-wrapper img {
  height: auto;
  display: block;
}

.excel-wrapper img.lg {
  width: 200px;
  margin: 20px auto;
}

.excel-wrapper img.sm {
  width: 80px;
  margin: 2px auto;
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
