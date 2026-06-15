<script setup lang='ts'>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { readText } from '@/package/common/util'
import type { FileViewerZoomState } from '@/package/common/type'
import {
  createZoomChangeEmitter,
  registerFileViewerZoomProvider,
  unregisterFileViewerZoomProvider
} from '@/package/use/viewerZoom'

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
const SVG_NS = 'http://www.w3.org/2000/svg'
const EXCALIDRAW_OFFICIAL_TIMEOUT = 6000

let diagramsViewerPromise: Promise<void> | null = null

const status = ref<'loading' | 'ready' | 'error'>('loading')
const errorMessage = ref('')
const root = ref<HTMLDivElement | null>(null)
const stage = ref<HTMLDivElement | null>(null)
const zoom = ref(1)
const drawingZoomEmitter = createZoomChangeEmitter()

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

const getDrawingZoomState = (): FileViewerZoomState => ({
  scale: zoom.value,
  label: `${Math.round(zoom.value * 100)}%`,
  canZoomIn: zoom.value < 3,
  canZoomOut: zoom.value > 0.5,
  canReset: zoom.value !== 1,
  minScale: 0.5,
  maxScale: 3
})

const attachZoomProvider = () => {
  const host = root.value
  if (!host) {
    return
  }

  registerFileViewerZoomProvider(host, {
    zoomIn: () => {
      zoomIn()
      return getDrawingZoomState()
    },
    zoomOut: () => {
      zoomOut()
      return getDrawingZoomState()
    },
    resetZoom: () => {
      resetZoom()
      return getDrawingZoomState()
    },
    setZoom: scale => {
      zoom.value = clampZoom(scale)
      return getDrawingZoomState()
    },
    getState: getDrawingZoomState,
    subscribe: drawingZoomEmitter.subscribe
  })
}

const clearStage = () => {
  const target = stage.value
  if (!target) {
    return
  }

  delete target.dataset.drawingRendered
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

type ExcalidrawElement = Record<string, any>
type ExcalidrawPoint = [number, number]

const toNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const isTransparent = (color?: string) => {
  return !color || color === 'transparent' || color === 'rgba(0, 0, 0, 0)'
}

const createSvgElement = <T extends SVGElement>(tagName: string) => {
  return document.createElementNS(SVG_NS, tagName) as T
}

const runWithTimeout = async <T,>(task: Promise<T>, timeout: number, message: string) => {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      task,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(message)), timeout)
      })
    ])
  } finally {
    if (timer) {
      clearTimeout(timer)
    }
  }
}

const markRendered = (target: HTMLElement, mode: 'official' | 'rough') => {
  if (target.dataset.drawingRendered) {
    return false
  }

  target.dataset.drawingRendered = mode
  return true
}

const appendRenderedSvg = (target: HTMLElement, svg: SVGSVGElement, mode: 'official' | 'rough') => {
  if (!markRendered(target, mode)) {
    return
  }

  svg.classList.add('drawing-svg')
  target.appendChild(svg)
}

const suppressExcalidrawWorkerWarning = () => {
  const originalError = console.error
  const patchedError = (...args: unknown[]) => {
    const message = args.map((arg) => String(arg)).join(' ')
    if (message.includes('Failed to use workers for subsetting')) {
      return
    }
    originalError(...args)
  }

  console.error = patchedError

  return () => {
    if (console.error === patchedError) {
      console.error = originalError
    }
  }
}

const getElementPoints = (element: ExcalidrawElement): ExcalidrawPoint[] => {
  if (Array.isArray(element.points) && element.points.length) {
    return element.points.map((point: ExcalidrawPoint) => [
      toNumber(element.x) + toNumber(point[0]),
      toNumber(element.y) + toNumber(point[1])
    ])
  }

  return [
    [toNumber(element.x), toNumber(element.y)],
    [toNumber(element.x) + toNumber(element.width), toNumber(element.y) + toNumber(element.height)]
  ]
}

const getElementBounds = (element: ExcalidrawElement) => {
  const points = getElementPoints(element)
  const xs = points.map((point) => point[0])
  const ys = points.map((point) => point[1])

  if (!Array.isArray(element.points)) {
    xs.push(toNumber(element.x) + toNumber(element.width))
    ys.push(toNumber(element.y) + toNumber(element.height))
  }

  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
    maxY: Math.max(...ys)
  }
}

const getSceneBounds = (elements: ExcalidrawElement[]) => {
  const initial = {
    minX: Number.POSITIVE_INFINITY,
    minY: Number.POSITIVE_INFINITY,
    maxX: Number.NEGATIVE_INFINITY,
    maxY: Number.NEGATIVE_INFINITY
  }
  const bounds = elements.reduce((scene, element) => {
    const elementBounds = getElementBounds(element)
    return {
      minX: Math.min(scene.minX, elementBounds.minX),
      minY: Math.min(scene.minY, elementBounds.minY),
      maxX: Math.max(scene.maxX, elementBounds.maxX),
      maxY: Math.max(scene.maxY, elementBounds.maxY)
    }
  }, initial)

  if (!Number.isFinite(bounds.minX)) {
    return { minX: 0, minY: 0, maxX: 800, maxY: 480 }
  }

  return bounds
}

const getRoughOptions = (element: ExcalidrawElement) => {
  const fill = isTransparent(element.backgroundColor) ? undefined : element.backgroundColor
  return {
    stroke: element.strokeColor || '#1e1e1e',
    strokeWidth: Math.max(1, toNumber(element.strokeWidth, 1)),
    roughness: Math.max(0, toNumber(element.roughness, 1)),
    fill,
    fillStyle: element.fillStyle || 'hachure',
    seed: toNumber(element.seed, 1),
    strokeLineDash: element.strokeStyle === 'dashed' ? [10, 8] : element.strokeStyle === 'dotted' ? [2, 6] : undefined
  }
}

const appendWithOpacity = (group: SVGGElement, element: ExcalidrawElement, node: SVGElement) => {
  const opacity = toNumber(element.opacity, 100) / 100
  if (opacity < 1) {
    node.setAttribute('opacity', String(opacity))
  }
  group.appendChild(node)
}

const createElementGroup = (element: ExcalidrawElement) => {
  const group = createSvgElement<SVGGElement>('g')
  const angle = toNumber(element.angle)
  if (angle) {
    const cx = toNumber(element.x) + toNumber(element.width) / 2
    const cy = toNumber(element.y) + toNumber(element.height) / 2
    group.setAttribute('transform', `rotate(${angle * 180 / Math.PI} ${cx} ${cy})`)
  }

  return group
}

const renderTextFallback = (group: SVGGElement, element: ExcalidrawElement) => {
  const text = String(element.text || '')
  if (!text.trim()) {
    return
  }

  const textNode = createSvgElement<SVGTextElement>('text')
  const fontSize = Math.max(8, toNumber(element.fontSize, 20))
  const lineHeight = fontSize * 1.25
  const lines = text.split(/\r?\n/)
  const familyMap: Record<number, string> = {
    1: 'Virgil, Segoe Print, Comic Sans MS, sans-serif',
    2: 'Helvetica, Arial, sans-serif',
    3: 'Cascadia Mono, Menlo, Consolas, monospace'
  }

  textNode.setAttribute('x', String(toNumber(element.x)))
  textNode.setAttribute('y', String(toNumber(element.y) + fontSize))
  textNode.setAttribute('fill', element.strokeColor || '#1e1e1e')
  textNode.setAttribute('font-size', String(fontSize))
  textNode.setAttribute('font-family', familyMap[toNumber(element.fontFamily, 1)] || familyMap[1])
  textNode.setAttribute('font-weight', String(element.fontWeight || 400))
  textNode.setAttribute('text-anchor', element.textAlign === 'center' ? 'middle' : element.textAlign === 'right' ? 'end' : 'start')

  if (element.textAlign === 'center') {
    textNode.setAttribute('x', String(toNumber(element.x) + toNumber(element.width) / 2))
  } else if (element.textAlign === 'right') {
    textNode.setAttribute('x', String(toNumber(element.x) + toNumber(element.width)))
  }

  lines.forEach((line, index) => {
    const lineNode = createSvgElement<SVGTSpanElement>('tspan')
    lineNode.setAttribute('x', textNode.getAttribute('x') || String(toNumber(element.x)))
    lineNode.setAttribute('dy', index === 0 ? '0' : String(lineHeight))
    lineNode.textContent = line
    textNode.appendChild(lineNode)
  })

  appendWithOpacity(group, element, textNode)
}

const appendArrowHead = (group: SVGGElement, element: ExcalidrawElement, points: ExcalidrawPoint[]) => {
  const endArrow = element.endArrowhead || element.startArrowhead
  if (!endArrow || points.length < 2) {
    return
  }

  const end = points[points.length - 1]
  const before = points[points.length - 2]
  const angle = Math.atan2(end[1] - before[1], end[0] - before[0])
  const size = Math.max(10, toNumber(element.strokeWidth, 1) * 7)
  const left: ExcalidrawPoint = [
    end[0] - size * Math.cos(angle - Math.PI / 7),
    end[1] - size * Math.sin(angle - Math.PI / 7)
  ]
  const right: ExcalidrawPoint = [
    end[0] - size * Math.cos(angle + Math.PI / 7),
    end[1] - size * Math.sin(angle + Math.PI / 7)
  ]

  const arrow = createSvgElement<SVGPolygonElement>('polygon')
  arrow.setAttribute('points', `${end.join(',')} ${left.join(',')} ${right.join(',')}`)
  arrow.setAttribute('fill', element.strokeColor || '#1e1e1e')
  arrow.setAttribute('stroke', element.strokeColor || '#1e1e1e')
  appendWithOpacity(group, element, arrow)
}

const renderRoughFallback = async (payload: any, elements: ExcalidrawElement[], target: HTMLElement) => {
  const { default: rough } = await import('roughjs')
  const bounds = getSceneBounds(elements)
  const padding = 80
  const width = Math.max(320, bounds.maxX - bounds.minX + padding * 2)
  const height = Math.max(220, bounds.maxY - bounds.minY + padding * 2)
  const svg = createSvgElement<SVGSVGElement>('svg')
  const root = createSvgElement<SVGGElement>('g')
  const rc = rough.svg(svg)

  svg.setAttribute('viewBox', `${bounds.minX - padding} ${bounds.minY - padding} ${width} ${height}`)
  svg.setAttribute('width', String(width))
  svg.setAttribute('height', String(height))
  svg.setAttribute('role', 'img')
  svg.setAttribute('aria-label', 'Excalidraw rough.js preview')

  const background = createSvgElement<SVGRectElement>('rect')
  background.setAttribute('x', String(bounds.minX - padding))
  background.setAttribute('y', String(bounds.minY - padding))
  background.setAttribute('width', String(width))
  background.setAttribute('height', String(height))
  background.setAttribute('fill', payload.appState?.viewBackgroundColor || '#ffffff')
  svg.appendChild(background)
  svg.appendChild(root)

  elements.forEach((element) => {
    const group = createElementGroup(element)
    const options = getRoughOptions(element)
    const x = toNumber(element.x)
    const y = toNumber(element.y)
    const width = toNumber(element.width)
    const height = toNumber(element.height)

    if (element.type === 'text') {
      renderTextFallback(group, element)
    } else if (element.type === 'rectangle') {
      appendWithOpacity(group, element, rc.rectangle(x, y, width, height, options))
    } else if (element.type === 'diamond') {
      appendWithOpacity(group, element, rc.polygon([
        [x + width / 2, y],
        [x + width, y + height / 2],
        [x + width / 2, y + height],
        [x, y + height / 2]
      ], options))
    } else if (element.type === 'ellipse') {
      appendWithOpacity(group, element, rc.ellipse(x + width / 2, y + height / 2, Math.abs(width), Math.abs(height), options))
    } else if (element.type === 'line' || element.type === 'arrow' || element.type === 'freedraw') {
      const points = getElementPoints(element)
      appendWithOpacity(group, element, rc.linearPath(points, options))
      if (element.type === 'arrow') {
        appendArrowHead(group, element, points)
      }
    }

    if (group.childNodes.length) {
      root.appendChild(group)
    }
  })

  appendRenderedSvg(target, svg, 'rough')
}

const renderOfficialExcalidraw = async (payload: any, elements: ExcalidrawElement[], target: HTMLElement) => {
  // Excalidraw 在部分浏览器会把字体子集 worker 降级记为 console.error，
  // 实际会继续使用主线程导出；这里仅临时屏蔽这条已知噪声，避免误判为预览失败。
  const restoreConsole = suppressExcalidrawWorkerWarning()
  const restoreTimer = setTimeout(restoreConsole, EXCALIDRAW_OFFICIAL_TIMEOUT + 1000)
  const { exportToSvg, restore } = await import('@excalidraw/excalidraw')
  try {
    // 公开仓库里的 .excalidraw 文件经常省略 seed、versionNonce 等默认字段；
    // 先交给 Excalidraw 官方 restore 补齐结构，再导出 SVG，能最大化兼容历史文件和第三方导出文件。
    const restored = restore({
      elements: elements as any,
      appState: payload.appState || {},
      files: payload.files || {}
    }, null, null, {
      repairBindings: true,
      refreshDimensions: true
    })
    const restoredElements = restored.elements.filter((element: any) => !element.isDeleted)
    const svg = await exportToSvg({
      elements: restoredElements as any,
      appState: {
        ...restored.appState,
        exportBackground: true,
        viewBackgroundColor: restored.appState.viewBackgroundColor || '#ffffff'
      },
      files: restored.files || {}
    })

    appendRenderedSvg(target, svg, 'official')
  } finally {
    clearTimeout(restoreTimer)
    restoreConsole()
  }
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

  try {
    await runWithTimeout(
      renderOfficialExcalidraw(payload, elements, target),
      EXCALIDRAW_OFFICIAL_TIMEOUT,
      'Excalidraw 官方导出超时，自动切换 rough.js 兼容渲染'
    )
  } catch (error) {
    console.warn(error)
    await renderRoughFallback(payload, elements, target)
  }
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

watch(zoom, () => {
  drawingZoomEmitter.emit()
})

onMounted(() => {
  attachZoomProvider()
  void loadDrawing()
})

onBeforeUnmount(() => {
  unregisterFileViewerZoomProvider(root.value)
})
</script>

<template>
  <div ref='root' class='drawing-viewer' data-viewer-zoom-provider='drawing'>
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
