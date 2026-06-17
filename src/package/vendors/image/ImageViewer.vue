<script setup lang='ts'>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { component as VueViewer } from 'v-viewer'
import 'viewerjs/dist/viewer.css'
import {
  createFileViewerZoomChangeEmitter as createZoomChangeEmitter,
  registerFileViewerZoomProvider,
  unregisterFileViewerZoomProvider,
  type FileViewerZoomState
} from '@file-viewer/core'

const props = defineProps<{
  image: string
}>()

const root = ref<HTMLDivElement | null>(null)
const zoom = ref(1)
const viewportHeight = ref(0)
const imageZoomEmitter = createZoomChangeEmitter()
let resizeObserver: ResizeObserver | null = null

const images = computed(() => {
  return props.image ? [{ src: props.image, index: 0 }] : []
})

const imageStyle = computed(() => ({
  height: viewportHeight.value
    ? `${Math.max(1, Math.round(viewportHeight.value * zoom.value))}px`
    : `${zoom.value * 100}%`
}))

const clampZoom = (value: number) => {
  return Math.min(5, Math.max(0.1, Number(value.toFixed(2))))
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

const getImageZoomState = (): FileViewerZoomState => ({
  scale: zoom.value,
  label: `${Math.round(zoom.value * 100)}%`,
  canZoomIn: zoom.value < 5,
  canZoomOut: zoom.value > 0.1,
  canReset: zoom.value !== 1,
  minScale: 0.1,
  maxScale: 5
})

const attachZoomProvider = () => {
  const host = root.value
  if (!host) {
    return
  }

  registerFileViewerZoomProvider(host, {
    zoomIn: () => {
      zoomIn()
      return getImageZoomState()
    },
    zoomOut: () => {
      zoomOut()
      return getImageZoomState()
    },
    resetZoom: () => {
      resetZoom()
      return getImageZoomState()
    },
    setZoom: scale => {
      zoom.value = clampZoom(scale)
      return getImageZoomState()
    },
    getState: getImageZoomState,
    subscribe: imageZoomEmitter.subscribe
  })
}

const updateViewportSize = () => {
  viewportHeight.value = root.value?.clientHeight || 0
}

watch([zoom, viewportHeight], () => {
  imageZoomEmitter.emit()
})

onMounted(() => {
  attachZoomProvider()
  updateViewportSize()
  if (root.value) {
    resizeObserver = new ResizeObserver(updateViewportSize)
    resizeObserver.observe(root.value)
  }
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  resizeObserver = null
  unregisterFileViewerZoomProvider(root.value)
})
</script>

<template>
  <div ref='root' class='image-viewer' data-viewer-zoom-provider='image'>
    <vue-viewer :images='images' class='image-stage'>
      <img v-for='item in images' alt='图片' :src='item.src' :key='item.index' class='image' :style='imageStyle' />
    </vue-viewer>
  </div>
</template>

<style scoped>
.image-viewer {
  width: 100%;
  height: 100%;
  overflow: auto;
  background: #eef1f4;
}

.image-stage {
  min-width: 100%;
  min-height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.image {
  display: block;
  width: auto;
  margin: 0 auto;
}
</style>
