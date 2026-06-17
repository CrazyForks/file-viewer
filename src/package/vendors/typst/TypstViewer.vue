<script setup lang='ts'>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { $typst } from '@myriaddreamin/typst.ts'
import typstRendererWasmUrl from '@myriaddreamin/typst-ts-renderer/pkg/typst_ts_renderer_bg.wasm?url'
import {
  formatCssPixels,
  resolveFileViewerTypstCompilerWasmUrl,
  type FileRenderExportAdapter,
  type FileViewerZoomState,
  type PrintPageSize
} from '@file-viewer/core'
import {
  createZoomChangeEmitter,
  registerFileViewerZoomProvider,
  unregisterFileViewerZoomProvider
} from '@/package/use/viewerZoom'

declare global {
  interface Window {
    __FLYFISH_TYPST_COMPILER_WASM_URL__?: string;
  }
}

const props = defineProps<{
  source: string,
  filename?: string,
  compilerWasmUrl?: string,
  exportAdapter?: (adapter: FileRenderExportAdapter | null) => void
}>()

type RenderState = 'idle' | 'loading' | 'ready' | 'error'

interface TypstRenderedPage extends PrintPageSize {
  index: number;
  svg: string;
}

const renderState = ref<RenderState>('idle')
const root = ref<HTMLDivElement | null>(null)
const pages = ref<TypstRenderedPage[]>([])
const errorMessage = ref('')
const zoom = ref(1)
const typstZoomEmitter = createZoomChangeEmitter()
let renderToken = 0
let runtimeConfigured = false

const resolveTypstCompilerWasmUrl = () => {
  return resolveFileViewerTypstCompilerWasmUrl(
    { compilerWasmUrl: props.compilerWasmUrl },
    [
      window.__FLYFISH_TYPST_COMPILER_WASM_URL__,
      import.meta.env.VITE_TYPST_COMPILER_WASM_URL
    ]
  )
}

const ensureTypstRuntime = () => {
  if (runtimeConfigured) {
    return
  }

  // Cloudflare Pages limits a single uploaded file to 25 MiB. The Typst
  // compiler WASM is larger than that, so load it lazily from a configurable
  // CDN URL while keeping the smaller renderer WASM in the local async chunk.
  $typst.setCompilerInitOptions({
    getModule: resolveTypstCompilerWasmUrl
  })
  $typst.setRendererInitOptions({
    getModule: () => typstRendererWasmUrl
  })
  runtimeConfigured = true
}

const escapeAttribute = (value: string) => {
  return value.replace(/[&<>"']/g, char => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }
    return entities[char]
  })
}

const readNumberAttribute = (element: Element, name: string) => {
  const value = Number.parseFloat(element.getAttribute(name) || '')
  return Number.isFinite(value) && value > 0 ? value : 0
}

const removeUnsafeSvgContent = (root: Document | Element) => {
  root.querySelectorAll('script').forEach(script => script.remove())
  root.querySelectorAll('*').forEach(element => {
    Array.from(element.attributes).forEach(attribute => {
      const name = attribute.name.toLowerCase()
      const value = attribute.value.trim().toLowerCase()
      if (name.startsWith('on') || value.startsWith('javascript:')) {
        element.removeAttribute(attribute.name)
      }
    })
  })
}

const serializeNode = (node: Node) => {
  return new XMLSerializer().serializeToString(node)
}

const parseTypstSvgPages = (svgText: string): TypstRenderedPage[] => {
  const parser = new DOMParser()
  const documentSvg = parser.parseFromString(svgText, 'image/svg+xml')
  const parseError = documentSvg.querySelector('parsererror')
  if (parseError) {
    throw new Error(parseError.textContent || 'Typst SVG 解析失败')
  }

  removeUnsafeSvgContent(documentSvg)
  const root = documentSvg.documentElement
  const sharedNodes = Array.from(root.children)
    .filter(child => ['style', 'defs'].includes(child.tagName.toLowerCase()))
    .map(serializeNode)
    .join('')
  const pageGroups = Array.from(root.querySelectorAll('g.typst-page'))
  const fallbackWidth = readNumberAttribute(root, 'data-width') ||
    readNumberAttribute(root, 'width') ||
    596
  const fallbackHeight = readNumberAttribute(root, 'data-height') ||
    readNumberAttribute(root, 'height') ||
    842

  if (!pageGroups.length) {
    return [{
      index: 1,
      width: fallbackWidth,
      height: fallbackHeight,
      svg: svgText
    }]
  }

  return pageGroups.map((group, index) => {
    const pageWidth = readNumberAttribute(group, 'data-page-width') || fallbackWidth
    const pageHeight = readNumberAttribute(group, 'data-page-height') || fallbackHeight
    const pageClone = group.cloneNode(true) as Element
    pageClone.setAttribute('transform', 'translate(0, 0)')
    const pageSvg = [
      `<svg style="overflow:visible;" class="typst-doc" viewBox="0 0 ${pageWidth} ${pageHeight}" width="${pageWidth}" height="${pageHeight}" data-width="${pageWidth}" data-height="${pageHeight}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:h5="http://www.w3.org/1999/xhtml">`,
      sharedNodes,
      serializeNode(pageClone),
      '</svg>'
    ].join('')

    return {
      index: index + 1,
      width: pageWidth,
      height: pageHeight,
      svg: pageSvg
    }
  })
}

const formatTypstError = (error: unknown) => {
  if (Array.isArray(error)) {
    return error.map(item => {
      if (item && typeof item === 'object' && 'message' in item) {
        const severity = 'severity' in item ? String(item.severity) : 'Error'
        return `${severity}: ${String(item.message)}`
      }
      return String(item)
    }).join('\n')
  }

  if (error instanceof Error) {
    return error.message
  }

  return String(error)
}

const pageSummary = computed(() => {
  if (!pages.value.length) {
    return '0 pages'
  }
  const firstPage = pages.value[0]
  return `${pages.value.length} pages / ${Math.round(firstPage.width)} x ${Math.round(firstPage.height)} pt`
})

const clampZoom = (value: number) => {
  return Math.min(3, Math.max(0.3, Number(value.toFixed(2))))
}

const getZoomState = (): FileViewerZoomState => ({
  scale: zoom.value,
  label: `${Math.round(zoom.value * 100)}%`,
  canZoomIn: zoom.value < 3,
  canZoomOut: zoom.value > 0.3,
  canReset: zoom.value !== 1,
  minScale: 0.3,
  maxScale: 3
})

const attachZoomProvider = () => {
  const host = root.value
  if (!host) {
    return
  }

  registerFileViewerZoomProvider(host, {
    zoomIn: () => {
      zoom.value = clampZoom(zoom.value + 0.1)
      return getZoomState()
    },
    zoomOut: () => {
      zoom.value = clampZoom(zoom.value - 0.1)
      return getZoomState()
    },
    resetZoom: () => {
      zoom.value = 1
      return getZoomState()
    },
    setZoom: scale => {
      zoom.value = clampZoom(scale)
      return getZoomState()
    },
    getState: getZoomState,
    subscribe: typstZoomEmitter.subscribe
  })
}

const getPreviewPageWidth = (page: TypstRenderedPage) => `${page.width * zoom.value}px`
const getPreviewPageHeight = (page: TypstRenderedPage) => `${page.height * zoom.value}px`

const buildExportStyles = () => `
  <style>
    .typst-export-document {
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 18px;
      margin: 0;
      padding: 24px;
      background: #eef1f4;
    }
    .typst-export-page {
      box-sizing: border-box;
      flex: 0 0 auto;
      overflow: hidden;
      background: #ffffff;
      box-shadow: 0 18px 42px rgba(15, 23, 42, 0.14);
    }
    .typst-export-page svg {
      display: block;
      width: 100%;
      height: auto;
    }
  </style>
`

const buildExportHtml = () => {
  return `${buildExportStyles()}<main class="typst-export-document" aria-label="${escapeAttribute(props.filename || 'Typst document')}">${pages.value.map(page => {
    const width = formatCssPixels(page.width)
    const height = formatCssPixels(page.height)
    return `<section class="typst-export-page viewer-print-page" style="--viewer-print-page-width:${width};--viewer-print-page-height:${height};width:${width};height:${height};" aria-label="Page ${page.index}">${page.svg}</section>`
  }).join('')}</main>`
}

const buildPrintStyle = () => {
  const firstPage = pages.value[0]
  const width = firstPage ? formatCssPixels(firstPage.width) : '596px'
  const height = firstPage ? formatCssPixels(firstPage.height) : '842px'

  return `
    @page { size: ${width} ${height}; margin: 0; }
    @media print {
      html,
      body {
        width: ${width};
        min-width: ${width};
        margin: 0 !important;
        background: #ffffff !important;
      }
      .typst-export-document {
        display: block !important;
        margin: 0 !important;
        padding: 0 !important;
        background: #ffffff !important;
      }
      .typst-export-page {
        display: block !important;
        margin: 0 !important;
        border: 0 !important;
        box-shadow: none !important;
        break-after: page;
        page-break-after: always;
      }
      .typst-export-page:last-child {
        break-after: auto;
        page-break-after: auto;
      }
      .typst-export-page svg {
        width: 100% !important;
        height: auto !important;
      }
    }
  `
}

const registerExportAdapter = () => {
  if (!props.exportAdapter || !pages.value.length) {
    props.exportAdapter?.(null)
    return
  }

  props.exportAdapter({
    includeDocumentStyles: false,
    print: true,
    exportHtml: true,
    printStyle: buildPrintStyle,
    toHtml: buildExportHtml
  })
}

const renderTypst = async () => {
  const token = ++renderToken
  renderState.value = 'loading'
  errorMessage.value = ''
  pages.value = []
  props.exportAdapter?.(null)

  try {
    ensureTypstRuntime()
    const svg = await $typst.svg({
      mainContent: props.source,
      data_selection: {
        body: true,
        defs: true,
        css: true,
        js: false
      }
    })

    if (token !== renderToken) {
      return
    }

    pages.value = parseTypstSvgPages(svg)
    renderState.value = 'ready'
    registerExportAdapter()
  } catch (error) {
    if (token !== renderToken) {
      return
    }
    errorMessage.value = formatTypstError(error)
    renderState.value = 'error'
  }
}

watch(() => props.source, renderTypst, { immediate: true })

watch(zoom, () => {
  typstZoomEmitter.emit()
})

onMounted(attachZoomProvider)

onBeforeUnmount(() => {
  renderToken += 1
  unregisterFileViewerZoomProvider(root.value)
  props.exportAdapter?.(null)
})
</script>

<template>
  <div ref='root' class='typst-viewer' data-viewer-zoom-provider='typst'>
    <header class='typst-toolbar'>
      <div>
        <strong>{{ filename || 'Typst document' }}</strong>
        <span>{{ renderState === 'ready' ? pageSummary : 'Typst WASM renderer' }}</span>
      </div>
      <em>{{ renderState === 'loading' ? '正在编译' : renderState === 'error' ? '编译失败' : '已渲染' }}</em>
    </header>

    <div v-if='renderState === "loading"' class='typst-loading' role='status'>
      <span aria-hidden='true' />
      <strong>正在解析 Typst</strong>
      <p>加载编译器并生成页面预览...</p>
    </div>

    <div v-else-if='renderState === "error"' class='typst-error'>
      <strong>Typst 渲染失败</strong>
      <pre>{{ errorMessage }}</pre>
    </div>

    <main v-else class='typst-pages' aria-label='Typst preview pages'>
      <section
        v-for='page in pages'
        :key='page.index'
        class='typst-page-shell'
        :style="{
          '--typst-page-width': getPreviewPageWidth(page),
          '--typst-page-height': getPreviewPageHeight(page)
        }"
        :aria-label='`Page ${page.index}`'
      >
        <div class='typst-page-content' v-html='page.svg' />
      </section>
    </main>
  </div>
</template>

<style scoped>
.typst-viewer {
  min-height: 100%;
  overflow: auto;
  background: #eef1f4;
  color: #172033;
}

.typst-toolbar {
  position: sticky;
  top: 0;
  z-index: 2;
  display: flex;
  min-height: 52px;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 10px 18px;
  border-bottom: 1px solid rgba(120, 134, 155, 0.18);
  background: rgba(248, 250, 252, 0.92);
  backdrop-filter: blur(16px);
}

.typst-toolbar div {
  min-width: 0;
}

.typst-toolbar strong,
.typst-toolbar span {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.typst-toolbar strong {
  color: #172033;
  font-size: 14px;
  font-weight: 800;
}

.typst-toolbar span,
.typst-toolbar em {
  color: #6a778b;
  font-size: 12px;
  font-style: normal;
  font-weight: 700;
}

.typst-pages {
  display: flex;
  min-height: calc(100% - 52px);
  flex-direction: column;
  align-items: center;
  gap: 22px;
  box-sizing: border-box;
  padding: 28px 16px 44px;
}

.typst-page-shell {
  width: min(var(--typst-page-width), 100%);
  max-width: 100%;
  overflow: hidden;
  border: 1px solid rgba(20, 35, 53, 0.1);
  background: #ffffff;
  box-shadow: 0 18px 44px rgba(15, 23, 42, 0.14);
}

.typst-page-content :deep(svg) {
  display: block;
  width: 100%;
  height: auto;
}

.typst-loading,
.typst-error {
  width: min(520px, calc(100% - 32px));
  box-sizing: border-box;
  margin: 80px auto;
  padding: 26px;
  border: 1px solid rgba(120, 134, 155, 0.18);
  border-radius: 14px;
  background: #ffffff;
  box-shadow: 0 18px 44px rgba(15, 23, 42, 0.12);
}

.typst-loading {
  display: grid;
  justify-items: center;
  gap: 10px;
  text-align: center;
}

.typst-loading span {
  width: 34px;
  height: 34px;
  border: 3px solid rgba(46, 130, 94, 0.18);
  border-top-color: #239661;
  border-radius: 999px;
  animation: typst-spin 0.8s linear infinite;
}

.typst-loading strong,
.typst-error strong {
  color: #172033;
  font-size: 16px;
}

.typst-loading p {
  margin: 0;
  color: #6a778b;
  font-size: 13px;
}

.typst-error {
  color: #9f1d1d;
}

.typst-error pre {
  max-height: 360px;
  margin: 14px 0 0;
  overflow: auto;
  border-radius: 10px;
  background: #fff1f2;
  color: #9f1d1d;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace;
  font-size: 12px;
  line-height: 1.7;
  padding: 14px;
  white-space: pre-wrap;
}

:global(.file-viewer[data-viewer-theme='dark'] .typst-viewer) {
  background: #101820;
  color: #e6edf3;
}

:global(.file-viewer[data-viewer-theme='dark'] .typst-toolbar) {
  border-bottom-color: rgba(139, 148, 158, 0.22);
  background: rgba(15, 23, 42, 0.9);
}

:global(.file-viewer[data-viewer-theme='dark'] .typst-toolbar strong) {
  color: #f8fafc;
}

:global(.file-viewer[data-viewer-theme='dark'] .typst-toolbar span),
:global(.file-viewer[data-viewer-theme='dark'] .typst-toolbar em) {
  color: #9aa7b8;
}

:global(.file-viewer[data-viewer-theme='dark'] .typst-page-shell) {
  border-color: rgba(139, 148, 158, 0.26);
  box-shadow: 0 24px 56px rgba(0, 0, 0, 0.38);
}

:global(.file-viewer[data-viewer-theme='dark'] .typst-loading),
:global(.file-viewer[data-viewer-theme='dark'] .typst-error) {
  border-color: rgba(139, 148, 158, 0.22);
  background: #151b23;
  box-shadow: 0 24px 56px rgba(0, 0, 0, 0.32);
}

:global(.file-viewer[data-viewer-theme='dark'] .typst-loading strong),
:global(.file-viewer[data-viewer-theme='dark'] .typst-error strong) {
  color: #f8fafc;
}

@keyframes typst-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 767px) {
  .typst-toolbar {
    align-items: flex-start;
    flex-direction: column;
    gap: 4px;
  }

  .typst-pages {
    gap: 16px;
    padding: 16px 10px 28px;
  }
}

@media (prefers-color-scheme: dark) {
  :global(.file-viewer[data-viewer-theme='system'] .typst-viewer) {
    background: #101820;
    color: #e6edf3;
  }

  :global(.file-viewer[data-viewer-theme='system'] .typst-toolbar) {
    border-bottom-color: rgba(139, 148, 158, 0.22);
    background: rgba(15, 23, 42, 0.9);
  }

  :global(.file-viewer[data-viewer-theme='system'] .typst-toolbar strong) {
    color: #f8fafc;
  }

  :global(.file-viewer[data-viewer-theme='system'] .typst-toolbar span),
  :global(.file-viewer[data-viewer-theme='system'] .typst-toolbar em) {
    color: #9aa7b8;
  }

  :global(.file-viewer[data-viewer-theme='system'] .typst-page-shell) {
    border-color: rgba(139, 148, 158, 0.26);
    box-shadow: 0 24px 56px rgba(0, 0, 0, 0.38);
  }

  :global(.file-viewer[data-viewer-theme='system'] .typst-loading),
  :global(.file-viewer[data-viewer-theme='system'] .typst-error) {
    border-color: rgba(139, 148, 158, 0.22);
    background: #151b23;
    box-shadow: 0 24px 56px rgba(0, 0, 0, 0.32);
  }

  :global(.file-viewer[data-viewer-theme='system'] .typst-loading strong),
  :global(.file-viewer[data-viewer-theme='system'] .typst-error strong) {
    color: #f8fafc;
  }
}
</style>
