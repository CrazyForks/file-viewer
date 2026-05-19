<script setup lang='ts'>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { getDocument, GlobalWorkerOptions, version } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { EventBus, GenericL10n, PDFFindController, PDFLinkService, PDFViewer } from 'pdfjs-dist/legacy/web/pdf_viewer.mjs'
import './pdf.css'
import PDFWorker from './worker'

const props = defineProps<{
  data: ArrayBuffer,
}>()

const MIN_SCALE = 0.2
const MAX_SCALE = 3
const SCALE_STEP = 0.1
const FIT_HORIZONTAL_PADDING = 28
const PAGE_BORDER_WIDTH = 18

// PDF.js 的滚动容器。
const container = ref<HTMLDivElement | null>(null)
const navVisible = ref(true)
const loadStatus = ref<'loading' | 'ready' | 'error'>('loading')
const errorMessage = ref('')
const currentPage = ref(1)
const pageCount = ref(0)
const currentScale = ref(1)
const autoFitWidth = ref(true)

const pages = computed(() => Array.from({ length: pageCount.value }, (_, index) => index + 1))
const scaleText = computed(() => `${Math.round(currentScale.value * 100)}%`)
const canGoPrevious = computed(() => currentPage.value > 1)
const canGoNext = computed(() => currentPage.value < pageCount.value)
const canZoomOut = computed(() => currentScale.value > MIN_SCALE)
const canZoomIn = computed(() => currentScale.value < MAX_SCALE)

// PDF.js 实例上下文统一保存在这里，便于工具栏和导航窗格操作同一个 viewer。
const context = {
  viewer: null as null | PDFViewer,
  loadingTask: null as null | ReturnType<typeof getDocument>,
  search: ''
}

let resizeObserver: ResizeObserver | null = null
let fitFrame = 0

// 指定worker端口
if (!GlobalWorkerOptions.workerPort && typeof window !== 'undefined' && 'Worker' in window) {
  GlobalWorkerOptions.workerPort = PDFWorker.create()
}

async function loadFile() {
  if (!container.value) return
  loadStatus.value = 'loading'
  errorMessage.value = ''

  try {
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
    pdfLinkService.setViewer(pdfViewer)

    eventBus.on('pagesinit', () => {
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

    // cMap 使用远程按需加载，保证中文和表单类 PDF 在部署环境中仍能正常显示。
    context.loadingTask = getDocument({
      data: props.data,
      cMapUrl: `https://npm.onmicrosoft.cn/pdfjs-dist@${version}/cmaps/`,
      useWorkerFetch: true,
      cMapPacked: true,
      enableXfa: true
    })

    const pdfDocument = await context.loadingTask.promise
    pageCount.value = pdfDocument.numPages
    currentPage.value = 1

    pdfViewer.setDocument(pdfDocument)
    pdfLinkService.setDocument(pdfDocument, null)
  } catch (error) {
    loadStatus.value = 'error'
    errorMessage.value = error instanceof Error ? error.message : 'PDF 加载失败'
  }
}

function getPageWidthAtScaleOne(pdfViewer: PDFViewer) {
  const pageView = pdfViewer.getPageView(0)
  const pdfPage = pageView?.pdfPage
  if (pdfPage) {
    return pdfPage.getViewport({ scale: 1 }).width
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

function setScale(scale: number) {
  if (!context.viewer) return
  const normalizedScale = clampScale(scale)
  context.viewer.currentScale = normalizedScale
  currentScale.value = normalizedScale
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

function goToPage(pageNumber: number) {
  if (!context.viewer || !pageCount.value) return
  const nextPage = Math.min(pageCount.value, Math.max(1, pageNumber))
  context.viewer.currentPageNumber = nextPage
  currentPage.value = nextPage
}

function toggleNav() {
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

onMounted(() => {
  void loadFile()

  if (container.value) {
    resizeObserver = new ResizeObserver(() => {
      scheduleFitToWidth()
    })
    resizeObserver.observe(container.value)
  }
})

onBeforeUnmount(() => {
  window.cancelAnimationFrame(fitFrame)
  resizeObserver?.disconnect()
  resizeObserver = null
  context.loadingTask?.destroy()
})

</script>
<template>
  <div class='pdf-shell' :class="{ 'pdf-shell--nav-hidden': !navVisible }">
    <div class='pdf-toolbar'>
      <button
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
    </div>

    <div class='pdf-content'>
      <aside v-if='navVisible' class='pdf-nav-pane'>
        <div class='pdf-nav-head'>
          <span>页面导航</span>
          <strong>{{ pageCount }} 页</strong>
        </div>
        <div class='pdf-page-list'>
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
      </aside>

      <div class='pdf-viewport'>
        <div ref='container' class='pdf-wrapper'>
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
