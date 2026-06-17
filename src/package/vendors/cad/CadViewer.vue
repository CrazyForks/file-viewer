<script setup lang='ts'>
import '@flyfish-dev/cad-viewer/styles.css'
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import type {
  CadLayer,
  CadLoadProgress,
  CadViewer as CadViewerInstance,
  CadViewerLoadResult,
  RenderStats,
  ViewChangeEvent
} from '@flyfish-dev/cad-viewer'
import { CadViewer } from '@flyfish-dev/cad-viewer'
import { resolveFileViewerCadAssetUrls } from '@file-viewer/core'
import type { FileViewerCadOptions, FileViewerZoomState } from '@file-viewer/core'
import {
  createZoomChangeEmitter,
  registerFileViewerZoomProvider,
  unregisterFileViewerZoomProvider
} from '@/package/use/viewerZoom'

const props = defineProps<{
  data: ArrayBuffer,
  type: string,
  options?: FileViewerCadOptions
}>()

type CadStatus = 'loading' | 'ready' | 'error';

type CadLayerItem = CadLayer & {
  name: string;
}

const CAD_WORKER_TIMEOUT = 120000

const root = ref<HTMLDivElement | null>(null)
const shell = ref<HTMLDivElement | null>(null)
const nativeHost = ref<HTMLDivElement | null>(null)
const status = ref<CadStatus>('loading')
const progressMessage = ref('正在加载 CAD 预览器...')
const errorMessage = ref('')
const loadResult = ref<CadViewerLoadResult | null>(null)
const renderStats = ref<RenderStats | null>(null)
const viewState = ref<ViewChangeEvent | null>(null)
const layers = ref<CadLayerItem[]>([])
const warnings = computed(() => loadResult.value?.warnings || loadResult.value?.document.warnings || [])
const summary = computed(() => loadResult.value?.summary)
const backend = computed(() => renderStats.value?.backend || 'auto')
const zoomPercent = computed(() => {
  const zoom = viewState.value?.zoomPercent ?? viewer?.getZoomPercent?.() ?? 100
  return Number.isFinite(zoom) ? Math.round(zoom) : 100
})

let viewer: CadViewerInstance | null = null
let resizeObserver: ResizeObserver | null = null
let abortController: AbortController | null = null
const cadZoomEmitter = createZoomChangeEmitter()

const normalizeType = () => {
  const normalized = props.type.toLowerCase()
  return normalized || 'dxf'
}

const buildFileName = () => `drawing.${normalizeType()}`

const collectLayers = (result: CadViewerLoadResult | null): CadLayerItem[] => {
  if (!result) {
    return []
  }

  return Object.entries(result.document.layers)
    .map(([name, layer]) => ({ ...layer, name }))
    .sort((left, right) => left.name.localeCompare(right.name))
}

const formatNumber = (value: number | undefined) => {
  if (!Number.isFinite(value)) {
    return '0'
  }
  return new Intl.NumberFormat('zh-CN').format(Math.round(value || 0))
}

const updateProgress = (progress: CadLoadProgress) => {
  const prefix = progress.format ? `${progress.format.toUpperCase()} ` : ''
  const percent = Number.isFinite(progress.percent) ? ` ${Math.round(progress.percent || 0)}%` : ''
  progressMessage.value = `${prefix}${progress.message}${percent}`
}

const fitToView = () => {
  viewer?.fit()
  cadZoomEmitter.emit()
}

const zoomIn = () => {
  viewer?.zoomIn()
  cadZoomEmitter.emit()
}

const zoomOut = () => {
  viewer?.zoomOut()
  cadZoomEmitter.emit()
}

const getCadZoomState = (): FileViewerZoomState => {
  const ready = status.value === 'ready' && !!viewer
  return {
    scale: zoomPercent.value / 100,
    label: `${zoomPercent.value}%`,
    canZoomIn: ready,
    canZoomOut: ready,
    canReset: ready,
    minScale: 0.05,
    maxScale: 16
  }
}

const attachZoomProvider = () => {
  const host = shell.value
  if (!host) {
    return
  }

  registerFileViewerZoomProvider(host, {
    zoomIn: () => {
      zoomIn()
      return getCadZoomState()
    },
    zoomOut: () => {
      zoomOut()
      return getCadZoomState()
    },
    resetZoom: () => {
      fitToView()
      return getCadZoomState()
    },
    getState: getCadZoomState,
    subscribe: cadZoomEmitter.subscribe
  })
}

const toggleLayer = (layer: CadLayerItem) => {
  const document = viewer?.getDocument()
  if (!document?.layers[layer.name]) {
    return
  }

  const current = document.layers[layer.name]
  current.isVisible = current.isVisible === false
  const result = viewer?.setDocument(document, buildFileName()) || null
  loadResult.value = result
  layers.value = collectLayers(result)
  void nextTick(() => viewer?.fit())
}

const createViewer = async () => {
  const container = root.value
  const native = nativeHost.value
  if (!container) {
    return null
  }

  const options = props.options || {}
  const { wasmPath, workerUrl, dwfWasmUrl } = resolveFileViewerCadAssetUrls(options)

  const nextViewer = new CadViewer({
    container,
    nativeHost: native || undefined,
    renderer: options.renderer || 'auto',
    wasmPath,
    workerUrl,
    dwfWasmUrl,
    dxfEncoding: options.dxfEncoding,
    useWorker: options.useWorker ?? true,
    workerTimeoutMs: options.workerTimeoutMs ?? CAD_WORKER_TIMEOUT,
    preferDwgWasm: options.preferDwgWasm ?? true,
    includePaperSpace: options.includePaperSpace ?? true,
    maxInsertDepth: options.maxInsertDepth,
    keepRaw: options.keepRaw ?? false,
    dwfPreferWebgl: options.dwfPreferWebgl ?? true,
    dwfPreferWasm: options.dwfPreferWasm ?? true,
    dwfBackground: options.dwfBackground || '#f8fafc',
    dwfMaxDevicePixelRatio: options.dwfMaxDevicePixelRatio,
    dwfMaxCanvasPixels: options.dwfMaxCanvasPixels,
    dwfMaxGpuCacheBytes: options.dwfMaxGpuCacheBytes,
    dwfMaxCachedScenes: options.dwfMaxCachedScenes,
    dwfLineWeightMode: options.dwfLineWeightMode,
    dwfMinStrokeCssPx: options.dwfMinStrokeCssPx,
    dwfMaxOverviewStrokeCssPx: options.dwfMaxOverviewStrokeCssPx,
    dwfMinTextCssPx: options.dwfMinTextCssPx,
    dwfMinFilledAreaCssPx: options.dwfMinFilledAreaCssPx,
    autoFit: true,
    canvasOptions: {
      background: '#f8fafc',
      foreground: '#0f172a',
      contrastMode: 'adaptive',
      minColorContrast: 2.4,
      showPageBounds: true,
      showUnsupportedMarkers: true,
      enableSpatialIndex: true,
      maxVisibleTextLabels: 2400,
      ...(options.canvasOptions || {})
    },
    onLoadProgress: updateProgress,
    onRenderStats: stats => {
      renderStats.value = stats
    },
    onViewChange: event => {
      viewState.value = event
      cadZoomEmitter.emit()
    },
    onLoad: result => {
      loadResult.value = result
      layers.value = collectLayers(result)
    },
    onError: error => {
      errorMessage.value = error.message || 'CAD 文件解析失败'
    }
  })

  if (options.preloadDwg !== false && normalizeType() === 'dwg') {
    void nextViewer.preloadDwg({ wasmPath, workerUrl }).catch(() => {
      // 预热失败不阻断真实加载，后续 loadBuffer 会给出完整错误上下文。
    })
  }

  return nextViewer
}

const loadCad = async () => {
  status.value = 'loading'
  progressMessage.value = '正在解析 CAD...'
  errorMessage.value = ''
  loadResult.value = null
  renderStats.value = null
  viewState.value = null
  layers.value = []

  abortController?.abort()
  abortController = new AbortController()

  try {
    viewer?.destroy()
    viewer = await createViewer()
    if (!viewer) {
      return
    }

    const options = props.options || {}
    const cadAssets = resolveFileViewerCadAssetUrls(options)
    const result = await viewer.loadBuffer(props.data.slice(0), buildFileName(), {
      signal: abortController.signal,
      transferInputBuffer: false,
      dxfEncoding: options.dxfEncoding,
      wasmPath: cadAssets.wasmPath,
      workerUrl: cadAssets.workerUrl,
      dwfWasmUrl: cadAssets.dwfWasmUrl
    })
    loadResult.value = result
    layers.value = collectLayers(result)
    status.value = 'ready'
    await nextTick()
    viewer.fit()
    cadZoomEmitter.emit()
  } catch (reason) {
    if (abortController.signal.aborted) {
      return
    }
    console.error(reason)
    status.value = 'error'
    errorMessage.value = reason instanceof Error ? reason.message : 'CAD 文件解析失败'
  }
}

onMounted(() => {
  attachZoomProvider()
  void loadCad()

  if (root.value) {
    resizeObserver = new ResizeObserver(() => {
      viewer?.resize()
    })
    resizeObserver.observe(root.value)
  }
})

onBeforeUnmount(() => {
  unregisterFileViewerZoomProvider(shell.value)
  abortController?.abort()
  abortController = null
  resizeObserver?.disconnect()
  resizeObserver = null
  viewer?.destroy()
  viewer = null
})
</script>

<template>
  <div ref='shell' class='cad-shell' data-viewer-zoom-provider='cad'>
    <div class='cad-toolbar'>
      <div class='cad-tools'>
        <button type='button' @click='fitToView'>适配</button>
        <button type='button' title='缩小' @click='zoomOut'>-</button>
        <span class='cad-zoom'>{{ zoomPercent }}%</span>
        <button type='button' title='放大' @click='zoomIn'>+</button>
      </div>
      <div class='cad-meta'>
        <span>{{ normalizeType().toUpperCase() }}</span>
        <span>{{ backend.toUpperCase() }}</span>
      </div>
    </div>

    <div class='cad-body' :class='{ "without-layers": !layers.length }'>
      <aside v-if='layers.length' class='cad-layers'>
        <div class='cad-layers-head'>
          <strong>图层</strong>
          <span>{{ layers.length }} 项</span>
        </div>
        <button
          v-for='layer in layers'
          :key='layer.name'
          type='button'
          :class='{ muted: layer.isVisible === false || layer.isFrozen }'
          @click='toggleLayer(layer)'
        >
          <span
            class='cad-layer-color'
            :style='{ background: typeof layer.color === "string" ? layer.color : undefined }'
          />
          <span>{{ layer.name }}</span>
        </button>
      </aside>

      <div class='cad-canvas-wrap'>
        <div ref='root' class='cad-stage'>
          <div ref='nativeHost' class='cad-native-stage' />
        </div>
        <div v-if='status === "loading"' class='cad-state'>{{ progressMessage }}</div>
        <div v-else-if='status === "error"' class='cad-state error'>{{ errorMessage }}</div>
      </div>

      <aside class='cad-inspector'>
        <strong>结构</strong>
        <dl>
          <div>
            <dt>实体</dt>
            <dd>{{ formatNumber(summary?.entityCount) }}</dd>
          </div>
          <div>
            <dt>块</dt>
            <dd>{{ formatNumber(summary?.blockCount) }}</dd>
          </div>
          <div>
            <dt>页面</dt>
            <dd>{{ formatNumber(summary?.pageCount) }}</dd>
          </div>
          <div>
            <dt>绘制</dt>
            <dd>{{ formatNumber(renderStats?.drawn) }}</dd>
          </div>
        </dl>
        <p v-if='warnings.length' class='cad-warning'>{{ warnings[0] }}</p>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.cad-shell {
  display: flex;
  height: 100%;
  min-height: 100%;
  flex-direction: column;
  background: #f5f7fb;
  color: #142335;
}

.cad-toolbar {
  display: flex;
  min-height: 48px;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 0 14px;
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
  background: #ffffff;
}

.cad-tools,
.cad-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.cad-tools button {
  min-width: 34px;
  min-height: 30px;
  border: 0;
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.06);
  color: #25344c;
  cursor: pointer;
  font-weight: 800;
  transition: background-color 0.18s ease, color 0.18s ease;
}

.cad-tools button:hover {
  background: rgba(31, 150, 110, 0.14);
  color: #0f8f62;
}

.cad-zoom,
.cad-meta span {
  color: #64748b;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0;
}

.cad-meta span {
  border-radius: 999px;
  padding: 5px 9px;
  background: rgba(15, 23, 42, 0.06);
}

.cad-body {
  display: grid;
  min-height: 0;
  flex: 1;
  grid-template-columns: minmax(168px, 220px) minmax(0, 1fr) minmax(150px, 190px);
  background: #eef2f7;
}

.cad-body.without-layers {
  grid-template-columns: minmax(0, 1fr) minmax(150px, 190px);
}

.cad-layers,
.cad-inspector {
  min-height: 0;
  overflow: auto;
  border-right: 1px solid rgba(15, 23, 42, 0.08);
  background: #ffffff;
}

.cad-inspector {
  border-right: 0;
  border-left: 1px solid rgba(15, 23, 42, 0.08);
  padding: 14px;
}

.cad-layers-head {
  position: sticky;
  top: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 12px 8px;
  background: #ffffff;
  color: #1f2a3d;
  font-size: 13px;
  z-index: 1;
}

.cad-layers-head span {
  color: #7b8ca5;
  font-size: 12px;
  font-weight: 700;
}

.cad-layers button {
  display: flex;
  width: calc(100% - 16px);
  min-height: 34px;
  align-items: center;
  gap: 8px;
  margin: 0 8px 6px;
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 8px;
  background: #f8fafc;
  color: #25344c;
  cursor: pointer;
  font-size: 12px;
  font-weight: 700;
  text-align: left;
}

.cad-layers button.muted {
  opacity: 0.48;
}

.cad-layer-color {
  width: 10px;
  height: 10px;
  flex: 0 0 auto;
  border-radius: 50%;
  background: #1f966e;
  box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.14);
}

.cad-canvas-wrap {
  position: relative;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  background:
    linear-gradient(90deg, rgba(15, 23, 42, 0.04) 1px, transparent 1px),
    linear-gradient(180deg, rgba(15, 23, 42, 0.04) 1px, transparent 1px),
    #f8fafc;
  background-size: 28px 28px;
}

.cad-stage {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 420px;
  overflow: hidden;
}

.cad-stage :deep(canvas) {
  position: absolute;
  inset: 0;
  display: block;
  width: 100% !important;
  height: 100% !important;
}

.cad-native-stage {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: none;
  overflow: hidden;
}

.cad-native-stage:not(:empty) {
  display: block;
}

.cad-native-stage :deep(*) {
  box-sizing: border-box;
}

.cad-native-stage :deep(.dwfv-root),
.cad-native-stage :deep(.dwfv-workspace),
.cad-native-stage :deep(.dwfv-stage) {
  width: 100%;
  min-width: 0;
  min-height: 0;
}

.cad-native-stage :deep(.dwfv-root) {
  height: 100%;
}

.cad-state {
  position: absolute;
  inset: 50% auto auto 50%;
  max-width: min(520px, calc(100% - 48px));
  transform: translate(-50%, -50%);
  border-radius: 12px;
  padding: 14px 18px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 14px 38px rgba(15, 23, 42, 0.12);
  color: #53637a;
  font-size: 13px;
  font-weight: 800;
  text-align: center;
}

.cad-state.error {
  color: #b42318;
}

.cad-inspector strong {
  display: block;
  margin-bottom: 12px;
  color: #1f2a3d;
  font-size: 13px;
}

.cad-inspector dl {
  display: grid;
  gap: 8px;
  margin: 0;
}

.cad-inspector dl div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-radius: 8px;
  padding: 8px 10px;
  background: #f8fafc;
}

.cad-inspector dt,
.cad-inspector dd {
  margin: 0;
  font-size: 12px;
}

.cad-inspector dt {
  color: #7b8ca5;
  font-weight: 700;
}

.cad-inspector dd {
  color: #20304a;
  font-weight: 900;
}

.cad-warning {
  margin: 12px 0 0;
  border-radius: 8px;
  padding: 10px;
  background: rgba(245, 158, 11, 0.13);
  color: #92400e;
  font-size: 12px;
  line-height: 1.55;
}

@media (max-width: 860px) {
  .cad-body,
  .cad-body.without-layers {
    grid-template-columns: minmax(0, 1fr);
  }

  .cad-layers,
  .cad-inspector {
    display: none;
  }
}
</style>
