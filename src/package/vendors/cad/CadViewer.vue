<script setup lang='ts'>
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import type { CadViewer as CadViewerInstance, DxfLayer, Tool } from '@cadview/core'

const props = defineProps<{
  data: ArrayBuffer,
  type: string
}>()

const canvas = ref<HTMLCanvasElement | null>(null)
const layers = ref<DxfLayer[]>([])
const activeTool = ref<Tool>('pan')
const status = ref<'loading' | 'ready' | 'error'>('loading')
const errorMessage = ref('')

let viewer: CadViewerInstance | null = null
let resizeObserver: ResizeObserver | null = null

const unsupportedMessages: Record<string, string> = {
  dwg: 'DWG 是专有 CAD 格式，当前 Apache 许可包未内置 GPL 转换器。请优先上传 DXF，或在业务侧转换为 DXF 后预览。'
}

const normalizeError = (reason: unknown) => {
  if (reason instanceof Error) {
    return reason.message
  }
  return typeof reason === 'string' ? reason : JSON.stringify(reason)
}

const setTool = (tool: Tool) => {
  activeTool.value = tool
  viewer?.setTool(tool)
}

const fitToView = () => {
  viewer?.resize()
  viewer?.fitToView()
}

const toggleLayer = (layer: DxfLayer) => {
  const nextVisible = layer.isOff
  viewer?.setLayerVisible(layer.name, nextVisible)
  layers.value = layers.value.map(item => {
    return item.name === layer.name ? { ...item, isOff: !nextVisible } : item
  })
}

const loadDxf = async () => {
  const target = canvas.value
  if (!target) {
    return
  }

  status.value = 'loading'
  errorMessage.value = ''

  try {
    const { CadViewer } = await import('@cadview/core')
    viewer?.destroy()
    viewer = new CadViewer(target, {
      theme: 'light',
      initialTool: activeTool.value,
      worker: false
    })

    // @cadview/core 会按 DXF 内容解析，不依赖文件名；这里保留扩展名判断只做兼容提示。
    viewer.loadArrayBuffer(props.data)
    await nextTick()
    fitToView()
    layers.value = viewer.getLayers()
    status.value = 'ready'
  } catch (reason) {
    console.error(reason)
    status.value = 'error'
    errorMessage.value = normalizeError(reason) || 'CAD 图纸解析失败'
  }
}

const load = async () => {
  const type = props.type.toLowerCase()
  if (unsupportedMessages[type]) {
    status.value = 'error'
    errorMessage.value = unsupportedMessages[type]
    return
  }
  await loadDxf()
}

onMounted(() => {
  void load()

  const target = canvas.value
  if (target) {
    resizeObserver = new ResizeObserver(() => {
      viewer?.resize()
      viewer?.requestRender()
    })
    resizeObserver.observe(target)
  }
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  resizeObserver = null
  viewer?.destroy()
  viewer = null
})
</script>

<template>
  <div class='cad-viewer'>
    <div class='cad-toolbar'>
      <div class='cad-tools'>
        <button type='button' :class='{ active: activeTool === "pan" }' @click='setTool("pan")'>平移</button>
        <button type='button' :class='{ active: activeTool === "select" }' @click='setTool("select")'>选择</button>
        <button type='button' :class='{ active: activeTool === "measure" }' @click='setTool("measure")'>测量</button>
        <button type='button' @click='fitToView'>适配</button>
      </div>
      <span>{{ type.toUpperCase() }}</span>
    </div>

    <div class='cad-body'>
      <aside v-if='layers.length' class='cad-layers'>
        <button
          v-for='layer in layers'
          :key='layer.name'
          type='button'
          :class='{ muted: layer.isOff }'
          @click='toggleLayer(layer)'
        >
          {{ layer.name }}
        </button>
      </aside>

      <div class='cad-canvas-wrap'>
        <canvas ref='canvas' />
        <div v-if='status === "loading"' class='cad-state'>正在解析 CAD...</div>
        <div v-else-if='status === "error"' class='cad-state error'>{{ errorMessage }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cad-viewer {
  display: flex;
  height: 100%;
  min-height: 100%;
  flex-direction: column;
  background: #f8fafc;
  color: #142335;
}

.cad-toolbar {
  display: flex;
  min-height: 46px;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 0 12px;
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
  background: #ffffff;
}

.cad-toolbar span {
  color: #64748b;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0;
}

.cad-tools {
  display: flex;
  gap: 6px;
}

.cad-tools button,
.cad-layers button {
  border: 0;
  cursor: pointer;
  transition: background-color 0.18s ease, color 0.18s ease;
}

.cad-tools button {
  min-height: 30px;
  padding: 0 10px;
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.06);
  color: #475569;
  font-size: 12px;
  font-weight: 700;
}

.cad-tools button.active,
.cad-tools button:hover {
  background: rgba(33, 163, 102, 0.14);
  color: #16804f;
}

.cad-body {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(132px, 180px) minmax(0, 1fr);
}

.cad-layers {
  min-height: 0;
  overflow: auto;
  padding: 10px;
  border-right: 1px solid rgba(15, 23, 42, 0.08);
  background: #ffffff;
}

.cad-layers button {
  display: block;
  width: 100%;
  min-height: 30px;
  margin-bottom: 6px;
  padding: 0 8px;
  border-radius: 7px;
  background: rgba(15, 23, 42, 0.05);
  color: #334155;
  overflow: hidden;
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cad-layers button.muted {
  color: #94a3b8;
  text-decoration: line-through;
}

.cad-canvas-wrap {
  position: relative;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.cad-canvas-wrap canvas {
  display: block;
  width: 100%;
  height: 100%;
}

.cad-state {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(248, 250, 252, 0.9);
  color: #64748b;
  text-align: center;
  line-height: 1.7;
}

.cad-state.error {
  color: #b42318;
}

@media (max-width: 720px) {
  .cad-body {
    grid-template-columns: 1fr;
  }

  .cad-layers {
    display: none;
  }
}
</style>
