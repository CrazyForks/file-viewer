<script setup lang='ts'>
import { computed, nextTick, onMounted, ref } from 'vue'
import { readText } from '@/package/common/util'

const props = defineProps<{
  // 绘图文件二进制内容。Excalidraw 与 draw.io 都保持在命中格式时才解析。
  data: ArrayBuffer,
  // 文件扩展名，用于选择官方 Excalidraw 或 diagrams.net viewer 链路。
  type: string
}>()

declare global {
  interface Window {
    GraphViewer?: {
      createViewerForElement: (element: HTMLElement, callback?: (viewer: unknown) => void) => unknown
      processElements: (className?: string) => void
    }
  }
}

const DIAGRAMS_VIEWER_URL = 'https://viewer.diagrams.net/js/viewer-static.min.js'

let diagramsViewerPromise: Promise<void> | null = null

const status = ref<'loading' | 'ready' | 'error'>('loading')
const errorMessage = ref('')
const stage = ref<HTMLDivElement | null>(null)
const zoom = ref(1)

const normalizedType = computed(() => props.type.toLowerCase())
const isExcalidraw = computed(() => normalizedType.value === 'excalidraw')
const formatLabel = computed(() => {
  if (normalizedType.value === 'dio') {
    return 'DRAWIO'
  }
  return normalizedType.value.toUpperCase()
})

const canvasStyle = computed(() => {
  return isExcalidraw.value
    ? { transform: `scale(${zoom.value})`, transformOrigin: 'top center' }
    : { zoom: zoom.value }
})

const clampZoom = (value: number) => {
  return Math.min(3, Math.max(0.5, Number(value.toFixed(2))))
}

const zoomIn = () => {
  zoom.value = clampZoom(zoom.value + 0.15)
}

const zoomOut = () => {
  zoom.value = clampZoom(zoom.value - 0.15)
}

const resetZoom = () => {
  zoom.value = 1
}

const clearStage = () => {
  const target = stage.value
  if (!target) {
    return
  }

  while (target.firstChild) {
    target.removeChild(target.firstChild)
  }
}

const loadDiagramsViewer = () => {
  if (window.GraphViewer) {
    return Promise.resolve()
  }

  diagramsViewerPromise ||= new Promise<void>((resolve, reject) => {
    const existed = document.querySelector<HTMLScriptElement>(`script[src="${DIAGRAMS_VIEWER_URL}"]`)
    if (existed) {
      existed.addEventListener('load', () => resolve(), { once: true })
      existed.addEventListener('error', () => reject(new Error('diagrams.net viewer 加载失败')), { once: true })
      return
    }

    const script = document.createElement('script')
    script.src = DIAGRAMS_VIEWER_URL
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('diagrams.net viewer 加载失败'))
    document.head.appendChild(script)
  })

  return diagramsViewerPromise
}

const renderExcalidraw = async (text: string) => {
  const target = stage.value
  if (!target) {
    return
  }

  const payload = JSON.parse(text)
  const elements = Array.isArray(payload.elements) ? payload.elements.filter((element: any) => !element.isDeleted) : []
  if (!elements.length) {
    throw new Error('Excalidraw 文件中没有可预览图元')
  }

  const { exportToSvg } = await import('@excalidraw/excalidraw')
  const svg = await exportToSvg({
    elements,
    appState: {
      ...(payload.appState || {}),
      exportBackground: true,
      viewBackgroundColor: payload.appState?.viewBackgroundColor || '#ffffff'
    },
    files: payload.files || {}
  })

  svg.classList.add('drawing-svg')
  target.appendChild(svg)
}

const renderDrawio = async (text: string) => {
  const target = stage.value
  if (!target) {
    return
  }

  await loadDiagramsViewer()
  await nextTick()

  const host = document.createElement('div')
  host.className = 'mxgraph drawing-mxgraph'
  host.setAttribute('data-mxgraph', JSON.stringify({
    xml: text,
    toolbar: 'zoom layers lightbox',
    nav: true,
    resize: true,
    'auto-fit': true,
    'auto-crop': true,
    'auto-origin': true,
    'allow-zoom-in': true,
    'allow-zoom-out': true,
    border: 16,
    highlight: '#0f766e'
  }))
  target.appendChild(host)

  if (!window.GraphViewer) {
    throw new Error('diagrams.net viewer 未正确初始化')
  }

  // 使用官方 diagrams.net GraphViewer 渲染 mxGraphModel / mxfile，避免自行解析 draw.io 方言。
  window.GraphViewer.createViewerForElement(host)
}

const loadDrawing = async () => {
  status.value = 'loading'
  errorMessage.value = ''
  zoom.value = 1
  clearStage()

  try {
    const text = await readText(props.data)
    if (isExcalidraw.value) {
      await renderExcalidraw(text)
    } else {
      await renderDrawio(text)
    }
    status.value = 'ready'
  } catch (error) {
    console.error(error)
    errorMessage.value = error instanceof Error ? error.message : String(error)
    status.value = 'error'
  }
}

onMounted(loadDrawing)
</script>

<template>
  <div class='drawing-viewer'>
    <div class='drawing-toolbar'>
      <div class='drawing-title'>
        <span>{{ formatLabel }}</span>
        <strong>{{ isExcalidraw ? 'Excalidraw 官方 SVG 预览' : 'diagrams.net 官方 Viewer 预览' }}</strong>
      </div>
      <div class='drawing-actions'>
        <button type='button' title='缩小' @click='zoomOut'>-</button>
        <span>{{ Math.round(zoom * 100) }}%</span>
        <button type='button' title='放大' @click='zoomIn'>+</button>
        <button type='button' title='适合宽度' @click='resetZoom'>适合</button>
      </div>
    </div>

    <div class='drawing-stage'>
      <div v-if='status === "loading"' class='drawing-state'>正在加载官方绘图预览器...</div>
      <div v-else-if='status === "error"' class='drawing-state error'>{{ errorMessage }}</div>
      <div class='drawing-scroll'>
        <div ref='stage' class='drawing-canvas' :style='canvasStyle' />
      </div>
    </div>
  </div>
</template>

<style scoped>
.drawing-viewer {
  display: flex;
  height: 100%;
  min-height: 360px;
  flex-direction: column;
  background: #edf2f7;
  color: #172033;
}

.drawing-toolbar {
  position: sticky;
  top: 0;
  z-index: 2;
  display: flex;
  min-height: 46px;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 8px 14px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.35);
  background: rgba(248, 250, 252, 0.92);
  backdrop-filter: blur(12px);
}

.drawing-title {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 10px;
}

.drawing-title span {
  display: inline-flex;
  height: 24px;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  padding: 0 8px;
  background: #0f766e;
  color: #ffffff;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0;
}

.drawing-title strong {
  overflow: hidden;
  color: #172033;
  font-size: 13px;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.drawing-actions {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 6px;
}

.drawing-actions button {
  min-width: 32px;
  height: 28px;
  border: 1px solid rgba(100, 116, 139, 0.28);
  border-radius: 6px;
  background: #ffffff;
  color: #0f172a;
  cursor: pointer;
  font-size: 12px;
  font-weight: 800;
}

.drawing-actions button:hover {
  border-color: rgba(15, 118, 110, 0.5);
  color: #0f766e;
}

.drawing-actions span {
  min-width: 48px;
  color: #64748b;
  font-size: 12px;
  font-weight: 800;
  text-align: center;
}

.drawing-stage {
  position: relative;
  min-height: 0;
  flex: 1;
  overflow: hidden;
}

.drawing-scroll {
  height: 100%;
  overflow: auto;
  padding: 22px;
}

.drawing-canvas {
  width: 100%;
  min-height: 420px;
  transition: transform 0.18s ease, zoom 0.18s ease;
}

.drawing-canvas :deep(.drawing-svg),
.drawing-canvas :deep(svg) {
  display: block;
  max-width: 100%;
  height: auto;
  margin: 0 auto;
  border-radius: 10px;
  background: #ffffff;
  box-shadow: 0 18px 42px rgba(15, 23, 42, 0.12);
}

.drawing-canvas :deep(.drawing-mxgraph) {
  min-height: 420px;
  overflow: hidden;
  border-radius: 10px;
  background: #ffffff;
  box-shadow: 0 18px 42px rgba(15, 23, 42, 0.12);
}

.drawing-state {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  color: #64748b;
  font-size: 14px;
  font-weight: 700;
  text-align: center;
}

.drawing-state.error {
  color: #b42318;
}

@media (max-width: 720px) {
  .drawing-toolbar {
    align-items: flex-start;
    flex-direction: column;
  }

  .drawing-actions {
    width: 100%;
    justify-content: space-between;
  }

  .drawing-scroll {
    padding: 12px;
  }
}
</style>
