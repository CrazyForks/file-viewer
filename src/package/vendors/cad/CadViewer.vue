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
const status = ref<'loading' | 'ready' | 'preview' | 'error'>('loading')
const errorMessage = ref('')
const previewUrl = ref('')
const previewMessage = ref('')

let viewer: CadViewerInstance | null = null
let resizeObserver: ResizeObserver | null = null
const decoder = new TextDecoder('utf-8')

const dwgVersions: Record<string, string> = {
  AC1015: 'AutoCAD 2000/2000i/2002',
  AC1018: 'AutoCAD 2004/2005/2006',
  AC1021: 'AutoCAD 2007/2008/2009',
  AC1024: 'AutoCAD 2010/2011/2012',
  AC1027: 'AutoCAD 2013/2014/2015/2016/2017',
  AC1032: 'AutoCAD 2018/2019/2020/2021/2022/2023/2024'
}

const normalizeError = (reason: unknown) => {
  if (reason instanceof Error) {
    return reason.message
  }
  return typeof reason === 'string' ? reason : JSON.stringify(reason)
}

const revokePreview = () => {
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value)
    previewUrl.value = ''
  }
}

const findSequence = (bytes: Uint8Array, sequence: number[], from = 0) => {
  for (let index = from; index <= bytes.length - sequence.length; index += 1) {
    let matched = true
    for (let offset = 0; offset < sequence.length; offset += 1) {
      if (bytes[index + offset] !== sequence[offset]) {
        matched = false
        break
      }
    }
    if (matched) {
      return index
    }
  }
  return -1
}

const extractDwgPreview = () => {
  const bytes = new Uint8Array(props.data)
  const pngStart = findSequence(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  if (pngStart >= 0) {
    const pngEnd = findSequence(bytes, [0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82], pngStart)
    if (pngEnd > pngStart) {
      return new Blob([bytes.slice(pngStart, pngEnd + 8)], { type: 'image/png' })
    }
  }

  const jpgStart = findSequence(bytes, [0xff, 0xd8, 0xff])
  if (jpgStart >= 0) {
    const jpgEnd = findSequence(bytes, [0xff, 0xd9], jpgStart + 3)
    if (jpgEnd > jpgStart) {
      return new Blob([bytes.slice(jpgStart, jpgEnd + 2)], { type: 'image/jpeg' })
    }
  }

  const bmpStart = findSequence(bytes, [0x42, 0x4d])
  if (bmpStart >= 0 && bmpStart + 6 < bytes.length) {
    const view = new DataView(props.data, bmpStart)
    const size = view.getUint32(2, true)
    if (size > 14 && bmpStart + size <= bytes.length) {
      return new Blob([bytes.slice(bmpStart, bmpStart + size)], { type: 'image/bmp' })
    }
  }

  return null
}

const getCadHeader = () => {
  const bytes = new Uint8Array(props.data.slice(0, 64))
  return Array.from(bytes)
    .map(byte => byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : ' ')
    .join('')
    .trim()
}

const looksLikeDxf = () => {
  const header = decoder.decode(props.data.slice(0, Math.min(props.data.byteLength, 512)))
  return /\bSECTION\b/.test(header) || /\$ACADVER/.test(header)
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
  revokePreview()

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

const loadDwg = async () => {
  if (looksLikeDxf()) {
    await loadDxf()
    return
  }

  status.value = 'loading'
  errorMessage.value = ''
  revokePreview()

  const header = getCadHeader().slice(0, 6)
  const version = dwgVersions[header] ? `${header}（${dwgVersions[header]}）` : header || '未知 DWG 版本'
  const preview = extractDwgPreview()

  if (preview) {
    previewUrl.value = URL.createObjectURL(preview)
    previewMessage.value = `已从 DWG 二进制中提取内嵌预览图，版本 ${version}。这是文件保存时写入的快照，不等同于完整 CAD 几何解析。`
    status.value = 'preview'
    return
  }

  status.value = 'error'
  errorMessage.value = `DWG 是专有二进制 CAD 格式，当前 Apache-2.0 前端包未内置 GPL 或闭源 DWG 解码器；此文件也没有可提取的内嵌预览图。请在业务侧转换为 DXF 后预览，或接入私有服务端转换链路。检测到的版本为 ${version}。`
}

const load = async () => {
  const type = props.type.toLowerCase()
  if (type === 'dwg') {
    await loadDwg()
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
  revokePreview()
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
        <div v-else-if='status === "preview"' class='dwg-preview'>
          <img :src='previewUrl' alt='DWG 内嵌预览图' />
          <p>{{ previewMessage }}</p>
        </div>
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

.dwg-preview {
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto;
  gap: 12px;
  padding: 18px;
  background: #f8fafc;
}

.dwg-preview img {
  min-width: 0;
  min-height: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: #ffffff;
  border: 1px solid rgba(15, 23, 42, 0.08);
}

.dwg-preview p {
  margin: 0;
  color: #5f6f82;
  font-size: 13px;
  line-height: 1.6;
  text-align: center;
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
