<script setup lang='ts'>
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import {
  createFileViewerZoomChangeEmitter as createZoomChangeEmitter,
  registerFileViewerZoomProvider,
  unregisterFileViewerZoomProvider,
  type FileViewerZoomState
} from '@file-viewer/core'

const props = defineProps<{
  data: ArrayBuffer
}>()

type OfdModule = typeof import('./dltech/ofd/ofd')

const stage = ref<HTMLDivElement | null>(null)
const viewer = ref<HTMLDivElement | null>(null)
const status = ref<'loading' | 'ready' | 'error'>('loading')
const errorMessage = ref('')
const zoom = ref(1)
const ofdZoomEmitter = createZoomChangeEmitter()

let destroyed = false
let renderVersion = 0
let resizeObserver: ResizeObserver | null = null
let resizeTimer = 0
let lastRenderedWidth = 0
let ofdDocumentPromise: Promise<unknown> | null = null

const clearStage = () => {
  const target = stage.value
  if (!target) {
    return
  }
  while (target.firstChild) {
    target.removeChild(target.firstChild)
  }
}

const parseWithOfdJs = (ofd: OfdModule) => {
  return new Promise<unknown[]>((resolve, reject) => {
    // 这里使用 DLTech21/ofd.js 仓库源码的纯 JS 解析入口，避开 npm dist 中的授权 wasm 分支。
    // 签章验签链路已在本地适配为不阻断正文预览，正文、图片、矢量路径仍由同一项目源码渲染。
    ofd.parseOfdDocument({
      ofd: props.data,
      success: documents => resolve(documents),
      fail: (reason: unknown) => reject(reason)
    })
  })
}

const getOfdDocument = async (ofd: OfdModule) => {
  // OFD 解析成本明显高于页面重排，缓存解析结果可以避免容器尺寸变化时重复解压和解析。
  ofdDocumentPromise ||= parseWithOfdJs(ofd).then(documents => {
    const ofdDocument = documents[0]

    if (!ofdDocument) {
      throw new Error('OFD 文件中没有可渲染的文档')
    }

    return ofdDocument
  })

  return ofdDocumentPromise
}

const normalizeError = (reason: unknown) => {
  if (reason instanceof Error) {
    return reason.message
  }
  return typeof reason === 'string' ? reason : JSON.stringify(reason)
}

const appendPages = (target: HTMLDivElement, pages: HTMLElement[]) => {
  const fragment = document.createDocumentFragment()

  pages.forEach(page => {
    const frame = document.createElement('div')
    frame.className = 'ofd-page-frame'
    page.classList.add('ofd-page')
    frame.appendChild(page)
    fragment.appendChild(frame)
  })

  target.appendChild(fragment)
}

const getRenderWidth = () => {
  const baseWidth = viewer.value?.getBoundingClientRect().width || stage.value?.getBoundingClientRect().width || 0

  // 使用外层容器宽度并预留滚动条和页边距空间，避免渲染后纵向滚动条改变 stage 宽度造成循环重绘。
  return Math.max(Math.floor(baseWidth - 48), 240)
}

const clampZoom = (value: number) => {
  return Math.min(3, Math.max(0.35, Number(value.toFixed(2))))
}

const getZoomState = (): FileViewerZoomState => ({
  scale: zoom.value,
  label: `${Math.round(zoom.value * 100)}%`,
  canZoomIn: zoom.value < 3,
  canZoomOut: zoom.value > 0.35,
  canReset: zoom.value !== 1,
  minScale: 0.35,
  maxScale: 3
})

const setZoom = (nextZoom: number) => {
  zoom.value = clampZoom(nextZoom)
  syncPageZoom()
  ofdZoomEmitter.emit()
  return getZoomState()
}

const syncPageZoom = () => {
  const target = stage.value
  if (!target) {
    return
  }

  target.querySelectorAll<HTMLElement>('.ofd-page-frame').forEach(frame => {
    const page = frame.firstElementChild
    if (!(page instanceof HTMLElement)) {
      return
    }

    page.style.position = 'absolute'
    page.style.top = '0'
    page.style.left = '50%'
    page.style.transform = `translateX(-50%) scale(${zoom.value})`
    page.style.transformOrigin = 'top center'
    page.style.marginLeft = '0'
    page.style.marginRight = '0'

    const pageWidth = page.offsetWidth
    const pageHeight = page.offsetHeight
    if (!pageWidth || !pageHeight) {
      return
    }

    frame.style.width = `${Math.ceil(pageWidth * zoom.value)}px`
    frame.style.height = `${Math.ceil(pageHeight * zoom.value)}px`
  })
}

const attachZoomProvider = () => {
  const host = viewer.value
  if (!host) {
    return
  }

  registerFileViewerZoomProvider(host, {
    zoomIn: () => setZoom(zoom.value + 0.1),
    zoomOut: () => setZoom(zoom.value - 0.1),
    resetZoom: () => setZoom(1),
    setZoom,
    getState: getZoomState,
    subscribe: ofdZoomEmitter.subscribe
  })
}

const renderWithOfdJs = async (width: number) => {
  // OFD 解析/渲染引擎只在命中 .ofd 时动态进入当前异步块，避免拖慢普通文件预览。
  const ofd = await import('./dltech/ofd/ofd')
  const ofdDocument = await getOfdDocument(ofd)

  if (destroyed) {
    return []
  }

  return Promise.resolve(ofd.renderOfd(width, ofdDocument))
}

const render = async (options: { force?: boolean, showLoading?: boolean } = {}) => {
  const target = stage.value
  if (!target) {
    return
  }

  const force = options.force ?? false
  const showLoading = options.showLoading ?? false
  const width = getRenderWidth()

  if (!force && status.value === 'ready' && Math.abs(width - lastRenderedWidth) < 8) {
    return
  }

  const version = ++renderVersion

  if (showLoading || status.value !== 'ready') {
    status.value = 'loading'
    clearStage()
  }

  errorMessage.value = ''

  try {
    await nextTick()
    const pages = await renderWithOfdJs(width)

    if (destroyed || version !== renderVersion) {
      return
    }

    clearStage()
    appendPages(target, pages)
    lastRenderedWidth = width
    await nextTick()
    syncPageZoom()
    status.value = 'ready'
    ofdZoomEmitter.emit()
  } catch (reason) {
    if (destroyed || version !== renderVersion) {
      return
    }

    console.error(reason)
    status.value = 'error'
    errorMessage.value = normalizeError(reason) || 'OFD 文件解析失败'
  }
}

const startResizeObserver = () => {
  if (!viewer.value || resizeObserver) {
    return
  }

  resizeObserver = new ResizeObserver(() => {
    window.clearTimeout(resizeTimer)
    resizeTimer = window.setTimeout(() => {
      if (!destroyed) {
        void render({ showLoading: false })
      }
    }, 180)
  })
  resizeObserver.observe(viewer.value)
}

onMounted(() => {
  attachZoomProvider()
  void render({ force: true, showLoading: true }).finally(() => {
    startResizeObserver()
  })
})

onBeforeUnmount(() => {
  destroyed = true
  renderVersion += 1
  window.clearTimeout(resizeTimer)
  resizeObserver?.disconnect()
  resizeObserver = null
  unregisterFileViewerZoomProvider(viewer.value)
  clearStage()
})
</script>

<template>
  <div ref='viewer' class='ofd-viewer' data-viewer-zoom-provider='ofd'>
    <div v-if='status === "loading"' class='ofd-state'>正在解析 OFD...</div>
    <div v-else-if='status === "error"' class='ofd-state error'>{{ errorMessage }}</div>
    <div ref='stage' class='ofd-stage' />
  </div>
</template>

<style scoped>
.ofd-viewer {
  position: relative;
  min-height: 100%;
  background: #e9edf2;
}

.ofd-stage {
  min-height: 100%;
  padding: 18px 0 28px;
  overflow: auto;
  scrollbar-gutter: stable;
}

.ofd-state {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(246, 248, 250, 0.92);
  color: #64748b;
  font-size: 14px;
}

.ofd-state.error {
  color: #b42318;
}
</style>

<style>
.ofd-page-frame {
  position: relative;
  display: block;
  margin: 0 auto 20px;
  overflow: visible;
}

.ofd-page {
  display: block;
  margin-left: auto !important;
  margin-right: auto !important;
  box-shadow: 0 10px 26px rgba(15, 23, 42, 0.12);
  transition: transform 0.16s ease;
}
</style>
