<script setup lang='ts'>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { getDocument, PDFWorker as PdfJsWorker, PixelsPerInch, version } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { EventBus, GenericL10n, PDFFindController, PDFLinkService, PDFViewer } from 'pdfjs-dist/legacy/web/pdf_viewer.mjs'
import { DEFAULT_PDF_RANGE_CHUNK_SIZE } from '@/package/common/sourceLoading'
import { buildPrintPageStyle, formatCssPixels } from '@/package/common/printLayout'
import {
  registerFileViewerSearchProvider,
  unregisterFileViewerSearchProvider
} from '@/package/use/documentSearch'
import {
  createZoomChangeEmitter,
  registerFileViewerZoomProvider,
  unregisterFileViewerZoomProvider
} from '@/package/use/viewerZoom'
import type {
  FileRenderExportOptions,
  FileRenderExportAdapter,
  FileViewerPdfOptions,
  FileViewerSearchOptions,
  FileViewerSearchState,
  FileViewerZoomState
} from '@/package/common/type'
import './pdf.css'
import PDFWorkerPort from './worker'

const props = defineProps<{
  data?: ArrayBuffer,
  url?: string,
  exportAdapter?: (adapter: FileRenderExportAdapter | null) => void,
  options?: FileViewerPdfOptions,
}>()

const MIN_SCALE = 0.2
const MAX_SCALE = 3
const SCALE_STEP = 0.1
const FIT_HORIZONTAL_PADDING = 28
const PAGE_BORDER_WIDTH = 18
const PDF_EXPORT_MAX_PAGE_PIXELS = 8_000_000
type PdfNavMode = 'pages' | 'outline'
type PdfRotation = 0 | 90 | 180 | 270
interface PdfOutlineItemView {
  id: string;
  title: string;
  dest: string | unknown[] | null;
  items: PdfOutlineItemView[];
  expanded: boolean;
}
interface PdfFlattenedOutlineItem {
  item: PdfOutlineItemView;
  depth: number;
}

// PDF.js 的滚动容器。
const shell = ref<HTMLDivElement | null>(null)
const container = ref<HTMLDivElement | null>(null)
const navVisible = ref(props.options?.navigation === false ? false : props.options?.defaultNavigationVisible !== false)
const navMode = ref<PdfNavMode>('pages')
const loadStatus = ref<'loading' | 'ready' | 'error'>('loading')
const errorMessage = ref('')
const currentPage = ref(1)
const pageCount = ref(0)
const currentScale = ref(1)
const autoFitWidth = ref(true)
const currentRotation = ref<PdfRotation>(normalizeRotation(props.options?.rotation ?? 0))
const outlineItems = ref<PdfOutlineItemView[]>([])

const navigationEnabled = computed(() => props.options?.navigation !== false)
const toolbarVisible = computed(() => props.options?.toolbar !== false)
const pages = computed(() => Array.from({ length: pageCount.value }, (_, index) => index + 1))
const outlineCount = computed(() => {
  const countItems = (items: PdfOutlineItemView[]): number => items.reduce((total, item) => total + 1 + countItems(item.items), 0)
  return countItems(outlineItems.value)
})
const flattenedOutlineItems = computed<PdfFlattenedOutlineItem[]>(() => {
  const result: PdfFlattenedOutlineItem[] = []
  const visit = (items: PdfOutlineItemView[], depth: number) => {
    items.forEach(item => {
      result.push({ item, depth })
      if (item.expanded && item.items.length) {
        visit(item.items, depth + 1)
      }
    })
  }
  visit(outlineItems.value, 0)
  return result
})
const scaleText = computed(() => `${Math.round(currentScale.value * 100)}%`)
const rotationText = computed(() => `${currentRotation.value}°`)
const canGoPrevious = computed(() => currentPage.value > 1)
const canGoNext = computed(() => currentPage.value < pageCount.value)
const canZoomOut = computed(() => currentScale.value > MIN_SCALE)
const canZoomIn = computed(() => currentScale.value < MAX_SCALE)
type PdfLoadingTask = ReturnType<typeof getDocument>
type PdfDocumentProxy = Awaited<PdfLoadingTask['promise']>
type PdfWorkerInstance = {
  destroy: () => void
}
type PdfResource = {
  loadingTask: PdfLoadingTask
  worker: PdfWorkerInstance | null
}

// PDF.js 实例上下文统一保存在这里，便于工具栏和导航窗格操作同一个 viewer。
const context = {
  viewer: null as null | PDFViewer,
  linkService: null as null | PDFLinkService,
  eventBus: null as null | EventBus,
  findController: null as null | PDFFindController,
  resource: null as null | PdfResource,
  document: null as null | PdfDocumentProxy,
  search: ''
}

let resizeObserver: ResizeObserver | null = null
let fitFrame = 0
let destroyed = false
let loadVersion = 0
let pdfSearchState: FileViewerSearchState = createPdfSearchState()
let pdfMatchesCount = { current: 0, total: 0 }
let pdfSearchOptions: FileViewerSearchOptions | undefined
let pdfSearchWaiters: Array<{
  resolve: (state: FileViewerSearchState) => void;
  timer: number;
}> = []
type PdfNavigationResult = void | PromiseLike<void>
type PdfFindMatchesCount = { current: number; total: number }
type PdfSearchProviderHost = HTMLDivElement
type PdfZoomProviderHost = HTMLDivElement
const pdfZoomEmitter = createZoomChangeEmitter()

function createPdfWorker() {
  if (typeof window === 'undefined' || !('Worker' in window)) {
    return null
  }

  // 每个 PDF 视图使用独立 worker，避免快速切换文件时复用同一个 workerPort 撞上 PDF.js 的 pendingDestroy 状态。
  return PdfJsWorker.create({ port: PDFWorkerPort.create() })
}

function normalizeRotation(rotation: number): PdfRotation {
  const normalized = ((Math.round(rotation / 90) * 90) % 360 + 360) % 360
  return (normalized === 90 || normalized === 180 || normalized === 270 ? normalized : 0) as PdfRotation
}

function createPdfSearchState(query = ''): FileViewerSearchState {
  return {
    query,
    total: 0,
    currentIndex: -1,
    current: null,
    matches: []
  }
}

function resolvePdfSearchWaiters(state: FileViewerSearchState) {
  const waiters = pdfSearchWaiters
  pdfSearchWaiters = []
  waiters.forEach(waiter => {
    window.clearTimeout(waiter.timer)
    waiter.resolve(state)
  })
}

function readPdfMatchesCount(): PdfFindMatchesCount {
  const findController = context.findController
  if (!findController) {
    return { current: 0, total: 0 }
  }

  const pageMatches = findController.pageMatches || []
  const selected = findController.selected
  const total = pageMatches.reduce((sum, matches) => sum + (matches?.length || 0), 0)
  let current = 0
  if (selected && selected.pageIdx >= 0 && selected.matchIdx >= 0 && total > 0) {
    for (let index = 0; index < selected.pageIdx; index += 1) {
      current += pageMatches[index]?.length || 0
    }
    current += selected.matchIdx + 1
  }
  return { current, total }
}

function commitPdfSearchState(
  matchesCount: PdfFindMatchesCount = readPdfMatchesCount(),
  query = context.search,
  shouldResolve = false
) {
  pdfMatchesCount = matchesCount
  const current = Math.max(0, matchesCount.current || 0)
  const total = Math.max(0, matchesCount.total || 0)
  const selected = context.findController?.selected
  const page = selected && selected.pageIdx >= 0 ? selected.pageIdx + 1 : undefined
  pdfSearchState = {
    query,
    total,
    currentIndex: current > 0 ? current - 1 : -1,
    current: current > 0
      ? {
          id: `pdf-search-match-${current}`,
          index: current - 1,
          text: query,
          anchor: null,
          page
        }
      : null,
    matches: []
  }

  if (shouldResolve) {
    resolvePdfSearchWaiters(pdfSearchState)
  }
  return pdfSearchState
}

function waitForPdfSearchState(query: string) {
  return new Promise<FileViewerSearchState>(resolve => {
    const timer = window.setTimeout(() => {
      const waiterIndex = pdfSearchWaiters.findIndex(waiter => waiter.resolve === resolve)
      if (waiterIndex >= 0) {
        pdfSearchWaiters.splice(waiterIndex, 1)
      }
      resolve(commitPdfSearchState(readPdfMatchesCount(), query))
    }, 1200)
    pdfSearchWaiters.push({ resolve, timer })
  })
}

function handlePdfFindMatchesCount(event: { matchesCount?: PdfFindMatchesCount }) {
  if (event.matchesCount) {
    commitPdfSearchState(event.matchesCount, context.search)
  }
}

function handlePdfFindControlState(event: {
  state?: number;
  matchesCount?: PdfFindMatchesCount;
  rawQuery?: string | null;
}) {
  const query = typeof event.rawQuery === 'string' ? event.rawQuery : context.search
  context.search = query
  const matchesCount = event.matchesCount?.total ? event.matchesCount : readPdfMatchesCount()
  const shouldResolve = event.state !== 3 && (matchesCount.total > 0 || event.state === 1)
  commitPdfSearchState(matchesCount, query, shouldResolve)
}

async function runPdfFind(
  query: string,
  options: FileViewerSearchOptions | undefined,
  type: '' | 'again',
  findPrevious = false
) {
  if (!context.eventBus) {
    return commitPdfSearchState({ current: 0, total: 0 }, query)
  }

  context.search = query
  pdfSearchOptions = options || pdfSearchOptions
  const searchOptions = options || pdfSearchOptions
  const previousScrollLeft = clampHorizontalScroll(container.value?.scrollLeft || 0)
  context.eventBus.dispatch('find', {
    source: shell.value || window,
    type,
    query,
    phraseSearch: true,
    caseSensitive: !!searchOptions?.caseSensitive,
    entireWord: !!searchOptions?.wholeWord,
    highlightAll: true,
    findPrevious,
    matchDiacritics: false
  })

  try {
    return await waitForPdfSearchState(query)
  } finally {
    stabilizeHorizontalScroll(previousScrollLeft)
  }
}

function clearPdfFind() {
  context.search = ''
  pdfSearchOptions = undefined
  pdfMatchesCount = { current: 0, total: 0 }
  context.eventBus?.dispatch('findbarclose', {
    source: shell.value || window
  })
  return commitPdfSearchState(pdfMatchesCount, '', true)
}

function attachPdfSearchProvider() {
  const host = shell.value as PdfSearchProviderHost | null
  if (!host) {
    return
  }
  registerFileViewerSearchProvider(host, {
    search: (query, options) => runPdfFind(query, options, '', false),
    next: () => context.search
      ? runPdfFind(context.search, undefined, 'again', false)
      : pdfSearchState,
    previous: () => context.search
      ? runPdfFind(context.search, undefined, 'again', true)
      : pdfSearchState,
    clear: clearPdfFind,
    getState: () => pdfSearchState
  })
}

async function attachPdfSearchProviderAfterRender() {
  await nextTick()
  attachPdfSearchProvider()
}

function detachPdfSearchProvider() {
  const host = shell.value as PdfSearchProviderHost | null
  unregisterFileViewerSearchProvider(host)
}

function getPdfZoomState(): FileViewerZoomState {
  return {
    scale: currentScale.value,
    label: scaleText.value,
    canZoomIn: !!context.viewer && canZoomIn.value,
    canZoomOut: !!context.viewer && canZoomOut.value,
    canReset: !!context.viewer,
    minScale: MIN_SCALE,
    maxScale: MAX_SCALE
  }
}

function attachPdfZoomProvider() {
  const host = shell.value as PdfZoomProviderHost | null
  if (!host) {
    return
  }

  registerFileViewerZoomProvider(host, {
    zoomIn: () => {
      zoomIn()
      return getPdfZoomState()
    },
    zoomOut: () => {
      zoomOut()
      return getPdfZoomState()
    },
    resetZoom: () => {
      resetScale()
      return getPdfZoomState()
    },
    setZoom: scale => {
      autoFitWidth.value = false
      setScale(scale)
      return getPdfZoomState()
    },
    getState: getPdfZoomState,
    subscribe: pdfZoomEmitter.subscribe
  })
}

async function attachPdfZoomProviderAfterRender() {
  await nextTick()
  attachPdfZoomProvider()
}

function detachPdfZoomProvider() {
  const host = shell.value as PdfZoomProviderHost | null
  unregisterFileViewerZoomProvider(host)
}

async function destroyPdfResource(resource: PdfResource | null) {
  if (!resource) {
    return
  }

  try {
    await resource.loadingTask.destroy()
  } catch (error) {
    console.warn('PDF 加载任务销毁失败', error)
  } finally {
    resource.worker?.destroy()
  }
}

function escapeAttribute(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function buildOutlineItems(items: Array<{ title?: string, dest?: string | unknown[] | null, items?: unknown[] }>, prefix = 'outline') {
  return items.map((item, index): PdfOutlineItemView => {
    const id = `${prefix}-${index}`
    const children = Array.isArray(item.items)
      ? buildOutlineItems(item.items as Array<{ title?: string, dest?: string | unknown[] | null, items?: unknown[] }>, id)
      : []
    return {
      id,
      title: item.title || `目录 ${index + 1}`,
      dest: item.dest || null,
      items: children,
      expanded: index < 4
    }
  })
}

async function loadOutline(pdfDocument: PdfDocumentProxy) {
  try {
    const outline = await pdfDocument.getOutline()
    if (destroyed || context.document !== pdfDocument) {
      return
    }
    outlineItems.value = Array.isArray(outline)
      ? buildOutlineItems(outline as Array<{ title?: string, dest?: string | unknown[] | null, items?: unknown[] }>)
      : []
  } catch (error) {
    console.warn('PDF 大纲读取失败', error)
    outlineItems.value = []
  }
}

function getPdfExportRatio(width: number, height: number, mode: FileRenderExportOptions['mode']) {
  const preferredRatio = mode === 'print' ? 1.75 : 1.5
  const maxRatio = Math.sqrt(PDF_EXPORT_MAX_PAGE_PIXELS / Math.max(width * height, 1))
  return Math.max(0.75, Math.min(preferredRatio, maxRatio))
}

async function getPdfPrintPageSize(pageNumber = 1) {
  const pdfDocument = context.document
  if (!pdfDocument) {
    throw new Error('PDF 尚未加载完成，请稍后再试')
  }

  const page = await pdfDocument.getPage(Math.min(Math.max(pageNumber, 1), pdfDocument.numPages))
  const viewport = page.getViewport({
    scale: PixelsPerInch.PDF_TO_CSS_UNITS,
    rotation: currentRotation.value
  })

  ;(page as { cleanup?: () => void }).cleanup?.()
  return {
    width: Math.ceil(viewport.width),
    height: Math.ceil(viewport.height)
  }
}

async function buildPdfPrintStyle() {
  const size = await getPdfPrintPageSize()
  return buildPrintPageStyle({
    selector: '.viewer-export-content .pdf-export-page',
    width: size.width,
    height: size.height
  })
}

async function renderPdfPagesForExport(options: FileRenderExportOptions) {
  const pdfDocument = context.document
  if (!pdfDocument) {
    throw new Error('PDF 尚未加载完成，请稍后再试')
  }

  const pagesHtml: string[] = []
  for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
    if (destroyed) {
      throw new Error('PDF 已卸载，无法继续打印')
    }

    const page = await pdfDocument.getPage(pageNumber)
    const baseViewport = page.getViewport({
      scale: PixelsPerInch.PDF_TO_CSS_UNITS,
      rotation: currentRotation.value
    })
    const pageWidth = Math.ceil(baseViewport.width)
    const pageHeight = Math.ceil(baseViewport.height)
    const exportRatio = getPdfExportRatio(baseViewport.width, baseViewport.height, options.mode)
    const renderViewport = page.getViewport({
      scale: PixelsPerInch.PDF_TO_CSS_UNITS * exportRatio,
      rotation: currentRotation.value
    })
    const canvas = document.createElement('canvas')
    const canvasContext = canvas.getContext('2d')
    if (!canvasContext) {
      throw new Error('当前浏览器无法创建 PDF 打印画布')
    }

    canvas.width = Math.ceil(renderViewport.width)
    canvas.height = Math.ceil(renderViewport.height)
    await page.render({ canvas, canvasContext, viewport: renderViewport }).promise

    const pageTitle = `${options.title} - 第 ${pageNumber} 页`
    const pageStyle = [
      `--viewer-print-page-width:${formatCssPixels(pageWidth)}`,
      `--viewer-print-page-height:${formatCssPixels(pageHeight)}`,
      `width:${formatCssPixels(pageWidth)}`,
      `height:${formatCssPixels(pageHeight)}`
    ].join(';')
    pagesHtml.push(`<section class="pdf-export-page viewer-print-page" style="${pageStyle}" aria-label="${escapeAttribute(pageTitle)}"><img src="${canvas.toDataURL('image/png')}" alt="${escapeAttribute(pageTitle)}" /></section>`)

    canvas.width = 0
    canvas.height = 0
    ;(page as { cleanup?: () => void }).cleanup?.()
  }

  return `<div class="pdf-export-document">${pagesHtml.join('')}</div>`
}

async function loadFile() {
  if (!container.value) return
  const requestVersion = ++loadVersion
  loadStatus.value = 'loading'
  errorMessage.value = ''
  context.document = null
  outlineItems.value = []
  props.exportAdapter?.(null)
  let resource: PdfResource | null = null

  try {
    if (destroyed || requestVersion !== loadVersion || !container.value) {
      return
    }

    // 初始化 PDF.js 的事件、链接和查找服务，保留原生链接跳转与搜索能力。
    const eventBus = new EventBus()
    const pdfLinkService = new PDFLinkService({ eventBus })
    const pdfFindController = new PDFFindController({
      eventBus,
      linkService: pdfLinkService,
      updateMatchesCountOnProgress: true
    })

    const pdfViewer = new PDFViewer({
      container: container.value,
      eventBus,
      linkService: pdfLinkService,
      findController: pdfFindController,
      l10n: new GenericL10n('zh-CN'),
      // PDF.js 自动从文本推断 URL 时可能早于注释层渲染，关闭后仍保留 PDF 原生链接注释。
      enableAutoLinking: false
    })
    context.viewer = pdfViewer
    context.linkService = pdfLinkService
    context.eventBus = eventBus
    context.findController = pdfFindController
    pdfLinkService.setViewer(pdfViewer)
    attachPdfSearchProvider()

    eventBus.on('updatefindmatchescount', handlePdfFindMatchesCount)
    eventBus.on('updatefindcontrolstate', handlePdfFindControlState)

    eventBus.on('pagesinit', () => {
      applyRotation(currentRotation.value)
      fitToWidth()
      loadStatus.value = 'ready'

      if (context.search) {
        eventBus.dispatch('find', { type: '', query: context.search })
      }
    })

    eventBus.on('pagechanging', ({ pageNumber }: { pageNumber: number }) => {
      currentPage.value = pageNumber
    })

    eventBus.on('scalechanging', ({ scale }: { scale: number }) => {
      currentScale.value = clampScale(scale)
    })

    if (!props.url && !props.data) {
      throw new Error('PDF 缺少可读取的数据源')
    }

    // cMap/wasm 使用远程按需加载，保证中文、色彩空间和表单类 PDF 在部署环境中仍能正常显示。
    const worker = createPdfWorker()
    const source = props.url
      ? {
          url: props.url,
          rangeChunkSize: props.options?.rangeChunkSize || DEFAULT_PDF_RANGE_CHUNK_SIZE,
          withCredentials: props.options?.withCredentials === true
        }
      : {
          data: props.data
        }
    const loadingTask = getDocument({
      ...source,
      worker: worker || undefined,
      cMapUrl: `https://npm.onmicrosoft.cn/pdfjs-dist@${version}/cmaps/`,
      wasmUrl: `https://npm.onmicrosoft.cn/pdfjs-dist@${version}/wasm/`,
      useWorkerFetch: true,
      cMapPacked: true,
      enableXfa: true
    })
    resource = { loadingTask, worker }
    context.resource = resource

    const pdfDocument = await loadingTask.promise

    if (destroyed || requestVersion !== loadVersion || context.resource !== resource) {
      if (context.resource === resource) {
        context.resource = null
        await destroyPdfResource(resource)
      }
      return
    }

    pageCount.value = pdfDocument.numPages
    currentPage.value = 1
    context.document = pdfDocument
    props.exportAdapter?.({
      includeDocumentStyles: false,
      printStyle: buildPdfPrintStyle,
      toHtml: renderPdfPagesForExport
    })
    void loadOutline(pdfDocument)

    pdfViewer.setDocument(pdfDocument)
    pdfLinkService.setDocument(pdfDocument, null)
  } catch (error) {
    if (context.resource === resource) {
      context.resource = null
      void destroyPdfResource(resource)
    }

    if (destroyed || requestVersion !== loadVersion) {
      return
    }
    loadStatus.value = 'error'
    errorMessage.value = error instanceof Error ? error.message : 'PDF 加载失败'
  }
}

function getPageWidthAtScaleOne(pdfViewer: PDFViewer) {
  const pageView = pdfViewer.getPageView(0)
  const pdfPage = pageView?.pdfPage
  if (pdfPage) {
    return pdfPage.getViewport({
      scale: PixelsPerInch.PDF_TO_CSS_UNITS,
      rotation: currentRotation.value
    }).width
  }

  const viewportWidth = pageView?.viewport?.width
  if (viewportWidth && currentScale.value) {
    return viewportWidth / currentScale.value
  }

  return 0
}

function getFitWidthScale(pdfViewer: PDFViewer) {
  const pageWidth = getPageWidthAtScaleOne(pdfViewer)
  const containerWidth = container.value?.clientWidth || window.innerWidth
  const availableWidth = Math.max(containerWidth - FIT_HORIZONTAL_PADDING - PAGE_BORDER_WIDTH, 96)
  if (!pageWidth) return 1
  return clampScale(availableWidth / pageWidth)
}

function clampScale(scale: number) {
  return Number(Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale)).toFixed(2))
}

function clampHorizontalScroll(scrollLeft: number) {
  const scrollContainer = container.value
  if (!scrollContainer) {
    return 0
  }

  const maxScrollLeft = Math.max(0, scrollContainer.scrollWidth - scrollContainer.clientWidth)
  return Math.min(Math.max(0, scrollLeft), maxScrollLeft)
}

function restoreHorizontalScroll(scrollLeft: number) {
  const scrollContainer = container.value
  if (!scrollContainer) {
    return
  }

  scrollContainer.scrollLeft = clampHorizontalScroll(scrollLeft)
}

function stabilizeHorizontalScroll(scrollLeft: number) {
  restoreHorizontalScroll(scrollLeft)
  void nextTick(() => {
    restoreHorizontalScroll(scrollLeft)
  })

  if (typeof window === 'undefined') {
    return
  }

  window.requestAnimationFrame(() => {
    restoreHorizontalScroll(scrollLeft)
    window.requestAnimationFrame(() => {
      restoreHorizontalScroll(scrollLeft)
    })
  })
  window.setTimeout(() => {
    restoreHorizontalScroll(scrollLeft)
  }, 120)
}

function runWithStableHorizontalScroll(action: () => PdfNavigationResult) {
  const previousScrollLeft = clampHorizontalScroll(container.value?.scrollLeft || 0)
  const result = action()
  // PDF.js 的目录目标可能携带 x 坐标，默认会横向滚动到目标文字位置。
  // 这里保留用户当前横向位置，只让目录/翻页改变垂直阅读位置，避免左侧导航展开时遮住页面内容。
  stabilizeHorizontalScroll(previousScrollLeft)

  if (result && typeof result.then === 'function') {
    void Promise.resolve(result).finally(() => {
      stabilizeHorizontalScroll(previousScrollLeft)
    })
  }
}

function setScale(scale: number) {
  if (!context.viewer) return
  const normalizedScale = clampScale(scale)
  context.viewer.currentScale = normalizedScale
  currentScale.value = normalizedScale
  pdfZoomEmitter.emit()
}

function fitToWidth() {
  if (!context.viewer) return
  autoFitWidth.value = true
  setScale(getFitWidthScale(context.viewer))
  nextTick(() => {
    context.viewer?.update()
  })
}

function scheduleFitToWidth() {
  if (!autoFitWidth.value || !context.viewer || typeof window === 'undefined') {
    return
  }
  window.cancelAnimationFrame(fitFrame)
  fitFrame = window.requestAnimationFrame(() => {
    fitToWidth()
  })
}

function zoomIn() {
  autoFitWidth.value = false
  setScale(currentScale.value + SCALE_STEP)
}

function zoomOut() {
  autoFitWidth.value = false
  setScale(currentScale.value - SCALE_STEP)
}

function applyRotation(rotation: number) {
  const normalized = normalizeRotation(rotation)
  currentRotation.value = normalized
  if (!context.viewer) {
    return
  }
  context.viewer.pagesRotation = normalized
  nextTick(() => {
    if (autoFitWidth.value) {
      fitToWidth()
      return
    }
    context.viewer?.update()
  })
}

function rotateLeft() {
  applyRotation(currentRotation.value - 90)
}

function rotateRight() {
  applyRotation(currentRotation.value + 90)
}

function goToPage(pageNumber: number) {
  if (!context.viewer || !pageCount.value) return
  const nextPage = Math.min(pageCount.value, Math.max(1, pageNumber))
  runWithStableHorizontalScroll(() => {
    context.viewer!.currentPageNumber = nextPage
    currentPage.value = nextPage
  })
}

function setNavMode(mode: PdfNavMode) {
  navMode.value = mode
}

function toggleNav() {
  if (!navigationEnabled.value) {
    return
  }
  navVisible.value = !navVisible.value
  // 导航窗格改变宽度后，默认保持“适合宽度”，避免页面被侧栏挤出可视区。
  nextTick(() => {
    if (autoFitWidth.value) {
      fitToWidth()
      return
    }
    context.viewer?.update()
  })
}

function resetScale() {
  fitToWidth()
}

function toggleOutlineItem(item: PdfOutlineItemView) {
  if (!item.items.length) {
    return
  }
  item.expanded = !item.expanded
}

function goToOutlineItem(item: PdfOutlineItemView) {
  if (!item.dest || !context.linkService) {
    return
  }
  runWithStableHorizontalScroll(() => context.linkService!.goToDestination(item.dest!))
}

onMounted(() => {
  void attachPdfSearchProviderAfterRender()
  void attachPdfZoomProviderAfterRender()
  void loadFile()

  if (container.value) {
    resizeObserver = new ResizeObserver(() => {
      scheduleFitToWidth()
    })
    resizeObserver.observe(container.value)
  }
})

onBeforeUnmount(() => {
  destroyed = true
  loadVersion += 1
  window.cancelAnimationFrame(fitFrame)
  resizeObserver?.disconnect()
  resizeObserver = null
  context.viewer = null
  context.linkService = null
  context.eventBus = null
  context.findController = null
  context.document = null
  detachPdfSearchProvider()
  detachPdfZoomProvider()
  outlineItems.value = []
  props.exportAdapter?.(null)
  const resource = context.resource
  context.resource = null
  void destroyPdfResource(resource)
})

watch([currentScale, loadStatus], () => {
  pdfZoomEmitter.emit()
})

</script>
<template>
  <div
    ref='shell'
    class='pdf-shell'
    data-viewer-search-provider='pdf'
    data-viewer-zoom-provider='pdf'
    :class="{ 'pdf-shell--nav-hidden': !navigationEnabled || !navVisible, 'pdf-shell--toolbar-hidden': !toolbarVisible }"
  >
    <div v-if='toolbarVisible' class='pdf-toolbar'>
      <button
        v-if='navigationEnabled'
        class='pdf-icon-button'
        :class="{ 'pdf-icon-button--active': navVisible }"
        type='button'
        title='切换导航窗格'
        aria-label='切换导航窗格'
        :aria-pressed='navVisible'
        @click='toggleNav'
      >
        <span class='pdf-panel-icon' />
      </button>

      <div class='pdf-toolbar-group'>
        <button
          class='pdf-icon-button'
          type='button'
          title='上一页'
          aria-label='上一页'
          :disabled='!canGoPrevious'
          @click='goToPage(currentPage - 1)'
        >
          <span aria-hidden='true'>‹</span>
        </button>
        <span class='pdf-page-meter'>
          <strong>{{ currentPage }}</strong>
          <span>/ {{ pageCount || '-' }}</span>
        </span>
        <button
          class='pdf-icon-button'
          type='button'
          title='下一页'
          aria-label='下一页'
          :disabled='!canGoNext'
          @click='goToPage(currentPage + 1)'
        >
          <span aria-hidden='true'>›</span>
        </button>
      </div>

      <div class='pdf-toolbar-group pdf-toolbar-group--zoom'>
        <button
          class='pdf-icon-button'
          type='button'
          title='缩小'
          aria-label='缩小'
          :disabled='!canZoomOut'
          @click='zoomOut'
        >
          <span aria-hidden='true'>−</span>
        </button>
        <button class='pdf-scale-button' type='button' title='适合宽度' @click='resetScale'>
          {{ scaleText }}
        </button>
        <button
          class='pdf-icon-button'
          type='button'
          title='放大'
          aria-label='放大'
          :disabled='!canZoomIn'
          @click='zoomIn'
        >
          <span aria-hidden='true'>+</span>
        </button>
      </div>

      <div class='pdf-toolbar-group pdf-toolbar-group--rotate'>
        <button
          class='pdf-icon-button'
          type='button'
          title='向左旋转'
          aria-label='向左旋转'
          @click='rotateLeft'
        >
          <span aria-hidden='true'>↺</span>
        </button>
        <span class='pdf-rotation-meter'>{{ rotationText }}</span>
        <button
          class='pdf-icon-button'
          type='button'
          title='向右旋转'
          aria-label='向右旋转'
          @click='rotateRight'
        >
          <span aria-hidden='true'>↻</span>
        </button>
      </div>
    </div>

    <div class='pdf-content'>
      <aside v-if='navigationEnabled && navVisible' class='pdf-nav-pane'>
        <div class='pdf-nav-head'>
          <span>{{ navMode === 'pages' ? '页面导航' : '目录导航' }}</span>
          <strong>{{ navMode === 'pages' ? `${pageCount} 页` : `${outlineCount} 项` }}</strong>
        </div>
        <div class='pdf-nav-tabs' role='tablist' aria-label='PDF 导航类型'>
          <button
            type='button'
            role='tab'
            :aria-selected="navMode === 'pages' ? 'true' : 'false'"
            :class="{ active: navMode === 'pages' }"
            @click='setNavMode("pages")'
          >
            页面
          </button>
          <button
            type='button'
            role='tab'
            :aria-selected="navMode === 'outline' ? 'true' : 'false'"
            :class="{ active: navMode === 'outline' }"
            @click='setNavMode("outline")'
          >
            目录
          </button>
        </div>
        <div v-if='navMode === "pages"' class='pdf-page-list'>
          <button
            v-for='page in pages'
            :key='page'
            class='pdf-page-button'
            :class="{ 'pdf-page-button--active': page === currentPage }"
            type='button'
            @click='goToPage(page)'
          >
            <span class='pdf-page-thumb'>{{ page }}</span>
            <span class='pdf-page-label'>第 {{ page }} 页</span>
          </button>
        </div>
        <div v-else class='pdf-outline-list'>
          <button
            v-for='entry in flattenedOutlineItems'
            :key='entry.item.id'
            class='pdf-outline-button'
            type='button'
            :style="{ '--outline-depth': entry.depth }"
            @click='goToOutlineItem(entry.item)'
          >
            <span
              class='pdf-outline-toggle'
              :class="{ 'pdf-outline-toggle--open': entry.item.expanded, 'pdf-outline-toggle--empty': !entry.item.items.length }"
              aria-hidden='true'
              @click.stop='toggleOutlineItem(entry.item)'
            />
            <span class='pdf-outline-title'>{{ entry.item.title }}</span>
          </button>
          <div v-if='!outlineCount' class='pdf-outline-empty'>
            当前 PDF 没有可用目录
          </div>
        </div>
      </aside>

      <div class='pdf-viewport'>
        <div ref='container' class='pdf-wrapper' data-viewer-scroll-container='true'>
          <div class='pdfViewer' />
          <div v-if="loadStatus === 'loading'" class='pdf-state'>正在加载 PDF...</div>
          <div v-else-if="loadStatus === 'error'" class='pdf-state pdf-state--error'>{{ errorMessage }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pdf-shell {
    position: relative;
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    min-height: 0;
    color: #1f2937;
    background: #edf2f7;
}

.pdf-toolbar {
    z-index: 2;
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: 48px;
    padding: 6px 12px;
    border-bottom: 1px solid #d7dee8;
    background: #ffffff;
    box-shadow: 0 1px 4px rgb(15 23 42 / 8%);
}

.pdf-toolbar-group {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 36px;
    padding: 0 6px;
    border: 1px solid #dde5ef;
    border-radius: 8px;
    background: #f8fafc;
}

.pdf-toolbar-group--zoom {
    margin-left: auto;
}

.pdf-toolbar-group--rotate {
    flex-shrink: 0;
}

.pdf-icon-button,
.pdf-scale-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 30px;
    border: 1px solid transparent;
    border-radius: 6px;
    color: #334155;
    background: transparent;
    font: inherit;
    line-height: 1;
    cursor: pointer;
    transition: background-color 0.16s ease, border-color 0.16s ease, color 0.16s ease;
}

.pdf-icon-button {
    width: 30px;
    font-size: 18px;
}

.pdf-scale-button {
    width: 64px;
    font-size: 13px;
    font-weight: 600;
}

.pdf-icon-button:hover:not(:disabled),
.pdf-scale-button:hover {
    border-color: #b9c8d8;
    color: #1769d8;
    background: #edf5ff;
}

.pdf-icon-button:disabled {
    color: #a8b3c0;
    cursor: not-allowed;
}

.pdf-icon-button--active {
    border-color: #9ac2ff;
    color: #1769d8;
    background: #e7f1ff;
}

.pdf-panel-icon {
    position: relative;
    display: block;
    width: 16px;
    height: 14px;
    border: 2px solid currentColor;
    border-radius: 3px;
}

.pdf-panel-icon::before {
    position: absolute;
    top: -2px;
    bottom: -2px;
    left: 4px;
    width: 2px;
    background: currentColor;
    content: '';
}

.pdf-page-meter {
    display: inline-flex;
    align-items: baseline;
    justify-content: center;
    min-width: 72px;
    gap: 3px;
    font-size: 13px;
    color: #64748b;
    white-space: nowrap;
}

.pdf-page-meter strong {
    color: #1e293b;
    font-size: 14px;
}

.pdf-rotation-meter {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 42px;
    color: #64748b;
    font-size: 13px;
    font-weight: 700;
    white-space: nowrap;
}

.pdf-content {
    position: relative;
    display: grid;
    grid-template-columns: clamp(148px, 22%, 220px) minmax(0, 1fr);
    flex: 1;
    min-height: 0;
}

.pdf-shell--nav-hidden .pdf-content {
    grid-template-columns: minmax(0, 1fr);
}

.pdf-nav-pane {
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
    overflow: hidden;
    border-right: 1px solid #d7dee8;
    background: #f8fafc;
}

.pdf-nav-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 44px;
    padding: 0 12px;
    border-bottom: 1px solid #e3e9f1;
    color: #475569;
    font-size: 13px;
}

.pdf-nav-head strong {
    color: #1e293b;
    font-size: 12px;
}

.pdf-nav-tabs {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 4px;
    padding: 8px;
    border-bottom: 1px solid #e3e9f1;
    background: #f8fafc;
}

.pdf-nav-tabs button {
    min-width: 0;
    height: 30px;
    border: 1px solid transparent;
    border-radius: 6px;
    color: #64748b;
    background: transparent;
    font: inherit;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
}

.pdf-nav-tabs button:hover,
.pdf-nav-tabs button.active {
    border-color: #b9d4f6;
    color: #1769d8;
    background: #edf5ff;
}

.pdf-page-list {
    flex: 1;
    min-height: 0;
    display: grid;
    align-content: start;
    gap: 8px;
    padding: 10px;
    overflow-y: auto;
}

.pdf-page-button {
    display: grid;
    grid-template-columns: 42px minmax(0, 1fr);
    align-items: center;
    gap: 10px;
    width: 100%;
    min-height: 54px;
    padding: 6px 8px;
    border: 1px solid #dce4ee;
    border-radius: 8px;
    color: #334155;
    background: #ffffff;
    cursor: pointer;
    text-align: left;
    transition: border-color 0.16s ease, box-shadow 0.16s ease, background-color 0.16s ease;
}

.pdf-page-button:hover {
    border-color: #a9c5ea;
    background: #f3f8ff;
}

.pdf-page-button--active {
    border-color: #408fff;
    background: #eaf3ff;
    box-shadow: inset 3px 0 0 #408fff;
}

.pdf-page-thumb {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 42px;
    border: 1px solid #d6e1ee;
    border-radius: 4px;
    color: #1769d8;
    background: linear-gradient(180deg, #ffffff 0%, #edf5ff 100%);
    font-size: 12px;
    font-weight: 700;
}

.pdf-page-label {
    min-width: 0;
    overflow: hidden;
    font-size: 13px;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.pdf-outline-list {
    flex: 1;
    min-height: 0;
    display: grid;
    align-content: start;
    gap: 4px;
    padding: 8px;
    overflow-y: auto;
}

.pdf-outline-button {
    --outline-depth: 0;
    display: grid;
    grid-template-columns: 16px minmax(0, 1fr);
    align-items: center;
    gap: 6px;
    width: 100%;
    min-height: 32px;
    padding: 5px 7px 5px calc(7px + var(--outline-depth) * 14px);
    border: 1px solid transparent;
    border-radius: 6px;
    color: #334155;
    background: transparent;
    font: inherit;
    text-align: left;
    cursor: pointer;
}

.pdf-outline-button:hover {
    border-color: #c7d7eb;
    background: #ffffff;
}

.pdf-outline-toggle {
    position: relative;
    width: 14px;
    height: 14px;
    border-radius: 4px;
    color: #64748b;
}

.pdf-outline-toggle::before {
    position: absolute;
    top: 3px;
    left: 4px;
    width: 6px;
    height: 6px;
    border-right: 2px solid currentColor;
    border-bottom: 2px solid currentColor;
    content: '';
    transform: rotate(-45deg);
    transition: transform 0.16s ease;
}

.pdf-outline-toggle--open::before {
    transform: rotate(45deg);
}

.pdf-outline-toggle--empty::before {
    display: none;
}

.pdf-outline-title {
    min-width: 0;
    overflow: hidden;
    font-size: 12px;
    line-height: 1.35;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.pdf-outline-empty {
    margin: 24px 8px;
    padding: 14px 10px;
    border: 1px dashed #cbd5e1;
    border-radius: 8px;
    color: #64748b;
    background: #ffffff;
    font-size: 12px;
    text-align: center;
}

.pdfViewer {
    margin: 0 auto;
    padding: 18px 14px 28px;
}

.pdf-viewport {
    position: relative;
    width: 100%;
    height: 100%;
    min-width: 0;
    min-height: 0;
}

.pdf-wrapper {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    overflow: auto;
    background: #e8edf4;
}

.pdf-state {
    position: absolute;
    top: 50%;
    left: 50%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 168px;
    min-height: 42px;
    padding: 0 16px;
    border: 1px solid #d7dee8;
    border-radius: 8px;
    color: #475569;
    background: #ffffff;
    box-shadow: 0 10px 30px rgb(15 23 42 / 12%);
    transform: translate(-50%, -50%);
}

.pdf-state--error {
    max-width: min(460px, calc(100% - 32px));
    color: #b42318;
    text-align: center;
}

@media (max-width: 720px) {
    .pdf-toolbar {
        flex-wrap: wrap;
        min-height: 88px;
        align-content: center;
    }

    .pdf-toolbar-group--zoom {
        margin-left: 0;
    }

    .pdf-content,
    .pdf-shell--nav-hidden .pdf-content {
        grid-template-columns: minmax(0, 1fr);
    }

    .pdf-nav-pane {
        position: absolute;
        z-index: 3;
        top: 0;
        bottom: 0;
        left: 0;
        width: min(78vw, 240px);
        box-shadow: 10px 0 24px rgb(15 23 42 / 14%);
    }
}
</style>
