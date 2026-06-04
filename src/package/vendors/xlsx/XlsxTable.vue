<script setup lang='ts'>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import EVirtTable from 'e-virt-table'
import type { SheetDefinition, SheetImage, SheetModel } from './worker/type'
import { SheetJsWorker } from './worker'
import { useWorker } from '@/package/use'
import {
  buildRows,
  clampWindowStart,
  collectWindowStarts,
  createEmptyVirtualState,
  DEFAULT_SHEET_DEFAULTS,
  displayCellKey,
  getDataKey,
  markWindowState,
  ROW_STATE_FIELD,
  RowState,
  WINDOW_SIZE,
  type ScrollDirection,
  type VirtualSheetState
} from './XlsxTable.state'
import {
  buildColumns,
  createTableConfig,
  detectIndexOffset,
  getDisplayColumns,
  getRowHeight,
  HEADER_HEIGHT,
  INDEX_COLUMN_WIDTH,
  normalizeRowHeight,
  normalizeCellStyle
} from './XlsxTable.view'

const props = defineProps<{
  data: ArrayBuffer
}>()

const tableHost = ref<HTMLDivElement | null>(null)
const sheets = ref<SheetDefinition[]>([])
const sheetIndex = ref(0)
const errorMessage = ref('')
const totalRows = ref(0)
const totalCols = ref(0)
const sheetDefaults = ref({ ...DEFAULT_SHEET_DEFAULTS })
const sheetInitializing = ref(true)
const hasInitialWindow = ref(false)
const loadedWindowCount = ref(0)
const loadingWindowCount = ref(0)
const sheetImages = ref<SheetImage[]>([])
const imageViewport = ref({
  scrollX: 0,
  scrollY: 0,
  width: 0,
  height: 0
})

const activeSheet = computed(() => sheets.value.find(sheet => sheet.id === sheetIndex.value))
const sheetTabs = computed(() => {
  const visible = sheets.value.filter(sheet => !sheet.hidden)
  return visible.length ? visible : sheets.value
})
const showBlockingLoading = computed(() => {
  return !errorMessage.value && !hasInitialWindow.value && (loading.value || sheetInitializing.value)
})
const showStreamingLoading = computed(() => {
  return !showBlockingLoading.value &&
    !errorMessage.value &&
    hasInitialWindow.value &&
    loadingWindowCount.value > 0
})
const sheetLoadingText = computed(() => {
  if (!sheets.value.length) {
    return '正在解析 Excel 工作簿，请耐心等待...'
  }
  if (activeSheet.value?.name) {
    return `正在准备「${activeSheet.value.name}」...`
  }
  return '正在准备工作表内容...'
})
const cachedSummary = computed(() => {
  if (!totalRows.value) {
    return ''
  }
  const cachedRows = Math.min(loadedWindowCount.value * WINDOW_SIZE, totalRows.value)
  return `已缓存 ${cachedRows.toLocaleString()} / ${totalRows.value.toLocaleString()} 行`
})
const statusSummary = computed(() => {
  const rows = totalRows.value || activeSheet.value?.rowCount || 0
  const cols = totalCols.value || activeSheet.value?.colCount || 0
  if (!rows) {
    return ''
  }
  if (!cols) {
    return `共 ${rows} 行，按视口预取平滑加载`
  }
  return `共 ${rows} 行，${cols} 列，按视口预取平滑加载`
})
const imageClipStyle = {
  left: `${INDEX_COLUMN_WIDTH}px`,
  top: `${HEADER_HEIGHT}px`
}
const imageLayerStyle = computed(() => ({
  transform: `translate(${-imageViewport.value.scrollX}px, ${-imageViewport.value.scrollY}px)`
}))
const visibleImages = computed(() => {
  const margin = 240
  const viewport = imageViewport.value
  const width = Math.max(viewport.width - INDEX_COLUMN_WIDTH, 0)
  const height = Math.max(viewport.height - HEADER_HEIGHT, 0)

  return sheetImages.value.filter((image) => {
    const x = image.left - viewport.scrollX
    const y = image.top - viewport.scrollY
    return x + image.width >= -margin &&
      x <= width + margin &&
      y + image.height >= -margin &&
      y <= height + margin
  })
})

const compositeWorkerFactory = () => {
  return SheetJsWorker.create()
}

const { loading, worker, onWorkerEvent } = useWorker(compositeWorkerFactory)

let virtualState = createEmptyVirtualState()
const sheetStateCache = new Map<number, VirtualSheetState>()
const sheetImageCache = new Map<number, SheetImage[]>()
let table: EVirtTable | null = null
let resizeObserver: ResizeObserver | null = null
let resizeFrame = 0
let scrollFrame = 0
let viewportRange = { start: 0, end: 0 }
let scrollDirection: ScrollDirection = 1
let lastScrollY = 0
let sheetSessionId = 0

const getActiveSheetId = () => {
  return sheetIndex.value ?? sheets.value[0]?.id
}

const getHostHeight = () => {
  return tableHost.value?.clientHeight || 0
}

const syncWindowStats = () => {
  loadedWindowCount.value = virtualState.loadedWindows.size
  loadingWindowCount.value = virtualState.loadingWindows.size
}

const syncImageViewport = () => {
  imageViewport.value = {
    scrollX: table?.ctx.scrollX || 0,
    scrollY: table?.ctx.scrollY || 0,
    width: tableHost.value?.clientWidth || 0,
    height: tableHost.value?.clientHeight || 0
  }
}

const getImageStyle = (image: SheetImage) => {
  return {
    left: `${Math.round(image.left)}px`,
    top: `${Math.round(image.top)}px`,
    width: `${Math.round(image.width)}px`,
    height: `${Math.round(image.height)}px`
  }
}

const buildTableView = () => {
  return {
    config: createTableConfig({
      hostHeight: getHostHeight(),
      sheetDefaults: sheetDefaults.value,
      virtualState
    }),
    columns: getDisplayColumns(virtualState.columns)
  }
}

const resetViewportTracking = () => {
  viewportRange = { start: 0, end: 0 }
  scrollDirection = 1
  lastScrollY = 0
}

// 把滚动和尺寸变化合并到同一帧里处理，避免滚轮滚动、拖动滚动条、
// 容器 resize 走出多条预取链路，降低重复计算和抖动。
const scheduleViewportLoad = () => {
  if (!table) {
    return
  }
  if (scrollFrame) {
    cancelAnimationFrame(scrollFrame)
  }
  scrollFrame = requestAnimationFrame(() => {
    scrollFrame = 0
    if (!table || !virtualState.active || !virtualState.totalRows) {
      return
    }

    const head = Math.max(table.ctx.body.headIndex || 0, 0)
    const tail = Math.max(table.ctx.body.tailIndex || head, head)
    const scrollY = table.ctx.scrollY || 0
    scrollDirection = scrollY >= lastScrollY ? 1 : -1
    lastScrollY = scrollY
    viewportRange = { start: head, end: tail }
    syncImageViewport()
    ensureViewportWindows(head, tail)
  })
}

const ensureTable = () => {
  if (table || !tableHost.value) {
    return table
  }

  table = new EVirtTable(tableHost.value, {
    data: [],
    columns: [],
    config: createTableConfig({
      hostHeight: getHostHeight(),
      sheetDefaults: sheetDefaults.value,
      virtualState
    })
  })
  table.on('onScrollX', scheduleViewportLoad)
  table.on('onScrollY', scheduleViewportLoad)
  table.on('resize', scheduleViewportLoad)

  return table
}

const renderTable = (
  instance: EVirtTable,
  columns = virtualState.columns,
  rows = virtualState.rows,
  resetScroll = false
) => {
  const view = {
    config: createTableConfig({
      hostHeight: getHostHeight(),
      sheetDefaults: sheetDefaults.value,
      virtualState
    }),
    columns: getDisplayColumns(columns)
  }

  instance.loadConfig(view.config)
  instance.loadColumns(view.columns)
  instance.loadData(rows)
  instance.draw()
  syncImageViewport()

  if (resetScroll) {
    requestAnimationFrame(() => {
      instance.scrollTo(0, 0)
      instance.draw()
      syncImageViewport()
      scheduleViewportLoad()
    })
    return
  }

  scheduleViewportLoad()
}

const syncTableLayout = () => {
  const instance = ensureTable()
  if (!instance) {
    return
  }

  const { config, columns } = buildTableView()
  instance.loadConfig(config)
  if (virtualState.active && columns.length) {
    instance.loadColumns(columns)
  }
  instance.doLayout()
  instance.draw()
  syncImageViewport()
  scheduleViewportLoad()
}

// XLSX 的高开销解析统一放在 worker 中处理，主线程先保留占位行，
// 只有窗口真正进入视口附近时才请求对应的数据块。
const requestWindow = (startRow = 0, silent = true) => {
  const sheetId = getActiveSheetId()
  if (sheetId === undefined) {
    return
  }

  const windowStart = clampWindowStart(startRow, virtualState.totalRows)
  if (virtualState.loadedWindows.has(windowStart) || virtualState.loadingWindows.has(windowStart)) {
    return
  }

  virtualState.loadingWindows.add(windowStart)
  syncWindowStats()
  if (virtualState.active) {
    markWindowState(virtualState.rows, virtualState.totalRows, windowStart, RowState.Loading)
    table?.draw()
  }

  errorMessage.value = ''
  worker.emit('parseSheet', {
    sheet: sheetId,
    startRow: windowStart,
    pageSize: WINDOW_SIZE,
    sessionId: sheetSessionId
  })

  if (silent) {
    loading.value = false
  }
}

const ensureViewportWindows = (startRow: number, endRow: number) => {
  if (!virtualState.active || !virtualState.totalRows) {
    return
  }

  collectWindowStarts({
    startRow,
    endRow,
    direction: scrollDirection,
    totalRows: virtualState.totalRows
  }).forEach(windowStart => requestWindow(windowStart, true))
}

// 每个工作表只初始化一次稀疏虚拟网格，后续只原地回填行对象，
// 这样 canvas 表格的滚动高度和缓存引用都能保持稳定。
const initializeVirtualSheet = (ws: SheetModel) => {
  const meta = ws.meta
  if (!meta) {
    return
  }

  const { columns, dataKeys } = buildColumns(ws)
  virtualState = {
    ...createEmptyVirtualState(),
    active: true,
    totalRows: meta.totalRows,
    totalCols: meta.totalCols,
    indexOffset: detectIndexOffset(ws),
    defaults: ws.defaults,
    dataKeys,
    rows: buildRows(meta.totalRows),
    columns
  }

  sheetDefaults.value = ws.defaults
  totalRows.value = meta.totalRows
  totalCols.value = meta.totalCols
  syncWindowStats()

  nextTick(() => {
    const instance = ensureTable()
    if (!instance) {
      return
    }
    renderTable(instance, columns, virtualState.rows, true)
  })
}

const clearVirtualRow = (row: Record<string, unknown>) => {
  virtualState.dataKeys.forEach((key) => {
    delete row[key]
  })
}

// 整表结构里的行高使用绝对行号，必须提前写入虚拟行；
// 这样隐藏行、特殊行高会参与初始滚动高度计算，而不是等窗口加载后才跳变。
const applyStructureRowHeights = (rowHeights: number | number[] | undefined) => {
  if (!Array.isArray(rowHeights)) {
    return
  }

  rowHeights.forEach((rawHeight, absoluteRow) => {
    if (rawHeight === undefined) {
      return
    }
    const row = virtualState.rows[absoluteRow]
    if (!row) {
      return
    }
    const height = normalizeRowHeight(rawHeight, virtualState.defaults.rowHeight)
    row._height = height
    virtualState.rowHeightCache.set(absoluteRow, height)
  })
}

// 已经创建过的行对象会被重复利用，只替换当前窗口的内容，
// 这样既能保住表格内部缓存，也能避免新窗口回填时出现滚动跳动。
const applyWindowRows = (ws: SheetModel) => {
  const meta = ws.meta
  if (!meta) {
    return
  }

  const rowIndexes: number[] = []
  const endRow = Math.min(meta.endRow, virtualState.totalRows)

  for (let absoluteRow = meta.startRow; absoluteRow < endRow; absoluteRow += 1) {
    const row = virtualState.rows[absoluteRow]
    const relativeRow = absoluteRow - meta.startRow
    if (!row) {
      continue
    }

    clearVirtualRow(row)

    const data = ws.data?.[relativeRow] || []
    data.forEach((value, colIndex) => {
      if (value === '' || value === null || value === undefined) {
        return
      }
      row[getDataKey(colIndex)] = value
    })

    const windowHeight = getRowHeight(ws.rowHeights, relativeRow, virtualState.defaults.rowHeight)
    const height = normalizeRowHeight(
      getRowHeight(ws.structure?.rowHeights, absoluteRow, windowHeight),
      virtualState.defaults.rowHeight
    )
    row._height = height
    row[ROW_STATE_FIELD] = RowState.Loaded
    virtualState.rowHeightCache.set(absoluteRow, height)
    rowIndexes.push(absoluteRow)
  }

  virtualState.windowRows.set(meta.startRow, rowIndexes)
}

const applyWindowCells = (ws: SheetModel) => {
  const meta = ws.meta
  if (!meta) {
    return
  }

  const keys: string[] = []
  Object.entries(ws.cell || {}).forEach(([key, value]) => {
    const [row, col] = key.split('-').map(Number)
    const absoluteKey = displayCellKey(meta.startRow + row, col + 1)
    const style = normalizeCellStyle(value as { className?: string, style: any })
    if (!style) {
      return
    }
    virtualState.cellCache.set(absoluteKey, style)
    keys.push(absoluteKey)
  })

  virtualState.windowCells.set(meta.startRow, keys)
}

const setSheetMerges = (merges: Array<{ row: number, col: number, rowspan: number, colspan: number }>) => {
  virtualState.mergeStartMap.clear()
  virtualState.mergeCoveredMap.clear()

  merges.forEach((merge) => {
    const startKey = displayCellKey(merge.row, merge.col + 1)
    virtualState.mergeStartMap.set(startKey, {
      ...merge,
      col: merge.col + 1
    })

    for (let rowOffset = 0; rowOffset < merge.rowspan; rowOffset += 1) {
      for (let colOffset = 0; colOffset < merge.colspan; colOffset += 1) {
        if (rowOffset === 0 && colOffset === 0) {
          continue
        }
        const coveredKey = displayCellKey(
          merge.row + rowOffset,
          merge.col + colOffset + 1
        )
        virtualState.mergeCoveredMap.set(coveredKey, true)
      }
    }
  })
}

// 合并单元格和列宽属于整张表的结构信息，不能跟着窗口切片走，
// 否则一旦跨窗口就会出现合并残缺或列宽偏差。
const applySheetStructure = (ws: SheetModel) => {
  const structure = ws.structure
  const mergeList = structure?.merge
  if (mergeList) {
    setSheetMerges(mergeList)
  } else {
    const meta = ws.meta
    if (meta && !virtualState.mergeStartMap.size) {
      setSheetMerges((ws.merge || []).map((merge) => ({
        ...merge,
        row: merge.row + meta.startRow
      })))
    }
  }

  applyStructureRowHeights(structure?.rowHeights)

  if (structure?.images) {
    sheetImages.value = structure.images
    const sheetId = getActiveSheetId()
    if (sheetId !== undefined) {
      sheetImageCache.set(sheetId, structure.images)
    }
  }
}

const applyVirtualWindow = (ws: SheetModel) => {
  const meta = ws.meta
  if (!meta) {
    return
  }

  if (!virtualState.active) {
    initializeVirtualSheet(ws)
  }

  applySheetStructure(ws)
  applyWindowRows(ws)
  applyWindowCells(ws)

  virtualState.loadedWindows.add(meta.startRow)
  virtualState.loadingWindows.delete(meta.startRow)
  syncWindowStats()
  hasInitialWindow.value = true

  const activeSheetId = getActiveSheetId()
  if (activeSheetId !== undefined) {
    sheetStateCache.set(activeSheetId, virtualState)
  }

  table?.draw()
  loading.value = false
  sheetInitializing.value = false

  const start = viewportRange.start || meta.startRow
  const end = Math.max(viewportRange.end, meta.endRow - 1, meta.startRow)
  ensureViewportWindows(start, end)
}

const resetViewState = () => {
  errorMessage.value = ''
  totalRows.value = 0
  totalCols.value = 0
  sheetDefaults.value = { ...DEFAULT_SHEET_DEFAULTS }
  sheetImages.value = []
  virtualState = createEmptyVirtualState()
  hasInitialWindow.value = false
  resetViewportTracking()
  syncWindowStats()
  syncImageViewport()

  if (!table) {
    return
  }
  table.loadColumns([])
  table.loadData([])
  table.scrollTo(0, 0)
  table.draw()
}

const cacheCurrentSheetState = () => {
  const sheetId = getActiveSheetId()
  if (sheetId === undefined || !virtualState.active) {
    return
  }
  sheetStateCache.set(sheetId, virtualState)
}

// 切换工作表时优先恢复已缓存的虚拟状态，让表格先把已有窗口直接画出来，
// 再按需补后续数据，这样切回来不会再次出现整屏空白。
const restoreCachedSheetState = (sheetId: number) => {
  const cached = sheetStateCache.get(sheetId)
  if (!cached) {
    return false
  }

  cached.loadingWindows.clear()
  virtualState = cached
  errorMessage.value = ''
  totalRows.value = cached.totalRows
  totalCols.value = cached.totalCols
  sheetDefaults.value = cached.defaults
  sheetImages.value = sheetImageCache.get(sheetId) || []
  hasInitialWindow.value = cached.loadedWindows.size > 0
  sheetInitializing.value = !hasInitialWindow.value
  syncWindowStats()

  nextTick(() => {
    const instance = ensureTable()
    if (!instance) {
      return
    }
    renderTable(instance, cached.columns, cached.rows)
    syncImageViewport()
  })

  return true
}

const startSheetSession = () => {
  const sheetId = getActiveSheetId()
  if (sheetId === undefined) {
    loading.value = false
    sheetInitializing.value = false
    return
  }

  sheetSessionId += 1
  if (restoreCachedSheetState(sheetId)) {
    loading.value = false
    return
  }

  sheetInitializing.value = true
  resetViewState()
  requestWindow(0, false)
}

const handleSheet = (index: number) => {
  if (sheetIndex.value === index) {
    return
  }
  cacheCurrentSheetState()
  sheetIndex.value = index
  startSheetSession()
}

const emitParseWorkbook = () => {
  worker.emit('parseWorkbook', { workbook: props.data })
}

onWorkerEvent('sheets', ({ sheets: list }) => {
  sheets.value = list
  const firstSheet = list.find((sheet: SheetDefinition) => !sheet.hidden) || list[0]
  if (firstSheet) {
    sheetIndex.value = firstSheet.id
    startSheetSession()
    return
  }
  sheetInitializing.value = false
  loading.value = false
})

onWorkerEvent('parseSheet', ({ sessionId, sheet, sheetData: ws }) => {
  if (sessionId !== sheetSessionId || sheet !== getActiveSheetId()) {
    return
  }
  applyVirtualWindow(ws)
})

onWorkerEvent('parseError', ({ sessionId, startRow, message }) => {
  if (sessionId && sessionId !== sheetSessionId) {
    return
  }

  sheetInitializing.value = false
  loading.value = false
  if (typeof startRow === 'number') {
    virtualState.loadingWindows.delete(startRow)
    syncWindowStats()
    if (virtualState.active) {
      markWindowState(virtualState.rows, virtualState.totalRows, startRow, RowState.Placeholder)
      table?.draw()
    }
  } else {
    virtualState.loadingWindows.clear()
    syncWindowStats()
  }
  errorMessage.value = message || 'Excel 解析失败'
})

watch(() => props.data, () => {
  sheetSessionId += 1
  sheets.value = []
  sheetIndex.value = 0
  sheetStateCache.clear()
  sheetImageCache.clear()
  sheetInitializing.value = true
  resetViewState()
  emitParseWorkbook()
})

onMounted(() => {
  ensureTable()
  if (tableHost.value) {
    resizeObserver = new ResizeObserver(() => {
      if (resizeFrame) {
        cancelAnimationFrame(resizeFrame)
      }
      resizeFrame = requestAnimationFrame(() => {
        resizeFrame = 0
        syncTableLayout()
      })
    })
    resizeObserver.observe(tableHost.value)
  }
  emitParseWorkbook()
})

onBeforeUnmount(() => {
  if (resizeFrame) {
    cancelAnimationFrame(resizeFrame)
  }
  if (scrollFrame) {
    cancelAnimationFrame(scrollFrame)
  }
  resizeObserver?.disconnect()
  resizeObserver = null
  table?.destroy()
  table = null
})
</script>

<template>
  <div class='excel-wrapper'>
    <div class='loading' v-if='showBlockingLoading'>
      <div class='loading-card'>
        <div class='loading-brand'>
          <img class='lg' src='./xlsx.png' alt='xlsx' />
        </div>
        <div class='loading-copy'>
          <span class='loading-kicker'>Excel 表格</span>
          <strong>{{ sheetLoadingText }}</strong>
          <p>正在准备工作表、样式和大数据视口，请稍候。</p>
        </div>
        <span class='loading-spinner' />
      </div>
    </div>
    <div class='error' v-else-if='errorMessage'>
      {{ errorMessage }}
    </div>
    <div class='table-wrapper'>
      <div v-if='showStreamingLoading' class='sheet-loading'>
        <span class='sheet-loading-dot' />
        <span>正在平滑补充可视区数据</span>
        <span v-if='cachedSummary' class='sheet-loading-summary'>{{ cachedSummary }}</span>
      </div>
      <div class='table-host'>
        <div ref='tableHost' class='table-target' style='width: 100%; height: 100%;' />
        <div
          v-if='visibleImages.length'
          class='excel-image-viewport'
          :style='imageClipStyle'
          aria-hidden='true'
        >
          <div class='excel-image-layer' :style='imageLayerStyle'>
            <img
              v-for='(image, index) in visibleImages'
              :key='`${image.id}-${index}`'
              class='excel-image'
              :src='image.src'
              :alt='image.id'
              :style='getImageStyle(image)'
              draggable='false'
            />
          </div>
        </div>
      </div>
    </div>
    <div class='toolbar'>
      <div class='btn-group'>
        <button
          v-for='sheet in sheetTabs'
          :key='sheet.id'
          style='padding: 0 30px'
          :class='{active: sheetIndex === sheet.id}'
          @click='handleSheet(sheet.id)'
        >
          {{ sheet.name }}
        </button>
      </div>
      <div v-if='statusSummary' class='summary'>
        {{ statusSummary }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.excel-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #fff;
}

.table-wrapper {
  position: relative;
  width: 100%;
  flex: 1;
  min-height: 0;
  background: #fff;
  overflow: hidden;
}

.sheet-loading {
  position: absolute;
  right: 18px;
  bottom: 18px;
  z-index: 20;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 14px;
  background: rgba(33, 163, 102, 0.1);
  border: 1px solid rgba(33, 163, 102, 0.2);
  box-shadow: 0 8px 20px rgba(33, 163, 102, 0.12);
  color: #1a7f50;
  font-size: 12px;
  font-weight: 600;
  pointer-events: none;
}

.sheet-loading-dot {
  width: 8px;
  height: 8px;
  flex-shrink: 0;
  border-radius: 999px;
  background: #21a366;
  box-shadow: 0 0 0 6px rgba(33, 163, 102, 0.12);
  animation: sheet-loading-pulse 1.2s ease-in-out infinite;
}

.sheet-loading-summary {
  color: #5f6368;
}

.table-host {
  position: absolute;
  inset: 0;
}

.excel-image-viewport {
  position: absolute;
  right: 0;
  bottom: 0;
  z-index: 35;
  overflow: hidden;
  pointer-events: none;
}

.excel-image-layer {
  position: absolute;
  inset: 0 auto auto 0;
  width: 0;
  height: 0;
  transform-origin: 0 0;
  will-change: transform;
}

.excel-image {
  position: absolute;
  display: block;
  max-width: none;
  object-fit: contain;
  user-select: none;
}

.table-host :deep(.e-virt-table-container),
.table-host :deep(.e-virt-table-stage) {
  width: 100% !important;
}

.table-host :deep(.e-virt-table-container) {
  height: 100% !important;
}

.table-host :deep(.e-virt-table-stage) {
  overflow: hidden;
}

.loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.96);
  z-index: 999;
  backdrop-filter: blur(6px);
}

.loading-card {
  width: min(100%, 460px);
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 22px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(33, 163, 102, 0.1);
  box-shadow: 0 22px 48px rgba(18, 36, 27, 0.12);
}

.loading-brand {
  flex-shrink: 0;
  width: 78px;
  height: 78px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 22px;
  background: linear-gradient(135deg, rgba(33, 163, 102, 0.14), rgba(33, 163, 102, 0.04));
}

.excel-wrapper img {
  height: auto;
  display: block;
}

.excel-wrapper img.lg {
  width: 48px;
}

.loading-copy {
  min-width: 0;
  flex: 1;
}

.loading-kicker {
  display: block;
  color: #21a366;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.loading-copy strong {
  display: block;
  margin-top: 6px;
  color: #183828;
  font-size: 20px;
  line-height: 1.3;
}

.loading-copy p {
  margin: 8px 0 0;
  color: #617565;
  line-height: 1.6;
}

.loading-spinner {
  flex-shrink: 0;
  width: 38px;
  height: 38px;
  border-radius: 999px;
  border: 3px solid rgba(33, 163, 102, 0.14);
  border-top-color: #21a366;
  animation: sheet-loading-spin 0.9s linear infinite;
}

.error {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  text-align: center;
  background: #fff;
  z-index: 999;
  color: #b42318;
  font-size: 16px;
  font-weight: 600;
}

.toolbar {
  margin-top: 2px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  gap: 12px;
  padding: 0 8px 0 6px;
  border-top: 1px solid #cfd4d9;
  background: #f3f3f3;
}

.btn-group {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  overflow-x: auto;
  scrollbar-width: thin;
}

.btn-group button {
  outline: 0;
  border: 1px solid #c6ccd2;
  border-bottom: 2px solid transparent;
  border-top-left-radius: 7px;
  border-top-right-radius: 7px;
  color: #4d5358;
  background: linear-gradient(180deg, #f7f7f7 0%, #e8ecef 100%);
  min-height: 30px;
  font-size: 12px;
  white-space: nowrap;
}

.btn-group button.active {
  background: #ffffff;
  color: #202124;
  border-color: #c6ccd2;
  border-bottom-color: #21a366;
  box-shadow: inset 0 -2px 0 #21a366;
}

.summary {
  display: flex;
  align-items: center;
  padding: 4px 8px;
  color: #5f6368;
  font-size: 12px;
  white-space: nowrap;
}

@keyframes sheet-loading-pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(0.86);
    opacity: 0.8;
  }
}

@keyframes sheet-loading-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
