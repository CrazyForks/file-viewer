<script setup lang='ts'>
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import $ from 'jquery'
import { DefaultOptions } from './options.js'
import './styles/pptxjs.css'
import { displayChart } from './support/chart'
import PptxWorker from './worker'
import type { FileViewerZoomState } from '@file-viewer/core'
import {
  createZoomChangeEmitter,
  registerFileViewerZoomProvider,
  unregisterFileViewerZoomProvider
} from '@/package/use/viewerZoom'

const props = withDefaults(defineProps<{
  // 二进制数据
  data: ArrayBuffer,
  // 默认配置，支持扩展
  options?: Function,
}>(), {
  options: DefaultOptions
})

const wrapper = ref<null | HTMLDivElement>(null);
const errorMessage = ref('');
const userZoom = ref(1)
const effectiveScale = ref(1)
const currentFitScale = ref(1)
const pptxZoomEmitter = createZoomChangeEmitter()
let schedulePptxResize: (() => void) | null = null

const clampZoom = (value: number) => {
  return Math.min(3, Math.max(0.25, Number(value.toFixed(2))))
}

const getPptxZoomState = (): FileViewerZoomState => ({
  scale: effectiveScale.value,
  label: `${Math.round(effectiveScale.value * 100)}%`,
  canZoomIn: effectiveScale.value < 3,
  canZoomOut: effectiveScale.value > 0.25,
  canReset: userZoom.value !== 1,
  minScale: 0.25,
  maxScale: 3
})

const setPptxUserZoom = (value: number) => {
  userZoom.value = Math.min(6, Math.max(0.2, Number(value.toFixed(2))))
  schedulePptxResize?.()
  pptxZoomEmitter.emit()
  return getPptxZoomState()
}

const attachZoomProvider = () => {
  const host = wrapper.value
  if (!host) {
    return
  }

  registerFileViewerZoomProvider(host, {
    zoomIn: () => setPptxUserZoom(userZoom.value + 0.15),
    zoomOut: () => setPptxUserZoom(userZoom.value - 0.15),
    resetZoom: () => setPptxUserZoom(1),
    setZoom: scale => setPptxUserZoom(scale / Math.max(currentFitScale.value, 0.01)),
    getState: getPptxZoomState,
    subscribe: pptxZoomEmitter.subscribe
  })
}

// 使用闭包避免暴露
(() => {
  const data = {
    isDone: false as boolean,
    thumbElement: null as null | HTMLImageElement,
    worker: null as null | Worker,
    timer: null as null | number,
    resizeObserver: null as null | ResizeObserver,
    resizeFrame: 0
  }

  const methods = {
    // 启动worker逻辑
    startWorker(): void {
      // 真实的web worker - 使用该方式，我们必须通过blob的方式进行通信
      if (data.worker) data.worker.terminate()
      if (data.timer) clearInterval(data.timer)
      const worker = data.worker = PptxWorker.create()
      worker.addEventListener('message', event => {
        this.processMessage(event.data)
      }, false)
      worker.addEventListener('error', ev => {
        console.error(ev)
      }, false)
      // 通知worker开始工作
      worker.postMessage({
        type: 'processPPTX',
        data: props.data,
        IE11: 'MSInputMethodContext' in window && 'documentMode' in document,
        options: props.options()
      })
      // 定时检测执行情况，发现完成则及时关闭
      data.timer = window.setInterval(this.stopWorker, 500) as unknown as number
    },
    // 停止worker逻辑
    stopWorker(): void {
      if (data.isDone) {
        data.worker?.terminate()
        console.log('worker terminated')
        if (data.timer) clearInterval(data.timer)
      }
    },
    // 窗口拖动大小，自动调整位置
    scheduleResize() {
      window.cancelAnimationFrame(data.resizeFrame)
      data.resizeFrame = window.requestAnimationFrame(() => {
        this.resize()
      })
    },
    resize() {
      if (wrapper.value) {
        const $wrapper = $(wrapper.value)
        const slidesWidth = Math.max(...Array.from($wrapper.children('.slide, section')).map(s => s.offsetWidth), 0)
        const wrapperWidth = $wrapper[0].parentElement?.clientWidth || $wrapper[0].offsetWidth
        if (!slidesWidth || !wrapperWidth) {
          return
        }
        const fitScale = Math.min(1, wrapperWidth / slidesWidth)
        currentFitScale.value = fitScale
        const scale = clampZoom(fitScale * userZoom.value)
        effectiveScale.value = scale
        $wrapper.css({
          'transform': `scale(${scale})`,
          'transform-origin': 'top left',
          'width': `${slidesWidth}px`
        })
        pptxZoomEmitter.emit()
      }
    },
    // 核心处理逻辑
    processMessage(msg: any) {
      if (data.isDone || !wrapper.value) return
      const $wrapper = $(wrapper.value)
      const { thumbElement } = data
      switch (msg.type) {
        case 'slide':
          console.log('正在处理:', msg.slide_num)
          $wrapper.append(msg.data)
          nextTick(() => {
            this.scheduleResize()
          })
          break
        case 'pptx-thumb':
          if (thumbElement) $(thumbElement).attr('src', `data:image/jpeg;base64,${msg.data}`)
          break
        case 'slideSize':
          break
        case 'globalCSS':
          $wrapper.append(`<style>${msg.data}</style>`)
          break
        case 'ExecutionTime':
        case 'Done':
          console.log('pptx渲染完成，耗时', msg.data)
          displayChart(msg.charts)
          data.isDone = true
          nextTick(() => {
            this.scheduleResize()
          })
          break
        case 'WARN':
          console.warn('PPTX processing warning: ', msg.data)
          break
        case 'ERROR':
          data.isDone = true
          errorMessage.value = String(msg.data || 'PPTX 解析失败')
          console.error('PPTX processing error: ', msg.data)
          break
        case 'DEBUG':
          console.debug('Worker: ', msg.data)
          break
        case 'INFO':
        default:
          console.info('Worker: ', msg.data)
      }
    }
  }

  onMounted(() => {
    schedulePptxResize = () => methods.scheduleResize()
    attachZoomProvider()
    methods.startWorker()
    if (wrapper.value) {
      data.resizeObserver = new ResizeObserver(() => {
        methods.scheduleResize()
      })
      data.resizeObserver.observe(wrapper.value)
      if (wrapper.value.parentElement) {
        data.resizeObserver.observe(wrapper.value.parentElement)
      }
    }
  })

  onBeforeUnmount(() => {
    unregisterFileViewerZoomProvider(wrapper.value)
    schedulePptxResize = null
    data.worker?.terminate()
    if (data.timer) clearInterval(data.timer)
    window.cancelAnimationFrame(data.resizeFrame)
    data.resizeObserver?.disconnect()
  })
})()
</script>

<template>
  <div v-if='errorMessage' class='pptx-error'>
    <strong>{{ errorMessage }}</strong>
  </div>
  <div v-else class='pptx-wrapper' ref='wrapper' data-viewer-zoom-provider='pptx' />
</template>

<style scoped>
.pptx-wrapper {
    max-width: 100%;
    margin: 0 auto;
    min-width: 0;
}

.pptx-error {
  box-sizing: border-box;
  width: min(680px, calc(100% - 32px));
  margin: 48px auto;
  padding: 24px;
  border: 1px solid rgba(28, 43, 58, 0.12);
  border-radius: 14px;
  background: #fff;
  color: #1f2d3b;
  box-shadow: 0 16px 42px rgba(25, 42, 54, 0.08);
  font-family: Aptos, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

.pptx-error strong {
  display: block;
  margin-bottom: 10px;
  font-size: 18px;
}

.pptx-error p {
  margin: 0;
  color: #607282;
  line-height: 1.7;
}
</style>
